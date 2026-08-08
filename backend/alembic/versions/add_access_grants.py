"""Add governed delegation and break-glass access grants.

Revision ID: access_grants_governance
Revises: qualified_signature_evidence
Create Date: 2026-08-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "access_grants_governance"
down_revision = "qualified_signature_evidence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "access_grants",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("grant_type", sa.String(length=32), nullable=False, server_default="delegation"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("grantee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("revoked_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tenant_id", sa.String(length=100), nullable=False),
        sa.Column("institution_id", sa.String(length=100), nullable=True),
        sa.Column("resource", sa.String(length=100), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("ticket_reference", sa.String(length=255), nullable=True),
        sa.Column("requires_mfa", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["grantee_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["revoked_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("grant_type IN ('delegation', 'break_glass')", name="ck_access_grant_type"),
        sa.CheckConstraint("status IN ('pending', 'active', 'revoked', 'expired', 'rejected')", name="ck_access_grant_status"),
        sa.CheckConstraint("valid_until > valid_from", name="ck_access_grant_window"),
        sa.CheckConstraint("grantee_id <> requested_by", name="ck_access_grant_no_self_grant"),
    )
    op.create_index("ix_access_grants_grantee_id", "access_grants", ["grantee_id"])
    op.create_index("ix_access_grants_requested_by", "access_grants", ["requested_by"])
    op.create_index("ix_access_grants_approved_by", "access_grants", ["approved_by"])
    op.create_index("ix_access_grants_tenant_id", "access_grants", ["tenant_id"])
    op.create_index("ix_access_grants_institution_id", "access_grants", ["institution_id"])
    op.create_index("ix_access_grants_resource", "access_grants", ["resource"])
    op.create_index("ix_access_grants_action", "access_grants", ["action"])
    op.create_index("ix_access_grants_valid_until", "access_grants", ["valid_until"])

    op.execute("ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE access_grants FORCE ROW LEVEL SECURITY")

    op.execute(
        """
        CREATE POLICY access_grants_scoped_read
        ON access_grants
        FOR SELECT
        USING (
            current_setting('app.current_role', true) = 'SUPER_ADMIN'
            OR (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND (
                    grantee_id::text = current_setting('app.current_user_id', true)
                    OR requested_by::text = current_setting('app.current_user_id', true)
                    OR approved_by::text = current_setting('app.current_user_id', true)
                    OR (
                        current_setting('app.current_role', true) IN ('ADMIN', 'CHEF_SERVICE', 'DIRECTEUR', 'MINISTRE')
                        AND (
                            institution_id IS NULL
                            OR institution_id = current_setting('app.current_institution_id', true)
                            OR current_setting('app.current_role', true) IN ('MINISTRE')
                        )
                    )
                )
            )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY access_grants_super_admin_all
        ON access_grants
        FOR ALL
        USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        """
    )
    op.execute(
        """
        CREATE POLICY access_grants_scoped_insert
        ON access_grants
        FOR INSERT
        WITH CHECK (
            current_setting('app.current_role', true) IN ('ADMIN', 'CHEF_SERVICE', 'DIRECTEUR', 'MINISTRE')
            AND tenant_id = current_setting('app.current_tenant_id', true)
            AND requested_by::text = current_setting('app.current_user_id', true)
            AND (
                institution_id IS NULL
                OR institution_id = current_setting('app.current_institution_id', true)
                OR current_setting('app.current_role', true) = 'MINISTRE'
            )
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS access_grants_scoped_insert ON access_grants")
    op.execute("DROP POLICY IF EXISTS access_grants_super_admin_all ON access_grants")
    op.execute("DROP POLICY IF EXISTS access_grants_scoped_read ON access_grants")
    op.drop_index("ix_access_grants_valid_until", table_name="access_grants")
    op.drop_index("ix_access_grants_action", table_name="access_grants")
    op.drop_index("ix_access_grants_resource", table_name="access_grants")
    op.drop_index("ix_access_grants_institution_id", table_name="access_grants")
    op.drop_index("ix_access_grants_tenant_id", table_name="access_grants")
    op.drop_index("ix_access_grants_approved_by", table_name="access_grants")
    op.drop_index("ix_access_grants_requested_by", table_name="access_grants")
    op.drop_index("ix_access_grants_grantee_id", table_name="access_grants")
    op.drop_table("access_grants")
