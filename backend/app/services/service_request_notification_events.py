"""Transactional notification events for citizen service requests.

This module registers SQLAlchemy mapper listeners. The listeners only persist an
email delivery intent in ``notification_outbox`` using the same PostgreSQL
transaction as the administrative request. They never contact SMTP, SMS or
WhatsApp providers directly.

Mobile channels intentionally remain disabled here until eAdmin has an explicit
verified-phone/opt-in policy. The outbox itself already supports those channels.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import event, inspect
from sqlalchemy.engine import Connection

from app.models.notification_outbox import NotificationOutbox
from app.models.service_request import ServiceRequest, ServiceRequestStatusEnum
from app.services.notification_outbox import build_idempotency_key


@dataclass(frozen=True)
class RequestNotificationSpec:
    event_type: str
    template_key: str
    subject: str
    text: str
    status_label: str


_STATUS_LABELS: dict[ServiceRequestStatusEnum, str] = {
    ServiceRequestStatusEnum.SOUMISE: "Soumise",
    ServiceRequestStatusEnum.EN_COURS: "En cours de traitement",
    ServiceRequestStatusEnum.PIECES_COMPLEMENTAIRES: "Pièces complémentaires requises",
    ServiceRequestStatusEnum.VALIDEE: "Validée",
    ServiceRequestStatusEnum.PRETE: "Document prêt",
    ServiceRequestStatusEnum.LIVREE: "Livrée",
    ServiceRequestStatusEnum.REJETEE: "Rejetée",
}


def build_request_notification_spec(
    request: ServiceRequest,
    status: ServiceRequestStatusEnum,
    *,
    submitted: bool = False,
) -> RequestNotificationSpec:
    """Build a privacy-minimized transactional citizen email.

    Deliberately excluded from email payloads: NIN, postal address, motif,
    attachments and free-text processing notes/rejection reasons.
    """
    label = _STATUS_LABELS[status]
    reference = request.reference
    service_name = request.service_name
    institution = request.assigned_service

    if submitted:
        return RequestNotificationSpec(
            event_type="service_request.submitted",
            template_key="service_request_submitted",
            subject=f"eAdmin Guinée — Demande {reference} reçue",
            text=(
                f"Votre demande {reference} pour « {service_name} » a été enregistrée "
                f"et transmise à {institution}. Vous pouvez suivre son avancement dans eAdmin Guinée."
            ),
            status_label=label,
        )

    event_type = f"service_request.status.{status.value}"
    template_key = f"service_request_status_{status.value}"
    messages: dict[ServiceRequestStatusEnum, str] = {
        ServiceRequestStatusEnum.EN_COURS: (
            f"Votre demande {reference} pour « {service_name} » est maintenant en cours de traitement."
        ),
        ServiceRequestStatusEnum.PIECES_COMPLEMENTAIRES: (
            f"Des pièces complémentaires sont requises pour votre demande {reference}. "
            "Consultez votre dossier eAdmin pour connaître les éléments demandés."
        ),
        ServiceRequestStatusEnum.VALIDEE: (
            f"Votre demande {reference} pour « {service_name} » a été validée."
        ),
        ServiceRequestStatusEnum.PRETE: (
            f"Le document lié à votre demande {reference} est prêt. "
            "Consultez eAdmin pour les modalités de retrait ou de livraison."
        ),
        ServiceRequestStatusEnum.LIVREE: (
            f"La livraison de votre demande {reference} est enregistrée comme terminée dans eAdmin."
        ),
        ServiceRequestStatusEnum.REJETEE: (
            f"Une décision concernant votre demande {reference} est disponible. "
            "Consultez votre dossier eAdmin pour le détail et les voies de traitement disponibles."
        ),
        ServiceRequestStatusEnum.SOUMISE: (
            f"Votre demande {reference} est enregistrée dans eAdmin Guinée."
        ),
    }
    return RequestNotificationSpec(
        event_type=event_type,
        template_key=template_key,
        subject=f"eAdmin Guinée — {reference} — {label}",
        text=messages[status],
        status_label=label,
    )


def _insert_email_intent(
    connection: Connection,
    request: ServiceRequest,
    spec: RequestNotificationSpec,
    *,
    dedupe_key: str,
) -> None:
    recipient = (request.citizen_email or "").strip().lower()
    tenant_id = (request.tenant_id or "").strip()
    if not recipient or not tenant_id:
        # A valid persisted request should always have both. Fail closed on the
        # notification side rather than jeopardising the administrative write.
        return

    key = build_idempotency_key(
        tenant_id=tenant_id,
        event_type=spec.event_type,
        channel="email",
        recipient=recipient,
        request_id=str(request.id),
        dedupe_key=dedupe_key,
    )
    values = {
        "id": uuid.uuid4(),
        "tenant_id": tenant_id,
        "institution_id": request.institution_id,
        "request_id": request.id,
        "event_type": spec.event_type,
        "channel": "email",
        "recipient": recipient,
        "template_key": spec.template_key,
        "payload": {
            "subject": spec.subject,
            "text": spec.text,
            "reference": request.reference,
            "service_name": request.service_name,
            "status": request.status.value,
            "status_label": spec.status_label,
        },
        "idempotency_key": key,
        "status": "pending",
        "attempt_count": 0,
        "max_attempts": 5,
    }

    # Administrative status transitions are monotonic in the workflow, so a
    # duplicate key should be exceptional. PostgreSQL still gets an explicit
    # ON CONFLICT guard to make reconnect/retry behaviour deterministic.
    if connection.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        statement = (
            pg_insert(NotificationOutbox)
            .values(**values)
            .on_conflict_do_nothing(index_elements=["idempotency_key"])
        )
    else:
        statement = NotificationOutbox.__table__.insert().values(**values)
    connection.execute(statement)


@event.listens_for(ServiceRequest, "after_insert")
def enqueue_request_submitted_email(mapper, connection: Connection, target: ServiceRequest) -> None:
    del mapper
    spec = build_request_notification_spec(
        target,
        ServiceRequestStatusEnum.SOUMISE,
        submitted=True,
    )
    _insert_email_intent(
        connection,
        target,
        spec,
        dedupe_key=f"submitted:{target.reference}",
    )


@event.listens_for(ServiceRequest, "after_update")
def enqueue_request_status_email(mapper, connection: Connection, target: ServiceRequest) -> None:
    del mapper
    history = inspect(target).attrs.status.history
    if not history.has_changes() or not history.added:
        return

    new_status = history.added[-1]
    if not isinstance(new_status, ServiceRequestStatusEnum):
        new_status = ServiceRequestStatusEnum(str(new_status))

    # Submission is handled by after_insert. A later transition back to
    # SOUMISE is not part of the authorised workflow and should not emit mail.
    if new_status == ServiceRequestStatusEnum.SOUMISE:
        return

    spec = build_request_notification_spec(target, new_status)
    _insert_email_intent(
        connection,
        target,
        spec,
        dedupe_key=f"status:{new_status.value}",
    )
