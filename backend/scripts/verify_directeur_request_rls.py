"""Prove DIRECTEUR service-request RLS with a real non-bypass PostgreSQL role.

This gate deliberately sets the signed RLS context in one statement and runs the
protected query only afterwards on the same transaction/connection.  Keeping
context setup separate from the protected statement avoids shell/psql
multi-command timing and output-format artefacts while exercising the exact
PostgreSQL policies used by the application.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager

import psycopg2
from psycopg2.extensions import connection as PgConnection

RUNTIME_USER = "eadmin_hierarchy_rls"
TENANT = "republique-de-guinee"
DIRECTEUR_INSTITUTION = "dir-justice-recette"
CHILD_INSTITUTION = "service-casier-recette"


@contextmanager
def runtime_connection() -> Iterator[PgConnection]:
    password = os.environ.get("EADMIN_HIERARCHY_RLS_PASSWORD")
    if not password:
        raise RuntimeError("EADMIN_HIERARCHY_RLS_PASSWORD is required")

    connection = psycopg2.connect(
        host=os.environ.get("EADMIN_HIERARCHY_RLS_HOST", "postgres"),
        port=int(os.environ.get("EADMIN_HIERARCHY_RLS_PORT", "5432")),
        dbname=os.environ.get("EADMIN_HIERARCHY_RLS_DATABASE", "eadmin"),
        user=RUNTIME_USER,
        password=password,
    )
    try:
        yield connection
    finally:
        connection.rollback()
        connection.close()


def set_context(
    connection: PgConnection,
    *,
    role: str,
    tenant: str = TENANT,
    institution: str = "",
    user_id: str = "00000000-0000-0000-0000-000000000001",
) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                set_config('app.current_user_id', %s, true),
                set_config('app.current_tenant_id', %s, true),
                set_config('app.current_institution_id', %s, true),
                set_config('app.current_role', %s, true)
            """,
            (user_id, tenant, institution, role),
        )


def request_count(
    *,
    role: str,
    institution: str,
    reference: str,
    tenant: str = TENANT,
) -> int:
    with runtime_connection() as connection:
        set_context(
            connection,
            role=role,
            tenant=tenant,
            institution=institution,
        )
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT count(*) FROM service_requests WHERE reference = %s",
                (reference,),
            )
            row = cursor.fetchone()
            assert row is not None
            return int(row[0])


def directeur_scope(
    *,
    role: str,
    tenant: str = TENANT,
    institution: str = DIRECTEUR_INSTITUTION,
) -> list[str]:
    with runtime_connection() as connection:
        set_context(
            connection,
            role=role,
            tenant=tenant,
            institution=institution,
        )
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT scope_id FROM eadmin_current_directeur_institution_scope() ORDER BY scope_id"
            )
            return [str(row[0]) for row in cursor.fetchall()]


def update_reference(reference: str) -> str | None:
    with runtime_connection() as connection:
        set_context(
            connection,
            role="DIRECTEUR",
            tenant=TENANT,
            institution=DIRECTEUR_INSTITUTION,
            user_id="00000000-0000-0000-0000-000000000004",
        )
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE service_requests
                SET updated_at = updated_at
                WHERE reference = %s
                RETURNING reference
                """,
                (reference,),
            )
            row = cursor.fetchone()
            return None if row is None else str(row[0])


def assert_equal(label: str, actual: object, expected: object) -> None:
    print(f"{label}: actual={actual!r} expected={expected!r}")
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def main() -> None:
    # First prove the SECURITY DEFINER helper itself from the runtime role.
    assert_equal(
        "DIRECTEUR helper nominal scope",
        directeur_scope(role="DIRECTEUR"),
        [DIRECTEUR_INSTITUTION, CHILD_INSTITUTION],
    )
    assert_equal(
        "DIRECTEUR helper wrong tenant",
        directeur_scope(role="DIRECTEUR", tenant="tenant-isolation-recette"),
        [],
    )
    assert_equal(
        "DIRECTEUR helper missing institution",
        directeur_scope(role="DIRECTEUR", institution=""),
        [],
    )
    assert_equal(
        "DIRECTEUR helper unknown role",
        directeur_scope(role="UNKNOWN"),
        [],
    )
    assert_equal(
        "DIRECTEUR helper rejects MINISTRE",
        directeur_scope(role="MINISTRE"),
        [],
    )

    # DIRECTEUR: own institution subtree only, never sibling branches/tenants.
    assert_equal(
        "DIRECTEUR descendant request",
        request_count(
            role="DIRECTEUR",
            institution=DIRECTEUR_INSTITUTION,
            reference="REC-GN-2026-006",
        ),
        1,
    )
    assert_equal(
        "DIRECTEUR unrelated branch",
        request_count(
            role="DIRECTEUR",
            institution=DIRECTEUR_INSTITUTION,
            reference="REC-GN-2026-002",
        ),
        0,
    )
    assert_equal(
        "DIRECTEUR cross tenant",
        request_count(
            role="DIRECTEUR",
            institution=DIRECTEUR_INSTITUTION,
            reference="REC-ISO-2026-001",
        ),
        0,
    )

    # Operational roles remain exact to their root/service routing boundaries.
    assert_equal(
        "ADMIN own mairie",
        request_count(
            role="ADMIN",
            institution="mairie-ratoma-recette",
            reference="REC-GN-2026-002",
        ),
        1,
    )
    assert_equal(
        "ADMIN other mairie",
        request_count(
            role="ADMIN",
            institution="mairie-ratoma-recette",
            reference="REC-GN-2026-003",
        ),
        0,
    )
    assert_equal(
        "CHEF_SERVICE own service",
        request_count(
            role="CHEF_SERVICE",
            institution=CHILD_INSTITUTION,
            reference="REC-GN-2026-006",
        ),
        1,
    )
    assert_equal(
        "CHEF_SERVICE unrelated request",
        request_count(
            role="CHEF_SERVICE",
            institution=CHILD_INSTITUTION,
            reference="REC-GN-2026-002",
        ),
        0,
    )

    # MINISTRE is tenant-wide; unknown roles fail closed.
    assert_equal(
        "MINISTRE tenant request",
        request_count(
            role="MINISTRE",
            institution="min-justice-recette",
            reference="REC-GN-2026-002",
        ),
        1,
    )
    assert_equal(
        "MINISTRE cross tenant",
        request_count(
            role="MINISTRE",
            institution="min-justice-recette",
            reference="REC-ISO-2026-001",
        ),
        0,
    )
    assert_equal(
        "UNKNOWN role fail closed",
        request_count(
            role="UNKNOWN",
            institution=DIRECTEUR_INSTITUTION,
            reference="REC-GN-2026-006",
        ),
        0,
    )

    # UPDATE follows the same subtree boundary. Each connection is rolled back.
    assert_equal(
        "DIRECTEUR update descendant",
        update_reference("REC-GN-2026-006"),
        "REC-GN-2026-006",
    )
    assert_equal(
        "DIRECTEUR update unrelated",
        update_reference("REC-GN-2026-002"),
        None,
    )

    print("DIRECTEUR request hierarchy RLS matrix: PASS")


if __name__ == "__main__":
    main()
