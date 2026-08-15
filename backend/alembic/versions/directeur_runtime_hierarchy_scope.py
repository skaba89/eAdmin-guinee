"""Harden DIRECTEUR hierarchy lookup behind the PostgreSQL RLS boundary.

Revision ID: directeur_scope_rls_fn
Revises: directeur_request_scope
Create Date: 2026-08-15

The application already scopes DIRECTEUR reads to the signed institution and
its active descendants.  This migration makes the database policy enforce the
same rule without requiring the runtime principal to enumerate the institution
graph directly.
"""

from alembic import op

revision = "directeur_scope_rls_fn"
down_revision = "directeur_request_scope"
branch_labels = None
depends_on = None

_OPERATIONAL_ROLES = "'MAIRIE', 'AGENCE', 'AGENT', 'ADMIN', 'CHEF_SERVICE'"


def _staff_scope_expression() -> str:
    return f"""
        tenant_id = current_setting('app.current_tenant_id', true)
        AND (
            current_setting('app.current_role', true) = 'MINISTRE'
            OR (
                current_setting('app.current_role', true) = 'DIRECTEUR'
                AND institution_id IN (
                    SELECT scope_id
                    FROM eadmin_current_directeur_institution_scope()
                )
            )
            OR (
                current_setting('app.current_role', true) IN ({_OPERATIONAL_ROLES})
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
        )
    """


def _previous_staff_scope_expression() -> str:
    return f"""
        tenant_id = current_setting('app.current_tenant_id', true)
        AND (
            current_setting('app.current_role', true) = 'MINISTRE'
            OR (
                current_setting('app.current_role', true) = 'DIRECTEUR'
                AND institution_id IN (
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
                )
            )
            OR (
                current_setting('app.current_role', true) IN ({_OPERATIONAL_ROLES})
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
        )
    """


def _replace_staff_policies(scope: str) -> None:
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


def upgrade() -> None:
    # The function deliberately accepts no tenant/institution arguments.  It can
    # only resolve the active subtree encoded in the current RLS session context
    # and only when that context identifies a DIRECTEUR.  Missing or forged role
    # classes therefore fail closed to an empty set.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION eadmin_current_directeur_institution_scope()
        RETURNS TABLE(scope_id text)
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = pg_catalog, public
        AS $$
            WITH RECURSIVE institution_scope(id) AS (
                SELECT i.id
                FROM public.institutions i
                WHERE current_setting('app.current_role', true) = 'DIRECTEUR'
                  AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                  AND NULLIF(current_setting('app.current_institution_id', true), '') IS NOT NULL
                  AND i.id = NULLIF(current_setting('app.current_institution_id', true), '')
                  AND i.tenant_id = current_setting('app.current_tenant_id', true)
                  AND i.is_active = TRUE
                UNION
                SELECT child.id
                FROM public.institutions child
                JOIN institution_scope parent_scope ON child.parent_id = parent_scope.id
                WHERE child.tenant_id = current_setting('app.current_tenant_id', true)
                  AND child.is_active = TRUE
            )
            SELECT id::text FROM institution_scope
        $$;

        REVOKE ALL ON FUNCTION eadmin_current_directeur_institution_scope() FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION eadmin_current_directeur_institution_scope() TO PUBLIC;
        """
    )
    _replace_staff_policies(_staff_scope_expression())


def downgrade() -> None:
    _replace_staff_policies(_previous_staff_scope_expression())
    op.execute(
        "DROP FUNCTION IF EXISTS eadmin_current_directeur_institution_scope()"
    )
