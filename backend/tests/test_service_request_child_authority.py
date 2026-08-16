"""Application-level authority checks for service-request child records."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api import service_request_files
from app.models.user import RoleEnum


def _db_with_attachment(attachment):
    result = MagicMock()
    result.scalar_one_or_none.return_value = attachment
    db = MagicMock()
    db.execute = AsyncMock(return_value=result)
    db.delete = AsyncMock()
    db.flush = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_citizen_cannot_delete_attachment_uploaded_by_another_user(monkeypatch):
    request_id = uuid.uuid4()
    attachment_id = uuid.uuid4()
    citizen_id = uuid.uuid4()
    attachment = SimpleNamespace(
        id=attachment_id,
        request_id=request_id,
        uploaded_by=uuid.uuid4(),
        object_key="service-requests/tenant-a/request-a/other/file.pdf",
    )
    db = _db_with_attachment(attachment)
    current_user = SimpleNamespace(id=citizen_id, role=RoleEnum.CITOYEN)
    load_request = AsyncMock(return_value=SimpleNamespace(id=request_id))
    storage_delete = AsyncMock()

    monkeypatch.setattr(service_request_files, "_load_request", load_request)
    monkeypatch.setattr(service_request_files.object_storage, "delete", storage_delete)

    with pytest.raises(HTTPException) as exc:
        await service_request_files.delete_service_request_attachment(
            request_id=request_id,
            attachment_id=attachment_id,
            request=MagicMock(),
            db=db,
            current_user=current_user,
        )

    assert exc.value.status_code == 403
    load_request.assert_awaited_once_with(db, request_id, current_user)
    db.delete.assert_not_awaited()
    db.flush.assert_not_awaited()
    storage_delete.assert_not_awaited()


@pytest.mark.asyncio
async def test_citizen_can_delete_own_attachment_after_parent_scope_check(monkeypatch):
    request_id = uuid.uuid4()
    attachment_id = uuid.uuid4()
    citizen_id = uuid.uuid4()
    attachment = SimpleNamespace(
        id=attachment_id,
        request_id=request_id,
        uploaded_by=citizen_id,
        object_key="service-requests/tenant-a/request-a/owner/file.pdf",
    )
    db = _db_with_attachment(attachment)
    current_user = SimpleNamespace(id=citizen_id, role=RoleEnum.CITOYEN)
    load_request = AsyncMock(return_value=SimpleNamespace(id=request_id))
    storage_delete = AsyncMock()

    monkeypatch.setattr(service_request_files, "_load_request", load_request)
    monkeypatch.setattr(service_request_files.object_storage, "delete", storage_delete)

    await service_request_files.delete_service_request_attachment(
        request_id=request_id,
        attachment_id=attachment_id,
        request=MagicMock(),
        db=db,
        current_user=current_user,
    )

    load_request.assert_awaited_once_with(db, request_id, current_user)
    db.delete.assert_awaited_once_with(attachment)
    db.flush.assert_awaited_once()
    storage_delete.assert_awaited_once_with(attachment.object_key)


@pytest.mark.asyncio
async def test_staff_delete_requires_central_requests_process_permission(monkeypatch):
    request_id = uuid.uuid4()
    attachment_id = uuid.uuid4()
    attachment = SimpleNamespace(
        id=attachment_id,
        request_id=request_id,
        uploaded_by=uuid.uuid4(),
        object_key="service-requests/tenant-a/request-a/staff/file.pdf",
    )
    db = _db_with_attachment(attachment)
    current_user = SimpleNamespace(id=uuid.uuid4(), role=RoleEnum.AGENT)
    request = MagicMock()
    load_request = AsyncMock(return_value=SimpleNamespace(id=request_id))
    permission_checker = AsyncMock(return_value=current_user)
    storage_delete = AsyncMock()
    permission_factory = MagicMock(return_value=permission_checker)

    monkeypatch.setattr(service_request_files, "_load_request", load_request)
    monkeypatch.setattr(service_request_files, "require_permission", permission_factory)
    monkeypatch.setattr(service_request_files.object_storage, "delete", storage_delete)

    await service_request_files.delete_service_request_attachment(
        request_id=request_id,
        attachment_id=attachment_id,
        request=request,
        db=db,
        current_user=current_user,
    )

    permission_factory.assert_called_once_with("requests", "process")
    permission_checker.assert_awaited_once_with(
        request=request,
        current_user=current_user,
        db=db,
    )
    db.delete.assert_awaited_once_with(attachment)
    storage_delete.assert_awaited_once_with(attachment.object_key)


@pytest.mark.asyncio
async def test_storage_failure_keeps_delete_transaction_fail_closed(monkeypatch):
    request_id = uuid.uuid4()
    attachment_id = uuid.uuid4()
    citizen_id = uuid.uuid4()
    attachment = SimpleNamespace(
        id=attachment_id,
        request_id=request_id,
        uploaded_by=citizen_id,
        object_key="service-requests/tenant-a/request-a/owner/failure.pdf",
    )
    db = _db_with_attachment(attachment)
    current_user = SimpleNamespace(id=citizen_id, role=RoleEnum.CITOYEN)

    monkeypatch.setattr(
        service_request_files,
        "_load_request",
        AsyncMock(return_value=SimpleNamespace(id=request_id)),
    )
    monkeypatch.setattr(
        service_request_files.object_storage,
        "delete",
        AsyncMock(side_effect=RuntimeError("storage unavailable")),
    )

    with pytest.raises(HTTPException) as exc:
        await service_request_files.delete_service_request_attachment(
            request_id=request_id,
            attachment_id=attachment_id,
            request=MagicMock(),
            db=db,
            current_user=current_user,
        )

    assert exc.value.status_code == 503
    assert "Suppression annulée" in exc.value.detail
    db.delete.assert_awaited_once_with(attachment)
    db.flush.assert_awaited_once()
