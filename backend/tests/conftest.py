"""
Configuration Pytest - eAdministration Suite Guinea.
Fixtures partagées pour les tests backend.
SQLite asynchrone en mémoire + mocks Redis pour isolation complète.
"""

from __future__ import annotations

import asyncio
import uuid
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock, patch

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

# Patch PostgreSQL-specific types for SQLite compatibility
from sqlalchemy import event
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSON as PG_JSON

@event.listens_for(test_engine.sync_engine, "before_cursor_execute")
def _receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """No-op hook for SQLite compatibility."""
    pass

# Monkey-patch UUID type to use String for SQLite
import sqlalchemy
original_uuid_compiler = None

def _sqlite_uuid_compiler(self, compiler, **kw):
    """Render UUID as String(36) for SQLite."""
    return "VARCHAR(36)"

# Patch the UUID type for SQLite dialect
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
_original_process = SQLiteTypeCompiler.process

def _patched_process(self, type_, **kw):
    """Patch UUID and JSON types for SQLite compatibility."""
    if isinstance(type_, PG_UUID):
        from sqlalchemy import String
        return self.process(String(36), **kw)
    if isinstance(type_, PG_JSON):
        from sqlalchemy import Text
        return self.process(Text(), **kw)
    return _original_process(self, type_, **kw)

SQLiteTypeCompiler.process = _patched_process

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
    Supports token blacklist, refresh tokens, and login attempt tracking.
    """

    def __init__(self):
        self._revoked_tokens: set[str] = set()
        self._refresh_tokens: dict[str, set[str]] = {}
        self._login_attempts: dict[str, int] = {}
        self._account_locks: dict[str, bool] = {}

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

    # --- Account lockout methods (Redis-backed) ---

    async def is_account_locked(self, email: str, max_attempts: int = 5, lockout_seconds: int = 900) -> bool:
        """Check if an account is locked due to too many failed login attempts."""
        return self._account_locks.get(email, False)

    async def record_failed_login(self, email: str, lockout_seconds: int = 900) -> None:
        """Record a failed login attempt."""
        self._login_attempts[email] = self._login_attempts.get(email, 0) + 1
        # Lock after 5 failed attempts
        if self._login_attempts[email] >= 5:
            self._account_locks[email] = True

    async def reset_login_attempts(self, email: str) -> None:
        """Reset failed login attempts after successful login."""
        self._login_attempts.pop(email, None)
        self._account_locks.pop(email, None)

    async def get_remaining_attempts(self, email: str, max_attempts: int = 5, lockout_seconds: int = 900) -> int:
        """Get remaining login attempts before lockout."""
        attempts = self._login_attempts.get(email, 0)
        return max(0, max_attempts - attempts)

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
        self._login_attempts.clear()
        self._account_locks.clear()


class MockRedis:
    """
    Mock Redis for session service and other Redis-dependent services.
    Simulates Redis hash, set, list, and string operations in-memory.
    Supports advanced operations: incr, incrby, ttl, type, scan, etc.
    """

    def __init__(self):
        self._data: dict[str, any] = {}
        self._sets: dict[str, set] = {}
        self._lists: dict[str, list] = {}
        self._hashes: dict[str, dict[str, str]] = {}
        self._expiry: dict[str, float] = {}

    async def ping(self) -> bool:
        return True

    # String operations
    async def get(self, key: str) -> str | None:
        return self._data.get(key)

    async def set(self, key: str, value: str, ex: int | None = None, **kwargs) -> bool:
        self._data[key] = value
        return True

    async def delete(self, *keys: str) -> int:
        count = 0
        for key in keys:
            if key in self._data:
                del self._data[key]
                count += 1
            if key in self._sets:
                del self._sets[key]
                count += 1
            if key in self._lists:
                del self._lists[key]
                count += 1
            if key in self._hashes:
                del self._hashes[key]
                count += 1
        return count

    async def exists(self, key: str) -> bool:
        return key in self._data or key in self._hashes or key in self._sets or key in self._lists

    async def expire(self, key: str, seconds: int) -> bool:
        return key in self._data or key in self._hashes or key in self._sets or key in self._lists

    async def ttl(self, key: str) -> int:
        """Return TTL for a key (-1 if no expiry, -2 if not exists)."""
        if key not in self._data and key not in self._hashes and key not in self._sets and key not in self._lists:
            return -2
        if key in self._expiry:
            return max(0, int(self._expiry[key]))
        return -1

    async def incr(self, key: str) -> int:
        """Increment the integer value of a key by one."""
        current = int(self._data.get(key, "0"))
        current += 1
        self._data[key] = str(current)
        return current

    async def incrby(self, key: str, amount: int) -> int:
        """Increment the integer value of a key by the given amount."""
        current = int(self._data.get(key, "0"))
        current += amount
        self._data[key] = str(current)
        return current

    async def decr(self, key: str) -> int:
        """Decrement the integer value of a key by one."""
        current = int(self._data.get(key, "0"))
        current -= 1
        self._data[key] = str(current)
        return current

    async def setnx(self, key: str, value: str) -> bool:
        """Set key to hold string value if key does not exist."""
        if key in self._data:
            return False
        self._data[key] = value
        return True

    async def mget(self, *keys: str) -> list[str | None]:
        """Get multiple keys at once."""
        return [self._data.get(k) for k in keys]

    async def type(self, key: str) -> str:
        """Determine the type stored at key."""
        if key in self._hashes:
            return "hash"
        if key in self._sets:
            return "set"
        if key in self._lists:
            return "list"
        if key in self._data:
            return "string"
        return "none"

    # Hash operations
    async def hset(self, key: str, field_or_mapping=None, value=None, mapping: dict | None = None, **kwargs) -> int:
        """Support both hset(key, field, value) and hset(key, mapping={...}) styles."""
        if key not in self._hashes:
            self._hashes[key] = {}
        # hset(key, mapping={...}) style
        if isinstance(field_or_mapping, dict):
            self._hashes[key].update(field_or_mapping)
        elif mapping is not None:
            self._hashes[key].update(mapping)
        # hset(key, field, value) style
        elif field_or_mapping is not None and value is not None:
            self._hashes[key][str(field_or_mapping)] = str(value)
        # kwargs style
        for k, v in kwargs.items():
            self._hashes[key][k] = v
        return len(self._hashes[key])

    async def hget(self, key: str, field: str) -> str | None:
        return self._hashes.get(key, {}).get(field)

    async def hgetall(self, key: str) -> dict[str, str]:
        return dict(self._hashes.get(key, {}))

    async def hdel(self, key: str, *fields: str) -> int:
        """Delete one or more hash fields."""
        if key not in self._hashes:
            return 0
        count = 0
        for field in fields:
            if field in self._hashes[key]:
                del self._hashes[key][field]
                count += 1
        return count

    async def hincrby(self, key: str, field: str, amount: int = 1) -> int:
        """Increment the integer value of a hash field by the given amount."""
        if key not in self._hashes:
            self._hashes[key] = {}
        current = int(self._hashes[key].get(field, "0"))
        current += amount
        self._hashes[key][field] = str(current)
        return current

    async def hexists(self, key: str, field: str) -> bool:
        """Check if a hash field exists."""
        return key in self._hashes and field in self._hashes[key]

    # Set operations
    async def sadd(self, key: str, *members: str) -> int:
        if key not in self._sets:
            self._sets[key] = set()
        count = 0
        for m in members:
            if m not in self._sets[key]:
                self._sets[key].add(m)
                count += 1
        return count

    async def srem(self, key: str, *members: str) -> int:
        if key not in self._sets:
            return 0
        count = 0
        for m in members:
            if m in self._sets[key]:
                self._sets[key].discard(m)
                count += 1
        return count

    async def smembers(self, key: str) -> set[str]:
        return self._sets.get(key, set())

    async def sismember(self, key: str, member: str) -> bool:
        return member in self._sets.get(key, set())

    async def scard(self, key: str) -> int:
        """Get the number of members in a set."""
        return len(self._sets.get(key, set()))

    # List operations
    async def lpush(self, key: str, *values: str) -> int:
        if key not in self._lists:
            self._lists[key] = []
        for v in values:
            self._lists[key].insert(0, v)
        return len(self._lists[key])

    async def rpush(self, key: str, *values: str) -> int:
        """Append one or multiple values to a list."""
        if key not in self._lists:
            self._lists[key] = []
        for v in values:
            self._lists[key].append(v)
        return len(self._lists[key])

    async def lrange(self, key: str, start: int, stop: int) -> list[str]:
        lst = self._lists.get(key, [])
        if stop == -1:
            return lst[start:]
        return lst[start:stop + 1]

    async def ltrim(self, key: str, start: int, stop: int) -> bool:
        if key in self._lists:
            self._lists[key] = self._lists[key][start:stop + 1]
        return True

    async def llen(self, key: str) -> int:
        """Get the length of a list."""
        return len(self._lists.get(key, []))

    # Sorted set operations (for rate limiting)
    async def zadd(self, key: str, mapping: dict) -> int:
        if key not in self._data:
            self._data[key] = {}
        if not isinstance(self._data[key], dict):
            self._data[key] = {}
        self._data[key].update(mapping)
        return len(mapping)

    async def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> int:
        return 0

    async def zcard(self, key: str) -> int:
        if key in self._data and isinstance(self._data[key], dict):
            return len(self._data[key])
        return 0

    # Pipeline support
    def pipeline(self):
        """Return a mock pipeline that collects commands."""
        return MockRedisPipeline(self)

    async def close(self) -> None:
        pass


class MockRedisPipeline:
    """Mock Redis pipeline for batched operations."""

    def __init__(self, redis: MockRedis):
        self._redis = redis
        self._commands = []

    def zremrangebyscore(self, key: str, min_score, max_score):
        self._commands.append(('zremrangebyscore', key, min_score, max_score))
        return self

    def zcard(self, key: str):
        self._commands.append(('zcard', key))
        return self

    def zadd(self, key: str, mapping: dict):
        self._commands.append(('zadd', key, mapping))
        return self

    def expire(self, key: str, seconds: int):
        self._commands.append(('expire', key, seconds))
        return self

    async def execute(self):
        """Execute all commands in the pipeline and return results."""
        results = []
        for cmd in self._commands:
            if cmd[0] == 'zremrangebyscore':
                results.append(0)
            elif cmd[0] == 'zcard':
                key = cmd[1]
                if key in self._redis._data and isinstance(self._redis._data[key], dict):
                    results.append(len(self._redis._data[key]))
                else:
                    results.append(0)
            elif cmd[0] == 'zadd':
                key, mapping = cmd[1], cmd[2]
                if key not in self._redis._data:
                    self._redis._data[key] = {}
                if not isinstance(self._redis._data[key], dict):
                    self._redis._data[key] = {}
                self._redis._data[key].update(mapping)
                results.append(len(mapping))
            elif cmd[0] == 'expire':
                results.append(True)
            else:
                results.append(None)
        self._commands.clear()
        return results


# =============================================================================
# Mock service fixtures
# =============================================================================


class MockSessionService:
    """
    Mock du service SessionService pour les tests.
    Simule la gestion des sessions sans connexion Redis réelle.
    """

    def __init__(self):
        self._sessions: dict[str, dict] = {}
        self._user_sessions: dict[str, set[str]] = {}
        self._trusted_devices: dict[str, set[str]] = {}
        self._security_events: dict[str, list[dict]] = {}

    async def create_session(
        self, user_id: str, ip_address: str, user_agent: str,
        device_fingerprint: str, latitude: float | None = None,
        longitude: float | None = None,
    ) -> str:
        session_id = f"sess-mock-{uuid.uuid4().hex[:8]}"
        self._sessions[session_id] = {
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "device_fingerprint": device_fingerprint,
            "is_active": "1",
            "mfa_verified": "0",
            "latitude": str(latitude) if latitude else "",
            "longitude": str(longitude) if longitude else "",
        }
        if user_id not in self._user_sessions:
            self._user_sessions[user_id] = set()
        self._user_sessions[user_id].add(session_id)
        return session_id

    async def validate_session(self, session_id: str) -> dict | None:
        return self._sessions.get(session_id)

    async def destroy_session(self, session_id: str) -> None:
        session = self._sessions.pop(session_id, None)
        if session:
            user_id = session.get("user_id")
            if user_id and user_id in self._user_sessions:
                self._user_sessions[user_id].discard(session_id)

    async def destroy_all_sessions(self, user_id: str) -> int:
        count = len(self._user_sessions.get(user_id, set()))
        for sid in list(self._user_sessions.get(user_id, set())):
            self._sessions.pop(sid, None)
        self._user_sessions.pop(user_id, None)
        return count

    async def get_user_sessions(self, user_id: str) -> list[dict]:
        sids = self._user_sessions.get(user_id, set())
        return [
            {**self._sessions[sid], "session_id": sid}
            for sid in sids if sid in self._sessions
        ]

    async def detect_suspicious_session(
        self, session_id: str, current_ip: str, current_user_agent: str,
        latitude: float | None = None, longitude: float | None = None,
    ) -> dict:
        session = self._sessions.get(session_id)
        if not session:
            return {"is_suspicious": False, "reasons": [], "risk_score": 0}
        reasons = []
        risk_score = 0
        if session.get("ip_address") != current_ip:
            reasons.append("IP change detected")
            risk_score += 30
        if session.get("user_agent") != current_user_agent:
            reasons.append("User-Agent change detected")
            risk_score += 20
        return {
            "is_suspicious": risk_score >= 40,
            "reasons": reasons,
            "risk_score": min(risk_score, 100),
        }

    async def update_session_activity(self, session_id: str) -> None:
        pass

    async def mark_session_mfa_verified(self, session_id: str) -> None:
        if session_id in self._sessions:
            self._sessions[session_id]["mfa_verified"] = "1"

    async def get_trusted_devices(self, user_id: str) -> list[dict]:
        fps = self._trusted_devices.get(user_id, set())
        return [{"device_id": fp, "fingerprint": fp, "is_trusted": True} for fp in fps]

    async def add_trusted_device(self, user_id: str, device_fingerprint: str, **kwargs) -> None:
        if user_id not in self._trusted_devices:
            self._trusted_devices[user_id] = set()
        self._trusted_devices[user_id].add(device_fingerprint)

    async def remove_trusted_device(self, user_id: str, device_id: str) -> bool:
        if user_id in self._trusted_devices:
            if device_id in self._trusted_devices[user_id]:
                self._trusted_devices[user_id].discard(device_id)
                return True
        return False

    async def get_security_events(self, user_id: str, limit: int = 50) -> list[dict]:
        return self._security_events.get(user_id, [])[:limit]

    async def close(self) -> None:
        pass


class MockAuditService:
    """
    Mock du service AuditService pour les tests.
    Simule l'enregistrement d'actions d'audit sans base de données.
    """

    def __init__(self):
        self._entries: list[dict] = []
        self._chain: list[str] = []

    async def log_action(
        self, user_id=None, action=None, resource_type=None, resource_id=None,
        category=None, description=None, details=None, old_value=None,
        new_value=None, severity="info", ip_address=None, user_agent=None,
        session_id=None, device_fingerprint=None, tenant_id=None,
        institution_id=None, resource_name=None,
    ) -> dict:
        entry = {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "action": action.upper() if action else None,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "category": category,
            "description": description,
            "severity": severity if severity in ("info", "warning", "critical") else "info",
            "tenant_id": tenant_id,
            "institution_id": institution_id,
        }
        self._entries.append(entry)
        return entry

    async def verify_chain_integrity(self, since=None, tenant_id=None) -> dict:
        return {
            "is_valid": True,
            "total_entries": len(self._entries),
            "verified_entries": len(self._entries),
            "broken_at": None,
            "broken_reason": None,
            "verification_time_ms": 1,
        }

    async def get_stats(self, tenant_id=None, since=None) -> dict:
        return {
            "total_entries": len(self._entries),
            "top_actions": [],
            "severity_stats": {},
            "top_users": [],
            "top_resources": [],
        }

    async def get_timeline(self, resource_type=None, resource_id=None, tenant_id=None) -> list:
        return []


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
async def mock_redis():
    """
    Fixture that provides a MockRedis instance for services that depend on Redis.
    """
    return MockRedis()


@pytest_asyncio.fixture(scope="function")
async def mock_session_service():
    """
    Fixture that provides a MockSessionService instance.
    """
    return MockSessionService()


@pytest_asyncio.fixture(scope="function")
async def mock_audit_service():
    """
    Fixture that provides a MockAuditService instance.
    """
    return MockAuditService()


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


# =============================================================================
# User fixtures for all 9 roles
# =============================================================================


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
async def mairie_user(db_session: AsyncSession) -> User:
    """Crée un utilisateur avec le rôle MAIRIE."""
    user = User(
        email="mairie.test@eadmin.gn",
        hashed_password=pwd_context.hash("Mairie2026!"),
        full_name="Agent Mairie Test",
        role=RoleEnum.MAIRIE,
        institution="Mairie de Kaloum",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def agence_user(db_session: AsyncSession) -> User:
    """Crée un utilisateur avec le rôle AGENCE."""
    user = User(
        email="agence.test@eadmin.gn",
        hashed_password=pwd_context.hash("Agence2026!"),
        full_name="Agent Agence Test",
        role=RoleEnum.AGENCE,
        institution="ANIP",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def ministre_user(db_session: AsyncSession) -> User:
    """Crée un utilisateur avec le rôle MINISTRE."""
    user = User(
        email="ministre.test@eadmin.gn",
        hashed_password=pwd_context.hash("Ministre2026!"),
        full_name="Ministre Test",
        role=RoleEnum.MINISTRE,
        institution="Ministère de l'Éducation",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# =============================================================================
# Tenant and Institution fixtures
# =============================================================================


@pytest_asyncio.fixture
async def test_tenant(db_session: AsyncSession):
    """Crée un tenant de test."""
    from app.models.tenant import Tenant
    tenant = Tenant(
        id="test-tenant",
        name="Test Tenant",
        domain="test.eadmin.gn",
        is_active=True,
        max_users=500,
        max_documents=5000,
        max_storage_mb=2048,
        primary_color="#CE1126",
        secondary_color="#FCD116",
        accent_color="#009460",
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest_asyncio.fixture
async def test_institution(db_session: AsyncSession, test_tenant):
    """Crée une institution de test."""
    from app.models.institution import Institution
    institution = Institution(
        id="test-institution",
        tenant_id=test_tenant.id,
        name="Institution Test",
        type="ministere",
        code="TEST-001",
        is_active=True,
    )
    db_session.add(institution)
    await db_session.commit()
    await db_session.refresh(institution)
    return institution


# =============================================================================
# AuditService fixture
# =============================================================================


@pytest_asyncio.fixture
async def audit_service(db_session: AsyncSession):
    """Crée une instance d'AuditService avec la session de test."""
    from app.services.audit_service import AuditService
    return AuditService(db_session)


# =============================================================================
# Auth headers fixtures
# =============================================================================


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


@pytest_asyncio.fixture
async def super_admin_auth_headers(client: AsyncClient, super_admin_user: User) -> dict:
    """Obtient les headers d'authentification pour le super-admin de test."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "superadmin.test@eadmin.gn", "password": "SuperAdmin2026!"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    tokens = response.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest_asyncio.fixture
async def directeur_auth_headers(client: AsyncClient, directeur_user: User) -> dict:
    """Obtient les headers d'authentification pour le directeur de test."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "directeur.test@eadmin.gn", "password": "Directeur2026!"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    tokens = response.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}
