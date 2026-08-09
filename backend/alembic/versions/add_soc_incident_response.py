"""Add SOC signal normalization and incident response tables.

Revision ID: soc_incident_response
Revises: oidc_federated_identities
Create Date: 2026-08-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "soc_incident_response"
down_revision = "oidc_federated_identities"
branch_labels = None
depends_on = None


_SCOPED_ADMIN_READ = """
current_setting('app.current_role', true) IN (
    'ADMIN', 'CHEF_SERVICE', 'DIRECTEUR', 'MINISTRE', 'SUPER_ADMIN'
)
AND (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR tenant_id = current_setting('app.current_tenant_id', true)
)
AND (
    current_setting('app.current_role', true) IN ('MINISTRE', 'SUPER_ADMIN')
    OR institution_id IS NULL
    OR institution_id = current_setting('app.current_institution_id', true)
)
""".strip()

_SCOPED_DIRECTOR_WRITE = """
current_setting('app.current_role', true) IN ('DIRECTEUR', 'MINISTRE', 'SUPER_ADMIN')
AND (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR tenant_id = current_setting('app.current_tenant_id', true)
)
AND (
    current_setting('app.current_role', true) IN ('MINISTRE', 'SUPER_ADMIN')
    OR institution_id IS NULL
    OR institution_id = current_setting('app.current_institution_id', true)
)
""".strip()


def upgrade() -> None:
    op.create_table(
        "security_incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reference", sa.String(length=64), nullable=False),
        sa.Column("tenant_id", sa.String(length=100), nullable=False),
        sa.Column("institution_id", sa.String(length=100), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("detection_rule", sa.String(length=100), nullable=False),
        sa.Column("correlation_key", sa.String(length=255), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("event_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("acknowledged_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("evidence_summary", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"]),
        sa.ForeignKeyConstraint(["acknowledged_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["closed_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference", name="uq_security_incident_reference"),
        sa.CheckConstraint(
            "severity IN ('low', 'medium', 'high', 'critical')",
            name="ck_security_incident_severity",
        ),
        sa.CheckConstraint(
            "status IN ('open', 'acknowledged', 'investigating', 'resolved', 'closed')",
            name="ck_security_incident_status",
        ),
        sa.CheckConstraint("event_count > 0", name="ck_security_incident_event_count"),
    )
    for column in (
        "reference",
        "tenant_id",
        "institution_id",
        "category",
        "detection_rule",
        "correlation_key",
        "severity",
        "status",
    ):
        op.create_index(f"ix_security_incidents_{column}", "security_incidents", [column])

    op.create_table(
        "security_signals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source", sa.String(length=100), nullable=False),
        sa.Column("external_event_id", sa.String(length=255), nullable=False),
        sa.Column("event_type", sa.String(length=150), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("tenant_id", sa.String(length=100), nullable=False),
        sa.Column("institution_id", sa.String(length=100), nullable=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resource_type", sa.String(length=100), nullable=True),
        sa.Column("resource_id", sa.String(length=255), nullable=True),
        sa.Column("correlation_key", sa.String(length=255), nullable=False),
        sa.Column("network_source_hash", sa.String(length=64), nullable=True),
        sa.Column("user_agent_hash", sa.String(length=64), nullable=True),
        sa.Column("details", postgresql.JSONB(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["incident_id"], ["security_incidents.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source", "external_event_id", name="uq_security_signal_source_event"),
        sa.CheckConstraint(
            "severity IN ('low', 'medium', 'high', 'critical')",
            name="ck_security_signal_severity",
        ),
    )
    for column in (
        "source",
        "event_type",
        "category",
        "severity",
        "tenant_id",
        "institution_id",
        "actor_id",
        "correlation_key",
        "network_source_hash",
        "occurred_at",
        "processed_at",
        "incident_id",
    ):
        op.create_index(f"ix_security_signals_{column}", "security_signals", [column])

    op.execute("ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE security_incidents FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE security_signals ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE security_signals FORCE ROW LEVEL SECURITY")

    op.execute(
        """
        CREATE POLICY security_incidents_scoped_read
        ON security_incidents FOR SELECT
        USING (""" + _SCOPED_ADMIN_READ + ")"
    )
    op.execute(
        """
        CREATE POLICY security_incidents_scoped_update
        ON security_incidents FOR UPDATE
        USING (""" + _SCOPED_DIRECTOR_WRITE + ")
        WITH CHECK (" + _SCOPED_DIRECTOR_WRITE + ")"
    )
    op.execute(
        """
        CREATE POLICY security_incidents_soc_service_all
        ON security_incidents FOR ALL
        USING (current_setting('app.current_role', true) = 'SOC_SERVICE')
        WITH CHECK (current_setting('app.current_role', true) = 'SOC_SERVICE')
        """
    )

    op.execute(
        """
        CREATE POLICY security_signals_scoped_read
        ON security_signals FOR SELECT
        USING (""" + _SCOPED_ADMIN_READ + ")"
    )
    op.execute(
        """
        CREATE POLICY security_signals_soc_service_all
        ON security_signals FOR ALL
        USING (current_setting('app.current_role', true) = 'SOC_SERVICE')
        WITH CHECK (current_setting('app.current_role', true) = 'SOC_SERVICE')
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS security_signals_soc_service_all ON security_signals")
    op.execute("DROP POLICY IF EXISTS security_signals_scoped_read ON security_signals")
    op.execute("DROP POLICY IF EXISTS security_incidents_soc_service_all ON security_incidents")
    op.execute("DROP POLICY IF EXISTS security_incidents_scoped_update ON security_incidents")
    op.execute("DROP POLICY IF EXISTS security_incidents_scoped_read ON security_incidents")

    for column in (
        "incident_id",
        "processed_at",
        "occurred_at",
        "network_source_hash",
        "correlation_key",
        "actor_id",
        "institution_id",
        "tenant_id",
        "severity",
        "category",
        "event_type",
        "source",
    ):
        op.drop_index(f"ix_security_signals_{column}", table_name="security_signals")
    op.drop_table("security_signals")

    for column in (
        "status",
        "severity",
        "correlation_key",
        "detection_rule",
        "category",
        "institution_id",
        "tenant_id",
        "reference",
    ):
        op.drop_index(f"ix_security_incidents_{column}", table_name="security_incidents")
    op.drop_table("security_incidents")
