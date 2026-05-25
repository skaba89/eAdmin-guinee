"""
Configuration Pytest - eAdministration Suite Guinea.
Fixtures partagées pour les tests backend.
SQLite asynchrone en mémoire + mocks Redis pour isolation complète.
"""

import asyncio
import uuid
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.user import RoleEnum, User
from app.services.token_blacklist import TokenBlacklistService
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Base de données de test en mémoire (SQLite async)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_eadmin.db"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Boucle d'événements pour les tests asynchrones."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Crée une session de base de données de test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session
        await session.rollback()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


class MockTokenBlacklist:
    """
    Mock du service TokenBlacklistService pour les tests.
    Simule le comportement Redis sans nécessiter une connexion réelle.
    """

    def __init__(self):
        self._revoked_tokens: set[str] = set()
        self._refresh_tokens: dict[str, set[str]] = {}

    async def revoke_token(self, token_jti: str, expires_in_seconds: int) -> None:
        self._revoked_tokens.add(token_jti)

    async def is_token_revoked(self, token_jti: str) -> bool:
        return token_jti in self._revoked_tokens

    async def store_refresh_token(
        self, user_id: str, refresh_jti: str, expires_in_seconds: int = 7 * 24 * 3600
    ) -> None:
        if user_id not in self._refresh_tokens:
            self._refresh_tokens[user_id] = set()
        self._refresh_tokens[user_id].add(refresh_jti)

    async def is_refresh_token_valid(self, user_id: str, refresh_jti: str) -> bool:
        return refresh_jti in self._refresh_tokens.get(user_id, set())

    async def revoke_all_user_tokens(self, user_id: str) -> int:
        count = len(self._refresh_tokens.get(user_id, set()))
        if user_id in self._refresh_tokens:
            del self._refresh_tokens[user_id]
        return count

    async def _get_redis(self):
        """Retourne un mock Redis pour les endpoints qui l'appellent directement."""
        mock_redis = AsyncMock()
        mock_redis.srem = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)
        return mock_redis

    async def close(self) -> None:
        pass

    def reset(self):
        """Réinitialise l'état du mock entre les tests."""
        self._revoked_tokens.clear()
        self._refresh_tokens.clear()


@pytest_asyncio.fixture(scope="function")
async def mock_token_blacklist():
    """
    Fixture qui mock le service token_blacklist global.
    Remplace l'instance singleton par le mock pour chaque test.
    """
    mock_bl = MockTokenBlacklist()

    # Patch the module-level singleton in auth module
    import app.api.auth as auth_module
    original = auth_module.token_blacklist
    auth_module.token_blacklist = mock_bl

    yield mock_bl

    # Restore original after test
    auth_module.token_blacklist = original


@pytest_asyncio.fixture(scope="function")
async def client(
    db_session: AsyncSession, mock_token_blacklist: MockTokenBlacklist
) -> AsyncGenerator[AsyncClient, None]:
    """Client HTTP de test avec injection de la DB de test et du mock Redis."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Crée un utilisateur de test avec le rôle AGENT."""
    user = User(
        email="test@eadmin.gn",
        hashed_password=pwd_context.hash("Test2026!"),
        full_name="Utilisateur Test",
        role=RoleEnum.AGENT,
        institution="Institution Test",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Crée un utilisateur admin de test."""
    user = User(
        email="admin.test@eadmin.gn",
        hashed_password=pwd_context.hash("Admin2026!"),
        full_name="Admin Test",
        role=RoleEnum.ADMIN,
        institution="Ministère Test",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def super_admin_user(db_session: AsyncSession) -> User:
    """Crée un super-admin de test."""
    user = User(
        email="superadmin.test@eadmin.gn",
        hashed_password=pwd_context.hash("SuperAdmin2026!"),
        full_name="Super Admin Test",
        role=RoleEnum.SUPER_ADMIN,
        institution="Présidence Test",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def directeur_user(db_session: AsyncSession) -> User:
    """Crée un directeur de test."""
    user = User(
        email="directeur.test@eadmin.gn",
        hashed_password=pwd_context.hash("Directeur2026!"),
        full_name="Directeur Test",
        role=RoleEnum.DIRECTEUR,
        institution="Ministère de l'Éducation Test",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def chef_service_user(db_session: AsyncSession) -> User:
    """Crée un chef de service de test."""
    user = User(
        email="chef.test@eadmin.gn",
        hashed_password=pwd_context.hash("Chef2026!"),
        full_name="Chef de Service Test",
        role=RoleEnum.CHEF_SERVICE,
        institution="Mairie de Conakry Test",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def citoyen_user(db_session: AsyncSession) -> User:
    """Crée un utilisateur citoyen de test."""
    user = User(
        email="citoyen.test@eadmin.gn",
        hashed_password=pwd_context.hash("Citoyen2026!"),
        full_name="Citoyen Test",
        role=RoleEnum.CITOYEN,
        institution=None,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, test_user: User) -> dict:
    """Obtient les headers d'authentification pour l'utilisateur de test (AGENT)."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "test@eadmin.gn", "password": "Test2026!"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    tokens = response.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest_asyncio.fixture
async def admin_auth_headers(client: AsyncClient, admin_user: User) -> dict:
    """Obtient les headers d'authentification pour l'admin de test."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "admin.test@eadmin.gn", "password": "Admin2026!"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    tokens = response.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}
