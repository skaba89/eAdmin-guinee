"""Add durable multichannel notification outbox.

Revision ID: notification_outbox
Revises: server_document_templates
Create Date: 2026-08-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "notification_outbox"
down_revision = "server_document_templates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_outbox",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.String(length=100), nullable=False),
        sa.Column("institution_id", sa.String(length=255), nullable=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("recipient", sa.String(length=500), nullable=False),
        sa.Column("template_key", sa.String(length=150), nullable=False),
        sa.Column("payload", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("idempotency_key", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider_name", sa.String(length=100), nullable=True),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["request_id"], ["service_requests.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key", name="uq_notification_outbox_idempotency_key"),
        sa.CheckConstraint(
            "channel IN ('email', 'sms', 'whatsapp')",
            name="ck_notification_outbox_channel",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'processing', 'retry', 'sent', 'dead_letter', 'blocked')",
            name="ck_notification_outbox_status",
        ),
        sa.CheckConstraint(
            "attempt_count >= 0 AND max_attempts >= 1",
            name="ck_notification_outbox_attempts",
        ),
    )
    op.create_index("ix_notification_outbox_tenant_id", "notification_outbox", ["tenant_id"])
    op.create_index("ix_notification_outbox_institution_id", "notification_outbox", ["institution_id"])
    op.create_index("ix_notification_outbox_request_id", "notification_outbox", ["request_id"])
    op.create_index("ix_notification_outbox_event_type", "notification_outbox", ["event_type"])
    op.create_index("ix_notification_outbox_channel", "notification_outbox", ["channel"])
    op.create_index("ix_notification_outbox_status", "notification_outbox", ["status"])
    op.create_index("ix_notification_outbox_next_attempt_at", "notification_outbox", ["next_attempt_at"])
    op.create_index("ix_notification_outbox_created_at", "notification_outbox", ["created_at"])
    op.create_index(
        "ix_notification_outbox_due",
        "notification_outbox",
        ["status", "next_attempt_at", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notification_outbox_due", table_name="notification_outbox")
    op.drop_index("ix_notification_outbox_created_at", table_name="notification_outbox")
    op.drop_index("ix_notification_outbox_next_attempt_at", table_name="notification_outbox")
    op.drop_index("ix_notification_outbox_status", table_name="notification_outbox")
    op.drop_index("ix_notification_outbox_channel", table_name="notification_outbox")
    op.drop_index("ix_notification_outbox_event_type", table_name="notification_outbox")
    op.drop_index("ix_notification_outbox_request_id", table_name="notification_outbox")
    op.drop_index("ix_notification_outbox_institution_id", table_name="notification_outbox")
    op.drop_index("ix_notification_outbox_tenant_id", table_name="notification_outbox")
    op.drop_table("notification_outbox")
