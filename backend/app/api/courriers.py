"""
Routes de gestion des courriers - eAdministration Suite Guinea.
Courrier entrant et sortant avec circuit de validation.
"""

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.courrier import (
    Courrier,
    CourrierPriorityEnum,
    CourrierStatusEnum,
    CourrierTypeEnum,
)
from app.models.user import User

router = APIRouter()


# --- Schémas Pydantic ---
class CourrierCreate(BaseModel):
    subject: str
    type: CourrierTypeEnum
    priority: CourrierPriorityEnum = CourrierPriorityEnum.NORMAL
    sender: str
    recipient: str
    service_id: str | None = None
    workflow_id: uuid.UUID | None = None
    due_date: datetime | None = None


class CourrierUpdate(BaseModel):
    status: CourrierStatusEnum | None = None
    priority: CourrierPriorityEnum | None = None
    due_date: datetime | None = None


class CourrierResponse(BaseModel):
    id: uuid.UUID
    reference: str
    subject: str
    type: CourrierTypeEnum
    priority: CourrierPriorityEnum
    status: CourrierStatusEnum
    sender: str
    recipient: str
    service_id: str | None
    workflow_id: uuid.UUID | None
    due_date: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedCourriers(BaseModel):
    items: list[CourrierResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


def generate_reference(courrier_type: CourrierTypeEnum) -> str:
    """Génère une référence unique pour un courrier."""
    import random
    import string
    year = datetime.now().year
    prefix = "CE" if courrier_type == CourrierTypeEnum.ENTRANT else "CS"
    seq = "".join(random.choices(string.digits, k=6))
    return f"{prefix}-{year}-{seq}"


# --- Endpoints ---

@router.get("", response_model=PaginatedCourriers, summary="Liste des courriers")
async def list_courriers(
    page: int = Query(1, ge=1, description="Numéro de page"),
    page_size: int = Query(20, ge=1, le=100, description="Éléments par page"),
    type_filter: CourrierTypeEnum | None = Query(None, alias="type", description="Filtrer par type"),
    status_filter: CourrierStatusEnum | None = Query(None, alias="status", description="Filtrer par statut"),
    priority_filter: CourrierPriorityEnum | None = Query(None, alias="priority", description="Filtrer par priorité"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedCourriers:
    """
    Liste paginée des courriers avec filtres.
    """
    query = select(Courrier)

    if type_filter:
        query = query.where(Courrier.type == type_filter)
    if status_filter:
        query = query.where(Courrier.status == status_filter)
    if priority_filter:
        query = query.where(Courrier.priority == priority_filter)

    # Comptage
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Courrier.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    courriers = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size

    return PaginatedCourriers(
        items=courriers,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=CourrierResponse, status_code=status.HTTP_201_CREATED, summary="Créer un courrier")
async def create_courrier(
    courrier_data: CourrierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Courrier:
    """
    Enregistre un nouveau courrier (entrant ou sortant).
    """
    courrier = Courrier(
        reference=generate_reference(courrier_data.type),
        subject=courrier_data.subject,
        type=courrier_data.type,
        priority=courrier_data.priority,
        sender=courrier_data.sender,
        recipient=courrier_data.recipient,
        service_id=courrier_data.service_id,
        workflow_id=courrier_data.workflow_id,
        due_date=courrier_data.due_date,
    )
    db.add(courrier)
    await db.flush()
    await db.refresh(courrier)
    return courrier


@router.get("/{courrier_id}", response_model=CourrierResponse, summary="Détail d'un courrier")
async def get_courrier(
    courrier_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Courrier:
    """
    Récupère un courrier par son identifiant.
    """
    result = await db.execute(select(Courrier).where(Courrier.id == courrier_id))
    courrier = result.scalar_one_or_none()

    if not courrier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courrier non trouvé",
        )
    return courrier


@router.put("/{courrier_id}", response_model=CourrierResponse, summary="Mettre à jour un courrier")
async def update_courrier(
    courrier_id: uuid.UUID,
    courrier_data: CourrierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Courrier:
    """
    Met à jour le statut ou la priorité d'un courrier.
    """
    result = await db.execute(select(Courrier).where(Courrier.id == courrier_id))
    courrier = result.scalar_one_or_none()

    if not courrier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courrier non trouvé",
        )

    update_data = courrier_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(courrier, field, value)

    await db.flush()
    await db.refresh(courrier)
    return courrier
