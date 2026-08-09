"""Core invariants for durable citizen service requests."""

import re
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.service_requests import (
    ALLOWED_TRANSITIONS,
    AssignmentUpdate,
    _add_business_days,
    _append_note,
    _default_timeline,
    _is_staff,
    _load_request,
    _reference,
    _status_permission_action,
    assign_service_request,
)
from app.models.service_request import ServiceRequestStatusEnum
from app.models.user import RoleEnum


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


def test_status_decisions_map_to_explicit_iam_permissions():
    assert _status_permission_action(ServiceRequestStatusEnum.VALIDEE) == "approve"
    assert _status_permission_action(ServiceRequestStatusEnum.REJETEE) == "reject"
    assert _status_permission_action(ServiceRequestStatusEnum.EN_COURS) == "process"
    assert _status_permission_action(ServiceRequestStatusEnum.PIECES_COMPLEMENTAIRES) == "process"
    assert _status_permission_action(ServiceRequestStatusEnum.PRETE) == "process"
    assert _status_permission_action(ServiceRequestStatusEnum.LIVREE) == "process"


def test_business_day_helper_skips_weekends():
    friday = datetime(2026, 8, 7, 12, 0, tzinfo=timezone.utc)
    monday = _add_business_days(friday, 1)
    assert monday.weekday() == 0
    assert monday.date().isoformat() == "2026-08-10"


def test_default_timeline_starts_with_submission_and_pending_processing():
    timeline = _default_timeline()

    assert len(timeline) == 6
    assert timeline[0]["label"] == "Soumission de la demande"
    assert timeline[0]["status"] == "completed"
    assert "date" in timeline[0]
    assert all(step["status"] == "pending" for step in timeline[1:])


def test_staff_detection_keeps_citizen_out_of_backoffice_actions():
    citizen = SimpleNamespace(role=RoleEnum.CITOYEN)
    agent = SimpleNamespace(role=RoleEnum.AGENT)

    assert _is_staff(citizen) is False
    assert _is_staff(agent) is True


@pytest.mark.asyncio
async def test_load_request_returns_scoped_request():
    expected = SimpleNamespace(id=uuid.uuid4())
    result = MagicMock()
    result.scalar_one_or_none.return_value = expected
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)

    assert await _load_request(db, expected.id) is expected
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_load_request_missing_is_fail_closed():
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)

    with pytest.raises(HTTPException) as exc:
        await _load_request(db, uuid.uuid4())

    assert exc.value.status_code == 404
    assert "périmètre" in exc.value.detail


@pytest.mark.asyncio
async def test_append_note_uses_authenticated_author_and_flushes():
    db = MagicMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    item = SimpleNamespace(id=uuid.uuid4())
    user = SimpleNamespace(
        id=uuid.uuid4(),
        full_name="Agent Test",
        role=RoleEnum.AGENT,
    )

    note = await _append_note(
        db,
        item,
        user,
        "Pièce vérifiée",
        "decision",
    )

    assert note.request_id == item.id
    assert note.author_id == user.id
    assert note.author_name == "Agent Test"
    assert note.author_role == RoleEnum.AGENT.value
    assert note.text == "Pièce vérifiée"
    assert note.note_type == "decision"
    db.add.assert_called_once_with(note)
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_assignment_uses_authenticated_agent_not_client_identity(monkeypatch):
    request_id = uuid.uuid4()
    spoofed_agent_id = uuid.uuid4()
    authenticated_agent_id = uuid.uuid4()
    item = SimpleNamespace(
        id=request_id,
        status=ServiceRequestStatusEnum.SOUMISE,
        assigned_agent_id=None,
        assigned_agent_name=None,
    )
    user = SimpleNamespace(
        id=authenticated_agent_id,
        full_name="Agent Authentifié",
        role=RoleEnum.AGENT,
    )
    db = MagicMock()
    db.flush = AsyncMock()

    load_request = AsyncMock(return_value=item)
    append_note = AsyncMock()
    monkeypatch.setattr("app.api.service_requests._load_request", load_request)
    monkeypatch.setattr("app.api.service_requests._append_note", append_note)
    monkeypatch.setattr(
        "app.api.service_requests._serialize_request",
        lambda request: {
            "assignedAgentId": str(request.assigned_agent_id),
            "assignedAgent": request.assigned_agent_name,
        },
    )

    result = await assign_service_request(
        request_id=request_id,
        payload=AssignmentUpdate(
            agent_id=spoofed_agent_id,
            agent_name="Identité fournie par le navigateur",
        ),
        db=db,
        current_user=user,
    )

    assert item.assigned_agent_id == authenticated_agent_id
    assert item.assigned_agent_name == "Agent Authentifié"
    assert result == {
        "assignedAgentId": str(authenticated_agent_id),
        "assignedAgent": "Agent Authentifié",
    }
    append_note.assert_awaited_once()
    assert "Agent Authentifié" in append_note.await_args.args[3]
    db.flush.assert_awaited_once()
