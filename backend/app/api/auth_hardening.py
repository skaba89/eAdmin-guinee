"""Security overrides for authentication endpoints.

These routes are registered before the legacy auth router so security-critical
behaviour can be hardened without changing the public API contract.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import auth as auth_api
from app.api.auth import TokenResponse, create_access_token, create_refresh_token
from app.config import settings
from app.database import get_db
from app.models.user import RoleEnum, User
from app.services.audit_service import AuditService
from app.services.authorization_service import authorization_service
from app.services.token_blacklist import REFRESH_TOKEN_PREFIX

router = APIRouter()
logger = logging.getLogger("eadmin.auth_hardening")


class SecureRefreshRequest(BaseModel):
    refresh_token: str


class SecureAdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: RoleEnum = RoleEnum.AGENT
    institution: str | None = None
    tenant_id: str | None = None
    institution_id: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return auth_api._validate_password_strength(value)


async def _consume_refresh_token(user_id: str, refresh_jti: str) -> bool:
    """Atomically consume a refresh token in Redis."""

    service = auth_api.token_blacklist
    redis = await service._get_redis()
    refresh_key = f"{REFRESH_TOKEN_PREFIX}{user_id}"
    removed = await redis.srem(refresh_key, refresh_jti)

    if isinstance(removed, int):
        return removed == 1

    test_tokens = getattr(service, "_refresh_tokens", None)
    if isinstance(test_tokens, dict):
        user_tokens = test_tokens.get(user_id, set())
        if refresh_jti in user_tokens:
            user_tokens.remove(refresh_jti)
            return True
        return False

    return False


@router.post(
    "/admin/create-user",
    response_model=auth_api.UserResponse,
    summary="Création utilisateur (Admin uniquement)",
)
async def secure_admin_create_user(
    request: Request,
    user_data: SecureAdminUserCreate,
    current_user: User = Depends(auth_api.get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Shadow the legacy admin-create endpoint with hierarchy and scope controls."""

    if current_user.role not in (RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les administrateurs peuvent créer des comptes internes.",
        )
    if not authorization_service.can_assign_role(current_user, user_data.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Élévation interdite: le rôle cible doit être strictement inférieur au rôle du créateur.",
        )

    existing = await db.scalar(select(User).where(User.email == user_data.email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte avec cet email existe déjà.",
        )

    if current_user.role == RoleEnum.SUPER_ADMIN:
        tenant_id = (user_data.tenant_id or settings.TENANT_DEFAULT_ID).strip()
        institution_id = (user_data.institution_id or "").strip() or None
    else:
        tenant_id = (current_user.tenant_id or settings.TENANT_DEFAULT_ID).strip()
        if user_data.tenant_id and user_data.tenant_id != tenant_id:
            raise HTTPException(status_code=403, detail="Création inter-tenant interdite.")
        institution_id = (current_user.institution_id or "").strip() or None
        if user_data.institution_id and user_data.institution_id != institution_id:
            raise HTTPException(status_code=403, detail="Création hors institution interdite.")

    user = User(
        email=user_data.email,
        hashed_password=auth_api.get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        institution=user_data.institution,
        tenant_id=tenant_id,
        institution_id=institution_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    await AuditService(db).log_action(
        user_id=current_user.id,
        action="CREATE",
        resource_type="user",
        resource_id=str(user.id),
        category="admin",
        description="Création utilisateur via endpoint admin durci",
        details={
            "created_user_email": user.email,
            "created_user_role": user.role.value,
            "creator_role": current_user.role.value,
            "tenant_id": tenant_id,
            "institution_id": institution_id,
        },
        severity="warning",
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("User-Agent", "unknown")[:512],
        tenant_id=tenant_id,
        institution_id=institution_id,
    )
    return user


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

    try:
        user_uuid = uuid.UUID(user_id)
    except (TypeError, ValueError) as exc:
        raise credentials_exception from exc

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exception

    if user.mfa_enabled and payload.get("mfa_verified") is not True:
        logger.warning("Blocked refresh before MFA verification for user=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vérification MFA requise avant le rafraîchissement de session.",
        )

    consumed = await _consume_refresh_token(user_id, refresh_jti)
    if not consumed:
        await auth_api.token_blacklist.revoke_all_user_tokens(user_id)
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
    await auth_api.token_blacklist.store_refresh_token(
        str(user.id),
        new_jti,
        ttl_seconds,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )
