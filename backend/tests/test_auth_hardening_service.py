"""Security regression tests for refresh rotation and global session revocation."""

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

import app.api.auth_hardening as hardening
from app.api.auth import ChangePasswordRequest, create_access_token, create_refresh_token
from app.models.user import RoleEnum


def fake_db_for_user(user):
    db = MagicMock()
    db.scalar = AsyncMock(return_value=user)
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    return db


def fake_user(*, mfa_enabled: bool = False, is_active: bool = True):
    return SimpleNamespace(
        id=uuid.uuid4(),
        email="agent@example.gn",
        hashed_password="old-hash",
        is_active=is_active,
        mfa_enabled=mfa_enabled,
        role=RoleEnum.AGENT,
        tenant_id="republique-de-guinee",
        institution_id="ministere-test",
        sessions_invalid_before=None,
    )


@pytest.mark.asyncio
async def test_consume_refresh_token_uses_atomic_service_method(monkeypatch):
    service = MagicMock()
    service.consume_refresh_token = AsyncMock(return_value=True)
    monkeypatch.setattr(hardening.auth_api, "token_blacklist", service)

    assert await hardening._consume_refresh_token("user-1", "jti-1") is True
    service.consume_refresh_token.assert_awaited_once_with("user-1", "jti-1")


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
async def test_secure_refresh_rejects_token_before_durable_cutoff(monkeypatch):
    user = fake_user()
    token = create_refresh_token({"sub": str(user.id), "role": "AGENT"})
    user.sessions_invalid_before = datetime.now(timezone.utc) + timedelta(seconds=1)
    consume = AsyncMock(return_value=True)
    monkeypatch.setattr(hardening, "_consume_refresh_token", consume)

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_refresh_token(
            hardening.SecureRefreshRequest(refresh_token=token),
            fake_db_for_user(user),
        )

    assert exc.value.status_code == 401
    consume.assert_not_awaited()


@pytest.mark.asyncio
async def test_secure_refresh_blocks_mfa_pending_session():
    user = fake_user(mfa_enabled=True)
    token = create_refresh_token(
        {
            "sub": str(user.id),
            "role": "AGENT",
            "mfa_required": True,
            "mfa_verified": False,
        }
    )

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_refresh_token(
            hardening.SecureRefreshRequest(refresh_token=token),
            fake_db_for_user(user),
        )
    assert exc.value.status_code == 403
    assert "MFA" in exc.value.detail


@pytest.mark.asyncio
async def test_secure_refresh_replay_persists_cutoff_before_401(monkeypatch):
    user = fake_user()
    token = create_refresh_token({"sub": str(user.id), "role": "AGENT"})
    db = fake_db_for_user(user)
    monkeypatch.setattr(hardening, "_consume_refresh_token", AsyncMock(return_value=False))
    blacklist = MagicMock()
    blacklist.revoke_all_user_tokens = AsyncMock(return_value=2)
    monkeypatch.setattr(hardening.auth_api, "token_blacklist", blacklist)

    with pytest.raises(HTTPException) as exc:
        await hardening.secure_refresh_token(
            hardening.SecureRefreshRequest(refresh_token=token),
            db,
        )

    assert exc.value.status_code == 401
    assert user.sessions_invalid_before is not None
    db.flush.assert_awaited()
    db.commit.assert_awaited_once()
    blacklist.revoke_all_user_tokens.assert_awaited_once_with(str(user.id))


@pytest.mark.asyncio
async def test_secure_refresh_rotates_token_and_preserves_verified_mfa(monkeypatch):
    user = fake_user(mfa_enabled=True)
    token = create_refresh_token(
        {
            "sub": str(user.id),
            "role": "AGENT",
            "mfa_required": True,
            "mfa_verified": True,
        }
    )
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


@pytest.mark.asyncio
async def test_secure_logout_sets_cutoff_for_all_access_tokens(monkeypatch):
    user = fake_user()
    db = fake_db_for_user(user)
    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "tenant_id": user.tenant_id,
            "institution_id": user.institution_id,
        }
    )
    request = MagicMock()
    request.headers = {"Authorization": f"Bearer {token}"}
    blacklist = MagicMock()
    blacklist.revoke_token = AsyncMock()
    blacklist.revoke_all_user_tokens = AsyncMock(return_value=1)
    monkeypatch.setattr(hardening.auth_api, "token_blacklist", blacklist)

    response = await hardening.secure_logout(request, user, db)

    assert "sessions" in response["message"]
    assert user.sessions_invalid_before is not None
    db.flush.assert_awaited()
    blacklist.revoke_all_user_tokens.assert_awaited_once_with(str(user.id))
    blacklist.revoke_token.assert_awaited_once()


@pytest.mark.asyncio
async def test_password_change_sets_cutoff_even_if_redis_cleanup_fails(monkeypatch):
    user = fake_user()
    db = fake_db_for_user(user)
    request = MagicMock()
    request.client = None
    request.headers = {}
    monkeypatch.setattr(hardening.auth_api, "verify_password", lambda plain, hashed: True)
    monkeypatch.setattr(hardening.auth_api, "get_password_hash", lambda password: "new-hash")
    blacklist = MagicMock()
    blacklist.revoke_all_user_tokens = AsyncMock(side_effect=RuntimeError("redis down"))
    monkeypatch.setattr(hardening.auth_api, "token_blacklist", blacklist)
    audit = SimpleNamespace(log_action=AsyncMock())
    monkeypatch.setattr(hardening, "AuditService", lambda db: audit)

    response = await hardening.secure_change_password(
        request,
        ChangePasswordRequest(
            current_password="OldPassword2026!",
            new_password="NewSecurePassword2026!",
        ),
        user,
        db,
    )

    assert "reconnecter" in response["message"]
    assert user.hashed_password == "new-hash"
    assert user.sessions_invalid_before is not None
    db.flush.assert_awaited()
