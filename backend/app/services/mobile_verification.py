"""Verified mobile contact and notification-consent service.

Raw OTP codes are never persisted in PostgreSQL. A PBKDF2 digest is stored on
``PhoneVerificationChallenge`` for confirmation while the raw code lives only in
Redis with the same short TTL needed by the delivery worker.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import redis.asyncio as aioredis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.phone_verification import PhoneVerificationChallenge
from app.models.user import User
from app.services.notification_outbox import ProviderRegistry, enqueue_notification

MOBILE_CONSENT_VERSION = "2026-08-v1"
OTP_TTL_SECONDS = 600
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_REQUESTS_PER_HOUR = 5
OTP_REDIS_PREFIX = "eadmin:phone_verification:"


class MobileVerificationError(ValueError):
    pass


class MobileVerificationRateLimitError(MobileVerificationError):
    pass


class MobileProviderUnavailableError(RuntimeError):
    pass


@dataclass(frozen=True)
class ConfirmationResult:
    success: bool
    challenge: PhoneVerificationChallenge
    error: str | None = None


def normalize_phone_e164(raw: str, *, default_country_code: str = "+224") -> str:
    """Normalize an international or Guinea-local number to a conservative E.164 form."""
    value = (raw or "").strip()
    if not value:
        raise MobileVerificationError("Le numéro de téléphone est obligatoire.")

    value = re.sub(r"[\s().-]", "", value)
    if value.startswith("00"):
        value = "+" + value[2:]
    elif value.startswith("+"):
        pass
    else:
        digits = re.sub(r"\D", "", value)
        if digits.startswith(default_country_code.lstrip("+")):
            value = "+" + digits
        else:
            digits = digits.lstrip("0")
            value = default_country_code + digits

    if not re.fullmatch(r"\+[1-9]\d{7,14}", value):
        raise MobileVerificationError("Le numéro doit être un numéro international E.164 valide.")
    return value


def mask_phone(phone_e164: str) -> str:
    if len(phone_e164) <= 7:
        return "***"
    return f"{phone_e164[:4]}***{phone_e164[-3:]}"


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(code: str, salt_hex: str) -> str:
    salt = bytes.fromhex(salt_hex)
    digest = hashlib.pbkdf2_hmac("sha256", code.encode("utf-8"), salt, 120_000)
    return digest.hex()


def verify_otp(code: str, salt_hex: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_otp(code, salt_hex), expected_hash)


class MobileVerificationService:
    def __init__(self) -> None:
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
        return self._redis

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    @staticmethod
    def redis_key(challenge_id: uuid.UUID | str) -> str:
        return f"{OTP_REDIS_PREFIX}{challenge_id}"

    async def get_delivery_code(self, challenge_id: uuid.UUID | str) -> str | None:
        redis = await self._get_redis()
        return await redis.get(self.redis_key(challenge_id))

    async def _delete_delivery_code(self, challenge_id: uuid.UUID | str) -> None:
        redis = await self._get_redis()
        await redis.delete(self.redis_key(challenge_id))

    async def start_challenge(
        self,
        db: AsyncSession,
        *,
        user: User,
        phone: str,
        channel: str,
    ) -> PhoneVerificationChallenge:
        channel = channel.strip().lower()
        if channel not in {"sms", "whatsapp"}:
            raise MobileVerificationError("Le canal de vérification doit être sms ou whatsapp.")

        try:
            provider = ProviderRegistry.from_environment().get(channel)
        except ValueError as exc:
            raise MobileProviderUnavailableError(
                f"Configuration du fournisseur {channel} invalide."
            ) from exc
        if provider is None:
            raise MobileProviderUnavailableError(
                f"Le fournisseur {channel} n'est pas configuré pour la vérification mobile."
            )

        normalized = normalize_phone_e164(phone)
        tenant_id = (user.tenant_id or settings.TENANT_DEFAULT_ID).strip()
        now = datetime.now(timezone.utc)

        last_created = await db.scalar(
            select(func.max(PhoneVerificationChallenge.created_at)).where(
                PhoneVerificationChallenge.user_id == user.id,
            )
        )
        if last_created and last_created > now - timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS):
            raise MobileVerificationRateLimitError(
                "Un code vient déjà d'être demandé. Réessayez dans une minute."
            )

        hourly_count = await db.scalar(
            select(func.count()).select_from(PhoneVerificationChallenge).where(
                PhoneVerificationChallenge.user_id == user.id,
                PhoneVerificationChallenge.created_at >= now - timedelta(hours=1),
            )
        )
        if int(hourly_count or 0) >= OTP_MAX_REQUESTS_PER_HOUR:
            raise MobileVerificationRateLimitError(
                "Trop de demandes de vérification. Réessayez plus tard."
            )

        code = generate_otp()
        salt_hex = secrets.token_bytes(16).hex()
        challenge = PhoneVerificationChallenge(
            id=uuid.uuid4(),
            user_id=user.id,
            tenant_id=tenant_id,
            phone_e164=normalized,
            channel=channel,
            code_salt=salt_hex,
            code_hash=hash_otp(code, salt_hex),
            expires_at=now + timedelta(seconds=OTP_TTL_SECONDS),
            attempt_count=0,
            max_attempts=OTP_MAX_ATTEMPTS,
        )
        db.add(challenge)
        await db.flush()

        redis = await self._get_redis()
        await redis.setex(self.redis_key(challenge.id), OTP_TTL_SECONDS, code)

        await enqueue_notification(
            db,
            tenant_id=tenant_id,
            institution_id=user.institution_id,
            event_type="mobile_verification.requested",
            channel=channel,
            recipient=normalized,
            template_key="mobile_verification_code",
            payload={
                "challenge_id": str(challenge.id),
                "purpose": "phone_verification",
            },
            dedupe_key=str(challenge.id),
            max_attempts=3,
        )
        return challenge

    async def confirm_challenge(
        self,
        db: AsyncSession,
        *,
        user: User,
        challenge_id: uuid.UUID,
        code: str,
    ) -> ConfirmationResult:
        now = datetime.now(timezone.utc)
        challenge = await db.scalar(
            select(PhoneVerificationChallenge)
            .where(
                PhoneVerificationChallenge.id == challenge_id,
                PhoneVerificationChallenge.user_id == user.id,
            )
            .with_for_update()
        )
        if not challenge:
            raise MobileVerificationError("Challenge de vérification introuvable.")
        if challenge.consumed_at is not None:
            raise MobileVerificationError("Ce challenge a déjà été utilisé.")
        if challenge.expires_at <= now:
            raise MobileVerificationError("Ce code de vérification a expiré.")
        if challenge.attempt_count >= challenge.max_attempts:
            raise MobileVerificationError("Nombre maximal de tentatives atteint.")
        if not re.fullmatch(r"\d{6}", code or ""):
            raise MobileVerificationError("Le code de vérification doit contenir 6 chiffres.")

        if not verify_otp(code, challenge.code_salt, challenge.code_hash):
            challenge.attempt_count += 1
            if challenge.attempt_count >= challenge.max_attempts:
                challenge.consumed_at = now
            await db.flush()
            # Return instead of raising so the request-scoped DB dependency can
            # commit the consumed attempt while the API still returns HTTP 400.
            return ConfirmationResult(
                success=False,
                challenge=challenge,
                error="Code de vérification incorrect.",
            )

        challenge.consumed_at = now
        user.phone_e164 = challenge.phone_e164
        user.phone_verified_at = now

        # Verification proves possession, not consent. A newly verified or
        # changed number therefore starts with both mobile channels disabled.
        user.notification_sms_enabled = False
        user.notification_whatsapp_enabled = False
        user.notification_consent_version = None
        user.notification_consent_updated_at = now
        await db.flush()
        try:
            await self._delete_delivery_code(challenge.id)
        except Exception:
            pass
        return ConfirmationResult(success=True, challenge=challenge)


mobile_verification_service = MobileVerificationService()
