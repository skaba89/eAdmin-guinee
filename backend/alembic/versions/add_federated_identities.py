"""Add explicit OIDC federated identity bindings.

Revision ID: oidc_federated_identities
Revises: access_grants_governance
Create Date: 2026-08-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "oidc_federated_identities"
down_revision = "access_grants_governance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "federated_identities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("issuer", sa.String(length=512), nullable=False),
        sa.Column("subject", sa.String(length=512), nullable=False),
        sa.Column("provider", sa.String(length=100), nullable=False, server_default="oidc"),
        sa.Column("email_snapshot", sa.String(length=255), nullable=True),
        sa.Column("claims_fingerprint", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("linked_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("disabled_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_authenticated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["linked_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["disabled_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("issuer", "subject", name="uq_federated_identity_issuer_subject"),
        sa.UniqueConstraint("user_id", "issuer", name="uq_federated_identity_user_issuer"),
        sa.CheckConstraint("status IN ('active', 'disabled')", name="ck_federated_identity_status"),
        sa.CheckConstraint("length(subject) > 0", name="ck_federated_identity_subject_nonempty"),
        sa.CheckConstraint("length(issuer) > 0", name="ck_federated_identity_issuer_nonempty"),
    )
    op.create_index("ix_federated_identities_user_id", "federated_identities", ["user_id"])
    op.create_index("ix_federated_identities_issuer", "federated_identities", ["issuer"])
    op.create_index("ix_federated_identities_subject", "federated_identities", ["subject"])

    op.execute("ALTER TABLE federated_identities ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE federated_identities FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY federated_identities_sso_service_all
        ON federated_identities
        FOR ALL
        USING (current_setting('app.current_role', true) = 'SSO_SERVICE')
        WITH CHECK (current_setting('app.current_role', true) = 'SSO_SERVICE')
        """
    )
    op.execute(
        """
        CREATE POLICY federated_identities_super_admin_read
        ON federated_identities
        FOR SELECT
        USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        """
    )

    # Authentication routes run before a user RLS context exists. The dedicated
    # SSO_SERVICE transaction role may resolve a local user after a verified
    # `(issuer, subject)` mapping; it receives no user mutation capability.
    op.execute(
        """
        CREATE POLICY users_sso_service_read
        ON users
        FOR SELECT
        USING (current_setting('app.current_role', true) = 'SSO_SERVICE')
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS users_sso_service_read ON users")
    op.execute("DROP POLICY IF EXISTS federated_identities_super_admin_read ON federated_identities")
    op.execute("DROP POLICY IF EXISTS federated_identities_sso_service_all ON federated_identities")
    op.drop_index("ix_federated_identities_subject", table_name="federated_identities")
    op.drop_index("ix_federated_identities_issuer", table_name="federated_identities")
    op.drop_index("ix_federated_identities_user_id", table_name="federated_identities")
    op.drop_table("federated_identities")
