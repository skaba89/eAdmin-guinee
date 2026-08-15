"""Route municipal requests to mairie-owned internal services.

Revision ID: municipality_service_routing
Revises: directeur_scope_rls_fn
Create Date: 2026-08-15
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "municipality_service_routing"
down_revision = "directeur_scope_rls_fn"
branch_labels = None
depends_on = None


def _staff_scope() -> str:
    return """
        tenant_id = current_setting('app.current_tenant_id', true)
        AND (
            current_setting('app.current_role', true) = 'MINISTRE'
            OR (
                current_setting('app.current_role', true) = 'DIRECTEUR'
                AND institution_id IN (
                    SELECT scope_id FROM eadmin_current_directeur_institution_scope()
                )
            )
            OR (
                current_setting('app.current_role', true) IN ('MAIRIE', 'AGENCE', 'ADMIN')
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
            OR (
                current_setting('app.current_role', true) IN ('AGENT', 'CHEF_SERVICE')
                AND (
                    service_institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                    OR (
                        service_institution_id IS NULL
                        AND (
                            institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                            OR EXISTS (
                                SELECT 1
                                FROM institution_service_assignments isa
                                WHERE isa.tenant_id = service_requests.tenant_id
                                  AND isa.institution_id = service_requests.institution_id
                                  AND isa.service_id = service_requests.service_id
                                  AND isa.service_institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                                  AND isa.is_active = TRUE
                            )
                        )
                    )
                )
            )
        )
    """


def _previous_staff_scope() -> str:
    return """
        tenant_id = current_setting('app.current_tenant_id', true)
        AND (
            current_setting('app.current_role', true) = 'MINISTRE'
            OR (
                current_setting('app.current_role', true) = 'DIRECTEUR'
                AND institution_id IN (
                    SELECT scope_id FROM eadmin_current_directeur_institution_scope()
                )
            )
            OR (
                current_setting('app.current_role', true) IN ('MAIRIE', 'AGENCE', 'AGENT', 'ADMIN', 'CHEF_SERVICE')
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
        )
    """


def _replace_staff_policies(scope: str) -> None:
    op.execute('DROP POLICY IF EXISTS "service_requests_staff_select" ON service_requests')
    op.execute('DROP POLICY IF EXISTS "service_requests_staff_update" ON service_requests')
    op.execute(
        f"""
        CREATE POLICY "service_requests_staff_select" ON service_requests
            FOR SELECT USING ({scope});
        CREATE POLICY "service_requests_staff_update" ON service_requests
            FOR UPDATE USING ({scope}) WITH CHECK ({scope});
        """
    )


def upgrade() -> None:
    op.create_table(
        "institution_service_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", sa.String(100), nullable=False),
        sa.Column("institution_id", sa.String(100), nullable=False),
        sa.Column("service_id", sa.String(100), nullable=False),
        sa.Column("service_institution_id", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("tenant_id", "institution_id", "service_id", name="uq_institution_service_assignment"),
    )
    for name, column in (
        ("ix_institution_service_assignments_tenant_id", "tenant_id"),
        ("ix_institution_service_assignments_institution_id", "institution_id"),
        ("ix_institution_service_assignments_service_id", "service_id"),
        ("ix_institution_service_assignments_service_institution_id", "service_institution_id"),
        ("ix_institution_service_assignments_is_active", "is_active"),
    ):
        op.create_index(name, "institution_service_assignments", [column])

    op.add_column(
        "service_requests",
        sa.Column("service_institution_id", sa.String(100), nullable=True),
    )
    op.create_foreign_key(
        "fk_service_requests_service_institution",
        "service_requests",
        "institutions",
        ["service_institution_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_service_requests_service_institution_id",
        "service_requests",
        ["service_institution_id"],
    )

    op.execute("ALTER TABLE institution_service_assignments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE institution_service_assignments FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY institution_service_assignments_select
        ON institution_service_assignments
        FOR SELECT
        USING (
            current_setting('app.current_role', true) = 'SUPER_ADMIN'
            OR (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
                AND (
                    current_setting('app.current_role', true) IN ('PUBLIC', 'CITOYEN', 'MINISTRE')
                    OR (
                        current_setting('app.current_role', true) = 'DIRECTEUR'
                        AND institution_id IN (
                            SELECT scope_id FROM eadmin_current_directeur_institution_scope()
                        )
                    )
                    OR (
                        current_setting('app.current_role', true) IN ('MAIRIE', 'ADMIN', 'AGENCE')
                        AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                    )
                    OR (
                        current_setting('app.current_role', true) IN ('AGENT', 'CHEF_SERVICE')
                        AND service_institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                    )
                )
            )
        );

        CREATE POLICY institution_service_assignments_write
        ON institution_service_assignments
        FOR ALL
        USING (
            current_setting('app.current_role', true) = 'SUPER_ADMIN'
            OR (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
                AND current_setting('app.current_role', true) IN ('MAIRIE', 'ADMIN')
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
        )
        WITH CHECK (
            current_setting('app.current_role', true) = 'SUPER_ADMIN'
            OR (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
                AND current_setting('app.current_role', true) IN ('MAIRIE', 'ADMIN')
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
        );
        """
    )
    _replace_staff_policies(_staff_scope())


def downgrade() -> None:
    _replace_staff_policies(_previous_staff_scope())
    op.drop_index("ix_service_requests_service_institution_id", table_name="service_requests")
    op.drop_constraint("fk_service_requests_service_institution", "service_requests", type_="foreignkey")
    op.drop_column("service_requests", "service_institution_id")
    op.drop_table("institution_service_assignments")
