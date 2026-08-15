"""Municipality-owned routing of catalog services to internal service units."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class InstitutionServiceAssignment(Base):
    """Bind one logical catalog service to one municipality and processing unit.

    ``institution_id`` is the citizen-facing mairie. ``service_institution_id``
    is the internal child service whose team processes the dossier. The mapping
    uses the logical service id so publishing a new catalog version does not
    silently break municipal routing.
    """

    __tablename__ = "institution_service_assignments"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "institution_id",
            "service_id",
            name="uq_institution_service_assignment",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    institution_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    service_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    service_institution_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
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
