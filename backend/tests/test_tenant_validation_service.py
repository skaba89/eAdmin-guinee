"""Unit tests for database-backed tenant validation."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

import app.database as database_module
from app.config import settings
from app.middleware.tenant import TenantResolutionMiddleware


class AsyncSessionContext:
    def __init__(self, session):
        self.session = session

    async def __aenter__(self):
        return self.session

    async def __aexit__(self, exc_type, exc, tb):
        return False


def middleware() -> TenantResolutionMiddleware:
    return TenantResolutionMiddleware(app=MagicMock())


def patch_factory(monkeypatch, *, tenant=None, error=None):
    session = MagicMock()
    if error is not None:
        session.execute = AsyncMock(side_effect=error)
    else:
        result = MagicMock()
        result.scalar_one_or_none.return_value = tenant
        session.execute = AsyncMock(return_value=result)

    factory = MagicMock(return_value=AsyncSessionContext(session))
    monkeypatch.setattr(database_module, "async_session_factory", factory)
    return session


@pytest.mark.asyncio
async def test_validate_tenant_returns_true_for_active_database_tenant(monkeypatch):
    session = patch_factory(
        monkeypatch,
        tenant=SimpleNamespace(id="tenant-a", is_active=True),
    )

    assert await middleware()._validate_tenant("tenant-a") is True
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_validate_tenant_returns_false_when_not_found(monkeypatch):
    patch_factory(monkeypatch, tenant=None)

    assert await middleware()._validate_tenant("tenant-missing") is False


@pytest.mark.asyncio
async def test_validate_default_tenant_fails_open_only_on_database_error(monkeypatch):
    patch_factory(monkeypatch, error=RuntimeError("database unavailable"))

    assert await middleware()._validate_tenant(settings.TENANT_DEFAULT_ID) is True


@pytest.mark.asyncio
async def test_validate_non_default_tenant_propagates_database_error(monkeypatch):
    patch_factory(monkeypatch, error=RuntimeError("database unavailable"))

    with pytest.raises(RuntimeError, match="database unavailable"):
        await middleware()._validate_tenant("other-tenant")
