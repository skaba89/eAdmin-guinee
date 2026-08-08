"""SQLAlchemy database configuration with request-scoped RLS propagation."""

from collections.abc import AsyncGenerator
from contextvars import ContextVar
from typing import Any

from sqlalchemy import event, text
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


current_rls_scope: ContextVar[dict[str, Any] | None] = ContextVar(
    "eadmin_current_rls_scope",
    default=None,
)


def _scope_for_session(session: Session) -> dict[str, Any] | None:
    local_scope = session.info.get("rls_scope")
    if isinstance(local_scope, dict):
        return local_scope
    inherited_scope = current_rls_scope.get()
    return inherited_scope if isinstance(inherited_scope, dict) else None


@event.listens_for(Session, "after_begin")
def _propagate_rls_to_new_transaction(session: Session, transaction, connection) -> None:
    """Apply trusted RLS variables to every PostgreSQL transaction in a request."""

    scope = _scope_for_session(session)
    if not scope or connection.dialect.name != "postgresql":
        return

    connection.execute(
        text(
            """
            SELECT
                set_config('app.current_user_id', :user_id, true),
                set_config('app.current_tenant_id', :tenant_id, true),
                set_config('app.current_institution_id', :institution_id, true),
                set_config('app.current_role', :role, true)
            """
        ),
        {
            "user_id": str(scope.get("user_id") or ""),
            "tenant_id": str(scope.get("tenant_id") or ""),
            "institution_id": str(scope.get("institution_id") or ""),
            "role": str(scope.get("role") or ""),
        },
    )


@event.listens_for(Session, "before_flush")
def _enforce_trusted_scope(session: Session, flush_context, instances) -> None:
    """Stamp tenant/institution on new ORM entities from trusted server scope.

    A special case exists for a citizen creating a ServiceRequest: the request
    must be routed to a target institution. That target is accepted only after
    the API validates it against the institutions table and stores it in
    ``session.info['trusted_target_institution_id']``. A payload cannot set this
    trusted slot directly.
    """

    scope = _scope_for_session(session)
    if not scope:
        return

    tenant_id = str(scope.get("tenant_id") or "").strip()
    institution_id = str(scope.get("institution_id") or "").strip() or None
    role = str(scope.get("role") or "")
    is_super_admin = bool(scope.get("is_super_admin"))
    trusted_target = session.info.get("trusted_target_institution_id")
    trusted_target = str(trusted_target).strip() if trusted_target else None

    for obj in session.new:
        if hasattr(obj, "tenant_id"):
            if is_super_admin:
                if getattr(obj, "tenant_id", None) in (None, ""):
                    setattr(obj, "tenant_id", tenant_id)
            else:
                setattr(obj, "tenant_id", tenant_id)

        if hasattr(obj, "institution_id"):
            # Only ServiceRequest may use a separately validated routing target
            # for a citizen. All other normal-user entities are forced to the
            # authenticated user's own institution.
            is_citizen_request = (
                role == "CITOYEN"
                and obj.__class__.__name__ == "ServiceRequest"
                and trusted_target is not None
            )
            if is_citizen_request:
                setattr(obj, "institution_id", trusted_target)
            elif is_super_admin:
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
            session.sync_session.info.pop("trusted_target_institution_id", None)
            await session.close()
