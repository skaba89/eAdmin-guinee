"""Rate limiting middleware for eAdministration Suite Guinea.

Distributed counters use Redis. If Redis is unavailable, the middleware fails
open rather than making the whole public administration unavailable. Dedicated
account-lockout controls in the authentication layer remain independent.
"""

import logging
import time
from collections import defaultdict
from typing import Optional

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = logging.getLogger(__name__)


def _extract_user_id(request: Request) -> Optional[str]:
    """Read a user id from a valid access-token shape for rate-limit scoping."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    try:
        from jose import jwt

        payload = jwt.decode(
            auth_header[7:],
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False},
        )
        user_id: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")
        return user_id if user_id and token_type == "access" else None
    except Exception:
        return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Redis-backed sliding-window rate limiter with endpoint-specific limits."""

    def __init__(
        self,
        app: FastAPI,
        max_requests: int | None = None,
        window_seconds: int | None = None,
    ) -> None:
        super().__init__(app)
        self._redis = None
        self._memory_counters: dict[str, list[float]] = defaultdict(list)

        # Public attributes kept for direct middleware configuration/testing.
        # The application instance uses settings for its generic API limit when
        # no explicit values are supplied, preserving production behaviour.
        self.max_requests = 100 if max_requests is None else max_requests
        self.window_seconds = 60 if window_seconds is None else window_seconds
        self._custom_generic_limit = max_requests is not None or window_seconds is not None

    async def _get_redis(self):
        if self._redis is None:
            try:
                import redis.asyncio as aioredis

                self._redis = aioredis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=2,
                )
            except Exception:
                self._redis = None
        return self._redis

    async def _check_rate_redis(
        self,
        key: str,
        max_requests: int,
        window: int,
    ) -> tuple[bool, int, int]:
        redis = await self._get_redis()
        reset_ts = int(time.time() + window)
        if redis is None:
            return True, max_requests, reset_ts

        now = time.time()
        pipe = redis.pipeline()
        try:
            pipe.zremrangebyscore(key, 0, now - window)
            pipe.zcard(key)
            pipe.zadd(key, {f"{now}:{id(pipe)}": now})
            pipe.expire(key, window)
            results = await pipe.execute()
            count = int(results[1])
            remaining = max(0, max_requests - count - 1)
            return count < max_requests, remaining, reset_ts
        except Exception as exc:
            logger.warning("Erreur Redis rate limit: %s", exc)
            return True, max_requests, reset_ts

    def _check_rate_memory(
        self,
        key: str,
        max_requests: int,
        window: int,
    ) -> tuple[bool, int, int]:
        now = time.time()
        reset_ts = int(now + window)
        self._memory_counters[key] = [
            timestamp
            for timestamp in self._memory_counters[key]
            if now - timestamp < window
        ]
        count = len(self._memory_counters[key])
        if count < max_requests:
            self._memory_counters[key].append(now)
            return True, max(0, max_requests - count - 1), reset_ts
        return False, 0, reset_ts

    async def _check_rate(
        self,
        key: str,
        max_requests: int,
        window: int,
    ) -> tuple[bool, int, int]:
        try:
            return await self._check_rate_redis(key, max_requests, window)
        except Exception:
            return self._check_rate_memory(key, max_requests, window)

    @staticmethod
    def _add_rate_limit_headers(
        response,
        max_requests: int,
        remaining: int,
        reset_ts: int,
    ) -> None:
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_ts)

    def _build_429_response(
        self,
        detail: str,
        retry_after: int,
        max_requests: int,
        remaining: int,
        reset_ts: int,
    ) -> JSONResponse:
        response = JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": detail, "retry_after": retry_after},
            headers={"Retry-After": str(retry_after)},
        )
        self._add_rate_limit_headers(response, max_requests, remaining, reset_ts)
        return response

    async def _limited_request(
        self,
        request: Request,
        call_next,
        *,
        key: str,
        max_requests: int,
        window: int,
        detail: str,
    ):
        allowed, remaining, reset_ts = await self._check_rate(
            key,
            max_requests,
            window,
        )
        if not allowed:
            logger.warning("Rate limit atteint pour key=%s", key)
            return self._build_429_response(
                detail=detail,
                retry_after=window,
                max_requests=max_requests,
                remaining=remaining,
                reset_ts=reset_ts,
            )

        response = await call_next(request)
        self._add_rate_limit_headers(response, max_requests, remaining, reset_ts)
        return response

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        user_id = _extract_user_id(request)

        if path in ("/health", "/api/v1/health", "/metrics"):
            return await call_next(request)

        if path.startswith("/api/v1/auth/login"):
            return await self._limited_request(
                request,
                call_next,
                key=f"eadmin:ratelimit:login:{client_ip}",
                max_requests=settings.RATE_LIMIT_LOGIN_MAX_ATTEMPTS,
                window=settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
                detail="Trop de tentatives de connexion. Réessayez dans quelques minutes.",
            )

        if path.startswith("/api/v1/auth/register"):
            return await self._limited_request(
                request,
                call_next,
                key=f"eadmin:ratelimit:register:{client_ip}",
                max_requests=settings.RATE_LIMIT_REGISTER_MAX_ATTEMPTS,
                window=settings.RATE_LIMIT_REGISTER_WINDOW_SECONDS,
                detail="Trop de tentatives d'inscription. Réessayez dans une heure.",
            )

        if path.startswith("/api/v1/auth/change-password") or path.startswith(
            "/api/v1/security/change-password"
        ):
            limit_key = user_id or client_ip
            return await self._limited_request(
                request,
                call_next,
                key=f"eadmin:ratelimit:password:{limit_key}",
                max_requests=settings.RATE_LIMIT_PASSWORD_CHANGE_MAX,
                window=settings.RATE_LIMIT_PASSWORD_CHANGE_WINDOW,
                detail="Trop de tentatives de changement de mot de passe. Réessayez dans 15 minutes.",
            )

        if path.startswith("/api/v1/security/verify-mfa") or path.startswith(
            "/api/v1/auth/verify-mfa"
        ):
            limit_key = user_id or client_ip
            return await self._limited_request(
                request,
                call_next,
                key=f"eadmin:ratelimit:mfa:{limit_key}",
                max_requests=settings.RATE_LIMIT_MFA_MAX,
                window=settings.RATE_LIMIT_MFA_WINDOW,
                detail="Trop de tentatives de vérification MFA. Réessayez dans 5 minutes.",
            )

        if path.startswith("/api/v1/ai/"):
            limit_key = user_id or client_ip
            return await self._limited_request(
                request,
                call_next,
                key=f"eadmin:ratelimit:ai:{limit_key}",
                max_requests=settings.RATE_LIMIT_AI_PER_MINUTE,
                window=60,
                detail="Limite de requêtes IA atteinte. Réessayez dans une minute.",
            )

        if path.startswith("/api/v1/documents/upload") or (
            path.startswith("/api/v1/documents/") and request.method == "POST"
        ):
            limit_key = user_id or client_ip
            return await self._limited_request(
                request,
                call_next,
                key=f"eadmin:ratelimit:upload:{limit_key}",
                max_requests=settings.RATE_LIMIT_UPLOAD_PER_MINUTE,
                window=60,
                detail="Limite d'upload de fichiers atteinte. Réessayez dans une minute.",
            )

        if path.startswith("/api/v1/"):
            if self._custom_generic_limit:
                max_requests = self.max_requests
                window = self.window_seconds
            else:
                max_requests = settings.RATE_LIMIT_API_PER_MINUTE
                window = 60

            return await self._limited_request(
                request,
                call_next,
                key=f"eadmin:ratelimit:api:{client_ip}",
                max_requests=max_requests,
                window=window,
                detail="Limite de requêtes atteinte. Réessayez dans une minute.",
            )

        return await call_next(request)
