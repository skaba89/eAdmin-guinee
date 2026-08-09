"""Adversarial tests for Joiner-Mover-Leaver and access recertification."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock
import uuid

import pytest
from sqlalchemy import select

from app.api.auth import create_access_token
from app.config import settings
from app.models.access_grant import AccessGrant
from app.models.federated_identity import FederatedIdentity
from app.models.identity_lifecycle import (
    AccessReviewCampaign,
    AccessReviewItem,
    IdentityLifecycleEvent,
)
from app.models.user import RoleEnum, User
from app.services.access_review_service import AccessReviewError, access_review_service


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
    return {"Authorization": f"Bearer {create_access_token(token_data)}"}


async def _user(
    db_session,
    *,
    email: str,
    role: RoleEnum,
    institution_id: str | None = "inst-a",
    tenant_id: str = settings.TENANT_DEFAULT_ID,
    mfa_enabled: bool = False,
) -> User:
    user = User(
        email=email,
        hashed_password="not-used-in-lifecycle-tests",
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


def _patch_refresh_revocation(monkeypatch) -> AsyncMock:
    mocked = AsyncMock(return_value=2)
    monkeypatch.setattr(
        "app.services.identity_lifecycle_service.token_blacklist.revoke_all_user_tokens",
        mocked,
    )
    return mocked


@pytest.mark.asyncio
async def test_joiner_creation_persists_lifecycle_evidence(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
):
    response = await client.post(
        "/api/v1/users",
        headers=super_admin_auth_headers,
        json={
            "email": "joiner.agent@eadmin.gn",
            "password": "VeryStrong2026!",
            "full_name": "Joiner Agent",
            "role": "AGENT",
            "tenant_id": settings.TENANT_DEFAULT_ID,
            "institution_id": "inst-a",
        },
    )
    assert response.status_code == 201, response.text
    user_id = uuid.UUID(response.json()["id"])

    event = await db_session.scalar(
        select(IdentityLifecycleEvent).where(
            IdentityLifecycleEvent.user_id == user_id,
            IdentityLifecycleEvent.event_type == "joiner",
        )
    )
    assert event is not None
    assert event.actor_id == super_admin_user.id
    assert event.new_role == "AGENT"
    assert event.new_institution_id == "inst-a"


@pytest.mark.asyncio
async def test_mover_revokes_sessions_and_all_related_grants(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
    monkeypatch,
):
    revoke_refresh = _patch_refresh_revocation(monkeypatch)
    target = await _user(
        db_session,
        email="mover.agent@eadmin.gn",
        role=RoleEnum.AGENT,
        institution_id="inst-a",
    )
    beneficiary = await _user(
        db_session,
        email="beneficiary.agent@eadmin.gn",
        role=RoleEnum.AGENT,
        institution_id="inst-a",
    )
    now = datetime.now(timezone.utc)
    grants = [
        AccessGrant(
            grant_type="delegation",
            status="active",
            grantee_id=target.id,
            requested_by=super_admin_user.id,
            approved_by=super_admin_user.id,
            tenant_id=settings.TENANT_DEFAULT_ID,
            institution_id="inst-a",
            resource="documents",
            action="delete",
            reason="Existing target privilege",
            requires_mfa=True,
            valid_from=now - timedelta(minutes=5),
            valid_until=now + timedelta(hours=2),
        ),
        AccessGrant(
            grant_type="delegation",
            status="pending",
            grantee_id=beneficiary.id,
            requested_by=target.id,
            tenant_id=settings.TENANT_DEFAULT_ID,
            institution_id="inst-a",
            resource="documents",
            action="read",
            reason="Grant sponsored by mover",
            requires_mfa=True,
            valid_from=now,
            valid_until=now + timedelta(hours=2),
        ),
    ]
    db_session.add_all(grants)
    await db_session.commit()

    response = await client.put(
        f"/api/v1/users/{target.id}",
        headers=super_admin_auth_headers,
        json={"institution_id": "inst-b"},
    )
    assert response.status_code == 200, response.text
    await db_session.refresh(target)
    for grant in grants:
        await db_session.refresh(grant)

    assert target.institution_id == "inst-b"
    assert target.sessions_invalid_before is not None
    assert all(grant.status == "revoked" for grant in grants)
    assert all(grant.revoked_by == super_admin_user.id for grant in grants)
    revoke_refresh.assert_awaited_once_with(str(target.id))

    event = await db_session.scalar(
        select(IdentityLifecycleEvent).where(
            IdentityLifecycleEvent.user_id == target.id,
            IdentityLifecycleEvent.event_type == "mover",
        )
    )
    assert event is not None
    assert event.old_institution_id == "inst-a"
    assert event.new_institution_id == "inst-b"


@pytest.mark.asyncio
async def test_leaver_disables_sso_revokes_grants_and_sets_session_cutoff(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
    monkeypatch,
):
    revoke_refresh = _patch_refresh_revocation(monkeypatch)
    target = await _user(
        db_session,
        email="leaver.agent@eadmin.gn",
        role=RoleEnum.AGENT,
    )
    now = datetime.now(timezone.utc)
    grant = AccessGrant(
        grant_type="delegation",
        status="active",
        grantee_id=target.id,
        requested_by=super_admin_user.id,
        approved_by=super_admin_user.id,
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-a",
        resource="documents",
        action="read",
        reason="Temporary privilege before departure",
        requires_mfa=True,
        valid_from=now - timedelta(minutes=5),
        valid_until=now + timedelta(hours=1),
    )
    identity = FederatedIdentity(
        user_id=target.id,
        issuer="https://idp.gov.gn",
        subject="agent-leaver-subject",
        provider="oidc",
        status="active",
        linked_by=super_admin_user.id,
    )
    db_session.add_all([grant, identity])
    await db_session.commit()

    response = await client.delete(
        f"/api/v1/users/{target.id}",
        headers=super_admin_auth_headers,
    )
    assert response.status_code == 204, response.text
    await db_session.refresh(target)
    await db_session.refresh(grant)
    await db_session.refresh(identity)

    assert target.is_active is False
    assert target.sessions_invalid_before is not None
    assert grant.status == "revoked"
    assert identity.status == "disabled"
    assert identity.disabled_by == super_admin_user.id
    assert identity.disabled_at is not None
    revoke_refresh.assert_awaited_once_with(str(target.id))

    event = await db_session.scalar(
        select(IdentityLifecycleEvent).where(
            IdentityLifecycleEvent.user_id == target.id,
            IdentityLifecycleEvent.event_type == "leaver",
        )
    )
    assert event is not None
    assert event.details["federated_identities_disabled"] == 1


@pytest.mark.asyncio
async def test_recertification_campaign_requires_verified_mfa(
    client,
    db_session,
):
    director = await _user(
        db_session,
        email="review.director@eadmin.gn",
        role=RoleEnum.DIRECTEUR,
        mfa_enabled=True,
    )
    await _user(
        db_session,
        email="review.agent@eadmin.gn",
        role=RoleEnum.AGENT,
    )
    await db_session.commit()
    payload = {
        "name": "Revue trimestrielle Direction A",
        "reviewer_id": str(director.id),
        "due_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
    }

    denied = await client.post(
        "/api/v1/access-control/reviews",
        headers=_headers(director, mfa_verified=False),
        json=payload,
    )
    assert denied.status_code == 403, denied.text
    assert "MFA" in denied.text

    allowed = await client.post(
        "/api/v1/access-control/reviews",
        headers=_headers(director, mfa_verified=True),
        json=payload,
    )
    assert allowed.status_code == 201, allowed.text

    campaign_id = uuid.UUID(allowed.json()["id"])
    items = list(
        (
            await db_session.execute(
                select(AccessReviewItem).where(AccessReviewItem.campaign_id == campaign_id)
            )
        )
        .scalars()
        .all()
    )
    assert len(items) == 1
    assert items[0].snapshot_role == "AGENT"


@pytest.mark.asyncio
async def test_recertification_revoke_temporary_forces_new_session(
    client,
    db_session,
    monkeypatch,
):
    revoke_refresh = _patch_refresh_revocation(monkeypatch)
    director = await _user(
        db_session,
        email="revoke.director@eadmin.gn",
        role=RoleEnum.DIRECTEUR,
        mfa_enabled=True,
    )
    target = await _user(
        db_session,
        email="revoke.agent@eadmin.gn",
        role=RoleEnum.AGENT,
    )
    now = datetime.now(timezone.utc)
    grant = AccessGrant(
        grant_type="delegation",
        status="active",
        grantee_id=target.id,
        requested_by=director.id,
        approved_by=uuid.uuid4(),
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-a",
        resource="documents",
        action="delete",
        reason="Privilege to be recertified",
        requires_mfa=True,
        valid_from=now - timedelta(minutes=5),
        valid_until=now + timedelta(hours=1),
    )
    db_session.add(grant)
    await db_session.commit()

    campaign = await access_review_service.create_campaign(
        db=db_session,
        actor=director,
        name="Review revoke temporary",
        reviewer_id=director.id,
        due_at=now + timedelta(days=7),
    )
    item = await db_session.scalar(
        select(AccessReviewItem).where(
            AccessReviewItem.campaign_id == campaign.id,
            AccessReviewItem.user_id == target.id,
        )
    )
    assert item is not None
    await db_session.commit()

    response = await client.post(
        f"/api/v1/access-control/reviews/{campaign.id}/items/{item.id}/decision",
        headers=_headers(director, mfa_verified=True),
        json={
            "decision": "revoke_temporary",
            "reason": "Délégation non nécessaire pour le trimestre suivant",
        },
    )
    assert response.status_code == 200, response.text
    await db_session.refresh(target)
    await db_session.refresh(grant)
    await db_session.refresh(campaign)

    assert grant.status == "revoked"
    assert target.sessions_invalid_before is not None
    assert campaign.status == "completed"
    revoke_refresh.assert_awaited_once_with(str(target.id))


@pytest.mark.asyncio
async def test_recertification_disable_account_runs_full_leaver_controls(
    db_session,
    monkeypatch,
):
    _patch_refresh_revocation(monkeypatch)
    director = await _user(
        db_session,
        email="disable.director@eadmin.gn",
        role=RoleEnum.DIRECTEUR,
        mfa_enabled=True,
    )
    target = await _user(
        db_session,
        email="disable.agent@eadmin.gn",
        role=RoleEnum.AGENT,
    )
    identity = FederatedIdentity(
        user_id=target.id,
        issuer="https://idp.gov.gn",
        subject="disable-via-review-subject",
        provider="oidc",
        status="active",
        linked_by=director.id,
    )
    db_session.add(identity)
    await db_session.commit()

    campaign = await access_review_service.create_campaign(
        db=db_session,
        actor=director,
        name="Disable stale accounts",
        reviewer_id=director.id,
        due_at=datetime.now(timezone.utc) + timedelta(days=5),
    )
    item = await db_session.scalar(
        select(AccessReviewItem).where(
            AccessReviewItem.campaign_id == campaign.id,
            AccessReviewItem.user_id == target.id,
        )
    )
    assert item is not None

    await access_review_service.decide_item(
        db=db_session,
        actor=director,
        campaign_id=campaign.id,
        item_id=item.id,
        decision="disable_account",
        reason="Compte sans rattachement métier confirmé",
    )
    await db_session.flush()
    await db_session.refresh(target)
    await db_session.refresh(identity)

    assert target.is_active is False
    assert target.sessions_invalid_before is not None
    assert identity.status == "disabled"


@pytest.mark.asyncio
async def test_access_review_rejects_cross_institution_campaign(db_session):
    director = await _user(
        db_session,
        email="scope.director@eadmin.gn",
        role=RoleEnum.DIRECTEUR,
        institution_id="inst-a",
        mfa_enabled=True,
    )
    await db_session.flush()

    with pytest.raises(AccessReviewError, match="hors institution"):
        await access_review_service.create_campaign(
            db=db_session,
            actor=director,
            name="Forbidden cross scope review",
            reviewer_id=director.id,
            due_at=datetime.now(timezone.utc) + timedelta(days=7),
            institution_id="inst-b",
        )


@pytest.mark.asyncio
async def test_access_review_rejects_self_recertification(db_session):
    director = await _user(
        db_session,
        email="self.review@eadmin.gn",
        role=RoleEnum.DIRECTEUR,
        mfa_enabled=True,
    )
    campaign = AccessReviewCampaign(
        name="Malformed self review",
        status="active",
        tenant_id=settings.TENANT_DEFAULT_ID,
        institution_id="inst-a",
        reviewer_id=director.id,
        created_by=director.id,
        due_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(campaign)
    await db_session.flush()
    item = AccessReviewItem(
        campaign_id=campaign.id,
        user_id=director.id,
        snapshot_role=director.role.value,
        snapshot_tenant_id=settings.TENANT_DEFAULT_ID,
        snapshot_institution_id="inst-a",
        snapshot_grants=[],
    )
    db_session.add(item)
    await db_session.flush()

    with pytest.raises(AccessReviewError, match="Auto-recertification"):
        await access_review_service.decide_item(
            db=db_session,
            actor=director,
            campaign_id=campaign.id,
            item_id=item.id,
            decision="certified",
            reason="Should never be accepted",
        )
