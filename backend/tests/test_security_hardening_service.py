"""Tests for security-route hardening and forced session revocation."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

import app.api.security_hardening as hardening
from app.api import auth as auth_api
from app.main import app


def user(*, enabled=True, secret="JBSWY3DPEHPK3PXP"):
    return SimpleNamespace(
        id=uuid.uuid4(),
        mfa_enabled=enabled,
        mfa_secret=secret,
        hashed_password="hashed-password",
        sessions_invalid_before=None,
    )


def request_with_ip(ip="127.0.0.1"):
    return SimpleNamespace(client=SimpleNamespace(host=ip), headers={})


@pytest.mark.parametrize(
    ("path", "endpoint"),
    [
        ("/api/v1/security/setup-mfa", hardening.secure_security_setup_mfa),
        ("/api/v1/security/verify-mfa", hardening.secure_security_verify_mfa),
        ("/api/v1/security/change-password", hardening.secure_security_change_password),
    ],
)
def test_security_legacy_routes_are_shadowed_by_hardened_handlers(path, endpoint):
    matching = [
        route
        for route in app.routes
        if getattr(route, "path", None) == path
        and "POST" in (getattr(route, "methods", set()) or set())
    ]
    assert len(matching) >= 2
    assert matching[0].endpoint is endpoint


@pytest.mark.asyncio
async def test_security_setup_mfa_delegates_to_canonical_auth_flow(monkeypatch):
    current_user = user(enabled=False, secret=None)
    request = request_with_ip()
    db = MagicMock()
    expected = MagicMock()
    canonical = AsyncMock(return_value=expected)
    monkeypatch.setattr(hardening.auth_api, "setup_mfa", canonical)

    result = await hardening.secure_security_setup_mfa(request, current_user, db)

    assert result is expected
    canonical.assert_awaited_once_with(request, current_user, db)


@pytest.mark.asyncio
async def test_security_verify_mfa_delegates_to_canonical_auth_flow(monkeypatch):
    current_user = user()
    request = request_with_ip()
    db = MagicMock()
    body = auth_api.MFAVerifyRequest(code="123456", session_id="legacy-session")
    canonical = AsyncMock(return_value={"access_token": "a", "refresh_token": "r"})
    monkeypatch.setattr(hardening.auth_api, "verify_mfa", canonical)

    result = await hardening.secure_security_verify_mfa(
        request,
        body,
        current_user,
        db,
    )

    assert result["refresh_token"] == "r"
    canonical.assert_awaited_once_with(request, body, current_user, db)


@pytest.mark.asyncio
async def test_security_password_route_delegates_to_durable_auth_flow(monkeypatch):
    current_user = user()
    request = request_with_ip()
    db = MagicMock()
    body = auth_api.ChangePasswordRequest(
        current_password="AncienSecret2026!Z",
        new_password="NouveauSecret2026!Z",
    )
    durable = AsyncMock(return_value={"message": "ok"})
    monkeypatch.setattr(hardening.auth_hardening, "secure_change_password", durable)

    result = await hardening.secure_security_change_password(
        request,
        body,
        current_user,
        db,
    )

    assert result == {"message": "ok"}
    durable.assert_awaited_once_with(request, body, current_user, db)


@pytest.mark.asyncio
async def test_disable_mfa_requires_enabled_configuration():
    with pytest.raises(HTTPException) as exc:
        await hardening.secure_disable_mfa(
            request_with_ip(),
            hardening.SecureMFADisableRequest(password="Password2026!", code="123456"),
            user(enabled=False),
            MagicMock(),
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_disable_mfa_rejects_wrong_password(monkeypatch):
    monkeypatch.setattr(hardening, "verify_password", lambda *_: False)

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_disable_mfa(
            request_with_ip(),
            hardening.SecureMFADisableRequest(password="Wrong2026!", code="123456"),
            user(),
            MagicMock(),
        )
    assert exc.value.status_code == 401
    assert "Mot de passe" in exc.value.detail


@pytest.mark.asyncio
async def test_disable_mfa_rejects_malformed_totp(monkeypatch):
    monkeypatch.setattr(hardening, "verify_password", lambda *_: True)

    for code in ("abc123", "12345", "1234567"):
        with pytest.raises(HTTPException) as exc:
            await hardening.secure_disable_mfa(
                request_with_ip(),
                hardening.SecureMFADisableRequest(password="Password2026!", code=code),
                user(),
                MagicMock(),
            )
        assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_disable_mfa_rejects_invalid_totp(monkeypatch):
    monkeypatch.setattr(hardening, "verify_password", lambda *_: True)
    monkeypatch.setattr(hardening, "_verify_totp_code", lambda *_: False)

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_disable_mfa(
            request_with_ip(),
            hardening.SecureMFADisableRequest(password="Password2026!", code="123456"),
            user(),
            MagicMock(),
        )
    assert exc.value.status_code == 401
    assert "MFA" in exc.value.detail


@pytest.mark.asyncio
async def test_disable_mfa_sets_durable_cutoff_and_revokes_refresh(monkeypatch):
    current_user = user()
    db = MagicMock()
    db.flush = AsyncMock()
    cleanup = AsyncMock()

    monkeypatch.setattr(hardening, "verify_password", lambda *_: True)
    monkeypatch.setattr(hardening, "_verify_totp_code", lambda *_: True)
    monkeypatch.setattr(
        hardening.auth_hardening,
        "_revoke_refresh_tokens_best_effort",
        cleanup,
    )

    result = await hardening.secure_disable_mfa(
        request_with_ip("10.0.0.10"),
        hardening.SecureMFADisableRequest(password="Password2026!", code="123456"),
        current_user,
        db,
    )

    assert current_user.mfa_enabled is False
    assert current_user.mfa_secret is None
    assert current_user.sessions_invalid_before is not None
    db.flush.assert_awaited_once()
    cleanup.assert_awaited_once_with(str(current_user.id))
    assert "sessions" in result["message"].lower()
