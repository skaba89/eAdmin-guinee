"""Fail-closed Joiner-Mover-Leaver lifecycle operations."""

from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.access_grant import AccessGrant
from app.models.federated_identity import FederatedIdentity
from app.models.identity_lifecycle import IdentityLifecycleEvent
from app.models.user import User
from app.services.token_blacklist import token_blacklist


class IdentityLifecycleService:
    """Coordinate identity lifecycle side effects across IAM authorities.

    Redis refresh-token revocation is executed before database entitlement
    mutation. If the database transaction later fails, the user only loses a
    session and can re-authenticate; stale privilege is never preserved because
    a failed Redis revocation cannot be hidden behind a successful mover/leaver.
    Access JWTs are invalidated durably through `sessions_invalid_before`.
    """

    @staticmethod
    def _tenant(user: User) -> str:
        return user.tenant_id or settings.TENANT_DEFAULT_ID

    async def _revoke_related_grants(
        self,
        *,
        db: AsyncSession,
        user_id: uuid.UUID,
        actor_id: uuid.UUID,
        now: datetime,
        include_sponsored: bool,
    ) -> int:
        predicate = AccessGrant.grantee_id == user_id
        if include_sponsored:
            predicate = or_(
                AccessGrant.grantee_id == user_id,
                AccessGrant.requested_by == user_id,
                AccessGrant.approved_by == user_id,
            )
        result = await db.execute(
            select(AccessGrant)
            .where(
                predicate,
                AccessGrant.status.in_(["pending", "active"]),
            )
            .with_for_update()
        )
        grants = list(result.scalars().all())
        for grant in grants:
            grant.status = "revoked"
            grant.revoked_by = actor_id
            grant.revoked_at = now
        return len(grants)

    async def _disable_federated_identities(
        self,
        *,
        db: AsyncSession,
        user_id: uuid.UUID,
        actor_id: uuid.UUID,
        now: datetime,
    ) -> int:
        result = await db.execute(
            select(FederatedIdentity)
            .where(
                FederatedIdentity.user_id == user_id,
                FederatedIdentity.status == "active",
            )
            .with_for_update()
        )
        identities = list(result.scalars().all())
        for identity in identities:
            identity.status = "disabled"
            identity.disabled_by = actor_id
            identity.disabled_at = now
        return len(identities)

    async def record_joiner(
        self,
        *,
        db: AsyncSession,
        actor: User,
        user: User,
        reason: str = "administrative_account_creation",
    ) -> IdentityLifecycleEvent:
        event = IdentityLifecycleEvent(
            user_id=user.id,
            actor_id=actor.id,
            event_type="joiner",
            tenant_id=self._tenant(user),
            institution_id=user.institution_id,
            reason=reason,
            new_role=user.role.value,
            new_tenant_id=self._tenant(user),
            new_institution_id=user.institution_id,
            details={"account_active": user.is_active},
        )
        db.add(event)
        await db.flush()
        return event

    async def handle_mover(
        self,
        *,
        db: AsyncSession,
        actor: User,
        user: User,
        old_role: str,
        old_tenant_id: str | None,
        old_institution_id: str | None,
        reason: str = "administrative_scope_change",
    ) -> IdentityLifecycleEvent:
        """Invalidate prior authorization context after role/scope mutation."""
        now = datetime.now(timezone.utc)

        # Fail closed on the external session authority before persisting a new
        # authorization scope. Losing a session on later DB rollback is safe;
        # keeping an old refresh token after a successful mover is not.
        await token_blacklist.revoke_all_user_tokens(str(user.id))

        user.sessions_invalid_before = now
        revoked_grants = await self._revoke_related_grants(
            db=db,
            user_id=user.id,
            actor_id=actor.id,
            now=now,
            include_sponsored=True,
        )
        event = IdentityLifecycleEvent(
            user_id=user.id,
            actor_id=actor.id,
            event_type="mover",
            tenant_id=self._tenant(user),
            institution_id=user.institution_id,
            reason=reason,
            old_role=old_role,
            new_role=user.role.value,
            old_tenant_id=old_tenant_id,
            new_tenant_id=self._tenant(user),
            old_institution_id=old_institution_id,
            new_institution_id=user.institution_id,
            details={
                "sessions_invalid_before": now.isoformat(),
                "related_grants_revoked": revoked_grants,
                "sso_bindings_preserved": True,
            },
        )
        db.add(event)
        await db.flush()
        return event

    async def offboard_user(
        self,
        *,
        db: AsyncSession,
        actor: User,
        user: User,
        reason: str = "administrative_account_deactivation",
    ) -> IdentityLifecycleEvent:
        """Deactivate every local authority that could keep a leaver effective."""
        now = datetime.now(timezone.utc)
        await token_blacklist.revoke_all_user_tokens(str(user.id))

        old_role = user.role.value
        old_tenant = self._tenant(user)
        old_institution = user.institution_id

        user.is_active = False
        user.sessions_invalid_before = now
        revoked_grants = await self._revoke_related_grants(
            db=db,
            user_id=user.id,
            actor_id=actor.id,
            now=now,
            include_sponsored=True,
        )
        disabled_identities = await self._disable_federated_identities(
            db=db,
            user_id=user.id,
            actor_id=actor.id,
            now=now,
        )
        event = IdentityLifecycleEvent(
            user_id=user.id,
            actor_id=actor.id,
            event_type="leaver",
            tenant_id=old_tenant,
            institution_id=old_institution,
            reason=reason,
            old_role=old_role,
            old_tenant_id=old_tenant,
            old_institution_id=old_institution,
            details={
                "sessions_invalid_before": now.isoformat(),
                "related_grants_revoked": revoked_grants,
                "federated_identities_disabled": disabled_identities,
            },
        )
        db.add(event)
        await db.flush()
        return event

    async def revoke_temporary_access(
        self,
        *,
        db: AsyncSession,
        actor: User,
        user: User,
        reason: str,
    ) -> int:
        """Revoke temporary entitlements and force a fresh effective session."""
        now = datetime.now(timezone.utc)
        await token_blacklist.revoke_all_user_tokens(str(user.id))
        user.sessions_invalid_before = now
        revoked = await self._revoke_related_grants(
            db=db,
            user_id=user.id,
            actor_id=actor.id,
            now=now,
            include_sponsored=False,
        )
        db.add(
            IdentityLifecycleEvent(
                user_id=user.id,
                actor_id=actor.id,
                event_type="recertification",
                tenant_id=self._tenant(user),
                institution_id=user.institution_id,
                reason=reason,
                old_role=user.role.value,
                new_role=user.role.value,
                old_tenant_id=self._tenant(user),
                new_tenant_id=self._tenant(user),
                old_institution_id=user.institution_id,
                new_institution_id=user.institution_id,
                details={
                    "decision": "revoke_temporary",
                    "temporary_grants_revoked": revoked,
                    "sessions_invalid_before": now.isoformat(),
                },
            )
        )
        await db.flush()
        return revoked


identity_lifecycle_service = IdentityLifecycleService()
