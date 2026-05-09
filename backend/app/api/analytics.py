"""
Routes d'analytique - eAdministration Suite Guinea.
Tableaux de bord, KPIs et statistiques.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.courrier import Courrier, CourrierPriorityEnum, CourrierStatusEnum, CourrierTypeEnum
from app.models.document import Document, DocumentStatusEnum
from app.models.user import User
from app.models.workflow import Workflow, WorkflowStatusEnum

router = APIRouter()


# --- Schémas Pydantic ---
class DashboardKPIs(BaseModel):
    total_documents: int
    documents_en_attente: int
    total_courriers: int
    courriers_en_cours: int
    courriers_urgents: int
    workflows_actifs: int
    utilisateurs_actifs: int
    documents_ce_mois: int
    courriers_ce_mois: int


class CourrierStats(BaseModel):
    par_type: dict[str, int]
    par_statut: dict[str, int]
    par_priorite: dict[str, int]
    total: int
    en_retard: int


class DocumentStats(BaseModel):
    par_statut: dict[str, int]
    par_type_fichier: dict[str, int]
    total: int
    volume_total_mo: float


class PerformanceMetrics(BaseModel):
    temps_moyen_traitement_courrier: float  # en jours
    taux_resolution_documents: float  # pourcentage
    courriers_traites_mois: int
    documents_approuves_mois: int
    workflows_completes_mois: int


# --- Endpoints ---

@router.get("/dashboard", response_model=DashboardKPIs, summary="KPIs du tableau de bord")
async def get_dashboard_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardKPIs:
    """
    Retourne les KPIs principaux pour le tableau de bord.
    """
    now = datetime.now(timezone.utc)
    debut_mois = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Documents
    total_docs = (await db.execute(select(func.count(Document.id)))).scalar() or 0
    docs_en_attente = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.status == DocumentStatusEnum.PENDING_REVIEW
            )
        )
    ).scalar() or 0
    docs_ce_mois = (
        await db.execute(
            select(func.count(Document.id)).where(Document.created_at >= debut_mois)
        )
    ).scalar() or 0

    # Courriers
    total_courriers = (await db.execute(select(func.count(Courrier.id)))).scalar() or 0
    courriers_en_cours = (
        await db.execute(
            select(func.count(Courrier.id)).where(
                Courrier.status == CourrierStatusEnum.IN_PROGRESS
            )
        )
    ).scalar() or 0
    courriers_urgents = (
        await db.execute(
            select(func.count(Courrier.id)).where(
                Courrier.priority == CourrierPriorityEnum.URGENT
            )
        )
    ).scalar() or 0
    courriers_ce_mois = (
        await db.execute(
            select(func.count(Courrier.id)).where(Courrier.created_at >= debut_mois)
        )
    ).scalar() or 0

    # Workflows
    workflows_actifs = (
        await db.execute(
            select(func.count(Workflow.id)).where(
                Workflow.status == WorkflowStatusEnum.ACTIVE
            )
        )
    ).scalar() or 0

    # Utilisateurs
    utilisateurs_actifs = (
        await db.execute(select(func.count(User.id)).where(User.is_active.is_(True)))
    ).scalar() or 0

    return DashboardKPIs(
        total_documents=total_docs,
        documents_en_attente=docs_en_attente,
        total_courriers=total_courriers,
        courriers_en_cours=courriers_en_cours,
        courriers_urgents=courriers_urgents,
        workflows_actifs=workflows_actifs,
        utilisateurs_actifs=utilisateurs_actifs,
        documents_ce_mois=docs_ce_mois,
        courriers_ce_mois=courriers_ce_mois,
    )


@router.get("/courriers/stats", response_model=CourrierStats, summary="Statistiques des courriers")
async def get_courrier_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourrierStats:
    """
    Statistiques détaillées sur les courriers.
    """
    now = datetime.now(timezone.utc)

    # Par type
    type_result = await db.execute(
        select(Courrier.type, func.count(Courrier.id)).group_by(Courrier.type)
    )
    par_type = {str(t): c for t, c in type_result.all()}

    # Par statut
    status_result = await db.execute(
        select(Courrier.status, func.count(Courrier.id)).group_by(Courrier.status)
    )
    par_statut = {str(s): c for s, c in status_result.all()}

    # Par priorité
    priority_result = await db.execute(
        select(Courrier.priority, func.count(Courrier.id)).group_by(Courrier.priority)
    )
    par_priorite = {str(p): c for p, c in priority_result.all()}

    # Total
    total = (await db.execute(select(func.count(Courrier.id)))).scalar() or 0

    # En retard (due_date dépassée et non traité)
    en_retard = (
        await db.execute(
            select(func.count(Courrier.id)).where(
                Courrier.due_date < now,
                Courrier.status.in_(
                    [CourrierStatusEnum.PENDING, CourrierStatusEnum.IN_PROGRESS]
                ),
            )
        )
    ).scalar() or 0

    return CourrierStats(
        par_type=par_type,
        par_statut=par_statut,
        par_priorite=par_priorite,
        total=total,
        en_retard=en_retard,
    )


@router.get("/documents/stats", response_model=DocumentStats, summary="Statistiques des documents")
async def get_document_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentStats:
    """
    Statistiques détaillées sur les documents.
    """
    # Par statut
    status_result = await db.execute(
        select(Document.status, func.count(Document.id)).group_by(Document.status)
    )
    par_statut = {str(s): c for s, c in status_result.all()}

    # Par type de fichier
    type_result = await db.execute(
        select(Document.file_type, func.count(Document.id))
        .where(Document.file_type.isnot(None))
        .group_by(Document.file_type)
    )
    par_type_fichier = {str(t): c for t, c in type_result.all()}

    # Total
    total = (await db.execute(select(func.count(Document.id)))).scalar() or 0

    # Volume total (en Mo)
    volume_result = await db.execute(select(func.sum(Document.file_size)))
    volume_total = volume_result.scalar() or 0
    volume_total_mo = round(volume_total / (1024 * 1024), 2) if volume_total else 0.0

    return DocumentStats(
        par_statut=par_statut,
        par_type_fichier=par_type_fichier,
        total=total,
        volume_total_mo=volume_total_mo,
    )


@router.get("/performance", response_model=PerformanceMetrics, summary="Métriques de performance")
async def get_performance_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PerformanceMetrics:
    """
    Métriques de performance de l'administration.
    """
    now = datetime.now(timezone.utc)
    debut_mois = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Courriers traités ce mois
    courriers_traites = (
        await db.execute(
            select(func.count(Courrier.id)).where(
                Courrier.status == CourrierStatusEnum.TREATED,
                Courrier.updated_at >= debut_mois,
            )
        )
    ).scalar() or 0

    # Documents approuvés ce mois
    documents_approuves = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.status == DocumentStatusEnum.APPROVED,
                Document.updated_at >= debut_mois,
            )
        )
    ).scalar() or 0

    # Workflows complétés ce mois
    workflows_completes = (
        await db.execute(
            select(func.count(Workflow.id)).where(
                Workflow.status == WorkflowStatusEnum.COMPLETED,
                Workflow.updated_at >= debut_mois,
            )
        )
    ).scalar() or 0

    # Temps moyen de traitement (estimation)
    # On calcule la différence entre created_at et updated_at pour les courriers traités
    avg_result = await db.execute(
        select(
            func.avg(
                func.extract("epoch", Courrier.updated_at - Courrier.created_at) / 86400
            )
        ).where(Courrier.status == CourrierStatusEnum.TREATED)
    )
    temps_moyen = round(avg_result.scalar() or 0.0, 1)

    # Taux de résolution des documents
    total_docs = (await db.execute(select(func.count(Document.id)))).scalar() or 1
    docs_approuves_total = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.status == DocumentStatusEnum.APPROVED
            )
        )
    ).scalar() or 0
    taux_resolution = round((docs_approuves_total / total_docs) * 100, 1) if total_docs else 0.0

    return PerformanceMetrics(
        temps_moyen_traitement_courrier=temps_moyen,
        taux_resolution_documents=taux_resolution,
        courriers_traites_mois=courriers_traites,
        documents_approuves_mois=documents_approuves,
        workflows_completes_mois=workflows_completes,
    )
