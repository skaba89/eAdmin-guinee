"""
Electronic Stamp & Parapheur - eAdministration Suite Guinea.
Digital signatures, cachet électronique, and parapheur circuits.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ElectronicStamp(Base):
    """Cachet électronique — official digital stamp for government documents."""

    __tablename__ = "electronic_stamps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    stamped_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    stamp_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # official, certified, registered, urgent
    institution: Mapped[str] = mapped_column(String(255), nullable=False)
    stamp_hash: Mapped[str] = mapped_column(String(128), nullable=False)  # SHA-256 of document + stamp
    qr_code_data: Mapped[str | None] = mapped_column(Text, nullable=True)  # Verification QR code data
    verification_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    invalidated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    document = relationship("Document", back_populates="stamps")
    stamper = relationship("User", foreign_keys=[stamped_by])


class SignatureCircuit(Base):
    """Parapheur circuit — ordered chain of required signatures/approvals."""

    __tablename__ = "signature_circuits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="pending"
    )  # pending, in_progress, completed, rejected
    current_step: Mapped[int] = mapped_column(default=0, nullable=False)
    total_steps: Mapped[int] = mapped_column(default=0, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    document = relationship("Document", back_populates="signature_circuits")
    creator = relationship("User", foreign_keys=[created_by])
    steps = relationship("SignatureStep", back_populates="circuit",
                         order_by="SignatureStep.order", lazy="selectin")


class SignatureStep(Base):
    """Individual step in a parapheur circuit."""

    __tablename__ = "signature_steps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    circuit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("signature_circuits.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    order: Mapped[int] = mapped_column(default=0, nullable=False)
    assignee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    action_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # sign, approve, viser, stamp
    status: Mapped[str] = mapped_column(
        String(50), default="pending"
    )  # pending, completed, rejected, skipped
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    signature_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    circuit = relationship("SignatureCircuit", back_populates="steps")
    assignee = relationship("User", foreign_keys=[assignee_id])
