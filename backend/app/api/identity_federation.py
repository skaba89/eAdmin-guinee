"""OIDC SSO login and governed federated-identity lifecycle APIs."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import json
from urllib.parse import urlencode, urlsplit
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from jose import jwt
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import RedirectResponse

from app.api.auth import (
    create_access_token,
    create_refresh_token,
    get_current_user,
)
from app.config import settings
from app.database import get_db
from app.models.federated_identity import FederatedIdentity
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.authorization_service import authorization_service
from app.services.federated_identity_service import (
    FederatedIdentityError,
    federated_identity_service,
)
from app.services.oidc_service import (
    OIDC_EXCHANGE_TTL_SECONDS,
    OIDCError,
    oidc_service,
)
from app.services.token_blacklist import token_blacklist

public_router = APIRouter()
admin_router = APIRouter()


class SSOExchangeRequest(BaseModel):
    exchange_code: str = Field(min_length=20, max_length=512)


class SSOExchangeResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105 - OAuth token type, not a secret
    mfa_required: bool
    return_to: str


class FederatedIdentityLinkRequest(BaseModel):
    user_id: uuid.UUID
    subject: str = Field(min_length=1, max_length=512)
    email_snapshot: EmailStr | None = None


class FederatedIdentityResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    issuer: str
    subject: str
    provider: str
    email_snapshot: str | None
    status: str
    linked_by: uuid.UUID
    disabled_by: uuid.UUID | None
    last_authenticated_at: datetime | None
    disabled_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


def _oidc_http_error(exc: OIDCError) -> HTTPException:
    unavailable_codes = {"token_endpoint_unavailable", "jwks_unavailable", "oidc_disabled"}
    status_code = 503 if exc.code in unavailable_codes else 401
    return HTTPException(
        status_code=status_code,
        detail={"code": exc.code, "message": exc.message},
    )


def _identity_http_error(exc: FederatedIdentityError) -> HTTPException:
    conflict_codes = {"identity_already_linked", "user_already_linked", "identity_conflict"}
    not_found_codes = {"identity_not_found", "identity_not_linked"}
    if exc.code in conflict_codes:
        code = 409
    elif exc.code in not_found_codes:
        code = 404
    else:
        code = 403
    return HTTPException(status_code=code, detail={"code": exc.code, "message": exc.message})


def _subject_fingerprint(subject: str) -> str:
    return hashlib.sha256(subject.encode("utf-8")).hexdigest()[:16]


def _trusted_frontend_origin(raw_origin: str) -> str:
    """Accept only an origin already trusted by the application's CORS policy."""
    candidate = (raw_origin or "").strip()
    try:
        parsed = urlsplit(candidate)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Origine frontend SSO invalide.") from exc

    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.username
        or parsed.password
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
    ):
        raise HTTPException(status_code=400, detail="Origine frontend SSO invalide.")

    origin = f"{parsed.scheme}://{parsed.netloc}"
    allowed = set(settings.CORS_ORIGINS_PROD)
    if settings.is_development or settings.is_test:
        allowed.update(settings.CORS_ORIGINS_DEV)
        try:
            extra = json.loads(settings.EXTRA_CORS_ORIGINS)
            if isinstance(extra, list):
                allowed.update(str(item).rstrip("/") for item in extra)
        except (TypeError, ValueError, json.JSONDecodeError):
            pass

    if origin not in {item.rstrip("/") for item in allowed}:
        raise HTTPException(status_code=403, detail="Origine frontend non autorisée pour le SSO.")
    if (settings.is_production or settings.is_staging) and parsed.scheme != "https":
        raise HTTPException(status_code=403, detail="HTTPS est obligatoire pour le frontend SSO.")
    return origin


async def _audit(
    db: AsyncSession,
    request: Request,
    *,
    user_id: uuid.UUID | None,
    action: str,
    resource_id: str,
    description: str,
    details: dict,
    tenant_id: str | None = None,
    institution_id: str | None = None,
    severity: str = "info",
) -> None:
    try:
        await AuditService(db).log_action(
            user_id=user_id,
            action=action,
            resource_type="federated_identity",
            resource_id=resource_id,
            category="auth",
            description=description,
            details=details,
            severity=severity,
            ip_address=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("User-Agent", "unknown")[:512],
            tenant_id=tenant_id,
            institution_id=institution_id,
        )
    except Exception:
        # Authentication must not disclose audit backend failures. Production
        # observability will still surface the failed audit write separately.
        pass


@public_router.get("/status", summary="État SSO OIDC")
async def sso_status() -> dict:
    """Return only non-secret federation readiness information."""
    return oidc_service.readiness()


@public_router.get("/oidc/login", summary="Démarrer la connexion SSO")
async def oidc_login(
    return_to: str | None = Query(default="/"),
    frontend_origin: str = Query(..., min_length=8, max_length=512),
):
    trusted_origin = _trusted_frontend_origin(frontend_origin)
    try:
        authorization_url = await oidc_service.start_authorization(
            return_to,
            frontend_origin=trusted_origin,
        )
    except OIDCError as exc:
        raise _oidc_http_error(exc) from exc
    response = RedirectResponse(authorization_url, status_code=status.HTTP_302_FOUND)
    response.headers["Cache-Control"] = "no-store"
    return response


@public_router.get(
    "/oidc/callback",
    summary="Callback OIDC sécurisé",
)
async def oidc_callback(
    request: Request,
    state: str = Query(..., min_length=20, max_length=512),
    code: str | None = Query(default=None, max_length=4096),
    error: str | None = Query(default=None, max_length=255),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    try:
        state_data = await oidc_service.consume_authorization_state(state)
        if error:
            raise OIDCError("provider_rejected", "Le fournisseur d'identité a refusé la connexion.")
        if not code:
            raise OIDCError("missing_code", "Code d'autorisation OIDC manquant.")
        id_token = await oidc_service.exchange_authorization_code(
            code,
            state_data["code_verifier"],
        )
        claims = await oidc_service.validate_id_token(id_token, state_data["nonce"])
        identity, user = await federated_identity_service.resolve_verified_identity(
            db=db,
            claims=claims,
        )
        exchange_code = await oidc_service.create_local_exchange(
            identity_id=str(identity.id),
            user_id=str(user.id),
            return_to=state_data["return_to"],
            mfa_required=user.mfa_enabled,
        )
    except OIDCError as exc:
        await _audit(
            db,
            request,
            user_id=None,
            action="LOGIN",
            resource_id="oidc",
            description="Connexion OIDC refusée",
            details={"success": False, "reason": exc.code},
            severity="warning",
        )
        raise _oidc_http_error(exc) from exc
    except FederatedIdentityError as exc:
        await _audit(
            db,
            request,
            user_id=None,
            action="LOGIN",
            resource_id="oidc",
            description="Identité OIDC vérifiée mais non autorisée",
            details={"success": False, "reason": exc.code},
            severity="warning",
        )
        raise _identity_http_error(exc) from exc

    await _audit(
        db,
        request,
        user_id=user.id,
        action="LOGIN",
        resource_id=str(identity.id),
        description="Identité OIDC vérifiée; code d'échange local émis",
        details={
            "success": True,
            "provider": settings.OIDC_PROVIDER,
            "subject_fingerprint": _subject_fingerprint(claims.subject),
            "mfa_required": user.mfa_enabled,
        },
        tenant_id=user.tenant_id,
        institution_id=user.institution_id,
    )

    redirect_query = urlencode({"sso_exchange": exchange_code})
    frontend_origin = state_data["frontend_origin"].rstrip("/")
    response = RedirectResponse(
        f"{frontend_origin}/?{redirect_query}",
        status_code=status.HTTP_302_FOUND,
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@public_router.post(
    "/exchange",
    response_model=SSOExchangeResponse,
    summary="Échanger le code SSO local contre une session eAdmin",
)
async def exchange_sso_code(
    request: Request,
    body: SSOExchangeRequest,
    db: AsyncSession = Depends(get_db),
) -> SSOExchangeResponse:
    try:
        exchange = await oidc_service.consume_local_exchange(body.exchange_code)
        identity_id = uuid.UUID(exchange["identity_id"])
        user_id = uuid.UUID(exchange["user_id"])
        user = await federated_identity_service.validate_exchange_binding(
            db=db,
            identity_id=identity_id,
            user_id=user_id,
        )
    except (ValueError, OIDCError) as exc:
        if isinstance(exc, OIDCError):
            raise _oidc_http_error(exc) from exc
        raise HTTPException(status_code=401, detail="Code d'échange SSO invalide.") from exc
    except FederatedIdentityError as exc:
        raise _identity_http_error(exc) from exc

    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "frontend_role": user.role.to_frontend_role(),
        "tenant_id": user.tenant_id or settings.TENANT_DEFAULT_ID,
        "institution_id": user.institution_id or "",
        "auth_source": "oidc",
        "federated_identity_id": str(identity_id),
    }
    if user.mfa_enabled:
        token_data.update({"mfa_required": True, "mfa_verified": False})
        access_token = create_access_token(token_data, expires_delta=timedelta(minutes=5))
    else:
        access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    try:
        refresh_payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        refresh_jti = str(refresh_payload.get("jti") or "")
        refresh_exp = int(refresh_payload.get("exp") or 0)
        ttl_seconds = max(0, refresh_exp - int(datetime.now(timezone.utc).timestamp()))
        if not refresh_jti or ttl_seconds <= 0:
            raise RuntimeError("invalid refresh token metadata")
        await token_blacklist.store_refresh_token(str(user.id), refresh_jti, ttl_seconds)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="La session SSO n'a pas pu être enregistrée de manière sûre.",
        ) from exc

    await _audit(
        db,
        request,
        user_id=user.id,
        action="LOGIN",
        resource_id=str(identity_id),
        description="Session eAdmin issue d'une fédération OIDC",
        details={"success": True, "mfa_required": user.mfa_enabled},
        tenant_id=user.tenant_id,
        institution_id=user.institution_id,
    )
    return SSOExchangeResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        mfa_required=user.mfa_enabled,
        return_to=exchange["return_to"],
    )


async def _load_manageable_target(
    db: AsyncSession,
    actor: User,
    user_id: uuid.UUID,
) -> User:
    target = await db.scalar(select(User).where(User.id == user_id))
    if target is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if not authorization_service.can_administer_user(actor, target):
        raise HTTPException(status_code=403, detail="Utilisateur hors de votre périmètre IAM.")
    return target


@admin_router.post(
    "/links",
    response_model=FederatedIdentityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Lier explicitement une identité OIDC",
)
async def link_federated_identity(
    body: FederatedIdentityLinkRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FederatedIdentity:
    if not settings.OIDC_ISSUER:
        raise HTTPException(status_code=503, detail="Issuer OIDC non configuré.")
    target = await _load_manageable_target(db, current_user, body.user_id)
    if not target.is_active:
        raise HTTPException(status_code=409, detail="Impossible de lier un compte désactivé.")
    try:
        identity = await federated_identity_service.link_identity(
            db=db,
            user_id=target.id,
            subject=body.subject,
            linked_by=current_user.id,
            email_snapshot=str(body.email_snapshot) if body.email_snapshot else None,
        )
    except FederatedIdentityError as exc:
        raise _identity_http_error(exc) from exc

    await _audit(
        db,
        request,
        user_id=current_user.id,
        action="CREATE",
        resource_id=str(identity.id),
        description="Liaison d'identité OIDC créée",
        details={
            "target_user_id": str(target.id),
            "subject_fingerprint": _subject_fingerprint(identity.subject),
            "issuer": identity.issuer,
        },
        tenant_id=target.tenant_id,
        institution_id=target.institution_id,
        severity="warning",
    )
    return identity


@admin_router.get(
    "/users/{user_id}/links",
    response_model=list[FederatedIdentityResponse],
    summary="Lister les identités fédérées d'un compte",
)
async def list_federated_identities(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FederatedIdentity]:
    await _load_manageable_target(db, current_user, user_id)
    return await federated_identity_service.list_for_user(db=db, user_id=user_id)


async def _set_identity_status(
    *,
    identity_id: uuid.UUID,
    target_status: str,
    request: Request,
    db: AsyncSession,
    current_user: User,
) -> FederatedIdentity:
    try:
        identity = await federated_identity_service.get_identity(
            db=db,
            identity_id=identity_id,
        )
    except FederatedIdentityError as exc:
        raise _identity_http_error(exc) from exc

    target = await _load_manageable_target(db, current_user, identity.user_id)
    if target_status == "disabled":
        now = datetime.now(timezone.utc)
        await token_blacklist.revoke_all_user_tokens(str(target.id))
        target.sessions_invalid_before = now
        await db.flush()

    try:
        identity = await federated_identity_service.set_status(
            db=db,
            identity_id=identity_id,
            status=target_status,
            actor_id=current_user.id,
        )
    except FederatedIdentityError as exc:
        raise _identity_http_error(exc) from exc

    await _audit(
        db,
        request,
        user_id=current_user.id,
        action="PERMISSION_CHANGE",
        resource_id=str(identity.id),
        description=f"Liaison OIDC {target_status}",
        details={
            "target_user_id": str(target.id),
            "status": target_status,
            "sessions_invalidated": target_status == "disabled",
        },
        tenant_id=target.tenant_id,
        institution_id=target.institution_id,
        severity="critical" if target_status == "disabled" else "warning",
    )
    return identity


@admin_router.post(
    "/links/{identity_id}/disable",
    response_model=FederatedIdentityResponse,
    summary="Désactiver une liaison SSO",
)
async def disable_federated_identity(
    identity_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FederatedIdentity:
    return await _set_identity_status(
        identity_id=identity_id,
        target_status="disabled",
        request=request,
        db=db,
        current_user=current_user,
    )


@admin_router.post(
    "/links/{identity_id}/enable",
    response_model=FederatedIdentityResponse,
    summary="Réactiver une liaison SSO",
)
async def enable_federated_identity(
    identity_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FederatedIdentity:
    return await _set_identity_status(
        identity_id=identity_id,
        target_status="active",
        request=request,
        db=db,
        current_user=current_user,
    )
