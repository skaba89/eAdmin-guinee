"""Add hierarchical DIRECTEUR scope for citizen service requests.

Revision ID: directeur_request_scope
Revises: verified_mobile_consent
Create Date: 2026-08-12
"""

from alembic import op

revision = "directeur_request_scope"
down_revision = "verified_mobile_consent"
branch_labels = None
depends_on = None

_OPERATIONAL_ROLES = "'MAIRIE', 'AGENCE', 'AGENT', 'ADMIN', 'CHEF_SERVICE'"

_DIRECTEUR_DESCENDANTS = """
    WITH RECURSIVE institution_scope(id) AS (
        SELECT i.id
        FROM institutions i
        WHERE i.id = NULLIF(current_setting('app.current_institution_id', true), '')
          AND i.tenant_id = current_setting('app.current_tenant_id', true)
          AND i.is_active = TRUE
        UNION
        SELECT child.id
        FROM institutions child
        JOIN institution_scope parent_scope ON child.parent_id = parent_scope.id
        WHERE child.tenant_id = current_setting('app.current_tenant_id', true)
          AND child.is_active = TRUE
    )
    SELECT id FROM institution_scope
"""


def _staff_scope_expression() -> str:
    return f"""
        tenant_id = current_setting('app.current_tenant_id', true)
        AND (
            current_setting('app.current_role', true) = 'MINISTRE'
            OR (
                current_setting('app.current_role', true) = 'DIRECTEUR'
                AND institution_id IN ({_DIRECTEUR_DESCENDANTS})
            )
            OR (
                current_setting('app.current_role', true) IN ({_OPERATIONAL_ROLES})
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
        )
    """


def upgrade() -> None:
    scope = _staff_scope_expression()
    op.execute('DROP POLICY IF EXISTS "service_requests_staff_select" ON service_requests')
    op.execute('DROP POLICY IF EXISTS "service_requests_staff_update" ON service_requests')

    op.execute(
        f"""
        CREATE POLICY "service_requests_staff_select" ON service_requests
            FOR SELECT USING ({scope});

        CREATE POLICY "service_requests_staff_update" ON service_requests
            FOR UPDATE
            USING ({scope})
            WITH CHECK ({scope});
        """
    )


def downgrade() -> None:
    op.execute('DROP POLICY IF EXISTS "service_requests_staff_select" ON service_requests')
    op.execute('DROP POLICY IF EXISTS "service_requests_staff_update" ON service_requests')

    op.execute(
        """
        CREATE POLICY "service_requests_staff_select" ON service_requests
            FOR SELECT USING (
                current_setting('app.current_role', true) NOT IN ('SUPER_ADMIN', 'CITOYEN')
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            );

        CREATE POLICY "service_requests_staff_update" ON service_requests
            FOR UPDATE
            USING (
                current_setting('app.current_role', true) NOT IN ('SUPER_ADMIN', 'CITOYEN')
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
            WITH CHECK (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            );
        """
    )
