"""Tests for MFA-disable hardening and forced session revocation."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

import app.api.security_hardening as hardening


def user(*, enabled=True, secret="JBSWY3DPEHPK3PXP"):
    return SimpleNamespace(
        id=uuid.uuid4(),
        mfa_enabled=enabled,
        mfa_secret=secret,
        hashed_password="hashed-password",
    )


def request_with_ip(ip="127.0.0.1"):
    return SimpleNamespace(client=SimpleNamespace(host=ip))


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
async def test_disable_mfa_clears_secret_and_revokes_sessions(monkeypatch):
    current_user = user()
    db = MagicMock()
    db.flush = AsyncMock()
    blacklist = MagicMock()
    blacklist.revoke_all_user_tokens = AsyncMock(return_value=2)

    monkeypatch.setattr(hardening, "verify_password", lambda *_: True)
    monkeypatch.setattr(hardening, "_verify_totp_code", lambda *_: True)
    monkeypatch.setattr(hardening, "token_blacklist", blacklist)

    result = await hardening.secure_disable_mfa(
        request_with_ip("10.0.0.10"),
        hardening.SecureMFADisableRequest(password="Password2026!", code="123456"),
        current_user,
        db,
    )

    assert current_user.mfa_enabled is False
    assert current_user.mfa_secret is None
    db.flush.assert_awaited_once()
    blacklist.revoke_all_user_tokens.assert_awaited_once_with(str(current_user.id))
    assert "sessions" in result["message"].lower()
