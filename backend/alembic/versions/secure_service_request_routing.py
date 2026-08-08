"""Require trusted target institution for citizen request routing.

Revision ID: secure_service_request_routing
Revises: add_service_requests
Create Date: 2026-08-08
"""

from alembic import op

revision = "secure_service_request_routing"
down_revision = "add_service_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DROP POLICY IF EXISTS "service_requests_citizen_insert" ON service_requests;

        CREATE POLICY "service_requests_citizen_insert" ON service_requests
            FOR INSERT WITH CHECK (
                current_setting('app.current_role', true) = 'CITOYEN'
                AND citizen_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND NULLIF(current_setting('app.current_target_institution_id', true), '') IS NOT NULL
                AND institution_id = current_setting('app.current_target_institution_id', true)
            );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP POLICY IF EXISTS "service_requests_citizen_insert" ON service_requests;
        CREATE POLICY "service_requests_citizen_insert" ON service_requests
            FOR INSERT WITH CHECK (
                current_setting('app.current_role', true) = 'CITOYEN'
                AND citizen_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id IS NULL
            );
        """
    )
