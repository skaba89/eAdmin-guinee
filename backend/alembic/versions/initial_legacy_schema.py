"""Create the legacy application schema before tenant/RLS migrations.

Revision ID: initial_legacy_schema
Revises:
Create Date: 2026-08-08

The repository historically started its Alembic graph with RLS policies while
assuming the application tables already existed.  This baseline makes a clean
PostgreSQL installation deterministic without changing the revision ids of the
migrations already deployed in existing environments.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "initial_legacy_schema"
down_revision = None
branch_labels = None
depends_on = None


role_enum = sa.Enum(
    "SUPER_ADMIN",
    "MINISTRE",
    "DIRECTEUR",
    "CHEF_SERVICE",
    "ADMIN",
    "AGENT",
    "MAIRIE",
    "AGENCE",
    "CITOYEN",
    name="roleenum",
)
document_status_enum = sa.Enum(
    "DRAFT", "PENDING_REVIEW", "APPROVED", "ARCHIVED", "REJECTED",
    name="documentstatusenum",
)
workflow_status_enum = sa.Enum(
    "DRAFT", "ACTIVE", "COMPLETED", "CANCELLED", name="workflowstatusenum"
)
workflow_step_status_enum = sa.Enum(
    "PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED", "REJECTED",
    name="workflowstepstatusenum",
)
courrier_type_enum = sa.Enum("ENTRANT", "SORTANT", name="courriertypeenum")
courrier_priority_enum = sa.Enum(
    "URGENT", "IMPORTANT", "NORMAL", "FAIBLE", name="courrierpriorityenum"
)
courrier_status_enum = sa.Enum(
    "PENDING", "IN_PROGRESS", "TREATED", "ARCHIVED", name="courrierstatusenum"
)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", role_enum, nullable=False, server_default="AGENT"),
        sa.Column("institution", sa.String(255), nullable=True),
        # These two fields pre-date the tenants/institutions reference tables.
        sa.Column("tenant_id", sa.String(100), nullable=True),
        sa.Column("institution_id", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("mfa_secret", sa.String(255), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])
    op.create_index("ix_users_institution_id", "users", ["institution_id"])

    op.create_table(
        "workflows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", workflow_status_enum, nullable=False, server_default="DRAFT"),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("steps", postgresql.JSON(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("institution_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_workflows_id", "workflows", ["id"])
    op.create_index("ix_workflows_created_by", "workflows", ["created_by"])

    op.create_table(
        "workflow_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflows.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("assignee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("status", workflow_step_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_workflow_steps_id", "workflow_steps", ["id"])
    op.create_index("ix_workflow_steps_workflow_id", "workflow_steps", ["workflow_id"])

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_path", sa.String(1000), nullable=True),
        sa.Column("file_type", sa.String(50), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", document_status_enum, nullable=False, server_default="DRAFT"),
        sa.Column("tags", postgresql.JSON(), nullable=True),
        sa.Column("current_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("institution_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_documents_id", "documents", ["id"])
    op.create_index("ix_documents_owner_id", "documents", ["owner_id"])

    op.create_table(
        "document_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("file_path", sa.String(512), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("file_hash", sa.String(128), nullable=False),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("change_type", sa.String(50), nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_document_versions_document_id", "document_versions", ["document_id"])

    op.create_table(
        "electronic_stamps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stamped_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stamp_type", sa.String(50), nullable=False),
        sa.Column("institution", sa.String(255), nullable=False),
        sa.Column("stamp_hash", sa.String(128), nullable=False),
        sa.Column("qr_code_data", sa.Text(), nullable=True),
        sa.Column("verification_url", sa.String(512), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("is_valid", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("invalidated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_electronic_stamps_document_id", "electronic_stamps", ["document_id"])

    op.create_table(
        "signature_circuits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_steps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_signature_circuits_document_id", "signature_circuits", ["document_id"])

    op.create_table(
        "signature_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("circuit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("signature_circuits.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("assignee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("signature_hash", sa.String(128), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_signature_steps_circuit_id", "signature_steps", ["circuit_id"])

    op.create_table(
        "courriers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("reference", sa.String(100), nullable=False, unique=True),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("type", courrier_type_enum, nullable=False),
        sa.Column("priority", courrier_priority_enum, nullable=False, server_default="NORMAL"),
        sa.Column("status", courrier_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("sender", sa.String(255), nullable=False),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column("service_id", sa.String(255), nullable=True),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflows.id"), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_courriers_id", "courriers", ["id"])
    op.create_index("ix_courriers_reference", "courriers", ["reference"], unique=True)

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column("details", postgresql.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("session_id", sa.String(255), nullable=True),
        sa.Column("device_fingerprint", sa.String(100), nullable=True),
        sa.Column("resource_name", sa.String(255), nullable=True),
        sa.Column("severity", sa.String(20), nullable=False, server_default="info"),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("entry_hash", sa.String(64), nullable=True),
        sa.Column("previous_hash", sa.String(64), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_category", "audit_logs", ["category"])
    op.create_index("ix_audit_logs_resource_type", "audit_logs", ["resource_type"])
    op.create_index("ix_audit_logs_session_id", "audit_logs", ["session_id"])
    op.create_index("ix_audit_logs_severity", "audit_logs", ["severity"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("courriers")
    op.drop_table("signature_steps")
    op.drop_table("signature_circuits")
    op.drop_table("electronic_stamps")
    op.drop_table("document_versions")
    op.drop_table("documents")
    op.drop_table("workflow_steps")
    op.drop_table("workflows")
    op.drop_table("users")

    for enum_name in (
        "courrierstatusenum",
        "courrierpriorityenum",
        "courriertypeenum",
        "workflowstepstatusenum",
        "workflowstatusenum",
        "documentstatusenum",
        "roleenum",
    ):
        op.execute(sa.text(f'DROP TYPE IF EXISTS "{enum_name}"'))
