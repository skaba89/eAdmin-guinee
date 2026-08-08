"""Governed IAM delegation and emergency-access endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.middleware.rbac import PERMISSION_MATRIX
from app.models.access_grant import AccessGrant
from app.models.user import RoleEnum, User
from app.services.audit_service import AuditService
from app.services.authorization_service import authorization_service

router = APIRouter()


class AccessGrantCreate(BaseModel):
    grantee_id: uuid.UUID
    grant_type: Literal["delegation", "break_glass"] = "delegation"
    resource: str = Field(min_length=1, max_length=100)
    action: str = Field(min_length=1, max_length=100)
    tenant_id: str | None = Field(default=None, max_length=100)
    institution_id: str | None = Field(default=None, max_length=100)
    reason: str = Field(min_length=12, max_length=2000)
    ticket_reference: str | None = Field(default=None, max_length=255)
    valid_until: datetime

    @field_validator("valid_until")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("valid_until doit inclure un fuseau horaire")
        return value.astimezone(timezone.utc)


class AccessGrantResponse(BaseModel):
    id: uuid.UUID
    grant_type: str
    status: str
    grantee_id: uuid.UUID
    requested_by: uuid.UUID
    approved_by: uuid.UUID | None
    revoked_by: uuid.UUID | None
    tenant_id: str
    institution_id: str | None
    resource: str
    action: str
    reason: str
    ticket_reference: str | None
    requires_mfa: bool
    valid_from: datetime
    valid_until: datetime
    approved_at: datetime | None
    revoked_at: datetime | None
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthorizationProbeResponse(BaseModel):
    allowed: bool
    reason: str
    source: str
    grant_id: uuid.UUID | None = None


def _as_utc(value: datetime) -> datetime:
    """Normalize database timestamps before Python comparisons.

    PostgreSQL preserves timezone-aware values, while SQLite used by isolated
    tests may deserialize DateTime(timezone=True) without tzinfo. Treat a naive
    persisted value as UTC because every write into this module is normalized
    to UTC before persistence.
    """
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _mfa_verified(request: Request, user: User) -> bool:
    payload = getattr(request.state, "jwt_payload", {}) or {}
    return bool(user.mfa_enabled and payload.get("mfa_verified") is True)


def _effective_scope(
    actor: User,
    requested_tenant: str | None,
    requested_institution: str | None,
) -> tuple[str, str | None]:
    if actor.role == RoleEnum.SUPER_ADMIN:
        tenant = (requested_tenant or "").strip()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="tenant_id est obligatoire pour une délégation SUPER_ADMIN.",
            )
        return tenant, (requested_institution or None)

    tenant = (actor.tenant_id or settings.TENANT_DEFAULT_ID).strip()
    if requested_tenant and requested_tenant != tenant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Une délégation ne peut pas sortir du tenant du demandeur.",
        )

    if actor.role == RoleEnum.MINISTRE:
        return tenant, requested_institution or actor.institution_id

    institution = (actor.institution_id or "").strip()
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Un périmètre institutionnel est requis pour déléguer cet accès.",
        )
    if requested_institution and requested_institution != institution:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Une délégation ne peut pas sortir de l'institution du demandeur.",
        )
    return tenant, institution


async def _audit_grant(
    db: AsyncSession,
    actor: User,
    grant: AccessGrant,
    description: str,
    request: Request,
    severity: str = "warning",
) -> None:
    await AuditService(db).log_action(
        user_id=actor.id,
        action="PERMISSION_CHANGE",
        resource_type="access_grant",
        resource_id=str(grant.id),
        category="security",
        description=description,
        details={
            "grant_type": grant.grant_type,
            "status": grant.status,
            "grantee_id": str(grant.grantee_id),
            "resource": grant.resource,
            "permission_action": grant.action,
            "valid_until": _as_utc(grant.valid_until).isoformat(),
            "ticket_reference": grant.ticket_reference,
        },
        severity=severity,
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("User-Agent", "unknown")[:512],
        tenant_id=grant.tenant_id,
        institution_id=grant.institution_id,
    )


@router.get("/grants", response_model=list[AccessGrantResponse], summary="Lister les habilitations temporaires")
async def list_access_grants(
    status_filter: str | None = Query(default=None, alias="status"),
    grantee_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AccessGrant]:
    query = select(AccessGrant).order_by(AccessGrant.created_at.desc()).limit(500)
    if status_filter:
        query = query.where(AccessGrant.status == status_filter)
    if grantee_id:
        query = query.where(AccessGrant.grantee_id == grantee_id)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post(
    "/grants",
    response_model=AccessGrantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Demander une délégation ou un break-glass",
)
async def request_access_grant(
    body: AccessGrantCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccessGrant:
    if current_user.role.hierarchy_level() < RoleEnum.ADMIN.hierarchy_level():
        raise HTTPException(status_code=403, detail="Rôle administratif requis pour demander une délégation.")
    if body.grantee_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Séparation des tâches: le demandeur ne peut pas être le bénéficiaire.",
        )
    if (body.resource, body.action) not in PERMISSION_MATRIX:
        raise HTTPException(status_code=422, detail="Permission inconnue dans la matrice d'autorisation.")
    if not authorization_service.has_permanent_permission(current_user, body.resource, body.action):
        raise HTTPException(
            status_code=403,
            detail="Une permission temporaire ne peut être déléguée que par un détenteur permanent.",
        )

    grantee = await db.scalar(select(User).where(User.id == body.grantee_id))
    if grantee is None or not grantee.is_active:
        raise HTTPException(status_code=404, detail="Bénéficiaire actif introuvable.")

    tenant_id, institution_id = _effective_scope(
        current_user,
        body.tenant_id,
        body.institution_id,
    )
    if grantee.role != RoleEnum.SUPER_ADMIN:
        if (grantee.tenant_id or settings.TENANT_DEFAULT_ID) != tenant_id:
            raise HTTPException(status_code=403, detail="Le bénéficiaire appartient à un autre tenant.")
        if institution_id and grantee.role != RoleEnum.MINISTRE and grantee.institution_id != institution_id:
            raise HTTPException(status_code=403, detail="Le bénéficiaire appartient à une autre institution.")

    now = datetime.now(timezone.utc)
    valid_until = _as_utc(body.valid_until)
    if valid_until <= now:
        raise HTTPException(status_code=422, detail="La fin de validité doit être dans le futur.")
    maximum = timedelta(hours=4) if body.grant_type == "break_glass" else timedelta(days=30)
    if valid_until - now > maximum:
        raise HTTPException(
            status_code=422,
            detail="Durée maximale: 4h pour break-glass, 30 jours pour une délégation.",
        )
    if body.grant_type == "break_glass" and not (body.ticket_reference or "").strip():
        raise HTTPException(status_code=422, detail="Un ticket d'incident est obligatoire pour break-glass.")

    grant = AccessGrant(
        grant_type=body.grant_type,
        status="pending",
        grantee_id=body.grantee_id,
        requested_by=current_user.id,
        tenant_id=tenant_id,
        institution_id=institution_id,
        resource=body.resource,
        action=body.action,
        reason=body.reason.strip(),
        ticket_reference=(body.ticket_reference or "").strip() or None,
        requires_mfa=True,
        valid_from=now,
        valid_until=valid_until,
    )
    db.add(grant)
    await db.flush()
    await _audit_grant(db, current_user, grant, "Demande d'habilitation temporaire créée", request)
    return grant


@router.post("/grants/{grant_id}/approve", response_model=AccessGrantResponse, summary="Approuver une habilitation temporaire")
async def approve_access_grant(
    grant_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccessGrant:
    grant = await db.scalar(select(AccessGrant).where(AccessGrant.id == grant_id).with_for_update())
    if grant is None:
        raise HTTPException(status_code=404, detail="Habilitation introuvable.")
    if grant.status != "pending":
        raise HTTPException(status_code=409, detail="Cette habilitation n'est plus en attente.")
    if current_user.id in {grant.requested_by, grant.grantee_id}:
        raise HTTPException(
            status_code=403,
            detail="Séparation des tâches: l'approbateur doit être distinct du demandeur et du bénéficiaire.",
        )
    if not _mfa_verified(request, current_user):
        raise HTTPException(status_code=403, detail="MFA vérifié requis pour approuver une habilitation.")
    if _as_utc(grant.valid_until) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=409, detail="La fenêtre d'habilitation est déjà expirée.")

    if grant.grant_type == "break_glass":
        if current_user.role != RoleEnum.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Break-glass requiert une approbation SUPER_ADMIN.")
    elif current_user.role not in (RoleEnum.DIRECTEUR, RoleEnum.MINISTRE, RoleEnum.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Approbation DIRECTEUR+ requise.")

    if not authorization_service.has_permanent_permission(current_user, grant.resource, grant.action):
        raise HTTPException(status_code=403, detail="L'approbateur ne détient pas cette permission de façon permanente.")
    if not authorization_service.scope_allows(
        current_user,
        tenant_id=grant.tenant_id,
        institution_id=grant.institution_id,
    ):
        raise HTTPException(status_code=403, detail="L'habilitation est hors du périmètre de l'approbateur.")

    now = datetime.now(timezone.utc)
    grant.status = "active"
    grant.approved_by = current_user.id
    grant.approved_at = now
    await db.flush()
    await _audit_grant(db, current_user, grant, "Habilitation temporaire approuvée", request, "critical")
    return grant


@router.post("/grants/{grant_id}/reject", response_model=AccessGrantResponse, summary="Rejeter une habilitation temporaire")
async def reject_access_grant(
    grant_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccessGrant:
    grant = await db.scalar(select(AccessGrant).where(AccessGrant.id == grant_id).with_for_update())
    if grant is None:
        raise HTTPException(status_code=404, detail="Habilitation introuvable.")
    if grant.status != "pending":
        raise HTTPException(status_code=409, detail="Cette habilitation n'est plus en attente.")
    if current_user.id in {grant.requested_by, grant.grantee_id}:
        raise HTTPException(status_code=403, detail="Séparation des tâches requise.")
    if current_user.role not in (RoleEnum.DIRECTEUR, RoleEnum.MINISTRE, RoleEnum.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Rejet DIRECTEUR+ requis.")
    if not authorization_service.scope_allows(
        current_user,
        tenant_id=grant.tenant_id,
        institution_id=grant.institution_id,
    ):
        raise HTTPException(status_code=403, detail="Habilitation hors périmètre.")

    grant.status = "rejected"
    grant.revoked_by = current_user.id
    grant.revoked_at = datetime.now(timezone.utc)
    await db.flush()
    await _audit_grant(db, current_user, grant, "Habilitation temporaire rejetée", request)
    return grant


@router.post("/grants/{grant_id}/revoke", response_model=AccessGrantResponse, summary="Révoquer une habilitation temporaire")
async def revoke_access_grant(
    grant_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccessGrant:
    grant = await db.scalar(select(AccessGrant).where(AccessGrant.id == grant_id).with_for_update())
    if grant is None:
        raise HTTPException(status_code=404, detail="Habilitation introuvable.")
    if grant.status not in ("pending", "active"):
        raise HTTPException(status_code=409, detail="Cette habilitation ne peut plus être révoquée.")
    if current_user.role not in (RoleEnum.DIRECTEUR, RoleEnum.MINISTRE, RoleEnum.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Révocation DIRECTEUR+ requise.")
    if not authorization_service.scope_allows(
        current_user,
        tenant_id=grant.tenant_id,
        institution_id=grant.institution_id,
    ):
        raise HTTPException(status_code=403, detail="Habilitation hors périmètre.")

    grant.status = "revoked"
    grant.revoked_by = current_user.id
    grant.revoked_at = datetime.now(timezone.utc)
    await db.flush()
    await _audit_grant(db, current_user, grant, "Habilitation temporaire révoquée", request, "critical")
    return grant


@router.get("/decision", response_model=AuthorizationProbeResponse, summary="Évaluer son habilitation effective")
async def evaluate_effective_access(
    request: Request,
    resource: str = Query(..., min_length=1, max_length=100),
    action: str = Query(..., min_length=1, max_length=100),
    tenant_id: str | None = Query(default=None, max_length=100),
    institution_id: str | None = Query(default=None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AuthorizationProbeResponse:
    if (resource, action) not in PERMISSION_MATRIX:
        raise HTTPException(status_code=422, detail="Permission inconnue.")
    target_tenant = tenant_id or current_user.tenant_id or settings.TENANT_DEFAULT_ID
    target_institution = institution_id or current_user.institution_id
    decision = await authorization_service.authorize(
        user=current_user,
        resource=resource,
        action=action,
        db=db,
        tenant_id=target_tenant,
        institution_id=target_institution,
        mfa_verified=_mfa_verified(request, current_user),
    )
    return AuthorizationProbeResponse(
        allowed=decision.allowed,
        reason=decision.reason,
        source=decision.source,
        grant_id=decision.grant_id,
    )
