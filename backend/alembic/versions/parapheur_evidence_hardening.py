"""Harden parapheur evidence and enforce document-scoped RLS.

Revision ID: parapheur_evidence_hardening
Revises: versioned_service_catalog
Create Date: 2026-08-08

This migration makes internal approval evidence deterministic and explicitly
binds each completed SignatureStep to one immutable DocumentVersion hash. It
also closes the historical RLS gap on parapheur/electronic-stamp tables.

These rows represent INTERNAL APPROVAL EVIDENCE, not a qualified PKI signature.
A certificate/TSA integration must populate a future qualified evidence type.
"""

from alembic import op
import sqlalchemy as sa

revision = "parapheur_evidence_hardening"
down_revision = "versioned_service_catalog"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("signature_steps", sa.Column("signed_document_version", sa.Integer(), nullable=True))
    op.add_column("signature_steps", sa.Column("signed_document_hash", sa.String(128), nullable=True))
    op.add_column("signature_steps", sa.Column("evidence_timestamp", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "signature_steps",
        sa.Column(
            "evidence_type",
            sa.String(50),
            nullable=False,
            server_default="internal_approval",
        ),
    )
    op.add_column(
        "signature_steps",
        sa.Column(
            "evidence_algorithm",
            sa.String(50),
            nullable=False,
            server_default="SHA-256",
        ),
    )

    # Existing historical signature hashes cannot be upgraded into document-bound
    # evidence because the signed document hash/timestamp was not persisted.
    # Keep them queryable but do not falsely mark them as verified v2 evidence.
    op.execute(
        "UPDATE signature_steps SET evidence_type = 'legacy_unbound' "
        "WHERE signature_hash IS NOT NULL AND signed_document_hash IS NULL"
    )

    for table in ("signature_circuits", "signature_steps", "electronic_stamps"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")

    # Signature circuits inherit visibility from the underlying document RLS.
    op.execute('DROP POLICY IF EXISTS "signature_circuits_super_admin_all" ON signature_circuits')
    op.execute('DROP POLICY IF EXISTS "signature_circuits_document_scope" ON signature_circuits')
    op.execute(
        """
        CREATE POLICY "signature_circuits_super_admin_all" ON signature_circuits
        FOR ALL
        USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        """
    )
    op.execute(
        """
        CREATE POLICY "signature_circuits_document_scope" ON signature_circuits
        FOR ALL
        USING (
            current_setting('app.current_role', true) <> 'SUPER_ADMIN'
            AND EXISTS (
                SELECT 1 FROM documents d
                WHERE d.id = signature_circuits.document_id
            )
        )
        WITH CHECK (
            current_setting('app.current_role', true) <> 'SUPER_ADMIN'
            AND EXISTS (
                SELECT 1 FROM documents d
                WHERE d.id = signature_circuits.document_id
            )
        )
        """
    )

    # Steps inherit their scope through circuit -> document.
    op.execute('DROP POLICY IF EXISTS "signature_steps_super_admin_all" ON signature_steps')
    op.execute('DROP POLICY IF EXISTS "signature_steps_document_scope" ON signature_steps')
    op.execute(
        """
        CREATE POLICY "signature_steps_super_admin_all" ON signature_steps
        FOR ALL
        USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        """
    )
    op.execute(
        """
        CREATE POLICY "signature_steps_document_scope" ON signature_steps
        FOR ALL
        USING (
            current_setting('app.current_role', true) <> 'SUPER_ADMIN'
            AND EXISTS (
                SELECT 1
                FROM signature_circuits c
                JOIN documents d ON d.id = c.document_id
                WHERE c.id = signature_steps.circuit_id
            )
        )
        WITH CHECK (
            current_setting('app.current_role', true) <> 'SUPER_ADMIN'
            AND EXISTS (
                SELECT 1
                FROM signature_circuits c
                JOIN documents d ON d.id = c.document_id
                WHERE c.id = signature_steps.circuit_id
            )
        )
        """
    )

    op.execute('DROP POLICY IF EXISTS "electronic_stamps_super_admin_all" ON electronic_stamps')
    op.execute('DROP POLICY IF EXISTS "electronic_stamps_document_scope" ON electronic_stamps')
    op.execute(
        """
        CREATE POLICY "electronic_stamps_super_admin_all" ON electronic_stamps
        FOR ALL
        USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        """
    )
    op.execute(
        """
        CREATE POLICY "electronic_stamps_document_scope" ON electronic_stamps
        FOR ALL
        USING (
            current_setting('app.current_role', true) <> 'SUPER_ADMIN'
            AND EXISTS (
                SELECT 1 FROM documents d
                WHERE d.id = electronic_stamps.document_id
            )
        )
        WITH CHECK (
            current_setting('app.current_role', true) <> 'SUPER_ADMIN'
            AND EXISTS (
                SELECT 1 FROM documents d
                WHERE d.id = electronic_stamps.document_id
            )
        )
        """
    )


def downgrade() -> None:
    for table, policies in (
        ("signature_steps", ("signature_steps_document_scope", "signature_steps_super_admin_all")),
        ("signature_circuits", ("signature_circuits_document_scope", "signature_circuits_super_admin_all")),
        ("electronic_stamps", ("electronic_stamps_document_scope", "electronic_stamps_super_admin_all")),
    ):
        for policy in policies:
            op.execute(f'DROP POLICY IF EXISTS "{policy}" ON {table}')
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    op.drop_column("signature_steps", "evidence_algorithm")
    op.drop_column("signature_steps", "evidence_type")
    op.drop_column("signature_steps", "evidence_timestamp")
    op.drop_column("signature_steps", "signed_document_hash")
    op.drop_column("signature_steps", "signed_document_version")
