"""
Modèle Workflow - eAdministration Suite Guinea.
Circuits de validation et de traitement des documents/courriers.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WorkflowStatusEnum(str, enum.Enum):
    """Statut du workflow."""
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class WorkflowStepStatusEnum(str, enum.Enum):
    """Statut d'une étape du workflow."""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    REJECTED = "REJECTED"


class Workflow(Base):
    """Modèle de circuit de validation."""

    __tablename__ = "workflows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[WorkflowStatusEnum] = mapped_column(
        Enum(WorkflowStatusEnum), default=WorkflowStatusEnum.DRAFT, nullable=False
    )
    current_step: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    steps: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
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
    steps_rel = relationship(
        "WorkflowStep", back_populates="workflow", lazy="selectin",
        order_by="WorkflowStep.order"
    )
    courriers = relationship("Courrier", back_populates="workflow", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Workflow {self.name} ({self.status})>"


class WorkflowStep(Base):
    """Modèle d'étape dans un circuit de validation."""

    __tablename__ = "workflow_steps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflows.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[WorkflowStepStatusEnum] = mapped_column(
        Enum(WorkflowStepStatusEnum), default=WorkflowStepStatusEnum.PENDING, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relations
    workflow = relationship("Workflow", back_populates="steps_rel")

    def __repr__(self) -> str:
        return f"<WorkflowStep {self.name} (étape {self.order})>"
