"""Regression tests for fail-closed PostgreSQL runtime role validation."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import database_principal as principal_module
from app.services.database_principal import (
    DatabasePrincipal,
    inspect_database_principal,
    require_rls_safe_database_principal,
)


@pytest.mark.asyncio
async def test_non_postgres_engine_is_ignored_without_connecting():
    engine = MagicMock()
    engine.dialect.name = "sqlite"

    assert await inspect_database_principal(engine) is None
    engine.connect.assert_not_called()


@pytest.mark.asyncio
async def test_runtime_superuser_is_rejected(monkeypatch):
    monkeypatch.setattr(
        principal_module,
        "inspect_database_principal",
        AsyncMock(
            return_value=DatabasePrincipal(
                name="postgres",
                is_superuser=True,
                bypasses_rls=False,
            )
        ),
    )

    with pytest.raises(RuntimeError, match="SUPERUSER"):
        await require_rls_safe_database_principal(MagicMock())


@pytest.mark.asyncio
async def test_runtime_bypassrls_role_is_rejected(monkeypatch):
    monkeypatch.setattr(
        principal_module,
        "inspect_database_principal",
        AsyncMock(
            return_value=DatabasePrincipal(
                name="unsafe_app",
                is_superuser=False,
                bypasses_rls=True,
            )
        ),
    )

    with pytest.raises(RuntimeError, match="BYPASSRLS"):
        await require_rls_safe_database_principal(MagicMock())


@pytest.mark.asyncio
async def test_least_privileged_runtime_role_is_accepted(monkeypatch):
    safe = DatabasePrincipal(
        name="eadmin_runtime",
        is_superuser=False,
        bypasses_rls=False,
    )
    monkeypatch.setattr(
        principal_module,
        "inspect_database_principal",
        AsyncMock(return_value=safe),
    )

    assert await require_rls_safe_database_principal(MagicMock()) == safe
