"""Protect document version history through parent document RLS.

Revision ID: document_versions_parent_rls
Revises: municipal_route_history_lock
Create Date: 2026-08-16
"""

from alembic import op

revision = "document_versions_parent_rls"
down_revision = "municipal_route_history_lock"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE document_versions FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS document_versions_parent_select ON document_versions;
        DROP POLICY IF EXISTS document_versions_parent_insert ON document_versions;

        CREATE POLICY document_versions_parent_select ON document_versions
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM documents parent_document
                    WHERE parent_document.id = document_versions.document_id
                )
            );

        CREATE POLICY document_versions_parent_insert ON document_versions
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM documents parent_document
                    WHERE parent_document.id = document_versions.document_id
                )
            );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP POLICY IF EXISTS document_versions_parent_insert ON document_versions;
        DROP POLICY IF EXISTS document_versions_parent_select ON document_versions;
        ALTER TABLE document_versions NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE document_versions DISABLE ROW LEVEL SECURITY;
        """
    )
