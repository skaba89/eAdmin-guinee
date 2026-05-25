"""
Modèle Document - eAdministration Suite Guinea.
Gestion électronique des documents (GED).
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DocumentStatusEnum(str, enum.Enum):
    """Statuts possibles d'un document."""
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    ARCHIVED = "ARCHIVED"
    REJECTED = "REJECTED"


class Document(Base):
    """Modèle de document pour la GED."""

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[DocumentStatusEnum] = mapped_column(
        Enum(DocumentStatusEnum), default=DocumentStatusEnum.DRAFT, nullable=False
    )
    tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    tenant_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True,
        comment="Tenant identifier for multi-tenant isolation"
    )
    institution_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
        comment="Institution identifier for RLS"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relations
    owner = relationship("User", back_populates="documents", lazy="selectin")
    versions = relationship(
        "DocumentVersion", back_populates="document", lazy="selectin",
        order_by="DocumentVersion.version_number.desc()"
    )
    stamps = relationship("ElectronicStamp", back_populates="document", lazy="selectin")
    signature_circuits = relationship("SignatureCircuit", back_populates="document", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Document {self.title} ({self.status})>"
