"""Security endpoint contracts backed by the shared Redis SessionService."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, call

import pytest
from fastapi import HTTPException

import app.api.security_hardening as hardening
from app.api.auth import create_access_token
from app.config import settings
from app.main import app


def user():
    return SimpleNamespace(id=uuid.uuid4())


def request_with_sid(user_id: str, sid: str | None):
    claims = {
        "sub": user_id,
        "role": "AGENT",
        "tenant_id": settings.TENANT_DEFAULT_ID,
        "institution_id": "inst-a",
    }
    if sid:
        claims["sid"] = sid
    token = create_access_token(claims)
    return SimpleNamespace(headers={"Authorization": f"Bearer {token}"})


def registry(**overrides):
    defaults = {
        "get_user_sessions": AsyncMock(return_value=[]),
        "validate_session": AsyncMock(return_value=None),
        "destroy_session": AsyncMock(),
        "get_security_events": AsyncMock(return_value=[]),
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


@pytest.mark.parametrize(
    ("path", "method", "endpoint"),
    [
        ("/api/v1/security/sessions", "GET", hardening.secure_get_active_sessions),
        ("/api/v1/security/sessions/{session_id}", "DELETE", hardening.secure_terminate_session),
        ("/api/v1/security/sessions", "DELETE", hardening.secure_revoke_other_sessions),
        ("/api/v1/security/security-events", "GET", hardening.secure_get_security_events),
    ],
)
def test_redis_security_routes_shadow_legacy_handlers(path, method, endpoint):
    matching = [
        route
        for route in app.routes
        if getattr(route, "path", None) == path
        and method in (getattr(route, "methods", set()) or set())
    ]
    assert len(matching) >= 2
    assert matching[0].endpoint is endpoint


@pytest.mark.asyncio
async def test_list_sessions_maps_shared_registry_contract(monkeypatch):
    current_user = user()
    session_registry = registry(
        get_user_sessions=AsyncMock(
            return_value=[
                {
                    "session_id": "sid-a",
                    "user_id": str(current_user.id),
                    "ip_address": "10.0.0.1",
                    "user_agent": "Browser A",
                    "created_at": "2026-08-16T06:00:00+00:00",
                    "last_activity": "2026-08-16T07:00:00+00:00",
                    "mfa_verified": "1",
                }
            ]
        )
    )
    monkeypatch.setattr(hardening, "session_service", session_registry)

    rows = await hardening.secure_get_active_sessions(current_user)

    assert len(rows) == 1
    assert rows[0].session_id == "sid-a"
    assert rows[0].ip_address == "10.0.0.1"
    assert rows[0].mfa_verified is True
    session_registry.get_user_sessions.assert_awaited_once_with(str(current_user.id))


@pytest.mark.asyncio
async def test_terminate_owned_session_destroys_redis_record(monkeypatch):
    current_user = user()
    session_registry = registry(
        validate_session=AsyncMock(return_value={"user_id": str(current_user.id)})
    )
    monkeypatch.setattr(hardening, "session_service", session_registry)

    result = await hardening.secure_terminate_session("sid-owned", current_user)

    assert result == {"message": "Session terminée avec succès"}
    session_registry.destroy_session.assert_awaited_once_with("sid-owned")


@pytest.mark.asyncio
async def test_terminate_foreign_session_is_not_enumerable(monkeypatch):
    current_user = user()
    session_registry = registry(
        validate_session=AsyncMock(return_value={"user_id": str(uuid.uuid4())})
    )
    monkeypatch.setattr(hardening, "session_service", session_registry)

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_terminate_session("sid-foreign", current_user)

    assert exc.value.status_code == 404
    session_registry.destroy_session.assert_not_awaited()


@pytest.mark.asyncio
async def test_revoke_other_sessions_keeps_signed_current_sid(monkeypatch):
    current_user = user()
    session_registry = registry(
        get_user_sessions=AsyncMock(
            return_value=[
                {"session_id": "sid-current"},
                {"session_id": "sid-other-a"},
                {"session_id": "sid-other-b"},
            ]
        )
    )
    monkeypatch.setattr(hardening, "session_service", session_registry)

    result = await hardening.secure_revoke_other_sessions(
        request_with_sid(str(current_user.id), "sid-current"),
        current_user,
    )

    assert result["terminated_count"] == 2
    assert session_registry.destroy_session.await_args_list == [
        call("sid-other-a"),
        call("sid-other-b"),
    ]


@pytest.mark.asyncio
async def test_revoke_with_legacy_token_removes_all_redis_sessions(monkeypatch):
    current_user = user()
    session_registry = registry(
        get_user_sessions=AsyncMock(
            return_value=[{"session_id": "sid-a"}, {"session_id": "sid-b"}]
        )
    )
    monkeypatch.setattr(hardening, "session_service", session_registry)

    result = await hardening.secure_revoke_other_sessions(
        request_with_sid(str(current_user.id), None),
        current_user,
    )

    assert result["terminated_count"] == 2
    assert session_registry.destroy_session.await_count == 2


@pytest.mark.asyncio
async def test_security_events_use_redis_and_clamp_limit(monkeypatch):
    current_user = user()
    session_registry = registry(
        get_security_events=AsyncMock(
            return_value=[
                {
                    "id": "evt-1",
                    "timestamp": "2026-08-16T07:00:00+00:00",
                    "event_type": "session_created",
                    "description": "Nouvelle session",
                    "ip_address": "10.0.0.1",
                    "severity": "info",
                }
            ]
        )
    )
    monkeypatch.setattr(hardening, "session_service", session_registry)

    rows = await hardening.secure_get_security_events(current_user, limit=999)

    assert rows[0].id == "evt-1"
    assert rows[0].event_type == "session_created"
    session_registry.get_security_events.assert_awaited_once_with(
        str(current_user.id),
        limit=100,
    )


@pytest.mark.asyncio
async def test_session_registry_failure_returns_503(monkeypatch):
    current_user = user()
    session_registry = registry(
        get_user_sessions=AsyncMock(side_effect=RuntimeError("redis down"))
    )
    monkeypatch.setattr(hardening, "session_service", session_registry)

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_get_active_sessions(current_user)

    assert exc.value.status_code == 503
