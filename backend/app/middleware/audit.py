"""
Audit Middleware - eAdministration Suite Guinea.
Journalisation automatique des requêtes API pour la traçabilité.
Utilise le service AuditService pour la chaîne de hachage d'intégrité.
"""

import asyncio
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Journalise automatiquement les accès API pour la traçabilité.

    Enregistre : qui, quoi, quand, d'où, et combien de temps.
    Utilise le service AuditService avec chaîne de hachage pour l'intégrité.

    Seules les opérations d'écriture (POST, PUT, PATCH, DELETE) et les
    lectures sensibles (export, download) sont journalisées pour éviter
    la pollution du journal.
    """

    # Chemins à exclure de la journalisation d'audit
    EXCLUDED_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next):
        # Ignorer les chemins non-API et exclus
        if (not request.url.path.startswith("/api/") or
            request.url.path in self.EXCLUDED_PATHS):
            return await call_next(request)

        start_time = time.time()
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Ajouter l'ID de requête à la réponse
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        duration_ms = int((time.time() - start_time) * 1000)

        # Journaliser l'accès (async, non-bloquant)
        try:
            # Extraire les infos utilisateur du JWT si présent
            user_id = None
            tenant_id = None
            institution_id = None
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                try:
                    from jose import jwt
                    from app.config import settings
                    token = auth_header[7:]
                    payload = jwt.decode(
                        token, settings.SECRET_KEY,
                        algorithms=[settings.ALGORITHM],
                        options={"verify_exp": False}
                    )
                    user_id = payload.get("sub")
                    tenant_id = payload.get("tenant_id")
                    institution_id = payload.get("institution_id")
                except Exception:
                    pass

            # Récupérer le tenant_id depuis request.state (défini par TenantResolutionMiddleware)
            if not tenant_id and hasattr(request.state, 'tenant_id'):
                tenant_id = request.state.tenant_id
            if not institution_id and hasattr(request.state, 'institution_id'):
                institution_id = request.state.institution_id

            # Ne journaliser que les opérations d'écriture et les lectures sensibles
            method = request.method
            should_log = method in ("POST", "PUT", "PATCH", "DELETE") or \
                        "export" in request.url.path.lower() or \
                        "download" in request.url.path.lower()

            if should_log and user_id:
                async def log_audit():
                    """Tâche asynchrone pour journaliser sans bloquer la réponse."""
                    try:
                        from app.database import async_session_factory
                        from app.services.audit_service import AuditService
                        from app.config import settings as app_settings

                        async with async_session_factory() as session:
                            audit_service = AuditService(session)

                            # Déterminer l'action à partir de la méthode HTTP
                            action_map = {
                                "POST": "CREATE",
                                "PUT": "UPDATE",
                                "PATCH": "UPDATE",
                                "DELETE": "DELETE",
                            }
                            action = action_map.get(method, method)

                            # Si c'est un export ou download, ajuster l'action
                            if "export" in request.url.path.lower():
                                action = "DATA_EXPORT"
                            elif "download" in request.url.path.lower():
                                action = "DOWNLOAD"

                            # Extraire le type de ressource depuis le chemin
                            path_parts = request.url.path.split("/")
                            resource_type = path_parts[3] if len(path_parts) > 3 else "unknown"
                            resource_id = path_parts[-1] if len(path_parts) > 1 else request_id

                            await audit_service.log_action(
                                user_id=uuid.UUID(user_id) if user_id else None,
                                action=action,
                                resource_type=resource_type,
                                resource_id=resource_id,
                                category="system",
                                details={
                                    "method": method,
                                    "path": str(request.url.path),
                                    "status_code": response.status_code,
                                    "duration_ms": duration_ms,
                                },
                                severity="warning" if response.status_code >= 400 else "info",
                                ip_address=request.client.host if request.client else "unknown",
                                user_agent=request.headers.get("User-Agent", "")[:512],
                                tenant_id=tenant_id,
                                institution_id=institution_id,
                            )
                            await session.commit()
                    except Exception as e:
                        # Ne jamais bloquer la requête à cause d'un échec d'audit
                        import logging
                        logging.getLogger("eadmin.audit").warning(
                            f"Échec de la journalisation d'audit: {e}"
                        )

                asyncio.create_task(log_audit())
        except Exception:
            # Ne jamais bloquer la requête
            pass

        return response
