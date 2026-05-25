"""
Routes d'audit - eAdministration Suite Guinea.
Journal de traçabilité des actions avec chaîne de hachage d'intégrité.
Endpoints:
  - GET /logs         : Journal paginé et filtrable (DIRECTEUR+)
  - GET /export       : Export CSV/PDF (ADMIN+)
  - GET /verify-integrity : Vérification chaîne de hachage (SUPER_ADMIN)
  - GET /stats        : Statistiques d'audit (ADMIN+)
  - GET /timeline     : Chronologie d'une ressource
"""

import csv
import io
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.middleware.rbac import require_permission, require_role
from app.models.audit import AuditLog
from app.models.user import RoleEnum, User
from app.services.audit_service import AuditService

router = APIRouter()


# --- Schémas Pydantic ---
class AuditLogResponse(BaseModel):
    """Réponse détaillée pour une entrée d'audit."""
    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    category: str | None
    resource_type: str
    resource_id: str
    resource_name: str | None
    description: str | None
    details: dict | None
    old_value: str | None
    new_value: str | None
    severity: str
    ip_address: str | None
    user_agent: str | None
    session_id: str | None
    device_fingerprint: str | None
    entry_hash: str | None
    previous_hash: str | None
    tenant_id: str | None
    institution_id: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditLogSummaryResponse(BaseModel):
    """Réponse résumée pour les listes d'audit."""
    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    category: str | None
    resource_type: str
    resource_id: str
    description: str | None
    severity: str
    ip_address: str | None
    tenant_id: str | None
    institution_id: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class PaginatedAuditLogs(BaseModel):
    """Réponse paginée pour les journaux d'audit."""
    items: list[AuditLogSummaryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuditStatsResponse(BaseModel):
    """Statistiques d'audit."""
    total_entries: int
    top_actions: list[dict]
    severity_stats: dict
    top_users: list[dict]
    top_resources: list[dict]
    since: str | None
    tenant_id: str | None


class IntegrityVerificationResponse(BaseModel):
    """Résultat de la vérification d'intégrité de la chaîne de hachage."""
    is_valid: bool
    total_entries: int
    verified_entries: int
    broken_at: str | None
    broken_reason: str | None
    verification_time_ms: int
    last_verified_hash: str | None
    checked_since: str | None
    tenant_id: str | None


class AuditTimelineEntry(BaseModel):
    """Entrée de la chronologie d'une ressource."""
    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    description: str | None
    details: dict | None
    old_value: str | None
    new_value: str | None
    severity: str
    ip_address: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}


# --- Endpoints ---

@router.get("/logs", response_model=PaginatedAuditLogs, summary="Journal d'audit")
async def list_audit_logs(
    page: int = Query(1, ge=1, description="Numéro de page"),
    page_size: int = Query(50, ge=1, le=200, description="Éléments par page"),
    action: str | None = Query(None, description="Filtrer par action"),
    category: str | None = Query(None, description="Filtrer par catégorie"),
    resource_type: str | None = Query(None, description="Filtrer par type de ressource"),
    resource_id: str | None = Query(None, description="Filtrer par ID de ressource"),
    user_id: uuid.UUID | None = Query(None, description="Filtrer par utilisateur"),
    severity: str | None = Query(None, description="Filtrer par sévérité (info, warning, critical)"),
    tenant_id: str | None = Query(None, description="Filtrer par tenant"),
    institution_id: str | None = Query(None, description="Filtrer par institution"),
    start_date: datetime | None = Query(None, description="Date de début"),
    end_date: datetime | None = Query(None, description="Date de fin"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedAuditLogs:
    """
    Liste paginée et filtrable des entrées du journal d'audit.
    Accessible aux DIRECTEUR et supérieurs.

    Filtres disponibles : action, catégorie, type de ressource, ID ressource,
    utilisateur, sévérité, tenant, institution, plage de dates.
    """
    # Vérification des permissions : DIRECTEUR+ uniquement
    if current_user.role.hierarchy_level() < 5:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux directeurs et supérieurs",
        )

    query = select(AuditLog)

    # Isolation tenant (sauf SUPER_ADMIN et MINISTRE)
    if current_user.role.hierarchy_level() < 6:
        user_tenant = current_user.tenant_id or settings.TENANT_DEFAULT_ID
        query = query.where(AuditLog.tenant_id == user_tenant)

    # Filtres
    if action:
        query = query.where(AuditLog.action == action.upper())
    if category:
        query = query.where(AuditLog.category == category)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if resource_id:
        query = query.where(AuditLog.resource_id == resource_id)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if severity:
        query = query.where(AuditLog.severity == severity)
    if tenant_id and current_user.role.hierarchy_level() >= 6:
        query = query.where(AuditLog.tenant_id == tenant_id)
    if institution_id:
        query = query.where(AuditLog.institution_id == institution_id)
    if start_date:
        query = query.where(AuditLog.timestamp >= start_date)
    if end_date:
        query = query.where(AuditLog.timestamp <= end_date)

    # Comptage
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Pagination (les plus récents en premier)
    offset = (page - 1) * page_size
    query = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size

    return PaginatedAuditLogs(
        items=logs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/logs/{log_id}", response_model=AuditLogResponse, summary="Détail d'une entrée d'audit")
async def get_audit_log(
    log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AuditLog:
    """
    Récupère le détail complet d'une entrée du journal d'audit,
    y compris les hashes d'intégrité et les valeurs avant/après.
    """
    # Vérification des permissions : DIRECTEUR+ uniquement
    if current_user.role.hierarchy_level() < 5:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux directeurs et supérieurs",
        )

    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    log = result.scalar_one_or_none()

    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrée d'audit non trouvée",
        )

    # Isolation tenant (sauf SUPER_ADMIN et MINISTRE)
    if current_user.role.hierarchy_level() < 6:
        user_tenant = current_user.tenant_id or settings.TENANT_DEFAULT_ID
        if log.tenant_id != user_tenant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès refusé: vous n'avez pas accès aux données de ce tenant.",
            )

    return log


@router.get("/export", summary="Export des journaux d'audit")
async def export_audit_logs(
    format: str = Query("csv", description="Format d'export: csv ou pdf"),
    action: str | None = Query(None, description="Filtrer par action"),
    category: str | None = Query(None, description="Filtrer par catégorie"),
    resource_type: str | None = Query(None, description="Filtrer par type de ressource"),
    severity: str | None = Query(None, description="Filtrer par sévérité"),
    start_date: datetime | None = Query(None, description="Date de début"),
    end_date: datetime | None = Query(None, description="Date de fin"),
    tenant_id: str | None = Query(None, description="Filtrer par tenant"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """
    Exporte les journaux d'audit au format CSV.
    Accessible aux ADMIN et supérieurs uniquement.

    Pour le format PDF, une implémentation complète nécessiterait
    une bibliothèque comme reportlab ou weasyprint.
    """
    # Vérification des permissions : ADMIN+ uniquement
    if current_user.role.hierarchy_level() < 3:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs et supérieurs",
        )

    # Journaliser l'export
    try:
        audit_service = AuditService(db)
        await audit_service.log_action(
            user_id=current_user.id,
            action="DATA_EXPORT",
            resource_type="audit",
            resource_id="export",
            category="admin",
            description=f"Export des journaux d'audit (format: {format})",
            details={
                "format": format,
                "filters": {
                    "action": action,
                    "category": category,
                    "resource_type": resource_type,
                    "severity": severity,
                    "start_date": start_date.isoformat() if start_date else None,
                    "end_date": end_date.isoformat() if end_date else None,
                },
            },
            severity="warning",
            tenant_id=current_user.tenant_id or settings.TENANT_DEFAULT_ID,
            institution_id=current_user.institution_id or "",
        )
    except Exception:
        pass

    # Construire la requête
    query = select(AuditLog)

    # Isolation tenant
    if current_user.role.hierarchy_level() < 6:
        user_tenant = current_user.tenant_id or settings.TENANT_DEFAULT_ID
        query = query.where(AuditLog.tenant_id == user_tenant)
    elif tenant_id:
        query = query.where(AuditLog.tenant_id == tenant_id)

    # Appliquer les filtres
    if action:
        query = query.where(AuditLog.action == action.upper())
    if category:
        query = query.where(AuditLog.category == category)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if severity:
        query = query.where(AuditLog.severity == severity)
    if start_date:
        query = query.where(AuditLog.timestamp >= start_date)
    if end_date:
        query = query.where(AuditLog.timestamp <= end_date)

    # Limiter à 10000 entrées pour l'export
    query = query.order_by(AuditLog.timestamp.desc()).limit(10000)

    result = await db.execute(query)
    logs = result.scalars().all()

    if format.lower() == "csv":
        # Générer le CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID", "Horodatage", "Utilisateur_ID", "Action", "Catégorie",
            "Type_Ressource", "Ressource_ID", "Description", "Sévérité",
            "IP", "Session_ID", "Tenant_ID", "Institution_ID",
            "Hash_Intégrité", "Hash_Précédent"
        ])
        for log in logs:
            writer.writerow([
                str(log.id),
                log.timestamp.isoformat() if log.timestamp else "",
                str(log.user_id) if log.user_id else "",
                log.action,
                log.category or "",
                log.resource_type,
                log.resource_id,
                log.description or "",
                log.severity,
                log.ip_address or "",
                log.session_id or "",
                log.tenant_id or "",
                log.institution_id or "",
                log.entry_hash or "",
                log.previous_hash or "",
            ])

        csv_content = output.getvalue()
        filename = f"audit_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
            },
        )
    else:
        # Pour le format PDF, retourner les données JSON en attendant
        # une implémentation complète avec reportlab/weasyprint
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="L'export PDF n'est pas encore implémenté. Utilisez le format CSV.",
        )


@router.get(
    "/verify-integrity",
    response_model=IntegrityVerificationResponse,
    summary="Vérification de l'intégrité de la chaîne de hachage",
)
async def verify_integrity(
    since: datetime | None = Query(None, description="Vérifier à partir de cette date"),
    tenant_id: str | None = Query(None, description="Filtrer par tenant"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IntegrityVerificationResponse:
    """
    Vérifie l'intégrité de la chaîne de hachage du journal d'audit.
    Chaque entrée d'audit contient un hash qui dépend de l'entrée précédente,
    créant une chaîne cryptographique inviolable.

    Accessible au SUPER_ADMIN uniquement — vérification de sécurité critique.

    Returns:
        Résultat de la vérification avec :
        - is_valid: True si la chaîne est intacte
        - total_entries: Nombre d'entrées vérifiées
        - broken_at: ID de la première entrée rompue (si applicable)
        - broken_reason: Raison de la rupture (si applicable)
    """
    # SUPER_ADMIN uniquement
    if current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vérification d'intégrité réservée au SUPER_ADMIN",
        )

    audit_service = AuditService(db)
    result = await audit_service.verify_chain_integrity(
        since=since,
        tenant_id=tenant_id,
    )

    # Journaliser la vérification d'intégrité
    try:
        await audit_service.log_action(
            user_id=current_user.id,
            action="CONFIG_CHANGE",
            resource_type="audit",
            resource_id="integrity-check",
            category="security",
            description=f"Vérification d'intégrité: {'VALIDE' if result['is_valid'] else 'ROMPUE'}",
            details={
                "is_valid": result["is_valid"],
                "total_entries": result["total_entries"],
                "verified_entries": result["verified_entries"],
                "broken_at": result["broken_at"],
                "verification_time_ms": result["verification_time_ms"],
            },
            severity="critical" if not result["is_valid"] else "info",
            tenant_id=current_user.tenant_id or settings.TENANT_DEFAULT_ID,
            institution_id=current_user.institution_id or "",
        )
    except Exception:
        pass

    return IntegrityVerificationResponse(**result)


@router.get(
    "/stats",
    response_model=AuditStatsResponse,
    summary="Statistiques d'audit",
)
async def get_audit_stats(
    since: datetime | None = Query(None, description="Statistiques à partir de cette date"),
    tenant_id: str | None = Query(None, description="Filtrer par tenant"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AuditStatsResponse:
    """
    Statistiques sur les entrées d'audit : actions les plus fréquentes,
    répartition par sévérité, utilisateurs les plus actifs, etc.

    Accessible aux ADMIN et supérieurs.
    """
    # ADMIN+ uniquement
    if current_user.role.hierarchy_level() < 3:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs et supérieurs",
        )

    # Isolation tenant (sauf SUPER_ADMIN et MINISTRE)
    effective_tenant = tenant_id
    if current_user.role.hierarchy_level() < 6:
        effective_tenant = current_user.tenant_id or settings.TENANT_DEFAULT_ID

    audit_service = AuditService(db)
    stats = await audit_service.get_stats(
        tenant_id=effective_tenant,
        since=since,
    )

    return AuditStatsResponse(**stats)


@router.get(
    "/timeline",
    summary="Chronologie d'une ressource",
)
async def get_resource_timeline(
    resource_type: str = Query(..., description="Type de la ressource"),
    resource_id: str = Query(..., description="Identifiant de la ressource"),
    tenant_id: str | None = Query(None, description="Filtrer par tenant"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AuditTimelineEntry]:
    """
    Récupère la chronologie complète des actions sur une ressource.
    Permet de tracer l'historique complet d'un document, courrier,
    workflow, etc.

    Accessible aux DIRECTEUR et supérieurs.
    """
    # DIRECTEUR+ uniquement
    if current_user.role.hierarchy_level() < 5:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux directeurs et supérieurs",
        )

    # Isolation tenant (sauf SUPER_ADMIN et MINISTRE)
    effective_tenant = tenant_id
    if current_user.role.hierarchy_level() < 6:
        effective_tenant = current_user.tenant_id or settings.TENANT_DEFAULT_ID

    audit_service = AuditService(db)
    timeline = await audit_service.get_timeline(
        resource_type=resource_type,
        resource_id=resource_id,
        tenant_id=effective_tenant,
    )

    return timeline
