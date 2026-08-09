"""Durable citizen service-request domain models.

These entities replace browser localStorage as the administrative source of
truth for citizen requests, processing notes, attachments and generated
official documents.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ServiceRequestStatusEnum(str, enum.Enum):
    SOUMISE = "soumise"
    EN_COURS = "en_cours"
    PIECES_COMPLEMENTAIRES = "pieces_complementaires"
    VALIDEE = "validee"
    PRETE = "prete"
    LIVREE = "livree"
    REJETEE = "rejetee"


class DeliveryModeEnum(str, enum.Enum):
    EN_LIGNE = "en_ligne"
    GUICHET = "guichet"
    COURRIER = "courrier"


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)

    service_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(150), nullable=False)
    category_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Immutable policy snapshot used for audit/reproducibility. Historical
    # rows created before the catalog migration legitimately remain NULL.
    service_catalog_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    service_policy_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    service_policy_source: Mapped[str | None] = mapped_column(String(500), nullable=True)
    service_fee_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expected_processing_label: Mapped[str | None] = mapped_column(String(100), nullable=True)

    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    citizen_name: Mapped[str] = mapped_column(String(150), nullable=False)
    citizen_first_name: Mapped[str] = mapped_column(String(150), nullable=False)
    citizen_nin: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    citizen_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    citizen_email: Mapped[str] = mapped_column(String(255), nullable=False)
    citizen_address: Mapped[str] = mapped_column(String(500), nullable=False)

    motif: Mapped[str] = mapped_column(Text, nullable=False)
    required_documents: Mapped[list | None] = mapped_column(JSON, nullable=True)

    status: Mapped[ServiceRequestStatusEnum] = mapped_column(
        Enum(ServiceRequestStatusEnum),
        default=ServiceRequestStatusEnum.SOUMISE,
        nullable=False,
        index=True,
    )
    assigned_service: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    assigned_agent_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    timeline: Mapped[list | None] = mapped_column(JSON, nullable=True)
    deadline_days: Mapped[int] = mapped_column(Integer, nullable=False)
    deadline_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    mairie: Mapped[str | None] = mapped_column(String(255), nullable=True)

    delivery_mode: Mapped[DeliveryModeEnum] = mapped_column(
        Enum(DeliveryModeEnum), default=DeliveryModeEnum.EN_LIGNE, nullable=False
    )
    delivery_location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    satisfaction_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    satisfaction_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    satisfaction_rated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    ai_processing_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_confidence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_processing_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_processing_details: Mapped[list | None] = mapped_column(JSON, nullable=True)

    tenant_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    institution_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    notes = relationship(
        "ServiceRequestNote", back_populates="request", cascade="all, delete-orphan", lazy="selectin"
    )
    attachments = relationship(
        "ServiceRequestAttachment", back_populates="request", cascade="all, delete-orphan", lazy="selectin"
    )
    generated_document = relationship(
        "GeneratedServiceDocument", back_populates="request", cascade="all, delete-orphan",
        uselist=False, lazy="selectin"
    )


class ServiceRequestNote(Base):
    __tablename__ = "service_request_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    author_role: Mapped[str] = mapped_column(String(100), nullable=False)
    note_type: Mapped[str] = mapped_column(String(50), nullable=False, default="note")
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    request = relationship("ServiceRequest", back_populates="notes")


class ServiceRequestAttachment(Base):
    __tablename__ = "service_request_attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sanitized_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    object_key: Mapped[str] = mapped_column(String(1000), nullable=False, unique=True)
    required_doc_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    request = relationship("ServiceRequest", back_populates="attachments")


class GeneratedServiceDocument(Base):
    __tablename__ = "generated_service_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_requests.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    html_content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    generated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    generated_by_name: Mapped[str] = mapped_column(String(255), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Provenance of the approved server-side template. Historical rows created
    # before this migration remain nullable/false and are visibly distinguishable.
    template_service_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    template_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    template_source_reference: Mapped[str | None] = mapped_column(String(500), nullable=True)
    rendered_server_side: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    request = relationship("ServiceRequest", back_populates="generated_document")
