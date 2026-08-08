"""Alembic environment for eAdministration Suite Guinea.

The FastAPI application uses asyncpg for request-time I/O. Alembic uses the
synchronous psycopg2 driver instead: several historical migrations contain
static multi-statement PostgreSQL DDL scripts, which asyncpg intentionally
rejects as prepared statements. Keeping the migration driver separate avoids
changing application concurrency while making clean installs reproducible.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings
from app.database import Base
from app.models import (  # noqa: F401
    AuditLog,
    Courrier,
    Document,
    Institution,
    Tenant,
    User,
    Workflow,
    WorkflowStep,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _migration_database_url() -> str:
    """Return a synchronous PostgreSQL URL dedicated to Alembic."""
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql+asyncpg://"):
        return db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    if db_url.startswith("postgresql://"):
        return db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if db_url.startswith("postgres://"):
        return db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    return db_url


config.set_main_option("sqlalchemy.url", _migration_database_url())


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()

    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
