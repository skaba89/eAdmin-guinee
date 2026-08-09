"""Fail-closed OpenID Connect federation for eAdmin Guinea."""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt

from app.config import settings
from app.services.token_blacklist import token_blacklist

OIDC_STATE_PREFIX = "eadmin:oidc:state:"
OIDC_EXCHANGE_PREFIX = "eadmin:oidc:exchange:"
OIDC_EXCHANGE_TTL_SECONDS = 60


class OIDCError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class OIDCClaims:
    issuer: str
    subject: str
    email: str | None
    email_verified: bool
    acr: str | None
    amr: tuple[str, ...]
    fingerprint: str


def _b64url_no_padding(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _safe_return_to(value: str | None) -> str:
    candidate = (value or "/").strip()
    if not candidate.startswith("/") or candidate.startswith("//"):
        return "/"
    if "\r" in candidate or "\n" in candidate:
        return "/"
    return candidate[:512]


class OIDCService:
    """Authorization Code + PKCE OIDC client with one-time server state."""

    @staticmethod
    def readiness() -> dict[str, Any]:
        return {
            "enabled": settings.OIDC_ENABLED,
            "provider": settings.OIDC_PROVIDER if settings.OIDC_ENABLED else None,
            "issuer_configured": bool(settings.OIDC_ISSUER),
            "pkce": "S256",
            "state_server_side": True,
            "nonce_required": True,
            "auto_provision": False,
            "local_authorization_authoritative": True,
        }

    @staticmethod
    def _require_enabled() -> None:
        if not settings.OIDC_ENABLED:
            raise OIDCError("oidc_disabled", "La fédération OIDC n'est pas activée.")

    async def _redis(self):
        return await token_blacklist._get_redis()

    @staticmethod
    async def _atomic_getdel(redis, key: str) -> str | None:
        """Consume one-time state atomically on Redis 6.2+.

        Lightweight test doubles may not implement execute_command; the fallback
        exists only for those isolated tests. Production Redis uses GETDEL.
        """
        execute_command = getattr(redis, "execute_command", None)
        if callable(execute_command):
            return await execute_command("GETDEL", key)
        value = await redis.get(key)
        if value is not None:
            await redis.delete(key)
        return value

    async def start_authorization(self, return_to: str | None = None) -> str:
        self._require_enabled()

        state = secrets.token_urlsafe(32)
        nonce = secrets.token_urlsafe(32)
        verifier = secrets.token_urlsafe(64)
        challenge = _b64url_no_padding(hashlib.sha256(verifier.encode("ascii")).digest())
        payload = {
            "nonce": nonce,
            "code_verifier": verifier,
            "return_to": _safe_return_to(return_to),
        }

        redis = await self._redis()
        await redis.setex(
            f"{OIDC_STATE_PREFIX}{state}",
            settings.OIDC_STATE_TTL_SECONDS,
            json.dumps(payload, separators=(",", ":")),
        )

        params = {
            "response_type": "code",
            "client_id": settings.OIDC_CLIENT_ID,
            "redirect_uri": settings.OIDC_REDIRECT_URI,
            "scope": settings.OIDC_SCOPES,
            "state": state,
            "nonce": nonce,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
        if settings.OIDC_REQUIRED_ACR:
            params["acr_values"] = settings.OIDC_REQUIRED_ACR
        return f"{settings.OIDC_AUTHORIZATION_ENDPOINT}?{urlencode(params)}"

    async def consume_authorization_state(self, state: str) -> dict[str, str]:
        self._require_enabled()
        if not state or len(state) > 512:
            raise OIDCError("invalid_state", "État OIDC invalide.")
        redis = await self._redis()
        raw = await self._atomic_getdel(redis, f"{OIDC_STATE_PREFIX}{state}")
        if not raw:
            raise OIDCError("invalid_state", "État OIDC expiré, inconnu ou déjà utilisé.")
        try:
            payload = json.loads(raw)
        except (TypeError, ValueError, json.JSONDecodeError) as exc:
            raise OIDCError("invalid_state", "État OIDC serveur corrompu.") from exc
        nonce = str(payload.get("nonce") or "")
        verifier = str(payload.get("code_verifier") or "")
        if not nonce or not verifier:
            raise OIDCError("invalid_state", "État OIDC incomplet.")
        return {
            "nonce": nonce,
            "code_verifier": verifier,
            "return_to": _safe_return_to(payload.get("return_to")),
        }

    async def exchange_authorization_code(self, code: str, code_verifier: str) -> str:
        self._require_enabled()
        if not code or len(code) > 4096 or not code_verifier:
            raise OIDCError("invalid_code", "Code d'autorisation OIDC invalide.")

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.OIDC_REDIRECT_URI,
            "client_id": settings.OIDC_CLIENT_ID,
            "client_secret": settings.OIDC_CLIENT_SECRET,
            "code_verifier": code_verifier,
        }
        try:
            async with httpx.AsyncClient(
                timeout=settings.OIDC_HTTP_TIMEOUT_SECONDS,
                follow_redirects=False,
            ) as client:
                response = await client.post(
                    settings.OIDC_TOKEN_ENDPOINT,
                    data=data,
                    headers={"Accept": "application/json"},
                )
        except httpx.HTTPError as exc:
            raise OIDCError("token_endpoint_unavailable", "Le fournisseur d'identité est indisponible.") from exc

        if response.status_code != 200:
            raise OIDCError("token_exchange_failed", "Le fournisseur d'identité a refusé le code.")
        try:
            payload = response.json()
        except ValueError as exc:
            raise OIDCError("token_exchange_failed", "Réponse token OIDC invalide.") from exc
        id_token = payload.get("id_token")
        if not isinstance(id_token, str) or not id_token:
            raise OIDCError("missing_id_token", "Le fournisseur n'a pas retourné d'ID token.")
        return id_token

    async def validate_id_token(self, id_token: str, expected_nonce: str) -> OIDCClaims:
        self._require_enabled()
        try:
            header = jwt.get_unverified_header(id_token)
        except JWTError as exc:
            raise OIDCError("invalid_id_token", "En-tête ID token invalide.") from exc

        algorithm = str(header.get("alg") or "")
        allowed_algorithms = {
            item.strip() for item in settings.OIDC_ALLOWED_ALGORITHMS.split(",") if item.strip()
        }
        if algorithm not in allowed_algorithms:
            raise OIDCError("invalid_algorithm", "Algorithme de signature OIDC non autorisé.")
        kid = str(header.get("kid") or "")
        if not kid:
            raise OIDCError("missing_kid", "Le token OIDC ne contient pas de key id.")

        try:
            async with httpx.AsyncClient(
                timeout=settings.OIDC_HTTP_TIMEOUT_SECONDS,
                follow_redirects=False,
            ) as client:
                response = await client.get(
                    settings.OIDC_JWKS_URI,
                    headers={"Accept": "application/json"},
                )
        except httpx.HTTPError as exc:
            raise OIDCError("jwks_unavailable", "Les clés publiques OIDC sont indisponibles.") from exc
        if response.status_code != 200:
            raise OIDCError("jwks_unavailable", "Les clés publiques OIDC sont indisponibles.")
        try:
            jwks = response.json()
        except ValueError as exc:
            raise OIDCError("jwks_invalid", "Document JWKS invalide.") from exc

        keys = jwks.get("keys") if isinstance(jwks, dict) else None
        if not isinstance(keys, list):
            raise OIDCError("jwks_invalid", "Document JWKS invalide.")
        key = next((candidate for candidate in keys if str(candidate.get("kid") or "") == kid), None)
        if key is None:
            raise OIDCError("unknown_kid", "Clé de signature OIDC inconnue.")
        if str(key.get("alg") or algorithm) != algorithm:
            raise OIDCError("key_algorithm_mismatch", "La clé JWKS ne correspond pas à l'algorithme du token.")

        try:
            claims = jwt.decode(
                id_token,
                key,
                algorithms=[algorithm],
                audience=settings.OIDC_CLIENT_ID,
                issuer=settings.OIDC_ISSUER,
                options={"verify_at_hash": False},
            )
        except JWTError as exc:
            raise OIDCError("invalid_id_token", "Signature ou claims ID token invalides.") from exc

        nonce = str(claims.get("nonce") or "")
        if not expected_nonce or not secrets.compare_digest(nonce, expected_nonce):
            raise OIDCError("nonce_mismatch", "Nonce OIDC invalide.")

        subject = str(claims.get("sub") or "").strip()
        issuer = str(claims.get("iss") or "").strip()
        if not subject or issuer != settings.OIDC_ISSUER:
            raise OIDCError("invalid_subject", "Identité OIDC incomplète.")

        email_value = claims.get("email")
        email = str(email_value).strip().lower() if email_value else None
        email_verified = claims.get("email_verified") is True
        if settings.OIDC_REQUIRE_VERIFIED_EMAIL and (not email or not email_verified):
            raise OIDCError("email_not_verified", "Une adresse email vérifiée est requise par la politique SSO.")

        acr_value = claims.get("acr")
        acr = str(acr_value) if acr_value is not None else None
        if settings.OIDC_REQUIRED_ACR and acr != settings.OIDC_REQUIRED_ACR:
            raise OIDCError("acr_not_satisfied", "Le niveau d'authentification IdP requis n'est pas satisfait.")

        amr_raw = claims.get("amr")
        amr = tuple(str(item) for item in amr_raw) if isinstance(amr_raw, list) else ()
        canonical = json.dumps(
            {
                "iss": issuer,
                "sub": subject,
                "email": email,
                "email_verified": email_verified,
                "acr": acr,
                "amr": sorted(amr),
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        fingerprint = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        return OIDCClaims(
            issuer=issuer,
            subject=subject,
            email=email,
            email_verified=email_verified,
            acr=acr,
            amr=amr,
            fingerprint=fingerprint,
        )

    async def create_local_exchange(self, *, user_id: str, return_to: str, mfa_required: bool) -> str:
        code = secrets.token_urlsafe(32)
        redis = await self._redis()
        await redis.setex(
            f"{OIDC_EXCHANGE_PREFIX}{code}",
            OIDC_EXCHANGE_TTL_SECONDS,
            json.dumps(
                {
                    "user_id": user_id,
                    "return_to": _safe_return_to(return_to),
                    "mfa_required": bool(mfa_required),
                },
                separators=(",", ":"),
            ),
        )
        return code

    async def consume_local_exchange(self, code: str) -> dict[str, Any]:
        if not code or len(code) > 512:
            raise OIDCError("invalid_exchange", "Code d'échange SSO invalide.")
        redis = await self._redis()
        raw = await self._atomic_getdel(redis, f"{OIDC_EXCHANGE_PREFIX}{code}")
        if not raw:
            raise OIDCError("invalid_exchange", "Code d'échange SSO expiré ou déjà utilisé.")
        try:
            payload = json.loads(raw)
        except (TypeError, ValueError, json.JSONDecodeError) as exc:
            raise OIDCError("invalid_exchange", "Code d'échange SSO corrompu.") from exc
        user_id = str(payload.get("user_id") or "")
        if not user_id:
            raise OIDCError("invalid_exchange", "Code d'échange SSO incomplet.")
        return {
            "user_id": user_id,
            "return_to": _safe_return_to(payload.get("return_to")),
            "mfa_required": bool(payload.get("mfa_required")),
        }


oidc_service = OIDCService()
