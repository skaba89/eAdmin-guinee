"""
Middleware de résolution de tenant - eAdministration Suite Guinea.
Résout le tenant à partir de : 1) en-tête X-Tenant-ID, 2) sous-domaine, 3) claims JWT.
Définit request.state.tenant_id et request.state.institution_id.
Par défaut, utilise le tenant "republique-de-guinee" si non spécifié.
Vérifie que le tenant existe et est actif.
"""

import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings

logger = logging.getLogger("eadmin.tenant")


class TenantResolutionMiddleware(BaseHTTPMiddleware):
    """
    Middleware de résolution du tenant pour l'isolation multi-tenant.

    Ordre de résolution du tenant_id :
    1. En-tête HTTP X-Tenant-ID (priorité la plus haute)
    2. Sous-domaine de la requête (ex: justice.eadmin.gouv.gn → "justice")
    3. Claims JWT (tenant_id dans le payload du token)
    4. Valeur par défaut : settings.TENANT_DEFAULT_ID

    Ordre de résolution de l'institution_id :
    1. En-tête HTTP X-Institution-ID
    2. Claims JWT (institution_id dans le payload du token)
    3. Vide (pas de filtrage institutionnel)

    Après résolution, les valeurs sont stockées dans request.state :
    - request.state.tenant_id
    - request.state.institution_id

    Le tenant est validé contre la base de données pour s'assurer qu'il
    existe et est actif. Si le tenant est invalide, une erreur 400 est retournée.
    """

    # Chemins exemptés de la résolution de tenant
    EXCLUDED_PATHS = {"/health", "/docs", "/redoc", "/openapi.json", "/metrics"}

    async def dispatch(self, request: Request, call_next):
        # Ne pas résoudre le tenant pour les chemins exclus
        if request.url.path in self.EXCLUDED_PATHS or not request.url.path.startswith("/api/"):
            request.state.tenant_id = settings.TENANT_DEFAULT_ID
            request.state.institution_id = ""
            return await call_next(request)

        # ================================================================
        # 1. Résolution du tenant_id
        # ================================================================
        tenant_id = None

        # a) En-tête X-Tenant-ID (priorité la plus haute)
        tenant_id = request.headers.get("X-Tenant-ID")

        # b) Sous-domaine (si pas d'en-tête)
        if not tenant_id:
            tenant_id = self._resolve_from_subdomain(request)

        # c) Claims JWT (si pas d'en-tête ni sous-domaine)
        if not tenant_id:
            tenant_id = self._resolve_from_jwt(request)

        # d) Valeur par défaut
        if not tenant_id:
            tenant_id = settings.TENANT_DEFAULT_ID

        # ================================================================
        # 2. Résolution de l'institution_id
        # ================================================================
        institution_id = None

        # a) En-tête X-Institution-ID
        institution_id = request.headers.get("X-Institution-ID")

        # b) Claims JWT
        if not institution_id:
            institution_id = self._resolve_institution_from_jwt(request)

        # Valeur par défaut
        if not institution_id:
            institution_id = ""

        # ================================================================
        # 3. Validation du tenant
        # ================================================================
        try:
            is_valid = await self._validate_tenant(tenant_id)
            if not is_valid:
                logger.warning(
                    f"Tenant invalide ou inactif: {tenant_id} "
                    f"(IP: {request.client.host if request.client else 'unknown'}, "
                    f"path: {request.url.path})"
                )
                return JSONResponse(
                    status_code=400,
                    content={
                        "detail": f"Tenant '{tenant_id}' invalide ou inactif.",
                        "code": "INVALID_TENANT",
                    },
                )
        except Exception as e:
            # En cas d'erreur de validation (ex: DB indisponible),
            # on accepte le tenant par défaut pour ne pas bloquer l'application
            logger.warning(
                f"Impossible de valider le tenant {tenant_id}: {e}. "
                f"Utilisation du tenant par défaut."
            )
            if tenant_id != settings.TENANT_DEFAULT_ID:
                tenant_id = settings.TENANT_DEFAULT_ID

        # ================================================================
        # 4. Stockage dans request.state
        # ================================================================
        request.state.tenant_id = tenant_id
        request.state.institution_id = institution_id

        logger.debug(
            f"Tenant résolu: tenant_id={tenant_id}, institution_id={institution_id} "
            f"(path: {request.url.path})"
        )

        return await call_next(request)

    def _resolve_from_subdomain(self, request: Request) -> str | None:
        """
        Résout le tenant à partir du sous-domaine de la requête.

        Exemples :
        - justice.eadmin.gouv.gn → "justice"
        - conakry.eadmin.gouv.gn → "mairie-conakry"

        Seuls les domaines connus sont résolus.
        """
        host = request.headers.get("host", "")
        if not host:
            return None

        # Nettoyer le host (retirer le port)
        hostname = host.split(":")[0].lower()

        # Mapping de sous-domaines connus vers des tenant_id
        subdomain_mapping = {
            "eadmin.gouv.gn": settings.TENANT_DEFAULT_ID,
            "admin.eadmin.gouv.gn": settings.TENANT_DEFAULT_ID,
            "citoyen.eadmin.gouv.gn": settings.TENANT_DEFAULT_ID,
            "api.eadmin.gouv.gn": settings.TENANT_DEFAULT_ID,
        }

        # Vérifier si le hostname correspond à un domaine connu
        if hostname in subdomain_mapping:
            return subdomain_mapping[hostname]

        # Extraire le sous-domaine (partie avant le premier domaine connu)
        for domain in [".eadmin.gouv.gn", ".gouv.gn"]:
            if hostname.endswith(domain):
                subdomain = hostname[:-len(domain)]
                if subdomain and subdomain != "www":
                    return subdomain

        return None

    def _resolve_from_jwt(self, request: Request) -> str | None:
        """
        Résout le tenant à partir des claims JWT de l'en-tête Authorization.

        Extrait le tenant_id du payload sans vérification d'expiration
        (la vérification complète est faite par get_current_user).
        """
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        try:
            from jose import jwt
            token = auth_header[7:]
            # Décoder sans vérification d'expiration (juste pour lire les claims)
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_exp": False}
            )
            return payload.get("tenant_id")
        except Exception:
            return None

    def _resolve_institution_from_jwt(self, request: Request) -> str | None:
        """
        Résout l'institution à partir des claims JWT.
        """
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        try:
            from jose import jwt
            token = auth_header[7:]
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_exp": False}
            )
            return payload.get("institution_id")
        except Exception:
            return None

    async def _validate_tenant(self, tenant_id: str) -> bool:
        """
        Valide que le tenant existe et est actif en base de données.

        Returns:
            True si le tenant est valide et actif, False sinon.
        """
        try:
            from app.database import async_session_factory
            from app.models.tenant import Tenant
            from sqlalchemy import select

            async with async_session_factory() as session:
                result = await session.execute(
                    select(Tenant).where(
                        Tenant.id == tenant_id,
                        Tenant.is_active == True,  # noqa: E712
                    )
                )
                tenant = result.scalar_one_or_none()
                return tenant is not None
        except Exception as e:
            logger.warning(f"Erreur lors de la validation du tenant: {e}")
            # En cas d'erreur DB, accepter le tenant par défaut
            if tenant_id == settings.TENANT_DEFAULT_ID:
                return True
            raise
