"""Tests for reconnect-safe citizen mutation idempotency."""

from __future__ import annotations

import json

import pytest
from fastapi import FastAPI, Request
from httpx import ASGITransport, AsyncClient

from app.api.auth import create_access_token
from app.middleware.idempotency import IdempotencyMiddleware


class FakeRedis:
    def __init__(self):
        self.values: dict[str, str] = {}

    async def set(self, key: str, value: str, ex=None, nx=False):
        assert ex and ex > 0
        if nx and key in self.values:
            return False
        self.values[key] = value
        return True

    async def get(self, key: str):
        return self.values.get(key)

    async def delete(self, key: str):
        self.values.pop(key, None)
        return 1


@pytest.fixture
def idempotent_app(monkeypatch):
    redis = FakeRedis()
    calls = {"count": 0}

    async def fake_redis(self):
        return redis

    monkeypatch.setattr(IdempotencyMiddleware, "_redis", fake_redis)

    app = FastAPI()
    app.add_middleware(IdempotencyMiddleware)

    @app.post("/api/v1/service-requests")
    async def create_request(request: Request):
        calls["count"] += 1
        payload = await request.json()
        return {"id": f"request-{calls['count']}", "subject": payload["subject"]}

    return app, calls, redis


def _access_token(user_id: str = "11111111-1111-4111-8111-111111111111") -> str:
    return create_access_token(
        {
            "sub": user_id,
            "role": "CITOYEN",
            "frontend_role": "citoyen",
            "tenant_id": "republique-de-guinee",
            "institution_id": "",
        }
    )


@pytest.mark.asyncio
async def test_same_key_and_payload_replays_success_without_second_mutation(idempotent_app):
    app, calls, _redis = idempotent_app
    transport = ASGITransport(app=app)
    headers = {
        "Authorization": f"Bearer {_access_token()}",
        "Idempotency-Key": "req_1234567890abcdef",
        "Content-Type": "application/json",
    }
    body = {"subject": "Demande de certificat"}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        first = await client.post("/api/v1/service-requests", headers=headers, json=body)
        second = await client.post("/api/v1/service-requests", headers=headers, json=body)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert calls["count"] == 1
    assert second.headers["Idempotency-Replayed"] == "true"


@pytest.mark.asyncio
async def test_same_key_with_different_payload_is_rejected(idempotent_app):
    app, calls, _redis = idempotent_app
    transport = ASGITransport(app=app)
    headers = {
        "Authorization": f"Bearer {_access_token()}",
        "Idempotency-Key": "req_abcdef1234567890",
        "Content-Type": "application/json",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        first = await client.post(
            "/api/v1/service-requests",
            headers=headers,
            json={"subject": "Première demande"},
        )
        conflict = await client.post(
            "/api/v1/service-requests",
            headers=headers,
            json={"subject": "Contenu différent"},
        )

    assert first.status_code == 200
    assert conflict.status_code == 409
    assert conflict.json()["code"] == "IDEMPOTENCY_KEY_REUSED"
    assert calls["count"] == 1


@pytest.mark.asyncio
async def test_key_is_scoped_per_authenticated_user(idempotent_app):
    app, calls, _redis = idempotent_app
    transport = ASGITransport(app=app)
    key = "req_shared_1234567890"
    body = {"subject": "Même démarche"}

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        first = await client.post(
            "/api/v1/service-requests",
            headers={
                "Authorization": f"Bearer {_access_token()}",
                "Idempotency-Key": key,
            },
            json=body,
        )
        second = await client.post(
            "/api/v1/service-requests",
            headers={
                "Authorization": f"Bearer {_access_token('22222222-2222-4222-8222-222222222222')}",
                "Idempotency-Key": key,
            },
            json=body,
        )

    assert first.status_code == 200
    assert second.status_code == 200
    assert calls["count"] == 2


@pytest.mark.asyncio
async def test_processing_state_returns_retry_after_without_duplicate_call(idempotent_app):
    app, calls, redis = idempotent_app
    transport = ASGITransport(app=app)
    token = _access_token()
    key = "req_processing_123456"
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": key,
        "Content-Type": "application/json",
    }
    body = json.dumps({"subject": "Traitement lent"}, separators=(",", ":")).encode()

    # Reserve by executing once, then rewrite the completed state as processing
    # with the exact request fingerprint kept by the middleware.
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        completed = await client.post(
            "/api/v1/service-requests",
            headers=headers,
            content=body,
        )
        assert completed.status_code == 200
        redis_key = next(iter(redis.values))
        state = json.loads(redis.values[redis_key])
        redis.values[redis_key] = json.dumps(
            {"state": "processing", "fingerprint": state["fingerprint"]},
            separators=(",", ":"),
        )
        retry = await client.post(
            "/api/v1/service-requests",
            headers=headers,
            content=body,
        )

    assert retry.status_code == 409
    assert retry.json()["code"] == "IDEMPOTENCY_IN_PROGRESS"
    assert retry.headers["Retry-After"] == "2"
    assert calls["count"] == 1


@pytest.mark.asyncio
async def test_invalid_key_is_rejected_before_mutation(idempotent_app):
    app, calls, _redis = idempotent_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/service-requests",
            headers={
                "Authorization": f"Bearer {_access_token()}",
                "Idempotency-Key": "short",
            },
            json={"subject": "Demande"},
        )

    assert response.status_code == 400
    assert calls["count"] == 0
