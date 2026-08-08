"""
Tests d'authentification - eAdministration Suite Guinea.
Couvre login, register, refresh, logout, et validation des mots de passe.
"""

import pytest
from httpx import AsyncClient


class TestAuthLogin:
    """Tests de connexion."""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user):
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, test_user):
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "WrongPassword1!"},
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_unknown_email(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "unknown@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient, db_session):
        from app.models.user import User, RoleEnum
        from passlib.context import CryptContext

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        user = User(
            email="inactive@eadmin.gn",
            hashed_password=pwd_context.hash("Test2026!"),
            full_name="Inactive User",
            role=RoleEnum.AGENT,
            is_active=False,
        )
        db_session.add(user)
        await db_session.commit()

        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "inactive@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 403


class TestAuthRegister:
    """L'inscription publique ne doit créer que des citoyens."""

    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@eadmin.gn",
                "password": "NewUser2026!",
                "full_name": "Nouvel Utilisateur",
                "role": "AGENT",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@eadmin.gn"
        assert data["full_name"] == "Nouvel Utilisateur"
        assert data["role"] == "CITOYEN"
        assert data["frontend_role"] == "citoyen"
        assert data["mfa_enabled"] is False

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, test_user):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@eadmin.gn",
                "password": "Duplicate2026!",
                "full_name": "Duplicate User",
                "role": "AGENT",
            },
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client: AsyncClient):
        for email, password in (
            ("weak1@eadmin.gn", "testpassword2026!"),
            ("weak2@eadmin.gn", "TestPassword!"),
            ("weak3@eadmin.gn", "Test1!"),
        ):
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": email,
                    "password": password,
                    "full_name": "Weak Password",
                    "role": "AGENT",
                },
            )
            assert response.status_code == 422


class TestAuthMe:
    @pytest.mark.asyncio
    async def test_get_me_authenticated(self, client: AsyncClient, test_user):
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        token = login_response.json()["access_token"]
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@eadmin.gn"
        assert data["full_name"] == "Utilisateur Test"

    @pytest.mark.asyncio
    async def test_get_me_unauthenticated(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_me_invalid_token(self, client: AsyncClient):
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401


class TestHealthCheck:
    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["service"] == "eAdministration Suite Guinea"
