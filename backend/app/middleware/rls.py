"""Trusted PostgreSQL Row-Level Security request context.

The authenticated user is the only source of tenant, institution and role data.
Client supplied tenant/institution headers are treated as routing hints and are
rejected when they attempt to escape the authenticated user's scope.
"""

import logging

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import RoleEnum, User

logger = logging.getLogger("eadmin.rls")


class RLSContextError(RuntimeError):
    """Raised when the database security context cannot be established."""


def _normalized(value: str | None) -> str:
    return (value or "").strip()


def _validate_requested_scope(request: Request, current_user: User) -> None:
    """Reject an explicit tenant/institution that does not belong to the user."""

    if current_user.role == RoleEnum.SUPER_ADMIN:
        return

    trusted_tenant = _normalized(current_user.tenant_id) or settings.TENANT_DEFAULT_ID
    trusted_institution = _normalized(current_user.institution_id)

    routed_tenant = _normalized(getattr(request.state, "tenant_id", None))
    routed_institution = _normalized(getattr(request.state, "institution_id", None))

    if routed_tenant and routed_tenant != trusted_tenant:
        logger.warning(
            "RLS tenant mismatch blocked: user=%s trusted=%s requested=%s",
            current_user.id,
            trusted_tenant,
            routed_tenant,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le périmètre administratif demandé n'est pas autorisé.",
        )

    if routed_institution and routed_institution != trusted_institution:
        logger.warning(
            "RLS institution mismatch blocked: user=%s trusted=%s requested=%s",
            current_user.id,
            trusted_institution,
            routed_institution,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="L'institution demandée n'est pas autorisée pour ce compte.",
        )


async def set_rls_context(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Establish the transaction-local PostgreSQL RLS security context.

    The context contains only values derived from the authenticated database
    user record. Any failure is fail-closed: business endpoints must never run
    without a valid RLS context in PostgreSQL.
    """

    _validate_requested_scope(request, current_user)

    user_id = str(current_user.id)
    tenant_id = _normalized(current_user.tenant_id) or settings.TENANT_DEFAULT_ID
    institution_id = _normalized(current_user.institution_id)
    role = current_user.role.value

    # Keep the trusted scope available to application services. Never reuse the
    # untrusted routing header values after this point.
    request.state.rls_user_id = user_id
    request.state.rls_tenant_id = tenant_id
    request.state.rls_institution_id = institution_id
    request.state.rls_role = role

    try:
        bind = db.get_bind()
        dialect_name = bind.dialect.name if bind is not None else "unknown"

        # The test suite uses SQLite. RLS is a PostgreSQL enforcement feature;
        # unit tests still validate scope mismatch behaviour without pretending
        # SQLite can enforce PostgreSQL policies.
        if dialect_name != "postgresql":
            if settings.is_test:
                logger.debug("RLS SQL context skipped for test dialect=%s", dialect_name)
                return current_user
            raise RLSContextError(
                f"RLS requires PostgreSQL; active dialect is {dialect_name}"
            )

        await db.execute(
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
                "user_id": user_id,
                "tenant_id": tenant_id,
                "institution_id": institution_id,
                "role": role,
            },
        )

        logger.debug(
            "Trusted RLS context established: user=%s tenant=%s institution=%s role=%s",
            user_id,
            tenant_id,
            institution_id or "<none>",
            role,
        )
        return current_user

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "RLS context setup failed; request blocked: user=%s tenant=%s error=%s",
            user_id,
            tenant_id,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Le contexte de sécurité des données n'a pas pu être établi.",
        ) from exc


class RLSMiddleware:
    """Legacy ASGI compatibility shim.

    RLS must be attached as a FastAPI dependency so it shares the exact same
    ``AsyncSession``/transaction as the endpoint query. The shim intentionally
    performs no database work.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        await self.app(scope, receive, send)
