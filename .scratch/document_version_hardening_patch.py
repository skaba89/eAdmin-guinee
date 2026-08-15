from pathlib import Path


SERVICE_PATH = Path("backend/app/services/document_version_service.py")


def _method_segment(source: str, name: str) -> tuple[int, int, str]:
    start = source.index(f"    async def {name}(")
    next_async = source.find("\n    async def ", start + 1)
    next_sync = source.find("\n    def ", start + 1)
    candidates = [value for value in (next_async, next_sync) if value != -1]
    end = min(candidates) if candidates else len(source)
    return start, end, source[start:end]


def _patch_method(source: str, name: str, transform) -> str:
    start, end, segment = _method_segment(source, name)
    patched = transform(segment)
    if patched == segment:
        raise SystemExit(f"{name}: patch made no change")
    return source[:start] + patched + source[end:]


def patch_service() -> None:
    text = SERVICE_PATH.read_text(encoding="utf-8")

    helper = '''    async def _load_scoped_document(
        self,
        session: AsyncSession,
        document_id: str,
    ) -> Document | None:
        """Resolve a document through the parent FORCE-RLS boundary."""
        try:
            parsed_id = uuid.UUID(document_id)
        except (TypeError, ValueError, AttributeError):
            return None
        result = await session.execute(select(Document).where(Document.id == parsed_id))
        return result.scalar_one_or_none()

'''
    marker = "    async def create_version(\n"
    if text.count(marker) != 1:
        raise SystemExit("create_version marker mismatch")
    text = text.replace(marker, helper + marker, 1)

    def patch_create(segment: str) -> str:
        old = '''                # Récupérer le document
                result = await session.execute(
                    select(Document).where(Document.id == uuid.UUID(document_id))
                )
                document = result.scalar_one_or_none()
                if not document:
                    return {"error": "Document non trouvé"}
'''
        new = '''                document = await self._load_scoped_document(session, document_id)
                if not document:
                    return {"error": "Document non trouvé"}
'''
        if old not in segment:
            raise SystemExit("create_version parent lookup mismatch")
        segment = segment.replace(old, new, 1)
        return segment.replace("uuid.UUID(document_id)", "document.id")

    text = _patch_method(text, "create_version", patch_create)

    def parent_guard(empty_return: str):
        def transform(segment: str) -> str:
            marker = "            async with async_session_factory() as session:\n"
            if segment.count(marker) != 1:
                raise SystemExit("session marker mismatch")
            replacement = marker + (
                "                document = await self._load_scoped_document(session, document_id)\n"
                "                if not document:\n"
                f"                    {empty_return}\n"
            )
            segment = segment.replace(marker, replacement, 1)
            return segment.replace("uuid.UUID(document_id)", "document.id")

        return transform

    text = _patch_method(text, "get_version_history", parent_guard("return []"))
    text = _patch_method(
        text,
        "restore_version",
        parent_guard('return {"error": "Document non trouvé"}'),
    )
    text = _patch_method(
        text,
        "compare_versions",
        parent_guard('return {"error": "Document non trouvé"}'),
    )
    text = _patch_method(text, "get_version", parent_guard("return None"))
    SERVICE_PATH.write_text(text, encoding="utf-8")


def write_migration() -> None:
    Path("backend/alembic/versions/document_versions_parent_rls.py").write_text(
        '''"""Protect document version history through parent document RLS.

Revision ID: document_versions_parent_rls
Revises: municipal_route_history_lock
Create Date: 2026-08-16
"""

from alembic import op

revision = "document_versions_parent_rls"
down_revision = "municipal_route_history_lock"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE document_versions FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS document_versions_parent_select ON document_versions;
        DROP POLICY IF EXISTS document_versions_parent_insert ON document_versions;

        CREATE POLICY document_versions_parent_select ON document_versions
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM documents parent_document
                    WHERE parent_document.id = document_versions.document_id
                )
            );

        CREATE POLICY document_versions_parent_insert ON document_versions
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM documents parent_document
                    WHERE parent_document.id = document_versions.document_id
                )
            );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP POLICY IF EXISTS document_versions_parent_insert ON document_versions;
        DROP POLICY IF EXISTS document_versions_parent_select ON document_versions;
        ALTER TABLE document_versions NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE document_versions DISABLE ROW LEVEL SECURITY;
        """
    )
''',
        encoding="utf-8",
    )


def write_unit_tests() -> None:
    Path("backend/tests/test_document_version_scope.py").write_text(
        '''from contextlib import AbstractAsyncContextManager
from unittest.mock import AsyncMock, MagicMock

import pytest

import app.services.document_version_service as version_module
from app.services.document_version_service import DocumentVersionService


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
''',
        encoding="utf-8",
    )


def write_probe() -> None:
    Path("backend/scripts/check_document_version_rls.py").write_text(
        '''"""PostgreSQL proof that document version history inherits parent document RLS."""

import os
import uuid

import psycopg2

RUNTIME_ROLE = "eadmin_document_version_runtime"
USER_ID = uuid.UUID("10000000-0000-0000-0000-000000000001")
DOC_A = uuid.UUID("20000000-0000-0000-0000-000000000001")
DOC_B = uuid.UUID("20000000-0000-0000-0000-000000000002")
VERSION_A = uuid.UUID("30000000-0000-0000-0000-000000000001")
VERSION_B = uuid.UUID("30000000-0000-0000-0000-000000000002")
VERSION_A2 = uuid.UUID("30000000-0000-0000-0000-000000000003")
VERSION_FORBIDDEN = uuid.UUID("30000000-0000-0000-0000-000000000004")


def _dsn() -> str:
    return os.environ["DATABASE_URL"].replace(
        "postgresql+asyncpg://", "postgresql://", 1
    )


def _set_context(cur, *, tenant: str, institution: str) -> None:
    cur.execute("SELECT set_config('app.current_role', 'ADMIN', true)")
    cur.execute("SELECT set_config('app.current_tenant_id', %s, true)", (tenant,))
    cur.execute(
        "SELECT set_config('app.current_institution_id', %s, true)",
        (institution,),
    )
    cur.execute(
        "SELECT set_config('app.current_user_id', %s, true)",
        (str(USER_ID),),
    )


def main() -> int:
    dsn = _dsn()
    with psycopg2.connect(dsn) as owner:
        with owner.cursor() as cur:
            cur.execute(
                f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{RUNTIME_ROLE}') THEN
                        CREATE ROLE {RUNTIME_ROLE} NOLOGIN NOSUPERUSER NOBYPASSRLS;
                    END IF;
                END
                $$;
                GRANT USAGE ON SCHEMA public TO {RUNTIME_ROLE};
                GRANT SELECT ON documents TO {RUNTIME_ROLE};
                GRANT SELECT, INSERT, UPDATE, DELETE ON document_versions TO {RUNTIME_ROLE};
                """
            )
            cur.execute("SELECT set_config('app.current_role', 'SUPER_ADMIN', true)")
            cur.execute("SELECT set_config('app.current_tenant_id', 'tenant-a', true)")
            cur.execute("SELECT set_config('app.current_institution_id', 'mairie-a', true)")
            cur.execute(
                "SELECT set_config('app.current_user_id', %s, true)",
                (str(USER_ID),),
            )
            cur.execute(
                """
                INSERT INTO users
                    (id, email, hashed_password, full_name, role, tenant_id, institution_id)
                VALUES
                    (%s, 'doc-version-gate@eadmin.gn', 'not-used', 'Gate User',
                     'ADMIN', 'tenant-a', 'mairie-a')
                ON CONFLICT (id) DO NOTHING
                """,
                (str(USER_ID),),
            )
            cur.execute(
                """
                INSERT INTO documents (id, title, owner_id, tenant_id, institution_id)
                VALUES
                    (%s, 'Document A', %s, 'tenant-a', 'mairie-a'),
                    (%s, 'Document B', %s, 'tenant-b', 'mairie-b')
                ON CONFLICT (id) DO NOTHING
                """,
                (str(DOC_A), str(USER_ID), str(DOC_B), str(USER_ID)),
            )
            cur.execute(
                """
                INSERT INTO document_versions
                    (id, document_id, version_number, file_path, file_hash,
                     change_type, changed_by)
                VALUES
                    (%s, %s, 1, 'tenant-a/a.pdf', repeat('a', 64), 'create', %s),
                    (%s, %s, 1, 'tenant-b/b.pdf', repeat('b', 64), 'create', %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    str(VERSION_A),
                    str(DOC_A),
                    str(USER_ID),
                    str(VERSION_B),
                    str(DOC_B),
                    str(USER_ID),
                ),
            )

    with psycopg2.connect(dsn) as runtime:
        with runtime.cursor() as cur:
            cur.execute(f"SET LOCAL ROLE {RUNTIME_ROLE}")
            _set_context(cur, tenant="tenant-a", institution="mairie-a")
            cur.execute("SELECT count(*) FROM documents")
            assert cur.fetchone()[0] == 1
            cur.execute("SELECT count(*) FROM document_versions")
            assert cur.fetchone()[0] == 1
            cur.execute(
                "SELECT count(*) FROM document_versions WHERE document_id = %s",
                (str(DOC_B),),
            )
            assert cur.fetchone()[0] == 0

            cur.execute(
                """
                INSERT INTO document_versions
                    (id, document_id, version_number, file_path, file_hash,
                     change_type, changed_by)
                VALUES (%s, %s, 2, 'tenant-a/a-v2.pdf', repeat('c', 64),
                        'update', %s)
                """,
                (str(VERSION_A2), str(DOC_A), str(USER_ID)),
            )

            cur.execute("SAVEPOINT forbidden_child_insert")
            try:
                cur.execute(
                    """
                    INSERT INTO document_versions
                        (id, document_id, version_number, file_path, file_hash,
                         change_type, changed_by)
                    VALUES (%s, %s, 2, 'tenant-b/forbidden.pdf', repeat('d', 64),
                            'update', %s)
                    """,
                    (str(VERSION_FORBIDDEN), str(DOC_B), str(USER_ID)),
                )
            except psycopg2.Error as exc:
                if exc.pgcode != "42501":
                    raise
                cur.execute("ROLLBACK TO SAVEPOINT forbidden_child_insert")
            else:
                raise AssertionError("RLS allowed INSERT for a hidden parent")

            cur.execute(
                "UPDATE document_versions SET change_summary = 'tampered' WHERE id = %s",
                (str(VERSION_A),),
            )
            assert cur.rowcount == 0
            cur.execute(
                "DELETE FROM document_versions WHERE id = %s",
                (str(VERSION_A),),
            )
            assert cur.rowcount == 0
            cur.execute(
                "SELECT count(*) FROM document_versions WHERE document_id = %s",
                (str(DOC_A),),
            )
            assert cur.fetchone()[0] == 2

    with psycopg2.connect(dsn) as wrong_scope:
        with wrong_scope.cursor() as cur:
            cur.execute(f"SET LOCAL ROLE {RUNTIME_ROLE}")
            _set_context(cur, tenant="tenant-b", institution="mairie-b")
            cur.execute(
                "SELECT count(*) FROM document_versions WHERE document_id = %s",
                (str(DOC_A),),
            )
            assert cur.fetchone()[0] == 0
            cur.execute(
                "SELECT count(*) FROM document_versions WHERE document_id = %s",
                (str(DOC_B),),
            )
            assert cur.fetchone()[0] == 1

    with psycopg2.connect(dsn) as no_scope:
        with no_scope.cursor() as cur:
            cur.execute(f"SET LOCAL ROLE {RUNTIME_ROLE}")
            cur.execute("SELECT count(*) FROM document_versions")
            assert cur.fetchone()[0] == 0

    print("DOCUMENT_VERSION_PARENT_RLS=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
''',
        encoding="utf-8",
    )


def write_workflow() -> None:
    Path(".github/workflows/document-version-rls.yml").write_text(
        '''name: Document Version Parent RLS Gate

on:
  pull_request:
    paths:
      - 'backend/app/services/document_version_service.py'
      - 'backend/app/models/document_version.py'
      - 'backend/alembic/versions/document_versions_parent_rls.py'
      - 'backend/scripts/check_document_version_rls.py'
      - 'backend/tests/test_document_version_scope.py'
      - '.github/workflows/document-version-rls.yml'
  push:
    branches: [main]
    paths:
      - 'backend/app/services/document_version_service.py'
      - 'backend/app/models/document_version.py'
      - 'backend/alembic/versions/document_versions_parent_rls.py'
      - 'backend/scripts/check_document_version_rls.py'
      - 'backend/tests/test_document_version_scope.py'
      - '.github/workflows/document-version-rls.yml'

permissions:
  contents: read

jobs:
  document-version-parent-rls:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: eadmin_docversion
          POSTGRES_USER: eadmin
          POSTGRES_PASSWORD: ci-test-password
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U eadmin -d eadmin_docversion"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      ENVIRONMENT: test
      DATABASE_URL: postgresql+asyncpg://eadmin:ci-test-password@localhost:5432/eadmin_docversion
      SECRET_KEY: ci-only-secret-key-not-for-production-0123456789
      ENCRYPTION_KEY: ci-only-encryption-key-0123456789abcdef
      REDIS_URL: redis://localhost:6379
      MINIO_ACCESS_KEY: ci-minio
      MINIO_SECRET_KEY: ci-minio-secret
      MINIO_ENDPOINT: localhost:9000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
          cache-dependency-path: backend/requirements-dev.txt
      - name: Install backend dependencies
        working-directory: backend
        run: pip install -r requirements-dev.txt
      - name: Verify migration chain and upgrade
        working-directory: backend
        run: |
          test "$(alembic heads | grep -c '(head)')" = 1
          alembic heads
          alembic upgrade head
      - name: Lint hardening surface
        working-directory: backend
        run: >-
          ruff check app/services/document_version_service.py
          scripts/check_document_version_rls.py
          tests/test_document_version_scope.py
          alembic/versions/document_versions_parent_rls.py
      - name: Unit scope guard
        working-directory: backend
        run: pytest -q tests/test_document_version_scope.py
      - name: PostgreSQL NOBYPASSRLS proof
        working-directory: backend
        run: python scripts/check_document_version_rls.py
''',
        encoding="utf-8",
    )


def main() -> None:
    patch_service()
    write_migration()
    write_unit_tests()
    write_probe()
    write_workflow()


if __name__ == "__main__":
    main()
