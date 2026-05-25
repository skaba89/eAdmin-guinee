"""Add Row-Level Security policies for multi-tenant isolation

Revision ID: add_rls_policies
Revises: 
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_rls_policies'
down_revision = None  # Set to previous migration ID
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Enable RLS on all tenant-scoped tables."""
    
    # Enable RLS on documents table
    op.execute("""
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
        
        -- Super admins can see everything
        CREATE POLICY "super_admin_all_documents" ON documents
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users WHERE users.id = current_setting('app.current_user_id')::uuid
                    AND users.role = 'SUPER_ADMIN'
                )
            );
        
        -- Users can see documents from their institution
        CREATE POLICY "institution_documents" ON documents
            FOR SELECT
            USING (
                institution_id = (
                    SELECT institution FROM users WHERE users.id = current_setting('app.current_user_id')::uuid
                )
            );
        
        -- Users can insert documents for their institution
        CREATE POLICY "institution_insert_documents" ON documents
            FOR INSERT
            WITH CHECK (
                institution_id = (
                    SELECT institution FROM users WHERE users.id = current_setting('app.current_user_id')::uuid
                )
            );
    """)
    
    # Enable RLS on courriers table
    op.execute("""
        ALTER TABLE courriers ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "super_admin_all_courriers" ON courriers
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users WHERE users.id = current_setting('app.current_user_id')::uuid
                    AND users.role = 'SUPER_ADMIN'
                )
            );
        
        CREATE POLICY "institution_courriers" ON courriers
            FOR SELECT
            USING (
                institution_id = (
                    SELECT institution FROM users WHERE users.id = current_setting('app.current_user_id')::uuid
                )
            );
    """)
    
    # Enable RLS on workflows table
    op.execute("""
        ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "super_admin_all_workflows" ON workflows
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users WHERE users.id = current_setting('app.current_user_id')::uuid
                    AND users.role = 'SUPER_ADMIN'
                )
            );
        
        CREATE POLICY "institution_workflows" ON workflows
            FOR SELECT
            USING (
                institution_id = (
                    SELECT institution FROM users WHERE users.id = current_setting('app.current_user_id')::uuid
                )
            );
    """)


def downgrade() -> None:
    """Remove RLS policies."""
    op.execute("""
        DROP POLICY IF EXISTS "super_admin_all_documents" ON documents;
        DROP POLICY IF EXISTS "institution_documents" ON documents;
        DROP POLICY IF EXISTS "institution_insert_documents" ON documents;
        ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "super_admin_all_courriers" ON courriers;
        DROP POLICY IF EXISTS "institution_courriers" ON courriers;
        ALTER TABLE courriers DISABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "super_admin_all_workflows" ON workflows;
        DROP POLICY IF EXISTS "institution_workflows" ON workflows;
        ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
    """)
