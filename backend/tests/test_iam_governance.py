"""Adversarial regression tests for IAM, ABAC and governed temporary access."""

from datetime import datetime, timedelta, timezone
import uuid

import pytest

from app.api.auth import create_access_token
from app.config import settings
from app.models.access_grant import AccessGrant
from app.models.user import RoleEnum, User
from app.services.authorization_service import authorization_service


def _headers(user: User, *, mfa_verified: bool = False) -> dict[str, str]:
    token_data = {
        "sub": str(user.id),
        "role": user.role.value,
        "frontend_role": user.role.to_frontend_role(),
        "tenant_id": user.tenant_id or settings.TENANT_DEFAULT_ID,
        "institution_id": user.institution_id or "",
    }
    if mfa_verified:
        token_data.update({"mfa_required": True, "mfa_verified": True})
    token = create_access_token(token_data)
    return {"Authorization": f"Bearer {token}"}


async def _user(
    db_session,
    *,
    email: str,
    role: RoleEnum,
    tenant_id: str = settings.TENANT_DEFAULT_ID,
    institution_id: str | None = "inst-a",
    mfa_enabled: bool = False,
) -> User:
    user = User(
        email=email,
        hashed_password="not-used-by-direct-jwt-tests",
        full_name=email.split("@")[0],
        role=role,
        tenant_id=tenant_id,
        institution_id=institution_id,
        institution=institution_id,
        is_active=True,
        mfa_enabled=mfa_enabled,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.mark.asyncio
async def test_admin_cannot_promote_to_superadmin_through_either_user_creation_path(
    client,
    db_session,
    admin_user,
):
    admin_user.tenant_id = settings.TENANT_DEFAULT_ID
    admin_user.institution_id = "inst-a"
    admin_user.institution = "inst-a"
    await db_session.commit()
    headers = _headers(admin_user)

    payload = {
        "email": "forbidden.superadmin@eadmin.gn",
        "password": "VeryStrong2026!",
        "full_name": "Forbidden Super Admin",
        "role": "SUPER_ADMIN",
        "tenant_id": settings.TENANT_DEFAULT_ID,
        "institution_id": "inst-a",
    }

    users_response = await client.post("/api/v1/users", headers=headers, json=payload)
    assert users_response.status_code == 403, users_response.text

    auth_response = await client.post(
        "/api/v1/auth/admin/create-user",
        headers=headers,
        json=payload,
    )
    assert auth_response.status_code == 403, auth_response.text


@pytest.mark.asyncio
async def test_admin_can_create_only_lower_role_inside_own_scope(
    client,
    db_session,
    admin_user,
):
    admin_user.tenant_id = settings.TENANT_DEFAULT_ID
    admin_user.institution_id = "inst-a"
    admin_user.institution = "inst-a"
    await db_session.commit()

    response = await client.post(
        "/api/v1/users",
        headers=_headers(admin_user),
        json={
            "email": "scoped.agent@eadmin.gn",
            "password": "VeryStrong2026!",
            "full_name": "Scoped Agent",
            "role": "AGENT",
            "tenant_id": settings.TENANT_DEFAULT_ID,
            "institution_id": "inst-a",
            "institution": "Institution A",
        },
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["role"] == "AGENT"
    assert payload["tenant_id"] == settings.TENANT_DEFAULT_ID
    assert payload["institution_id"] == "inst-a"


@pytest.mark.asyncio
async def test_temporary_grant_requires_mfa_and_cannot_escape_tenant(db_session):
    requester = await _user(
        db_session,
        email="director.iam@eadmin.gn",
        role=RoleEnum.DIRECTEUR,
    )
    grantee = await _user(
        db_session,
        email="agent.iam@eadmin.gn",
        role=RoleEnum.AGENT,
    )
    now = datetime.now(timezone.utc)
    grant = AccessGrant(
        grant_type="delegation",
        status="active",
        grantee_id=grantee.id,
        requested_by=requester.id,
        approved_by=uuid.uuid4(),
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-a",
        resource="workflows",
        action="manage",
        reason="Continuité temporaire du service administratif",
        requires_mfa=True,
        valid_from=now - timedelta(minutes=5),
        valid_until=now + timedelta(hours=2),
    )
    db_session.add(grant)
    await db_session.commit()

    without_mfa = await authorization_service.authorize(
        user=grantee,
        resource="workflows",
        action="manage",
        db=db_session,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-a",
        mfa_verified=False,
    )
    assert without_mfa.allowed is False

    with_mfa = await authorization_service.authorize(
        user=grantee,
        resource="workflows",
        action="manage",
        db=db_session,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-a",
        mfa_verified=True,
    )
    assert with_mfa.allowed is True
    assert with_mfa.source == "delegation"
    assert with_mfa.grant_id == grant.id

    cross_tenant = await authorization_service.authorize(
        user=grantee,
        resource="workflows",
        action="manage",
        db=db_session,
        tenant_id="other-tenant",
        institution_id="inst-a",
        mfa_verified=True,
    )
    assert cross_tenant.allowed is False


@pytest.mark.asyncio
async def test_expired_temporary_grant_never_authorizes(db_session):
    requester = await _user(
        db_session,
        email="director.expired@eadmin.gn",
        role=RoleEnum.DIRECTEUR,
    )
    grantee = await _user(
        db_session,
        email="agent.expired@eadmin.gn",
        role=RoleEnum.AGENT,
    )
    now = datetime.now(timezone.utc)
    db_session.add(
        AccessGrant(
            grant_type="delegation",
            status="active",
            grantee_id=grantee.id,
            requested_by=requester.id,
            approved_by=uuid.uuid4(),
            tenant_id=settings.TENANT_DEFAULT_ID,
            institution_id="inst-a",
            resource="workflows",
            action="manage",
            reason="Ancienne délégation désormais expirée",
            requires_mfa=True,
            valid_from=now - timedelta(hours=3),
            valid_until=now - timedelta(hours=1),
        )
    )
    await db_session.commit()

    decision = await authorization_service.authorize(
        user=grantee,
        resource="workflows",
        action="manage",
        db=db_session,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-a",
        mfa_verified=True,
    )
    assert decision.allowed is False


@pytest.mark.asyncio
async def test_delegation_requires_independent_mfa_approver(
    client,
    db_session,
):
    requester = await _user(
        db_session,
        email="director.requester@eadmin.gn",
        role=RoleEnum.DIRECTEUR,
    )
    approver = await _user(
        db_session,
        email="director.approver@eadmin.gn",
        role=RoleEnum.DIRECTEUR,
        mfa_enabled=True,
    )
    grantee = await _user(
        db_session,
        email="agent.grantee@eadmin.gn",
        role=RoleEnum.AGENT,
    )
    await db_session.commit()

    create_response = await client.post(
        "/api/v1/access-control/grants",
        headers=_headers(requester),
        json={
            "grantee_id": str(grantee.id),
            "grant_type": "delegation",
            "resource": "documents",
            "action": "delete",
            "reason": "Remplacement temporaire pendant absence du responsable",
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        },
    )
    assert create_response.status_code == 201, create_response.text
    grant_id = create_response.json()["id"]

    self_approval = await client.post(
        f"/api/v1/access-control/grants/{grant_id}/approve",
        headers=_headers(requester),
    )
    assert self_approval.status_code == 403

    approval = await client.post(
        f"/api/v1/access-control/grants/{grant_id}/approve",
        headers=_headers(approver, mfa_verified=True),
    )
    assert approval.status_code == 200, approval.text
    assert approval.json()["status"] == "active"
    assert approval.json()["approved_by"] == str(approver.id)


@pytest.mark.asyncio
async def test_break_glass_requires_incident_ticket(client, db_session):
    requester = await _user(
        db_session,
        email="root.requester@eadmin.gn",
        role=RoleEnum.SUPER_ADMIN,
        institution_id=None,
    )
    grantee = await _user(
        db_session,
        email="agent.breakglass@eadmin.gn",
        role=RoleEnum.AGENT,
    )
    await db_session.commit()

    response = await client.post(
        "/api/v1/access-control/grants",
        headers=_headers(requester),
        json={
            "grantee_id": str(grantee.id),
            "grant_type": "break_glass",
            "resource": "settings",
            "action": "update",
            "tenant_id": settings.TENANT_DEFAULT_ID,
            "institution_id": "inst-a",
            "reason": "Accès d'urgence encadré pour incident critique national",
            "valid_until": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        },
    )
    assert response.status_code == 422, response.text
    assert "ticket" in response.text.lower()
