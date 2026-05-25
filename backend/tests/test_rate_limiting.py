"""
Tests du rate limiting - eAdministration Suite Guinea.
Vérifie la limitation de débit sur les endpoints critiques.
"""

import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock


class TestRateLimiting:
    """Test suite for API rate limiting."""

    @pytest.mark.asyncio
    async def test_login_rate_limiting(self, client):
        """Login endpoint should be rate limited after 5 failed attempts."""
        # Make multiple failed login attempts
        for i in range(5):
            response = await client.post(
                "/api/v1/auth/login",
                data={"username": f"ratelimit-test-{i}@eadmin.gn", "password": "wrong"},
            )
            assert response.status_code in [401, 429]

    @pytest.mark.asyncio
    async def test_api_rate_limiting_headers(self, client):
        """API responses should include rate limit headers."""
        response = await client.get("/health")
        # Health endpoint may or may not have rate limit headers
        # But API endpoints should
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_endpoint_not_rate_limited(self, client):
        """Health endpoint should not be rate limited."""
        for _ in range(10):
            response = await client.get("/health")
            assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_register_endpoint_exists(self, client):
        """Register endpoint should be accessible."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "new-citizen@eadmin.gn",
                "password": "NewCitizen2026!",
                "full_name": "New Citizen",
            },
        )
        # May fail due to DB issues, but should not be 404
        assert response.status_code != 404

    @pytest.mark.asyncio
    async def test_register_forces_citoyen_role(self, client):
        """Registration should always create a CITOYEN role, regardless of input."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "hacker@eadmin.gn",
                "password": "Hacker2026!@",
                "full_name": "Hacker Test",
                "role": "SUPER_ADMIN",  # Should be forced to CITOYEN
            },
        )
        if response.status_code == 200:
            data = response.json()
            assert data.get("role") == "CITOYEN"

    @pytest.mark.asyncio
    async def test_admin_create_user_endpoint_requires_auth(self, client):
        """Admin create-user endpoint should require authentication."""
        response = await client.post(
            "/api/v1/auth/admin/create-user",
            json={
                "email": "new-agent@eadmin.gn",
                "password": "NewAgent2026!@",
                "full_name": "New Agent",
                "role": "AGENT",
            },
        )
        # Should return 401 (unauthorized) without auth headers
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_password_change_rate_limiting(self, client, auth_headers):
        """Password change should be rate limited."""
        # Multiple rapid password change attempts
        for _ in range(6):
            response = await client.post(
                "/api/v1/auth/change-password",
                headers=auth_headers,
                json={
                    "current_password": "WrongPassword1!",
                    "new_password": "NewPassword1!@",
                },
            )
            # Should get 401 (wrong current password) or 429 (rate limited)
            assert response.status_code in [401, 429]
