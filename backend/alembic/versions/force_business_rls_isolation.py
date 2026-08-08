"""Force fail-closed RLS on core business tables.

Revision ID: force_business_rls_isolation
Revises: add_comprehensive_rls_policies
Create Date: 2026-08-08

The previous policy set used multiple permissive SELECT policies. PostgreSQL
combines permissive policies with OR, which could broaden access beyond the
intended tenant+institution boundary. This migration replaces them with one
scoped policy per operation and uses the trusted transaction-local role set by
the API rather than recursively querying the users table.
"""

from alembic import op

revision = "force_business_rls_isolation"
down_revision = "add_comprehensive_rls_policies"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---------------------------------------------------------------------
    # DOCUMENTS
    # ---------------------------------------------------------------------
    op.execute(
        """
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE documents FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "documents_super_admin_all" ON documents;
        DROP POLICY IF EXISTS "documents_tenant_isolation" ON documents;
        DROP POLICY IF EXISTS "documents_institution_scoping" ON documents;
        DROP POLICY IF EXISTS "documents_tenant_insert" ON documents;
        DROP POLICY IF EXISTS "documents_tenant_update" ON documents;
        DROP POLICY IF EXISTS "documents_super_admin_delete" ON documents;
        DROP POLICY IF EXISTS "super_admin_all_documents" ON documents;
        DROP POLICY IF EXISTS "institution_documents" ON documents;
        DROP POLICY IF EXISTS "institution_insert_documents" ON documents;

        CREATE POLICY "documents_super_admin_select" ON documents
            FOR SELECT
            USING (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "documents_scoped_select" ON documents
            FOR SELECT
            USING (
                current_setting('app.current_role', true) <> 'SUPER_ADMIN'
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND (
                    (
                        NULLIF(current_setting('app.current_institution_id', true), '') IS NOT NULL
                        AND institution_id = current_setting('app.current_institution_id', true)
                    )
                    OR (
                        NULLIF(current_setting('app.current_institution_id', true), '') IS NULL
                        AND institution_id IS NULL
                        AND owner_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                    )
                )
            );

        CREATE POLICY "documents_super_admin_insert" ON documents
            FOR INSERT
            WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "documents_scoped_insert" ON documents
            FOR INSERT
            WITH CHECK (
                current_setting('app.current_role', true) <> 'SUPER_ADMIN'
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND (
                    (
                        NULLIF(current_setting('app.current_institution_id', true), '') IS NOT NULL
                        AND institution_id = current_setting('app.current_institution_id', true)
                    )
                    OR (
                        NULLIF(current_setting('app.current_institution_id', true), '') IS NULL
                        AND institution_id IS NULL
                        AND owner_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                    )
                )
            );

        CREATE POLICY "documents_super_admin_update" ON documents
            FOR UPDATE
            USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
            WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "documents_scoped_update" ON documents
            FOR UPDATE
            USING (
                current_setting('app.current_role', true) <> 'SUPER_ADMIN'
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND (
                    institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                    OR (
                        institution_id IS NULL
                        AND NULLIF(current_setting('app.current_institution_id', true), '') IS NULL
                        AND owner_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                    )
                )
            )
            WITH CHECK (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND (
                    institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                    OR (
                        institution_id IS NULL
                        AND NULLIF(current_setting('app.current_institution_id', true), '') IS NULL
                        AND owner_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                    )
                )
            );

        CREATE POLICY "documents_super_admin_delete" ON documents
            FOR DELETE
            USING (current_setting('app.current_role', true) = 'SUPER_ADMIN');
        """
    )

    # ---------------------------------------------------------------------
    # COURRIERS
    # ---------------------------------------------------------------------
    op.execute(
        """
        ALTER TABLE courriers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE courriers FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "courriers_super_admin_all" ON courriers;
        DROP POLICY IF EXISTS "courriers_tenant_isolation" ON courriers;
        DROP POLICY IF EXISTS "courriers_institution_scoping" ON courriers;
        DROP POLICY IF EXISTS "courriers_tenant_insert" ON courriers;
        DROP POLICY IF EXISTS "courriers_tenant_update" ON courriers;
        DROP POLICY IF EXISTS "super_admin_all_courriers" ON courriers;
        DROP POLICY IF EXISTS "institution_courriers" ON courriers;

        CREATE POLICY "courriers_super_admin_select" ON courriers
            FOR SELECT
            USING (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "courriers_scoped_select" ON courriers
            FOR SELECT
            USING (
                current_setting('app.current_role', true) <> 'SUPER_ADMIN'
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND NULLIF(current_setting('app.current_institution_id', true), '') IS NOT NULL
                AND institution_id = current_setting('app.current_institution_id', true)
            );

        CREATE POLICY "courriers_super_admin_insert" ON courriers
            FOR INSERT
            WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "courriers_scoped_insert" ON courriers
            FOR INSERT
            WITH CHECK (
                current_setting('app.current_role', true) <> 'SUPER_ADMIN'
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND NULLIF(current_setting('app.current_institution_id', true), '') IS NOT NULL
                AND institution_id = current_setting('app.current_institution_id', true)
            );

        CREATE POLICY "courriers_super_admin_update" ON courriers
            FOR UPDATE
            USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
            WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "courriers_scoped_update" ON courriers
            FOR UPDATE
            USING (
                current_setting('app.current_role', true) <> 'SUPER_ADMIN'
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id = current_setting('app.current_institution_id', true)
            )
            WITH CHECK (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id = current_setting('app.current_institution_id', true)
            );
        """
    )

    # ---------------------------------------------------------------------
    # WORKFLOWS
    # ---------------------------------------------------------------------
    op.execute(
        """
        ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
        ALTER TABLE workflows FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "workflows_super_admin_all" ON workflows;
        DROP POLICY IF EXISTS "workflows_tenant_isolation" ON workflows;
        DROP POLICY IF EXISTS "workflows_institution_scoping" ON workflows;
        DROP POLICY IF EXISTS "workflows_tenant_insert" ON workflows;
        DROP POLICY IF EXISTS "workflows_tenant_update" ON workflows;
        DROP POLICY IF EXISTS "super_admin_all_workflows" ON workflows;
        DROP POLICY IF EXISTS "institution_workflows" ON workflows;

        CREATE POLICY "workflows_super_admin_select" ON workflows
            FOR SELECT
            USING (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "workflows_scoped_select" ON workflows
            FOR SELECT
            USING (
                current_setting('app.current_role', true) <> 'SUPER_ADMIN'
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND NULLIF(current_setting('app.current_institution_id', true), '') IS NOT NULL
                AND institution_id = current_setting('app.current_institution_id', true)
            );

        CREATE POLICY "workflows_super_admin_insert" ON workflows
            FOR INSERT
            WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "workflows_scoped_insert" ON workflows
            FOR INSERT
            WITH CHECK (
                current_setting('app.current_role', true) <> 'SUPER_ADMIN'
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND NULLIF(current_setting('app.current_institution_id', true), '') IS NOT NULL
                AND institution_id = current_setting('app.current_institution_id', true)
            );

        CREATE POLICY "workflows_super_admin_update" ON workflows
            FOR UPDATE
            USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
            WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "workflows_scoped_update" ON workflows
            FOR UPDATE
            USING (
                current_setting('app.current_role', true) <> 'SUPER_ADMIN'
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id = current_setting('app.current_institution_id', true)
            )
            WITH CHECK (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id = current_setting('app.current_institution_id', true)
            );
        """
    )

    # ---------------------------------------------------------------------
    # AUDIT LOGS: append-only. Even SUPER_ADMIN receives SELECT only.
    # Authentication events may be inserted before an authenticated RLS scope
    # exists, so INSERT remains allowed to the application role.
    # ---------------------------------------------------------------------
    op.execute(
        """
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "audit_logs_super_admin_all" ON audit_logs;
        DROP POLICY IF EXISTS "audit_logs_directeur_tenant" ON audit_logs;
        DROP POLICY IF EXISTS "audit_logs_always_insert" ON audit_logs;
        DROP POLICY IF EXISTS "audit_logs_super_admin_delete" ON audit_logs;

        CREATE POLICY "audit_logs_insert_only" ON audit_logs
            FOR INSERT
            WITH CHECK (true);

        CREATE POLICY "audit_logs_super_admin_select" ON audit_logs
            FOR SELECT
            USING (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "audit_logs_scoped_select" ON audit_logs
            FOR SELECT
            USING (
                current_setting('app.current_role', true) <> 'SUPER_ADMIN'
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND (
                    (
                        NULLIF(current_setting('app.current_institution_id', true), '') IS NOT NULL
                        AND institution_id = current_setting('app.current_institution_id', true)
                    )
                    OR (
                        NULLIF(current_setting('app.current_institution_id', true), '') IS NULL
                        AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                    )
                )
            );
        """
    )


def downgrade() -> None:
    # Downgrade restores row-level security to the previous migration's broad
    # policy set by removing this migration's policies and disabling FORCE.
    # Re-applying the previous revision after downgrade recreates its policies.
    op.execute(
        """
        DROP POLICY IF EXISTS "documents_super_admin_select" ON documents;
        DROP POLICY IF EXISTS "documents_scoped_select" ON documents;
        DROP POLICY IF EXISTS "documents_super_admin_insert" ON documents;
        DROP POLICY IF EXISTS "documents_scoped_insert" ON documents;
        DROP POLICY IF EXISTS "documents_super_admin_update" ON documents;
        DROP POLICY IF EXISTS "documents_scoped_update" ON documents;
        DROP POLICY IF EXISTS "documents_super_admin_delete" ON documents;
        ALTER TABLE documents NO FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "courriers_super_admin_select" ON courriers;
        DROP POLICY IF EXISTS "courriers_scoped_select" ON courriers;
        DROP POLICY IF EXISTS "courriers_super_admin_insert" ON courriers;
        DROP POLICY IF EXISTS "courriers_scoped_insert" ON courriers;
        DROP POLICY IF EXISTS "courriers_super_admin_update" ON courriers;
        DROP POLICY IF EXISTS "courriers_scoped_update" ON courriers;
        ALTER TABLE courriers NO FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "workflows_super_admin_select" ON workflows;
        DROP POLICY IF EXISTS "workflows_scoped_select" ON workflows;
        DROP POLICY IF EXISTS "workflows_super_admin_insert" ON workflows;
        DROP POLICY IF EXISTS "workflows_scoped_insert" ON workflows;
        DROP POLICY IF EXISTS "workflows_super_admin_update" ON workflows;
        DROP POLICY IF EXISTS "workflows_scoped_update" ON workflows;
        ALTER TABLE workflows NO FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "audit_logs_insert_only" ON audit_logs;
        DROP POLICY IF EXISTS "audit_logs_super_admin_select" ON audit_logs;
        DROP POLICY IF EXISTS "audit_logs_scoped_select" ON audit_logs;
        ALTER TABLE audit_logs NO FORCE ROW LEVEL SECURITY;
        """
    )
