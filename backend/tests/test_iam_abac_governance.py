"""National IAM governance regression tests."""

from datetime import datetime, timedelta, timezone
import uuid

import pytest
from starlette.requests import Request

from app.api.iam_governance import SecurityAttributesUpdate, update_security_attributes
from app.models.access_grant import AccessGrant
from app.models.user import RoleEnum, User
from app.services.authorization_service import authorization_service
from app.services.iam_policy import evaluate_security_attributes


def _request_with_mfa(verified: bool = True) -> Request:
    request = Request(
        {
            "type": "http",
            "method": "PUT",
            "path": "/",
            "headers": [],
            "client": ("127.0.0.1", 12345),
        }
    )
    request.state.jwt_payload = {"mfa_verified": verified}
    return request


def test_sensitive_policy_requires_attributes_and_mfa():
    subject = type(
        "Subject",
        (),
        {
            "employment_status": "active",
            "security_clearance": 4,
            "assurance_level": 3,
            "privileged_account": True,
        },
    )()

    denied = evaluate_security_attributes(
        subject,
        resource="settings",
        action="update",
        mfa_verified=False,
    )
    assert denied.allowed is False
    assert denied.reason == "verified_mfa_required"

    allowed = evaluate_security_attributes(
        subject,
        resource="settings",
        action="update",
        mfa_verified=True,
    )
    assert allowed.allowed is True


def test_suspended_account_fails_even_for_ordinary_permission():
    subject = type(
        "Subject",
        (),
        {
            "employment_status": "suspended",
            "security_clearance": 4,
            "assurance_level": 4,
            "privileged_account": True,
        },
    )()
    decision = evaluate_security_attributes(
        subject,
        resource="documents",
        action="read",
        mfa_verified=True,
    )
    assert decision.allowed is False
    assert decision.reason == "employment_not_active"


@pytest.mark.asyncio
async def test_temporary_approval_cannot_create_maker_checker_conflict(db_session):
    user = User(
        email="maker@eadmin.gn",
        hashed_password="x",
        full_name="Maker",
        role=RoleEnum.AGENT,
        tenant_id="republique-de-guinee",
        institution_id="justice",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    # AGENT permanently has requests:process. A temporary approve permission
    # would make the same person maker and checker.
    assert await authorization_service.would_violate_sod(
        user=user,
        resource="requests",
        action="approve",
        db=db_session,
    ) is True


@pytest.mark.asyncio
async def test_sensitive_permanent_permission_needs_local_abac_attributes(db_session):
    user = User(
        email="root-abac@eadmin.gn",
        hashed_password="x",
        full_name="Root ABAC",
        role=RoleEnum.SUPER_ADMIN,
        tenant_id="republique-de-guinee",
        is_active=True,
        mfa_enabled=True,
        employment_status="active",
        security_clearance=4,
        assurance_level=3,
        privileged_account=True,
    )
    db_session.add(user)
    await db_session.flush()

    denied = await authorization_service.authorize(
        user=user,
        resource="tenants",
        action="manage",
        db=db_session,
        tenant_id="republique-de-guinee",
        mfa_verified=False,
    )
    assert denied.allowed is False
    assert denied.reason == "verified_mfa_required"

    allowed = await authorization_service.authorize(
        user=user,
        resource="tenants",
        action="manage",
        db=db_session,
        tenant_id="republique-de-guinee",
        mfa_verified=True,
    )
    assert allowed.allowed is True
    assert allowed.source == "role"


@pytest.mark.asyncio
async def test_break_glass_requires_privileged_assured_account(db_session):
    requester = User(
        id=uuid.uuid4(),
        email="sponsor@eadmin.gn",
        hashed_password="x",
        full_name="Sponsor",
        role=RoleEnum.SUPER_ADMIN,
        tenant_id="republique-de-guinee",
        is_active=True,
    )
    approver = User(
        id=uuid.uuid4(),
        email="approver@eadmin.gn",
        hashed_password="x",
        full_name="Approver",
        role=RoleEnum.SUPER_ADMIN,
        tenant_id="republique-de-guinee",
        is_active=True,
    )
    grantee = User(
        id=uuid.uuid4(),
        email="emergency@eadmin.gn",
        hashed_password="x",
        full_name="Emergency",
        role=RoleEnum.AGENT,
        tenant_id="republique-de-guinee",
        institution_id="justice",
        is_active=True,
        employment_status="active",
        security_clearance=4,
        assurance_level=3,
        privileged_account=False,
    )
    db_session.add_all([requester, approver, grantee])
    await db_session.flush()

    now = datetime.now(timezone.utc)
    grant = AccessGrant(
        grant_type="break_glass",
        status="active",
        grantee_id=grantee.id,
        requested_by=requester.id,
        approved_by=approver.id,
        tenant_id="republique-de-guinee",
        institution_id="justice",
        resource="settings",
        action="update",
        reason="Incident national critique nécessitant une intervention immédiate",
        ticket_reference="INC-2026-0001",
        requires_mfa=True,
        valid_from=now - timedelta(minutes=1),
        valid_until=now + timedelta(hours=1),
        approved_at=now,
    )
    db_session.add(grant)
    await db_session.flush()

    denied = await authorization_service.authorize(
        user=grantee,
        resource="settings",
        action="update",
        db=db_session,
        tenant_id="republique-de-guinee",
        institution_id="justice",
        mfa_verified=True,
    )
    assert denied.allowed is False

    grantee.privileged_account = True
    await db_session.flush()
    allowed = await authorization_service.authorize(
        user=grantee,
        resource="settings",
        action="update",
        db=db_session,
        tenant_id="republique-de-guinee",
        institution_id="justice",
        mfa_verified=True,
    )
    assert allowed.allowed is True
    assert allowed.source == "break_glass"
    assert allowed.grant_id == grant.id


@pytest.mark.asyncio
async def test_super_admin_cannot_review_own_privileged_attributes(db_session):
    actor = User(
        email="self-review@eadmin.gn",
        hashed_password="x",
        full_name="Self Reviewer",
        role=RoleEnum.SUPER_ADMIN,
        tenant_id="republique-de-guinee",
        is_active=True,
        mfa_enabled=True,
        security_clearance=4,
        assurance_level=3,
        privileged_account=True,
    )
    db_session.add(actor)
    await db_session.flush()

    body = SecurityAttributesUpdate(
        employment_status="active",
        security_clearance=4,
        assurance_level=3,
        privileged_account=True,
        reason="Revue périodique des habilitations privilégiées",
    )
    with pytest.raises(Exception) as exc_info:
        await update_security_attributes(
            user_id=actor.id,
            body=body,
            request=_request_with_mfa(True),
            db=db_session,
            current_user=actor,
        )
    assert getattr(exc_info.value, "status_code", None) == 403
