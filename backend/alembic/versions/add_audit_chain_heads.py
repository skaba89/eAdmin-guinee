"""Add transactional per-tenant audit chain heads.

Revision ID: add_audit_chain_heads
Revises: force_business_rls_isolation
Create Date: 2026-08-08

The audit log itself is FORCE-RLS protected. Unauthenticated authentication
attempts therefore must not read the audit table merely to discover the
previous hash. A small internal chain-head table provides that state without
opening audit-log SELECT access.
"""

from alembic import op

revision = "add_audit_chain_heads"
down_revision = "force_business_rls_isolation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_chain_heads (
            tenant_id VARCHAR(100) PRIMARY KEY,
            last_hash VARCHAR(64),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        COMMENT ON TABLE audit_chain_heads IS
            'Internal transactional head for the append-only audit hash chain.';

        INSERT INTO audit_chain_heads (tenant_id, last_hash, updated_at)
        SELECT DISTINCT ON (tenant_id)
            tenant_id,
            entry_hash,
            COALESCE(timestamp, NOW())
        FROM audit_logs
        WHERE tenant_id IS NOT NULL
          AND entry_hash IS NOT NULL
        ORDER BY tenant_id, timestamp DESC
        ON CONFLICT (tenant_id) DO UPDATE
        SET last_hash = EXCLUDED.last_hash,
            updated_at = EXCLUDED.updated_at;

        REVOKE ALL ON TABLE audit_chain_heads FROM PUBLIC;
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audit_chain_heads;")
