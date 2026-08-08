"""Pytest isolation for process-global Redis and audit middleware resources."""

from unittest.mock import AsyncMock

import pytest_asyncio

import app.middleware.audit as audit_middleware
from app.config import settings


class _TestAuditSession:
    async def commit(self) -> None:
        return None


class _TestAuditSessionContext:
    def __init__(self) -> None:
        self.session = _TestAuditSession()

    async def __aenter__(self):
        return self.session

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _TestAuditService:
    """Minimal in-memory seam; AuditService itself has dedicated DB tests."""

    def __init__(self, session) -> None:
        self.session = session
        self.log_action = AsyncMock(return_value=None)


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
async def isolate_process_global_test_resources(monkeypatch):
    """Keep HTTP tests isolated from global Redis and asyncpg resources."""
    monkeypatch.setattr(
        audit_middleware,
        "audit_session_factory",
        lambda: _TestAuditSessionContext(),
    )
    monkeypatch.setattr(audit_middleware, "AuditService", _TestAuditService)

    await _clear_rate_limit_keys()
    yield
    await _clear_rate_limit_keys()
