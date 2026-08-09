"""Joiner-Mover-Leaver lifecycle and periodic access recertification models."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class IdentityLifecycleEvent(Base):
    """Durable evidence for joiner, mover, leaver and reactivation actions."""

    __tablename__ = "identity_lifecycle_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    tenant_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    institution_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    old_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    new_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    old_tenant_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    new_tenant_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    old_institution_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    new_institution_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )


class AccessReviewCampaign(Base):
    """Governed periodic review of one tenant/institution access population."""

    __tablename__ = "access_review_campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)
    tenant_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    institution_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AccessReviewItem(Base):
    """Immutable entitlement snapshot plus reviewer decision for one account."""

    __tablename__ = "access_review_items"
    __table_args__ = (
        UniqueConstraint("campaign_id", "user_id", name="uq_access_review_campaign_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("access_review_campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    snapshot_role: Mapped[str] = mapped_column(String(50), nullable=False)
    snapshot_tenant_id: Mapped[str] = mapped_column(String(100), nullable=False)
    snapshot_institution_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    snapshot_grants: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    decision: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
