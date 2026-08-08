"""Focused tests for Redis-backed token revocation and account lockout."""

from unittest.mock import AsyncMock, MagicMock

import pytest
import app.services.token_blacklist as module

from app.services.token_blacklist import (
    BLACKLIST_PREFIX,
    LOGIN_ATTEMPTS_PREFIX,
    REFRESH_TOKEN_PREFIX,
    TokenBlacklistService,
)


def fake_redis() -> MagicMock:
    redis = MagicMock()
    redis.setex = AsyncMock()
    redis.exists = AsyncMock(return_value=0)
    redis.sadd = AsyncMock()
    redis.expire = AsyncMock()
    redis.sismember = AsyncMock(return_value=0)
    redis.scard = AsyncMock(return_value=0)
    redis.delete = AsyncMock()
    redis.lrange = AsyncMock(return_value=[])
    redis.rpush = AsyncMock()
    redis.srem = AsyncMock(return_value=0)
    redis.close = AsyncMock()
    return redis


@pytest.fixture
def service() -> TokenBlacklistService:
    return TokenBlacklistService()


@pytest.mark.asyncio
async def test_lazy_redis_initialization(monkeypatch, service):
    redis = fake_redis()
    factory = MagicMock(return_value=redis)
    monkeypatch.setattr(module.aioredis, "from_url", factory)

    assert await service._get_redis() is redis
    assert await service._get_redis() is redis
    factory.assert_called_once()


@pytest.mark.asyncio
async def test_revoke_token_ignores_expired_token(service):
    redis = fake_redis()
    service._redis = redis

    await service.revoke_token("expired-jti", 0)

    redis.setex.assert_not_awaited()


@pytest.mark.asyncio
async def test_revoke_and_check_token(service):
    redis = fake_redis()
    redis.exists.return_value = 1
    service._redis = redis

    await service.revoke_token("jti-123456789", 120)
    assert await service.is_token_revoked("jti-123456789") is True

    redis.setex.assert_awaited_once_with(
        f"{BLACKLIST_PREFIX}jti-123456789",
        120,
        "revoked",
    )
    redis.exists.assert_awaited_once_with(f"{BLACKLIST_PREFIX}jti-123456789")


@pytest.mark.asyncio
async def test_store_and_validate_refresh_token(service):
    redis = fake_redis()
    redis.sismember.return_value = 1
    service._redis = redis

    await service.store_refresh_token("user-1", "refresh-1", 600)
    valid = await service.is_refresh_token_valid("user-1", "refresh-1")

    assert valid is True
    redis.sadd.assert_awaited_once_with(f"{REFRESH_TOKEN_PREFIX}user-1", "refresh-1")
    redis.expire.assert_awaited_once_with(f"{REFRESH_TOKEN_PREFIX}user-1", 600)
    redis.sismember.assert_awaited_once_with(
        f"{REFRESH_TOKEN_PREFIX}user-1",
        "refresh-1",
    )


@pytest.mark.asyncio
async def test_revoke_all_user_tokens_returns_count(service):
    redis = fake_redis()
    redis.scard.return_value = 3
    service._redis = redis

    count = await service.revoke_all_user_tokens("user-2")

    assert count == 3
    redis.delete.assert_awaited_once_with(f"{REFRESH_TOKEN_PREFIX}user-2")


@pytest.mark.asyncio
async def test_account_lockout_keeps_only_recent_attempts(monkeypatch, service):
    redis = fake_redis()
    redis.lrange.return_value = ["900.0", "995.0", "999.0"]
    service._redis = redis
    monkeypatch.setattr(module.time, "time", lambda: 1000.0)

    locked = await service.is_account_locked(
        "citizen@example.gn",
        max_attempts=2,
        lockout_seconds=10,
    )

    assert locked is True
    key = f"{LOGIN_ATTEMPTS_PREFIX}citizen@example.gn"
    redis.delete.assert_awaited_once_with(key)
    redis.rpush.assert_awaited_once_with(key, "995.0", "999.0")
    redis.expire.assert_awaited_once_with(key, 10)


@pytest.mark.asyncio
async def test_account_not_locked_without_enough_recent_attempts(monkeypatch, service):
    redis = fake_redis()
    redis.lrange.return_value = ["997.0"]
    service._redis = redis
    monkeypatch.setattr(module.time, "time", lambda: 1000.0)

    assert await service.is_account_locked(
        "agent@example.gn",
        max_attempts=5,
        lockout_seconds=10,
    ) is False


@pytest.mark.asyncio
async def test_record_reset_and_remaining_attempts(monkeypatch, service):
    redis = fake_redis()
    service._redis = redis
    monkeypatch.setattr(module.time, "time", lambda: 1000.0)

    await service.record_failed_login("agent@example.gn", 300)
    key = f"{LOGIN_ATTEMPTS_PREFIX}agent@example.gn"
    redis.rpush.assert_awaited_once_with(key, "1000.0")
    redis.expire.assert_awaited_once_with(key, 300)

    redis.lrange.return_value = ["990.0", "995.0"]
    remaining = await service.get_remaining_attempts(
        "agent@example.gn",
        max_attempts=5,
        lockout_seconds=30,
    )
    assert remaining == 3

    await service.reset_login_attempts("agent@example.gn")
    redis.delete.assert_awaited_with(key)


@pytest.mark.asyncio
async def test_remaining_attempts_never_negative(monkeypatch, service):
    redis = fake_redis()
    redis.lrange.return_value = ["999.0"] * 7
    service._redis = redis
    monkeypatch.setattr(module.time, "time", lambda: 1000.0)

    assert await service.get_remaining_attempts(
        "locked@example.gn",
        max_attempts=5,
        lockout_seconds=30,
    ) == 0


@pytest.mark.asyncio
async def test_close_resets_connection(service):
    redis = fake_redis()
    service._redis = redis

    await service.close()

    redis.close.assert_awaited_once()
    assert service._redis is None
