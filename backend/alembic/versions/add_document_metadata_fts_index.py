"""Add indexed French full-text search for GED metadata.

Revision ID: add_document_metadata_fts
Revises: persist_real_ocr_results
Create Date: 2026-08-08
"""

from alembic import op

revision = "add_document_metadata_fts"
down_revision = "persist_real_ocr_results"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX ix_documents_metadata_fts
        ON documents
        USING GIN (
            to_tsvector(
                'french',
                COALESCE(title, '') || ' ' ||
                COALESCE(description, '') || ' ' ||
                COALESCE(tags ->> 'reference', '') || ' ' ||
                COALESCE(tags ->> 'document_type', '')
            )
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_documents_metadata_fts")
