"""Harden service-request child rows behind the parent RLS boundary.

Revision ID: request_children_parent_rls
Revises: document_versions_parent_rls
Create Date: 2026-08-16
"""

from alembic import op

revision = "request_children_parent_rls"
down_revision = "document_versions_parent_rls"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE service_request_notes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE service_request_notes FORCE ROW LEVEL SECURITY;
        ALTER TABLE service_request_attachments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE service_request_attachments FORCE ROW LEVEL SECURITY;
        ALTER TABLE generated_service_documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE generated_service_documents FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS service_request_notes_select ON service_request_notes;
        DROP POLICY IF EXISTS service_request_notes_insert ON service_request_notes;

        DROP POLICY IF EXISTS service_request_attachments_select ON service_request_attachments;
        DROP POLICY IF EXISTS service_request_attachments_insert ON service_request_attachments;
        DROP POLICY IF EXISTS service_request_attachments_staff_update ON service_request_attachments;
        DROP POLICY IF EXISTS service_request_attachments_owner_delete ON service_request_attachments;
        DROP POLICY IF EXISTS service_request_attachments_staff_delete ON service_request_attachments;

        DROP POLICY IF EXISTS generated_service_documents_select ON generated_service_documents;
        DROP POLICY IF EXISTS generated_service_documents_insert ON generated_service_documents;
        DROP POLICY IF EXISTS generated_service_documents_update ON generated_service_documents;

        CREATE POLICY service_request_notes_select ON service_request_notes
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY service_request_notes_insert ON service_request_notes
            FOR INSERT WITH CHECK (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
                AND author_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND author_role = current_setting('app.current_role', true)
                AND (
                    current_setting('app.current_role', true) <> 'CITOYEN'
                    OR note_type = 'notification'
                )
            );

        CREATE POLICY service_request_attachments_select ON service_request_attachments
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY service_request_attachments_insert ON service_request_attachments
            FOR INSERT WITH CHECK (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
                AND uploaded_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
            );

        CREATE POLICY service_request_attachments_staff_update ON service_request_attachments
            FOR UPDATE
            USING (
                current_setting('app.current_role', true) NOT IN ('', 'CITOYEN')
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            )
            WITH CHECK (
                current_setting('app.current_role', true) NOT IN ('', 'CITOYEN')
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY service_request_attachments_owner_delete ON service_request_attachments
            FOR DELETE USING (
                uploaded_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY service_request_attachments_staff_delete ON service_request_attachments
            FOR DELETE USING (
                current_setting('app.current_role', true) NOT IN ('', 'CITOYEN')
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY generated_service_documents_select ON generated_service_documents
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY generated_service_documents_insert ON generated_service_documents
            FOR INSERT WITH CHECK (
                current_setting('app.current_role', true) NOT IN ('', 'CITOYEN')
                AND generated_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY generated_service_documents_update ON generated_service_documents
            FOR UPDATE
            USING (
                current_setting('app.current_role', true) NOT IN ('', 'CITOYEN')
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            )
            WITH CHECK (
                current_setting('app.current_role', true) NOT IN ('', 'CITOYEN')
                AND generated_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION eadmin_guard_service_request_attachment_update()
        RETURNS trigger
        LANGUAGE plpgsql
        SET search_path = pg_catalog, public
        AS $$
        BEGIN
            IF NEW.id IS DISTINCT FROM OLD.id
               OR NEW.request_id IS DISTINCT FROM OLD.request_id
               OR NEW.original_name IS DISTINCT FROM OLD.original_name
               OR NEW.sanitized_name IS DISTINCT FROM OLD.sanitized_name
               OR NEW.content_type IS DISTINCT FROM OLD.content_type
               OR NEW.file_size IS DISTINCT FROM OLD.file_size
               OR NEW.object_key IS DISTINCT FROM OLD.object_key
               OR NEW.required_doc_name IS DISTINCT FROM OLD.required_doc_name
               OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
               OR NEW.uploaded_at IS DISTINCT FROM OLD.uploaded_at THEN
                RAISE EXCEPTION 'service request attachment metadata is immutable';
            END IF;

            IF OLD.verified IS TRUE AND NEW.verified IS FALSE THEN
                RAISE EXCEPTION 'service request attachment verification cannot be reverted';
            END IF;

            RETURN NEW;
        END;
        $$;

        DROP TRIGGER IF EXISTS trg_service_request_attachment_update_guard
            ON service_request_attachments;
        CREATE TRIGGER trg_service_request_attachment_update_guard
            BEFORE UPDATE ON service_request_attachments
            FOR EACH ROW
            EXECUTE FUNCTION eadmin_guard_service_request_attachment_update();
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION eadmin_guard_generated_service_document_parent()
        RETURNS trigger
        LANGUAGE plpgsql
        SET search_path = pg_catalog, public
        AS $$
        BEGIN
            IF NEW.id IS DISTINCT FROM OLD.id
               OR NEW.request_id IS DISTINCT FROM OLD.request_id THEN
                RAISE EXCEPTION 'generated service document parent is immutable';
            END IF;
            RETURN NEW;
        END;
        $$;

        DROP TRIGGER IF EXISTS trg_generated_service_document_parent_guard
            ON generated_service_documents;
        CREATE TRIGGER trg_generated_service_document_parent_guard
            BEFORE UPDATE ON generated_service_documents
            FOR EACH ROW
            EXECUTE FUNCTION eadmin_guard_generated_service_document_parent();
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TRIGGER IF EXISTS trg_generated_service_document_parent_guard
            ON generated_service_documents;
        DROP FUNCTION IF EXISTS eadmin_guard_generated_service_document_parent();
        DROP TRIGGER IF EXISTS trg_service_request_attachment_update_guard
            ON service_request_attachments;
        DROP FUNCTION IF EXISTS eadmin_guard_service_request_attachment_update();

        DROP POLICY IF EXISTS service_request_notes_select ON service_request_notes;
        DROP POLICY IF EXISTS service_request_notes_insert ON service_request_notes;
        DROP POLICY IF EXISTS service_request_attachments_select ON service_request_attachments;
        DROP POLICY IF EXISTS service_request_attachments_insert ON service_request_attachments;
        DROP POLICY IF EXISTS service_request_attachments_staff_update ON service_request_attachments;
        DROP POLICY IF EXISTS service_request_attachments_owner_delete ON service_request_attachments;
        DROP POLICY IF EXISTS service_request_attachments_staff_delete ON service_request_attachments;
        DROP POLICY IF EXISTS generated_service_documents_select ON generated_service_documents;
        DROP POLICY IF EXISTS generated_service_documents_insert ON generated_service_documents;
        DROP POLICY IF EXISTS generated_service_documents_update ON generated_service_documents;

        CREATE POLICY service_request_notes_select ON service_request_notes
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY service_request_notes_insert ON service_request_notes
            FOR INSERT WITH CHECK (
                current_setting('app.current_role', true) <> 'CITOYEN'
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY service_request_attachments_select ON service_request_attachments
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY service_request_attachments_insert ON service_request_attachments
            FOR INSERT WITH CHECK (
                uploaded_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY service_request_attachments_staff_update ON service_request_attachments
            FOR UPDATE USING (
                current_setting('app.current_role', true) <> 'CITOYEN'
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY service_request_attachments_owner_delete ON service_request_attachments
            FOR DELETE USING (
                uploaded_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY service_request_attachments_staff_delete ON service_request_attachments
            FOR DELETE USING (
                current_setting('app.current_role', true) NOT IN ('CITOYEN', '')
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY generated_service_documents_select ON generated_service_documents
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY generated_service_documents_insert ON generated_service_documents
            FOR INSERT WITH CHECK (
                current_setting('app.current_role', true) <> 'CITOYEN'
                AND generated_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY generated_service_documents_update ON generated_service_documents
            FOR UPDATE USING (
                current_setting('app.current_role', true) <> 'CITOYEN'
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        """
    )
