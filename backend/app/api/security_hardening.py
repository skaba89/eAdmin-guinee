"""Security-critical overrides and trust-boundary endpoints."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import auth as auth_api
from app.api import auth_hardening, auth_session_hardening
from app.api.auth import get_current_user, verify_password
from app.api.security import (
    SecurityEventResponse,
    SessionInfoResponse,
    _verify_totp_code,
)
from app.config import settings
from app.database import get_db
from app.middleware.rls import set_rls_context
from app.models.qualified_signature_evidence import QualifiedSignatureEvidence
from app.models.user import RoleEnum, User
from app.services.session_service import session_service
from app.services.trust_service import trust_service

router = APIRouter()
logger = logging.getLogger("eadmin.security_hardening")


class SecureMFADisableRequest(BaseModel):
    password: str
    code: str


def _current_sid(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return ""
    try:
        payload = jwt.decode(
            auth_header[7:],
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        return ""
    return str(payload.get("sid") or "")


def _session_info(data: dict) -> SessionInfoResponse:
    raw_mfa = data.get("mfa_verified", "0")
    return SessionInfoResponse(
        session_id=str(data.get("session_id") or ""),
        ip_address=str(data.get("ip_address") or "") or None,
        user_agent=str(data.get("user_agent") or "") or None,
        created_at=str(data.get("created_at") or ""),
        last_activity=str(data.get("last_activity") or ""),
        mfa_verified=raw_mfa is True or str(raw_mfa) == "1",
    )


def _security_event(data: dict) -> SecurityEventResponse:
    return SecurityEventResponse(
        id=str(data.get("id") or ""),
        timestamp=str(data.get("timestamp") or ""),
        event_type=str(data.get("event_type") or ""),
        description=str(data.get("description") or ""),
        ip_address=str(data.get("ip_address") or "") or None,
        severity=str(data.get("severity") or "info"),
    )


def _session_registry_unavailable(exc: Exception) -> HTTPException:
    logger.error("Redis session registry unavailable: %s", exc)
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Le registre de sessions est temporairement indisponible.",
    )


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
    """Use canonical TOTP verification plus Redis session-bound token issuance."""
    return await auth_session_hardening.secure_session_verify_mfa(
        request,
        body,
        current_user,
        db,
    )


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


@router.get(
    "/sessions",
    response_model=list[SessionInfoResponse],
    summary="Sessions actives",
)
async def secure_get_active_sessions(
    current_user: User = Depends(get_current_user),
) -> list[SessionInfoResponse]:
    """List active sessions from the shared Redis registry, never pod memory."""
    try:
        rows = await session_service.get_user_sessions(str(current_user.id))
    except Exception as exc:
        raise _session_registry_unavailable(exc) from exc
    return [_session_info(row) for row in rows]


@router.delete("/sessions/{session_id}", summary="Terminer une session")
async def secure_terminate_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Destroy only a Redis session owned by the authenticated user."""
    try:
        session = await session_service.validate_session(session_id)
    except Exception as exc:
        raise _session_registry_unavailable(exc) from exc

    if not session or str(session.get("user_id") or "") != str(current_user.id):
        # Do not reveal whether a foreign session id exists.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session introuvable.",
        )

    try:
        await session_service.destroy_session(session_id)
    except Exception as exc:
        raise _session_registry_unavailable(exc) from exc

    return {"message": "Session terminée avec succès"}


@router.delete("/sessions", summary="Révoquer toutes les autres sessions")
async def secure_revoke_other_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Revoke every Redis session except the one identified by the current JWT sid."""
    user_id = str(current_user.id)
    current_sid = _current_sid(request)

    try:
        rows = await session_service.get_user_sessions(user_id)
        terminated_count = 0
        for row in rows:
            session_id = str(row.get("session_id") or "")
            if not session_id or session_id == current_sid:
                continue
            await session_service.destroy_session(session_id)
            terminated_count += 1
    except Exception as exc:
        raise _session_registry_unavailable(exc) from exc

    logger.info(
        "Other Redis sessions revoked user=%s kept_sid=%s count=%s",
        user_id,
        current_sid[:20] if current_sid else "legacy-token",
        terminated_count,
    )
    return {
        "message": f"{terminated_count} session(s) révoquée(s)",
        "terminated_count": terminated_count,
    }


@router.get(
    "/security-events",
    response_model=list[SecurityEventResponse],
    summary="Événements de sécurité",
)
async def secure_get_security_events(
    current_user: User = Depends(get_current_user),
    limit: int = 50,
) -> list[SecurityEventResponse]:
    """Read the user's recent security events from the shared Redis log."""
    safe_limit = max(0, min(limit, 100))
    try:
        rows = await session_service.get_security_events(
            str(current_user.id),
            limit=safe_limit,
        )
    except Exception as exc:
        raise _session_registry_unavailable(exc) from exc
    return [_security_event(row) for row in rows]


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
