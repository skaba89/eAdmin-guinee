"""Durable notification outbox processing and delivery adapters.

The administrative transaction only writes delivery intent. This module runs
out-of-band and provides at-least-once delivery with idempotency metadata,
retry/backoff and dead-letter handling.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import smtplib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import make_msgid
from typing import Protocol
from urllib.parse import urlparse

import httpx
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_outbox import NotificationOutbox

SUPPORTED_CHANNELS = frozenset({"email", "sms", "whatsapp"})


@dataclass(frozen=True)
class DeliveryResult:
    provider_name: str
    message_id: str | None = None


class NotificationProvider(Protocol):
    name: str

    async def send(self, notification: NotificationOutbox) -> DeliveryResult: ...


class ProviderRegistry:
    def __init__(self, providers: dict[str, NotificationProvider] | None = None):
        self._providers = providers or {}

    def get(self, channel: str) -> NotificationProvider | None:
        return self._providers.get(channel)

    @classmethod
    def from_environment(cls) -> "ProviderRegistry":
        providers: dict[str, NotificationProvider] = {}

        smtp = SmtpEmailProvider.from_environment()
        if smtp:
            providers["email"] = smtp

        for channel in ("sms", "whatsapp"):
            webhook = WebhookNotificationProvider.from_environment(channel)
            if webhook:
                providers[channel] = webhook

        return cls(providers)


def build_idempotency_key(
    *,
    tenant_id: str,
    event_type: str,
    channel: str,
    recipient: str,
    request_id: str | None = None,
    dedupe_key: str | None = None,
) -> str:
    """Build a non-reversible stable key for one delivery intent."""
    canonical = "|".join(
        [
            tenant_id.strip(),
            event_type.strip(),
            channel.strip().lower(),
            recipient.strip().lower(),
            (request_id or "").strip(),
            (dedupe_key or "").strip(),
        ]
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def enqueue_notification(
    db: AsyncSession,
    *,
    tenant_id: str,
    event_type: str,
    channel: str,
    recipient: str,
    template_key: str,
    payload: dict,
    institution_id: str | None = None,
    request_id=None,
    dedupe_key: str | None = None,
    max_attempts: int = 5,
) -> NotificationOutbox:
    """Persist one delivery intent without contacting an external provider."""
    normalized_channel = channel.strip().lower()
    if normalized_channel not in SUPPORTED_CHANNELS:
        raise ValueError(f"Canal de notification non supporté : {channel}")
    if not recipient.strip():
        raise ValueError("Le destinataire de notification est obligatoire.")
    if max_attempts < 1:
        raise ValueError("max_attempts doit être supérieur ou égal à 1.")

    key = build_idempotency_key(
        tenant_id=tenant_id,
        event_type=event_type,
        channel=normalized_channel,
        recipient=recipient,
        request_id=str(request_id) if request_id else None,
        dedupe_key=dedupe_key,
    )
    existing = (
        await db.execute(
            select(NotificationOutbox).where(NotificationOutbox.idempotency_key == key)
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    item = NotificationOutbox(
        tenant_id=tenant_id,
        institution_id=institution_id,
        request_id=request_id,
        event_type=event_type,
        channel=normalized_channel,
        recipient=recipient.strip(),
        template_key=template_key,
        payload=payload,
        idempotency_key=key,
        status="pending",
        max_attempts=max_attempts,
    )
    db.add(item)
    await db.flush()
    return item


def retry_delay(attempt_count: int) -> timedelta:
    """Bounded exponential backoff: 1m, 2m, 4m ... max 6h."""
    minutes = min(360, 2 ** max(0, attempt_count - 1))
    return timedelta(minutes=minutes)


async def recover_stale_processing(
    db: AsyncSession,
    *,
    stale_after: timedelta = timedelta(minutes=15),
) -> int:
    cutoff = datetime.now(timezone.utc) - stale_after
    result = await db.execute(
        update(NotificationOutbox)
        .where(
            NotificationOutbox.status == "processing",
            NotificationOutbox.locked_at.is_not(None),
            NotificationOutbox.locked_at < cutoff,
        )
        .values(
            status="retry",
            locked_at=None,
            next_attempt_at=datetime.now(timezone.utc),
            last_error="Reprise automatique après verrou de traitement expiré.",
        )
    )
    return int(result.rowcount or 0)


async def claim_due_notifications(
    db: AsyncSession,
    *,
    batch_size: int = 50,
) -> list[NotificationOutbox]:
    """Claim due rows safely across concurrent PostgreSQL workers."""
    now = datetime.now(timezone.utc)
    query = (
        select(NotificationOutbox)
        .where(
            NotificationOutbox.status.in_(("pending", "retry")),
            or_(
                NotificationOutbox.next_attempt_at.is_(None),
                NotificationOutbox.next_attempt_at <= now,
            ),
        )
        .order_by(NotificationOutbox.created_at.asc())
        .limit(batch_size)
        .with_for_update(skip_locked=True)
    )
    items = list((await db.execute(query)).scalars().all())
    for item in items:
        item.status = "processing"
        item.locked_at = now
    await db.flush()
    return items


async def process_outbox_batch(
    db: AsyncSession,
    registry: ProviderRegistry,
    *,
    batch_size: int = 50,
) -> dict[str, int]:
    """Process one outbox batch.

    Claims are committed before external network I/O, so workers never hold row
    locks while waiting on providers. A crashed worker is recovered by the stale
    processing guard on the next run.
    """
    recovered = await recover_stale_processing(db)
    items = await claim_due_notifications(db, batch_size=batch_size)
    await db.commit()

    counters = {
        "claimed": len(items),
        "sent": 0,
        "retry": 0,
        "dead_letter": 0,
        "blocked": 0,
        "recovered": recovered,
    }

    for item in items:
        provider = registry.get(item.channel)
        if provider is None:
            item.status = "blocked"
            item.provider_name = None
            item.last_error = f"Aucun fournisseur configuré pour le canal {item.channel}."
            item.locked_at = None
            counters["blocked"] += 1
            await db.commit()
            continue

        item.attempt_count += 1
        item.provider_name = provider.name
        await db.commit()

        try:
            result = await provider.send(item)
        except Exception as exc:  # provider boundary: always turn failure into durable state
            message = str(exc).strip() or exc.__class__.__name__
            item.last_error = message[:4000]
            item.locked_at = None
            if item.attempt_count >= item.max_attempts:
                item.status = "dead_letter"
                item.next_attempt_at = None
                counters["dead_letter"] += 1
            else:
                item.status = "retry"
                item.next_attempt_at = datetime.now(timezone.utc) + retry_delay(item.attempt_count)
                counters["retry"] += 1
            await db.commit()
            continue

        item.status = "sent"
        item.provider_name = result.provider_name
        item.provider_message_id = result.message_id
        item.last_error = None
        item.next_attempt_at = None
        item.locked_at = None
        item.sent_at = datetime.now(timezone.utc)
        counters["sent"] += 1
        await db.commit()

    return counters


class SmtpEmailProvider:
    name = "smtp"

    def __init__(
        self,
        *,
        host: str,
        port: int,
        from_email: str,
        username: str | None = None,
        password: str | None = None,
        starttls: bool = True,
        use_ssl: bool = False,
        timeout_seconds: float = 15.0,
    ):
        self.host = host
        self.port = port
        self.from_email = from_email
        self.username = username
        self.password = password
        self.starttls = starttls
        self.use_ssl = use_ssl
        self.timeout_seconds = timeout_seconds

    @classmethod
    def from_environment(cls) -> "SmtpEmailProvider | None":
        host = os.getenv("EADMIN_SMTP_HOST", "").strip()
        from_email = os.getenv("EADMIN_SMTP_FROM_EMAIL", "").strip()
        if not host or not from_email:
            return None
        return cls(
            host=host,
            port=int(os.getenv("EADMIN_SMTP_PORT", "587")),
            from_email=from_email,
            username=os.getenv("EADMIN_SMTP_USERNAME") or None,
            password=os.getenv("EADMIN_SMTP_PASSWORD") or None,
            starttls=os.getenv("EADMIN_SMTP_STARTTLS", "true").lower() in {"1", "true", "yes"},
            use_ssl=os.getenv("EADMIN_SMTP_SSL", "false").lower() in {"1", "true", "yes"},
        )

    async def send(self, notification: NotificationOutbox) -> DeliveryResult:
        if notification.channel != "email":
            raise ValueError("Le fournisseur SMTP ne peut envoyer que le canal email.")

        subject = str(notification.payload.get("subject") or notification.template_key)
        text_body = str(notification.payload.get("text") or notification.payload.get("body") or "")
        html_body = notification.payload.get("html")
        if not text_body and not html_body:
            raise ValueError("La notification email ne contient aucun corps.")

        message = EmailMessage()
        message["From"] = self.from_email
        message["To"] = notification.recipient
        message["Subject"] = subject

        domain = self.from_email.split("@", 1)[-1] if "@" in self.from_email else None
        message["Message-ID"] = make_msgid(idstring=notification.idempotency_key[:24], domain=domain)
        message["X-eAdmin-Idempotency-Key"] = notification.idempotency_key
        message.set_content(text_body or "Version HTML disponible.")
        if html_body:
            message.add_alternative(str(html_body), subtype="html")

        def _send() -> None:
            smtp_cls = smtplib.SMTP_SSL if self.use_ssl else smtplib.SMTP
            with smtp_cls(self.host, self.port, timeout=self.timeout_seconds) as client:
                if self.starttls and not self.use_ssl:
                    client.starttls()
                if self.username:
                    client.login(self.username, self.password or "")
                client.send_message(message)

        await asyncio.to_thread(_send)
        return DeliveryResult(provider_name=self.name, message_id=message["Message-ID"])


class WebhookNotificationProvider:
    """Provider-neutral bridge for SMS/WhatsApp delivery services.

    The configured endpoint receives a stable JSON contract and the eAdmin
    idempotency key. It can be backed by an operator-specific bridge without
    coupling the administrative application to one vendor SDK.
    """

    def __init__(
        self,
        *,
        channel: str,
        url: str,
        bearer_token: str | None = None,
        timeout_seconds: float = 15.0,
    ):
        if channel not in {"sms", "whatsapp"}:
            raise ValueError("WebhookNotificationProvider supporte sms ou whatsapp.")
        parsed = urlparse(url)
        if parsed.scheme != "https":
            raise ValueError("Le webhook de notification doit utiliser HTTPS.")
        self.channel = channel
        self.url = url
        self.bearer_token = bearer_token
        self.timeout_seconds = timeout_seconds
        self.name = f"{channel}_webhook"

    @classmethod
    def from_environment(cls, channel: str) -> "WebhookNotificationProvider | None":
        prefix = f"EADMIN_{channel.upper()}_WEBHOOK"
        url = os.getenv(f"{prefix}_URL", "").strip()
        if not url:
            return None
        return cls(
            channel=channel,
            url=url,
            bearer_token=os.getenv(f"{prefix}_TOKEN") or None,
        )

    async def send(self, notification: NotificationOutbox) -> DeliveryResult:
        if notification.channel != self.channel:
            raise ValueError("Canal incompatible avec ce fournisseur webhook.")
        headers = {
            "Content-Type": "application/json",
            "Idempotency-Key": notification.idempotency_key,
        }
        if self.bearer_token:
            headers["Authorization"] = f"Bearer {self.bearer_token}"

        body = {
            "channel": notification.channel,
            "recipient": notification.recipient,
            "event_type": notification.event_type,
            "template_key": notification.template_key,
            "payload": notification.payload,
            "idempotency_key": notification.idempotency_key,
        }
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(self.url, headers=headers, content=json.dumps(body))
            response.raise_for_status()
            message_id = None
            try:
                data = response.json()
                message_id = data.get("message_id") or data.get("id")
            except ValueError:
                pass
        return DeliveryResult(provider_name=self.name, message_id=str(message_id) if message_id else None)
