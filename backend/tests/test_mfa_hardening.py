"""Regression tests for the P0 MFA hardening layer."""

import uuid

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.auth import create_access_token
from app.middleware.mfa_guard import MFAGuardMiddleware


@pytest.mark.asyncio
async def test_mfa_pending_token_is_blocked_from_business_api():
    test_app = FastAPI()
    test_app.add_middleware(MFAGuardMiddleware)

    @test_app.get("/api/v1/documents")
    async def documents():
        return {"ok": True}

    token = create_access_token({
        "sub": str(uuid.uuid4()),
        "role": "ADMIN",
        "type": "access",
        "mfa_required": True,
        "mfa_verified": False,
    })

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/documents",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403
    assert response.json()["code"] == "MFA_REQUIRED"


@pytest.mark.asyncio
async def test_mfa_pending_token_can_reach_canonical_verification_endpoint():
    test_app = FastAPI()
    test_app.add_middleware(MFAGuardMiddleware)

    @test_app.post("/api/v1/auth/verify-mfa")
    async def verify_mfa():
        return {"ok": True}

    token = create_access_token({
        "sub": str(uuid.uuid4()),
        "role": "ADMIN",
        "type": "access",
        "mfa_required": True,
        "mfa_verified": False,
    })

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/verify-mfa",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.asyncio
async def test_fully_verified_token_is_not_blocked():
    test_app = FastAPI()
    test_app.add_middleware(MFAGuardMiddleware)

    @test_app.get("/api/v1/documents")
    async def documents():
        return {"ok": True}

    token = create_access_token({
        "sub": str(uuid.uuid4()),
        "role": "ADMIN",
        "type": "access",
        "mfa_required": True,
        "mfa_verified": True,
    })

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/documents",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
