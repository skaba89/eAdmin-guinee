"""Central RBAC + ABAC authorization decisions for eAdmin Guinea."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import uuid

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.rbac import PERMISSION_MATRIX
from app.models.access_grant import AccessGrant
from app.models.user import RoleEnum, User
from app.services.iam_policy import (
    conflicting_permissions,
    evaluate_security_attributes,
)


# Permissions whose temporary elevation is too sensitive for ordinary
# delegation. They remain available only through the separately governed,
# short-lived break-glass path.
BREAK_GLASS_ONLY_PERMISSIONS: frozenset[tuple[str, str]] = frozenset(
    {
        ("users", "delete"),
        ("settings", "update"),
        ("tenants", "manage"),
    }
)


@dataclass(frozen=True)
class AuthorizationDecision:
    allowed: bool
    reason: str
    source: str
    grant_id: uuid.UUID | None = None


class AuthorizationService:
    """Evaluate permanent and time-bounded access without trusting client scope."""

    STAFF_MIN_LEVEL = RoleEnum.AGENT.hierarchy_level()

    @staticmethod
    def has_permanent_permission(user: User, resource: str, action: str) -> bool:
        required_level = PERMISSION_MATRIX.get((resource, action), 7)
        return user.is_active and user.role.hierarchy_level() >= required_level

    @staticmethod
    def is_delegable_permission(
        resource: str,
        action: str,
        *,
        grant_type: str = "delegation",
    ) -> bool:
        """Return whether a permission may be elevated by this grant type."""
        if (resource, action) not in PERMISSION_MATRIX:
            return False
        if grant_type == "break_glass":
            return True
        if grant_type != "delegation":
            return False
        return (resource, action) not in BREAK_GLASS_ONLY_PERMISSIONS

    @staticmethod
    def scope_allows(
        user: User,
        *,
        tenant_id: str | None,
        institution_id: str | None,
    ) -> bool:
        """Evaluate trusted organizational scope.

        SUPER_ADMIN is global. MINISTRE is tenant-wide. Every lower staff role is
        institution-bound whenever the target has an institution. Citizens are
        never granted administrative cross-scope access by hierarchy alone.
        """
        if user.role == RoleEnum.SUPER_ADMIN:
            return True

        if tenant_id and (user.tenant_id or "") != tenant_id:
            return False

        if user.role == RoleEnum.MINISTRE:
            return True

        if institution_id:
            return bool(user.institution_id) and user.institution_id == institution_id

        return True

    async def would_violate_sod(
        self,
        *,
        user: User,
        resource: str,
        action: str,
        db: AsyncSession,
    ) -> bool:
        """Prevent a temporary grant from introducing maker/checker conflicts."""
        conflicts = conflicting_permissions(resource, action)
        if not conflicts:
            return False

        for conflict_resource, conflict_action in conflicts:
            if self.has_permanent_permission(user, conflict_resource, conflict_action):
                return True

        now = datetime.now(timezone.utc)
        conflict_filters = [
            and_(AccessGrant.resource == item[0], AccessGrant.action == item[1])
            for item in conflicts
        ]
        if not conflict_filters:
            return False
        existing = await db.scalar(
            select(AccessGrant.id)
            .where(
                AccessGrant.grantee_id == user.id,
                AccessGrant.status == "active",
                AccessGrant.valid_from <= now,
                AccessGrant.valid_until > now,
                or_(*conflict_filters),
            )
            .limit(1)
        )
        return existing is not None

    async def authorize(
        self,
        *,
        user: User,
        resource: str,
        action: str,
        db: AsyncSession,
        tenant_id: str | None = None,
        institution_id: str | None = None,
        mfa_verified: bool = False,
        allow_temporary_grants: bool = True,
    ) -> AuthorizationDecision:
        if not user.is_active:
            return AuthorizationDecision(False, "account_inactive", "deny")

        if (resource, action) not in PERMISSION_MATRIX:
            return AuthorizationDecision(False, "unknown_permission", "deny")

        permanent = self.has_permanent_permission(user, resource, action)
        scoped = self.scope_allows(
            user,
            tenant_id=tenant_id,
            institution_id=institution_id,
        )
        if permanent and scoped:
            attributes = evaluate_security_attributes(
                user,
                resource=resource,
                action=action,
                mfa_verified=mfa_verified,
            )
            if not attributes.allowed:
                return AuthorizationDecision(False, attributes.reason, "deny")
            return AuthorizationDecision(True, "permanent_role_scope_and_attributes", "role")

        if not allow_temporary_grants:
            reason = "scope_denied" if permanent and not scoped else "role_denied"
            return AuthorizationDecision(False, reason, "deny")

        now = datetime.now(timezone.utc)
        query = select(AccessGrant).where(
            and_(
                AccessGrant.grantee_id == user.id,
                AccessGrant.status == "active",
                AccessGrant.approved_by.is_not(None),
                AccessGrant.resource == resource,
                AccessGrant.action == action,
                AccessGrant.valid_from <= now,
                AccessGrant.valid_until > now,
            )
        )
        if tenant_id:
            query = query.where(AccessGrant.tenant_id == tenant_id)
        elif user.tenant_id:
            query = query.where(AccessGrant.tenant_id == user.tenant_id)

        if institution_id:
            query = query.where(
                (AccessGrant.institution_id.is_(None))
                | (AccessGrant.institution_id == institution_id)
            )

        result = await db.execute(query.order_by(AccessGrant.valid_until.asc()).limit(10))
        grants = result.scalars().all()

        for grant in grants:
            # Defense in depth against a malformed/tampered database row. The
            # API and DB constraints already enforce most of these invariants,
            # but the runtime authorization authority must fail closed itself.
            if grant.grant_type not in {"delegation", "break_glass"}:
                continue
            if grant.requested_by == grant.grantee_id:
                continue
            if grant.approved_by in {grant.requested_by, grant.grantee_id}:
                continue
            if not self.is_delegable_permission(
                resource,
                action,
                grant_type=grant.grant_type,
            ):
                continue
            if grant.grant_type == "break_glass" and not (grant.ticket_reference or "").strip():
                continue
            if (grant.requires_mfa or grant.grant_type == "break_glass") and not mfa_verified:
                continue

            # A grant cannot become a cross-tenant escape hatch. Its own tenant
            # is authoritative; institution=None explicitly means tenant-wide.
            if tenant_id and grant.tenant_id != tenant_id:
                continue
            if institution_id and grant.institution_id not in (None, institution_id):
                continue

            attributes = evaluate_security_attributes(
                user,
                resource=resource,
                action=action,
                mfa_verified=mfa_verified,
                break_glass=grant.grant_type == "break_glass",
            )
            if not attributes.allowed:
                continue

            # A previously issued grant must not remain usable if later grants
            # or a role change create a maker/checker conflict.
            if grant.grant_type == "delegation" and await self.would_violate_sod(
                user=user,
                resource=resource,
                action=action,
                db=db,
            ):
                continue

            grant.last_used_at = now
            reason = (
                "approved_break_glass"
                if grant.grant_type == "break_glass"
                else "approved_temporary_grant"
            )
            return AuthorizationDecision(True, reason, grant.grant_type, grant.id)

        reason = "scope_denied" if permanent and not scoped else "permission_denied"
        return AuthorizationDecision(False, reason, "deny")

    @staticmethod
    def can_administer_user(actor: User, target: User) -> bool:
        """Permanent user administration never inherits through a temporary grant."""
        if actor.role == RoleEnum.SUPER_ADMIN:
            return actor.id != target.id
        if not actor.is_active or actor.id == target.id:
            return False
        if actor.role.hierarchy_level() <= target.role.hierarchy_level():
            return False
        if (actor.tenant_id or "") != (target.tenant_id or ""):
            return False
        if actor.role == RoleEnum.MINISTRE:
            return True
        return bool(actor.institution_id) and actor.institution_id == target.institution_id

    @staticmethod
    def can_assign_role(actor: User, target_role: RoleEnum) -> bool:
        if not actor.is_active:
            return False
        return actor.role == RoleEnum.SUPER_ADMIN or (
            actor.role.hierarchy_level() > target_role.hierarchy_level()
        )


authorization_service = AuthorizationService()
