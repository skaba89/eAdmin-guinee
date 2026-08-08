"""Security regression tests for refresh-token rotation hardening."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

import app.api.auth_hardening as hardening
from app.api.auth import create_refresh_token
from app.models.user import RoleEnum


def fake_db_for_user(user):
    result = MagicMock()
    result.scalar_one_or_none.return_value = user
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)
    return db


def fake_user(*, mfa_enabled: bool = False, is_active: bool = True):
    return SimpleNamespace(
        id=uuid.uuid4(),
        is_active=is_active,
        mfa_enabled=mfa_enabled,
        role=RoleEnum.AGENT,
        tenant_id="republique-de-guinee",
        institution_id="ministere-test",
    )


@pytest.mark.asyncio
async def test_consume_refresh_token_accepts_single_redis_removal(monkeypatch):
    redis = MagicMock()
    redis.srem = AsyncMock(return_value=1)
    service = MagicMock()
    service._get_redis = AsyncMock(return_value=redis)
    monkeypatch.setattr(hardening.auth_api, "token_blacklist", service)

    assert await hardening._consume_refresh_token("user-1", "jti-1") is True
    redis.srem.assert_awaited_once()


@pytest.mark.asyncio
async def test_consume_refresh_token_rejects_missing_redis_member(monkeypatch):
    redis = MagicMock()
    redis.srem = AsyncMock(return_value=0)
    service = MagicMock()
    service._get_redis = AsyncMock(return_value=redis)
    monkeypatch.setattr(hardening.auth_api, "token_blacklist", service)

    assert await hardening._consume_refresh_token("user-1", "jti-1") is False


@pytest.mark.asyncio
async def test_consume_refresh_token_supports_legacy_test_double(monkeypatch):
    redis = MagicMock()
    redis.srem = AsyncMock(return_value=MagicMock())
    service = MagicMock()
    service._get_redis = AsyncMock(return_value=redis)
    service._refresh_tokens = {"user-1": {"jti-1"}}
    monkeypatch.setattr(hardening.auth_api, "token_blacklist", service)

    assert await hardening._consume_refresh_token("user-1", "jti-1") is True
    assert "jti-1" not in service._refresh_tokens["user-1"]


@pytest.mark.asyncio
async def test_secure_refresh_rejects_invalid_jwt():
    with pytest.raises(HTTPException) as exc:
        await hardening.secure_refresh_token(
            hardening.SecureRefreshRequest(refresh_token="not-a-jwt"),
            MagicMock(),
        )
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_secure_refresh_rejects_non_uuid_subject():
    token = create_refresh_token({"sub": "not-a-uuid", "role": "AGENT"})

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_refresh_token(
            hardening.SecureRefreshRequest(refresh_token=token),
            MagicMock(),
        )
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_secure_refresh_rejects_inactive_user():
    user = fake_user(is_active=False)
    token = create_refresh_token({"sub": str(user.id), "role": "AGENT"})

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_refresh_token(
            hardening.SecureRefreshRequest(refresh_token=token),
            fake_db_for_user(user),
        )
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_secure_refresh_blocks_mfa_pending_session():
    user = fake_user(mfa_enabled=True)
    token = create_refresh_token({
        "sub": str(user.id),
        "role": "AGENT",
        "mfa_required": True,
        "mfa_verified": False,
    })

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_refresh_token(
            hardening.SecureRefreshRequest(refresh_token=token),
            fake_db_for_user(user),
        )
    assert exc.value.status_code == 403
    assert "MFA" in exc.value.detail


@pytest.mark.asyncio
async def test_secure_refresh_replay_revokes_all_sessions(monkeypatch):
    user = fake_user()
    token = create_refresh_token({"sub": str(user.id), "role": "AGENT"})
    monkeypatch.setattr(hardening, "_consume_refresh_token", AsyncMock(return_value=False))
    blacklist = MagicMock()
    blacklist.revoke_all_user_tokens = AsyncMock(return_value=2)
    monkeypatch.setattr(hardening.auth_api, "token_blacklist", blacklist)

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_refresh_token(
            hardening.SecureRefreshRequest(refresh_token=token),
            fake_db_for_user(user),
        )

    assert exc.value.status_code == 401
    blacklist.revoke_all_user_tokens.assert_awaited_once_with(str(user.id))


@pytest.mark.asyncio
async def test_secure_refresh_rotates_token_and_preserves_verified_mfa(monkeypatch):
    user = fake_user(mfa_enabled=True)
    token = create_refresh_token({
        "sub": str(user.id),
        "role": "AGENT",
        "mfa_required": True,
        "mfa_verified": True,
    })
    monkeypatch.setattr(hardening, "_consume_refresh_token", AsyncMock(return_value=True))
    blacklist = MagicMock()
    blacklist.store_refresh_token = AsyncMock()
    blacklist.revoke_all_user_tokens = AsyncMock()
    monkeypatch.setattr(hardening.auth_api, "token_blacklist", blacklist)

    response = await hardening.secure_refresh_token(
        hardening.SecureRefreshRequest(refresh_token=token),
        fake_db_for_user(user),
    )

    assert response.access_token
    assert response.refresh_token
    assert response.refresh_token != token
    blacklist.store_refresh_token.assert_awaited_once()
