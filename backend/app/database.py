"""
Configuration de la base de données SQLAlchemy asynchrone.
Utilise asyncpg pour la connexion PostgreSQL.
"""

from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session

from app.config import settings

DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.is_development,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Classe de base déclarative pour tous les modèles ORM."""


@event.listens_for(Session, "before_flush")
def _enforce_trusted_scope(session: Session, flush_context, instances) -> None:
    """Stamp tenant/institution from the authenticated RLS scope.

    This closes a mass-assignment class of bugs where an API payload can carry
    an arbitrary ``tenant_id`` or ``institution_id``. For normal users, the
    authenticated scope always wins. SUPER_ADMIN may explicitly target another
    institution, while still receiving safe defaults when fields are omitted.
    Sessions created outside a trusted request (migrations, public registration,
    background/bootstrap code) are left untouched and remain subject to the
    database RLS policies themselves.
    """

    scope = session.info.get("rls_scope")
    if not isinstance(scope, dict):
        return

    tenant_id = str(scope.get("tenant_id") or "").strip()
    institution_id = str(scope.get("institution_id") or "").strip() or None
    is_super_admin = bool(scope.get("is_super_admin"))

    for obj in session.new:
        if hasattr(obj, "tenant_id"):
            if is_super_admin:
                if getattr(obj, "tenant_id", None) in (None, ""):
                    setattr(obj, "tenant_id", tenant_id)
            else:
                setattr(obj, "tenant_id", tenant_id)

        if hasattr(obj, "institution_id"):
            if is_super_admin:
                if getattr(obj, "institution_id", None) in (None, ""):
                    setattr(obj, "institution_id", institution_id)
            else:
                setattr(obj, "institution_id", institution_id)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Fournit une session transactionnelle FastAPI et garantit rollback/close."""

    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            session.sync_session.info.pop("rls_scope", None)
            await session.close()
