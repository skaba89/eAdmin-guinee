"""Global access-token lifecycle guard.

Rejects access JWTs whose embedded authorization scope no longer matches the
current account, whose `iat` predates a server-side invalidation cutoff, or
whose signed `sid` no longer resolves to the same Redis-backed user session.
"""

from datetime import datetime, timezone
import logging
import uuid

from jose import JWTError, jwt
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings
from app.database import async_session_factory, get_db
from app.models.user import User
from app.services.session_binding import (
    SessionRegistryUnavailable,
    validate_bound_session,
)

logger = logging.getLogger("eadmin.session_validity")


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


async def _production_user_lookup(user_uuid: uuid.UUID) -> User | None:
    async with async_session_factory() as db:
        # Authentication infrastructure receives read-only access to users even
        # when the users table is protected by FORCE RLS.
        db.sync_session.info["rls_scope"] = {
            "user_id": "",
            "tenant_id": "",
            "institution_id": "",
            "role": "AUTH_SERVICE",
            "is_super_admin": False,
        }
        return await db.scalar(select(User).where(User.id == user_uuid))


async def _lookup_from_fastapi_override(request: Request, user_uuid: uuid.UUID) -> User | None:
    """Use the same DB override FastAPI tests already install.

    This does not create a production bypass: dependency_overrides is empty in
    deployed applications, so production always uses `_production_user_lookup`.
    """
    override = request.app.dependency_overrides.get(get_db)
    if override is None:
        return await _production_user_lookup(user_uuid)

    dependency = override()
    try:
        db = await dependency.__anext__()
        return await db.scalar(select(User).where(User.id == user_uuid))
    finally:
        try:
            await dependency.__anext__()
        except StopAsyncIteration:
            pass


class SessionValidityMiddleware(BaseHTTPMiddleware):
    """Fail closed when an access token represents stale authorization state."""

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/v1/"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return await call_next(request)

        try:
            payload = jwt.decode(
                auth_header[7:],
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
        except JWTError:
            return await call_next(request)

        if payload.get("type") != "access":
            return await call_next(request)

        user_id = str(payload.get("sub") or "")
        iat_raw = payload.get("iat")
        try:
            user_uuid = uuid.UUID(user_id)
            token_iat = datetime.fromtimestamp(float(iat_raw), tz=timezone.utc)
        except (TypeError, ValueError, OverflowError):
            return JSONResponse(
                status_code=401,
                content={"detail": "Token de session invalide.", "code": "INVALID_SESSION_TOKEN"},
            )

        try:
            user = await _lookup_from_fastapi_override(request, user_uuid)
        except Exception as exc:
            logger.error("Session validity lookup failed user=%s error=%s", user_uuid, exc)
            return JSONResponse(
                status_code=503,
                content={
                    "detail": "La validité de la session n'a pas pu être vérifiée.",
                    "code": "SESSION_VALIDATION_UNAVAILABLE",
                },
            )

        if user is None or not user.is_active:
            return JSONResponse(
                status_code=401,
                content={"detail": "Session invalide ou compte désactivé.", "code": "SESSION_REVOKED"},
            )

        current_role = user.role.value
        current_tenant = user.tenant_id or settings.TENANT_DEFAULT_ID
        current_institution = user.institution_id or ""
        if (
            str(payload.get("role") or "") != current_role
            or str(payload.get("tenant_id") or settings.TENANT_DEFAULT_ID) != current_tenant
            or str(payload.get("institution_id") or "") != current_institution
        ):
            logger.warning("Rejected stale JWT scope user=%s", user.id)
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Les habilitations du compte ont changé. Reconnectez-vous.",
                    "code": "TOKEN_SCOPE_STALE",
                },
            )

        if user.sessions_invalid_before is not None:
            if token_iat <= _utc(user.sessions_invalid_before):
                logger.warning("Rejected JWT before session cutoff user=%s", user.id)
                return JSONResponse(
                    status_code=401,
                    content={
                        "detail": "Cette session a été révoquée. Reconnectez-vous.",
                        "code": "SESSION_REVOKED",
                    },
                )

        # Rollout compatibility: pre-sid JWTs remain governed by the durable DB
        # checks above until their normal expiration. Once sid is present, Redis
        # becomes mandatory and ownership must match the signed JWT subject.
        sid = str(payload.get("sid") or "")
        if sid:
            try:
                valid = await validate_bound_session(sid, user_id, touch=True)
            except SessionRegistryUnavailable as exc:
                logger.error("Bound session lookup failed sid=%s user=%s: %s", sid, user_id, exc)
                return JSONResponse(
                    status_code=503,
                    content={
                        "detail": "La session ne peut pas être vérifiée actuellement.",
                        "code": "SESSION_REGISTRY_UNAVAILABLE",
                    },
                )
            if not valid:
                logger.warning("Rejected missing/mismatched bound session sid=%s user=%s", sid, user_id)
                return JSONResponse(
                    status_code=401,
                    content={
                        "detail": "Cette session a été révoquée. Reconnectez-vous.",
                        "code": "SESSION_REVOKED",
                    },
                )

        return await call_next(request)
