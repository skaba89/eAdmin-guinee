"""Finalize legacy RLS scope and add per-tenant audit chain heads.

Revision ID: add_audit_chain_heads
Revises: force_business_rls_isolation
Create Date: 2026-08-08

This migration runs immediately after the FORCE-RLS policy replacement. It
briefly removes FORCE within the Alembic transaction to backfill legacy rows
from trusted relational data, initializes the audit-chain head from the visible
legacy history, then re-enables FORCE before the transaction can commit.
"""

from alembic import op

revision = "add_audit_chain_heads"
down_revision = "force_business_rls_isolation"
branch_labels = None
depends_on = None

DEFAULT_TENANT = "republique-de-guinee"


def upgrade() -> None:
    op.execute(
        f"""
        -- Alembic owns the migration transaction. Temporarily remove FORCE so
        -- legacy scope can be repaired without fabricating an application user.
        ALTER TABLE documents NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE courriers NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE workflows NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE audit_logs NO FORCE ROW LEVEL SECURITY;

        -- Workflows inherit scope from their authenticated creator where known.
        UPDATE workflows AS w
        SET tenant_id = COALESCE(w.tenant_id, u.tenant_id, '{DEFAULT_TENANT}'),
            institution_id = COALESCE(w.institution_id, u.institution_id)
        FROM users AS u
        WHERE w.created_by = u.id
          AND (w.tenant_id IS NULL OR w.institution_id IS NULL);

        UPDATE workflows
        SET tenant_id = '{DEFAULT_TENANT}'
        WHERE tenant_id IS NULL;

        -- Documents inherit scope from their owner. owner_id is mandatory.
        UPDATE documents AS d
        SET tenant_id = COALESCE(d.tenant_id, u.tenant_id, '{DEFAULT_TENANT}'),
            institution_id = COALESCE(d.institution_id, u.institution_id)
        FROM users AS u
        WHERE d.owner_id = u.id
          AND (d.tenant_id IS NULL OR d.institution_id IS NULL);

        UPDATE documents
        SET tenant_id = '{DEFAULT_TENANT}'
        WHERE tenant_id IS NULL;

        -- A linked workflow is the strongest available historical source for a
        -- courrier's institution. Unlinked legacy courriers remain hidden until
        -- an administrator classifies them explicitly.
        UPDATE courriers AS c
        SET tenant_id = COALESCE(c.tenant_id, w.tenant_id, '{DEFAULT_TENANT}'),
            institution_id = COALESCE(c.institution_id, w.institution_id)
        FROM workflows AS w
        WHERE c.workflow_id = w.id
          AND (c.tenant_id IS NULL OR c.institution_id IS NULL);

        UPDATE courriers
        SET tenant_id = '{DEFAULT_TENANT}'
        WHERE tenant_id IS NULL;

        -- Audit events inherit their actor scope where possible. System/auth
        -- events without an actor still receive the national tenant only.
        UPDATE audit_logs AS a
        SET tenant_id = COALESCE(a.tenant_id, u.tenant_id, '{DEFAULT_TENANT}'),
            institution_id = COALESCE(a.institution_id, u.institution_id)
        FROM users AS u
        WHERE a.user_id = u.id
          AND (a.tenant_id IS NULL OR a.institution_id IS NULL);

        UPDATE audit_logs
        SET tenant_id = '{DEFAULT_TENANT}'
        WHERE tenant_id IS NULL;

        ALTER TABLE documents ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE courriers ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE workflows ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;

        CREATE TABLE IF NOT EXISTS audit_chain_heads (
            tenant_id VARCHAR(100) PRIMARY KEY,
            last_hash VARCHAR(64),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        COMMENT ON TABLE audit_chain_heads IS
            'Internal transactional head for the append-only audit hash chain.';

        -- Seed while audit_logs is still visible to the migration owner. Doing
        -- this after FORCE would intentionally hide rows when no RLS context is
        -- set and would break continuity with the existing chain.
        INSERT INTO audit_chain_heads (tenant_id, last_hash, updated_at)
        SELECT DISTINCT ON (tenant_id)
            tenant_id,
            entry_hash,
            COALESCE(timestamp, NOW())
        FROM audit_logs
        WHERE entry_hash IS NOT NULL
        ORDER BY tenant_id, timestamp DESC
        ON CONFLICT (tenant_id) DO UPDATE
        SET last_hash = EXCLUDED.last_hash,
            updated_at = EXCLUDED.updated_at;

        REVOKE ALL ON TABLE audit_chain_heads FROM PUBLIC;

        -- Reinstate owner-proof RLS before this migration transaction commits.
        ALTER TABLE documents FORCE ROW LEVEL SECURITY;
        ALTER TABLE courriers FORCE ROW LEVEL SECURITY;
        ALTER TABLE workflows FORCE ROW LEVEL SECURITY;
        ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS audit_chain_heads;

        ALTER TABLE documents ALTER COLUMN tenant_id DROP NOT NULL;
        ALTER TABLE courriers ALTER COLUMN tenant_id DROP NOT NULL;
        ALTER TABLE workflows ALTER COLUMN tenant_id DROP NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN tenant_id DROP NOT NULL;
        """
    )
