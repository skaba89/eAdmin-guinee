"""Add server-authoritative ABAC attributes to governed user accounts.

Revision ID: add_user_abac_attributes
Revises: qualified_signature_evidence
Create Date: 2026-08-09
"""

from alembic import op
import sqlalchemy as sa

revision = "add_user_abac_attributes"
down_revision = "qualified_signature_evidence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("employment_status", sa.String(length=32), nullable=False, server_default="active"),
    )
    op.add_column(
        "users",
        sa.Column("security_clearance", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "users",
        sa.Column("assurance_level", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "users",
        sa.Column("privileged_account", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("users", sa.Column("job_function", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("department_code", sa.String(length=100), nullable=True))
    op.add_column(
        "users",
        sa.Column("access_attributes_reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("access_attributes_reviewed_by", sa.UUID(), nullable=True),
    )

    op.create_check_constraint(
        "ck_users_employment_status",
        "users",
        "employment_status IN ('active', 'suspended', 'leave', 'terminated')",
    )
    op.create_check_constraint(
        "ck_users_security_clearance",
        "users",
        "security_clearance BETWEEN 0 AND 4",
    )
    op.create_check_constraint(
        "ck_users_assurance_level",
        "users",
        "assurance_level BETWEEN 1 AND 4",
    )

    # Preserve existing national administrators during rollout. New privileged
    # accounts do not inherit these values automatically and require a separate
    # governed attribute assignment.
    op.execute(
        """
        UPDATE users
        SET security_clearance = 4,
            assurance_level = 3,
            privileged_account = TRUE,
            access_attributes_reviewed_at = now()
        WHERE role = 'SUPER_ADMIN'
        """
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_assurance_level", "users", type_="check")
    op.drop_constraint("ck_users_security_clearance", "users", type_="check")
    op.drop_constraint("ck_users_employment_status", "users", type_="check")
    op.drop_column("users", "access_attributes_reviewed_by")
    op.drop_column("users", "access_attributes_reviewed_at")
    op.drop_column("users", "department_code")
    op.drop_column("users", "job_function")
    op.drop_column("users", "privileged_account")
    op.drop_column("users", "assurance_level")
    op.drop_column("users", "security_clearance")
    op.drop_column("users", "employment_status")
