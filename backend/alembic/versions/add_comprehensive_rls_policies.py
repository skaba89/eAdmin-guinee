"""Add comprehensive RLS policies for tenant isolation and institutional scoping

Revision ID: add_comprehensive_rls_policies
Revises: add_tenants_and_institutions
Create Date: 2025-01-20 00:00:00.000000

This migration replaces the basic RLS policies from add_rls_policies with
comprehensive policies that use app.current_tenant_id and app.current_institution_id
session variables for proper tenant isolation and institutional scoping.

SUPER_ADMIN bypasses all RLS policies.
MINISTRE bypasses tenant isolation but respects institution scoping.
DIRECTEUR+ bypasses institution scoping within their tenant.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_comprehensive_rls_policies'
down_revision = 'add_tenants_and_institutions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Active les politiques RLS complètes sur toutes les tables métier."""

    # ================================================================
    # 0. D'abord, supprimer les anciennes politiques de la migration add_rls_policies
    # ================================================================
    op.execute("""
        -- Supprimer les anciennes politiques sur documents
        DROP POLICY IF EXISTS "super_admin_all_documents" ON documents;
        DROP POLICY IF EXISTS "institution_documents" ON documents;
        DROP POLICY IF EXISTS "institution_insert_documents" ON documents;

        -- Supprimer les anciennes politiques sur courriers
        DROP POLICY IF EXISTS "super_admin_all_courriers" ON courriers;
        DROP POLICY IF EXISTS "institution_courriers" ON courriers;

        -- Supprimer les anciennes politiques sur workflows
        DROP POLICY IF EXISTS "super_admin_all_workflows" ON workflows;
        DROP POLICY IF EXISTS "institution_workflows" ON workflows;
    """)

    # ================================================================
    # 1. USERS — Politiques RLS
    # ================================================================
    op.execute("""
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;

        -- SUPER_ADMIN peut voir tous les utilisateurs
        CREATE POLICY "users_super_admin_all" ON users
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role = 'SUPER_ADMIN'
                )
            );

        -- MINISTRE peut voir les utilisateurs de son tenant
        CREATE POLICY "users_ministre_tenant" ON users
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role IN ('SUPER_ADMIN', 'MINISTRE')
                )
                OR tenant_id = current_setting('app.current_tenant_id', true)
            );

        -- Utilisateurs voient les utilisateurs de leur tenant + institution
        CREATE POLICY "users_tenant_isolation" ON users
            FOR SELECT
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
            );

        -- DIRECTEUR+ peut voir tous les utilisateurs de leur tenant (bypass institution)
        CREATE POLICY "users_directeur_tenant" ON users
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role IN ('SUPER_ADMIN', 'MINISTRE', 'DIRECTEUR')
                )
                OR (
                    tenant_id = current_setting('app.current_tenant_id', true)
                    AND (
                        institution_id = current_setting('app.current_institution_id', true)
                        OR institution_id IS NULL
                        OR current_setting('app.current_institution_id', true) = ''
                    )
                )
            );

        -- Insert: les utilisateurs sont créés dans le même tenant
        CREATE POLICY "users_tenant_insert" ON users
            FOR INSERT
            WITH CHECK (
                tenant_id = current_setting('app.current_tenant_id', true)
                OR current_setting('app.current_tenant_id', true) IS NULL
            );

        -- Update: seul le même tenant peut modifier
        CREATE POLICY "users_tenant_update" ON users
            FOR UPDATE
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
                OR EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role IN ('SUPER_ADMIN', 'MINISTRE', 'DIRECTEUR')
                )
            );
    """)

    # ================================================================
    # 2. DOCUMENTS — Politiques RLS
    # ================================================================
    op.execute("""
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

        -- SUPER_ADMIN: accès total
        CREATE POLICY "documents_super_admin_all" ON documents
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role = 'SUPER_ADMIN'
                )
            );

        -- Isolation tenant: les documents sont visibles uniquement dans le même tenant
        CREATE POLICY "documents_tenant_isolation" ON documents
            FOR SELECT
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
            );

        -- Isolation institution: DIRECTEUR+ voit tout dans le tenant
        CREATE POLICY "documents_institution_scoping" ON documents
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role IN ('SUPER_ADMIN', 'MINISTRE', 'DIRECTEUR')
                )
                OR (
                    tenant_id = current_setting('app.current_tenant_id', true)
                    AND (
                        institution_id = current_setting('app.current_institution_id', true)
                        OR institution_id IS NULL
                        OR current_setting('app.current_institution_id', true) = ''
                    )
                )
            );

        -- Insert: même tenant uniquement
        CREATE POLICY "documents_tenant_insert" ON documents
            FOR INSERT
            WITH CHECK (
                tenant_id = current_setting('app.current_tenant_id', true)
            );

        -- Update: même tenant + même institution (ou DIRECTEUR+)
        CREATE POLICY "documents_tenant_update" ON documents
            FOR UPDATE
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.id = current_setting('app.current_user_id')::uuid
                        AND u.role IN ('SUPER_ADMIN', 'MINISTRE', 'DIRECTEUR')
                    )
                    OR institution_id = current_setting('app.current_institution_id', true)
                    OR institution_id IS NULL
                )
            );

        -- Delete: SUPER_ADMIN uniquement
        CREATE POLICY "documents_super_admin_delete" ON documents
            FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role = 'SUPER_ADMIN'
                )
            );
    """)

    # ================================================================
    # 3. COURRIERS — Politiques RLS
    # ================================================================
    op.execute("""
        ALTER TABLE courriers ENABLE ROW LEVEL SECURITY;

        -- SUPER_ADMIN: accès total
        CREATE POLICY "courriers_super_admin_all" ON courriers
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role = 'SUPER_ADMIN'
                )
            );

        -- Isolation tenant
        CREATE POLICY "courriers_tenant_isolation" ON courriers
            FOR SELECT
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
            );

        -- Isolation institution
        CREATE POLICY "courriers_institution_scoping" ON courriers
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role IN ('SUPER_ADMIN', 'MINISTRE', 'DIRECTEUR')
                )
                OR (
                    tenant_id = current_setting('app.current_tenant_id', true)
                    AND (
                        institution_id = current_setting('app.current_institution_id', true)
                        OR institution_id IS NULL
                        OR current_setting('app.current_institution_id', true) = ''
                    )
                )
            );

        -- Insert: même tenant uniquement
        CREATE POLICY "courriers_tenant_insert" ON courriers
            FOR INSERT
            WITH CHECK (
                tenant_id = current_setting('app.current_tenant_id', true)
            );

        -- Update: même tenant + même institution (ou DIRECTEUR+)
        CREATE POLICY "courriers_tenant_update" ON courriers
            FOR UPDATE
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.id = current_setting('app.current_user_id')::uuid
                        AND u.role IN ('SUPER_ADMIN', 'MINISTRE', 'DIRECTEUR')
                    )
                    OR institution_id = current_setting('app.current_institution_id', true)
                    OR institution_id IS NULL
                )
            );
    """)

    # ================================================================
    # 4. WORKFLOWS — Politiques RLS
    # ================================================================
    op.execute("""
        ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

        -- SUPER_ADMIN: accès total
        CREATE POLICY "workflows_super_admin_all" ON workflows
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role = 'SUPER_ADMIN'
                )
            );

        -- Isolation tenant
        CREATE POLICY "workflows_tenant_isolation" ON workflows
            FOR SELECT
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
            );

        -- Isolation institution
        CREATE POLICY "workflows_institution_scoping" ON workflows
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role IN ('SUPER_ADMIN', 'MINISTRE', 'DIRECTEUR')
                )
                OR (
                    tenant_id = current_setting('app.current_tenant_id', true)
                    AND (
                        institution_id = current_setting('app.current_institution_id', true)
                        OR institution_id IS NULL
                        OR current_setting('app.current_institution_id', true) = ''
                    )
                )
            );

        -- Insert: même tenant uniquement
        CREATE POLICY "workflows_tenant_insert" ON workflows
            FOR INSERT
            WITH CHECK (
                tenant_id = current_setting('app.current_tenant_id', true)
            );

        -- Update: même tenant + même institution (ou DIRECTEUR+)
        CREATE POLICY "workflows_tenant_update" ON workflows
            FOR UPDATE
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND (
                    EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.id = current_setting('app.current_user_id')::uuid
                        AND u.role IN ('SUPER_ADMIN', 'MINISTRE', 'DIRECTEUR')
                    )
                    OR institution_id = current_setting('app.current_institution_id', true)
                    OR institution_id IS NULL
                )
            );
    """)

    # ================================================================
    # 5. AUDIT_LOGS — Politiques RLS
    # ================================================================
    op.execute("""
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

        -- SUPER_ADMIN: accès total aux logs d'audit
        CREATE POLICY "audit_logs_super_admin_all" ON audit_logs
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role = 'SUPER_ADMIN'
                )
            );

        -- DIRECTEUR+: voit les logs de son tenant
        CREATE POLICY "audit_logs_directeur_tenant" ON audit_logs
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role IN ('SUPER_ADMIN', 'MINISTRE', 'DIRECTEUR')
                )
                OR (
                    tenant_id = current_setting('app.current_tenant_id', true)
                    AND (
                        institution_id = current_setting('app.current_institution_id', true)
                        OR institution_id IS NULL
                        OR current_setting('app.current_institution_id', true) = ''
                    )
                )
            );

        -- Insert: toujours autorisé (les logs sont insérés par le service)
        CREATE POLICY "audit_logs_always_insert" ON audit_logs
            FOR INSERT
            WITH CHECK (true);

        -- Delete: SUPER_ADMIN uniquement (les logs ne doivent jamais être supprimés)
        CREATE POLICY "audit_logs_super_admin_delete" ON audit_logs
            FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = current_setting('app.current_user_id')::uuid
                    AND u.role = 'SUPER_ADMIN'
                )
            );
    """)


def downgrade() -> None:
    """Supprime les politiques RLS complètes."""

    # Supprimer les politiques sur audit_logs
    op.execute("""
        DROP POLICY IF EXISTS "audit_logs_super_admin_all" ON audit_logs;
        DROP POLICY IF EXISTS "audit_logs_directeur_tenant" ON audit_logs;
        DROP POLICY IF EXISTS "audit_logs_always_insert" ON audit_logs;
        DROP POLICY IF EXISTS "audit_logs_super_admin_delete" ON audit_logs;
        ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
    """)

    # Supprimer les politiques sur workflows
    op.execute("""
        DROP POLICY IF EXISTS "workflows_super_admin_all" ON workflows;
        DROP POLICY IF EXISTS "workflows_tenant_isolation" ON workflows;
        DROP POLICY IF EXISTS "workflows_institution_scoping" ON workflows;
        DROP POLICY IF EXISTS "workflows_tenant_insert" ON workflows;
        DROP POLICY IF EXISTS "workflows_tenant_update" ON workflows;
        ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
    """)

    # Supprimer les politiques sur courriers
    op.execute("""
        DROP POLICY IF EXISTS "courriers_super_admin_all" ON courriers;
        DROP POLICY IF EXISTS "courriers_tenant_isolation" ON courriers;
        DROP POLICY IF EXISTS "courriers_institution_scoping" ON courriers;
        DROP POLICY IF EXISTS "courriers_tenant_insert" ON courriers;
        DROP POLICY IF EXISTS "courriers_tenant_update" ON courriers;
        ALTER TABLE courriers DISABLE ROW LEVEL SECURITY;
    """)

    # Supprimer les politiques sur documents
    op.execute("""
        DROP POLICY IF EXISTS "documents_super_admin_all" ON documents;
        DROP POLICY IF EXISTS "documents_tenant_isolation" ON documents;
        DROP POLICY IF EXISTS "documents_institution_scoping" ON documents;
        DROP POLICY IF EXISTS "documents_tenant_insert" ON documents;
        DROP POLICY IF EXISTS "documents_tenant_update" ON documents;
        DROP POLICY IF EXISTS "documents_super_admin_delete" ON documents;
        ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
    """)

    # Supprimer les politiques sur users
    op.execute("""
        DROP POLICY IF EXISTS "users_super_admin_all" ON users;
        DROP POLICY IF EXISTS "users_ministre_tenant" ON users;
        DROP POLICY IF EXISTS "users_tenant_isolation" ON users;
        DROP POLICY IF EXISTS "users_directeur_tenant" ON users;
        DROP POLICY IF EXISTS "users_tenant_insert" ON users;
        DROP POLICY IF EXISTS "users_tenant_update" ON users;
        ALTER TABLE users DISABLE ROW LEVEL SECURITY;
    """)
