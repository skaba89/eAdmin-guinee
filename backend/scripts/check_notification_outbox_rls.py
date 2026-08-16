"""PostgreSQL proof for notification-outbox tenant RLS and claim ownership."""

import os
import uuid
from datetime import datetime, timedelta, timezone

import psycopg2
from psycopg2 import sql

RUNTIME_ROLE = "eadmin_notification_runtime"
TENANT_A = "notification-rls-tenant-a"
TENANT_B = "notification-rls-tenant-b"
OUTBOX_A = uuid.UUID("71000000-0000-0000-0000-000000000001")
OUTBOX_B = uuid.UUID("71000000-0000-0000-0000-000000000002")
OUTBOX_CONCURRENT = uuid.UUID("71000000-0000-0000-0000-000000000003")
TOKEN_OLD = uuid.UUID("72000000-0000-0000-0000-000000000001")
TOKEN_NEW = uuid.UUID("72000000-0000-0000-0000-000000000002")


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def _set_role(cur) -> None:
    cur.execute(sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(RUNTIME_ROLE)))


def _scope(cur, tenant_id: str, role: str) -> None:
    _set_role(cur)
    cur.execute(
        """
        SELECT
            set_config('app.current_user_id', '', true),
            set_config('app.current_tenant_id', %s, true),
            set_config('app.current_institution_id', '', true),
            set_config('app.current_role', %s, true)
        """,
        (tenant_id, role),
    )


def _seed(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO tenants (
                id, name, is_active, max_users, max_documents, max_storage_mb,
                primary_color, secondary_color, accent_color
            ) VALUES
                (%s, 'Notification Tenant A', TRUE, 100, 1000, 1024,
                    '#CE1126', '#FCD116', '#009460'),
                (%s, 'Notification Tenant B', TRUE, 100, 1000, 1024,
                    '#CE1126', '#FCD116', '#009460')
            ON CONFLICT (id) DO NOTHING
            """,
            (TENANT_A, TENANT_B),
        )
        rows = (
            (OUTBOX_A, TENANT_A, "a@example.gn", "a" * 64),
            (OUTBOX_B, TENANT_B, "b@example.gn", "b" * 64),
            (OUTBOX_CONCURRENT, TENANT_A, "concurrent@example.gn", "c" * 64),
        )
        for outbox_id, tenant_id, recipient, key in rows:
            cur.execute(
                """
                INSERT INTO notification_outbox (
                    id, tenant_id, event_type, channel, recipient, template_key,
                    payload, idempotency_key, status, attempt_count, max_attempts
                ) VALUES (
                    %s, %s, 'request.status.changed', 'email', %s,
                    'request_status', '{}'::json, %s, 'pending', 0, 5
                )
                ON CONFLICT (id) DO NOTHING
                """,
                (str(outbox_id), tenant_id, recipient, key),
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
                "GRANT SELECT, INSERT, UPDATE ON notification_outbox TO {}"
            ).format(role)
        )
    conn.commit()


def _check_force_rls(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT relrowsecurity, relforcerowsecurity
            FROM pg_class
            WHERE relname = 'notification_outbox'
            """
        )
        row = cur.fetchone()
    _require(bool(row and row[0] and row[1]), "notification_outbox must use FORCE RLS")


def _check_application_scope(conn) -> None:
    conn.rollback()
    with conn.cursor() as cur:
        _scope(cur, TENANT_A, "CITOYEN")
        cur.execute("SELECT DISTINCT tenant_id FROM notification_outbox")
        _require(
            {row[0] for row in cur.fetchall()} == {TENANT_A},
            "Tenant A must not read tenant B outbox rows",
        )
        cur.execute(
            """
            INSERT INTO notification_outbox (
                id, tenant_id, event_type, channel, recipient, template_key,
                payload, idempotency_key, status, attempt_count, max_attempts
            ) VALUES (
                %s, %s, 'test', 'email', 'allowed@example.gn', 'test',
                '{}'::json, %s, 'pending', 0, 5
            )
            """,
            (str(uuid.uuid4()), TENANT_A, uuid.uuid4().hex + uuid.uuid4().hex),
        )
    conn.rollback()

    try:
        with conn.cursor() as cur:
            _scope(cur, TENANT_A, "CITOYEN")
            cur.execute(
                """
                INSERT INTO notification_outbox (
                    id, tenant_id, event_type, channel, recipient, template_key,
                    payload, idempotency_key, status, attempt_count, max_attempts
                ) VALUES (
                    %s, %s, 'test', 'email', 'forged@example.gn', 'test',
                    '{}'::json, %s, 'pending', 0, 5
                )
                """,
                (str(uuid.uuid4()), TENANT_B, uuid.uuid4().hex + uuid.uuid4().hex),
            )
    except psycopg2.Error:
        conn.rollback()
    else:
        conn.rollback()
        raise RuntimeError("Tenant A must not insert tenant B outbox rows")

    with conn.cursor() as cur:
        _scope(cur, TENANT_A, "CITOYEN")
        cur.execute(
            "UPDATE notification_outbox SET status = 'sent' WHERE id = %s",
            (str(OUTBOX_A),),
        )
        _require(cur.rowcount == 0, "Application roles must not mutate outbox state")
    conn.rollback()


def _check_missing_scope(conn) -> None:
    with conn.cursor() as cur:
        _set_role(cur)
        cur.execute("SELECT COUNT(*) FROM notification_outbox")
        _require(cur.fetchone()[0] == 0, "Missing tenant scope must expose zero rows")
    conn.rollback()


def _worker_connection(database_url: str):
    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    return conn


def _check_concurrent_claim(database_url: str) -> None:
    first = _worker_connection(database_url)
    second = _worker_connection(database_url)
    try:
        with first.cursor() as cur:
            _scope(cur, TENANT_A, "SYSTEM_WORKER")
            cur.execute("SELECT DISTINCT tenant_id FROM notification_outbox")
            _require(
                {row[0] for row in cur.fetchall()} == {TENANT_A},
                "Worker A must not see tenant B",
            )
            cur.execute(
                """
                SELECT id FROM notification_outbox
                WHERE id = %s AND status = 'pending'
                FOR UPDATE SKIP LOCKED
                """,
                (str(OUTBOX_CONCURRENT),),
            )
            claimed = cur.fetchone()
            _require(
                claimed is not None and str(claimed[0]) == str(OUTBOX_CONCURRENT),
                "First worker must claim row",
            )

        with second.cursor() as cur:
            _scope(cur, TENANT_A, "SYSTEM_WORKER")
            cur.execute(
                """
                SELECT id FROM notification_outbox
                WHERE id = %s AND status = 'pending'
                FOR UPDATE SKIP LOCKED
                """,
                (str(OUTBOX_CONCURRENT),),
            )
            _require(cur.fetchone() is None, "Second worker must skip locked row")
        second.rollback()

        with first.cursor() as cur:
            cur.execute(
                """
                UPDATE notification_outbox
                SET status = 'processing', processing_token = %s, locked_at = NOW()
                WHERE id = %s
                """,
                (str(TOKEN_OLD), str(OUTBOX_CONCURRENT)),
            )
            _require(cur.rowcount == 1, "First worker must persist its claim token")
        first.commit()

        stale_time = datetime.now(timezone.utc) - timedelta(minutes=20)
        with second.cursor() as cur:
            _scope(cur, TENANT_A, "SYSTEM_WORKER")
            cur.execute(
                """
                UPDATE notification_outbox
                SET locked_at = %s
                WHERE id = %s AND processing_token = %s
                """,
                (stale_time, str(OUTBOX_CONCURRENT), str(TOKEN_OLD)),
            )
            cur.execute(
                """
                UPDATE notification_outbox
                SET status = 'retry', processing_token = NULL,
                    locked_at = NULL, next_attempt_at = NOW()
                WHERE id = %s AND status = 'processing'
                    AND processing_token = %s
                """,
                (str(OUTBOX_CONCURRENT), str(TOKEN_OLD)),
            )
            _require(cur.rowcount == 1, "Second worker must recover stale claim")
            cur.execute(
                """
                UPDATE notification_outbox
                SET status = 'processing', processing_token = %s, locked_at = NOW()
                WHERE id = %s AND status = 'retry'
                """,
                (str(TOKEN_NEW), str(OUTBOX_CONCURRENT)),
            )
            _require(cur.rowcount == 1, "Second worker must install a new token")
        second.commit()

        with first.cursor() as cur:
            _scope(cur, TENANT_A, "SYSTEM_WORKER")
            cur.execute(
                """
                UPDATE notification_outbox
                SET status = 'sent', processing_token = NULL, sent_at = NOW()
                WHERE id = %s AND status = 'processing'
                    AND processing_token = %s
                """,
                (str(OUTBOX_CONCURRENT), str(TOKEN_OLD)),
            )
            _require(
                cur.rowcount == 0,
                "Stale worker token must not finalize a reclaimed row",
            )
        first.rollback()
    finally:
        first.close()
        second.close()


def main() -> None:
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    try:
        _seed(conn)
        _prepare_runtime_role(conn)
        _check_force_rls(conn)
        _check_application_scope(conn)
        _check_missing_scope(conn)
    finally:
        conn.close()

    _check_concurrent_claim(database_url)
    print("NOTIFICATION_OUTBOX_RLS=PASS")


if __name__ == "__main__":
    main()
