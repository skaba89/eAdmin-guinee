"""Add the first-generation Row-Level Security policies.

Revision ID: add_rls_policies
Revises: initial_legacy_schema
Create Date: 2025-01-01 00:00:00.000000

This historical migration now runs cleanly with SQLAlchemy/asyncpg: each SQL
statement is executed separately. Institution-scoped courrier policies are
deferred until the following migration creates ``courriers.institution_id``.
"""

from alembic import op


revision = "add_rls_policies"
down_revision = "initial_legacy_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE documents ENABLE ROW LEVEL SECURITY")
    op.execute('''CREATE POLICY "super_admin_all_documents" ON documents FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = current_setting('app.current_user_id')::uuid AND users.role = 'SUPER_ADMIN'))''')
    op.execute('''CREATE POLICY "institution_documents" ON documents FOR SELECT USING (institution_id = (SELECT institution FROM users WHERE users.id = current_setting('app.current_user_id')::uuid))''')
    op.execute('''CREATE POLICY "institution_insert_documents" ON documents FOR INSERT WITH CHECK (institution_id = (SELECT institution FROM users WHERE users.id = current_setting('app.current_user_id')::uuid))''')

    op.execute("ALTER TABLE courriers ENABLE ROW LEVEL SECURITY")
    op.execute('''CREATE POLICY "super_admin_all_courriers" ON courriers FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = current_setting('app.current_user_id')::uuid AND users.role = 'SUPER_ADMIN'))''')

    op.execute("ALTER TABLE workflows ENABLE ROW LEVEL SECURITY")
    op.execute('''CREATE POLICY "super_admin_all_workflows" ON workflows FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = current_setting('app.current_user_id')::uuid AND users.role = 'SUPER_ADMIN'))''')
    op.execute('''CREATE POLICY "institution_workflows" ON workflows FOR SELECT USING (institution_id = (SELECT institution FROM users WHERE users.id = current_setting('app.current_user_id')::uuid))''')


def downgrade() -> None:
    op.execute('DROP POLICY IF EXISTS "super_admin_all_documents" ON documents')
    op.execute('DROP POLICY IF EXISTS "institution_documents" ON documents')
    op.execute('DROP POLICY IF EXISTS "institution_insert_documents" ON documents')
    op.execute("ALTER TABLE documents DISABLE ROW LEVEL SECURITY")
    op.execute('DROP POLICY IF EXISTS "super_admin_all_courriers" ON courriers')
    op.execute('DROP POLICY IF EXISTS "institution_courriers" ON courriers')
    op.execute("ALTER TABLE courriers DISABLE ROW LEVEL SECURITY")
    op.execute('DROP POLICY IF EXISTS "super_admin_all_workflows" ON workflows')
    op.execute('DROP POLICY IF EXISTS "institution_workflows" ON workflows')
    op.execute("ALTER TABLE workflows DISABLE ROW LEVEL SECURITY")
