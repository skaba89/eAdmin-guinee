"""Session-bound authentication overrides.

The legacy auth handlers remain the source of truth for password/MFA checks,
audit logging and lockout. This router only upgrades successful token issuance
with a Redis-backed ``sid`` claim.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import auth as auth_api
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.session_binding import (
    SessionRegistryUnavailable,
    create_bound_session,
    destroy_bound_session_best_effort,
)

router = APIRouter()
logger = logging.getLogger("eadmin.auth_session_hardening")

_REGISTERED_CLAIMS = {"exp", "iat", "jti", "type"}


def _decode(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def _reissuable_claims(access_token: str) -> dict[str, Any]:
    payload = _decode(access_token)
    return {
        key: value
        for key, value in payload.items()
        if key not in _REGISTERED_CLAIMS
    }


async def _store_refresh_token(refresh_token: str, user_id: str) -> None:
    payload = _decode(refresh_token)
    jti = str(payload.get("jti") or "")
    exp = int(payload.get("exp") or 0)
    ttl = max(0, exp - int(datetime.now(timezone.utc).timestamp()))
    if not jti or ttl <= 0:
        raise RuntimeError("generated refresh token is missing a usable jti/exp")
    await auth_api.token_blacklist.store_refresh_token(user_id, jti, ttl)


async def _bind_token_pair(
    *,
    access_token: str,
    refresh_token: str,
    request: Request,
) -> tuple[str, str]:
    """Reissue a coherent successful token pair with a Redis-backed session id."""

    try:
        claims = _reissuable_claims(access_token)
        refresh_payload = _decode(refresh_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de finaliser la session authentifiée.",
        ) from exc

    user_id = str(claims.get("sub") or "")
    refresh_user_id = str(refresh_payload.get("sub") or "")
    if (
        not user_id
        or refresh_user_id != user_id
        or refresh_payload.get("type") != "refresh"
    ):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de finaliser la session authentifiée.",
        )

    try:
        sid = await create_bound_session(user_id, request)
    except SessionRegistryUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Le registre de sessions est temporairement indisponible.",
        ) from exc

    # Test/development compatibility when Redis is intentionally absent.
    if sid is None:
        return access_token, refresh_token

    claims["sid"] = sid
    bound_access = auth_api.create_access_token(claims)
    bound_refresh = auth_api.create_refresh_token(claims)

    try:
        await _store_refresh_token(bound_refresh, user_id)
    except Exception as exc:
        await destroy_bound_session_best_effort(sid)
        if settings.is_test or settings.is_development:
            logger.warning(
                "Unable to persist bound refresh token in %s; keeping legacy pair user=%s: %s",
                settings.ENVIRONMENT,
                user_id,
                exc,
            )
            return access_token, refresh_token
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Le registre de sessions est temporairement indisponible.",
        ) from exc

    return bound_access, bound_refresh


@router.post("/login", response_model=auth_api.TokenResponse, summary="Connexion")
async def secure_session_login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> auth_api.TokenResponse:
    """Run canonical login, then bind fully authenticated sessions to Redis."""

    response = await auth_api.login(request, form_data, db)
    payload = _decode(response.access_token)

    # MFA-pending access tokens stay short-lived and unbound. A real session is
    # created only after successful TOTP verification.
    if payload.get("mfa_required") is True and payload.get("mfa_verified") is not True:
        return response

    access_token, refresh_token = await _bind_token_pair(
        access_token=response.access_token,
        refresh_token=response.refresh_token,
        request=request,
    )
    return auth_api.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/verify-mfa", summary="Vérification MFA")
async def secure_session_verify_mfa(
    request: Request,
    body: auth_api.MFAVerifyRequest,
    current_user: User = Depends(auth_api.get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Run canonical TOTP verification, then create the authoritative session."""

    response = await auth_api.verify_mfa(request, body, current_user, db)
    access_token, refresh_token = await _bind_token_pair(
        access_token=str(response["access_token"]),
        refresh_token=str(response["refresh_token"]),
        request=request,
    )
    return {
        **response,
        "access_token": access_token,
        "refresh_token": refresh_token,
    }
