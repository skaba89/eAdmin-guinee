"""
Routes d'audit - eAdministration Suite Guinea.
Journal de traçabilité des actions.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import RoleEnum, User

router = APIRouter()


# --- Schémas Pydantic ---
class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    resource_type: str
    resource_id: str
    details: dict | None
    ip_address: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class PaginatedAuditLogs(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Endpoints ---

@router.get("/logs", response_model=PaginatedAuditLogs, summary="Journal d'audit")
async def list_audit_logs(
    page: int = Query(1, ge=1, description="Numéro de page"),
    page_size: int = Query(50, ge=1, le=200, description="Éléments par page"),
    action: str | None = Query(None, description="Filtrer par action"),
    resource_type: str | None = Query(None, description="Filtrer par type de ressource"),
    user_id: uuid.UUID | None = Query(None, description="Filtrer par utilisateur"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedAuditLogs:
    """
    Liste paginée des entrées du journal d'audit.
    Accessible uniquement aux administrateurs et directeurs.
    """
    # Vérification des permissions
    if current_user.role not in (
        RoleEnum.SUPER_ADMIN,
        RoleEnum.ADMIN,
        RoleEnum.DIRECTOR,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs et directeurs",
        )

    query = select(AuditLog)

    # Filtres
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)

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
    Récupère le détail d'une entrée du journal d'audit.
    """
    # Vérification des permissions
    if current_user.role not in (
        RoleEnum.SUPER_ADMIN,
        RoleEnum.ADMIN,
        RoleEnum.DIRECTOR,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs et directeurs",
        )

    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    log = result.scalar_one_or_none()

    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrée d'audit non trouvée",
        )
    return log
