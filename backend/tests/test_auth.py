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
        """TC-AUTH-001: Connexion réussie avec identifiants valides."""
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
        """TC-AUTH-002: Échec de connexion avec mauvais mot de passe."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "WrongPassword1!"},
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_unknown_email(self, client: AsyncClient):
        """TC-AUTH-003: Échec de connexion avec email inexistant."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "unknown@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient, db_session):
        """TC-AUTH-004: Échec de connexion pour un compte désactivé."""
        from app.models.user import User
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        user = User(
            email="inactive@eadmin.gn",
            hashed_password=pwd_context.hash("Test2026!"),
            full_name="Inactive User",
            role="AGENT",
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
    """Tests d'inscription."""

    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        """TC-REG-001: Inscription réussie avec données valides."""
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
        assert data["role"] == "AGENT"

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, test_user):
        """TC-REG-002: Échec d'inscription avec email déjà utilisé."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@eadmin.gn",
                "password": "Test2026!",
                "full_name": "Duplicate User",
                "role": "AGENT",
            },
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client: AsyncClient):
        """TC-REG-003: Échec d'inscription avec mot de passe faible."""
        # Pas de majuscule
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak1@eadmin.gn",
                "password": "test2026!",
                "full_name": "Weak Password",
                "role": "AGENT",
            },
        )
        assert response.status_code == 422

        # Pas de chiffre
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak2@eadmin.gn",
                "password": "TestTest!",
                "full_name": "Weak Password",
                "role": "AGENT",
            },
        )
        assert response.status_code == 422

        # Trop court
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak3@eadmin.gn",
                "password": "Test1!",
                "full_name": "Weak Password",
                "role": "AGENT",
            },
        )
        assert response.status_code == 422


class TestAuthMe:
    """Tests de l'endpoint /me."""

    @pytest.mark.asyncio
    async def test_get_me_authenticated(self, client: AsyncClient, test_user):
        """TC-ME-001: Récupération du profil utilisateur authentifié."""
        # Login d'abord
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
        """TC-ME-002: Échec sans token d'authentification."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_me_invalid_token(self, client: AsyncClient):
        """TC-ME-003: Échec avec token invalide."""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401


class TestHealthCheck:
    """Tests de l'endpoint de santé."""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """TC-HEALTH-001: L'endpoint de santé répond correctement."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["service"] == "eAdministration Suite Guinea"
