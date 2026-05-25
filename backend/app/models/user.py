"""
Modèle Utilisateur - eAdministration Suite Guinea.
Représente les agents et administrateurs de la plateforme.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RoleEnum(str, enum.Enum):
    """Rôles disponibles dans la plateforme."""
    SUPER_ADMIN = "SUPER_ADMIN"
    MINISTRE = "MINISTRE"
    DIRECTEUR = "DIRECTEUR"
    CHEF_SERVICE = "CHEF_SERVICE"
    ADMIN = "ADMIN"
    AGENT = "AGENT"
    MAIRIE = "MAIRIE"
    AGENCE = "AGENCE"
    CITOYEN = "CITOYEN"

    def to_frontend_role(self) -> str:
        """Map backend role to frontend role name."""
        mapping = {
            RoleEnum.SUPER_ADMIN: "superadmin",
            RoleEnum.ADMIN: "admin",
            RoleEnum.DIRECTOR: "ministere",
            RoleEnum.CHEF_SERVICE: "mairie",
            RoleEnum.AGENT: "agence",
            RoleEnum.LECTEUR: "citoyen",
        }
        return mapping[self]


class User(Base):
    """Modèle utilisateur pour l'administration guinéenne."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[RoleEnum] = mapped_column(
        Enum(RoleEnum), default=RoleEnum.AGENT, nullable=False
    )
    institution: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relations
    documents = relationship("Document", back_populates="owner", lazy="selectin")
    audit_logs = relationship("AuditLog", back_populates="user", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
