"""Runtime-safe mairie isolation checks for local Docker self-test.

This script intentionally uses only Python stdlib + application dependencies already
present in the backend runtime image. It mirrors the critical municipality scope
regressions without requiring pytest in production/local runtime images.
"""

from __future__ import annotations

import asyncio
import uuid
from unittest.mock import AsyncMock

from fastapi import HTTPException
from sqlalchemy import select

from app.api.service_requests import _apply_request_scope
from app.api.users import UserCreate, _target_scope_for_create, _validate_target_assignment
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
        hashed_password="not-used-in-scope-check",
        full_name=f"Local Scope {role.value}",
        role=role,
        tenant_id=tenant_id,
        institution_id=institution_id,
        is_active=True,
    )


def _compiled_scope(user: User) -> tuple[str, dict]:
    statement = _apply_request_scope(select(ServiceRequest), user)
    compiled = statement.compile()
    return str(compiled), compiled.params


def _create_payload(*, institution_id: str) -> UserCreate:
    return UserCreate(
        email="agent.scope@local.eadmin-guinee.org",
        password="LocalScope!2026Aa-test-password",
        full_name="Agent Scope Local Test",
        role=RoleEnum.AGENT,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id=institution_id,
    )


def _expect_http_status(callable_, expected_status: int) -> HTTPException:
    try:
        callable_()
    except HTTPException as exc:
        assert exc.status_code == expected_status, (
            f"HTTP {expected_status} attendu, reçu {exc.status_code}: {exc.detail}"
        )
        return exc
    raise AssertionError(f"HTTP {expected_status} attendu, aucune exception reçue")


def check_query_scopes() -> None:
    ratoma = _user(
        RoleEnum.ADMIN,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="mairie-ratoma-local-check",
    )
    sql, params = _compiled_scope(ratoma)
    assert "service_requests.tenant_id" in sql
    assert "service_requests.institution_id" in sql
    assert settings.TENANT_DEFAULT_ID in params.values()
    assert "mairie-ratoma-local-check" in params.values()
    assert "mairie-matoto-local-check" not in params.values()

    citizen = _user(RoleEnum.CITOYEN, tenant_id=settings.TENANT_DEFAULT_ID)
    sql, params = _compiled_scope(citizen)
    assert "service_requests.tenant_id" in sql
    assert "service_requests.citizen_id" in sql
    assert settings.TENANT_DEFAULT_ID in params.values()
    assert citizen.id in params.values()

    minister = _user(
        RoleEnum.MINISTRE,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="ministere-matd",
    )
    sql, params = _compiled_scope(minister)
    assert "service_requests.tenant_id" in sql
    assert "service_requests.institution_id" not in sql
    assert settings.TENANT_DEFAULT_ID in params.values()

    super_admin = _user(RoleEnum.SUPER_ADMIN, tenant_id=settings.TENANT_DEFAULT_ID)
    sql, params = _compiled_scope(super_admin)
    assert "service_requests.tenant_id" not in sql
    assert "service_requests.institution_id" not in sql
    assert params == {}

    orphan_admin = _user(
        RoleEnum.ADMIN,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id=None,
    )
    _expect_http_status(
        lambda: _apply_request_scope(select(ServiceRequest), orphan_admin),
        403,
    )


def check_creation_scope() -> None:
    actor = _user(
        RoleEnum.ADMIN,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="mairie-ratoma-local-check",
    )

    tenant_id, institution_id = _target_scope_for_create(
        actor,
        _create_payload(institution_id="mairie-ratoma-local-check"),
    )
    assert tenant_id == settings.TENANT_DEFAULT_ID
    assert institution_id == "mairie-ratoma-local-check"

    exc = _expect_http_status(
        lambda: _target_scope_for_create(
            actor,
            _create_payload(institution_id="mairie-matoto-local-check"),
        ),
        403,
    )
    assert "institution cible" in str(exc.detail).lower()


async def check_assignment_rules() -> None:
    mairie = Institution(
        id="mairie-ratoma-local-check",
        tenant_id=settings.TENANT_DEFAULT_ID,
        name="Mairie de Ratoma Local Check",
        type="mairie",
        is_active=True,
    )
    db = AsyncMock()
    db.scalar.side_effect = [mairie, uuid.uuid4()]

    try:
        await _validate_target_assignment(
            db,
            tenant_id=settings.TENANT_DEFAULT_ID,
            institution_id=mairie.id,
            role=RoleEnum.ADMIN,
        )
    except HTTPException as exc:
        assert exc.status_code == 409, f"HTTP 409 attendu, reçu {exc.status_code}"
        assert "déjà un administrateur actif" in str(exc.detail)
    else:
        raise AssertionError("Un second ADMIN actif de mairie aurait dû être refusé")

    agence = Institution(
        id="agence-local-check",
        tenant_id=settings.TENANT_DEFAULT_ID,
        name="Agence Local Check",
        type="agence",
        is_active=True,
    )
    db = AsyncMock()
    db.scalar.return_value = agence

    try:
        await _validate_target_assignment(
            db,
            tenant_id=settings.TENANT_DEFAULT_ID,
            institution_id=agence.id,
            role=RoleEnum.MAIRIE,
        )
    except HTTPException as exc:
        assert exc.status_code == 422, f"HTTP 422 attendu, reçu {exc.status_code}"
    else:
        raise AssertionError("Le rôle MAIRIE ne doit pas pouvoir cibler une agence")


async def main() -> None:
    check_query_scopes()
    check_creation_scope()
    await check_assignment_rules()
    print("PASS: isolation multi-mairie runtime (sans pytest)")


if __name__ == "__main__":
    asyncio.run(main())
