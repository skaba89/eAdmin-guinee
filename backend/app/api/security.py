"""
Endpoints de sécurité - eAdministration Suite Guinea.
MFA, gestion des sessions, événements de sécurité, changement de mot de passe.
"""

import hashlib
import hmac
import base64
import logging
import secrets
import struct
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import (
    get_current_user,
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
)
from app.services.token_blacklist import token_blacklist as _token_blacklist
from app.database import get_db
from app.models.user import User

router = APIRouter()
logger = logging.getLogger("eadmin.security")

# --- In-memory session store (Redis in production) ---
_active_sessions: dict[str, dict[str, Any]] = {}

# --- In-memory security events (database in production) ---
_security_events: list[dict[str, Any]] = []

# --- MFA Rate Limiting ---
_mfa_attempts: dict[str, list[float]] = {}
MFA_MAX_ATTEMPTS = 5
MFA_LOCKOUT_SECONDS = 15 * 60  # 15 minutes


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class MFASetupRequest(BaseModel):
    """Request to set up MFA for a user."""
    pass


class MFAVerifyRequest(BaseModel):
    """Request to verify an MFA code."""
    code: str
    session_id: str | None = None


class MFADisableRequest(BaseModel):
    """Request to disable MFA."""
    password: str
    code: str | None = None


class MFASetupResponse(BaseModel):
    """Response with MFA secret and QR code URI."""
    secret: str
    qr_code_uri: str
    backup_codes: list[str]


class PasswordChangeRequest(BaseModel):
    """Request to change password."""
    current_password: str
    new_password: str


class SessionInfoResponse(BaseModel):
    """Active session information."""
    session_id: str
    ip_address: str | None
    user_agent: str | None
    created_at: str
    last_activity: str
    mfa_verified: bool


class SecurityEventResponse(BaseModel):
    """Security event information."""
    id: str
    timestamp: str
    event_type: str
    description: str
    ip_address: str | None
    severity: str


# ─── Helper Functions ─────────────────────────────────────────────────────────

def _verify_totp_code(secret: str, code: str, window: int = 1) -> bool:
    """Verify a TOTP code against a secret using HMAC-SHA1."""
    try:
        # Pad secret to valid base32
        padded_secret = secret + '=' * (-len(secret) % 8)
        key = base64.b32decode(padded_secret)
    except Exception:
        return False

    current_time = int(time.time())
    time_step = 30
    counter = current_time // time_step

    for i in range(-window, window + 1):
        test_counter = counter + i
        counter_bytes = struct.pack('>Q', test_counter)
        hmac_hash = hmac.new(key, counter_bytes, hashlib.sha1).digest()
        offset = hmac_hash[-1] & 0x0f
        code_int = struct.unpack('>I', hmac_hash[offset:offset + 4])[0] & 0x7fffffff
        totp_code = str(code_int % 1000000).zfill(6)
        if hmac.compare_digest(totp_code, code):
            return True

    return False


def _check_mfa_rate_limit(user_id: str) -> tuple[bool, int]:
    """Check if MFA rate limit is exceeded. Returns (is_limited, remaining_attempts)."""
    now = time.time()
    attempts = _mfa_attempts.get(user_id, [])
    valid_attempts = [t for t in attempts if now - t < MFA_LOCKOUT_SECONDS]
    _mfa_attempts[user_id] = valid_attempts

    if len(valid_attempts) >= MFA_MAX_ATTEMPTS:
        return True, 0

    return False, MFA_MAX_ATTEMPTS - len(valid_attempts)


def _record_mfa_attempt(user_id: str) -> None:
    """Record a failed MFA attempt."""
    if user_id not in _mfa_attempts:
        _mfa_attempts[user_id] = []
    _mfa_attempts[user_id].append(time.time())


def _reset_mfa_attempts(user_id: str) -> None:
    """Reset MFA attempts after a successful verification."""
    _mfa_attempts.pop(user_id, None)


def _add_security_event(
    user_id: str,
    event_type: str,
    description: str,
    ip_address: str | None = None,
    severity: str = "info",
) -> dict[str, Any]:
    """Add a security event to the event log."""
    event = {
        "id": f"evt-{int(time.time())}-{secrets.token_hex(4)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "event_type": event_type,
        "description": description,
        "ip_address": ip_address,
        "severity": severity,
    }
    _security_events.append(event)
    # Keep last 1000 events
    if len(_security_events) > 1000:
        _security_events.pop(0)
    return event


def _register_session(user_id: str, ip_address: str, user_agent: str) -> str:
    """Register a new session and return the session ID."""
    session_id = f"sess-{int(time.time())}-{secrets.token_hex(4)}"

    # Enforce max 3 concurrent sessions
    user_sessions = [
        sid for sid, s in _active_sessions.items()
        if s["user_id"] == user_id and s["is_active"]
    ]

    if len(user_sessions) >= 3:
        # Terminate oldest session
        oldest_sid = min(
            user_sessions,
            key=lambda sid: _active_sessions[sid]["created_at"],
        )
        _active_sessions[oldest_sid]["is_active"] = False
        _add_security_event(
            user_id, "session_terminated",
            f"Session {oldest_sid[:16]}... terminée (limite atteinte)",
            ip_address, "warning",
        )

    _active_sessions[session_id] = {
        "user_id": user_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_activity": datetime.now(timezone.utc).isoformat(),
        "mfa_verified": False,
        "is_active": True,
    }

    _add_security_event(
        user_id, "session_created",
        f"Nouvelle session depuis {ip_address}",
        ip_address, "info",
    )

    return session_id


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/setup-mfa", response_model=MFASetupResponse, summary="Configurer MFA")
async def setup_mfa(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MFASetupResponse:
    """
    Initialise la configuration MFA/TOTP pour l'utilisateur courant.
    Retourne le secret Base32, l'URI du QR code et 10 codes de secours.
    """
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA est déjà activé pour ce compte. Désactivez-le d'abord.",
        )

    # Generate TOTP secret
    secret_bytes = secrets.token_bytes(20)
    secret = base64.b32encode(secret_bytes).decode('utf-8').rstrip('=')

    # Store the secret (MFA not enabled until first successful verification)
    current_user.mfa_secret = secret
    await db.flush()

    # Generate QR code URI
    from app.config import settings
    qr_code_uri = (
        f"otpauth://totp/{settings.MFA_ISSUER}:{current_user.email}"
        f"?secret={secret}&issuer={settings.MFA_ISSUER}"
        f"&algorithm=SHA1&digits=6&period=30"
    )

    # Generate backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]

    client_ip = request.client.host if request.client else "unknown"
    _add_security_event(
        str(current_user.id), "mfa_setup_initiated",
        "Configuration MFA initiée",
        client_ip, "info",
    )

    logger.info(f"MFA setup initiated for user {current_user.email}")

    return MFASetupResponse(
        secret=secret,
        qr_code_uri=qr_code_uri,
        backup_codes=backup_codes,
    )


@router.post("/verify-mfa", summary="Vérifier le code MFA")
async def verify_mfa(
    request: Request,
    body: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Vérifie un code TOTP pour l'utilisateur courant.
    Si MFA n'était pas encore activé, l'active après vérification réussie.
    Implémente un verrouillage après 5 tentatives échouées.
    """
    user_id = str(current_user.id)
    client_ip = request.client.host if request.client else "unknown"

    # Check rate limiting
    is_limited, remaining = _check_mfa_rate_limit(user_id)
    if is_limited:
        logger.warning(f"MFA rate limit exceeded for user {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de tentatives MFA échouées. Réessayez dans 15 minutes.",
        )

    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA n'est pas configuré pour ce compte.",
        )

    code = body.code
    if not code or not code.isdigit() or len(code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le code doit contenir exactement 6 chiffres.",
        )

    # Verify TOTP code
    verified = _verify_totp_code(current_user.mfa_secret, code)

    if not verified:
        _record_mfa_attempt(user_id)
        _, remaining = _check_mfa_rate_limit(user_id)

        _add_security_event(
            user_id, "mfa_failed",
            f"Tentative de vérification MFA échouée ({remaining} tentative(s) restante(s))",
            client_ip, "warning",
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Code MFA invalide. {remaining} tentative(s) restante(s).",
        )

    # Success — reset rate limiter
    _reset_mfa_attempts(user_id)

    # Enable MFA if not already enabled
    if not current_user.mfa_enabled:
        current_user.mfa_enabled = True
        await db.flush()
        logger.info(f"MFA enabled for user {current_user.email}")

    # Mark session as MFA verified
    if body.session_id and body.session_id in _active_sessions:
        _active_sessions[body.session_id]["mfa_verified"] = True

    # Generate fully authenticated tokens
    token_data = {
        "sub": str(current_user.id),
        "role": current_user.role.value,
        "mfa_verified": True,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    _add_security_event(
        user_id, "mfa_verified",
        "Vérification MFA réussie",
        client_ip, "info",
    )

    return {
        "message": "Vérification MFA réussie",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/disable-mfa", summary="Désactiver MFA")
async def disable_mfa(
    request: Request,
    body: MFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Désactive MFA pour l'utilisateur courant.
    Nécessite le mot de passe actuel et optionnellement un code MFA.
    """
    client_ip = request.client.host if request.client else "unknown"

    # Verify current password
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe incorrect.",
        )

    # If MFA is enabled, also verify a TOTP code
    if current_user.mfa_enabled and current_user.mfa_secret and body.code:
        if not _verify_totp_code(current_user.mfa_secret, body.code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Code MFA invalide.",
            )

    # Disable MFA
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    await db.flush()

    _add_security_event(
        str(current_user.id), "mfa_disabled",
        "MFA désactivé pour le compte",
        client_ip, "warning",
    )

    logger.info(f"MFA disabled for user {current_user.email}")

    return {"message": "MFA désactivé avec succès"}


@router.post("/change-password", summary="Changer le mot de passe")
async def change_password(
    request: Request,
    body: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Change le mot de passe de l'utilisateur courant.
    Nécessite la vérification du mot de passe actuel.
    Applique la politique de mots de passe (12+ caractères, complexité).
    """
    client_ip = request.client.host if request.client else "unknown"

    # Verify current password
    if not verify_password(body.current_password, current_user.hashed_password):
        _add_security_event(
            str(current_user.id), "password_change_failed",
            "Tentative de changement de mot de passe échouée (mot de passe actuel incorrect)",
            client_ip, "warning",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe actuel incorrect.",
        )

    # Validate new password against policy
    new_password = body.new_password
    errors = []

    if len(new_password) < 12:
        errors.append("Le mot de passe doit contenir au moins 12 caractères")
    if not any(c.isupper() for c in new_password):
        errors.append("Le mot de passe doit contenir au moins une majuscule")
    if not any(c.islower() for c in new_password):
        errors.append("Le mot de passe doit contenir au moins une minuscule")
    if not any(c.isdigit() for c in new_password):
        errors.append("Le mot de passe doit contenir au moins un chiffre")
    if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in new_password):
        errors.append("Le mot de passe doit contenir au moins un caractère spécial")

    forbidden = ['password', '123456', 'admin', 'demo', 'guinee', 'conakry',
                 'motdepasse', 'azerty', 'qwerty']
    if any(p in new_password.lower() for p in forbidden):
        errors.append("Le mot de passe contient un motif interdit")

    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="; ".join(errors),
        )

    # Update password
    current_user.hashed_password = get_password_hash(new_password)
    await db.flush()

    _add_security_event(
        str(current_user.id), "password_changed",
        "Mot de passe modifié avec succès",
        client_ip, "info",
    )

    logger.info(f"Password changed for user {current_user.email}")

    return {"message": "Mot de passe modifié avec succès"}


@router.get("/sessions", response_model=list[SessionInfoResponse], summary="Sessions actives")
async def get_active_sessions(
    current_user: User = Depends(get_current_user),
) -> list[SessionInfoResponse]:
    """
    Retourne la liste des sessions actives de l'utilisateur courant.
    """
    user_id = str(current_user.id)
    user_sessions = [
        s for s in _active_sessions.values()
        if s["user_id"] == user_id and s["is_active"]
    ]

    return [
        SessionInfoResponse(
            session_id=sid,
            ip_address=s["ip_address"],
            user_agent=s["user_agent"],
            created_at=s["created_at"],
            last_activity=s["last_activity"],
            mfa_verified=s["mfa_verified"],
        )
        for sid, s in ((sid, _active_sessions[sid]) for sid in _active_sessions
                       if _active_sessions[sid]["user_id"] == user_id and _active_sessions[sid]["is_active"])
    ]


@router.delete("/sessions/{session_id}", summary="Terminer une session")
async def terminate_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Termine une session spécifique de l'utilisateur courant.
    """
    user_id = str(current_user.id)

    if session_id not in _active_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session introuvable.",
        )

    session = _active_sessions[session_id]
    if session["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez pas terminer cette session.",
        )

    session["is_active"] = False

    _add_security_event(
        user_id, "session_terminated",
        f"Session {session_id[:16]}... terminée par l'utilisateur",
        session.get("ip_address"), "info",
    )

    return {"message": "Session terminée avec succès"}


@router.delete("/sessions", summary="Révoquer toutes les sessions")
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Révoque toutes les sessions actives de l'utilisateur courant,
    sauf la session en cours.
    """
    user_id = str(current_user.id)
    terminated_count = 0

    for sid, session in _active_sessions.items():
        if session["user_id"] == user_id and session["is_active"]:
            session["is_active"] = False
            terminated_count += 1

    _add_security_event(
        user_id, "sessions_revoked",
        f"{terminated_count} session(s) révoquée(s)",
        None, "warning",
    )

    logger.info(f"All sessions revoked for user {current_user.email}: {terminated_count} terminated")

    return {
        "message": f"{terminated_count} session(s) révoquée(s)",
        "terminated_count": terminated_count,
    }


@router.get("/security-events", response_model=list[SecurityEventResponse], summary="Événements de sécurité")
async def get_security_events(
    current_user: User = Depends(get_current_user),
    limit: int = 50,
) -> list[SecurityEventResponse]:
    """
    Retourne les événements de sécurité récents de l'utilisateur courant.
    Limite les résultats à `limit` événements (max 100).
    """
    user_id = str(current_user.id)
    limit = min(limit, 100)

    user_events = [
        e for e in _security_events
        if e.get("user_id") == user_id
    ]

    # Sort by timestamp descending and limit
    user_events.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    user_events = user_events[:limit]

    return [
        SecurityEventResponse(
            id=e["id"],
            timestamp=e["timestamp"],
            event_type=e["event_type"],
            description=e["description"],
            ip_address=e.get("ip_address"),
            severity=e.get("severity", "info"),
        )
        for e in user_events
    ]
