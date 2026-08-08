"""Add externally validated signature/TSA evidence without upgrading internal hashes.

Revision ID: qualified_signature_evidence
Revises: add_document_metadata_fts
Create Date: 2026-08-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "qualified_signature_evidence"
down_revision = "add_document_metadata_fts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "qualified_signature_evidence",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("signature_step_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("document_version", sa.Integer(), nullable=False),
        sa.Column("document_hash", sa.String(length=128), nullable=False),
        sa.Column("provider", sa.String(length=100), nullable=False),
        sa.Column("provider_transaction_id", sa.String(length=255), nullable=False),
        sa.Column("evidence_object_key", sa.String(length=1024), nullable=False),
        sa.Column("signer_certificate_fingerprint_sha256", sa.String(length=64), nullable=False),
        sa.Column("signer_certificate_serial", sa.String(length=255), nullable=True),
        sa.Column("signer_subject", sa.String(length=500), nullable=True),
        sa.Column("signature_algorithm", sa.String(length=100), nullable=False),
        sa.Column("certificate_chain_valid", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("certificate_status", sa.String(length=50), nullable=False, server_default="unchecked"),
        sa.Column("revocation_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timestamp_token_hash", sa.String(length=64), nullable=True),
        sa.Column("timestamp_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timestamp_valid", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("trust_policy_oid", sa.String(length=255), nullable=False),
        sa.Column("policy_valid", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("validation_status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "qualification_status",
            sa.String(length=50),
            nullable=False,
            server_default="external_attestation_required",
        ),
        sa.Column("qualification_attestation_ref", sa.String(length=1000), nullable=True),
        sa.Column("qualification_attested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["signature_step_id"], ["signature_steps.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider",
            "provider_transaction_id",
            name="uq_qualified_signature_provider_transaction",
        ),
    )
    op.create_index(
        "ix_qualified_signature_evidence_document_id",
        "qualified_signature_evidence",
        ["document_id"],
        unique=False,
    )
    op.create_index(
        "ix_qualified_signature_evidence_signature_step_id",
        "qualified_signature_evidence",
        ["signature_step_id"],
        unique=False,
    )
    op.create_index(
        "ix_qualified_signature_evidence_provider",
        "qualified_signature_evidence",
        ["provider"],
        unique=False,
    )

    op.execute("ALTER TABLE qualified_signature_evidence ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE qualified_signature_evidence FORCE ROW LEVEL SECURITY")

    # Ordinary authenticated users may only read evidence for documents already
    # visible through document RLS. Mutating externally validated evidence is not
    # exposed to normal user context in this foundation phase.
    op.execute(
        """
        CREATE POLICY qualified_signature_evidence_document_read
        ON qualified_signature_evidence
        FOR SELECT
        USING (
            current_setting('app.current_role', true) <> 'SUPER_ADMIN'
            AND EXISTS (
                SELECT 1 FROM documents d
                WHERE d.id = qualified_signature_evidence.document_id
            )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY qualified_signature_evidence_super_admin_all
        ON qualified_signature_evidence
        FOR ALL
        USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN')
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP POLICY IF EXISTS qualified_signature_evidence_super_admin_all "
        "ON qualified_signature_evidence"
    )
    op.execute(
        "DROP POLICY IF EXISTS qualified_signature_evidence_document_read "
        "ON qualified_signature_evidence"
    )
    op.drop_index(
        "ix_qualified_signature_evidence_provider",
        table_name="qualified_signature_evidence",
    )
    op.drop_index(
        "ix_qualified_signature_evidence_signature_step_id",
        table_name="qualified_signature_evidence",
    )
    op.drop_index(
        "ix_qualified_signature_evidence_document_id",
        table_name="qualified_signature_evidence",
    )
    op.drop_table("qualified_signature_evidence")
