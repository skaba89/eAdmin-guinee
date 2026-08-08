"""Regression tests for trusted tenant/institution RLS enforcement."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.middleware.rls import _validate_requested_scope
from app.models.document import Document
from app.models.user import RoleEnum


def _request(tenant_id: str = "republique-de-guinee", institution_id: str = "inst-a") -> Request:
    request = Request({"type": "http", "method": "GET", "path": "/api/v1/documents", "headers": []})
    request.state.tenant_id = tenant_id
    request.state.institution_id = institution_id
    return request


def _user(role: RoleEnum = RoleEnum.AGENT, tenant_id: str = "republique-de-guinee", institution_id: str = "inst-a"):
    return SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        role=role,
        tenant_id=tenant_id,
        institution_id=institution_id,
    )


def test_cross_tenant_routing_hint_is_rejected():
    with pytest.raises(HTTPException) as exc:
        _validate_requested_scope(
            _request(tenant_id="other-tenant", institution_id="inst-a"),
            _user(),
        )
    assert exc.value.status_code == 403


def test_cross_institution_routing_hint_is_rejected():
    with pytest.raises(HTTPException) as exc:
        _validate_requested_scope(
            _request(institution_id="inst-b"),
            _user(institution_id="inst-a"),
        )
    assert exc.value.status_code == 403


def test_super_admin_can_cross_scope_for_national_operations():
    _validate_requested_scope(
        _request(tenant_id="other-tenant", institution_id="inst-b"),
        _user(role=RoleEnum.SUPER_ADMIN, institution_id="inst-a"),
    )


@pytest.mark.asyncio
async def test_orm_insert_scope_overrides_client_values(db_session, test_user):
    """Normal users cannot mass-assign another tenant/institution on INSERT."""

    test_user.tenant_id = "tenant-trusted"
    test_user.institution_id = "institution-trusted"
    await db_session.flush()

    db_session.sync_session.info["rls_scope"] = {
        "user_id": str(test_user.id),
        "tenant_id": "tenant-trusted",
        "institution_id": "institution-trusted",
        "role": RoleEnum.AGENT.value,
        "is_super_admin": False,
    }

    document = Document(
        title="RLS scope test",
        owner_id=test_user.id,
        tenant_id="tenant-attacker",
        institution_id="institution-attacker",
    )
    db_session.add(document)
    await db_session.flush()

    assert document.tenant_id == "tenant-trusted"
    assert document.institution_id == "institution-trusted"
