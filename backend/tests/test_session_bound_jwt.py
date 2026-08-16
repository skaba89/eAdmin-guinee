"""Regression tests for Redis-bound JWT session families."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from jose import jwt
from starlette.requests import Request
from starlette.responses import Response

from app.api import auth as auth_api
import app.api.auth_hardening as auth_hardening
import app.api.auth_session_hardening as session_auth
from app.config import settings
from app.main import app
from app.models.user import RoleEnum
import app.middleware.session_validity as validity
import app.services.session_binding as binding
from app.services.session_binding import SessionRegistryUnavailable


def request_with_auth(token: str | None = None) -> Request:
    headers = [(b"user-agent", b"pytest-session-binding")]
    if token:
        headers.append((b"authorization", f"Bearer {token}".encode()))
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "https",
            "path": "/api/v1/auth/me",
            "raw_path": b"/api/v1/auth/me",
            "query_string": b"",
            "headers": headers,
            "client": ("127.0.0.1", 12345),
            "server": ("test", 443),
            "app": app,
        }
    )


def token_claims(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def fake_user(user_id: uuid.UUID | None = None):
    return SimpleNamespace(
        id=user_id or uuid.uuid4(),
        is_active=True,
        mfa_enabled=False,
        role=RoleEnum.AGENT,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-a",
        sessions_invalid_before=None,
    )


def test_auth_login_and_mfa_routes_are_shadowed_by_session_handlers():
    expected = {
        "/api/v1/auth/login": session_auth.secure_session_login,
        "/api/v1/auth/verify-mfa": session_auth.secure_session_verify_mfa,
    }
    for path, endpoint in expected.items():
        matching = [
            route
            for route in app.routes
            if getattr(route, "path", None) == path
            and "POST" in (getattr(route, "methods", set()) or set())
        ]
        assert len(matching) >= 2
        assert matching[0].endpoint is endpoint


@pytest.mark.asyncio
async def test_create_bound_session_uses_request_context(monkeypatch):
    registry = SimpleNamespace(create_session=AsyncMock(return_value="sid-123"))
    monkeypatch.setattr(binding, "session_service", registry)
    monkeypatch.setattr(binding.settings, "ENVIRONMENT", "development")
    request = request_with_auth()

    sid = await binding.create_bound_session("user-123", request)

    assert sid == "sid-123"
    kwargs = registry.create_session.await_args.kwargs
    assert kwargs["user_id"] == "user-123"
    assert kwargs["ip_address"] == "127.0.0.1"
    assert kwargs["user_agent"] == "pytest-session-binding"
    assert len(kwargs["device_fingerprint"]) == 16


@pytest.mark.asyncio
async def test_create_bound_session_fails_closed_in_production(monkeypatch):
    registry = SimpleNamespace(
        create_session=AsyncMock(side_effect=RuntimeError("redis unavailable"))
    )
    monkeypatch.setattr(binding, "session_service", registry)
    monkeypatch.setattr(binding.settings, "ENVIRONMENT", "production")

    with pytest.raises(SessionRegistryUnavailable):
        await binding.create_bound_session("user-123", request_with_auth())


@pytest.mark.asyncio
async def test_bound_session_validation_checks_owner_and_touches(monkeypatch):
    registry = SimpleNamespace(
        validate_session=AsyncMock(return_value={"user_id": "user-a"}),
        update_session_activity=AsyncMock(),
    )
    monkeypatch.setattr(binding, "session_service", registry)

    assert await binding.validate_bound_session("sid-a", "user-a", touch=True) is True
    registry.update_session_activity.assert_awaited_once_with("sid-a")

    registry.validate_session.return_value = {"user_id": "user-b"}
    assert await binding.validate_bound_session("sid-a", "user-a", touch=True) is False


@pytest.mark.asyncio
async def test_bound_session_validation_never_fails_open(monkeypatch):
    registry = SimpleNamespace(
        validate_session=AsyncMock(side_effect=RuntimeError("redis unavailable")),
        update_session_activity=AsyncMock(),
    )
    monkeypatch.setattr(binding, "session_service", registry)

    with pytest.raises(SessionRegistryUnavailable):
        await binding.validate_bound_session("sid-a", "user-a")


@pytest.mark.asyncio
async def test_token_pair_is_reissued_with_same_sid(monkeypatch):
    user_id = str(uuid.uuid4())
    claims = {
        "sub": user_id,
        "role": "AGENT",
        "frontend_role": "agent",
        "tenant_id": settings.TENANT_DEFAULT_ID,
        "institution_id": "inst-a",
    }
    access = auth_api.create_access_token(claims)
    refresh = auth_api.create_refresh_token(claims)

    monkeypatch.setattr(
        session_auth,
        "create_bound_session",
        AsyncMock(return_value="sid-bound-1"),
    )
    blacklist = SimpleNamespace(store_refresh_token=AsyncMock())
    monkeypatch.setattr(session_auth.auth_api, "token_blacklist", blacklist)

    bound_access, bound_refresh = await session_auth._bind_token_pair(
        access_token=access,
        refresh_token=refresh,
        request=request_with_auth(),
    )

    assert token_claims(bound_access)["sid"] == "sid-bound-1"
    assert token_claims(bound_refresh)["sid"] == "sid-bound-1"
    assert token_claims(bound_access)["sub"] == user_id
    blacklist.store_refresh_token.assert_awaited_once()


@pytest.mark.asyncio
async def test_mfa_pending_login_does_not_create_final_session(monkeypatch):
    user_id = str(uuid.uuid4())
    claims = {
        "sub": user_id,
        "role": "AGENT",
        "frontend_role": "agent",
        "tenant_id": settings.TENANT_DEFAULT_ID,
        "institution_id": "inst-a",
        "mfa_required": True,
        "mfa_verified": False,
    }
    response = auth_api.TokenResponse(
        access_token=auth_api.create_access_token(claims),
        refresh_token=auth_api.create_refresh_token(claims),
    )
    monkeypatch.setattr(session_auth.auth_api, "login", AsyncMock(return_value=response))
    create_session = AsyncMock(return_value="sid-should-not-exist")
    monkeypatch.setattr(session_auth, "create_bound_session", create_session)

    result = await session_auth.secure_session_login(
        request_with_auth(),
        MagicMock(),
        MagicMock(),
    )

    assert result.access_token == response.access_token
    assert "sid" not in token_claims(result.access_token)
    create_session.assert_not_awaited()


@pytest.mark.asyncio
async def test_refresh_validates_and_preserves_bound_sid(monkeypatch):
    user = fake_user()
    claims = {
        "sub": str(user.id),
        "role": user.role.value,
        "frontend_role": user.role.to_frontend_role(),
        "tenant_id": user.tenant_id,
        "institution_id": user.institution_id,
        "sid": "sid-refresh-1",
    }
    refresh = auth_api.create_refresh_token(claims)

    monkeypatch.setattr(auth_hardening, "_lock_user", AsyncMock(return_value=user))
    validate = AsyncMock(return_value=True)
    monkeypatch.setattr(auth_hardening, "validate_bound_session", validate)
    monkeypatch.setattr(auth_hardening, "_consume_refresh_token", AsyncMock(return_value=True))
    blacklist = SimpleNamespace(store_refresh_token=AsyncMock())
    monkeypatch.setattr(auth_hardening.auth_api, "token_blacklist", blacklist)

    result = await auth_hardening.secure_refresh_token(
        auth_hardening.SecureRefreshRequest(refresh_token=refresh),
        MagicMock(),
    )

    assert token_claims(result.access_token)["sid"] == "sid-refresh-1"
    assert token_claims(result.refresh_token)["sid"] == "sid-refresh-1"
    validate.assert_awaited_once_with("sid-refresh-1", str(user.id), touch=True)


@pytest.mark.asyncio
async def test_refresh_rejects_deleted_bound_session_before_consuming_token(monkeypatch):
    user = fake_user()
    refresh = auth_api.create_refresh_token(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "tenant_id": user.tenant_id,
            "institution_id": user.institution_id,
            "sid": "sid-deleted",
        }
    )
    monkeypatch.setattr(auth_hardening, "_lock_user", AsyncMock(return_value=user))
    monkeypatch.setattr(
        auth_hardening,
        "validate_bound_session",
        AsyncMock(return_value=False),
    )
    consume = AsyncMock(return_value=True)
    monkeypatch.setattr(auth_hardening, "_consume_refresh_token", consume)

    with pytest.raises(HTTPException) as exc:
        await auth_hardening.secure_refresh_token(
            auth_hardening.SecureRefreshRequest(refresh_token=refresh),
            MagicMock(),
        )

    assert exc.value.status_code == 401
    consume.assert_not_awaited()


@pytest.mark.asyncio
async def test_middleware_rejects_missing_bound_session(monkeypatch):
    user = fake_user()
    token = auth_api.create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "tenant_id": user.tenant_id,
            "institution_id": user.institution_id,
            "sid": "sid-missing",
        }
    )
    monkeypatch.setattr(validity, "_lookup_from_fastapi_override", AsyncMock(return_value=user))
    monkeypatch.setattr(validity, "validate_bound_session", AsyncMock(return_value=False))
    middleware = validity.SessionValidityMiddleware(app=app)

    response = await middleware.dispatch(
        request_with_auth(token),
        AsyncMock(return_value=Response(status_code=204)),
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_middleware_returns_503_when_bound_registry_unavailable(monkeypatch):
    user = fake_user()
    token = auth_api.create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "tenant_id": user.tenant_id,
            "institution_id": user.institution_id,
            "sid": "sid-unavailable",
        }
    )
    monkeypatch.setattr(validity, "_lookup_from_fastapi_override", AsyncMock(return_value=user))
    monkeypatch.setattr(
        validity,
        "validate_bound_session",
        AsyncMock(side_effect=SessionRegistryUnavailable("redis down")),
    )
    middleware = validity.SessionValidityMiddleware(app=app)

    response = await middleware.dispatch(
        request_with_auth(token),
        AsyncMock(return_value=Response(status_code=204)),
    )

    assert response.status_code == 503


@pytest.mark.asyncio
async def test_middleware_keeps_legacy_token_rollout_compatible(monkeypatch):
    user = fake_user()
    token = auth_api.create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "tenant_id": user.tenant_id,
            "institution_id": user.institution_id,
        }
    )
    monkeypatch.setattr(validity, "_lookup_from_fastapi_override", AsyncMock(return_value=user))
    validate = AsyncMock(return_value=True)
    monkeypatch.setattr(validity, "validate_bound_session", validate)
    middleware = validity.SessionValidityMiddleware(app=app)

    response = await middleware.dispatch(
        request_with_auth(token),
        AsyncMock(return_value=Response(status_code=204)),
    )

    assert response.status_code == 204
    validate.assert_not_awaited()
