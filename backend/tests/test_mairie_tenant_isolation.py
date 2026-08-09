"""Regression tests for municipality-scoped administration and dossiers."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.service_requests import _apply_request_scope
from app.api.users import _validate_target_assignment
from app.config import settings
from app.models.institution import Institution
from app.models.service_request import ServiceRequest
from app.models.user import RoleEnum, User


def _user(
    role: RoleEnum,
    *,
    tenant_id: str | None = None,
    institution_id: str | None = None,
) -> User:
    return User(
        id=uuid.uuid4(),
        email=f"{role.value.lower()}-{uuid.uuid4().hex[:8]}@eadmin.test",
        hashed_password="not-used-in-scope-tests",
        full_name=f"Test {role.value}",
        role=role,
        tenant_id=tenant_id,
        institution_id=institution_id,
        is_active=True,
    )


def _compiled_scope(user: User) -> tuple[str, dict]:
    statement = _apply_request_scope(select(ServiceRequest), user)
    compiled = statement.compile()
    return str(compiled), compiled.params


def test_mairie_admin_query_is_bound_to_tenant_and_own_institution() -> None:
    user = _user(
        RoleEnum.ADMIN,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="mairie-ratoma",
    )

    sql, params = _compiled_scope(user)

    assert "service_requests.tenant_id" in sql
    assert "service_requests.institution_id" in sql
    assert settings.TENANT_DEFAULT_ID in params.values()
    assert "mairie-ratoma" in params.values()


def test_other_mairie_never_appears_in_admin_scope() -> None:
    user = _user(
        RoleEnum.ADMIN,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="mairie-ratoma",
    )

    _, params = _compiled_scope(user)

    assert "mairie-ratoma" in params.values()
    assert "mairie-matoto" not in params.values()


def test_citizen_query_is_bound_to_tenant_and_owner() -> None:
    user = _user(RoleEnum.CITOYEN, tenant_id=settings.TENANT_DEFAULT_ID)

    sql, params = _compiled_scope(user)

    assert "service_requests.tenant_id" in sql
    assert "service_requests.citizen_id" in sql
    assert settings.TENANT_DEFAULT_ID in params.values()
    assert user.id in params.values()


def test_minister_is_tenant_wide_but_not_cross_tenant() -> None:
    user = _user(
        RoleEnum.MINISTRE,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="ministere-matd",
    )

    sql, params = _compiled_scope(user)

    assert "service_requests.tenant_id" in sql
    assert "service_requests.institution_id" not in sql
    assert settings.TENANT_DEFAULT_ID in params.values()


def test_super_admin_scope_is_global() -> None:
    user = _user(RoleEnum.SUPER_ADMIN, tenant_id=settings.TENANT_DEFAULT_ID)

    sql, params = _compiled_scope(user)

    assert "service_requests.tenant_id" not in sql
    assert "service_requests.institution_id" not in sql
    assert params == {}


def test_operational_account_without_institution_fails_closed() -> None:
    user = _user(RoleEnum.ADMIN, tenant_id=settings.TENANT_DEFAULT_ID, institution_id=None)

    with pytest.raises(HTTPException) as error:
        _apply_request_scope(select(ServiceRequest), user)

    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_second_active_admin_for_same_mairie_is_rejected() -> None:
    mairie = Institution(
        id="mairie-ratoma",
        tenant_id=settings.TENANT_DEFAULT_ID,
        name="Mairie de Ratoma",
        type="mairie",
        is_active=True,
    )
    db = AsyncMock()
    # First scalar() resolves the locked institution, second finds an existing
    # active ADMIN in this exact tenant+institution.
    db.scalar.side_effect = [mairie, uuid.uuid4()]

    with pytest.raises(HTTPException) as error:
        await _validate_target_assignment(
            db,
            tenant_id=settings.TENANT_DEFAULT_ID,
            institution_id=mairie.id,
            role=RoleEnum.ADMIN,
        )

    assert error.value.status_code == 409
    assert "déjà un administrateur actif" in str(error.value.detail)


@pytest.mark.asyncio
async def test_mairie_role_must_target_a_mairie_institution() -> None:
    agence = Institution(
        id="anip",
        tenant_id=settings.TENANT_DEFAULT_ID,
        name="ANIP",
        type="agence",
        is_active=True,
    )
    db = AsyncMock()
    db.scalar.return_value = agence

    with pytest.raises(HTTPException) as error:
        await _validate_target_assignment(
            db,
            tenant_id=settings.TENANT_DEFAULT_ID,
            institution_id=agence.id,
            role=RoleEnum.MAIRIE,
        )

    assert error.value.status_code == 422
