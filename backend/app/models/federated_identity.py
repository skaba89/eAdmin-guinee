"""Federated OIDC identity bindings for government SSO."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FederatedIdentity(Base):
    """Bind one verified external `(issuer, subject)` to a local eAdmin account.

    External claims authenticate identity only. Local User.role, tenant_id and
    institution_id remain the authorization authority and are never populated
    from IdP role/group claims by the authentication callback.
    """

    __tablename__ = "federated_identities"
    __table_args__ = (
        UniqueConstraint("issuer", "subject", name="uq_federated_identity_issuer_subject"),
        UniqueConstraint("user_id", "issuer", name="uq_federated_identity_user_issuer"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    issuer: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False, default="oidc")
    email_snapshot: Mapped[str | None] = mapped_column(String(255), nullable=True)
    claims_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    linked_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    disabled_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    last_authenticated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
