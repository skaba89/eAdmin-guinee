"""Add IAM lifecycle evidence and periodic access recertification.

Revision ID: iam_jml_recertification
Revises: soc_incident_response
Create Date: 2026-08-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "iam_jml_recertification"
down_revision = "soc_incident_response"
branch_labels = None
depends_on = None


_ADMIN_SCOPED = """
current_setting('app.current_role', true) IN (
    'ADMIN', 'CHEF_SERVICE', 'DIRECTEUR', 'MINISTRE', 'SUPER_ADMIN'
)
AND (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR tenant_id = current_setting('app.current_tenant_id', true)
)
AND (
    current_setting('app.current_role', true) IN ('MINISTRE', 'SUPER_ADMIN')
    OR institution_id IS NULL
    OR institution_id = current_setting('app.current_institution_id', true)
)
""".strip()

_REVIEWER_SCOPED = """
current_setting('app.current_role', true) IN (
    'CHEF_SERVICE', 'DIRECTEUR', 'MINISTRE', 'SUPER_ADMIN'
)
AND (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR tenant_id = current_setting('app.current_tenant_id', true)
)
AND (
    current_setting('app.current_role', true) IN ('MINISTRE', 'SUPER_ADMIN')
    OR institution_id IS NULL
    OR institution_id = current_setting('app.current_institution_id', true)
)
""".strip()

_DIRECTOR_SCOPED = """
current_setting('app.current_role', true) IN ('DIRECTEUR', 'MINISTRE', 'SUPER_ADMIN')
AND (
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
    OR tenant_id = current_setting('app.current_tenant_id', true)
)
AND (
    current_setting('app.current_role', true) IN ('MINISTRE', 'SUPER_ADMIN')
    OR institution_id IS NULL
    OR institution_id = current_setting('app.current_institution_id', true)
)
""".strip()


def upgrade() -> None:
    op.create_table(
        "identity_lifecycle_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("tenant_id", sa.String(length=100), nullable=False),
        sa.Column("institution_id", sa.String(length=100), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("old_role", sa.String(length=50), nullable=True),
        sa.Column("new_role", sa.String(length=50), nullable=True),
        sa.Column("old_tenant_id", sa.String(length=100), nullable=True),
        sa.Column("new_tenant_id", sa.String(length=100), nullable=True),
        sa.Column("old_institution_id", sa.String(length=100), nullable=True),
        sa.Column("new_institution_id", sa.String(length=100), nullable=True),
        sa.Column("details", postgresql.JSONB(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "event_type IN ('joiner', 'mover', 'leaver', 'reactivation', 'recertification')",
            name="ck_identity_lifecycle_event_type",
        ),
    )
    for column in ("user_id", "actor_id", "event_type", "tenant_id", "institution_id", "occurred_at"):
        op.create_index(f"ix_identity_lifecycle_events_{column}", "identity_lifecycle_events", [column])

    op.create_table(
        "access_review_campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("tenant_id", sa.String(length=100), nullable=False),
        sa.Column("institution_id", sa.String(length=100), nullable=True),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "status IN ('active', 'completed', 'cancelled')",
            name="ck_access_review_campaign_status",
        ),
        sa.CheckConstraint("due_at > created_at", name="ck_access_review_campaign_due_at"),
    )
    for column in ("status", "tenant_id", "institution_id", "reviewer_id", "created_by", "due_at"):
        op.create_index(f"ix_access_review_campaigns_{column}", "access_review_campaigns", [column])

    op.create_table(
        "access_review_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot_role", sa.String(length=50), nullable=False),
        sa.Column("snapshot_tenant_id", sa.String(length=100), nullable=False),
        sa.Column("snapshot_institution_id", sa.String(length=100), nullable=True),
        sa.Column("snapshot_grants", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("decision", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("decided_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["campaign_id"], ["access_review_campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["decided_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("campaign_id", "user_id", name="uq_access_review_campaign_user"),
        sa.CheckConstraint(
            "decision IN ('pending', 'certified', 'revoke_temporary', 'disable_account')",
            name="ck_access_review_item_decision",
        ),
    )
    for column in ("campaign_id", "user_id", "decision", "decided_by"):
        op.create_index(f"ix_access_review_items_{column}", "access_review_items", [column])

    for table in (
        "identity_lifecycle_events",
        "access_review_campaigns",
        "access_review_items",
    ):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")

    op.execute(
        f"""
        CREATE POLICY identity_lifecycle_scoped_read
        ON identity_lifecycle_events FOR SELECT
        USING ({_ADMIN_SCOPED})
        """
    )
    op.execute(
        f"""
        CREATE POLICY identity_lifecycle_scoped_insert
        ON identity_lifecycle_events FOR INSERT
        WITH CHECK ({_ADMIN_SCOPED})
        """
    )

    op.execute(
        f"""
        CREATE POLICY access_review_campaigns_scoped_read
        ON access_review_campaigns FOR SELECT
        USING ({_REVIEWER_SCOPED})
        """
    )
    op.execute(
        f"""
        CREATE POLICY access_review_campaigns_scoped_insert
        ON access_review_campaigns FOR INSERT
        WITH CHECK ({_DIRECTOR_SCOPED})
        """
    )
    op.execute(
        f"""
        CREATE POLICY access_review_campaigns_scoped_update
        ON access_review_campaigns FOR UPDATE
        USING ({_DIRECTOR_SCOPED})
        WITH CHECK ({_DIRECTOR_SCOPED})
        """
    )

    # Item scope is inherited from its campaign; never trust a client-provided
    # tenant on an item row because the item itself intentionally stores only
    # the immutable user entitlement snapshot.
    op.execute(
        """
        CREATE POLICY access_review_items_scoped_read
        ON access_review_items FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM access_review_campaigns c
                WHERE c.id = access_review_items.campaign_id
                  AND current_setting('app.current_role', true) IN (
                      'CHEF_SERVICE', 'DIRECTEUR', 'MINISTRE', 'SUPER_ADMIN'
                  )
                  AND (
                      current_setting('app.current_role', true) = 'SUPER_ADMIN'
                      OR c.tenant_id = current_setting('app.current_tenant_id', true)
                  )
                  AND (
                      current_setting('app.current_role', true) IN ('MINISTRE', 'SUPER_ADMIN')
                      OR c.institution_id IS NULL
                      OR c.institution_id = current_setting('app.current_institution_id', true)
                  )
            )
        )
        """
    )
    for operation in ("INSERT", "UPDATE"):
        using = "" if operation == "INSERT" else "USING (EXISTS (SELECT 1 FROM access_review_campaigns c WHERE c.id = access_review_items.campaign_id AND (current_setting('app.current_role', true) = 'SUPER_ADMIN' OR (current_setting('app.current_role', true) IN ('DIRECTEUR', 'MINISTRE') AND c.tenant_id = current_setting('app.current_tenant_id', true) AND (current_setting('app.current_role', true) = 'MINISTRE' OR c.institution_id IS NULL OR c.institution_id = current_setting('app.current_institution_id', true)))))"
        op.execute(
            f"""
            CREATE POLICY access_review_items_scoped_{operation.lower()}
            ON access_review_items FOR {operation}
            {using}
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM access_review_campaigns c
                    WHERE c.id = access_review_items.campaign_id
                      AND (
                          current_setting('app.current_role', true) = 'SUPER_ADMIN'
                          OR (
                              current_setting('app.current_role', true) IN ('DIRECTEUR', 'MINISTRE')
                              AND c.tenant_id = current_setting('app.current_tenant_id', true)
                              AND (
                                  current_setting('app.current_role', true) = 'MINISTRE'
                                  OR c.institution_id IS NULL
                                  OR c.institution_id = current_setting('app.current_institution_id', true)
                              )
                          )
                      )
                )
            )
            """
        )


def downgrade() -> None:
    for policy in (
        "access_review_items_scoped_update",
        "access_review_items_scoped_insert",
        "access_review_items_scoped_read",
    ):
        op.execute(f"DROP POLICY IF EXISTS {policy} ON access_review_items")
    for policy in (
        "access_review_campaigns_scoped_update",
        "access_review_campaigns_scoped_insert",
        "access_review_campaigns_scoped_read",
    ):
        op.execute(f"DROP POLICY IF EXISTS {policy} ON access_review_campaigns")
    op.execute("DROP POLICY IF EXISTS identity_lifecycle_scoped_insert ON identity_lifecycle_events")
    op.execute("DROP POLICY IF EXISTS identity_lifecycle_scoped_read ON identity_lifecycle_events")

    for column in ("decided_by", "decision", "user_id", "campaign_id"):
        op.drop_index(f"ix_access_review_items_{column}", table_name="access_review_items")
    op.drop_table("access_review_items")

    for column in ("due_at", "created_by", "reviewer_id", "institution_id", "tenant_id", "status"):
        op.drop_index(f"ix_access_review_campaigns_{column}", table_name="access_review_campaigns")
    op.drop_table("access_review_campaigns")

    for column in ("occurred_at", "institution_id", "tenant_id", "event_type", "actor_id", "user_id"):
        op.drop_index(f"ix_identity_lifecycle_events_{column}", table_name="identity_lifecycle_events")
    op.drop_table("identity_lifecycle_events")
