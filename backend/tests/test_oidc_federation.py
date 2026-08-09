"""Adversarial tests for OIDC federation and identity lifecycle."""

from __future__ import annotations

import base64
from datetime import datetime, timezone
import json
from urllib.parse import parse_qs, urlparse

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from jose import jwt

from app.api.auth import create_access_token
from app.api.identity_federation import _trusted_frontend_origin
from app.config import Settings, settings
from app.models.federated_identity import FederatedIdentity
from app.models.user import RoleEnum, User
from app.services.federated_identity_service import (
    FederatedIdentityError,
    FederatedIdentityService,
)
from app.services.oidc_service import OIDCClaims, OIDCError, OIDCService


class FakeRedis:
    def __init__(self):
        self.values: dict[str, str] = {}

    async def setex(self, key: str, ttl: int, value: str):
        assert ttl > 0
        self.values[key] = value

    async def execute_command(self, command: str, key: str):
        assert command == "GETDEL"
        return self.values.pop(key, None)


class FakeHTTPResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class FakeHTTPClient:
    jwks: dict = {}

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def get(self, url: str, headers=None):
        return FakeHTTPResponse(200, self.jwks)


def _b64int(value: int) -> str:
    length = (value.bit_length() + 7) // 8
    return base64.urlsafe_b64encode(value.to_bytes(length, "big")).rstrip(b"=").decode("ascii")


def _configure_oidc(monkeypatch):
    values = {
        "OIDC_ENABLED": True,
        "OIDC_PROVIDER": "test-government-idp",
        "OIDC_ISSUER": "https://idp.gov.gn",
        "OIDC_AUTHORIZATION_ENDPOINT": "https://idp.gov.gn/authorize",
        "OIDC_TOKEN_ENDPOINT": "https://idp.gov.gn/token",
        "OIDC_JWKS_URI": "https://idp.gov.gn/jwks",
        "OIDC_CLIENT_ID": "eadmin-test",
        "OIDC_CLIENT_SECRET": "test-client-secret-long-enough",
        "OIDC_REDIRECT_URI": "https://api.eadmin.gouv.gn/api/v1/auth/sso/oidc/callback",
        "OIDC_SCOPES": "openid profile email",
        "OIDC_ALLOWED_ALGORITHMS": "RS256",
        "OIDC_REQUIRE_VERIFIED_EMAIL": True,
        "OIDC_REQUIRED_ACR": "",
        "OIDC_STATE_TTL_SECONDS": 600,
    }
    for name, value in values.items():
        monkeypatch.setattr(settings, name, value)


def _claims(subject: str, email: str = "agent@gov.gn") -> OIDCClaims:
    return OIDCClaims(
        issuer="https://idp.gov.gn",
        subject=subject,
        email=email,
        email_verified=True,
        acr=None,
        amr=("pwd",),
        fingerprint="a" * 64,
    )


def test_oidc_configuration_is_disabled_and_auto_provisioning_is_forbidden():
    default = Settings(ENVIRONMENT="development")
    assert default.OIDC_ENABLED is False
    assert default.OIDC_AUTO_PROVISION is False

    with pytest.raises(ValueError, match="OIDC_AUTO_PROVISION"):
        Settings(ENVIRONMENT="development", OIDC_AUTO_PROVISION=True)

    with pytest.raises(ValueError, match="required settings are missing"):
        Settings(ENVIRONMENT="development", OIDC_ENABLED=True)


def test_frontend_origin_must_be_exactly_trusted():
    assert _trusted_frontend_origin("http://localhost:3000") == "http://localhost:3000"

    for untrusted in (
        "https://evil.example",
        "http://localhost:3000.evil.example",
        "http://localhost:3000/path",
        "http://user:password@localhost:3000",
        "//evil.example",
    ):
        with pytest.raises(HTTPException):
            _trusted_frontend_origin(untrusted)


@pytest.mark.asyncio
async def test_authorization_request_uses_server_state_nonce_pkce_and_state_is_one_time(monkeypatch):
    _configure_oidc(monkeypatch)
    redis = FakeRedis()
    service = OIDCService()

    async def fake_redis():
        return redis

    monkeypatch.setattr(service, "_redis", fake_redis)
    url = await service.start_authorization(
        "//evil.example/phish",
        frontend_origin="http://localhost:3000",
    )
    parsed = urlparse(url)
    params = parse_qs(parsed.query)

    assert parsed.scheme == "https"
    assert params["response_type"] == ["code"]
    assert params["code_challenge_method"] == ["S256"]
    assert len(params["state"][0]) >= 32
    assert len(params["nonce"][0]) >= 32
    assert "client_secret" not in params

    state = params["state"][0]
    stored = await service.consume_authorization_state(state)
    assert stored["return_to"] == "/"
    assert stored["frontend_origin"] == "http://localhost:3000"
    assert stored["nonce"] == params["nonce"][0]
    assert len(stored["code_verifier"]) >= 43

    with pytest.raises(OIDCError, match="déjà utilisé"):
        await service.consume_authorization_state(state)


@pytest.mark.asyncio
async def test_signed_id_token_is_verified_and_external_role_claim_is_not_authority(monkeypatch):
    _configure_oidc(monkeypatch)
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_numbers = private_key.public_key().public_numbers()
    jwk = {
        "kty": "RSA",
        "kid": "gov-key-1",
        "alg": "RS256",
        "use": "sig",
        "n": _b64int(public_numbers.n),
        "e": _b64int(public_numbers.e),
    }
    FakeHTTPClient.jwks = {"keys": [jwk]}

    import app.services.oidc_service as oidc_module

    monkeypatch.setattr(oidc_module.httpx, "AsyncClient", FakeHTTPClient)
    now = int(datetime.now(timezone.utc).timestamp())
    pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    token = jwt.encode(
        {
            "iss": settings.OIDC_ISSUER,
            "sub": "subject-123",
            "aud": settings.OIDC_CLIENT_ID,
            "iat": now,
            "exp": now + 300,
            "nonce": "expected-nonce",
            "email": "agent@gov.gn",
            "email_verified": True,
            "role": "SUPER_ADMIN",
            "tenant_id": "attacker-tenant",
            "groups": ["superadmins"],
        },
        pem,
        algorithm="RS256",
        headers={"kid": "gov-key-1"},
    )

    claims = await OIDCService().validate_id_token(token, "expected-nonce")
    assert claims.subject == "subject-123"
    assert claims.email == "agent@gov.gn"
    assert not hasattr(claims, "role")
    assert not hasattr(claims, "tenant_id")

    with pytest.raises(OIDCError, match="Nonce"):
        await OIDCService().validate_id_token(token, "wrong-nonce")


@pytest.mark.asyncio
async def test_symmetric_id_token_algorithm_is_rejected_before_jwks(monkeypatch):
    _configure_oidc(monkeypatch)
    now = int(datetime.now(timezone.utc).timestamp())
    token = jwt.encode(
        {
            "iss": settings.OIDC_ISSUER,
            "sub": "subject-123",
            "aud": settings.OIDC_CLIENT_ID,
            "iat": now,
            "exp": now + 300,
            "nonce": "nonce",
            "email": "agent@gov.gn",
            "email_verified": True,
        },
        "symmetric-secret",
        algorithm="HS256",
        headers={"kid": "symmetric"},
    )
    with pytest.raises(OIDCError) as exc_info:
        await OIDCService().validate_id_token(token, "nonce")
    assert exc_info.value.code == "invalid_algorithm"


@pytest.mark.asyncio
async def test_identity_resolution_never_falls_back_to_matching_email(db_session, monkeypatch):
    _configure_oidc(monkeypatch)
    user = User(
        email="agent@gov.gn",
        hashed_password="unused",
        full_name="Agent",
        role=RoleEnum.AGENT,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-a",
        is_active=True,
    )
    admin = User(
        email="admin@gov.gn",
        hashed_password="unused",
        full_name="Admin",
        role=RoleEnum.SUPER_ADMIN,
        is_active=True,
    )
    db_session.add_all([user, admin])
    await db_session.flush()
    service = FederatedIdentityService()

    with pytest.raises(FederatedIdentityError) as exc_info:
        await service.resolve_verified_identity(db=db_session, claims=_claims("subject-123"))
    assert exc_info.value.code == "identity_not_linked"

    identity = await service.link_identity(
        db=db_session,
        user_id=user.id,
        subject="subject-123",
        linked_by=admin.id,
        email_snapshot=user.email,
    )
    resolved_identity, resolved_user = await service.resolve_verified_identity(
        db=db_session,
        claims=_claims("subject-123"),
    )
    assert resolved_identity.id == identity.id
    assert resolved_user.id == user.id
    assert resolved_user.role == RoleEnum.AGENT


@pytest.mark.asyncio
async def test_disabled_binding_and_disabled_local_account_block_token_exchange(db_session, monkeypatch):
    _configure_oidc(monkeypatch)
    user = User(
        email="lifecycle@gov.gn",
        hashed_password="unused",
        full_name="Lifecycle",
        role=RoleEnum.AGENT,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-a",
        is_active=True,
    )
    admin = User(
        email="root.lifecycle@gov.gn",
        hashed_password="unused",
        full_name="Root",
        role=RoleEnum.SUPER_ADMIN,
        is_active=True,
    )
    db_session.add_all([user, admin])
    await db_session.flush()
    service = FederatedIdentityService()
    identity = await service.link_identity(
        db=db_session,
        user_id=user.id,
        subject="lifecycle-subject",
        linked_by=admin.id,
    )

    await service.set_status(
        db=db_session,
        identity_id=identity.id,
        status="disabled",
        actor_id=admin.id,
    )
    with pytest.raises(FederatedIdentityError) as exc_info:
        await service.validate_exchange_binding(
            db=db_session,
            identity_id=identity.id,
            user_id=user.id,
        )
    assert exc_info.value.code == "identity_disabled"

    await service.set_status(
        db=db_session,
        identity_id=identity.id,
        status="active",
        actor_id=admin.id,
    )
    user.is_active = False
    await db_session.flush()
    with pytest.raises(FederatedIdentityError) as exc_info:
        await service.validate_exchange_binding(
            db=db_session,
            identity_id=identity.id,
            user_id=user.id,
        )
    assert exc_info.value.code == "local_account_inactive"


@pytest.mark.asyncio
async def test_session_guard_rejects_cutoff_and_stale_role(client, db_session, super_admin_user):
    super_admin_user.tenant_id = settings.TENANT_DEFAULT_ID
    super_admin_user.institution_id = "inst-a"
    await db_session.commit()

    token = create_access_token(
        {
            "sub": str(super_admin_user.id),
            "role": super_admin_user.role.value,
            "frontend_role": super_admin_user.role.to_frontend_role(),
            "tenant_id": settings.TENANT_DEFAULT_ID,
            "institution_id": "inst-a",
        }
    )
    headers = {"Authorization": f"Bearer {token}"}
    before = await client.get("/api/v1/auth/me", headers=headers)
    assert before.status_code == 200, before.text

    super_admin_user.sessions_invalid_before = datetime.now(timezone.utc)
    await db_session.commit()
    revoked = await client.get("/api/v1/auth/me", headers=headers)
    assert revoked.status_code == 401
    assert revoked.json()["code"] == "SESSION_REVOKED"

    super_admin_user.sessions_invalid_before = None
    super_admin_user.role = RoleEnum.MINISTRE
    await db_session.commit()
    stale_scope = await client.get("/api/v1/auth/me", headers=headers)
    assert stale_scope.status_code == 401
    assert stale_scope.json()["code"] == "TOKEN_SCOPE_STALE"


def test_exchange_payload_contains_no_external_authorization_claims():
    payload = json.loads(
        json.dumps(
            {
                "user_id": "local-user-id",
                "identity_id": "binding-id",
                "return_to": "/dashboard",
                "mfa_required": False,
            }
        )
    )
    assert "role" not in payload
    assert "tenant_id" not in payload
    assert "institution_id" not in payload
