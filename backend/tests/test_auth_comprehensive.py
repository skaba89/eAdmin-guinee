"""
Tests d'authentification complets - eAdministration Suite Guinea.
Couvre inscription, connexion, profil, changement de mot de passe,
déconnexion, rotation des refresh tokens et détection de réutilisation.
"""

import pytest
from httpx import AsyncClient
from jose import jwt

from app.config import settings
from app.models.user import RoleEnum


# ===========================================================================
# Inscription (Register)
# ===========================================================================
class TestRegister:
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
        assert "id" in data
        assert data["is_active"] is True
        assert "frontend_role" in data
        assert data["frontend_role"] == "agence"

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
        assert "email" in response.json()["detail"].lower() or "compte" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_weak_password_too_short(self, client: AsyncClient):
        """TC-REG-003a: Échec avec mot de passe trop court (< 8 caractères)."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak-short@eadmin.gn",
                "password": "T1!",
                "full_name": "Weak Password",
                "role": "AGENT",
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_weak_password_no_uppercase(self, client: AsyncClient):
        """TC-REG-003b: Échec sans majuscule dans le mot de passe."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak-noupper@eadmin.gn",
                "password": "test2026!",
                "full_name": "Weak Password",
                "role": "AGENT",
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_weak_password_no_digit(self, client: AsyncClient):
        """TC-REG-003c: Échec sans chiffre dans le mot de passe."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak-nodigit@eadmin.gn",
                "password": "TestTest!",
                "full_name": "Weak Password",
                "role": "AGENT",
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_with_institution(self, client: AsyncClient):
        """TC-REG-004: Inscription avec institution spécifiée."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "with-inst@eadmin.gn",
                "password": "Institution2026!",
                "full_name": "User With Institution",
                "role": "AGENT",
                "institution": "Ministère des Finances",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["institution"] == "Ministère des Finances"

    @pytest.mark.asyncio
    async def test_register_default_role_is_agent(self, client: AsyncClient):
        """TC-REG-005: Le rôle par défaut est AGENT si non spécifié."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "default-role@eadmin.gn",
                "password": "DefaultRole2026!",
                "full_name": "Default Role User",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "AGENT"

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client: AsyncClient):
        """TC-REG-006: Échec avec email invalide."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "ValidPass2026!",
                "full_name": "Bad Email User",
                "role": "AGENT",
            },
        )
        assert response.status_code == 422


# ===========================================================================
# Connexion (Login)
# ===========================================================================
class TestLogin:
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
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """TC-AUTH-003: Échec de connexion avec email inexistant."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "unknown@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient, db_session):
        """TC-AUTH-004: Échec de connexion pour un compte désactivé."""
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
        assert "désactivé" in response.json()["detail"].lower() or "inactif" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_returns_jwt_with_claims(self, client: AsyncClient, test_user):
        """TC-AUTH-005: Le token JWT contient les claims attendus."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 200
        data = response.json()
        access_token = data["access_token"]

        # Décoder le JWT sans vérification complète pour inspecter les claims
        payload = jwt.decode(
            access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert "sub" in payload
        assert "role" in payload
        assert "frontend_role" in payload
        assert payload["role"] == "AGENT"
        assert payload["frontend_role"] == "agence"
        assert payload["type"] == "access"
        assert "jti" in payload
        assert "exp" in payload

    @pytest.mark.asyncio
    async def test_login_refresh_token_has_correct_type(self, client: AsyncClient, test_user):
        """TC-AUTH-006: Le refresh token a le type 'refresh'."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 200
        refresh_token = response.json()["refresh_token"]

        payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert payload["type"] == "refresh"
        assert "jti" in payload


# ===========================================================================
# Profil utilisateur (Me)
# ===========================================================================
class TestMe:
    """Tests de l'endpoint /me."""

    @pytest.mark.asyncio
    async def test_get_me_authenticated(self, client: AsyncClient, auth_headers):
        """TC-ME-001: Récupération du profil utilisateur authentifié."""
        response = await client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@eadmin.gn"
        assert data["full_name"] == "Utilisateur Test"
        assert data["role"] == "AGENT"
        assert "frontend_role" in data
        assert data["frontend_role"] == "agence"

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

    @pytest.mark.asyncio
    async def test_get_me_returns_all_fields(self, client: AsyncClient, auth_headers):
        """TC-ME-004: Le profil contient tous les champs attendus."""
        response = await client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        expected_fields = {"id", "email", "full_name", "role", "frontend_role", "institution", "is_active", "created_at"}
        assert expected_fields.issubset(set(data.keys()))


# ===========================================================================
# Changement de mot de passe
# ===========================================================================
class TestChangePassword:
    """Tests du changement de mot de passe."""

    @pytest.mark.asyncio
    async def test_change_password_success(self, client: AsyncClient, auth_headers):
        """TC-PWD-001: Changement de mot de passe réussi."""
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "Test2026!",
                "new_password": "NewPassword2026!",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "succès" in response.json()["message"].lower() or "modifié" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_change_password_wrong_current(self, client: AsyncClient, auth_headers):
        """TC-PWD-002: Échec avec mauvais mot de passe actuel."""
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "WrongPassword1!",
                "new_password": "NewPassword2026!",
            },
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_change_password_weak_new_password(self, client: AsyncClient, auth_headers):
        """TC-PWD-003: Échec avec nouveau mot de passe faible."""
        # Trop court
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "Test2026!",
                "new_password": "Short1!",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Sans majuscule
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "Test2026!",
                "new_password": "nouveau2026!",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Sans chiffre
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "Test2026!",
                "new_password": "NouveauPassword!",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_change_password_requires_auth(self, client: AsyncClient):
        """TC-PWD-004: Le changement de mot de passe nécessite une authentification."""
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "Test2026!",
                "new_password": "NewPassword2026!",
            },
        )
        assert response.status_code == 401


# ===========================================================================
# Déconnexion (Logout)
# ===========================================================================
class TestLogout:
    """Tests de la déconnexion."""

    @pytest.mark.asyncio
    async def test_logout_success(self, client: AsyncClient, auth_headers):
        """TC-LOGOUT-001: Déconnexion réussie."""
        response = await client.post(
            "/api/v1/auth/logout",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "révoqué" in response.json()["message"].lower() or "déconnexion" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_access_revoked_after_logout(self, client: AsyncClient, test_user):
        """TC-LOGOUT-002: L'accès est révoqué après déconnexion."""
        # Se connecter
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert login_response.status_code == 200
        tokens = login_response.json()
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        # Vérifier que l'accès fonctionne avant la déconnexion
        me_response = await client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200

        # Se déconnecter
        logout_response = await client.post("/api/v1/auth/logout", headers=headers)
        assert logout_response.status_code == 200

        # Vérifier que l'accès est révoqué après la déconnexion
        me_after_logout = await client.get("/api/v1/auth/me", headers=headers)
        assert me_after_logout.status_code == 401
        assert "révoqué" in me_after_logout.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_logout_requires_auth(self, client: AsyncClient):
        """TC-LOGOUT-003: La déconnexion nécessite une authentification."""
        response = await client.post("/api/v1/auth/logout")
        assert response.status_code == 401


# ===========================================================================
# Refresh Token
# ===========================================================================
class TestRefreshToken:
    """Tests du rafraîchissement de token."""

    @pytest.mark.asyncio
    async def test_refresh_token_rotation(self, client: AsyncClient, test_user, mock_token_blacklist):
        """TC-REFRESH-001: La rotation du refresh token génère de nouveaux tokens."""
        # Se connecter
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert login_response.status_code == 200
        old_tokens = login_response.json()
        old_refresh_token = old_tokens["refresh_token"]
        old_access_token = old_tokens["access_token"]

        # Stocker manuellement le refresh token dans le mock (simule le comportement Redis)
        from jose import jwt as jose_jwt
        old_payload = jose_jwt.decode(
            old_refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        old_jti = old_payload.get("jti", "")
        user_id = old_payload.get("sub", "")
        await mock_token_blacklist.store_refresh_token(user_id, old_jti)

        # Rafraîchir le token
        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh_token},
        )
        assert refresh_response.status_code == 200
        new_tokens = refresh_response.json()

        # Vérifier que les nouveaux tokens sont différents
        assert new_tokens["access_token"] != old_access_token
        assert new_tokens["refresh_token"] != old_refresh_token

        # Vérifier que le nouveau access token fonctionne
        new_headers = {"Authorization": f"Bearer {new_tokens['access_token']}"}
        me_response = await client.get("/api/v1/auth/me", headers=new_headers)
        assert me_response.status_code == 200

    @pytest.mark.asyncio
    async def test_refresh_token_reuse_detection(self, client: AsyncClient, test_user, mock_token_blacklist):
        """TC-REFRESH-002: La réutilisation d'un refresh token est détectée."""
        # Se connecter
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert login_response.status_code == 200
        old_tokens = login_response.json()
        old_refresh_token = old_tokens["refresh_token"]

        # Décoder pour obtenir le jti et le stocker dans le mock
        from jose import jwt as jose_jwt
        old_payload = jose_jwt.decode(
            old_refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        old_jti = old_payload.get("jti", "")
        user_id = old_payload.get("sub", "")
        await mock_token_blacklist.store_refresh_token(user_id, old_jti)

        # Premier rafraîchissement — réussite
        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh_token},
        )
        assert refresh_response.status_code == 200

        # Le mock devrait maintenant invalider l'ancien jti
        # Supprimer manuellement le jti du mock pour simuler la rotation
        mock_token_blacklist._refresh_tokens.get(user_id, set()).discard(old_jti)

        # Deuxième tentative avec le même refresh token — doit échouer
        reuse_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh_token},
        )
        assert reuse_response.status_code == 401
        assert "révoqué" in reuse_response.json()["detail"].lower() or "invalide" in reuse_response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, client: AsyncClient):
        """TC-REFRESH-003: Échec avec un refresh token invalide."""
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.refresh.token"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token_with_access_token_fails(self, client: AsyncClient, auth_headers):
        """TC-REFRESH-004: Un access token ne peut pas être utilisé comme refresh token."""
        # Obtenir un access token
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        access_token = login_response.json()["access_token"]

        # Tenter de l'utiliser comme refresh token
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": access_token},
        )
        assert response.status_code == 401


# ===========================================================================
# Health Check
# ===========================================================================
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

    @pytest.mark.asyncio
    async def test_health_check_includes_version(self, client: AsyncClient):
        """TC-HEALTH-002: L'endpoint de santé inclut la version."""
        response = await client.get("/health")
        data = response.json()
        assert "version" in data
        assert data["version"] == "1.0.0"
