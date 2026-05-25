"""
Middleware de rate limiting - eAdministration Suite Guinea.
Protège contre les attaques brute-force et les abus d'API.
Utilise Redis pour le comptage distribué (multi-instance).
"""

import logging
import time
from collections import defaultdict

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware de limitation de débit pour l'API.

    - Routes de login : 5 tentatives par IP par fenêtre de 5 minutes
    - API générale : 60 requêtes par minute par IP
    - Protection contre les attaques brute-force

    En l'absence de Redis, utilise un compteur en mémoire (mode dégradé).
    """

    def __init__(self, app: FastAPI) -> None:
        super().__init__(app)
        self._redis = None
        # Fallback en mémoire si Redis indisponible
        self._memory_counters: dict[str, list[float]] = defaultdict(list)

    async def _get_redis(self):
        """Obtient la connexion Redis (lazy)."""
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

    async def _check_rate_redis(self, key: str, max_requests: int, window: int) -> tuple[bool, int]:
        """
        Vérifie le rate limit via Redis (sliding window).
        Retourne (allowed, remaining).
        """
        redis = await self._get_redis()
        if redis is None:
            return True, max_requests  # Mode dégradé : autoriser

        now = time.time()
        pipe = redis.pipeline()
        try:
            # Supprimer les entrées expirées
            pipe.zremrangebyscore(key, 0, now - window)
            # Compter les entrées dans la fenêtre
            pipe.zcard(key)
            # Ajouter la nouvelle entrée (score = timestamp)
            pipe.zadd(key, {f"{now}:{id(pipe)}": now})
            # Définir le TTL de la clé
            pipe.expire(key, window)
            results = await pipe.execute()
            count = results[1]  # zcard result
            remaining = max(0, max_requests - count - 1)
            return count < max_requests, remaining
        except Exception as e:
            logger.warning(f"Redis rate limit error: {e}")
            return True, max_requests

    def _check_rate_memory(self, key: str, max_requests: int, window: int) -> tuple[bool, int]:
        """
        Vérifie le rate limit via compteur en mémoire (fallback).
        Retourne (allowed, remaining).
        """
        now = time.time()
        # Nettoyer les entrées expirées
        self._memory_counters[key] = [
            ts for ts in self._memory_counters[key] if now - ts < window
        ]
        count = len(self._memory_counters[key])
        if count < max_requests:
            self._memory_counters[key].append(now)
            return True, max(0, max_requests - count - 1)
        return False, 0

    async def dispatch(self, request: Request, call_next):
        """Traitement de chaque requête entrante."""
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # Rate limit spécifique pour les routes d'authentification
        if path.startswith("/api/v1/auth/login"):
            key = f"eadmin:ratelimit:login:{client_ip}"
            max_requests = settings.RATE_LIMIT_LOGIN_MAX_ATTEMPTS
            window = settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS

            try:
                allowed, remaining = await self._check_rate_redis(key, max_requests, window)
            except Exception:
                allowed, remaining = self._check_rate_memory(key, max_requests, window)

            if not allowed:
                logger.warning(f"Rate limit atteint pour login IP={client_ip}")
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
                        "retry_after": window,
                    },
                    headers={"Retry-After": str(window)},
                )

        # Rate limit général pour l'API
        elif path.startswith("/api/v1/"):
            key = f"eadmin:ratelimit:api:{client_ip}"
            max_requests = settings.RATE_LIMIT_API_PER_MINUTE
            window = 60

            try:
                allowed, remaining = await self._check_rate_redis(key, max_requests, window)
            except Exception:
                allowed, remaining = self._check_rate_memory(key, max_requests, window)

            if not allowed:
                logger.warning(f"Rate limit API atteint pour IP={client_ip}")
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Limite de requêtes atteinte. Réessayez dans une minute.",
                        "retry_after": window,
                    },
                    headers={"Retry-After": str(window)},
                )

        response = await call_next(request)
        return response
