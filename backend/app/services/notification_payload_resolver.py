"""Resolve ephemeral notification payloads immediately before provider delivery."""

from types import SimpleNamespace

from app.models.notification_outbox import NotificationOutbox
from app.services.mobile_verification import mobile_verification_service


async def materialize_notification(notification: NotificationOutbox):
    """Return a provider-safe notification view.

    Verification codes are fetched from Redis only at delivery time. The raw OTP
    therefore never appears in the durable outbox payload, database dumps or
    dead-letter rows.

    Provider-boundary tests and legacy adapters may pass notification-like
    objects with only the fields their provider needs. Treat anything without
    the explicit OTP template as an ordinary notification and return it
    untouched.
    """
    if getattr(notification, "template_key", None) != "mobile_verification_code":
        return notification

    challenge_id = str(notification.payload.get("challenge_id") or "").strip()
    if not challenge_id:
        raise RuntimeError("Challenge OTP absent du payload de vérification.")

    code = await mobile_verification_service.get_delivery_code(challenge_id)
    if not code:
        raise RuntimeError("Code OTP expiré ou indisponible pour livraison.")

    return SimpleNamespace(
        channel=notification.channel,
        recipient=notification.recipient,
        event_type=notification.event_type,
        template_key=notification.template_key,
        idempotency_key=notification.idempotency_key,
        payload={
            "text": (
                f"Votre code eAdmin Guinée est {code}. Il expire dans 10 minutes. "
                "Ne partagez jamais ce code."
            ),
            "purpose": "phone_verification",
        },
    )
