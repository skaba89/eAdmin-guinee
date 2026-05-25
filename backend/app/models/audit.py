"""
Modèle AuditLog - eAdministration Suite Guinea.
Journalisation de toutes les actions pour la traçabilité.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# --- Action Types ---
# Supported audit action types for consistent categorization:
#   LOGIN          — User authentication (sign in)
#   LOGOUT         — User de-authentication (sign out)
#   CREATE         — Resource creation
#   READ           — Resource access / view
#   UPDATE         — Resource modification
#   DELETE         — Resource deletion
#   EXPORT         — Data export operation
#   SIGN           — Digital signature applied
#   APPROVE        — Approval action on a workflow/document
#   REJECT         — Rejection action on a workflow/document
#   ESCALATE       — Escalation to a higher authority
#   DOWNLOAD       — File download
#   UPLOAD         — File upload
#   WORKFLOW_STEP  — Workflow step transition
#   PASSWORD_CHANGE — User password change


class AuditLog(Base):
    """Journal d'audit pour la traçabilité des actions."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_id: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    # --- Enhanced tracking fields ---
    user_agent: Mapped[str | None] = mapped_column(
        String(512), nullable=True, comment="Browser/client user agent"
    )
    session_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Session identifier"
    )
    resource_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Human-readable resource name"
    )
    old_value: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Previous value for modifications (JSON string)"
    )
    new_value: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="New value for modifications (JSON string)"
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relations
    user = relationship("User", back_populates="audit_logs", lazy="selectin")

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} on {self.resource_type}/{self.resource_id}>"
