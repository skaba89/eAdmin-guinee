"""Core invariants for durable citizen service requests."""

import re
from datetime import datetime, timezone

from app.api.service_requests import (
    ALLOWED_TRANSITIONS,
    _add_business_days,
    _reference,
)
from app.models.service_request import ServiceRequestStatusEnum


def test_reference_is_server_generated_and_non_sequential():
    first = _reference()
    second = _reference()

    assert first != second
    assert re.fullmatch(r"GN-\d{4}-[0-9A-F]{10}", first)
    assert re.fullmatch(r"GN-\d{4}-[0-9A-F]{10}", second)


def test_terminal_request_states_cannot_transition():
    assert ALLOWED_TRANSITIONS[ServiceRequestStatusEnum.LIVREE] == set()
    assert ALLOWED_TRANSITIONS[ServiceRequestStatusEnum.REJETEE] == set()


def test_workflow_does_not_auto_reject_when_sla_date_passes():
    """The backend models SLA dates but has no automatic rejection transition."""
    assert ServiceRequestStatusEnum.REJETEE not in ALLOWED_TRANSITIONS[ServiceRequestStatusEnum.PRETE]
    assert ServiceRequestStatusEnum.REJETEE not in ALLOWED_TRANSITIONS[ServiceRequestStatusEnum.LIVREE]


def test_business_day_helper_skips_weekends():
    friday = datetime(2026, 8, 7, 12, 0, tzinfo=timezone.utc)
    monday = _add_business_days(friday, 1)
    assert monday.weekday() == 0
    assert monday.date().isoformat() == "2026-08-10"
