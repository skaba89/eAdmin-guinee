"""
Middleware d'en-têtes de sécurité - eAdministration Suite Guinea.
Ajoute des en-têtes de sécurité à toutes les réponses selon les recommandations OWASP.

Fonctionnalités :
- CSP avec nonce (sans unsafe-inline/unsafe-eval en production)
- Configuration par environnement (strict en production, permissif en dev)
- En-têtes Cross-Origin (COOP, CORP)
- HSTS en production
- Cache-Control pour les réponses API
"""

import secrets
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Ajoute les en-têtes de sécurité HTTP à toutes les réponses."""

    async def dispatch(self, request: Request, call_next):
        nonce = secrets.token_urlsafe(24)
        request.state.csp_nonce = nonce

        response: Response = await call_next(request)

        response.headers["Content-Security-Policy"] = self._build_csp(nonce)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Privacy-first default: browser geolocation is not required by the core
        # administration application and must be explicitly introduced by a
        # reviewed feature before being granted to any origin.
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        response.headers["X-Admin-Guinee"] = "eAdministration-Suite-Guinea"
        return response

    def _build_csp(self, nonce: str) -> str:
        if settings.is_production:
            connect_src = (
                "connect-src 'self' "
                "https://eadmin.gouv.gn https://admin.eadmin.gouv.gn "
                "https://citoyen.eadmin.gouv.gn https://api.eadmin.gouv.gn"
            )
            return (
                "default-src 'self'; "
                f"script-src 'self' 'nonce-{nonce}'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: blob:; "
                f"{connect_src}; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )

        connect_src = (
            "connect-src 'self' "
            "http://localhost:3000 http://localhost:3001 http://localhost:8000 "
            "http://127.0.0.1:3000 http://127.0.0.1:3001 "
            "ws://localhost:3000 ws://localhost:3001"
        )
        return (
            "default-src 'self'; "
            f"script-src 'self' 'nonce-{nonce}' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            f"{connect_src}; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
