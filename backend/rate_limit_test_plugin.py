"""Pytest isolation for process-global Redis, DB health and audit resources.

Keep application imports lazy: this plugin is loaded by pytest itself before
pytest-cov starts tracing. Importing ``app`` modules at module import time would
make real application coverage look artificially low.
"""

from unittest.mock import AsyncMock

import pytest_asyncio


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


class _TestHealthConnection:
    async def execute(self, statement):
        return None


class _TestHealthConnectionContext:
    async def __aenter__(self):
        return _TestHealthConnection()

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _TestHealthEngine:
    """No-network engine seam used only by HTTP health endpoint tests."""

    def connect(self):
        return _TestHealthConnectionContext()


async def _clear_rate_limit_keys() -> None:
    # Lazy import is intentional; see module docstring.
    from app.config import settings

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
    """Keep HTTP tests isolated from process-global asyncpg/Redis resources."""
    # Lazy imports ensure pytest-cov has already started tracing application code.
    import app.database as database_module
    import app.middleware.audit as audit_middleware

    monkeypatch.setattr(
        audit_middleware,
        "audit_session_factory",
        lambda: _TestAuditSessionContext(),
    )
    monkeypatch.setattr(audit_middleware, "AuditService", _TestAuditService)

    # /health imports app.database.engine at request time. Point that probe at an
    # in-memory seam so each pytest event loop never touches the global asyncpg pool.
    # Alembic clean-migration CI separately verifies the real PostgreSQL connection.
    monkeypatch.setattr(database_module, "engine", _TestHealthEngine())

    await _clear_rate_limit_keys()
    yield
    await _clear_rate_limit_keys()
