"""Bind signed JWTs to server-side Redis sessions.

New tokens may carry a ``sid`` claim. Tokens issued before this rollout remain
valid until their normal expiry or a PostgreSQL ``sessions_invalid_before``
cutoff, but once a token has a ``sid`` the Redis session becomes mandatory.
"""

import hashlib
import logging
from typing import Any

from fastapi import Request

from app.config import settings
from app.services.session_service import session_service

logger = logging.getLogger("eadmin.session_binding")


class SessionRegistryUnavailable(RuntimeError):
    """Raised when an authoritative bound-session lookup cannot be completed."""


def _request_context(request: Request) -> tuple[str, str, str]:
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "unknown")
    fingerprint = hashlib.sha256(f"{user_agent}|{client_ip}".encode()).hexdigest()[:16]
    return client_ip, user_agent, fingerprint


async def create_bound_session(user_id: str, request: Request) -> str | None:
    """Create the Redis session that will back a newly issued JWT family.

    Test/development keep a compatibility path when Redis is intentionally not
    running. Staging and production fail closed so a newly issued token can
    never pretend to be session-bound without an authoritative Redis record.
    """

    client_ip, user_agent, fingerprint = _request_context(request)
    try:
        return await session_service.create_session(
            user_id=user_id,
            ip_address=client_ip,
            user_agent=user_agent,
            device_fingerprint=fingerprint,
        )
    except Exception as exc:
        if settings.is_test or settings.is_development:
            logger.warning(
                "Session registry unavailable in %s; issuing legacy unbound token user=%s: %s",
                settings.ENVIRONMENT,
                user_id,
                exc,
            )
            return None
        raise SessionRegistryUnavailable("Redis session registry unavailable") from exc


async def validate_bound_session(
    session_id: str,
    user_id: str,
    *,
    touch: bool = False,
) -> bool:
    """Validate a ``sid`` against Redis and its owning user.

    Once ``sid`` exists in a JWT there is no fail-open path. A Redis error is
    distinct from an absent/revoked session so callers can return 503 vs 401.
    """

    try:
        session: dict[str, Any] | None = await session_service.validate_session(session_id)
        if not session or str(session.get("user_id") or "") != str(user_id):
            return False
        if touch:
            await session_service.update_session_activity(session_id)
        return True
    except Exception as exc:
        raise SessionRegistryUnavailable("Redis session validation unavailable") from exc


async def destroy_bound_session_best_effort(session_id: str) -> None:
    """Clean a session after durable revocation; never weaken the DB cutoff."""

    if not session_id:
        return
    try:
        await session_service.destroy_session(session_id)
    except Exception as exc:
        logger.warning("Unable to clean Redis session sid=%s: %s", session_id, exc)
