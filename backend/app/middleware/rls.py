"""
Row-Level Security middleware et dépendance - eAdministration Suite Guinea.
Définit le contexte utilisateur pour les politiques RLS PostgreSQL.
Lit l'utilisateur depuis request.state.user (défini par get_current_user)
au lieu de décoder le JWT une deuxième fois.
Définit les variables de session PostgreSQL : app.current_user_id, app.current_tenant_id, app.current_institution_id.
Utilise la session de base de données du scope de la requête.
"""

import logging

from fastapi import Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.api.auth import get_current_user
from app.config import settings

logger = logging.getLogger("eadmin.rls")


async def set_rls_context(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dépendance FastAPI qui définit le contexte RLS PostgreSQL pour la requête courante.

    Lit l'utilisateur depuis request.state.user (défini par get_current_user)
    au lieu de décoder le JWT une deuxième fois.

    Définit les variables de session PostgreSQL suivantes :
    - app.current_user_id : UUID de l'utilisateur authentifié
    - app.current_tenant_id : Identifiant du tenant pour l'isolation multi-tenant
    - app.current_institution_id : Identifiant de l'institution pour le filtrage RLS

    Ces variables sont utilisées par les politiques RLS PostgreSQL pour filtrer
    les données selon le contexte de l'utilisateur.

    Usage:
        @router.get("/", dependencies=[Depends(set_rls_context)])
        async def my_route(...):
            ...

    Args:
        request: Requête HTTP courante (contient request.state.user)
        current_user: Utilisateur authentifié (injecté par get_current_user)
        db: Session de base de données du scope de la requête

    Returns:
        L'utilisateur authentifié (pour chaînage de dépendances)
    """
    user_id = str(current_user.id)
    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID
    institution_id = current_user.institution_id or ""

    try:
        # Définir les variables de session PostgreSQL pour les politiques RLS
        # Utilise la session de base de données du scope de la requête
        await db.execute(
            text("SET LOCAL app.current_user_id = :user_id"),
            {"user_id": user_id}
        )
        await db.execute(
            text("SET LOCAL app.current_tenant_id = :tenant_id"),
            {"tenant_id": tenant_id}
        )
        await db.execute(
            text("SET LOCAL app.current_institution_id = :institution_id"),
            {"institution_id": institution_id}
        )

        logger.debug(
            f"Contexte RLS défini: user_id={user_id}, "
            f"tenant_id={tenant_id}, institution_id={institution_id}"
        )
    except Exception as e:
        # Ne pas bloquer la requête si la configuration RLS échoue
        logger.warning(
            f"Impossible de définir le contexte RLS: {e}. "
            f"user_id={user_id}, tenant_id={tenant_id}"
        )

    return current_user


class RLSMiddleware:
    """
    Middleware RLS legacy — conservé pour compatibilité descendante.

    NOTE: Ce middleware est remplacé par la dépendance set_rls_context()
    qui est plus robuste car elle :
    - Lit l'utilisateur depuis request.state.user au lieu de décoder le JWT
    - Utilise la session de base de données du scope de la requête
    - Définit les 3 variables RLS (user_id, tenant_id, institution_id)

    Pour les nouvelles routes, utilisez:
        dependencies=[Depends(set_rls_context)]
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        """
        ASGI3 middleware — ne fait rien, le contexte RLS est maintenant
        géré par la dépendance set_rls_context().
        """
        await self.app(scope, receive, send)
