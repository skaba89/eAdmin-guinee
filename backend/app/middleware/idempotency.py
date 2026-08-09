"""Redis-backed idempotency for reconnect-prone citizen mutations.

The middleware is deliberately narrow: it protects creation of service requests
when the client supplies an Idempotency-Key. It never caches authenticated GETs,
file uploads, signatures, IAM changes, or security operations.
"""

from __future__ import annotations

import base64
import hashlib
import json
import re
from typing import Any

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings
from app.services.token_blacklist import token_blacklist

_IDEMPOTENCY_HEADER = "Idempotency-Key"
_IDEMPOTENCY_PREFIX = "eadmin:idempotency:v1:"
_PROCESSING_TTL_SECONDS = 300
_COMPLETED_TTL_SECONDS = 24 * 60 * 60
_MAX_REPLAY_BODY_BYTES = 256 * 1024
_KEY_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{16,128}$")
_PROTECTED_PATHS = {
    "/api/v1/service-requests",
    "/api/v1/service-requests/",
}


def _decode_user_id(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(
            auth_header[7:],
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    subject = str(payload.get("sub") or "").strip()
    return subject or None


def _redis_key(user_id: str, idempotency_key: str) -> str:
    digest = hashlib.sha256(f"{user_id}:{idempotency_key}".encode("utf-8")).hexdigest()
    return f"{_IDEMPOTENCY_PREFIX}{digest}"


def _fingerprint(request: Request, user_id: str, body: bytes) -> str:
    material = b"\n".join(
        [
            request.method.encode("ascii"),
            request.url.path.encode("utf-8"),
            user_id.encode("utf-8"),
            body,
        ]
    )
    return hashlib.sha256(material).hexdigest()


def _json_bytes(payload: dict[str, Any]) -> str:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """Replay successful JSON responses for a repeated protected mutation."""

    async def _redis(self):
        return await token_blacklist._get_redis()

    async def dispatch(self, request: Request, call_next):
        if request.method != "POST" or request.url.path not in _PROTECTED_PATHS:
            return await call_next(request)

        key = request.headers.get(_IDEMPOTENCY_HEADER, "").strip()
        if not key:
            return await call_next(request)
        if not _KEY_PATTERN.fullmatch(key):
            return JSONResponse(
                status_code=400,
                content={
                    "detail": "Idempotency-Key invalide.",
                    "code": "INVALID_IDEMPOTENCY_KEY",
                },
            )

        user_id = _decode_user_id(request)
        if user_id is None:
            # Authentication remains authoritative. Invalid/anonymous bearer
            # requests are not inserted into the idempotency store.
            return await call_next(request)

        body = await request.body()
        fingerprint = _fingerprint(request, user_id, body)
        redis = await self._redis()
        redis_key = _redis_key(user_id, key)
        processing = _json_bytes({"state": "processing", "fingerprint": fingerprint})

        reserved = await redis.set(
            redis_key,
            processing,
            ex=_PROCESSING_TTL_SECONDS,
            nx=True,
        )

        if not reserved:
            existing_raw = await redis.get(redis_key)
            if isinstance(existing_raw, bytes):
                existing_raw = existing_raw.decode("utf-8", errors="replace")
            try:
                existing = json.loads(existing_raw or "{}")
            except (TypeError, ValueError):
                await redis.delete(redis_key)
                return JSONResponse(
                    status_code=503,
                    content={
                        "detail": "État d'idempotence temporairement invalide; réessayez.",
                        "code": "IDEMPOTENCY_STATE_INVALID",
                    },
                )

            if existing.get("fingerprint") != fingerprint:
                return JSONResponse(
                    status_code=409,
                    content={
                        "detail": "Cette clé d'idempotence a déjà été utilisée avec une autre requête.",
                        "code": "IDEMPOTENCY_KEY_REUSED",
                    },
                )

            if existing.get("state") == "completed":
                try:
                    replay_body = base64.b64decode(str(existing["body_b64"]), validate=True)
                    replay_status = int(existing["status_code"])
                except (KeyError, TypeError, ValueError):
                    await redis.delete(redis_key)
                    return JSONResponse(
                        status_code=503,
                        content={
                            "detail": "Réponse idempotente temporairement indisponible; réessayez.",
                            "code": "IDEMPOTENCY_REPLAY_INVALID",
                        },
                    )
                return Response(
                    content=replay_body,
                    status_code=replay_status,
                    media_type=str(existing.get("content_type") or "application/json"),
                    headers={
                        "Idempotency-Replayed": "true",
                        "Cache-Control": "no-store",
                    },
                )

            return JSONResponse(
                status_code=409,
                content={
                    "detail": "Une soumission identique est déjà en cours de traitement.",
                    "code": "IDEMPOTENCY_IN_PROGRESS",
                },
                headers={"Retry-After": "2"},
            )

        try:
            response = await call_next(request)
        except Exception:
            await redis.delete(redis_key)
            raise

        chunks = [chunk async for chunk in response.body_iterator]
        response_body = b"".join(chunks)
        response_headers = dict(response.headers)
        content_type = response.headers.get("content-type", "application/json").split(";", 1)[0]

        if (
            200 <= response.status_code < 300
            and content_type == "application/json"
            and len(response_body) <= _MAX_REPLAY_BODY_BYTES
        ):
            completed = _json_bytes(
                {
                    "state": "completed",
                    "fingerprint": fingerprint,
                    "status_code": response.status_code,
                    "content_type": content_type,
                    "body_b64": base64.b64encode(response_body).decode("ascii"),
                }
            )
            await redis.set(redis_key, completed, ex=_COMPLETED_TTL_SECONDS)
        else:
            # Only successful bounded JSON creation responses are replayable.
            await redis.delete(redis_key)

        response_headers["Idempotency-Key"] = key
        response_headers["Cache-Control"] = "no-store"
        return Response(
            content=response_body,
            status_code=response.status_code,
            headers=response_headers,
            media_type=content_type,
            background=response.background,
        )
