"""Versioned national catalog of citizen administrative services.

The catalog is the server-side authority for service metadata used when a
citizen request is created. Request rows keep a snapshot of the catalog version
so later policy changes never rewrite the historical basis of an application.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AdministrativeService(Base):
    __tablename__ = "administrative_services"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "service_id",
            "version",
            name="uq_administrative_service_tenant_service_version",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    category_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category_name: Mapped[str] = mapped_column(String(150), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    fee_label: Mapped[str] = mapped_column(String(100), nullable=False, default="Gratuit")
    expected_processing_label: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    sla_business_days: Mapped[int] = mapped_column(Integer, nullable=False)
    required_documents: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    routing_terms: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # "operational_default" means an internal operational rule, not a statutory
    # legal deadline. Approved policies can later be versioned with a source.
    policy_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="operational_default", index=True
    )
    source_reference: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Administrative output is versioned with the service itself. Templates are
    # plain text with a controlled placeholder allow-list; the backend owns the
    # final HTML layout. "approved" therefore means approved content, not
    # arbitrary executable markup.
    document_template_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="not_configured", index=True
    )
    document_template_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    document_template_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_template_source_reference: Mapped[str | None] = mapped_column(String(500), nullable=True)
    document_template_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    document_template_approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    document_template_approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
