"""Isolate notification outbox by tenant and add worker claim ownership.

Revision ID: notification_outbox_tenant_rls
Revises: request_children_parent_rls
Create Date: 2026-08-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "notification_outbox_tenant_rls"
down_revision = "request_children_parent_rls"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notification_outbox",
        sa.Column("processing_token", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        "ix_notification_outbox_processing_token",
        "notification_outbox",
        ["processing_token"],
    )

    op.execute(
        """
        ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
        ALTER TABLE notification_outbox FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS notification_outbox_tenant_select ON notification_outbox;
        DROP POLICY IF EXISTS notification_outbox_tenant_insert ON notification_outbox;
        DROP POLICY IF EXISTS notification_outbox_worker_update ON notification_outbox;

        CREATE POLICY notification_outbox_tenant_select ON notification_outbox
            FOR SELECT
            USING (
                NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                AND tenant_id = current_setting('app.current_tenant_id', true)
            );

        CREATE POLICY notification_outbox_tenant_insert ON notification_outbox
            FOR INSERT
            WITH CHECK (
                current_setting('app.current_role', true) <> 'SYSTEM_WORKER'
                AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                AND tenant_id = current_setting('app.current_tenant_id', true)
            );

        CREATE POLICY notification_outbox_worker_update ON notification_outbox
            FOR UPDATE
            USING (
                current_setting('app.current_role', true) = 'SYSTEM_WORKER'
                AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                AND tenant_id = current_setting('app.current_tenant_id', true)
            )
            WITH CHECK (
                current_setting('app.current_role', true) = 'SYSTEM_WORKER'
                AND tenant_id = current_setting('app.current_tenant_id', true)
            );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP POLICY IF EXISTS notification_outbox_worker_update ON notification_outbox;
        DROP POLICY IF EXISTS notification_outbox_tenant_insert ON notification_outbox;
        DROP POLICY IF EXISTS notification_outbox_tenant_select ON notification_outbox;
        ALTER TABLE notification_outbox NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE notification_outbox DISABLE ROW LEVEL SECURITY;
        """
    )
    op.drop_index("ix_notification_outbox_processing_token", table_name="notification_outbox")
    op.drop_column("notification_outbox", "processing_token")
