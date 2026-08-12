"""Regression tests for the application-layer service-request hierarchy scope."""

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects import postgresql

from app.api.service_requests import _apply_request_scope
from app.models.service_request import ServiceRequest
from app.models.user import RoleEnum, User


def _user(role: RoleEnum, *, institution_id: str | None = "direction-justice") -> User:
    return User(
        id=uuid.uuid4(),
        email=f"{role.value.lower()}-{uuid.uuid4().hex[:8]}@example.test",
        hashed_password="not-used",
        full_name=role.value,
        role=role,
        tenant_id="tenant-a",
        institution_id=institution_id,
    )


def _compiled_scope(role: RoleEnum, *, institution_id: str | None = "direction-justice") -> str:
    query = _apply_request_scope(select(ServiceRequest), _user(role, institution_id=institution_id))
    return str(
        query.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )


def test_directeur_scope_uses_recursive_tenant_bound_institution_graph():
    sql = _compiled_scope(RoleEnum.DIRECTEUR)

    assert "WITH RECURSIVE director_request_scope" in sql
    assert "institutions.parent_id" in sql
    assert "institutions.tenant_id = 'tenant-a'" in sql
    assert "institutions.is_active IS true" in sql
    assert "service_requests.tenant_id = 'tenant-a'" in sql
    assert "service_requests.institution_id IN" in sql


def test_operational_admin_scope_remains_exact_institution():
    sql = _compiled_scope(RoleEnum.ADMIN)

    assert "WITH RECURSIVE" not in sql
    assert "service_requests.tenant_id = 'tenant-a'" in sql
    assert "service_requests.institution_id = 'direction-justice'" in sql


def test_ministre_scope_remains_tenant_wide():
    sql = _compiled_scope(RoleEnum.MINISTRE)

    assert "WITH RECURSIVE" not in sql
    assert "service_requests.tenant_id = 'tenant-a'" in sql
    assert "service_requests.institution_id =" not in sql


def test_directeur_without_institution_fails_closed():
    with pytest.raises(HTTPException) as exc_info:
        _apply_request_scope(
            select(ServiceRequest),
            _user(RoleEnum.DIRECTEUR, institution_id=None),
        )

    assert exc_info.value.status_code == 403
