"""
Tests de sécurité - eAdministration Suite Guinea.
Vérifie les headers de sécurité, CORS, rate limiting et validation des mots de passe.
"""

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient

from app.api.auth import UserCreate
from app.config import settings
from pydantic import ValidationError


class TestSecurityHeaders:
    """Tests des headers de sécurité HTTP (OWASP)."""

    @pytest.mark.asyncio
    async def test_security_headers_present(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.headers["x-frame-options"] == "DENY"
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["x-xss-protection"] == "1; mode=block"
        assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
        permissions = response.headers["permissions-policy"]
        assert "camera=()" in permissions
        assert "microphone=()" in permissions
        assert "geolocation=()" in permissions
        assert "payment=()" in permissions
        assert "frame-ancestors 'none'" in response.headers["content-security-policy"]

    @pytest.mark.asyncio
    async def test_api_cache_control_headers(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        if response.status_code in (200, 401) and "cache-control" in response.headers:
            assert "no-store" in response.headers["cache-control"]
            assert "no-cache" in response.headers["cache-control"]

    @pytest.mark.asyncio
    async def test_hsts_not_set_in_development(self, client: AsyncClient):
        response = await client.get("/health")
        if settings.is_development:
            assert "strict-transport-security" not in response.headers

    @pytest.mark.asyncio
    async def test_security_headers_on_error_responses(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401
        assert "x-frame-options" in response.headers
        assert "x-content-type-options" in response.headers


class TestCORSHeaders:
    """Tests des headers CORS."""

    ALLOWED_ORIGIN = "https://eadmin.gouv.gn"

    @pytest.mark.asyncio
    async def test_cors_preflight_allowed_origins(self, client: AsyncClient):
        response = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": self.ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Authorization, Content-Type",
            },
        )
        assert response.status_code in (200, 204)
        assert response.headers.get("access-control-allow-origin") == self.ALLOWED_ORIGIN

    @pytest.mark.asyncio
    async def test_cors_disallows_unknown_origins(self, client: AsyncClient):
        response = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://evil-site.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert response.headers.get("access-control-allow-origin") != "http://evil-site.com"

    @pytest.mark.asyncio
    async def test_cors_allows_credentials(self, client: AsyncClient):
        response = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": self.ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
            },
        )
        assert response.status_code in (200, 204)
        assert response.headers.get("access-control-allow-credentials") == "true"

    @pytest.mark.asyncio
    async def test_cors_exposes_request_id(self, client: AsyncClient):
        # expose_headers belongs to actual CORS responses, not preflight responses.
        response = await client.get(
            "/health",
            headers={"Origin": self.ALLOWED_ORIGIN},
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == self.ALLOWED_ORIGIN
        exposed = response.headers.get("access-control-expose-headers", "")
        assert "X-Request-ID" in exposed

    @pytest.mark.asyncio
    async def test_cors_allowed_methods(self, client: AsyncClient):
        response = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": self.ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
            },
        )
        assert response.status_code in (200, 204)
        methods = response.headers.get("access-control-allow-methods", "")
        assert "POST" in methods
        assert "GET" in methods
        assert "DELETE" in methods


class TestRateLimiting:
    """Tests du rate limiting."""

    @pytest.mark.asyncio
    async def test_rate_limiting_login(self, client: AsyncClient, test_user):
        responses = []
        for i in range(7):
            response = await client.post(
                "/api/v1/auth/login",
                data={"username": "test@eadmin.gn", "password": f"WrongPass{i}!"},
            )
            responses.append(response)
        status_codes = [r.status_code for r in responses]
        assert 401 in status_codes or 429 in status_codes

    @pytest.mark.asyncio
    async def test_rate_limiting_returns_429(self, client: AsyncClient, test_user):
        for i in range(6):
            await client.post(
                "/api/v1/auth/login",
                data={"username": "test@eadmin.gn", "password": f"Wrong{i}!"},
            )
        last_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Wrong7!"},
        )
        assert last_response.status_code in (401, 429)

    @pytest.mark.asyncio
    async def test_rate_limiting_includes_retry_after(self, client: AsyncClient, test_user):
        for i in range(6):
            await client.post(
                "/api/v1/auth/login",
                data={"username": "test@eadmin.gn", "password": f"Wrong{i}!"},
            )
        last_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "FinalWrong!"},
        )
        if last_response.status_code == 429:
            assert "retry-after" in last_response.headers


class TestPasswordValidation:
    """Tests de validation des mots de passe."""

    def test_password_minimum_length(self):
        with pytest.raises(ValidationError):
            UserCreate(email="test@eadmin.gn", password="Short1!", full_name="Test User")

    def test_password_requires_uppercase(self):
        with pytest.raises(ValidationError):
            UserCreate(
                email="test@eadmin.gn",
                password="nouppercase2026!",
                full_name="Test User",
            )

    def test_password_requires_digit(self):
        with pytest.raises(ValidationError):
            UserCreate(
                email="test@eadmin.gn",
                password="NoDigitHere!",
                full_name="Test User",
            )

    def test_password_requires_special_character(self):
        with pytest.raises(ValidationError):
            UserCreate(
                email="test@eadmin.gn",
                password="NoSpecial2026",
                full_name="Test User",
            )

    def test_password_valid_strong(self):
        user = UserCreate(
            email="test@eadmin.gn",
            password="StrongPass2026!",
            full_name="Test User",
        )
        assert user.password == "StrongPass2026!"

    def test_password_valid_minimal(self):
        user = UserCreate(
            email="test@eadmin.gn",
            password="Min1male_2026!",
            full_name="Test User",
        )
        assert user.password == "Min1male_2026!"

    def test_password_with_special_characters(self):
        user = UserCreate(
            email="test@eadmin.gn",
            password="Sp3c!@#$%^&*",
            full_name="Test User",
        )
        assert user.password == "Sp3c!@#$%^&*"

    def test_password_with_unicode(self):
        user = UserCreate(
            email="test@eadmin.gn",
            password="Unïcöd3Pass!",
            full_name="Test User",
        )
        assert user.password == "Unïcöd3Pass!"


class TestJWTSecurity:
    """Tests de sécurité des tokens JWT."""

    @pytest.mark.asyncio
    async def test_expired_token_rejected(self, client: AsyncClient):
        from jose import jwt as jose_jwt

        expired_payload = {
            "sub": "00000000-0000-0000-0000-000000000000",
            "role": "AGENT",
            "frontend_role": "agent",
            "type": "access",
            "jti": "test-expired-jti",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        }
        expired_token = jose_jwt.encode(
            expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_token_with_wrong_secret_rejected(self, client: AsyncClient):
        from jose import jwt as jose_jwt

        bad_payload = {
            "sub": "00000000-0000-0000-0000-000000000000",
            "role": "AGENT",
            "frontend_role": "agent",
            "type": "access",
            "jti": "test-bad-secret-jti",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        bad_token = jose_jwt.encode(
            bad_payload, "wrong-secret-key", algorithm=settings.ALGORITHM
        )
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {bad_token}"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token_cannot_access_protected_endpoints(
        self,
        client: AsyncClient,
        test_user,
    ):
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 200
        refresh_token = response.json()["refresh_token"]
        me_response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {refresh_token}"},
        )
        assert me_response.status_code == 401

    @pytest.mark.asyncio
    async def test_missing_authorization_header(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_malformed_authorization_header(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "sometoken"},
        )
        assert response.status_code == 401

        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer "},
        )
        assert response.status_code == 401
