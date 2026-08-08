"""Regression tests for tenant-safe audit aggregation queries."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models.audit import AuditLog
from app.services.audit_service import AuditService


def _audit_log(*, tenant: str, action: str, severity: str, resource: str, user_id=None, minutes=0):
    return AuditLog(
        id=uuid.uuid4(),
        user_id=user_id,
        action=action,
        category="test",
        resource_type=resource,
        resource_id=uuid.uuid4().hex,
        severity=severity,
        tenant_id=tenant,
        institution_id="institution-test",
        timestamp=datetime.now(timezone.utc) + timedelta(minutes=minutes),
    )


@pytest.mark.asyncio
async def test_stats_aggregate_only_filtered_tenant_without_cartesian_product(db_session, test_user):
    db_session.add_all([
        _audit_log(
            tenant="tenant-a",
            action="READ",
            severity="info",
            resource="document",
            user_id=test_user.id,
            minutes=1,
        ),
        _audit_log(
            tenant="tenant-a",
            action="READ",
            severity="info",
            resource="document",
            user_id=test_user.id,
            minutes=2,
        ),
        _audit_log(
            tenant="tenant-a",
            action="UPDATE",
            severity="warning",
            resource="courrier",
            user_id=test_user.id,
            minutes=3,
        ),
        _audit_log(
            tenant="tenant-b",
            action="DELETE",
            severity="critical",
            resource="user",
            minutes=4,
        ),
    ])
    await db_session.flush()

    stats = await AuditService(db_session).get_stats(tenant_id="tenant-a")

    assert stats["total_entries"] == 3
    assert stats["top_actions"][:2] == [
        {"action": "READ", "count": 2},
        {"action": "UPDATE", "count": 1},
    ]
    assert stats["severity_stats"] == {"info": 2, "warning": 1}
    assert stats["top_users"] == [{"user_id": str(test_user.id), "count": 3}]
    assert stats["top_resources"][:2] == [
        {"resource_type": "document", "count": 2},
        {"resource_type": "courrier", "count": 1},
    ]
    assert stats["tenant_id"] == "tenant-a"


@pytest.mark.asyncio
async def test_stats_respect_since_filter(db_session):
    now = datetime.now(timezone.utc)
    db_session.add_all([
        _audit_log(
            tenant="tenant-a",
            action="READ",
            severity="info",
            resource="document",
            minutes=-120,
        ),
        _audit_log(
            tenant="tenant-a",
            action="UPDATE",
            severity="warning",
            resource="courrier",
            minutes=0,
        ),
    ])
    await db_session.flush()

    stats = await AuditService(db_session).get_stats(
        tenant_id="tenant-a",
        since=now - timedelta(minutes=5),
    )

    assert stats["total_entries"] == 1
    assert stats["top_actions"] == [{"action": "UPDATE", "count": 1}]
