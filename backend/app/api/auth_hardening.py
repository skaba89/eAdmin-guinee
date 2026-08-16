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
from app.services.session_binding import (
    SessionRegistryUnavailable,
    destroy_bound_session_best_effort,
    validate_bound_session,
)

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


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _issued_before_cutoff(payload: dict, user: User) -> bool:
    cutoff = user.sessions_invalid_before
    if cutoff is None:
        return False
    try:
        issued_at = datetime.fromtimestamp(float(payload.get("iat")), tz=timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return True
    return issued_at <= _utc(cutoff)


async def _consume_refresh_token(user_id: str, refresh_jti: str) -> bool:
    service = auth_api.token_blacklist
    consume = getattr(service, "consume_refresh_token", None)
    if callable(consume):
        return bool(await consume(user_id, refresh_jti))

    # Compatibility is deliberately limited to the repository's in-memory test
    # double. Production TokenBlacklistService exposes consume_refresh_token()
    # and therefore always uses Redis SREM atomically.
    test_tokens = getattr(service, "_refresh_tokens", None)
    if isinstance(test_tokens, dict):
        tokens = test_tokens.get(user_id, set())
        if refresh_jti in tokens:
            tokens.remove(refresh_jti)
            return True
        return False
    return False


async def _lock_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.scalar(select(User).where(User.id == user_id).with_for_update())


async def _set_session_cutoff(db: AsyncSession, user: User) -> datetime:
    cutoff = datetime.now(timezone.utc)
    user.sessions_invalid_before = cutoff
    await db.flush()
    return cutoff


async def _revoke_refresh_tokens_best_effort(user_id: str) -> None:
    try:
        await auth_api.token_blacklist.revoke_all_user_tokens(user_id)
    except Exception as exc:
        # The PostgreSQL cutoff is the durable source of truth. Redis cleanup is
        # still attempted, but a transient Redis failure must not undo a
        # password-change/logout revocation already persisted in PostgreSQL.
        logger.error("Refresh-token cleanup failed user=%s error=%s", user_id, exc)


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
) -> dict:
    """Shadow the legacy admin-create endpoint with hierarchy and scope controls."""
    if current_user.role not in (RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les administrateurs peuvent créer des comptes internes.",
        )
    if not authorization_service.can_assign_role(current_user, user_data.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Élévation interdite: le rôle cible doit être strictement "
                "inférieur au rôle du créateur."
            ),
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
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "frontend_role": user.role.to_frontend_role(),
        "institution": user.institution,
        "is_active": user.is_active,
        "mfa_enabled": user.mfa_enabled,
        "created_at": user.created_at,
    }


@router.post("/refresh", response_model=TokenResponse, summary="Rafraîchir le token")
async def secure_refresh_token(
    request: SecureRefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Atomically rotate a refresh token and enforce its bound Redis session."""
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

    # Serialize refresh against logout/password-change on the durable user row.
    user = await _lock_user(db, user_uuid)
    if not user or not user.is_active or _issued_before_cutoff(payload, user):
        raise credentials_exception

    sid = str(payload.get("sid") or "")
    if sid:
        try:
            bound = await validate_bound_session(sid, user_id, touch=True)
        except SessionRegistryUnavailable as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Le registre de sessions est temporairement indisponible.",
            ) from exc
        if not bound:
            raise credentials_exception

    if user.mfa_enabled and payload.get("mfa_verified") is not True:
        logger.warning("Blocked refresh before MFA verification for user=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vérification MFA requise avant le rafraîchissement de session.",
        )

    consumed = await _consume_refresh_token(user_id, refresh_jti)
    if not consumed:
        # A replay means the session family is no longer trustworthy. Persist
        # the cutoff before returning 401; otherwise get_db would roll it back.
        await _set_session_cutoff(db, user)
        await db.commit()
        await _revoke_refresh_tokens_best_effort(user_id)
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
    if sid:
        token_data["sid"] = sid
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
    await auth_api.token_blacklist.store_refresh_token(str(user.id), new_jti, ttl_seconds)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", summary="Déconnexion")
async def secure_logout(
    request: Request,
    current_user: User = Depends(auth_api.get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Invalidate every previously issued access/refresh token for the account."""
    user = await _lock_user(db, current_user.id)
    if user is None:
        raise HTTPException(status_code=401, detail="Session invalide.")

    cutoff = await _set_session_cutoff(db, user)
    current_sid = ""

    # Keep the current-JTI blacklist for immediate multi-instance visibility;
    # sessions_invalid_before remains the durable fail-closed authority.
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            payload = jwt.decode(
                auth_header[7:],
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            current_sid = str(payload.get("sid") or "")
            jti = str(payload.get("jti") or "")
            exp = float(payload.get("exp") or 0)
            ttl = max(0, int(exp - datetime.now(timezone.utc).timestamp()))
            if jti and ttl > 0:
                try:
                    await auth_api.token_blacklist.revoke_token(jti, ttl)
                except Exception as exc:
                    logger.error("Current-token blacklist failed user=%s error=%s", user.id, exc)
        except JWTError:
            pass

    await _revoke_refresh_tokens_best_effort(str(user.id))
    await destroy_bound_session_best_effort(current_sid)
    logger.info("Global logout cutoff=%s user=%s", cutoff.isoformat(), user.id)
    return {"message": "Déconnexion réussie. Toutes vos sessions ont été révoquées."}


@router.post("/change-password", summary="Changement de mot de passe")
async def secure_change_password(
    request: Request,
    change_request: auth_api.ChangePasswordRequest,
    current_user: User = Depends(auth_api.get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Change password and persist a global JWT invalidation cutoff."""
    user = await _lock_user(db, current_user.id)
    if user is None or not auth_api.verify_password(
        change_request.current_password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe actuel incorrect.",
        )

    forbidden = {"password", "123456", "admin", "demo", "guinee", "conakry"}
    if any(value in change_request.new_password.lower() for value in forbidden):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe contient un motif interdit.",
        )

    user.hashed_password = auth_api.get_password_hash(change_request.new_password)
    cutoff = await _set_session_cutoff(db, user)
    await _revoke_refresh_tokens_best_effort(str(user.id))

    try:
        await AuditService(db).log_action(
            user_id=user.id,
            action="PASSWORD_CHANGE",
            resource_type="user",
            resource_id=str(user.id),
            category="security",
            description="Changement de mot de passe avec révocation globale des sessions",
            details={"sessions_invalid_before": cutoff.isoformat()},
            severity="warning",
            ip_address=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("User-Agent", "unknown")[:512],
            tenant_id=user.tenant_id or settings.TENANT_DEFAULT_ID,
            institution_id=user.institution_id or "",
        )
    except Exception:
        pass

    return {"message": "Mot de passe modifié avec succès. Veuillez vous reconnecter."}


# Session-bound login and MFA verification are included in the same override
# router so they remain ahead of the legacy auth routes in FastAPI order.
from app.api.auth_session_hardening import router as session_auth_router  # noqa: E402

router.include_router(session_auth_router)
