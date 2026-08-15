from contextlib import AbstractAsyncContextManager
import importlib
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.document_version_service import DocumentVersionService

version_module = importlib.import_module("app.services.document_version_service")


class _SessionContext(AbstractAsyncContextManager):
    def __init__(self, session):
        self.session = session

    async def __aenter__(self):
        return self.session

    async def __aexit__(self, exc_type, exc, tb):
        return False


def _missing_parent_session():
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    session = MagicMock()
    session.execute = AsyncMock(return_value=result)
    return session


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method", "args", "expected"),
    [
        ("get_version_history", ("00000000-0000-0000-0000-000000000001",), []),
        (
            "restore_version",
            (
                "00000000-0000-0000-0000-000000000001",
                1,
                "00000000-0000-0000-0000-000000000002",
            ),
            {"error": "Document non trouvé"},
        ),
        (
            "compare_versions",
            ("00000000-0000-0000-0000-000000000001", 1, 2),
            {"error": "Document non trouvé"},
        ),
        ("get_version", ("00000000-0000-0000-0000-000000000001", 1), None),
    ],
)
async def test_child_version_reads_fail_closed_before_querying_history(
    monkeypatch, method, args, expected
):
    session = _missing_parent_session()
    monkeypatch.setattr(
        version_module,
        "async_session_factory",
        lambda: _SessionContext(session),
    )
    service = DocumentVersionService()

    result = await getattr(service, method)(*args)

    assert result == expected
    assert session.execute.await_count == 1


@pytest.mark.asyncio
async def test_create_version_fails_closed_when_parent_document_is_not_visible(monkeypatch):
    session = _missing_parent_session()
    session.commit = AsyncMock()
    monkeypatch.setattr(
        version_module,
        "async_session_factory",
        lambda: _SessionContext(session),
    )
    service = DocumentVersionService()

    result = await service.create_version(
        document_id="00000000-0000-0000-0000-000000000001",
        file_path="tenant-b/secret.pdf",
        change_summary="must not leak",
        user_id="00000000-0000-0000-0000-000000000002",
    )

    assert result == {"error": "Document non trouvé"}
    assert session.execute.await_count == 1
    session.commit.assert_not_awaited()
