"""
Middleware de rate limiting - eAdministration Suite Guinea.
Protège contre les attaques brute-force et les abus d'API.
Utilise Redis pour le comptage distribué (multi-instance).

Fonctionnalités :
- Limitation par IP pour les endpoints publics (login, register)
- Limitation par utilisateur (user_id JWT) pour les endpoints authentifiés
- En-têtes X-RateLimit-* pour la transparence
- Fallback en mémoire si Redis indisponible
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
    """
    Extrait l'identifiant utilisateur depuis le jeton JWT de l'en-tête Authorization.

    Retourne None si le token est absent ou invalide (requête non authentifiée).
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
            options={"verify_exp": False},  # On veut juste le sub, pas vérifier l'expiration ici
        )
        user_id: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")
        if user_id and token_type == "access":
            return user_id
    except Exception:
        pass
    return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware de limitation de débit pour l'API eAdmin Guinée.

    Endpoints protégés :
    - /api/v1/auth/login       : 5 tentatives par IP / 5 min
    - /api/v1/auth/register    : 3 inscriptions par IP / heure
    - /api/v1/auth/change-password : 5 par utilisateur / 15 min
    - /api/v1/security/verify-mfa  : 5 par utilisateur / 5 min
    - /api/v1/ai/*             : 20 par utilisateur / min
    - /api/v1/documents/upload : 10 par utilisateur / min
    - API générale             : 60 requêtes par minute par IP

    En-têtes de réponse :
    - X-RateLimit-Limit     : nombre maximal de requêtes dans la fenêtre
    - X-RateLimit-Remaining : nombre de requêtes restantes
    - X-RateLimit-Reset     : timestamp UNIX de fin de fenêtre

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

    async def _check_rate_redis(
        self, key: str, max_requests: int, window: int
    ) -> tuple[bool, int, int]:
        """
        Vérifie le rate limit via Redis (sliding window).

        Retourne (allowed, remaining, reset_timestamp).
        """
        redis = await self._get_redis()
        if redis is None:
            return True, max_requests, int(time.time() + window)  # Mode dégradé

        now = time.time()
        reset_ts = int(now + window)
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
            return count < max_requests, remaining, reset_ts
        except Exception as e:
            logger.warning(f"Erreur Redis rate limit: {e}")
            return True, max_requests, reset_ts

    def _check_rate_memory(
        self, key: str, max_requests: int, window: int
    ) -> tuple[bool, int, int]:
        """
        Vérifie le rate limit via compteur en mémoire (fallback).

        Retourne (allowed, remaining, reset_timestamp).
        """
        now = time.time()
        reset_ts = int(now + window)
        # Nettoyer les entrées expirées
        self._memory_counters[key] = [
            ts for ts in self._memory_counters[key] if now - ts < window
        ]
        count = len(self._memory_counters[key])
        if count < max_requests:
            self._memory_counters[key].append(now)
            return True, max(0, max_requests - count - 1), reset_ts
        return False, 0, reset_ts

    async def _check_rate(
        self, key: str, max_requests: int, window: int
    ) -> tuple[bool, int, int]:
        """
        Vérifie le rate limit (Redis avec fallback mémoire).

        Retourne (allowed, remaining, reset_timestamp).
        """
        try:
            return await self._check_rate_redis(key, max_requests, window)
        except Exception:
            return self._check_rate_memory(key, max_requests, window)

    def _add_rate_limit_headers(
        self,
        response: JSONResponse,
        max_requests: int,
        remaining: int,
        reset_ts: int,
    ) -> None:
        """Ajoute les en-têtes X-RateLimit-* à la réponse."""
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
        """Construit une réponse 429 avec en-têtes de rate limit."""
        response = JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": detail,
                "retry_after": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )
        self._add_rate_limit_headers(response, max_requests, remaining, reset_ts)
        return response

    async def dispatch(self, request: Request, call_next):
        """Traitement de chaque requête entrante."""
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        user_id = _extract_user_id(request)

        # Contourner le health check
        if path in ("/health", "/api/v1/health", "/metrics"):
            return await call_next(request)

        # ----------------------------------------------------------------
        # 1. Login : 5 tentatives par IP / 5 minutes
        # ----------------------------------------------------------------
        if path.startswith("/api/v1/auth/login"):
            key = f"eadmin:ratelimit:login:{client_ip}"
            max_requests = settings.RATE_LIMIT_LOGIN_MAX_ATTEMPTS
            window = settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS

            allowed, remaining, reset_ts = await self._check_rate(key, max_requests, window)

            if not allowed:
                logger.warning(
                    f"Rate limit login atteint pour IP={client_ip}"
                )
                return self._build_429_response(
                    detail="Trop de tentatives de connexion. Réessayez dans quelques minutes.",
                    retry_after=window,
                    max_requests=max_requests,
                    remaining=remaining,
                    reset_ts=reset_ts,
                )

            response = await call_next(request)
            self._add_rate_limit_headers(response, max_requests, remaining, reset_ts)
            return response

        # ----------------------------------------------------------------
        # 2. Register : 3 inscriptions par IP / heure
        # ----------------------------------------------------------------
        if path.startswith("/api/v1/auth/register"):
            key = f"eadmin:ratelimit:register:{client_ip}"
            max_requests = settings.RATE_LIMIT_REGISTER_MAX_ATTEMPTS
            window = settings.RATE_LIMIT_REGISTER_WINDOW_SECONDS

            allowed, remaining, reset_ts = await self._check_rate(key, max_requests, window)

            if not allowed:
                logger.warning(
                    f"Rate limit register atteint pour IP={client_ip}"
                )
                return self._build_429_response(
                    detail="Trop de tentatives d'inscription. Réessayez dans une heure.",
                    retry_after=window,
                    max_requests=max_requests,
                    remaining=remaining,
                    reset_ts=reset_ts,
                )

            response = await call_next(request)
            self._add_rate_limit_headers(response, max_requests, remaining, reset_ts)
            return response

        # ----------------------------------------------------------------
        # 3. Changement de mot de passe : 5 par utilisateur / 15 min
        # ----------------------------------------------------------------
        if path.startswith("/api/v1/auth/change-password") or path.startswith("/api/v1/security/change-password"):
            limit_key = user_id if user_id else client_ip
            key = f"eadmin:ratelimit:password:{limit_key}"
            max_requests = settings.RATE_LIMIT_PASSWORD_CHANGE_MAX
            window = settings.RATE_LIMIT_PASSWORD_CHANGE_WINDOW

            allowed, remaining, reset_ts = await self._check_rate(key, max_requests, window)

            if not allowed:
                logger.warning(
                    f"Rate limit changement mot de passe atteint pour {limit_key}"
                )
                return self._build_429_response(
                    detail="Trop de tentatives de changement de mot de passe. Réessayez dans 15 minutes.",
                    retry_after=window,
                    max_requests=max_requests,
                    remaining=remaining,
                    reset_ts=reset_ts,
                )

            response = await call_next(request)
            self._add_rate_limit_headers(response, max_requests, remaining, reset_ts)
            return response

        # ----------------------------------------------------------------
        # 4. Vérification MFA : 5 par utilisateur / 5 min
        # ----------------------------------------------------------------
        if path.startswith("/api/v1/security/verify-mfa") or path.startswith("/api/v1/auth/verify-mfa"):
            limit_key = user_id if user_id else client_ip
            key = f"eadmin:ratelimit:mfa:{limit_key}"
            max_requests = settings.RATE_LIMIT_MFA_MAX
            window = settings.RATE_LIMIT_MFA_WINDOW

            allowed, remaining, reset_ts = await self._check_rate(key, max_requests, window)

            if not allowed:
                logger.warning(
                    f"Rate limit vérification MFA atteint pour {limit_key}"
                )
                return self._build_429_response(
                    detail="Trop de tentatives de vérification MFA. Réessayez dans 5 minutes.",
                    retry_after=window,
                    max_requests=max_requests,
                    remaining=remaining,
                    reset_ts=reset_ts,
                )

            response = await call_next(request)
            self._add_rate_limit_headers(response, max_requests, remaining, reset_ts)
            return response

        # ----------------------------------------------------------------
        # 5. Endpoints IA : 20 par utilisateur / minute
        # ----------------------------------------------------------------
        if path.startswith("/api/v1/ai/"):
            limit_key = user_id if user_id else client_ip
            key = f"eadmin:ratelimit:ai:{limit_key}"
            max_requests = settings.RATE_LIMIT_AI_PER_MINUTE
            window = 60

            allowed, remaining, reset_ts = await self._check_rate(key, max_requests, window)

            if not allowed:
                logger.warning(
                    f"Rate limit IA atteint pour {limit_key}"
                )
                return self._build_429_response(
                    detail="Limite de requêtes IA atteinte. Réessayez dans une minute.",
                    retry_after=window,
                    max_requests=max_requests,
                    remaining=remaining,
                    reset_ts=reset_ts,
                )

            response = await call_next(request)
            self._add_rate_limit_headers(response, max_requests, remaining, reset_ts)
            return response

        # ----------------------------------------------------------------
        # 6. Upload de fichiers : 10 par utilisateur / minute
        # ----------------------------------------------------------------
        if path.startswith("/api/v1/documents/upload") or path.startswith("/api/v1/documents/") and request.method == "POST":
            limit_key = user_id if user_id else client_ip
            key = f"eadmin:ratelimit:upload:{limit_key}"
            max_requests = settings.RATE_LIMIT_UPLOAD_PER_MINUTE
            window = 60

            allowed, remaining, reset_ts = await self._check_rate(key, max_requests, window)

            if not allowed:
                logger.warning(
                    f"Rate limit upload atteint pour {limit_key}"
                )
                return self._build_429_response(
                    detail="Limite d'upload de fichiers atteinte. Réessayez dans une minute.",
                    retry_after=window,
                    max_requests=max_requests,
                    remaining=remaining,
                    reset_ts=reset_ts,
                )

            response = await call_next(request)
            self._add_rate_limit_headers(response, max_requests, remaining, reset_ts)
            return response

        # ----------------------------------------------------------------
        # 7. API générale : 60 requêtes par minute par IP
        # ----------------------------------------------------------------
        if path.startswith("/api/v1/"):
            key = f"eadmin:ratelimit:api:{client_ip}"
            max_requests = settings.RATE_LIMIT_API_PER_MINUTE
            window = 60

            allowed, remaining, reset_ts = await self._check_rate(key, max_requests, window)

            if not allowed:
                logger.warning(f"Rate limit API générale atteint pour IP={client_ip}")
                return self._build_429_response(
                    detail="Limite de requêtes atteinte. Réessayez dans une minute.",
                    retry_after=window,
                    max_requests=max_requests,
                    remaining=remaining,
                    reset_ts=reset_ts,
                )

            response = await call_next(request)
            self._add_rate_limit_headers(response, max_requests, remaining, reset_ts)
            return response

        # Requêtes hors API — pas de rate limiting
        return await call_next(request)
