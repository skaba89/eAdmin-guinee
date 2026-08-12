"""Fail-closed validation of the PostgreSQL principal used by the API runtime."""

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


@dataclass(frozen=True)
class DatabasePrincipal:
    name: str
    is_superuser: bool
    bypasses_rls: bool


async def inspect_database_principal(engine: AsyncEngine) -> DatabasePrincipal | None:
    """Return PostgreSQL role flags for the current runtime connection.

    Non-PostgreSQL engines are ignored so isolated SQLite tests remain portable.
    """

    if engine.dialect.name != "postgresql":
        return None

    async with engine.connect() as connection:
        row = (
            await connection.execute(
                text(
                    """
                    SELECT current_user AS principal, rolsuper, rolbypassrls
                    FROM pg_roles
                    WHERE rolname = current_user
                    """
                )
            )
        ).one()

    return DatabasePrincipal(
        name=str(row.principal),
        is_superuser=bool(row.rolsuper),
        bypasses_rls=bool(row.rolbypassrls),
    )


async def require_rls_safe_database_principal(engine: AsyncEngine) -> DatabasePrincipal | None:
    """Reject runtime roles able to bypass PostgreSQL Row Level Security."""

    principal = await inspect_database_principal(engine)
    if principal is None:
        return None

    if principal.is_superuser or principal.bypasses_rls:
        capabilities: list[str] = []
        if principal.is_superuser:
            capabilities.append("SUPERUSER")
        if principal.bypasses_rls:
            capabilities.append("BYPASSRLS")
        joined = ", ".join(capabilities)
        raise RuntimeError(
            "Le principal PostgreSQL d'exécution de l'API ne doit pas pouvoir contourner RLS "
            f"(principal={principal.name}, privilèges={joined}). Utiliser un rôle runtime "
            "non-superuser et sans BYPASSRLS; réserver le rôle propriétaire aux migrations."
        )

    return principal
