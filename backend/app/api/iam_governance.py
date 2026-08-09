"""Government IAM attribute governance endpoints.

Federated identity authenticates a person, while these local attributes remain
the authorization authority for sensitive eAdmin operations.
"""

from __future__ import annotations

from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import RoleEnum, User
from app.services.audit_service import AuditService
from app.services.authorization_service import authorization_service
from app.services.token_blacklist import token_blacklist

router = APIRouter()


class SecurityAttributesResponse(BaseModel):
    user_id: uuid.UUID
    tenant_id: str | None
    institution_id: str | None
    role: RoleEnum
    employment_status: str
    security_clearance: int
    assurance_level: int
    privileged_account: bool
    job_function: str | None
    department_code: str | None
    reviewed_at: datetime | None
    reviewed_by: uuid.UUID | None


class SecurityAttributesUpdate(BaseModel):
    employment_status: str = Field(pattern="^(active|suspended|leave|terminated)$")
    security_clearance: int = Field(ge=0, le=4)
    assurance_level: int = Field(ge=1, le=4)
    privileged_account: bool
    job_function: str | None = Field(default=None, max_length=100)
    department_code: str | None = Field(default=None, max_length=100)
    reason: str = Field(min_length=12, max_length=2000)


def _response(user: User) -> SecurityAttributesResponse:
    return SecurityAttributesResponse(
        user_id=user.id,
        tenant_id=user.tenant_id,
        institution_id=user.institution_id,
        role=user.role,
        employment_status=user.employment_status,
        security_clearance=user.security_clearance,
        assurance_level=user.assurance_level,
        privileged_account=user.privileged_account,
        job_function=user.job_function,
        department_code=user.department_code,
        reviewed_at=user.access_attributes_reviewed_at,
        reviewed_by=user.access_attributes_reviewed_by,
    )


def _verified_mfa(request: Request, user: User) -> bool:
    payload = getattr(request.state, "jwt_payload", {}) or {}
    return bool(user.mfa_enabled and payload.get("mfa_verified") is True)


def _can_view_profile(actor: User, target: User) -> bool:
    if actor.id == target.id or actor.role == RoleEnum.SUPER_ADMIN:
        return True
    if actor.role.hierarchy_level() < RoleEnum.DIRECTEUR.hierarchy_level():
        return False
    if (actor.tenant_id or settings.TENANT_DEFAULT_ID) != (
        target.tenant_id or settings.TENANT_DEFAULT_ID
    ):
        return False
    if actor.role == RoleEnum.MINISTRE:
        return True
    return bool(actor.institution_id) and actor.institution_id == target.institution_id


@router.get(
    "/me",
    response_model=SecurityAttributesResponse,
    summary="Consulter ses attributs d'habilitation",
)
async def get_my_security_attributes(
    current_user: User = Depends(get_current_user),
) -> SecurityAttributesResponse:
    return _response(current_user)


@router.get(
    "/{user_id}",
    response_model=SecurityAttributesResponse,
    summary="Consulter les attributs d'un compte",
)
async def get_security_attributes(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SecurityAttributesResponse:
    target = await db.scalar(select(User).where(User.id == user_id))
    if target is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if not _can_view_profile(current_user, target):
        raise HTTPException(status_code=403, detail="Profil d'habilitation hors périmètre.")
    return _response(target)


@router.put(
    "/{user_id}",
    response_model=SecurityAttributesResponse,
    summary="Réviser les attributs d'habilitation d'un compte",
)
async def update_security_attributes(
    user_id: uuid.UUID,
    body: SecurityAttributesUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SecurityAttributesResponse:
    # Attribute authority is intentionally narrower than ordinary user admin.
    if current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Révision ABAC réservée au SUPER_ADMIN.")
    if not _verified_mfa(request, current_user):
        raise HTTPException(status_code=403, detail="MFA vérifié requis pour réviser les attributs ABAC.")
    if user_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Séparation des tâches: un administrateur ne peut pas réviser ses propres attributs privilégiés.",
        )

    target = await db.scalar(select(User).where(User.id == user_id).with_for_update())
    if target is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if target.role == RoleEnum.CITOYEN and body.privileged_account:
        raise HTTPException(status_code=422, detail="Un compte citoyen ne peut pas devenir un compte privilégié.")
    if body.privileged_account and body.assurance_level < 2:
        raise HTTPException(
            status_code=422,
            detail="Un compte privilégié requiert un niveau d'assurance d'identité >= 2.",
        )

    before = {
        "employment_status": target.employment_status,
        "security_clearance": target.security_clearance,
        "assurance_level": target.assurance_level,
        "privileged_account": target.privileged_account,
        "job_function": target.job_function,
        "department_code": target.department_code,
    }
    target.employment_status = body.employment_status
    target.security_clearance = body.security_clearance
    target.assurance_level = body.assurance_level
    target.privileged_account = body.privileged_account
    target.job_function = body.job_function.strip() if body.job_function else None
    target.department_code = body.department_code.strip() if body.department_code else None
    target.access_attributes_reviewed_at = datetime.now(timezone.utc)
    target.access_attributes_reviewed_by = current_user.id

    if body.employment_status in {"suspended", "terminated"}:
        target.is_active = False

    await db.flush()
    # Any ABAC/security-profile change invalidates existing sessions so old JWTs
    # cannot continue under a superseded assurance/clearance decision.
    await token_blacklist.revoke_all_user_tokens(str(target.id))

    after = {
        "employment_status": target.employment_status,
        "security_clearance": target.security_clearance,
        "assurance_level": target.assurance_level,
        "privileged_account": target.privileged_account,
        "job_function": target.job_function,
        "department_code": target.department_code,
    }
    await AuditService(db).log_action(
        user_id=current_user.id,
        action="PERMISSION_CHANGE",
        resource_type="user_security_attributes",
        resource_id=str(target.id),
        category="security",
        description="Attributs ABAC du compte révisés",
        details={
            "reason": body.reason.strip(),
            "before": before,
            "after": after,
            "sessions_revoked": True,
        },
        severity="critical",
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("User-Agent", "unknown")[:512],
        tenant_id=target.tenant_id,
        institution_id=target.institution_id,
    )
    return _response(target)


@router.get(
    "/{user_id}/sensitive-readiness/{resource}/{action}",
    summary="Évaluer la readiness ABAC d'un compte pour une action sensible",
)
async def evaluate_sensitive_readiness(
    user_id: uuid.UUID,
    resource: str,
    action: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    target = await db.scalar(select(User).where(User.id == user_id))
    if target is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if not _can_view_profile(current_user, target):
        raise HTTPException(status_code=403, detail="Profil d'habilitation hors périmètre.")

    decision = await authorization_service.authorize(
        user=target,
        resource=resource,
        action=action,
        db=db,
        tenant_id=target.tenant_id or settings.TENANT_DEFAULT_ID,
        institution_id=target.institution_id,
        # Never claim another user's MFA is currently verified. This endpoint is
        # a readiness probe, not an impersonation/authorization oracle.
        mfa_verified=(target.id == current_user.id and _verified_mfa(request, current_user)),
        allow_temporary_grants=False,
    )
    return {
        "user_id": str(target.id),
        "resource": resource,
        "action": action,
        "allowed_now": decision.allowed,
        "reason": decision.reason,
        "source": decision.source,
    }
