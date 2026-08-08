"""Governed temporary access grants for delegation and emergency access."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AccessGrant(Base):
    """Time-bounded, approved authorization override.

    A grant never changes a user's permanent role. It can only authorize one
    explicit resource/action inside a tenant/institution scope for a bounded
    period. `break_glass` grants are emergency exceptions and always require MFA.
    """

    __tablename__ = "access_grants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    grant_type: Mapped[str] = mapped_column(String(32), nullable=False, default="delegation")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")

    grantee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    requested_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    revoked_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    tenant_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    institution_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    resource: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    ticket_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    requires_mfa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
