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
    """
    Ajoute des en-têtes de sécurité HTTP à toutes les réponses.

    En production :
    - CSP strict avec nonce (pas d'unsafe-inline/unsafe-eval)
    - HSTS avec preload
    - Connect-src limité aux domaines de production

    En développement :
    - CSP permissif (nonce + unsafe-inline pour le hot-reload)
    - Connect-src inclut localhost
    - Pas de HSTS
    """

    async def dispatch(self, request: Request, call_next):
        # Générer un nonce CSP unique pour cette requête
        nonce = secrets.token_urlsafe(24)
        # Stocker le nonce dans request.state pour que les templates puissent l'utiliser
        request.state.csp_nonce = nonce

        response: Response = await call_next(request)

        # --- Content Security Policy ---
        response.headers["Content-Security-Policy"] = self._build_csp(nonce)

        # --- Protection contre le clickjacking ---
        response.headers["X-Frame-Options"] = "DENY"

        # --- Prévention du sniffing MIME ---
        response.headers["X-Content-Type-Options"] = "nosniff"

        # --- Protection XSS (legacy, utile pour les anciens navigateurs) ---
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # --- Politique de référent ---
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # --- Politique de permissions ---
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(self), payment=()"
        )

        # --- Cross-Origin policies ---
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"

        # --- Politique de domaine croisé ---
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

        # --- HSTS en production uniquement ---
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # --- Cache-Control pour les réponses API ---
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate"
            )
            response.headers["Pragma"] = "no-cache"

        # --- En-tête d'identification du serveur (interne) ---
        response.headers["X-Admin-Guinee"] = "eAdministration-Suite-Guinea"

        return response

    def _build_csp(self, nonce: str) -> str:
        """
        Construit la politique Content-Security-Policy adaptée à l'environnement.

        En production : CSP strict avec nonce uniquement.
        En développement : CSP permissif avec nonce + unsafe-inline (pour hot-reload).
        """
        if settings.is_production:
            # CSP strict en production — nonce uniquement, pas d'unsafe-*
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
        else:
            # CSP permissif en développement — nonce + unsafe-inline pour le hot-reload
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
