"""Pytest support for governed IAM integration fixtures.

The user-administration API intentionally rejects assignments to institutions
that do not exist in the selected tenant. A few IAM regression modules use the
canonical synthetic IDs ``inst-a`` and ``inst-b``; this plugin materializes
those institutions in the same SQLite test database instead of weakening the
production validation path.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.config import settings
from app.models.institution import Institution

# Depending on how pytest imports the test tree, modules may be exposed either
# as top-level names or as tests.<module>. Support both forms deliberately.
_TARGET_MODULES = {
    "test_iam_governance",
    "test_iam_lifecycle",
    "tests.test_iam_governance",
    "tests.test_iam_lifecycle",
}


def pytest_collection_modifyitems(items) -> None:
    """Attach the governed fixture only to the IAM modules that need it."""
    for item in items:
        module_name = getattr(getattr(item, "module", None), "__name__", "")
        if module_name in _TARGET_MODULES:
            item.add_marker(pytest.mark.usefixtures("governed_iam_test_institutions"))


@pytest_asyncio.fixture
async def governed_iam_test_institutions(db_session):
    """Create synthetic governed institutions in the active test transaction."""
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