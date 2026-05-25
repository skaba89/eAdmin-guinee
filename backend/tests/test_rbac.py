"""
Tests RBAC (Role-Based Access Control) - eAdministration Suite Guinea.
Vérifie les mappings de rôles backend → frontend, les claims JWT,
et l'inscription avec chaque rôle.
"""

import pytest
from httpx import AsyncClient
from jose import jwt

from app.config import settings
from app.models.user import RoleEnum


class TestRoleEnumValues:
    """Tests des valeurs de l'énumération RoleEnum."""

    def test_role_enum_has_six_values(self):
        """TC-RBAC-001: RoleEnum contient exactement 6 rôles."""
        assert len(RoleEnum) == 6

    def test_role_enum_super_admin(self):
        """TC-RBAC-002: SUPER_ADMIN est défini."""
        assert RoleEnum.SUPER_ADMIN.value == "SUPER_ADMIN"

    def test_role_enum_admin(self):
        """TC-RBAC-003: ADMIN est défini."""
        assert RoleEnum.ADMIN.value == "ADMIN"

    def test_role_enum_director(self):
        """TC-RBAC-004: DIRECTOR est défini."""
        assert RoleEnum.DIRECTOR.value == "DIRECTOR"

    def test_role_enum_chef_service(self):
        """TC-RBAC-005: CHEF_SERVICE est défini."""
        assert RoleEnum.CHEF_SERVICE.value == "CHEF_SERVICE"

    def test_role_enum_agent(self):
        """TC-RBAC-006: AGENT est défini."""
        assert RoleEnum.AGENT.value == "AGENT"

    def test_role_enum_lecteur(self):
        """TC-RBAC-007: LECTEUR est défini."""
        assert RoleEnum.LECTEUR.value == "LECTEUR"

    def test_role_enum_is_string_enum(self):
        """TC-RBAC-008: RoleEnum hérite de str (sérialisable en JSON)."""
        assert isinstance(RoleEnum.AGENT, str)
        assert RoleEnum.AGENT == "AGENT"


class TestFrontendRoleMapping:
    """Tests du mapping backend → frontend des rôles."""

    def test_super_admin_maps_to_superadmin(self):
        """TC-RBAC-009: SUPER_ADMIN → 'superadmin'."""
        assert RoleEnum.SUPER_ADMIN.to_frontend_role() == "superadmin"

    def test_admin_maps_to_admin(self):
        """TC-RBAC-010: ADMIN → 'admin'."""
        assert RoleEnum.ADMIN.to_frontend_role() == "admin"

    def test_director_maps_to_ministere(self):
        """TC-RBAC-011: DIRECTOR → 'ministere'."""
        assert RoleEnum.DIRECTOR.to_frontend_role() == "ministere"

    def test_chef_service_maps_to_mairie(self):
        """TC-RBAC-012: CHEF_SERVICE → 'mairie'."""
        assert RoleEnum.CHEF_SERVICE.to_frontend_role() == "mairie"

    def test_agent_maps_to_agence(self):
        """TC-RBAC-013: AGENT → 'agence'."""
        assert RoleEnum.AGENT.to_frontend_role() == "agence"

    def test_lecteur_maps_to_citoyen(self):
        """TC-RBAC-014: LECTEUR → 'citoyen'."""
        assert RoleEnum.LECTEUR.to_frontend_role() == "citoyen"

    def test_all_roles_have_frontend_mapping(self):
        """TC-RBAC-015: Chaque rôle a un mapping frontend non vide."""
        for role in RoleEnum:
            frontend_role = role.to_frontend_role()
            assert isinstance(frontend_role, str)
            assert len(frontend_role) > 0, f"Role {role.value} has empty frontend mapping"

    def test_frontend_roles_are_unique(self):
        """TC-RBAC-016: Les rôles frontend sont uniques (pas de collision)."""
        frontend_roles = [role.to_frontend_role() for role in RoleEnum]
        assert len(frontend_roles) == len(set(frontend_roles)), "Duplicate frontend roles detected"

    def test_frontend_roles_are_lowercase(self):
        """TC-RBAC-017: Les rôles frontend sont en minuscules."""
        for role in RoleEnum:
            frontend_role = role.to_frontend_role()
            assert frontend_role == frontend_role.lower(), f"Frontend role '{frontend_role}' is not lowercase"


class TestTokenContainsFrontendRole:
    """Tests que les tokens JWT contiennent le frontend_role."""

    @pytest.mark.asyncio
    async def test_access_token_contains_frontend_role(self, client: AsyncClient, test_user):
        """TC-RBAC-018: L'access token contient le claim frontend_role."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 200
        access_token = response.json()["access_token"]

        payload = jwt.decode(
            access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert "frontend_role" in payload
        assert payload["frontend_role"] == "agence"

    @pytest.mark.asyncio
    async def test_refresh_token_contains_frontend_role(self, client: AsyncClient, test_user):
        """TC-RBAC-019: Le refresh token contient le claim frontend_role."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 200
        refresh_token = response.json()["refresh_token"]

        payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert "frontend_role" in payload
        assert payload["frontend_role"] == "agence"

    @pytest.mark.asyncio
    async def test_token_frontend_role_matches_role(self, client: AsyncClient, admin_user):
        """TC-RBAC-020: Le frontend_role dans le token correspond au rôle."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "admin.test@eadmin.gn", "password": "Admin2026!"},
        )
        assert response.status_code == 200
        access_token = response.json()["access_token"]

        payload = jwt.decode(
            access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert payload["role"] == "ADMIN"
        assert payload["frontend_role"] == "admin"


class TestRegisterWithEachRole:
    """Tests d'inscription avec chaque rôle disponible."""

    @pytest.mark.asyncio
    async def test_register_as_agent(self, client: AsyncClient):
        """TC-RBAC-021: Inscription en tant qu'AGENT."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "agent@eadmin.gn",
                "password": "AgentPass2026!",
                "full_name": "Agent Test",
                "role": "AGENT",
            },
        )
        assert response.status_code == 200
        assert response.json()["role"] == "AGENT"
        assert response.json()["frontend_role"] == "agence"

    @pytest.mark.asyncio
    async def test_register_as_admin(self, client: AsyncClient):
        """TC-RBAC-022: Inscription en tant qu'ADMIN."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "admin-role@eadmin.gn",
                "password": "AdminPass2026!",
                "full_name": "Admin Test",
                "role": "ADMIN",
            },
        )
        assert response.status_code == 200
        assert response.json()["role"] == "ADMIN"
        assert response.json()["frontend_role"] == "admin"

    @pytest.mark.asyncio
    async def test_register_as_super_admin(self, client: AsyncClient):
        """TC-RBAC-023: Inscription en tant que SUPER_ADMIN."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "superadmin-role@eadmin.gn",
                "password": "SuperAdmin2026!",
                "full_name": "Super Admin Test",
                "role": "SUPER_ADMIN",
            },
        )
        assert response.status_code == 200
        assert response.json()["role"] == "SUPER_ADMIN"
        assert response.json()["frontend_role"] == "superadmin"

    @pytest.mark.asyncio
    async def test_register_as_director(self, client: AsyncClient):
        """TC-RBAC-024: Inscription en tant que DIRECTOR."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "director-role@eadmin.gn",
                "password": "Director2026!",
                "full_name": "Director Test",
                "role": "DIRECTOR",
            },
        )
        assert response.status_code == 200
        assert response.json()["role"] == "DIRECTOR"
        assert response.json()["frontend_role"] == "ministere"

    @pytest.mark.asyncio
    async def test_register_as_chef_service(self, client: AsyncClient):
        """TC-RBAC-025: Inscription en tant que CHEF_SERVICE."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "chef-role@eadmin.gn",
                "password": "ChefService2026!",
                "full_name": "Chef de Service Test",
                "role": "CHEF_SERVICE",
            },
        )
        assert response.status_code == 200
        assert response.json()["role"] == "CHEF_SERVICE"
        assert response.json()["frontend_role"] == "mairie"

    @pytest.mark.asyncio
    async def test_register_as_lecteur(self, client: AsyncClient):
        """TC-RBAC-026: Inscription en tant que LECTEUR."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "lecteur-role@eadmin.gn",
                "password": "Lecteur2026!",
                "full_name": "Lecteur Test",
                "role": "LECTEUR",
            },
        )
        assert response.status_code == 200
        assert response.json()["role"] == "LECTEUR"
        assert response.json()["frontend_role"] == "citoyen"

    @pytest.mark.asyncio
    async def test_register_with_invalid_role(self, client: AsyncClient):
        """TC-RBAC-027: Échec d'inscription avec un rôle invalide."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "invalid-role@eadmin.gn",
                "password": "InvalidRole2026!",
                "full_name": "Invalid Role",
                "role": "INVALID_ROLE",
            },
        )
        assert response.status_code == 422


class TestMeEndpointFrontendRole:
    """Tests que l'endpoint /me retourne le frontend_role correct."""

    @pytest.mark.asyncio
    async def test_me_returns_frontend_role_for_agent(self, client: AsyncClient, auth_headers):
        """TC-RBAC-028: /me retourne frontend_role pour AGENT."""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["frontend_role"] == "agence"

    @pytest.mark.asyncio
    async def test_me_returns_frontend_role_for_admin(self, client: AsyncClient, admin_auth_headers):
        """TC-RBAC-029: /me retourne frontend_role pour ADMIN."""
        response = await client.get("/api/v1/auth/me", headers=admin_auth_headers)
        assert response.status_code == 200
        assert response.json()["frontend_role"] == "admin"

    @pytest.mark.asyncio
    async def test_me_returns_frontend_role_for_director(self, client: AsyncClient, director_user):
        """TC-RBAC-030: /me retourne frontend_role pour DIRECTOR."""
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "director.test@eadmin.gn", "password": "Director2026!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["frontend_role"] == "ministere"

    @pytest.mark.asyncio
    async def test_me_returns_frontend_role_for_chef_service(self, client: AsyncClient, chef_service_user):
        """TC-RBAC-031: /me retourne frontend_role pour CHEF_SERVICE."""
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "chef.test@eadmin.gn", "password": "Chef2026!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["frontend_role"] == "mairie"

    @pytest.mark.asyncio
    async def test_me_returns_frontend_role_for_lecteur(self, client: AsyncClient, lecteur_user):
        """TC-RBAC-032: /me retourne frontend_role pour LECTEUR."""
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "lecteur.test@eadmin.gn", "password": "Lecteur2026!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["frontend_role"] == "citoyen"

    @pytest.mark.asyncio
    async def test_me_returns_frontend_role_for_super_admin(self, client: AsyncClient, super_admin_user):
        """TC-RBAC-033: /me retourne frontend_role pour SUPER_ADMIN."""
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "superadmin.test@eadmin.gn", "password": "SuperAdmin2026!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["frontend_role"] == "superadmin"
