"""Runtime PostgreSQL proof for service-request child RLS policies."""

import os
import uuid

import psycopg2
from psycopg2 import sql


RUNTIME_ROLE = "eadmin_request_child_runtime"
TENANT_A = "rls-child-tenant-a"
TENANT_B = "rls-child-tenant-b"
MAIRIE_A = "rls-child-mairie-a"
MAIRIE_B = "rls-child-mairie-b"
SERVICE_A = "rls-child-service-a"
SERVICE_B = "rls-child-service-b"
CITIZEN_A = uuid.UUID("10000000-0000-0000-0000-000000000001")
CITIZEN_B = uuid.UUID("10000000-0000-0000-0000-000000000002")
AGENT_A = uuid.UUID("20000000-0000-0000-0000-000000000001")
AGENT_B = uuid.UUID("20000000-0000-0000-0000-000000000002")
REQUEST_A = uuid.UUID("30000000-0000-0000-0000-000000000001")
REQUEST_B = uuid.UUID("30000000-0000-0000-0000-000000000002")
NOTE_A = uuid.UUID("40000000-0000-0000-0000-000000000001")
NOTE_B = uuid.UUID("40000000-0000-0000-0000-000000000002")
ATTACHMENT_A = uuid.UUID("50000000-0000-0000-0000-000000000001")
ATTACHMENT_A_STAFF = uuid.UUID("50000000-0000-0000-0000-000000000003")
ATTACHMENT_B = uuid.UUID("50000000-0000-0000-0000-000000000002")
DOCUMENT_A = uuid.UUID("60000000-0000-0000-0000-000000000001")
DOCUMENT_B = uuid.UUID("60000000-0000-0000-0000-000000000002")


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def _set_runtime_role(cur) -> None:
    cur.execute(
        sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(RUNTIME_ROLE))
    )


def _scope(
    cur,
    *,
    user_id: uuid.UUID,
    tenant_id: str,
    institution_id: str,
    role: str,
) -> None:
    _set_runtime_role(cur)
    cur.execute(
        """
        SELECT
            set_config('app.current_user_id', %s, true),
            set_config('app.current_tenant_id', %s, true),
            set_config('app.current_institution_id', %s, true),
            set_config('app.current_role', %s, true)
        """,
        (str(user_id), tenant_id, institution_id, role),
    )


def _seed(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO tenants (
                id, name, is_active, max_users, max_documents, max_storage_mb,
                primary_color, secondary_color, accent_color
            ) VALUES
                (%s, 'Tenant child RLS A', TRUE, 100, 1000, 1024, '#CE1126', '#FCD116', '#009460'),
                (%s, 'Tenant child RLS B', TRUE, 100, 1000, 1024, '#CE1126', '#FCD116', '#009460')
            ON CONFLICT (id) DO NOTHING
            """,
            (TENANT_A, TENANT_B),
        )
        cur.execute(
            """
            INSERT INTO institutions (id, tenant_id, name, type, parent_id, is_active) VALUES
                (%s, %s, 'Mairie A', 'mairie', NULL, TRUE),
                (%s, %s, 'Service A', 'service', %s, TRUE),
                (%s, %s, 'Mairie B', 'mairie', NULL, TRUE),
                (%s, %s, 'Service B', 'service', %s, TRUE)
            ON CONFLICT (id) DO NOTHING
            """,
            (
                MAIRIE_A,
                TENANT_A,
                SERVICE_A,
                TENANT_A,
                MAIRIE_A,
                MAIRIE_B,
                TENANT_B,
                SERVICE_B,
                TENANT_B,
                MAIRIE_B,
            ),
        )
        cur.execute(
            """
            INSERT INTO users (
                id, email, hashed_password, full_name, role, tenant_id,
                institution_id, is_active
            ) VALUES
                (%s, 'child-citizen-a@test.gn', 'x', 'Citizen A', 'CITOYEN', %s, NULL, TRUE),
                (%s, 'child-citizen-b@test.gn', 'x', 'Citizen B', 'CITOYEN', %s, NULL, TRUE),
                (%s, 'child-agent-a@test.gn', 'x', 'Agent A', 'AGENT', %s, %s, TRUE),
                (%s, 'child-agent-b@test.gn', 'x', 'Agent B', 'AGENT', %s, %s, TRUE)
            ON CONFLICT (id) DO NOTHING
            """,
            (
                str(CITIZEN_A),
                TENANT_A,
                str(CITIZEN_B),
                TENANT_B,
                str(AGENT_A),
                TENANT_A,
                SERVICE_A,
                str(AGENT_B),
                TENANT_B,
                SERVICE_B,
            ),
        )
        cur.execute(
            """
            INSERT INTO service_requests (
                id, reference, service_id, service_name, category, category_id,
                citizen_id, citizen_name, citizen_first_name, citizen_nin,
                citizen_phone, citizen_email, citizen_address, motif,
                status, assigned_service, deadline_days, deadline_date,
                delivery_mode, tenant_id, institution_id, service_institution_id
            ) VALUES
                (
                    %s, 'RLS-CHILD-A', 'acte-a', 'Acte A', 'État civil', 'etat-civil',
                    %s, 'Diallo', 'Aminata', 'NIN-A', '+224600000001',
                    'child-citizen-a@test.gn', 'Conakry', 'Test child RLS A',
                    'soumise', 'Service A', 5, NOW() + INTERVAL '5 days',
                    'en_ligne', %s, %s, %s
                ),
                (
                    %s, 'RLS-CHILD-B', 'acte-b', 'Acte B', 'État civil', 'etat-civil',
                    %s, 'Camara', 'Mariam', 'NIN-B', '+224600000002',
                    'child-citizen-b@test.gn', 'Conakry', 'Test child RLS B',
                    'soumise', 'Service B', 5, NOW() + INTERVAL '5 days',
                    'en_ligne', %s, %s, %s
                )
            ON CONFLICT (id) DO NOTHING
            """,
            (
                str(REQUEST_A),
                str(CITIZEN_A),
                TENANT_A,
                MAIRIE_A,
                SERVICE_A,
                str(REQUEST_B),
                str(CITIZEN_B),
                TENANT_B,
                MAIRIE_B,
                SERVICE_B,
            ),
        )
        cur.execute(
            """
            INSERT INTO service_request_notes (
                id, request_id, author_id, author_name, author_role, note_type, text
            ) VALUES
                (%s, %s, %s, 'Agent A', 'AGENT', 'note', 'Note A'),
                (%s, %s, %s, 'Agent B', 'AGENT', 'note', 'Note B')
            ON CONFLICT (id) DO NOTHING
            """,
            (
                str(NOTE_A),
                str(REQUEST_A),
                str(AGENT_A),
                str(NOTE_B),
                str(REQUEST_B),
                str(AGENT_B),
            ),
        )
        cur.execute(
            """
            INSERT INTO service_request_attachments (
                id, request_id, original_name, sanitized_name, content_type,
                file_size, object_key, required_doc_name, verified, uploaded_by
            ) VALUES
                (%s, %s, 'citizen-a.pdf', 'citizen-a.pdf', 'application/pdf', 10,
                    'service-requests/a/citizen-a.pdf', 'CNI', FALSE, %s),
                (%s, %s, 'staff-a.pdf', 'staff-a.pdf', 'application/pdf', 11,
                    'service-requests/a/staff-a.pdf', 'Acte', FALSE, %s),
                (%s, %s, 'citizen-b.pdf', 'citizen-b.pdf', 'application/pdf', 12,
                    'service-requests/b/citizen-b.pdf', 'CNI', FALSE, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            (
                str(ATTACHMENT_A),
                str(REQUEST_A),
                str(CITIZEN_A),
                str(ATTACHMENT_A_STAFF),
                str(REQUEST_A),
                str(AGENT_A),
                str(ATTACHMENT_B),
                str(REQUEST_B),
                str(CITIZEN_B),
            ),
        )
        cur.execute(
            """
            INSERT INTO generated_service_documents (
                id, request_id, title, html_content, content_hash, file_name,
                generated_by, generated_by_name, rendered_server_side
            ) VALUES
                (%s, %s, 'Document A', '<p>A</p>', %s, 'document-a.html', %s, 'Agent A', TRUE),
                (%s, %s, 'Document B', '<p>B</p>', %s, 'document-b.html', %s, 'Agent B', TRUE)
            ON CONFLICT (id) DO NOTHING
            """,
            (
                str(DOCUMENT_A),
                str(REQUEST_A),
                "a" * 64,
                str(AGENT_A),
                str(DOCUMENT_B),
                str(REQUEST_B),
                "b" * 64,
                str(AGENT_B),
            ),
        )
    conn.commit()


def _prepare_runtime_role(conn) -> None:
    role = sql.Identifier(RUNTIME_ROLE)
    with conn.cursor() as cur:
        cur.execute(sql.SQL("DROP ROLE IF EXISTS {}").format(role))
        cur.execute(
            sql.SQL(
                "CREATE ROLE {} NOSUPERUSER NOCREATEDB NOCREATEROLE "
                "NOINHERIT NOBYPASSRLS"
            ).format(role)
        )
        cur.execute(sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(role))
        cur.execute(
            sql.SQL(
                "GRANT SELECT ON service_requests, institutions, "
                "institution_service_assignments TO {}"
            ).format(role)
        )
        cur.execute(
            sql.SQL(
                "GRANT SELECT, INSERT, UPDATE, DELETE ON "
                "service_request_notes TO {}"
            ).format(role)
        )
        cur.execute(
            sql.SQL(
                "GRANT SELECT, INSERT, UPDATE, DELETE ON "
                "service_request_attachments TO {}"
            ).format(role)
        )
        cur.execute(
            sql.SQL(
                "GRANT SELECT, INSERT, UPDATE, DELETE ON "
                "generated_service_documents TO {}"
            ).format(role)
        )
    conn.commit()


def _check_rls_flags(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT relname, relrowsecurity, relforcerowsecurity
            FROM pg_class
            WHERE relname IN (
                'service_request_notes',
                'service_request_attachments',
                'generated_service_documents'
            )
            ORDER BY relname
            """
        )
        rows = cur.fetchall()
    _require(len(rows) == 3, "Expected all three service-request child tables")
    _require(
        all(row[1] and row[2] for row in rows),
        "Child RLS must be ENABLED and FORCED",
    )


def _visible_counts(
    conn,
    *,
    user_id: uuid.UUID,
    tenant_id: str,
    institution_id: str,
    role: str,
):
    conn.rollback()
    with conn.cursor() as cur:
        _scope(
            cur,
            user_id=user_id,
            tenant_id=tenant_id,
            institution_id=institution_id,
            role=role,
        )
        cur.execute("SELECT COUNT(*) FROM service_request_notes")
        notes = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM service_request_attachments")
        attachments = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM generated_service_documents")
        documents = cur.fetchone()[0]
    conn.rollback()
    return notes, attachments, documents


def _expect_rejected(conn, operation, message: str) -> None:
    try:
        operation()
    except psycopg2.Error:
        conn.rollback()
        return
    conn.rollback()
    raise RuntimeError(message)


def main() -> None:
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    try:
        _seed(conn)
        _prepare_runtime_role(conn)
        _check_rls_flags(conn)

        _require(
            _visible_counts(
                conn,
                user_id=CITIZEN_A,
                tenant_id=TENANT_A,
                institution_id="",
                role="CITOYEN",
            )
            == (1, 2, 1),
            "Citizen A must only see child records attached to request A",
        )
        _require(
            _visible_counts(
                conn,
                user_id=AGENT_A,
                tenant_id=TENANT_A,
                institution_id=SERVICE_A,
                role="AGENT",
            )
            == (1, 2, 1),
            "Agent A must only see child records routed to service A",
        )
        _require(
            _visible_counts(
                conn,
                user_id=AGENT_B,
                tenant_id=TENANT_B,
                institution_id=SERVICE_B,
                role="AGENT",
            )
            == (1, 1, 1),
            "Agent B must only see child records routed to service B",
        )

        conn.rollback()
        with conn.cursor() as cur:
            _scope(
                cur,
                user_id=CITIZEN_A,
                tenant_id=TENANT_A,
                institution_id="",
                role="CITOYEN",
            )
            cur.execute(
                """
                INSERT INTO service_request_notes (
                    id, request_id, author_id, author_name,
                    author_role, note_type, text
                ) VALUES (
                    %s, %s, %s, 'Citizen A',
                    'CITOYEN', 'notification', 'Soumission citoyenne'
                )
                """,
                (str(uuid.uuid4()), str(REQUEST_A), str(CITIZEN_A)),
            )
        conn.rollback()

        def citizen_decision_note() -> None:
            with conn.cursor() as cur:
                _scope(
                    cur,
                    user_id=CITIZEN_A,
                    tenant_id=TENANT_A,
                    institution_id="",
                    role="CITOYEN",
                )
                cur.execute(
                    """
                    INSERT INTO service_request_notes (
                        id, request_id, author_id, author_name,
                        author_role, note_type, text
                    ) VALUES (
                        %s, %s, %s, 'Citizen A',
                        'CITOYEN', 'decision', 'Forged decision'
                    )
                    """,
                    (str(uuid.uuid4()), str(REQUEST_A), str(CITIZEN_A)),
                )

        _expect_rejected(
            conn,
            citizen_decision_note,
            "Citizen decision note must be rejected",
        )

        def forged_note_author() -> None:
            with conn.cursor() as cur:
                _scope(
                    cur,
                    user_id=AGENT_A,
                    tenant_id=TENANT_A,
                    institution_id=SERVICE_A,
                    role="AGENT",
                )
                cur.execute(
                    """
                    INSERT INTO service_request_notes (
                        id, request_id, author_id, author_name,
                        author_role, note_type, text
                    ) VALUES (
                        %s, %s, %s, 'Agent B',
                        'AGENT', 'note', 'Forged author'
                    )
                    """,
                    (str(uuid.uuid4()), str(REQUEST_A), str(AGENT_B)),
                )

        _expect_rejected(conn, forged_note_author, "Forged note author must be rejected")

        conn.rollback()
        with conn.cursor() as cur:
            _scope(
                cur,
                user_id=CITIZEN_A,
                tenant_id=TENANT_A,
                institution_id="",
                role="CITOYEN",
            )
            cur.execute(
                "DELETE FROM service_request_attachments WHERE id = %s",
                (str(ATTACHMENT_A_STAFF),),
            )
            _require(
                cur.rowcount == 0,
                "Citizen must not delete another uploader's attachment",
            )
            cur.execute(
                "DELETE FROM service_request_attachments WHERE id = %s",
                (str(ATTACHMENT_A),),
            )
            _require(
                cur.rowcount == 1,
                "Citizen must be able to delete their own visible attachment",
            )
        conn.rollback()

        conn.rollback()
        with conn.cursor() as cur:
            _scope(
                cur,
                user_id=AGENT_A,
                tenant_id=TENANT_A,
                institution_id=SERVICE_A,
                role="AGENT",
            )
            cur.execute(
                "UPDATE service_request_attachments SET verified = TRUE WHERE id = %s",
                (str(ATTACHMENT_A),),
            )
            _require(
                cur.rowcount == 1,
                "Authorized staff must be able to verify an attachment",
            )
        conn.rollback()

        def mutate_attachment_key() -> None:
            with conn.cursor() as cur:
                _scope(
                    cur,
                    user_id=AGENT_A,
                    tenant_id=TENANT_A,
                    institution_id=SERVICE_A,
                    role="AGENT",
                )
                cur.execute(
                    """
                    UPDATE service_request_attachments
                    SET object_key = 'forged/key.pdf'
                    WHERE id = %s
                    """,
                    (str(ATTACHMENT_A),),
                )

        _expect_rejected(
            conn,
            mutate_attachment_key,
            "Attachment storage metadata must be immutable",
        )

        conn.rollback()
        with conn.cursor() as cur:
            _scope(
                cur,
                user_id=CITIZEN_A,
                tenant_id=TENANT_A,
                institution_id="",
                role="CITOYEN",
            )
            cur.execute(
                """
                UPDATE generated_service_documents
                SET title = 'Citizen forged title'
                WHERE id = %s
                """,
                (str(DOCUMENT_A),),
            )
            _require(cur.rowcount == 0, "Citizen must not update generated documents")
        conn.rollback()

        conn.rollback()
        with conn.cursor() as cur:
            _scope(
                cur,
                user_id=AGENT_A,
                tenant_id=TENANT_A,
                institution_id=SERVICE_A,
                role="AGENT",
            )
            cur.execute(
                """
                UPDATE generated_service_documents
                SET title = 'Regenerated A',
                    generated_by = %s,
                    generated_by_name = 'Agent A'
                WHERE id = %s
                """,
                (str(AGENT_A), str(DOCUMENT_A)),
            )
            _require(
                cur.rowcount == 1,
                "Authorized staff must be able to regenerate a visible document",
            )
        conn.rollback()

        def reparent_generated_document() -> None:
            with conn.cursor() as cur:
                _scope(
                    cur,
                    user_id=AGENT_A,
                    tenant_id=TENANT_A,
                    institution_id=SERVICE_A,
                    role="AGENT",
                )
                cur.execute(
                    """
                    UPDATE generated_service_documents
                    SET request_id = %s, generated_by = %s
                    WHERE id = %s
                    """,
                    (str(REQUEST_B), str(AGENT_A), str(DOCUMENT_A)),
                )

        _expect_rejected(
            conn,
            reparent_generated_document,
            "Generated document parent must be immutable",
        )

        conn.rollback()
        with conn.cursor() as cur:
            _set_runtime_role(cur)
            cur.execute("SELECT COUNT(*) FROM service_request_notes")
            _require(cur.fetchone()[0] == 0, "Missing RLS scope must expose zero notes")
            cur.execute("SELECT COUNT(*) FROM service_request_attachments")
            _require(
                cur.fetchone()[0] == 0,
                "Missing RLS scope must expose zero attachments",
            )
            cur.execute("SELECT COUNT(*) FROM generated_service_documents")
            _require(
                cur.fetchone()[0] == 0,
                "Missing RLS scope must expose zero generated documents",
            )
        conn.rollback()

        print("SERVICE_REQUEST_CHILD_RLS=PASS")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
