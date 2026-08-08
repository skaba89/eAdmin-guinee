"""Add narrow mutation policies for citizen ratings and attachment cleanup.

Revision ID: service_request_mutation_policies
Revises: secure_service_request_routing
Create Date: 2026-08-08
"""

from alembic import op

revision = "service_request_mutation_policies"
down_revision = "secure_service_request_routing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Alembic creates version_num as VARCHAR(32) by default. Keep the already
    # published revision id stable and enlarge the metadata column before
    # Alembic records this 33-character revision.
    op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(64)")

    op.execute(
        """
        CREATE POLICY "service_requests_citizen_update" ON service_requests
            FOR UPDATE
            USING (
                current_setting('app.current_role', true) = 'CITOYEN'
                AND citizen_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND tenant_id = current_setting('app.current_tenant_id', true)
            )
            WITH CHECK (
                current_setting('app.current_role', true) = 'CITOYEN'
                AND citizen_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND tenant_id = current_setting('app.current_tenant_id', true)
            );

        CREATE POLICY "service_request_attachments_owner_delete" ON service_request_attachments
            FOR DELETE
            USING (
                uploaded_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY "service_request_attachments_staff_delete" ON service_request_attachments
            FOR DELETE
            USING (
                current_setting('app.current_role', true) NOT IN ('CITOYEN', '')
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP POLICY IF EXISTS "service_requests_citizen_update" ON service_requests;
        DROP POLICY IF EXISTS "service_request_attachments_owner_delete" ON service_request_attachments;
        DROP POLICY IF EXISTS "service_request_attachments_staff_delete" ON service_request_attachments;
        """
    )
