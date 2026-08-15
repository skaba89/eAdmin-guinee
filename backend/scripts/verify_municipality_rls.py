"""PostgreSQL proof for municipality/service request isolation.

This script is intentionally executed against PostgreSQL with a dedicated
NOSUPERUSER/NOBYPASSRLS role. It proves that the database boundary matches the
application routing contract for two municipalities, multiple services,
citizens, municipal staff, historical rows, cross-scope writes and route moves.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

import psycopg2
from psycopg2.extensions import connection as PgConnection


def _dsn() -> str:
    value = os.environ["DATABASE_URL"]
    return value.replace("postgresql+asyncpg://", "postgresql://", 1)


@contextmanager
def db() -> Iterator[PgConnection]:
    conn = psycopg2.connect(_dsn())
    try:
        conn.autocommit = True
        yield conn
    finally:
        conn.close()


def scalar(conn: PgConnection, sql: str, params: tuple = ()) -> str | None:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        if row is None or row[0] is None:
            return None
        return str(row[0])


def execute(conn: PgConnection, sql: str, params: tuple = ()) -> None:
    with conn.cursor() as cur:
        cur.execute(sql, params)


def assert_equal(actual: str | None, expected: str, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")
    print(f"PASS: {label} -> {actual}")


def set_runtime_scope(
    conn: PgConnection,
    *,
    tenant_id: str,
    role: str,
    institution_id: str = "",
    user_id: str = "",
) -> None:
    execute(conn, "SET ROLE eadmin_runtime_ci")
    execute(conn, "SELECT set_config('app.current_user_id', %s, false)", (user_id,))
    execute(conn, "SELECT set_config('app.current_tenant_id', %s, false)", (tenant_id,))
    execute(
        conn,
        "SELECT set_config('app.current_institution_id', %s, false)",
        (institution_id,),
    )
    execute(conn, "SELECT set_config('app.current_role', %s, false)", (role,))


def visible_requests(
    tenant_id: str,
    role: str,
    *,
    institution_id: str = "",
    user_id: str = "",
    prefix: str = "CI-MAIRIE-%",
) -> str:
    with db() as conn:
        set_runtime_scope(
            conn,
            tenant_id=tenant_id,
            role=role,
            institution_id=institution_id,
            user_id=user_id,
        )
        return scalar(
            conn,
            """
            SELECT COALESCE(string_agg(reference, ',' ORDER BY reference), 'NONE')
            FROM service_requests
            WHERE reference LIKE %s
            """,
            (prefix,),
        ) or "NONE"


def update_request_as(
    tenant_id: str,
    role: str,
    institution_id: str,
    reference: str,
    motif: str,
) -> str:
    with db() as conn:
        set_runtime_scope(
            conn,
            tenant_id=tenant_id,
            role=role,
            institution_id=institution_id,
        )
        return scalar(
            conn,
            """
            WITH changed AS (
                UPDATE service_requests
                SET motif = %s
                WHERE reference = %s
                RETURNING reference
            )
            SELECT COALESCE(string_agg(reference, ',' ORDER BY reference), 'NONE')
            FROM changed
            """,
            (motif, reference),
        ) or "NONE"


def update_assignment_as(
    tenant_id: str,
    role: str,
    institution_id: str,
    *,
    target_mairie: str,
    service_id: str,
    new_service_institution_id: str | None = None,
    is_active: bool | None = None,
) -> str:
    changes: list[str] = []
    params: list[object] = []
    if new_service_institution_id is not None:
        changes.append("service_institution_id = %s")
        params.append(new_service_institution_id)
    if is_active is not None:
        changes.append("is_active = %s")
        params.append(is_active)
    if not changes:
        raise ValueError("At least one assignment change is required")
    params.extend([target_mairie, service_id])

    with db() as conn:
        set_runtime_scope(
            conn,
            tenant_id=tenant_id,
            role=role,
            institution_id=institution_id,
        )
        return scalar(
            conn,
            f"""
            WITH changed AS (
                UPDATE institution_service_assignments
                SET {', '.join(changes)}
                WHERE institution_id = %s AND service_id = %s
                RETURNING institution_id
            )
            SELECT COALESCE(string_agg(institution_id, ',' ORDER BY institution_id), 'NONE')
            FROM changed
            """,
            tuple(params),
        ) or "NONE"


def assignment_visibility(tenant_id: str, service_institution_id: str) -> str:
    with db() as conn:
        set_runtime_scope(
            conn,
            tenant_id=tenant_id,
            role="AGENT",
            institution_id=service_institution_id,
        )
        return scalar(
            conn,
            """
            SELECT COALESCE(string_agg(institution_id, ',' ORDER BY institution_id), 'NONE')
            FROM institution_service_assignments
            WHERE institution_id LIKE 'ci-mairie-%'
            """,
        ) or "NONE"


def prepare_fixtures() -> tuple[str, str, str]:
    with db() as conn:
        tenant_id = scalar(conn, "SELECT id FROM tenants ORDER BY id LIMIT 1")
        citizen_a_id = scalar(conn, "SELECT id FROM users ORDER BY created_at, id LIMIT 1")
        citizen_b_id = scalar(conn, "SELECT id FROM users ORDER BY created_at, id OFFSET 1 LIMIT 1")
        if not tenant_id or not citizen_a_id or not citizen_b_id:
            raise AssertionError("Seed must provide a tenant and at least two users")
        if citizen_a_id == citizen_b_id:
            raise AssertionError("Citizen fixtures must use two distinct identities")

        execute(
            conn,
            """
            INSERT INTO institutions (id, tenant_id, name, type, parent_id, is_active)
            VALUES
              ('ci-mairie-a', %s, 'CI Mairie A', 'mairie', NULL, TRUE),
              ('ci-service-a1', %s, 'CI Etat civil A1', 'service', 'ci-mairie-a', TRUE),
              ('ci-service-a2', %s, 'CI Urbanisme A2', 'service', 'ci-mairie-a', TRUE),
              ('ci-mairie-b', %s, 'CI Mairie B', 'mairie', NULL, TRUE),
              ('ci-service-b1', %s, 'CI Etat civil B1', 'service', 'ci-mairie-b', TRUE)
            ON CONFLICT (id) DO NOTHING
            """,
            (tenant_id,) * 5,
        )

        # This row predates the first route. The assignment INSERT trigger must
        # immediately freeze it onto service A1.
        execute(
            conn,
            """
            INSERT INTO service_requests (
              id, reference, service_id, service_name, category, category_id,
              citizen_id, citizen_name, citizen_first_name, citizen_nin,
              citizen_phone, citizen_email, citizen_address, motif,
              required_documents, status, assigned_service, timeline,
              deadline_days, deadline_date, delivery_mode,
              tenant_id, institution_id, service_institution_id
            ) VALUES (
              'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'CI-MAIRIE-A-LEGACY-1',
              'ci-acte-a', 'Acte A', 'Etat civil', 'etat-civil', %s,
              'Diallo', 'Aminata', 'CI-NIN-A1', '+224600000001', 'a1@ci.test',
              'Commune A', 'Isolation A historique 1', '[]'::json, 'soumise',
              'CI Etat civil A1', '[]'::json, 5, now() + interval '5 days', 'guichet',
              %s, 'ci-mairie-a', NULL
            ) ON CONFLICT (reference) DO NOTHING
            """,
            (citizen_a_id, tenant_id),
        )

        execute(
            conn,
            """
            INSERT INTO institution_service_assignments
              (id, tenant_id, institution_id, service_id, service_institution_id, is_active)
            VALUES
              ('11111111-1111-4111-8111-111111111111', %s, 'ci-mairie-a', 'ci-acte-a', 'ci-service-a1', TRUE),
              ('22222222-2222-4222-8222-222222222222', %s, 'ci-mairie-b', 'ci-acte-b', 'ci-service-b1', TRUE)
            ON CONFLICT (tenant_id, institution_id, service_id) DO UPDATE
              SET service_institution_id = EXCLUDED.service_institution_id,
                  is_active = TRUE
            """,
            (tenant_id, tenant_id),
        )

        execute(
            conn,
            """
            INSERT INTO service_requests (
              id, reference, service_id, service_name, category, category_id,
              citizen_id, citizen_name, citizen_first_name, citizen_nin,
              citizen_phone, citizen_email, citizen_address, motif,
              required_documents, status, assigned_service, timeline,
              deadline_days, deadline_date, delivery_mode,
              tenant_id, institution_id, service_institution_id
            ) VALUES
              (
                'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'CI-MAIRIE-A-NEW-A1',
                'ci-acte-a', 'Acte A', 'Etat civil', 'etat-civil', %s,
                'Bah', 'Mamadou', 'CI-NIN-A2', '+224600000002', 'a2@ci.test',
                'Commune A', 'Isolation A nouvelle A1', '[]'::json, 'soumise',
                'CI Etat civil A1', '[]'::json, 5, now() + interval '5 days', 'guichet',
                %s, 'ci-mairie-a', 'ci-service-a1'
              ),
              (
                'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'CI-MAIRIE-B-NEW-B1',
                'ci-acte-b', 'Acte B', 'Etat civil', 'etat-civil', %s,
                'Camara', 'Fatoumata', 'CI-NIN-B1', '+224600000003', 'b1@ci.test',
                'Commune B', 'Isolation B nouvelle B1', '[]'::json, 'soumise',
                'CI Etat civil B1', '[]'::json, 5, now() + interval '5 days', 'guichet',
                %s, 'ci-mairie-b', 'ci-service-b1'
              )
            ON CONFLICT (reference) DO NOTHING
            """,
            (citizen_a_id, tenant_id, citizen_b_id, tenant_id),
        )

        # This second historical row has no frozen service yet. The active A1
        # mapping makes it visible to A1, and the BEFORE UPDATE trigger must
        # freeze it to A1 before future work moves to A2.
        execute(
            conn,
            """
            INSERT INTO service_requests (
              id, reference, service_id, service_name, category, category_id,
              citizen_id, citizen_name, citizen_first_name, citizen_nin,
              citizen_phone, citizen_email, citizen_address, motif,
              required_documents, status, assigned_service, timeline,
              deadline_days, deadline_date, delivery_mode,
              tenant_id, institution_id, service_institution_id
            ) VALUES (
              'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'CI-MAIRIE-A-LEGACY-2',
              'ci-acte-a', 'Acte A', 'Etat civil', 'etat-civil', %s,
              'Sylla', 'Mariama', 'CI-NIN-A3', '+224600000004', 'a3@ci.test',
              'Commune A', 'Isolation A historique 2', '[]'::json, 'soumise',
              'CI Etat civil A1', '[]'::json, 5, now() + interval '5 days', 'guichet',
              %s, 'ci-mairie-a', NULL
            ) ON CONFLICT (reference) DO NOTHING
            """,
            (citizen_a_id, tenant_id),
        )

        execute(
            conn,
            """
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eadmin_runtime_ci') THEN
                CREATE ROLE eadmin_runtime_ci NOLOGIN NOSUPERUSER NOBYPASSRLS;
              END IF;
            END $$;
            GRANT USAGE ON SCHEMA public TO eadmin_runtime_ci;
            GRANT SELECT, UPDATE ON service_requests TO eadmin_runtime_ci;
            GRANT SELECT, INSERT, UPDATE, DELETE
              ON institution_service_assignments TO eadmin_runtime_ci;
            """,
        )

        assert_equal(
            scalar(
                conn,
                "SELECT service_institution_id FROM service_requests WHERE reference='CI-MAIRIE-A-LEGACY-1'",
            ),
            "ci-service-a1",
            "assignment insert freezes pre-existing legacy row",
        )
        return tenant_id, citizen_a_id, citizen_b_id


def insert_new_a2(tenant_id: str, citizen_a_id: str) -> None:
    with db() as conn:
        execute(
            conn,
            """
            INSERT INTO service_requests (
              id, reference, service_id, service_name, category, category_id,
              citizen_id, citizen_name, citizen_first_name, citizen_nin,
              citizen_phone, citizen_email, citizen_address, motif,
              required_documents, status, assigned_service, timeline,
              deadline_days, deadline_date, delivery_mode,
              tenant_id, institution_id, service_institution_id
            ) VALUES (
              'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'CI-MAIRIE-A-NEW-A2',
              'ci-acte-a', 'Acte A', 'Etat civil', 'etat-civil', %s,
              'Keita', 'Ibrahima', 'CI-NIN-A4', '+224600000005', 'a4@ci.test',
              'Commune A', 'Isolation A nouvelle A2', '[]'::json, 'soumise',
              'CI Urbanisme A2', '[]'::json, 5, now() + interval '5 days', 'guichet',
              %s, 'ci-mairie-a', 'ci-service-a2'
            ) ON CONFLICT (reference) DO NOTHING
            """,
            (citizen_a_id, tenant_id),
        )


def main() -> None:
    tenant_id, citizen_a_id, citizen_b_id = prepare_fixtures()

    expected_a1_before_move = (
        "CI-MAIRIE-A-LEGACY-1,CI-MAIRIE-A-LEGACY-2,CI-MAIRIE-A-NEW-A1"
    )
    for role in ("AGENT", "CHEF_SERVICE"):
        assert_equal(
            visible_requests(tenant_id, role, institution_id="ci-service-a1"),
            expected_a1_before_move,
            f"{role} A1 reads only A1 work",
        )

    assert_equal(
        visible_requests(tenant_id, "AGENT", institution_id="ci-service-b1"),
        "CI-MAIRIE-B-NEW-B1",
        "Agent B1 reads only B1 work",
    )

    expected_mairie_a = expected_a1_before_move
    for role in ("MAIRIE", "ADMIN"):
        assert_equal(
            visible_requests(tenant_id, role, institution_id="ci-mairie-a"),
            expected_mairie_a,
            f"{role} A reads only municipality A",
        )
    assert_equal(
        visible_requests(tenant_id, "MAIRIE", institution_id="ci-mairie-b"),
        "CI-MAIRIE-B-NEW-B1",
        "Mairie B reads only municipality B",
    )

    assert_equal(
        visible_requests(tenant_id, "CITOYEN", user_id=citizen_a_id),
        expected_mairie_a,
        "Citizen A reads only own requests",
    )
    assert_equal(
        visible_requests(tenant_id, "CITOYEN", user_id=citizen_b_id),
        "CI-MAIRIE-B-NEW-B1",
        "Citizen B reads only own requests",
    )

    assert_equal(
        visible_requests(tenant_id, "AGENT", institution_id=""),
        "NONE",
        "Agent without service fails closed",
    )
    assert_equal(
        visible_requests("ci-wrong-tenant", "AGENT", institution_id="ci-service-a1"),
        "NONE",
        "Wrong tenant fails closed",
    )

    assert_equal(
        update_request_as(
            tenant_id,
            "AGENT",
            "ci-service-a1",
            "CI-MAIRIE-B-NEW-B1",
            "ILLEGAL-AGENT-CROSS",
        ),
        "NONE",
        "Agent A cannot update municipality B request",
    )
    assert_equal(
        update_request_as(
            tenant_id,
            "MAIRIE",
            "ci-mairie-a",
            "CI-MAIRIE-B-NEW-B1",
            "ILLEGAL-MAIRIE-CROSS",
        ),
        "NONE",
        "Mairie A cannot update municipality B request",
    )
    assert_equal(
        update_request_as(
            tenant_id,
            "AGENT",
            "ci-service-a1",
            "CI-MAIRIE-A-NEW-A1",
            "LEGAL-A1-UPDATE",
        ),
        "CI-MAIRIE-A-NEW-A1",
        "Agent A can update own service request",
    )
    with db() as conn:
        assert_equal(
            scalar(
                conn,
                "SELECT motif FROM service_requests WHERE reference='CI-MAIRIE-B-NEW-B1'",
            ),
            "Isolation B nouvelle B1",
            "Cross-scope update leaves B unchanged",
        )

    assert_equal(
        assignment_visibility(tenant_id, "ci-service-a1"),
        "ci-mairie-a",
        "Agent A sees only assignment A",
    )
    assert_equal(
        assignment_visibility(tenant_id, "ci-service-b1"),
        "ci-mairie-b",
        "Agent B sees only assignment B",
    )
    assert_equal(
        update_assignment_as(
            tenant_id,
            "AGENT",
            "ci-service-a1",
            target_mairie="ci-mairie-a",
            service_id="ci-acte-a",
            is_active=False,
        ),
        "NONE",
        "Agent cannot modify even own service assignment",
    )
    assert_equal(
        update_assignment_as(
            tenant_id,
            "MAIRIE",
            "ci-mairie-a",
            target_mairie="ci-mairie-b",
            service_id="ci-acte-b",
            is_active=False,
        ),
        "NONE",
        "Mairie A cannot modify municipality B assignment",
    )

    assert_equal(
        update_assignment_as(
            tenant_id,
            "MAIRIE",
            "ci-mairie-a",
            target_mairie="ci-mairie-a",
            service_id="ci-acte-a",
            new_service_institution_id="ci-service-a2",
        ),
        "ci-mairie-a",
        "Mairie A may move future route A1 to A2",
    )
    with db() as conn:
        assert_equal(
            scalar(
                conn,
                """
                SELECT string_agg(reference || ':' || service_institution_id, ',' ORDER BY reference)
                FROM service_requests
                WHERE reference IN ('CI-MAIRIE-A-LEGACY-1','CI-MAIRIE-A-LEGACY-2')
                """,
            ),
            "CI-MAIRIE-A-LEGACY-1:ci-service-a1,CI-MAIRIE-A-LEGACY-2:ci-service-a1",
            "Historical rows remain frozen to A1 after reassignment",
        )

    insert_new_a2(tenant_id, citizen_a_id)
    assert_equal(
        visible_requests(tenant_id, "AGENT", institution_id="ci-service-a1", prefix="CI-MAIRIE-A-%"),
        expected_a1_before_move,
        "Agent A1 keeps historical and previously routed A1 work",
    )
    assert_equal(
        visible_requests(tenant_id, "AGENT", institution_id="ci-service-a2", prefix="CI-MAIRIE-A-%"),
        "CI-MAIRIE-A-NEW-A2",
        "Agent A2 sees only new work after reassignment",
    )
    assert_equal(
        visible_requests(tenant_id, "MAIRIE", institution_id="ci-mairie-a", prefix="CI-MAIRIE-A-%"),
        expected_a1_before_move + ",CI-MAIRIE-A-NEW-A2",
        "Mairie A keeps visibility over all its internal services",
    )

    print("Municipality Service Request PostgreSQL RLS matrix: PASS")


if __name__ == "__main__":
    main()
