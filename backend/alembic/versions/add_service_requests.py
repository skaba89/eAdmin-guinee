"""Add durable citizen service requests and RLS policies.

Revision ID: add_service_requests
Revises: add_audit_chain_heads
Create Date: 2026-08-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "add_service_requests"
down_revision = "add_audit_chain_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    request_status = postgresql.ENUM(
        "soumise", "en_cours", "pieces_complementaires", "validee",
        "prete", "livree", "rejetee",
        name="servicerequeststatusenum",
        create_type=False,
    )
    delivery_mode = postgresql.ENUM(
        "en_ligne", "guichet", "courrier",
        name="deliverymodeenum",
        create_type=False,
    )
    request_status.create(op.get_bind(), checkfirst=True)
    delivery_mode.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "service_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("reference", sa.String(40), nullable=False),
        sa.Column("service_id", sa.String(100), nullable=False),
        sa.Column("service_name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(150), nullable=False),
        sa.Column("category_id", sa.String(100), nullable=False),
        sa.Column("citizen_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("citizen_name", sa.String(150), nullable=False),
        sa.Column("citizen_first_name", sa.String(150), nullable=False),
        sa.Column("citizen_nin", sa.String(120), nullable=False),
        sa.Column("citizen_phone", sa.String(50), nullable=False),
        sa.Column("citizen_email", sa.String(255), nullable=False),
        sa.Column("citizen_address", sa.String(500), nullable=False),
        sa.Column("motif", sa.Text(), nullable=False),
        sa.Column("required_documents", postgresql.JSON(), nullable=True),
        sa.Column("status", request_status, nullable=False, server_default="soumise"),
        sa.Column("assigned_service", sa.String(255), nullable=False),
        sa.Column("assigned_agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("assigned_agent_name", sa.String(255), nullable=True),
        sa.Column("timeline", postgresql.JSON(), nullable=True),
        sa.Column("deadline_days", sa.Integer(), nullable=False),
        sa.Column("deadline_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("mairie", sa.String(255), nullable=True),
        sa.Column("delivery_mode", delivery_mode, nullable=False, server_default="en_ligne"),
        sa.Column("delivery_location", sa.String(500), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("satisfaction_rating", sa.Integer(), nullable=True),
        sa.Column("satisfaction_comment", sa.Text(), nullable=True),
        sa.Column("satisfaction_rated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ai_processing_status", sa.String(50), nullable=True),
        sa.Column("ai_confidence", sa.Integer(), nullable=True),
        sa.Column("ai_processing_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ai_processing_details", postgresql.JSON(), nullable=True),
        sa.Column("tenant_id", sa.String(100), nullable=False),
        sa.Column("institution_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("reference", name="uq_service_requests_reference"),
    )
    op.create_index("ix_service_requests_reference", "service_requests", ["reference"], unique=True)
    op.create_index("ix_service_requests_citizen_id", "service_requests", ["citizen_id"])
    op.create_index("ix_service_requests_status", "service_requests", ["status"])
    op.create_index("ix_service_requests_scope", "service_requests", ["tenant_id", "institution_id"])
    op.create_index("ix_service_requests_deadline", "service_requests", ["deadline_date"])

    op.create_table(
        "service_request_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("service_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("author_name", sa.String(255), nullable=False),
        sa.Column("author_role", sa.String(100), nullable=False),
        sa.Column("note_type", sa.String(50), nullable=False, server_default="note"),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_service_request_notes_request", "service_request_notes", ["request_id", "created_at"])

    op.create_table(
        "service_request_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("service_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("sanitized_name", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(150), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("object_key", sa.String(1000), nullable=False, unique=True),
        sa.Column("required_doc_name", sa.String(255), nullable=True),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_service_request_attachments_request", "service_request_attachments", ["request_id"])

    op.create_table(
        "generated_service_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("service_requests.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("html_content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("generated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("generated_by_name", sa.String(255), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.execute(
        """
        ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE service_requests FORCE ROW LEVEL SECURITY;
        ALTER TABLE service_request_notes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE service_request_notes FORCE ROW LEVEL SECURITY;
        ALTER TABLE service_request_attachments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE service_request_attachments FORCE ROW LEVEL SECURITY;
        ALTER TABLE generated_service_documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE generated_service_documents FORCE ROW LEVEL SECURITY;

        CREATE POLICY "service_requests_super_select" ON service_requests
            FOR SELECT USING (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "service_requests_citizen_select" ON service_requests
            FOR SELECT USING (
                current_setting('app.current_role', true) = 'CITOYEN'
                AND citizen_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND tenant_id = current_setting('app.current_tenant_id', true)
            );

        CREATE POLICY "service_requests_staff_select" ON service_requests
            FOR SELECT USING (
                current_setting('app.current_role', true) NOT IN ('SUPER_ADMIN', 'CITOYEN')
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            );

        CREATE POLICY "service_requests_super_insert" ON service_requests
            FOR INSERT WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN');

        CREATE POLICY "service_requests_citizen_insert" ON service_requests
            FOR INSERT WITH CHECK (
                current_setting('app.current_role', true) = 'CITOYEN'
                AND citizen_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id IS NULL
            );

        CREATE POLICY "service_requests_staff_insert" ON service_requests
            FOR INSERT WITH CHECK (
                current_setting('app.current_role', true) NOT IN ('SUPER_ADMIN', 'CITOYEN')
                AND tenant_id = current_setting('app.current_tenant_id', true)
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            );

        CREATE POLICY "service_requests_super_update" ON service_requests
            FOR UPDATE
            USING (current_setting('app.current_role', true) = 'SUPER_ADMIN')
            WITH CHECK (current_setting('app.current_role', true) = 'SUPER_ADMIN');

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

        -- Child SELECT follows parent visibility through service_requests RLS.
        CREATE POLICY "service_request_notes_select" ON service_request_notes
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY "service_request_notes_insert" ON service_request_notes
            FOR INSERT WITH CHECK (
                current_setting('app.current_role', true) <> 'CITOYEN'
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY "service_request_attachments_select" ON service_request_attachments
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY "service_request_attachments_insert" ON service_request_attachments
            FOR INSERT WITH CHECK (
                uploaded_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY "service_request_attachments_staff_update" ON service_request_attachments
            FOR UPDATE
            USING (
                current_setting('app.current_role', true) <> 'CITOYEN'
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );

        CREATE POLICY "generated_service_documents_select" ON generated_service_documents
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY "generated_service_documents_insert" ON generated_service_documents
            FOR INSERT WITH CHECK (
                current_setting('app.current_role', true) <> 'CITOYEN'
                AND generated_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        CREATE POLICY "generated_service_documents_update" ON generated_service_documents
            FOR UPDATE USING (
                current_setting('app.current_role', true) <> 'CITOYEN'
                AND EXISTS (SELECT 1 FROM service_requests r WHERE r.id = request_id)
            );
        """
    )


def downgrade() -> None:
    op.drop_table("generated_service_documents")
    op.drop_table("service_request_attachments")
    op.drop_table("service_request_notes")
    op.drop_table("service_requests")

    bind = op.get_bind()
    postgresql.ENUM(name="deliverymodeenum").drop(bind, checkfirst=True)
    postgresql.ENUM(name="servicerequeststatusenum").drop(bind, checkfirst=True)
