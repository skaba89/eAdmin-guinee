"""
Modèle Tenant - eAdministration Suite Guinea.
Isolation multi-tenant pour la plateforme GovTech.
Chaque tenant représente une organisation cliente (ministère, mairie, agence...)
avec ses propres couleurs, limites et fonctionnalités.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Tenant(Base):
    """
    Modèle de tenant pour l'isolation multi-tenant.

    Chaque tenant représente une organisation cliente de la plateforme.
    L'isolation est assurée par le tenant_id présent dans chaque table métier
    et les politiques RLS PostgreSQL.

    Couleurs par défaut : drapeau guinéen (rouge #CE1126, jaune #FCD116, vert #009460).
    """

    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(
        String(100), primary_key=True,
        comment="Identifiant du tenant (ex: 'republique-de-guinee')"
    )
    name: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Nom complet du tenant (ex: 'République de Guinée')"
    )
    domain: Mapped[str | None] = mapped_column(
        String(255), nullable=True, unique=True,
        comment="Domaine personnalisé (ex: 'eadmin.gouv.gn')"
    )
    logo_url: Mapped[str | None] = mapped_column(
        String(512), nullable=True,
        comment="URL du logo du tenant"
    )
    primary_color: Mapped[str] = mapped_column(
        String(7), default="#CE1126", nullable=False,
        comment="Couleur principale (rouge Guinée par défaut)"
    )
    secondary_color: Mapped[str] = mapped_column(
        String(7), default="#FCD116", nullable=False,
        comment="Couleur secondaire (jaune Guinée par défaut)"
    )
    accent_color: Mapped[str] = mapped_column(
        String(7), default="#009460", nullable=False,
        comment="Couleur d'accent (vert Guinée par défaut)"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False,
        comment="Tenant actif ou désactivé"
    )
    max_users: Mapped[int] = mapped_column(
        Integer, default=1000, nullable=False,
        comment="Nombre maximum d'utilisateurs autorisés"
    )
    max_documents: Mapped[int] = mapped_column(
        Integer, default=10000, nullable=False,
        comment="Nombre maximum de documents autorisés"
    )
    max_storage_mb: Mapped[int] = mapped_column(
        Integer, default=5120, nullable=False,
        comment="Stockage maximum en Mo (5 Go par défaut)"
    )
    features: Mapped[dict | None] = mapped_column(
        JSON, nullable=True,
        comment="Feature flags du tenant (ex: {'mfa': true, 'ai': false})"
    )
    settings: Mapped[dict | None] = mapped_column(
        JSON, nullable=True,
        comment="Paramètres spécifiques au tenant"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Tenant {self.id} ({self.name})>"
