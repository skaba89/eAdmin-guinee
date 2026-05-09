"""
Environnement Alembic avec support asynchrone - eAdministration Suite Guinea.
Permet l'exécution des migrations en mode async avec asyncpg.
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import settings
from app.database import Base

# Importer tous les modèles pour qu'Alembic les détecte
from app.models import (  # noqa: F401
    AuditLog,
    Courrier,
    Document,
    User,
    Workflow,
    WorkflowStep,
)

# Configuration Alembic
config = context.config

# Interpréter le fichier de configuration pour le logging Python
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Cible metadata pour autogénération
target_metadata = Base.metadata

# Remplacer l'URL de la base de données par celle de la configuration
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    """
    Exécute les migrations en mode 'offline'.
    Génère le SQL sans se connecter à la base de données.
    Utile pour les revues de code et les scripts SQL.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """Exécute les migrations avec une connexion donnée."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Exécute les migrations en mode asynchrone.
    Crée un moteur asynchrone et exécute les migrations dans un event loop.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    Exécute les migrations en mode 'online'.
    Se connecte à la base de données et applique les changements.
    Utilise le support asynchrone via asyncio.
    """
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
