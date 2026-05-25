"""
Audit Middleware - eAdministration Suite Guinea.
Automatically logs API requests for audit trail.
"""

import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Automatically logs API access for audit trail.
    Records: who, what, when, from where, and how long.
    """

    # Paths to exclude from audit logging (health checks, docs, etc.)
    EXCLUDED_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next):
        # Skip non-API and excluded paths
        if (not request.url.path.startswith("/api/") or
            request.url.path in self.EXCLUDED_PATHS):
            return await call_next(request)

        start_time = time.time()
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Add request ID to response
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        duration_ms = int((time.time() - start_time) * 1000)

        # Log the access (async, non-blocking)
        # We'll import here to avoid circular imports
        try:
            import asyncio
            from app.database import async_session_factory
            from app.models.audit import AuditLog
            from datetime import datetime, timezone

            # Extract user info from JWT if present
            user_id = None
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                try:
                    from jose import jwt
                    from app.config import settings
                    token = auth_header[7:]
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                    user_id = payload.get("sub")
                except Exception:
                    pass

            # Only log write operations and sensitive reads
            method = request.method
            should_log = method in ("POST", "PUT", "PATCH", "DELETE") or \
                        "export" in request.url.path.lower() or \
                        "download" in request.url.path.lower()

            if should_log and user_id:
                async def log_audit():
                    try:
                        async with async_session_factory() as session:
                            audit = AuditLog(
                                user_id=uuid.UUID(user_id) if user_id else None,
                                action=f"{method}_{request.url.path.split('/')[-1]}".upper(),
                                resource_type=request.url.path.split("/")[3] if len(request.url.path.split("/")) > 3 else "unknown",
                                resource_id=request_id,
                                details={
                                    "method": method,
                                    "path": str(request.url.path),
                                    "status_code": response.status_code,
                                    "duration_ms": duration_ms,
                                    "user_agent": request.headers.get("User-Agent", "")[:512],
                                },
                                ip_address=request.client.host if request.client else "unknown",
                            )
                            session.add(audit)
                            await session.commit()
                    except Exception:
                        pass  # Never block the request due to audit logging failure

                asyncio.create_task(log_audit())
        except Exception:
            pass  # Never block the request

        return response
