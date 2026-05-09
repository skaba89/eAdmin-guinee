"""
Routes de gestion des workflows - eAdministration Suite Guinea.
Circuits de validation et de traitement.
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
from app.models.user import User
from app.models.workflow import (
    Workflow,
    WorkflowStep,
    WorkflowStepStatusEnum,
    WorkflowStatusEnum,
)

router = APIRouter()


# --- Schémas Pydantic ---
class StepCreate(BaseModel):
    name: str
    assignee_id: uuid.UUID | None = None
    order: int


class WorkflowCreate(BaseModel):
    name: str
    description: str | None = None
    steps: list[StepCreate]
    institution_id: str | None = None


class StepResponse(BaseModel):
    id: uuid.UUID
    name: str
    assignee_id: uuid.UUID | None
    order: int
    status: WorkflowStepStatusEnum
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class WorkflowResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    status: WorkflowStatusEnum
    current_step: int
    steps: dict[str, Any] | None
    created_by: uuid.UUID
    institution_id: str | None
    created_at: datetime
    updated_at: datetime
    steps_rel: list[StepResponse] = []

    model_config = {"from_attributes": True}


class WorkflowListResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    status: WorkflowStatusEnum
    current_step: int
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedWorkflows(BaseModel):
    items: list[WorkflowListResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdvanceStepRequest(BaseModel):
    comment: str | None = None
    action: WorkflowStepStatusEnum = WorkflowStepStatusEnum.COMPLETED


# --- Endpoints ---

@router.get("", response_model=PaginatedWorkflows, summary="Liste des workflows")
async def list_workflows(
    page: int = Query(1, ge=1, description="Numéro de page"),
    page_size: int = Query(20, ge=1, le=100, description="Éléments par page"),
    status_filter: WorkflowStatusEnum | None = Query(None, alias="status", description="Filtrer par statut"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedWorkflows:
    """
    Liste paginée des circuits de validation.
    """
    query = select(Workflow)

    if status_filter:
        query = query.where(Workflow.status == status_filter)

    # Comptage
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Workflow.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    workflows = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size

    return PaginatedWorkflows(
        items=workflows,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED, summary="Créer un workflow")
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Workflow:
    """
    Crée un nouveau circuit de validation avec ses étapes.
    """
    workflow = Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        status=WorkflowStatusEnum.ACTIVE,
        current_step=0,
        steps={"total": len(workflow_data.steps)},
        created_by=current_user.id,
        institution_id=workflow_data.institution_id or current_user.institution,
    )
    db.add(workflow)
    await db.flush()

    # Créer les étapes
    for step_data in workflow_data.steps:
        step = WorkflowStep(
            workflow_id=workflow.id,
            name=step_data.name,
            assignee_id=step_data.assignee_id,
            order=step_data.order,
            status=WorkflowStepStatusEnum.PENDING,
        )
        db.add(step)

    # Marquer la première étape en cours
    await db.flush()
    first_step_result = await db.execute(
        select(WorkflowStep)
        .where(WorkflowStep.workflow_id == workflow.id)
        .order_by(WorkflowStep.order)
        .limit(1)
    )
    first_step = first_step_result.scalar_one_or_none()
    if first_step:
        first_step.status = WorkflowStepStatusEnum.IN_PROGRESS

    await db.flush()
    await db.refresh(workflow)
    return workflow


@router.get("/{workflow_id}", response_model=WorkflowResponse, summary="Détail d'un workflow")
async def get_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Workflow:
    """
    Récupère un workflow avec toutes ses étapes.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow non trouvé",
        )
    return workflow


@router.post("/{workflow_id}/advance", response_model=WorkflowResponse, summary="Avancer le workflow")
async def advance_workflow(
    workflow_id: uuid.UUID,
    advance_data: AdvanceStepRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Workflow:
    """
    Avance le workflow à l'étape suivante.
    Marque l'étape courante comme complétée et active la suivante.
    """
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow non trouvé",
        )

    if workflow.status in (WorkflowStatusEnum.COMPLETED, WorkflowStatusEnum.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce workflow est déjà terminé ou annulé",
        )

    # Récupérer l'étape courante
    steps_result = await db.execute(
        select(WorkflowStep)
        .where(WorkflowStep.workflow_id == workflow.id)
        .order_by(WorkflowStep.order)
    )
    steps = list(steps_result.scalars().all())

    if not steps:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce workflow ne contient aucune étape",
        )

    current_idx = workflow.current_step
    if current_idx >= len(steps):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Toutes les étapes ont déjà été traitées",
        )

    # Terminer l'étape courante
    from datetime import timezone
    current_step = steps[current_idx]
    current_step.status = advance_data.action
    current_step.completed_at = datetime.now(timezone.utc)

    # Passer à l'étape suivante
    next_idx = current_idx + 1
    if next_idx < len(steps):
        workflow.current_step = next_idx
        steps[next_idx].status = WorkflowStepStatusEnum.IN_PROGRESS
    else:
        # Workflow terminé
        workflow.status = WorkflowStatusEnum.COMPLETED
        workflow.current_step = next_idx

    await db.flush()
    await db.refresh(workflow)
    return workflow
