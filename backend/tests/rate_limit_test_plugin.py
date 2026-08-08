"""Pytest isolation for Redis-backed rate-limit integration tests.

The application middleware is intentionally process-global, while the CI Redis
service survives for the whole test process. Without per-test cleanup, requests
from one test consume the next test's security budget and produce unrelated 429
responses. We remove only eAdmin rate-limit keys; authentication/session keys are
left untouched.
"""

import pytest_asyncio

from app.config import settings


async def _clear_rate_limit_keys() -> None:
    if settings.ENVIRONMENT != "test":
        return

    try:
        import redis.asyncio as aioredis

        client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=1,
        )
        keys = [key async for key in client.scan_iter(match="eadmin:ratelimit:*")]
        if keys:
            await client.delete(*keys)
        await client.aclose()
    except Exception:
        # If Redis is intentionally absent, RateLimitMiddleware already runs in
        # degraded mode and no shared Redis counters can leak between tests.
        return


@pytest_asyncio.fixture(autouse=True)
async def isolate_rate_limit_state():
    """Reset only rate-limit counters before and after every test."""
    await _clear_rate_limit_keys()
    yield
    await _clear_rate_limit_keys()
