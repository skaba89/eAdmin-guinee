"""Periodic access recertification for government IAM."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.access_grant import AccessGrant
from app.models.identity_lifecycle import (
    AccessReviewCampaign,
    AccessReviewItem,
    IdentityLifecycleEvent,
)
from app.models.user import RoleEnum, User
from app.services.authorization_service import authorization_service
from app.services.identity_lifecycle_service import identity_lifecycle_service


class AccessReviewError(ValueError):
    """Fail-closed recertification request error."""


class AccessReviewService:
    """Create immutable entitlement snapshots and apply review decisions."""

    @staticmethod
    def _tenant(user: User) -> str:
        return user.tenant_id or settings.TENANT_DEFAULT_ID

    def _campaign_scope(
        self,
        *,
        actor: User,
        requested_tenant: str | None,
        requested_institution: str | None,
    ) -> tuple[str, str | None]:
        if actor.role == RoleEnum.SUPER_ADMIN:
            tenant = (requested_tenant or "").strip()
            if not tenant:
                raise AccessReviewError("tenant_id est obligatoire pour une campagne nationale.")
            return tenant, (requested_institution or "").strip() or None

        tenant = self._tenant(actor)
        if requested_tenant and requested_tenant != tenant:
            raise AccessReviewError("Campagne inter-tenant interdite.")

        if actor.role == RoleEnum.MINISTRE:
            return tenant, (requested_institution or "").strip() or None

        institution = (actor.institution_id or "").strip()
        if not institution:
            raise AccessReviewError("Périmètre institutionnel absent du créateur.")
        if requested_institution and requested_institution != institution:
            raise AccessReviewError("Campagne hors institution interdite.")
        return tenant, institution

    async def create_campaign(
        self,
        *,
        db: AsyncSession,
        actor: User,
        name: str,
        reviewer_id: uuid.UUID,
        due_at: datetime,
        tenant_id: str | None = None,
        institution_id: str | None = None,
    ) -> AccessReviewCampaign:
        if actor.role.hierarchy_level() < RoleEnum.DIRECTEUR.hierarchy_level():
            raise AccessReviewError("Création de campagne réservée au niveau DIRECTEUR ou supérieur.")
        if due_at.tzinfo is None or due_at.utcoffset() is None:
            raise AccessReviewError("due_at doit inclure un fuseau horaire.")
        due_at = due_at.astimezone(timezone.utc)
        if due_at <= datetime.now(timezone.utc):
            raise AccessReviewError("La date d'échéance doit être future.")

        scope_tenant, scope_institution = self._campaign_scope(
            actor=actor,
            requested_tenant=tenant_id,
            requested_institution=institution_id,
        )
        reviewer = await db.scalar(select(User).where(User.id == reviewer_id))
        if reviewer is None or not reviewer.is_active:
            raise AccessReviewError("Reviewer actif introuvable.")
        if reviewer.role.hierarchy_level() < RoleEnum.CHEF_SERVICE.hierarchy_level():
            raise AccessReviewError("Le reviewer doit être CHEF_SERVICE ou supérieur.")
        if not authorization_service.scope_allows(
            reviewer,
            tenant_id=scope_tenant,
            institution_id=scope_institution,
        ):
            raise AccessReviewError("Reviewer hors du périmètre de la campagne.")

        reviewable_roles = [
            role
            for role in RoleEnum
            if role.hierarchy_level() < reviewer.role.hierarchy_level()
        ]
        users_query = select(User).where(
            User.is_active.is_(True),
            User.tenant_id == scope_tenant,
            User.role.in_(reviewable_roles),
            User.id != reviewer.id,
        )
        if scope_institution:
            users_query = users_query.where(User.institution_id == scope_institution)
        users = list((await db.execute(users_query.order_by(User.created_at.asc()))).scalars().all())
        if not users:
            raise AccessReviewError("Aucun compte éligible dans le périmètre de revue.")

        user_ids = [user.id for user in users]
        grant_rows = list(
            (
                await db.execute(
                    select(AccessGrant).where(
                        AccessGrant.grantee_id.in_(user_ids),
                        AccessGrant.status.in_(["pending", "active"]),
                    )
                )
            )
            .scalars()
            .all()
        )
        grants_by_user: dict[uuid.UUID, list[dict]] = defaultdict(list)
        for grant in grant_rows:
            grants_by_user[grant.grantee_id].append(
                {
                    "id": str(grant.id),
                    "grant_type": grant.grant_type,
                    "status": grant.status,
                    "resource": grant.resource,
                    "action": grant.action,
                    "institution_id": grant.institution_id,
                    "valid_until": grant.valid_until.isoformat(),
                }
            )

        campaign = AccessReviewCampaign(
            name=name.strip(),
            status="active",
            tenant_id=scope_tenant,
            institution_id=scope_institution,
            reviewer_id=reviewer.id,
            created_by=actor.id,
            due_at=due_at,
        )
        db.add(campaign)
        await db.flush()

        for user in users:
            db.add(
                AccessReviewItem(
                    campaign_id=campaign.id,
                    user_id=user.id,
                    snapshot_role=user.role.value,
                    snapshot_tenant_id=self._tenant(user),
                    snapshot_institution_id=user.institution_id,
                    snapshot_grants=grants_by_user.get(user.id, []),
                    decision="pending",
                )
            )
        await db.flush()
        return campaign

    async def decide_item(
        self,
        *,
        db: AsyncSession,
        actor: User,
        campaign_id: uuid.UUID,
        item_id: uuid.UUID,
        decision: str,
        reason: str,
    ) -> AccessReviewItem:
        if decision not in {"certified", "revoke_temporary", "disable_account"}:
            raise AccessReviewError("Décision de recertification inconnue.")
        if len(reason.strip()) < 8:
            raise AccessReviewError("Une justification explicite est requise.")

        campaign = await db.scalar(
            select(AccessReviewCampaign)
            .where(AccessReviewCampaign.id == campaign_id)
            .with_for_update()
        )
        if campaign is None:
            raise AccessReviewError("Campagne introuvable.")
        if campaign.status != "active":
            raise AccessReviewError("La campagne n'est plus active.")
        if actor.role != RoleEnum.SUPER_ADMIN and actor.id != campaign.reviewer_id:
            raise AccessReviewError("Seul le reviewer désigné peut statuer.")

        item = await db.scalar(
            select(AccessReviewItem)
            .where(
                AccessReviewItem.id == item_id,
                AccessReviewItem.campaign_id == campaign.id,
            )
            .with_for_update()
        )
        if item is None:
            raise AccessReviewError("Élément de revue introuvable.")
        if item.decision != "pending":
            raise AccessReviewError("Cet accès a déjà été recertifié.")
        if actor.id == item.user_id:
            raise AccessReviewError("Auto-recertification interdite.")

        target = await db.scalar(select(User).where(User.id == item.user_id).with_for_update())
        if target is None:
            raise AccessReviewError("Compte cible introuvable.")
        if actor.role != RoleEnum.SUPER_ADMIN:
            if actor.role.hierarchy_level() <= target.role.hierarchy_level():
                raise AccessReviewError("Le reviewer ne peut certifier un rôle égal ou supérieur au sien.")
            if not authorization_service.scope_allows(
                actor,
                tenant_id=campaign.tenant_id,
                institution_id=campaign.institution_id,
            ):
                raise AccessReviewError("Reviewer hors périmètre.")

        now = datetime.now(timezone.utc)
        if decision == "revoke_temporary":
            await identity_lifecycle_service.revoke_temporary_access(
                db=db,
                actor=actor,
                user=target,
                reason=f"access_review:{campaign.id}:{reason.strip()}",
            )
        elif decision == "disable_account":
            await identity_lifecycle_service.offboard_user(
                db=db,
                actor=actor,
                user=target,
                reason=f"access_review:{campaign.id}:{reason.strip()}",
            )
        else:
            db.add(
                IdentityLifecycleEvent(
                    user_id=target.id,
                    actor_id=actor.id,
                    event_type="recertification",
                    tenant_id=self._tenant(target),
                    institution_id=target.institution_id,
                    reason=reason.strip(),
                    old_role=target.role.value,
                    new_role=target.role.value,
                    old_tenant_id=self._tenant(target),
                    new_tenant_id=self._tenant(target),
                    old_institution_id=target.institution_id,
                    new_institution_id=target.institution_id,
                    details={"decision": "certified", "campaign_id": str(campaign.id)},
                )
            )

        item.decision = decision
        item.decision_reason = reason.strip()
        item.decided_by = actor.id
        item.decided_at = now
        await db.flush()

        pending = await db.scalar(
            select(func.count())
            .select_from(AccessReviewItem)
            .where(
                AccessReviewItem.campaign_id == campaign.id,
                AccessReviewItem.decision == "pending",
            )
        )
        if int(pending or 0) == 0:
            campaign.status = "completed"
            campaign.completed_at = now
            await db.flush()
        return item


access_review_service = AccessReviewService()
