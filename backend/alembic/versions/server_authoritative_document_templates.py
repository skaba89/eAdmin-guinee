"""Add versioned server-authoritative administrative document templates.

Revision ID: server_document_templates
Revises: add_user_abac_attributes
Create Date: 2026-08-09
"""

from alembic import op
import sqlalchemy as sa

revision = "server_document_templates"
down_revision = "add_user_abac_attributes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "administrative_services",
        sa.Column(
            "document_template_status",
            sa.String(length=32),
            nullable=False,
            server_default="not_configured",
        ),
    )
    op.add_column(
        "administrative_services",
        sa.Column("document_template_title", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "administrative_services",
        sa.Column("document_template_body", sa.Text(), nullable=True),
    )
    op.add_column(
        "administrative_services",
        sa.Column("document_template_source_reference", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "administrative_services",
        sa.Column("document_template_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "administrative_services",
        sa.Column("document_template_approved_by", sa.UUID(), nullable=True),
    )
    op.add_column(
        "administrative_services",
        sa.Column("document_template_approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_administrative_services_document_template_approved_by_users",
        "administrative_services",
        "users",
        ["document_template_approved_by"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_check_constraint(
        "ck_administrative_services_document_template_status",
        "administrative_services",
        "document_template_status IN ('not_configured', 'draft', 'approved')",
    )
    op.create_index(
        "ix_administrative_services_document_template_status",
        "administrative_services",
        ["document_template_status"],
    )

    op.add_column(
        "generated_service_documents",
        sa.Column("template_service_version", sa.Integer(), nullable=True),
    )
    op.add_column(
        "generated_service_documents",
        sa.Column("template_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "generated_service_documents",
        sa.Column("template_source_reference", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "generated_service_documents",
        sa.Column(
            "rendered_server_side",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("generated_service_documents", "rendered_server_side")
    op.drop_column("generated_service_documents", "template_source_reference")
    op.drop_column("generated_service_documents", "template_hash")
    op.drop_column("generated_service_documents", "template_service_version")

    op.drop_index(
        "ix_administrative_services_document_template_status",
        table_name="administrative_services",
    )
    op.drop_constraint(
        "ck_administrative_services_document_template_status",
        "administrative_services",
        type_="check",
    )
    op.drop_constraint(
        "fk_administrative_services_document_template_approved_by_users",
        "administrative_services",
        type_="foreignkey",
    )
    op.drop_column("administrative_services", "document_template_approved_at")
    op.drop_column("administrative_services", "document_template_approved_by")
    op.drop_column("administrative_services", "document_template_hash")
    op.drop_column("administrative_services", "document_template_source_reference")
    op.drop_column("administrative_services", "document_template_body")
    op.drop_column("administrative_services", "document_template_title")
    op.drop_column("administrative_services", "document_template_status")
