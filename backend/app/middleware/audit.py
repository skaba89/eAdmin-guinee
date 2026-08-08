"""
Audit Middleware - eAdministration Suite Guinea.
Journalisation automatique des requêtes API pour la traçabilité.
Utilise le service AuditService pour la chaîne de hachage d'intégrité.
"""

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings
from app.database import async_session_factory as _default_audit_session_factory
from app.services.audit_service import AuditService

logger = logging.getLogger("eadmin.audit")

# Test seam: production keeps the real factory; isolated tests can substitute a
# transaction-local factory without touching the process-global asyncpg pool.
audit_session_factory = _default_audit_session_factory


class AuditMiddleware(BaseHTTPMiddleware):
    """Journalise les écritures et lectures sensibles avant de terminer la requête.

    For government traceability the write is awaited deliberately. The previous
    fire-and-forget task could be cancelled during process shutdown and could
    therefore lose an audit event after the business response had succeeded.
    Audit failures remain non-blocking for business availability, but they are
    logged synchronously so the failure is observable.
    """

    EXCLUDED_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}

    async def _persist_audit_event(
        self,
        *,
        request: Request,
        response: Response,
        request_id: str,
        duration_ms: int,
        user_id: str,
        tenant_id: str | None,
        institution_id: str | None,
    ) -> None:
        """Persist one access event using the configured audit session factory."""
        method = request.method
        action_map = {
            "POST": "CREATE",
            "PUT": "UPDATE",
            "PATCH": "UPDATE",
            "DELETE": "DELETE",
        }
        action = action_map.get(method, method)

        path_lower = request.url.path.lower()
        if "export" in path_lower:
            action = "DATA_EXPORT"
        elif "download" in path_lower:
            action = "DOWNLOAD"

        path_parts = request.url.path.split("/")
        resource_type = path_parts[3] if len(path_parts) > 3 else "unknown"
        resource_id = path_parts[-1] if len(path_parts) > 1 else request_id

        async with audit_session_factory() as session:
            audit_service = AuditService(session)
            await audit_service.log_action(
                user_id=uuid.UUID(user_id),
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

    async def dispatch(self, request: Request, call_next):
        if (
            not request.url.path.startswith("/api/")
            or request.url.path in self.EXCLUDED_PATHS
        ):
            return await call_next(request)

        start_time = time.time()
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        duration_ms = int((time.time() - start_time) * 1000)

        try:
            user_id = None
            tenant_id = None
            institution_id = None
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                try:
                    from jose import jwt

                    payload = jwt.decode(
                        auth_header[7:],
                        settings.SECRET_KEY,
                        algorithms=[settings.ALGORITHM],
                        options={"verify_exp": False},
                    )
                    user_id = payload.get("sub")
                    tenant_id = payload.get("tenant_id")
                    institution_id = payload.get("institution_id")
                except Exception:
                    pass

            if not tenant_id and hasattr(request.state, "tenant_id"):
                tenant_id = request.state.tenant_id
            if not institution_id and hasattr(request.state, "institution_id"):
                institution_id = request.state.institution_id

            method = request.method
            path_lower = request.url.path.lower()
            should_log = (
                method in ("POST", "PUT", "PATCH", "DELETE")
                or "export" in path_lower
                or "download" in path_lower
            )

            if should_log and user_id:
                try:
                    await self._persist_audit_event(
                        request=request,
                        response=response,
                        request_id=request_id,
                        duration_ms=duration_ms,
                        user_id=user_id,
                        tenant_id=tenant_id,
                        institution_id=institution_id,
                    )
                except Exception as exc:
                    logger.warning("Échec de la journalisation d'audit: %s", exc)
        except Exception:
            # The audit layer must never make the administration endpoint unavailable.
            pass

        return response
