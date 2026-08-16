"""Notification worker tenant-scope and claim-ownership regressions."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import notification_outbox
from app.services.notification_outbox import ProviderRegistry, configure_worker_tenant_scope


def test_configure_worker_tenant_scope_persists_trusted_session_scope():
    db = MagicMock()
    db.sync_session.info = {}

    tenant_id = configure_worker_tenant_scope(db, " tenant-a ")

    assert tenant_id == "tenant-a"
    assert db.sync_session.info["rls_scope"] == {
        "user_id": "",
        "tenant_id": "tenant-a",
        "institution_id": "",
        "role": "SYSTEM_WORKER",
        "is_super_admin": False,
    }


def test_configure_worker_tenant_scope_rejects_empty_tenant():
    db = MagicMock()
    db.sync_session.info = {}

    with pytest.raises(ValueError, match="tenant_id"):
        configure_worker_tenant_scope(db, "   ")


@pytest.mark.asyncio
async def test_postgresql_batch_rejects_missing_tenant_scope():
    db = MagicMock()
    db.get_bind.return_value = SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))

    with pytest.raises(ValueError, match="tenant_id"):
        await notification_outbox.process_outbox_batch(db, ProviderRegistry({}))


@pytest.mark.asyncio
async def test_claim_assigns_distinct_processing_tokens():
    first = SimpleNamespace(
        status="pending",
        locked_at=None,
        processing_token=None,
    )
    second = SimpleNamespace(
        status="pending",
        locked_at=None,
        processing_token=None,
    )
    scalars = MagicMock()
    scalars.all.return_value = [first, second]
    result = MagicMock()
    result.scalars.return_value = scalars
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)
    db.flush = AsyncMock()

    items = await notification_outbox.claim_due_notifications(db, batch_size=2)

    assert items == [first, second]
    assert first.status == "processing"
    assert second.status == "processing"
    assert isinstance(first.processing_token, uuid.UUID)
    assert isinstance(second.processing_token, uuid.UUID)
    assert first.processing_token != second.processing_token
    assert first.locked_at is not None
    assert second.locked_at is not None
    db.flush.assert_awaited_once()


class _NeverCalledProvider:
    name = "never"

    def __init__(self) -> None:
        self.send = AsyncMock()


@pytest.mark.asyncio
async def test_lost_processing_token_skips_external_delivery(monkeypatch):
    item = SimpleNamespace(
        id=uuid.uuid4(),
        channel="email",
        status="processing",
        attempt_count=0,
        max_attempts=5,
        provider_name=None,
        provider_message_id=None,
        last_error=None,
        next_attempt_at=None,
        locked_at=object(),
        processing_token=uuid.uuid4(),
        sent_at=None,
    )
    provider = _NeverCalledProvider()
    db = MagicMock()
    db.sync_session.info = {}
    db.commit = AsyncMock()
    db.execute = AsyncMock(return_value=SimpleNamespace(rowcount=0))

    monkeypatch.setattr(
        notification_outbox,
        "recover_stale_processing",
        AsyncMock(return_value=0),
    )
    monkeypatch.setattr(
        notification_outbox,
        "claim_due_notifications",
        AsyncMock(return_value=[item]),
    )

    counters = await notification_outbox.process_outbox_batch(
        db,
        ProviderRegistry({"email": provider}),
        tenant_id="tenant-a",
    )

    assert counters["claimed"] == 1
    assert counters["lost_claim"] == 1
    assert counters["sent"] == 0
    provider.send.assert_not_awaited()


@pytest.mark.asyncio
async def test_stale_recovery_clears_processing_token():
    db = MagicMock()
    db.execute = AsyncMock(return_value=SimpleNamespace(rowcount=2))

    recovered = await notification_outbox.recover_stale_processing(db)

    assert recovered == 2
    statement = db.execute.await_args.args[0]
    values = statement.compile().params
    assert values["processing_token"] is None
    assert values["status"] == "retry"
