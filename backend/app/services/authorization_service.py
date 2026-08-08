"""Central RBAC + ABAC authorization decisions for eAdmin Guinea."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import uuid

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.rbac import PERMISSION_MATRIX
from app.models.access_grant import AccessGrant
from app.models.user import RoleEnum, User


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

        permanent = self.has_permanent_permission(user, resource, action)
        scoped = self.scope_allows(
            user,
            tenant_id=tenant_id,
            institution_id=institution_id,
        )
        if permanent and scoped:
            return AuthorizationDecision(True, "permanent_role_and_scope", "role")

        if not allow_temporary_grants:
            reason = "scope_denied" if permanent and not scoped else "role_denied"
            return AuthorizationDecision(False, reason, "deny")

        now = datetime.now(timezone.utc)
        query = select(AccessGrant).where(
            and_(
                AccessGrant.grantee_id == user.id,
                AccessGrant.status == "active",
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
            if grant.requires_mfa and not mfa_verified:
                continue
            # A grant cannot become a cross-tenant escape hatch. Its own tenant is
            # authoritative; institution=None explicitly means tenant-wide grant.
            if tenant_id and grant.tenant_id != tenant_id:
                continue
            if institution_id and grant.institution_id not in (None, institution_id):
                continue

            grant.last_used_at = now
            return AuthorizationDecision(True, "approved_temporary_grant", grant.grant_type, grant.id)

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
