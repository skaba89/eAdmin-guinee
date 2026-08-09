"""Service-request lifecycle notification invariants."""

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

from sqlalchemy.orm import attributes

from app.models.service_request import ServiceRequest, ServiceRequestStatusEnum
from app.services.mobile_verification import MOBILE_CONSENT_VERSION
from app.services.service_request_notification_events import (
    _citizen_channels,
    build_request_notification_spec,
    enqueue_request_status_email,
    enqueue_request_submitted_email,
)


def _request(status: ServiceRequestStatusEnum = ServiceRequestStatusEnum.SOUMISE) -> ServiceRequest:
    return ServiceRequest(
        id=uuid.uuid4(),
        reference="GN-2026-EMAIL001",
        service_name="Attestation administrative",
        assigned_service="Institution pilote",
        citizen_email="citizen@example.gn",
        citizen_nin="NIN-SECRET-123",
        citizen_address="Adresse privée",
        motif="Motif privé de la démarche",
        status=status,
        tenant_id="default",
        institution_id="institution-pilote",
    )


def _sqlite_connection() -> MagicMock:
    connection = MagicMock()
    connection.dialect = SimpleNamespace(name="sqlite")
    return connection


def _preference_connection(row: dict) -> MagicMock:
    connection = _sqlite_connection()
    result = MagicMock()
    result.mappings.return_value.first.return_value = row
    connection.execute.return_value = result
    return connection


def _executed_params(connection: MagicMock) -> dict:
    statement = connection.execute.call_args.args[0]
    return statement.compile().params


def test_submission_email_is_privacy_minimized():
    request = _request()
    spec = build_request_notification_spec(
        request,
        ServiceRequestStatusEnum.SOUMISE,
        submitted=True,
    )

    assert spec.event_type == "service_request.submitted"
    assert spec.template_key == "service_request_submitted"
    assert request.reference in spec.subject
    assert request.reference in spec.text
    assert request.service_name in spec.text
    assert request.assigned_service in spec.text

    serialized = f"{spec.subject}\n{spec.text}"
    assert request.citizen_nin not in serialized
    assert request.citizen_address not in serialized
    assert request.motif not in serialized


def test_status_templates_cover_every_authorized_citizen_state():
    request = _request()
    expected = {
        ServiceRequestStatusEnum.EN_COURS,
        ServiceRequestStatusEnum.PIECES_COMPLEMENTAIRES,
        ServiceRequestStatusEnum.VALIDEE,
        ServiceRequestStatusEnum.PRETE,
        ServiceRequestStatusEnum.LIVREE,
        ServiceRequestStatusEnum.REJETEE,
    }

    for status in expected:
        request.status = status
        spec = build_request_notification_spec(request, status)
        assert spec.event_type == f"service_request.status.{status.value}"
        assert spec.template_key == f"service_request_status_{status.value}"
        assert request.reference in spec.text
        assert request.citizen_nin not in spec.text
        assert request.motif not in spec.text


def test_rejection_email_does_not_leak_free_text_decision_reason():
    request = _request(ServiceRequestStatusEnum.REJETEE)
    spec = build_request_notification_spec(request, ServiceRequestStatusEnum.REJETEE)

    assert "Consultez votre dossier eAdmin" in spec.text
    assert "Motif privé" not in spec.text
    assert "NIN-SECRET" not in spec.text


def test_verified_current_consent_enables_requested_mobile_channels():
    request = _request()
    request.citizen_id = uuid.uuid4()
    connection = _preference_connection(
        {
            "email": "citizen@example.gn",
            "phone_e164": "+224620000001",
            "phone_verified_at": datetime.now(timezone.utc),
            "notification_email_enabled": True,
            "notification_sms_enabled": True,
            "notification_whatsapp_enabled": True,
            "notification_consent_version": MOBILE_CONSENT_VERSION,
        }
    )

    assert _citizen_channels(connection, request) == [
        ("email", "citizen@example.gn"),
        ("sms", "+224620000001"),
        ("whatsapp", "+224620000001"),
    ]


def test_stale_or_missing_mobile_consent_blocks_mobile_channels():
    request = _request()
    request.citizen_id = uuid.uuid4()
    connection = _preference_connection(
        {
            "email": "citizen@example.gn",
            "phone_e164": "+224620000001",
            "phone_verified_at": datetime.now(timezone.utc),
            "notification_email_enabled": True,
            "notification_sms_enabled": True,
            "notification_whatsapp_enabled": True,
            "notification_consent_version": "old-policy-v0",
        }
    )

    assert _citizen_channels(connection, request) == [("email", "citizen@example.gn")]


def test_unverified_phone_never_receives_mobile_notification():
    request = _request()
    request.citizen_id = uuid.uuid4()
    connection = _preference_connection(
        {
            "email": "citizen@example.gn",
            "phone_e164": "+224620000001",
            "phone_verified_at": None,
            "notification_email_enabled": False,
            "notification_sms_enabled": True,
            "notification_whatsapp_enabled": True,
            "notification_consent_version": MOBILE_CONSENT_VERSION,
        }
    )

    assert _citizen_channels(connection, request) == []


def test_after_insert_enqueues_pending_email_in_same_transaction():
    request = _request()
    connection = _sqlite_connection()

    enqueue_request_submitted_email(None, connection, request)

    connection.execute.assert_called_once()
    params = _executed_params(connection)
    assert params["request_id"] == request.id
    assert params["tenant_id"] == "default"
    assert params["institution_id"] == "institution-pilote"
    assert params["event_type"] == "service_request.submitted"
    assert params["channel"] == "email"
    assert params["recipient"] == "citizen@example.gn"
    assert params["status"] == "pending"
    assert params["attempt_count"] == 0
    assert len(params["idempotency_key"]) == 64

    payload = params["payload"]
    assert payload["reference"] == request.reference
    assert payload["status"] == ServiceRequestStatusEnum.SOUMISE.value
    assert "NIN-SECRET" not in str(payload)
    assert "Adresse privée" not in str(payload)
    assert "Motif privé" not in str(payload)


def test_after_update_enqueues_only_when_status_changes():
    request = _request(ServiceRequestStatusEnum.EN_COURS)
    connection = _sqlite_connection()

    attributes.set_committed_value(request, "status", ServiceRequestStatusEnum.EN_COURS)
    request.status = ServiceRequestStatusEnum.VALIDEE
    enqueue_request_status_email(None, connection, request)

    connection.execute.assert_called_once()
    params = _executed_params(connection)
    assert params["event_type"] == "service_request.status.validee"
    assert params["template_key"] == "service_request_status_validee"
    assert params["payload"]["status"] == "validee"

    unchanged = _request(ServiceRequestStatusEnum.EN_COURS)
    second_connection = _sqlite_connection()
    attributes.set_committed_value(unchanged, "status", ServiceRequestStatusEnum.EN_COURS)
    unchanged.assigned_agent_name = "Agent Test"
    enqueue_request_status_email(None, second_connection, unchanged)
    second_connection.execute.assert_not_called()


def test_status_event_has_different_idempotency_key_from_submission():
    request = _request()
    submission_connection = _sqlite_connection()
    enqueue_request_submitted_email(None, submission_connection, request)
    submission_key = _executed_params(submission_connection)["idempotency_key"]

    attributes.set_committed_value(request, "status", ServiceRequestStatusEnum.SOUMISE)
    request.status = ServiceRequestStatusEnum.EN_COURS
    status_connection = _sqlite_connection()
    enqueue_request_status_email(None, status_connection, request)
    status_key = _executed_params(status_connection)["idempotency_key"]

    assert submission_key != status_key
