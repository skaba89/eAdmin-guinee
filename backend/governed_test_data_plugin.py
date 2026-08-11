"""Pytest support for governed IAM integration fixtures.

The user-administration API intentionally rejects assignments to institutions
that do not exist in the selected tenant. A few IAM regression modules use the
canonical synthetic IDs ``inst-a`` and ``inst-b``; this plugin materializes
those institutions in the same SQLite test database instead of weakening the
production validation path.
"""

from __future__ import annotations

import pytest_asyncio
from sqlalchemy import select

from app.config import settings
from app.models.institution import Institution

_TARGET_MODULES = {
    "tests.test_iam_governance",
    "tests.test_iam_lifecycle",
}


@pytest_asyncio.fixture(autouse=True)
async def governed_iam_test_institutions(request):
    """Create the synthetic governed institutions used by IAM integration tests."""
    module_name = getattr(getattr(request.node, "module", None), "__name__", "")
    if module_name not in _TARGET_MODULES or "db_session" not in request.fixturenames:
        yield
        return

    db_session = request.getfixturevalue("db_session")
    existing_ids = set(
        (
            await db_session.execute(
                select(Institution.id).where(Institution.id.in_(["inst-a", "inst-b"]))
            )
        )
        .scalars()
        .all()
    )

    institutions = []
    if "inst-a" not in existing_ids:
        institutions.append(
            Institution(
                id="inst-a",
                tenant_id=settings.TENANT_DEFAULT_ID,
                name="Institution A",
                type="service",
                is_active=True,
            )
        )
    if "inst-b" not in existing_ids:
        institutions.append(
            Institution(
                id="inst-b",
                tenant_id=settings.TENANT_DEFAULT_ID,
                name="Institution B",
                type="service",
                is_active=True,
            )
        )

    if institutions:
        db_session.add_all(institutions)
        await db_session.flush()

    yield