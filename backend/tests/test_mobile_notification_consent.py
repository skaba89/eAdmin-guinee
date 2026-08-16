"""Verified mobile notification security and consent tests."""

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api import notification_preferences as preferences_api
from app.models.notification_outbox import NotificationOutbox
from app.models.phone_verification import PhoneVerificationChallenge
from app.models.user import RoleEnum, User
from app.services import mobile_verification as mobile_module
from app.services.mobile_verification import (
    MOBILE_CONSENT_VERSION,
    MobileVerificationError,
    MobileVerificationService,
    hash_otp,
    normalize_phone_e164,
    verify_otp,
)
from app.services.notification_payload_resolver import materialize_notification


def _user() -> User:
    return User(
        id=uuid.uuid4(),
        email="citizen@example.gn",
        hashed_password="unused",
        full_name="Citoyen Test",
        role=RoleEnum.CITOYEN,
        tenant_id="default",
        notification_email_enabled=True,
        notification_sms_enabled=False,
        notification_whatsapp_enabled=False,
    )


def _challenge(user: User, code: str = "123456") -> PhoneVerificationChallenge:
    salt = secrets.token_bytes(16).hex()
    return PhoneVerificationChallenge(
        id=uuid.uuid4(),
        user_id=user.id,
        tenant_id="default",
        phone_e164="+224620000001",
        channel="sms",
        code_salt=salt,
        code_hash=hash_otp(code, salt),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        attempt_count=0,
        max_attempts=5,
    )


def test_phone_normalization_accepts_guinea_local_and_international_forms():
    assert normalize_phone_e164("620 00 00 01") == "+224620000001"
    assert normalize_phone_e164("00224 620 00 00 01") == "+224620000001"
    assert normalize_phone_e164("+224620000001") == "+224620000001"


def test_phone_normalization_rejects_invalid_number():
    with pytest.raises(MobileVerificationError):
        normalize_phone_e164("123")


def test_otp_digest_is_salted_and_verifiable_without_storing_plain_code():
    code = "381204"
    first_salt = secrets.token_bytes(16).hex()
    second_salt = secrets.token_bytes(16).hex()
    first_hash = hash_otp(code, first_salt)
    second_hash = hash_otp(code, second_salt)

    assert first_hash != code
    assert second_hash != code
    assert first_hash != second_hash
    assert verify_otp(code, first_salt, first_hash)
    assert not verify_otp("000000", first_salt, first_hash)


def test_otp_redis_key_is_tenant_bound():
    challenge_id = uuid.UUID("11111111-1111-1111-1111-111111111111")

    key_a = MobileVerificationService.redis_key("tenant-a", challenge_id)
    key_b = MobileVerificationService.redis_key("tenant-b", challenge_id)

    assert key_a != key_b
    assert ":tenant-a:" in key_a
    assert ":tenant-b:" in key_b
    with pytest.raises(MobileVerificationError, match="Tenant"):
        MobileVerificationService.redis_key("", challenge_id)


@pytest.mark.asyncio
async def test_delivery_code_lookup_cannot_cross_tenant_for_same_challenge(monkeypatch):
    service = MobileVerificationService()
    challenge_id = uuid.UUID("22222222-2222-2222-2222-222222222222")
    values = {
        service.redis_key("tenant-a", challenge_id): "111111",
        service.redis_key("tenant-b", challenge_id): "222222",
    }
    redis = SimpleNamespace(get=AsyncMock(side_effect=lambda key: values.get(key)))
    monkeypatch.setattr(service, "_get_redis", AsyncMock(return_value=redis))

    code_a = await service.get_delivery_code(challenge_id, tenant_id="tenant-a")
    code_b = await service.get_delivery_code(challenge_id, tenant_id="tenant-b")

    assert code_a == "111111"
    assert code_b == "222222"
    assert code_a != code_b


@pytest.mark.asyncio
async def test_start_challenge_keeps_raw_otp_out_of_durable_outbox(monkeypatch):
    service = MobileVerificationService()
    user = _user()
    db = SimpleNamespace(
        scalar=AsyncMock(side_effect=[None, 0]),
        add=MagicMock(),
        flush=AsyncMock(),
    )
    redis = SimpleNamespace(setex=AsyncMock())
    monkeypatch.setattr(service, "_get_redis", AsyncMock(return_value=redis))
    monkeypatch.setattr(mobile_module, "generate_otp", lambda: "123456")

    registry = SimpleNamespace(get=lambda channel: object())
    monkeypatch.setattr(
        mobile_module.ProviderRegistry,
        "from_environment",
        classmethod(lambda cls: registry),
    )
    enqueue = AsyncMock(return_value=SimpleNamespace())
    monkeypatch.setattr(mobile_module, "enqueue_notification", enqueue)

    challenge = await service.start_challenge(
        db,
        user=user,
        phone="620000001",
        channel="sms",
    )

    redis.setex.assert_awaited_once_with(
        service.redis_key(user.tenant_id, challenge.id),
        600,
        "123456",
    )
    kwargs = enqueue.await_args.kwargs
    assert kwargs["tenant_id"] == user.tenant_id
    assert kwargs["template_key"] == "mobile_verification_code"
    assert kwargs["payload"] == {
        "challenge_id": str(challenge.id),
        "purpose": "phone_verification",
    }
    assert "123456" not in str(kwargs["payload"])
    assert challenge.code_hash != "123456"


@pytest.mark.asyncio
async def test_delivery_resolver_reads_otp_only_at_provider_boundary(monkeypatch):
    notification = NotificationOutbox(
        tenant_id="default",
        event_type="mobile_verification.requested",
        channel="sms",
        recipient="+224620000001",
        template_key="mobile_verification_code",
        payload={"challenge_id": "challenge-123", "purpose": "phone_verification"},
        idempotency_key="a" * 64,
        status="pending",
        max_attempts=3,
    )
    lookup = AsyncMock(return_value="654321")
    monkeypatch.setattr(
        "app.services.notification_payload_resolver.mobile_verification_service.get_delivery_code",
        lookup,
    )

    materialized = await materialize_notification(notification)

    lookup.assert_awaited_once_with("challenge-123", tenant_id="default")
    assert "654321" in materialized.payload["text"]
    assert "654321" not in str(notification.payload)
    assert notification.payload == {
        "challenge_id": "challenge-123",
        "purpose": "phone_verification",
    }


@pytest.mark.asyncio
async def test_delivery_resolver_rejects_otp_without_tenant_scope(monkeypatch):
    notification = SimpleNamespace(
        tenant_id="",
        event_type="mobile_verification.requested",
        channel="sms",
        recipient="+224620000001",
        template_key="mobile_verification_code",
        payload={"challenge_id": "challenge-123", "purpose": "phone_verification"},
        idempotency_key="a" * 64,
    )
    lookup = AsyncMock(return_value="654321")
    monkeypatch.setattr(
        "app.services.notification_payload_resolver.mobile_verification_service.get_delivery_code",
        lookup,
    )

    with pytest.raises(RuntimeError, match="Tenant OTP"):
        await materialize_notification(notification)

    lookup.assert_not_awaited()


@pytest.mark.asyncio
async def test_wrong_otp_consumes_attempt_without_enabling_phone():
    service = MobileVerificationService()
    user = _user()
    challenge = _challenge(user, code="123456")
    db = SimpleNamespace(
        scalar=AsyncMock(return_value=challenge),
        flush=AsyncMock(),
    )

    result = await service.confirm_challenge(
        db,
        user=user,
        challenge_id=challenge.id,
        code="999999",
    )

    assert not result.success
    assert challenge.attempt_count == 1
    assert user.phone_verified_at is None
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_successful_verification_proves_possession_but_not_consent(monkeypatch):
    service = MobileVerificationService()
    user = _user()
    user.notification_sms_enabled = True
    user.notification_whatsapp_enabled = True
    user.notification_consent_version = "old-consent"
    challenge = _challenge(user, code="123456")
    db = SimpleNamespace(
        scalar=AsyncMock(return_value=challenge),
        flush=AsyncMock(),
    )
    delete_code = AsyncMock()
    monkeypatch.setattr(service, "_delete_delivery_code", delete_code)

    result = await service.confirm_challenge(
        db,
        user=user,
        challenge_id=challenge.id,
        code="123456",
    )

    assert result.success
    assert user.phone_e164 == "+224620000001"
    assert user.phone_verified_at is not None
    assert user.notification_sms_enabled is False
    assert user.notification_whatsapp_enabled is False
    assert user.notification_consent_version is None
    delete_code.assert_awaited_once_with(
        challenge.id,
        tenant_id=challenge.tenant_id,
    )


@pytest.mark.asyncio
async def test_mobile_channel_cannot_be_enabled_without_verified_phone(monkeypatch):
    user = _user()
    db = SimpleNamespace(flush=AsyncMock())
    request = SimpleNamespace(client=None, headers={})
    monkeypatch.setattr(preferences_api, "_audit_preferences", AsyncMock())

    with pytest.raises(HTTPException) as exc:
        await preferences_api.update_my_notification_preferences(
            preferences_api.NotificationPreferencesUpdate(
                sms_enabled=True,
                confirm_mobile_consent=True,
            ),
            request,
            db,
            user,
        )

    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_mobile_enablement_requires_explicit_consent(monkeypatch):
    user = _user()
    user.phone_e164 = "+224620000001"
    user.phone_verified_at = datetime.now(timezone.utc)
    db = SimpleNamespace(flush=AsyncMock())
    request = SimpleNamespace(client=None, headers={})
    monkeypatch.setattr(preferences_api, "_audit_preferences", AsyncMock())

    with pytest.raises(HTTPException) as exc:
        await preferences_api.update_my_notification_preferences(
            preferences_api.NotificationPreferencesUpdate(sms_enabled=True),
            request,
            db,
            user,
        )

    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_explicit_consent_versions_mobile_preferences(monkeypatch):
    user = _user()
    user.phone_e164 = "+224620000001"
    user.phone_verified_at = datetime.now(timezone.utc)
    db = SimpleNamespace(flush=AsyncMock())
    request = SimpleNamespace(client=None, headers={})
    monkeypatch.setattr(preferences_api, "_audit_preferences", AsyncMock())
    monkeypatch.setattr(
        preferences_api,
        "_provider_status",
        lambda: {"sms": True, "whatsapp": True},
    )

    response = await preferences_api.update_my_notification_preferences(
        preferences_api.NotificationPreferencesUpdate(
            sms_enabled=True,
            whatsapp_enabled=True,
            confirm_mobile_consent=True,
        ),
        request,
        db,
        user,
    )

    assert user.notification_sms_enabled is True
    assert user.notification_whatsapp_enabled is True
    assert user.notification_consent_version == MOBILE_CONSENT_VERSION
    assert response["consent"]["version"] == MOBILE_CONSENT_VERSION
