"""
Modèle Institution - eAdministration Suite Guinea.
Structure hiérarchique des institutions guinéennes.
Ministères, directions, services, mairies et agences.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Institution(Base):
    """
    Modèle d'institution pour la structuration hiérarchique.

    Représente les différentes entités administratives guinéennes :
    - Ministères (niveau supérieur)
    - Directions (rattachées à un ministère)
    - Services (rattachés à une direction)
    - Mairies (collectivités locales)
    - Agences (établissements publics)

    La hiérarchie est modélisée via parent_id (auto-référence).
    Chaque institution appartient à un tenant (isolation multi-tenant).
    """

    __tablename__ = "institutions"

    id: Mapped[str] = mapped_column(
        String(100), primary_key=True,
        comment="Identifiant de l'institution (ex: 'min-justice')"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True,
        comment="Tenant de rattachement (isolation multi-tenant)"
    )
    name: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Nom complet de l'institution"
    )
    type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True,
        comment="Type d'institution: ministere, direction, service, mairie, agence"
    )
    parent_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True,
        comment="Institution parente (hiérarchie)"
    )
    code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, unique=True,
        comment="Code administratif (ex: 'MJ-001')"
    )
    address: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Adresse physique de l'institution"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False,
        comment="Institution active ou désactivée"
    )
    settings: Mapped[dict | None] = mapped_column(
        JSON, nullable=True,
        comment="Paramètres spécifiques à l'institution"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Institution {self.id} ({self.name}, type={self.type})>"
