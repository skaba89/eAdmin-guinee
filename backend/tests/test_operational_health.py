"""Operational probe regression tests for orchestrated production deployments."""

from unittest.mock import AsyncMock

import pytest

from app.api import metrics as metrics_api


@pytest.mark.asyncio
async def test_liveness_is_process_only(client):
    response = await client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "alive"}


@pytest.mark.asyncio
async def test_readiness_is_200_only_when_all_dependencies_are_ready(client, monkeypatch):
    monkeypatch.setattr(metrics_api, "_check_postgres", AsyncMock(return_value=True))
    monkeypatch.setattr(metrics_api, "_check_redis", AsyncMock(return_value=True))
    monkeypatch.setattr(metrics_api, "_check_object_storage", AsyncMock(return_value=True))

    response = await client.get("/health/ready")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready"
    assert payload["checks"] == {
        "postgresql": True,
        "redis": True,
        "object_storage": True,
    }


@pytest.mark.asyncio
async def test_readiness_fails_closed_when_a_dependency_is_unavailable(client, monkeypatch):
    monkeypatch.setattr(metrics_api, "_check_postgres", AsyncMock(return_value=True))
    monkeypatch.setattr(metrics_api, "_check_redis", AsyncMock(return_value=False))
    monkeypatch.setattr(metrics_api, "_check_object_storage", AsyncMock(return_value=True))

    response = await client.get("/health/ready")

    assert response.status_code == 503
    payload = response.json()
    assert payload["status"] == "not_ready"
    assert payload["checks"]["redis"] is False
