"""Add tenants and institutions tables, add tenant_id to business tables.

Revision ID: add_tenants_and_institutions
Revises: add_rls_policies
Create Date: 2025-01-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "add_tenants_and_institutions"
down_revision = "add_rls_policies"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("domain", sa.String(255), nullable=True, unique=True),
        sa.Column("logo_url", sa.String(512), nullable=True),
        sa.Column("primary_color", sa.String(7), nullable=False, server_default="#CE1126"),
        sa.Column("secondary_color", sa.String(7), nullable=False, server_default="#FCD116"),
        sa.Column("accent_color", sa.String(7), nullable=False, server_default="#009460"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("max_users", sa.Integer(), nullable=False, server_default="1000"),
        sa.Column("max_documents", sa.Integer(), nullable=False, server_default="10000"),
        sa.Column("max_storage_mb", sa.Integer(), nullable=False, server_default="5120"),
        sa.Column("features", sa.JSON(), nullable=True),
        sa.Column("settings", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "institutions",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50), nullable=False, index=True),
        sa.Column("parent_id", sa.String(100), nullable=True, index=True),
        sa.Column("code", sa.String(50), nullable=True, unique=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("settings", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.add_column("documents", sa.Column("tenant_id", sa.String(100), nullable=True, index=True))
    op.add_column("courriers", sa.Column("tenant_id", sa.String(100), nullable=True, index=True))
    op.add_column("courriers", sa.Column("institution_id", sa.String(255), nullable=True))
    op.add_column("workflows", sa.Column("tenant_id", sa.String(100), nullable=True, index=True))
    op.add_column("audit_logs", sa.Column("tenant_id", sa.String(100), nullable=True, index=True))
    op.add_column("audit_logs", sa.Column("institution_id", sa.String(255), nullable=True))

    foreign_keys = [
        ("fk_institutions_tenant_id", "institutions", "tenants", ["tenant_id"], ["id"], "CASCADE"),
        ("fk_institutions_parent_id", "institutions", "institutions", ["parent_id"], ["id"], "SET NULL"),
        ("fk_users_tenant_id", "users", "tenants", ["tenant_id"], ["id"], "SET NULL"),
        ("fk_users_institution_id", "users", "institutions", ["institution_id"], ["id"], "SET NULL"),
        ("fk_documents_tenant_id", "documents", "tenants", ["tenant_id"], ["id"], "SET NULL"),
        ("fk_documents_institution_id", "documents", "institutions", ["institution_id"], ["id"], "SET NULL"),
        ("fk_courriers_tenant_id", "courriers", "tenants", ["tenant_id"], ["id"], "SET NULL"),
        ("fk_courriers_institution_id", "courriers", "institutions", ["institution_id"], ["id"], "SET NULL"),
        ("fk_workflows_tenant_id", "workflows", "tenants", ["tenant_id"], ["id"], "SET NULL"),
        ("fk_workflows_institution_id", "workflows", "institutions", ["institution_id"], ["id"], "SET NULL"),
        ("fk_audit_logs_tenant_id", "audit_logs", "tenants", ["tenant_id"], ["id"], "SET NULL"),
        ("fk_audit_logs_institution_id", "audit_logs", "institutions", ["institution_id"], ["id"], "SET NULL"),
    ]
    for name, source, target, local_cols, remote_cols, ondelete in foreign_keys:
        op.create_foreign_key(name, source, target, local_cols, remote_cols, ondelete=ondelete)

    op.execute(
        """
        INSERT INTO tenants (
            id, name, domain, primary_color, secondary_color, accent_color,
            is_active, max_users, max_documents, max_storage_mb, features, settings
        ) VALUES (
            'republique-de-guinee', 'République de Guinée', 'eadmin.gouv.gn',
            '#CE1126', '#FCD116', '#009460', true, 50000, 1000000, 102400,
            '{"mfa": true, "ai": true, "parapheur": true, "ged": true, "courriers": true}'::jsonb,
            '{"default_language": "fr", "timezone": "Africa/Conakry", "currency": "GNF"}'::jsonb
        ) ON CONFLICT (id) DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO institutions (id, tenant_id, name, type, code, is_active) VALUES
            ('presidence', 'republique-de-guinee', 'Présidence de la République', 'ministere', 'PR-001', true),
            ('min-justice', 'republique-de-guinee', 'Ministère de la Justice', 'ministere', 'MJ-001', true),
            ('min-interieur', 'republique-de-guinee', 'Ministère de l''Intérieur', 'ministere', 'MI-001', true),
            ('min-finances', 'republique-de-guinee', 'Ministère des Finances', 'ministere', 'MF-001', true),
            ('min-education', 'republique-de-guinee', 'Ministère de l''Éducation', 'ministere', 'ME-001', true),
            ('min-sante', 'republique-de-guinee', 'Ministère de la Santé', 'ministere', 'MS-001', true),
            ('mairie-conakry', 'republique-de-guinee', 'Mairie de Conakry', 'mairie', 'MC-001', true),
            ('agence-eadmin', 'republique-de-guinee', 'Agence eAdministration', 'agence', 'AE-001', true)
        ON CONFLICT (id) DO NOTHING
        """
    )

    for table in ("documents", "courriers", "workflows", "users", "audit_logs"):
        op.execute(
            f"UPDATE {table} SET tenant_id = 'republique-de-guinee' WHERE tenant_id IS NULL"
        )


def downgrade() -> None:
    for name, table in (
        ("fk_audit_logs_institution_id", "audit_logs"),
        ("fk_audit_logs_tenant_id", "audit_logs"),
        ("fk_workflows_institution_id", "workflows"),
        ("fk_workflows_tenant_id", "workflows"),
        ("fk_courriers_institution_id", "courriers"),
        ("fk_courriers_tenant_id", "courriers"),
        ("fk_documents_institution_id", "documents"),
        ("fk_documents_tenant_id", "documents"),
        ("fk_users_institution_id", "users"),
        ("fk_users_tenant_id", "users"),
        ("fk_institutions_parent_id", "institutions"),
        ("fk_institutions_tenant_id", "institutions"),
    ):
        op.drop_constraint(name, table, type_="foreignkey")

    op.drop_column("audit_logs", "institution_id")
    op.drop_column("audit_logs", "tenant_id")
    op.drop_column("workflows", "tenant_id")
    op.drop_column("courriers", "institution_id")
    op.drop_column("courriers", "tenant_id")
    op.drop_column("documents", "tenant_id")
    op.drop_table("institutions")
    op.drop_table("tenants")
