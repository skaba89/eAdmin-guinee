"""Persist real OCR results and prepare PostgreSQL full-text indexing.

Revision ID: persist_real_ocr_results
Revises: parapheur_evidence_hardening
Create Date: 2026-08-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "persist_real_ocr_results"
down_revision = "parapheur_evidence_hardening"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "document_ocr_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("document_hash", sa.String(length=128), nullable=False),
        sa.Column("language", sa.String(length=20), nullable=False),
        sa.Column("engine", sa.String(length=50), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("page_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("extracted_text", sa.Text(), nullable=False),
        sa.Column("structured_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.String(length=100), nullable=True),
        sa.Column("institution_id", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "document_id",
            "version_number",
            "language",
            name="uq_document_ocr_version_language",
        ),
    )
    op.create_index(
        "ix_document_ocr_results_document_id",
        "document_ocr_results",
        ["document_id"],
        unique=False,
    )
    op.create_index(
        "ix_document_ocr_results_tenant_id",
        "document_ocr_results",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        "ix_document_ocr_results_institution_id",
        "document_ocr_results",
        ["institution_id"],
        unique=False,
    )
    op.execute(
        """
        CREATE INDEX ix_document_ocr_results_fts
        ON document_ocr_results
        USING GIN (to_tsvector('french', COALESCE(extracted_text, '')))
        """
    )

    op.execute("ALTER TABLE document_ocr_results ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE document_ocr_results FORCE ROW LEVEL SECURITY")

    op.execute(
        """
        CREATE POLICY "document_ocr_super_admin_all" ON document_ocr_results
        FOR ALL
        USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        """
    )
    op.execute(
        """
        CREATE POLICY "document_ocr_scoped_select" ON document_ocr_results
        FOR SELECT
        USING (
            current_setting('app.current_role', true) <> 'SUPER_ADMIN'
            AND tenant_id = current_setting('app.current_tenant_id', true)
            AND EXISTS (
                SELECT 1 FROM documents d
                WHERE d.id = document_ocr_results.document_id
            )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY "document_ocr_scoped_insert" ON document_ocr_results
        FOR INSERT
        WITH CHECK (
            current_setting('app.current_role', true) <> 'SUPER_ADMIN'
            AND tenant_id = current_setting('app.current_tenant_id', true)
            AND EXISTS (
                SELECT 1 FROM documents d
                WHERE d.id = document_ocr_results.document_id
            )
        )
        """
    )


def downgrade() -> None:
    op.execute('DROP POLICY IF EXISTS "document_ocr_scoped_insert" ON document_ocr_results')
    op.execute('DROP POLICY IF EXISTS "document_ocr_scoped_select" ON document_ocr_results')
    op.execute('DROP POLICY IF EXISTS "document_ocr_super_admin_all" ON document_ocr_results')
    op.execute("ALTER TABLE document_ocr_results NO FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE document_ocr_results DISABLE ROW LEVEL SECURITY")
    op.execute("DROP INDEX IF EXISTS ix_document_ocr_results_fts")
    op.drop_index("ix_document_ocr_results_institution_id", table_name="document_ocr_results")
    op.drop_index("ix_document_ocr_results_tenant_id", table_name="document_ocr_results")
    op.drop_index("ix_document_ocr_results_document_id", table_name="document_ocr_results")
    op.drop_table("document_ocr_results")
