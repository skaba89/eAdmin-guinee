# Audit-only trigger: full E2E use-case matrix 2026-08-16. No product behavior change.
"""Tests for hierarchical institution scope construction."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.institution import Institution
from app.services.institution_scope import institution_descendants_cte


@pytest.mark.asyncio
async def test_descendant_scope_is_tenant_bound_and_active(db_session: AsyncSession):
    db_session.add_all(
        [
            Institution(
                id="direction-justice",
                tenant_id="tenant-a",
                name="Direction Justice",
                type="direction",
                is_active=True,
            ),
            Institution(
                id="service-casier",
                tenant_id="tenant-a",
                name="Service Casier",
                type="service",
                parent_id="direction-justice",
                is_active=True,
            ),
            Institution(
                id="service-inactive",
                tenant_id="tenant-a",
                name="Service inactif",
                type="service",
                parent_id="direction-justice",
                is_active=False,
            ),
            Institution(
                id="direction-sibling",
                tenant_id="tenant-a",
                name="Direction soeur",
                type="direction",
                is_active=True,
            ),
            Institution(
                id="cross-tenant-child",
                tenant_id="tenant-b",
                name="Enfant autre tenant",
                type="service",
                parent_id="direction-justice",
                is_active=True,
            ),
        ]
    )
    await db_session.flush()

    scope = institution_descendants_cte(
        tenant_id="tenant-a",
        root_institution_id="direction-justice",
    )
    ids = set((await db_session.execute(select(scope.c.id))).scalars().all())

    assert ids == {"direction-justice", "service-casier"}


@pytest.mark.asyncio
async def test_missing_or_inactive_root_fails_closed(db_session: AsyncSession):
    db_session.add(
        Institution(
            id="inactive-root",
            tenant_id="tenant-a",
            name="Direction inactive",
            type="direction",
            is_active=False,
        )
    )
    await db_session.flush()

    inactive_scope = institution_descendants_cte(
        tenant_id="tenant-a",
        root_institution_id="inactive-root",
    )
    missing_scope = institution_descendants_cte(
        tenant_id="tenant-a",
        root_institution_id="missing-root",
        name="missing_scope",
    )

    inactive_ids = (await db_session.execute(select(inactive_scope.c.id))).scalars().all()
    missing_ids = (await db_session.execute(select(missing_scope.c.id))).scalars().all()

    assert inactive_ids == []
    assert missing_ids == []
