"""Security overrides for authentication endpoints.

These routes are registered before the legacy auth router so security-critical
behaviour can be hardened without changing the public API contract.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import TokenResponse, create_access_token, create_refresh_token
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.token_blacklist import REFRESH_TOKEN_PREFIX, token_blacklist

router = APIRouter()
logger = logging.getLogger("eadmin.auth_hardening")


class SecureRefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse, summary="Rafraîchir le token")
async def secure_refresh_token(
    request: SecureRefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Rotate a refresh token without allowing MFA bypass or token replay."""

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de rafraîchissement invalide",
    )

    try:
        payload = jwt.decode(
            request.refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
        token_type = payload.get("type")
        refresh_jti = payload.get("jti")

        if not user_id or token_type != "refresh" or not refresh_jti:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exception

    # A password-only MFA session must never be promotable through /refresh.
    if user.mfa_enabled and payload.get("mfa_verified") is not True:
        logger.warning("Blocked refresh before MFA verification for user=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vérification MFA requise avant le rafraîchissement de session.",
        )

    # Consume the refresh JTI atomically. A second use is a replay attempt.
    redis = await token_blacklist._get_redis()
    refresh_key = f"{REFRESH_TOKEN_PREFIX}{user_id}"
    removed = await redis.srem(refresh_key, refresh_jti)
    if removed != 1:
        await token_blacklist.revoke_all_user_tokens(user_id)
        logger.warning("Refresh token replay detected for user=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Refresh token déjà utilisé ou révoqué. Toutes les sessions ont "
                "été invalidées ; veuillez vous reconnecter."
            ),
        )

    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "frontend_role": user.role.to_frontend_role(),
        "tenant_id": user.tenant_id or settings.TENANT_DEFAULT_ID,
        "institution_id": user.institution_id or "",
    }
    if user.mfa_enabled:
        token_data.update({"mfa_required": True, "mfa_verified": True})

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    new_payload = jwt.decode(
        refresh_token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
    new_jti = new_payload.get("jti", "")
    new_exp = int(new_payload.get("exp", 0))
    ttl_seconds = max(0, new_exp - int(datetime.now(timezone.utc).timestamp()))
    await token_blacklist.store_refresh_token(str(user.id), new_jti, ttl_seconds)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )
