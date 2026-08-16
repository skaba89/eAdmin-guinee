"""Redis-backed JWT revocation, refresh-token tracking and login lockout."""

import logging
import time

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

BLACKLIST_PREFIX = "eadmin:token_blacklist:"
REFRESH_TOKEN_PREFIX = "eadmin:refresh_tokens:"
LOGIN_ATTEMPTS_PREFIX = "eadmin:login_attempts:"


class TokenBlacklistService:
    """Shared Redis state for JWT revocation and authentication throttling."""

    def __init__(self) -> None:
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
        return self._redis

    async def revoke_token(self, token_jti: str, expires_in_seconds: int) -> None:
        if expires_in_seconds <= 0:
            return
        redis = await self._get_redis()
        await redis.setex(f"{BLACKLIST_PREFIX}{token_jti}", expires_in_seconds, "revoked")
        logger.info("Token révoqué: %s... (TTL: %ss)", token_jti[:8], expires_in_seconds)

    async def is_token_revoked(self, token_jti: str) -> bool:
        redis = await self._get_redis()
        return await redis.exists(f"{BLACKLIST_PREFIX}{token_jti}") > 0

    async def store_refresh_token(
        self,
        user_id: str,
        refresh_jti: str,
        expires_in_seconds: int = 7 * 24 * 3600,
    ) -> None:
        redis = await self._get_redis()
        key = f"{REFRESH_TOKEN_PREFIX}{user_id}"
        await redis.sadd(key, refresh_jti)
        await redis.expire(key, expires_in_seconds)
        logger.info("Refresh token stocké pour utilisateur %s: %s...", user_id, refresh_jti[:8])

    async def is_refresh_token_valid(self, user_id: str, refresh_jti: str) -> bool:
        redis = await self._get_redis()
        return await redis.sismember(f"{REFRESH_TOKEN_PREFIX}{user_id}", refresh_jti) > 0

    async def consume_refresh_token(self, user_id: str, refresh_jti: str) -> bool:
        """Atomically consume one refresh token.

        Redis SREM is the single-use boundary: under concurrent refreshes only
        one caller can remove the JTI and continue rotating the session.
        """
        redis = await self._get_redis()
        removed = await redis.srem(f"{REFRESH_TOKEN_PREFIX}{user_id}", refresh_jti)
        return int(removed or 0) == 1

    async def revoke_all_user_tokens(self, user_id: str) -> int:
        redis = await self._get_redis()
        key = f"{REFRESH_TOKEN_PREFIX}{user_id}"
        count = await redis.scard(key)
        await redis.delete(key)
        logger.info("Tous les refresh tokens révoqués pour %s (%s tokens)", user_id, count)
        return int(count or 0)

    async def is_account_locked(
        self,
        email: str,
        max_attempts: int = 5,
        lockout_seconds: int = 900,
    ) -> bool:
        redis = await self._get_redis()
        key = f"{LOGIN_ATTEMPTS_PREFIX}{email}"
        now = time.time()
        attempts_raw = await redis.lrange(key, 0, -1)
        attempts = [float(value) for value in attempts_raw if now - float(value) < lockout_seconds]
        if len(attempts) != len(attempts_raw):
            await redis.delete(key)
            if attempts:
                await redis.rpush(key, *[str(value) for value in attempts])
                await redis.expire(key, lockout_seconds)
        return len(attempts) >= max_attempts

    async def record_failed_login(self, email: str, lockout_seconds: int = 900) -> None:
        redis = await self._get_redis()
        key = f"{LOGIN_ATTEMPTS_PREFIX}{email}"
        await redis.rpush(key, str(time.time()))
        await redis.expire(key, lockout_seconds)
        logger.info("Tentative de connexion échouée enregistrée pour %s", email)

    async def reset_login_attempts(self, email: str) -> None:
        redis = await self._get_redis()
        await redis.delete(f"{LOGIN_ATTEMPTS_PREFIX}{email}")

    async def get_remaining_attempts(
        self,
        email: str,
        max_attempts: int = 5,
        lockout_seconds: int = 900,
    ) -> int:
        redis = await self._get_redis()
        key = f"{LOGIN_ATTEMPTS_PREFIX}{email}"
        now = time.time()
        attempts_raw = await redis.lrange(key, 0, -1)
        valid_attempts = [
            float(value) for value in attempts_raw if now - float(value) < lockout_seconds
        ]
        return max(0, max_attempts - len(valid_attempts))

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.close()
            self._redis = None
            logger.info("Connexion Redis fermée")


token_blacklist = TokenBlacklistService()
