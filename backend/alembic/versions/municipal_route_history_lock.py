"""Freeze legacy request routing before a mairie changes service assignment.

Revision ID: municipal_route_history_lock
Revises: municipality_service_routing
Create Date: 2026-08-15
"""

from alembic import op

revision = "municipal_route_history_lock"
down_revision = "municipality_service_routing"
branch_labels = None
depends_on = None


FUNCTION_NAME = "eadmin_freeze_legacy_request_routing"


def upgrade() -> None:
    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION {FUNCTION_NAME}()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_tenant_id text;
            v_institution_id text;
            v_service_id text;
            v_service_institution_id text;
            v_should_freeze boolean := false;
        BEGIN
            IF TG_OP = 'INSERT' THEN
                IF NEW.is_active THEN
                    v_tenant_id := NEW.tenant_id;
                    v_institution_id := NEW.institution_id;
                    v_service_id := NEW.service_id;
                    v_service_institution_id := NEW.service_institution_id;
                    v_should_freeze := true;
                END IF;
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.is_active THEN
                    -- Freeze every still-unrouted historical dossier on the
                    -- service that owned the route before this change. This
                    -- prevents a later reassignment/deactivation from silently
                    -- moving old citizen dossiers to another team.
                    v_tenant_id := OLD.tenant_id;
                    v_institution_id := OLD.institution_id;
                    v_service_id := OLD.service_id;
                    v_service_institution_id := OLD.service_institution_id;
                    v_should_freeze := true;
                ELSIF NOT OLD.is_active AND NEW.is_active THEN
                    -- Reactivating a previously inactive route is the first
                    -- authoritative routing decision for remaining legacy rows.
                    v_tenant_id := NEW.tenant_id;
                    v_institution_id := NEW.institution_id;
                    v_service_id := NEW.service_id;
                    v_service_institution_id := NEW.service_institution_id;
                    v_should_freeze := true;
                END IF;
            ELSIF TG_OP = 'DELETE' THEN
                IF OLD.is_active THEN
                    v_tenant_id := OLD.tenant_id;
                    v_institution_id := OLD.institution_id;
                    v_service_id := OLD.service_id;
                    v_service_institution_id := OLD.service_institution_id;
                    v_should_freeze := true;
                END IF;
            END IF;

            IF v_should_freeze THEN
                UPDATE service_requests
                SET service_institution_id = v_service_institution_id
                WHERE tenant_id = v_tenant_id
                  AND institution_id = v_institution_id
                  AND service_id = v_service_id
                  AND service_institution_id IS NULL;
            END IF;

            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RETURN NEW;
        END;
        $$;

        DROP TRIGGER IF EXISTS trg_freeze_legacy_route_insert
            ON institution_service_assignments;
        CREATE TRIGGER trg_freeze_legacy_route_insert
        AFTER INSERT ON institution_service_assignments
        FOR EACH ROW EXECUTE FUNCTION {FUNCTION_NAME}();

        DROP TRIGGER IF EXISTS trg_freeze_legacy_route_update
            ON institution_service_assignments;
        CREATE TRIGGER trg_freeze_legacy_route_update
        BEFORE UPDATE OF service_institution_id, is_active
        ON institution_service_assignments
        FOR EACH ROW EXECUTE FUNCTION {FUNCTION_NAME}();

        DROP TRIGGER IF EXISTS trg_freeze_legacy_route_delete
            ON institution_service_assignments;
        CREATE TRIGGER trg_freeze_legacy_route_delete
        BEFORE DELETE ON institution_service_assignments
        FOR EACH ROW EXECUTE FUNCTION {FUNCTION_NAME}();
        """
    )


def downgrade() -> None:
    op.execute(
        f"""
        DROP TRIGGER IF EXISTS trg_freeze_legacy_route_delete
            ON institution_service_assignments;
        DROP TRIGGER IF EXISTS trg_freeze_legacy_route_update
            ON institution_service_assignments;
        DROP TRIGGER IF EXISTS trg_freeze_legacy_route_insert
            ON institution_service_assignments;
        DROP FUNCTION IF EXISTS {FUNCTION_NAME}();
        """
    )
