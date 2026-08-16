"""Security-critical overrides and trust-boundary endpoints."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import auth as auth_api
from app.api import auth_hardening
from app.api.auth import get_current_user, verify_password
from app.api.security import _verify_totp_code
from app.database import get_db
from app.middleware.rls import set_rls_context
from app.models.qualified_signature_evidence import QualifiedSignatureEvidence
from app.models.user import RoleEnum, User
from app.services.trust_service import trust_service

router = APIRouter()
logger = logging.getLogger("eadmin.security_hardening")


class SecureMFADisableRequest(BaseModel):
    password: str
    code: str


@router.post(
    "/setup-mfa",
    response_model=auth_api.MFASetupResponse,
    summary="Configurer MFA",
)
async def secure_security_setup_mfa(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> auth_api.MFASetupResponse:
    """Shadow the legacy setup route with the canonical audited MFA flow."""
    return await auth_api.setup_mfa(request, current_user, db)


@router.post("/verify-mfa", summary="Vérifier le code MFA")
async def secure_security_verify_mfa(
    request: Request,
    body: auth_api.MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Use the canonical MFA verifier and central refresh-token store."""
    return await auth_api.verify_mfa(request, body, current_user, db)


@router.post("/change-password", summary="Changer le mot de passe")
async def secure_security_change_password(
    request: Request,
    body: auth_api.ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Shadow the legacy security route with the durable auth revocation flow."""
    return await auth_hardening.secure_change_password(
        request,
        body,
        current_user,
        db,
    )


@router.post("/disable-mfa", summary="Désactiver MFA")
async def secure_disable_mfa(
    request: Request,
    body: SecureMFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Disable MFA after re-authentication and durably revoke old sessions."""

    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA n'est pas activé pour ce compte.",
        )

    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe incorrect.",
        )

    if not body.code.isdigit() or len(body.code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le code MFA doit contenir exactement 6 chiffres.",
        )

    if not _verify_totp_code(current_user.mfa_secret, body.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Code MFA invalide.",
        )

    current_user.mfa_enabled = False
    current_user.mfa_secret = None

    # MFA is an authorization-strength attribute. Every access token issued
    # before this transition must become stale, even when Redis cleanup fails.
    await auth_hardening._set_session_cutoff(db, current_user)
    await auth_hardening._revoke_refresh_tokens_best_effort(str(current_user.id))

    logger.warning(
        "MFA disabled after password+TOTP re-authentication: user=%s ip=%s",
        current_user.id,
        request.client.host if request.client else "unknown",
    )

    return {
        "message": "MFA désactivé. Toutes les sessions ont été révoquées ; veuillez vous reconnecter."
    }


@router.get("/trust/status", summary="État de préparation de la chaîne de confiance")
async def trust_status(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return non-secret PKI readiness information to administrators only."""
    if current_user.role.hierarchy_level() < RoleEnum.ADMIN.hierarchy_level():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="État de confiance réservé aux administrateurs habilités.",
        )
    return trust_service.status()


@router.get(
    "/trust/evidence/{evidence_id}",
    summary="Vérifier une preuve externe de signature/horodatage",
)
async def verify_external_trust_evidence(
    evidence_id: uuid.UUID,
    current_user: User = Depends(set_rls_context),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Evaluate persisted evidence visible through the caller's document RLS scope."""
    result = await db.execute(
        select(QualifiedSignatureEvidence).where(QualifiedSignatureEvidence.id == evidence_id)
    )
    evidence = result.scalar_one_or_none()
    if evidence is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preuve introuvable.")

    assessment = trust_service.evaluate_evidence(evidence)
    return {
        "evidence_id": str(evidence.id),
        "document_id": str(evidence.document_id),
        "signature_step_id": str(evidence.signature_step_id) if evidence.signature_step_id else None,
        "document_version": evidence.document_version,
        "document_hash": evidence.document_hash,
        "provider": evidence.provider,
        "certificate_fingerprint_sha256": evidence.signer_certificate_fingerprint_sha256,
        "certificate_status": evidence.certificate_status,
        "revocation_checked_at": (
            evidence.revocation_checked_at.isoformat() if evidence.revocation_checked_at else None
        ),
        "timestamp_time": evidence.timestamp_time.isoformat() if evidence.timestamp_time else None,
        "trust_policy_oid": evidence.trust_policy_oid,
        "validated_at": evidence.validated_at.isoformat() if evidence.validated_at else None,
        "qualification_attested_at": (
            evidence.qualification_attested_at.isoformat()
            if evidence.qualification_attested_at
            else None
        ),
        **assessment,
    }
