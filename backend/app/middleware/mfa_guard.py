"""Global guard for MFA-pending access tokens.

A password-only login for an MFA-enabled account receives a short-lived access
JWT with ``mfa_required=true`` and ``mfa_verified=false``.  That token is only
allowed to reach the endpoints required to complete or cancel the MFA flow.
"""

import logging

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings

logger = logging.getLogger("eadmin.mfa_guard")


class MFAGuardMiddleware(BaseHTTPMiddleware):
    """Reject business API access while MFA verification is still pending."""

    MFA_PENDING_ALLOWED_PATHS = {
        "/api/v1/auth/me",
        "/api/v1/auth/verify-mfa",
        "/api/v1/auth/logout",
        # Compatibility with the legacy security router during migration.
        "/api/v1/security/verify-mfa",
    }

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/v1/"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return await call_next(request)

        token = auth_header[7:]
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
        except JWTError:
            # Authentication dependencies keep ownership of invalid-token errors.
            return await call_next(request)

        if payload.get("type") != "access":
            return await call_next(request)

        mfa_required = payload.get("mfa_required") is True
        mfa_verified = payload.get("mfa_verified") is True

        if mfa_required and not mfa_verified:
            if request.url.path not in self.MFA_PENDING_ALLOWED_PATHS:
                logger.warning(
                    "Blocked MFA-pending token: path=%s user=%s",
                    request.url.path,
                    payload.get("sub", "unknown"),
                )
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "Authentification multi-facteurs requise.",
                        "code": "MFA_REQUIRED",
                    },
                )

        return await call_next(request)
