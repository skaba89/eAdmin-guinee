"""
Electronic Stamp & Parapheur - eAdministration Suite Guinea.
Digital approval evidence, electronic stamps, and parapheur circuits.

Important: SignatureStep stores internal approval evidence. It is NOT a
qualified PKI signature until a trusted certificate/TSA integration is added.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
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
    stamp_type: Mapped[str] = mapped_column(String(50), nullable=False)
    institution: Mapped[str] = mapped_column(String(255), nullable=False)
    stamp_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    qr_code_data: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    status: Mapped[str] = mapped_column(String(50), default="pending")
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
    steps = relationship(
        "SignatureStep",
        back_populates="circuit",
        order_by="SignatureStep.order",
        lazy="selectin",
    )


class SignatureStep(Base):
    """Individual parapheur action with deterministic, document-bound evidence."""

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
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    signature_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Internal evidence. These fields bind an approval to one immutable document
    # version. evidence_type must remain explicit so this is never confused with
    # a qualified certificate-backed signature.
    signed_document_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    signed_document_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    evidence_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evidence_type: Mapped[str] = mapped_column(
        String(50), default="internal_approval", nullable=False
    )
    evidence_algorithm: Mapped[str] = mapped_column(
        String(50), default="SHA-256", nullable=False
    )

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    circuit = relationship("SignatureCircuit", back_populates="steps")
    assignee = relationship("User", foreign_keys=[assignee_id])
