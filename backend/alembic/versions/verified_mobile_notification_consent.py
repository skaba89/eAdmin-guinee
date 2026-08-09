"""Add verified mobile notification consent and OTP challenges.

Revision ID: verified_mobile_consent
Revises: notification_outbox
Create Date: 2026-08-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "verified_mobile_consent"
down_revision = "notification_outbox"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone_e164", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("phone_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "users",
        sa.Column("notification_email_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "users",
        sa.Column("notification_sms_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "users",
        sa.Column("notification_whatsapp_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("users", sa.Column("notification_consent_version", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("notification_consent_updated_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_phone_e164", "users", ["phone_e164"])

    op.create_table(
        "phone_verification_challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.String(length=100), nullable=False),
        sa.Column("phone_e164", sa.String(length=32), nullable=False),
        sa.Column("channel", sa.String(length=16), nullable=False),
        sa.Column("code_salt", sa.String(length=64), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("channel IN ('sms', 'whatsapp')", name="ck_phone_verification_channel"),
        sa.CheckConstraint("attempt_count >= 0 AND max_attempts >= 1", name="ck_phone_verification_attempts"),
    )
    op.create_index("ix_phone_verification_user_id", "phone_verification_challenges", ["user_id"])
    op.create_index("ix_phone_verification_tenant_id", "phone_verification_challenges", ["tenant_id"])
    op.create_index("ix_phone_verification_phone_e164", "phone_verification_challenges", ["phone_e164"])
    op.create_index("ix_phone_verification_expires_at", "phone_verification_challenges", ["expires_at"])
    op.create_index("ix_phone_verification_created_at", "phone_verification_challenges", ["created_at"])
    op.create_index(
        "ix_phone_verification_user_created",
        "phone_verification_challenges",
        ["user_id", "created_at"],
    )

    # Verification challenges contain security-sensitive possession evidence.
    # Only the authenticated user, in the same tenant, may read or mutate their
    # own rows. FORCE keeps the table owner subject to the policy as well.
    op.execute("ALTER TABLE phone_verification_challenges ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE phone_verification_challenges FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY phone_verification_self_policy
        ON phone_verification_challenges
        USING (
            tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
            AND user_id::text = NULLIF(current_setting('app.current_user_id', true), '')
        )
        WITH CHECK (
            tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
            AND user_id::text = NULLIF(current_setting('app.current_user_id', true), '')
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS phone_verification_self_policy ON phone_verification_challenges")
    op.drop_index("ix_phone_verification_user_created", table_name="phone_verification_challenges")
    op.drop_index("ix_phone_verification_created_at", table_name="phone_verification_challenges")
    op.drop_index("ix_phone_verification_expires_at", table_name="phone_verification_challenges")
    op.drop_index("ix_phone_verification_phone_e164", table_name="phone_verification_challenges")
    op.drop_index("ix_phone_verification_tenant_id", table_name="phone_verification_challenges")
    op.drop_index("ix_phone_verification_user_id", table_name="phone_verification_challenges")
    op.drop_table("phone_verification_challenges")

    op.drop_index("ix_users_phone_e164", table_name="users")
    op.drop_column("users", "notification_consent_updated_at")
    op.drop_column("users", "notification_consent_version")
    op.drop_column("users", "notification_whatsapp_enabled")
    op.drop_column("users", "notification_sms_enabled")
    op.drop_column("users", "notification_email_enabled")
    op.drop_column("users", "phone_verified_at")
    op.drop_column("users", "phone_e164")
