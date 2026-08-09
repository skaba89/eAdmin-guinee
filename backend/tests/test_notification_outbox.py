"""Notification outbox governance and delivery invariants."""

from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.notification_outbox import (
    DeliveryResult,
    ProviderRegistry,
    SmtpEmailProvider,
    WebhookNotificationProvider,
    build_idempotency_key,
    enqueue_notification,
    process_outbox_batch,
    retry_delay,
)


def test_idempotency_key_is_stable_case_normalized_and_non_reversible():
    first = build_idempotency_key(
        tenant_id="default",
        event_type="request.status.changed",
        channel="EMAIL",
        recipient="Citizen@Example.GN",
        request_id="request-1",
        dedupe_key="validee",
    )
    second = build_idempotency_key(
        tenant_id="default",
        event_type="request.status.changed",
        channel="email",
        recipient="citizen@example.gn",
        request_id="request-1",
        dedupe_key="validee",
    )
    changed = build_idempotency_key(
        tenant_id="default",
        event_type="request.status.changed",
        channel="email",
        recipient="citizen@example.gn",
        request_id="request-1",
        dedupe_key="prete",
    )

    assert first == second
    assert first != changed
    assert len(first) == 64
    assert "citizen" not in first


def test_retry_delay_is_exponential_and_bounded():
    assert retry_delay(1) == timedelta(minutes=1)
    assert retry_delay(2) == timedelta(minutes=2)
    assert retry_delay(3) == timedelta(minutes=4)
    assert retry_delay(50) == timedelta(hours=6)


def test_webhook_provider_requires_https():
    with pytest.raises(ValueError, match="HTTPS"):
        WebhookNotificationProvider(channel="sms", url="http://example.test/send")


def test_smtp_provider_is_disabled_when_configuration_is_incomplete(monkeypatch):
    monkeypatch.delenv("EADMIN_SMTP_HOST", raising=False)
    monkeypatch.delenv("EADMIN_SMTP_FROM_EMAIL", raising=False)

    assert SmtpEmailProvider.from_environment() is None


@pytest.mark.asyncio
async def test_enqueue_reuses_existing_idempotent_delivery():
    existing = SimpleNamespace(id="existing")
    result = MagicMock()
    result.scalar_one_or_none.return_value = existing
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.flush = AsyncMock()

    item = await enqueue_notification(
        db,
        tenant_id="default",
        event_type="request.submitted",
        channel="email",
        recipient="citizen@example.gn",
        template_key="request_submitted",
        payload={"subject": "Demande reçue", "text": "Votre demande est reçue."},
        request_id=None,
        dedupe_key="GN-2026-ABC",
    )

    assert item is existing
    db.add.assert_not_called()
    db.flush.assert_not_awaited()


@pytest.mark.asyncio
async def test_enqueue_creates_pending_delivery_without_provider_call():
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.flush = AsyncMock()

    item = await enqueue_notification(
        db,
        tenant_id="default",
        institution_id="mairie-kaloum",
        event_type="request.submitted",
        channel="whatsapp",
        recipient="+224600000000",
        template_key="request_submitted",
        payload={"text": "Demande reçue"},
        dedupe_key="GN-2026-ABC",
    )

    assert item.status == "pending"
    assert item.channel == "whatsapp"
    assert item.attempt_count is None or item.attempt_count == 0
    assert len(item.idempotency_key) == 64
    db.add.assert_called_once_with(item)
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_unconfigured_channel_is_blocked_without_consuming_attempt(monkeypatch):
    item = SimpleNamespace(
        channel="sms",
        status="processing",
        attempt_count=0,
        max_attempts=5,
        provider_name=None,
        provider_message_id=None,
        last_error=None,
        next_attempt_at=None,
        locked_at=object(),
        sent_at=None,
    )
    db = MagicMock()
    db.commit = AsyncMock()

    monkeypatch.setattr(
        "app.services.notification_outbox.recover_stale_processing",
        AsyncMock(return_value=0),
    )
    monkeypatch.setattr(
        "app.services.notification_outbox.claim_due_notifications",
        AsyncMock(return_value=[item]),
    )

    result = await process_outbox_batch(db, ProviderRegistry({}))

    assert result["blocked"] == 1
    assert item.status == "blocked"
    assert item.attempt_count == 0
    assert "Aucun fournisseur" in item.last_error


class _SuccessProvider:
    name = "fake"

    async def send(self, notification):
        assert notification.status == "processing"
        return DeliveryResult(provider_name=self.name, message_id="provider-123")


class _FailureProvider:
    name = "fake"

    async def send(self, notification):
        raise RuntimeError("provider unavailable")


@pytest.mark.asyncio
async def test_successful_delivery_is_marked_sent(monkeypatch):
    item = SimpleNamespace(
        channel="email",
        status="processing",
        attempt_count=0,
        max_attempts=5,
        provider_name=None,
        provider_message_id=None,
        last_error=None,
        next_attempt_at=None,
        locked_at=object(),
        sent_at=None,
    )
    db = MagicMock()
    db.commit = AsyncMock()
    monkeypatch.setattr("app.services.notification_outbox.recover_stale_processing", AsyncMock(return_value=0))
    monkeypatch.setattr("app.services.notification_outbox.claim_due_notifications", AsyncMock(return_value=[item]))

    result = await process_outbox_batch(db, ProviderRegistry({"email": _SuccessProvider()}))

    assert result["sent"] == 1
    assert item.status == "sent"
    assert item.attempt_count == 1
    assert item.provider_name == "fake"
    assert item.provider_message_id == "provider-123"
    assert item.sent_at is not None


@pytest.mark.asyncio
async def test_provider_failure_retries_then_dead_letters(monkeypatch):
    retry_item = SimpleNamespace(
        channel="email",
        status="processing",
        attempt_count=0,
        max_attempts=2,
        provider_name=None,
        provider_message_id=None,
        last_error=None,
        next_attempt_at=None,
        locked_at=object(),
        sent_at=None,
    )
    dead_item = SimpleNamespace(
        channel="email",
        status="processing",
        attempt_count=1,
        max_attempts=2,
        provider_name=None,
        provider_message_id=None,
        last_error=None,
        next_attempt_at=None,
        locked_at=object(),
        sent_at=None,
    )
    db = MagicMock()
    db.commit = AsyncMock()
    claim = AsyncMock(side_effect=[[retry_item], [dead_item]])
    monkeypatch.setattr("app.services.notification_outbox.recover_stale_processing", AsyncMock(return_value=0))
    monkeypatch.setattr("app.services.notification_outbox.claim_due_notifications", claim)
    registry = ProviderRegistry({"email": _FailureProvider()})

    first = await process_outbox_batch(db, registry)
    second = await process_outbox_batch(db, registry)

    assert first["retry"] == 1
    assert retry_item.status == "retry"
    assert retry_item.attempt_count == 1
    assert retry_item.next_attempt_at is not None

    assert second["dead_letter"] == 1
    assert dead_item.status == "dead_letter"
    assert dead_item.attempt_count == 2
    assert dead_item.next_attempt_at is None
    assert "provider unavailable" in dead_item.last_error
