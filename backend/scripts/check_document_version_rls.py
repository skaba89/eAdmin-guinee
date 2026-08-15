"""PostgreSQL proof that document version history inherits parent document RLS."""

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


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


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
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eadmin_document_version_runtime') THEN
                        CREATE ROLE eadmin_document_version_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
                    END IF;
                END
                $$;
                GRANT USAGE ON SCHEMA public TO eadmin_document_version_runtime;
                GRANT SELECT ON documents TO eadmin_document_version_runtime;
                GRANT SELECT, INSERT, UPDATE, DELETE ON document_versions TO eadmin_document_version_runtime;
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
                INSERT INTO tenants (id, name)
                VALUES
                    ('tenant-a', 'Tenant A'),
                    ('tenant-b', 'Tenant B')
                ON CONFLICT (id) DO NOTHING
                """
            )
            cur.execute(
                """
                INSERT INTO institutions (id, tenant_id, name, type, code, is_active)
                VALUES
                    ('mairie-a', 'tenant-a', 'Mairie A', 'mairie', 'RLS-MA-A', true),
                    ('mairie-b', 'tenant-b', 'Mairie B', 'mairie', 'RLS-MA-B', true)
                ON CONFLICT (id) DO NOTHING
                """
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
            cur.execute("SET LOCAL ROLE eadmin_document_version_runtime")
            _set_context(cur, tenant="tenant-a", institution="mairie-a")
            cur.execute("SELECT count(*) FROM documents")
            _require(cur.fetchone()[0] == 1, "expected one visible row")
            cur.execute("SELECT count(*) FROM document_versions")
            _require(cur.fetchone()[0] == 1, "expected one visible row")
            cur.execute(
                "SELECT count(*) FROM document_versions WHERE document_id = %s",
                (str(DOC_B),),
            )
            _require(cur.fetchone()[0] == 0, "hidden row leaked through RLS")

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
            _require(cur.rowcount == 0, "direct version mutation must be denied")
            cur.execute(
                "DELETE FROM document_versions WHERE id = %s",
                (str(VERSION_A),),
            )
            _require(cur.rowcount == 0, "direct version mutation must be denied")
            cur.execute(
                "SELECT count(*) FROM document_versions WHERE document_id = %s",
                (str(DOC_A),),
            )
            _require(cur.fetchone()[0] == 2, "allowed version insert was not persisted")

    with psycopg2.connect(dsn) as wrong_scope:
        with wrong_scope.cursor() as cur:
            cur.execute("SET LOCAL ROLE eadmin_document_version_runtime")
            _set_context(cur, tenant="tenant-b", institution="mairie-b")
            cur.execute(
                "SELECT count(*) FROM document_versions WHERE document_id = %s",
                (str(DOC_A),),
            )
            _require(cur.fetchone()[0] == 0, "hidden row leaked through RLS")
            cur.execute(
                "SELECT count(*) FROM document_versions WHERE document_id = %s",
                (str(DOC_B),),
            )
            _require(cur.fetchone()[0] == 1, "expected one visible row")

    with psycopg2.connect(dsn) as no_scope:
        with no_scope.cursor() as cur:
            cur.execute("SET LOCAL ROLE eadmin_document_version_runtime")
            cur.execute("SELECT count(*) FROM document_versions")
            _require(cur.fetchone()[0] == 0, "hidden row leaked through RLS")

    print("DOCUMENT_VERSION_PARENT_RLS=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
