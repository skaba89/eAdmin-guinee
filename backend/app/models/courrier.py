"""
Modèle Courrier - eAdministration Suite Guinea.
Gestion du courrier entrant et sortant.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CourrierTypeEnum(str, enum.Enum):
    """Type de courrier."""
    ENTRANT = "ENTRANT"
    SORTANT = "SORTANT"


class CourrierPriorityEnum(str, enum.Enum):
    """Niveau de priorité du courrier."""
    URGENT = "URGENT"
    IMPORTANT = "IMPORTANT"
    NORMAL = "NORMAL"
    FAIBLE = "FAIBLE"


class CourrierStatusEnum(str, enum.Enum):
    """Statut du courrier dans le circuit de traitement."""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    TREATED = "TREATED"
    ARCHIVED = "ARCHIVED"


class Courrier(Base):
    """Modèle de courrier pour la gestion du flux documentaire."""

    __tablename__ = "courriers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    reference: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[CourrierTypeEnum] = mapped_column(
        Enum(CourrierTypeEnum), nullable=False
    )
    priority: Mapped[CourrierPriorityEnum] = mapped_column(
        Enum(CourrierPriorityEnum), default=CourrierPriorityEnum.NORMAL, nullable=False
    )
    status: Mapped[CourrierStatusEnum] = mapped_column(
        Enum(CourrierStatusEnum), default=CourrierStatusEnum.PENDING, nullable=False
    )
    sender: Mapped[str] = mapped_column(String(255), nullable=False)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    service_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    workflow_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relations
    workflow = relationship("Workflow", back_populates="courriers", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Courrier {self.reference} ({self.type}/{self.status})>"
