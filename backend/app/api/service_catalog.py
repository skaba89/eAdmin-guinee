"""Versioned administrative-service catalog API.

Citizens and staff can read the active catalog for their tenant. Only ADMIN and
SUPER_ADMIN can publish a new version. Historical versions are never edited in
place: publishing closes the currently active version and inserts a successor.
"""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.administrative_service import AdministrativeService
from app.models.user import RoleEnum, User
from app.services.service_catalog import serialize_service

router = APIRouter()


class ServiceVersionCreate(BaseModel):
    category_id: str = Field(min_length=1, max_length=100)
    category_name: str = Field(min_length=1, max_length=150)
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=5000)
    fee_label: str = Field(default="Gratuit", min_length=1, max_length=100)
    expected_processing_label: str = Field(default="", max_length=100)
    sla_business_days: int = Field(ge=1, le=365)
    required_documents: list[str] = Field(default_factory=list, max_length=50)
    routing_terms: list[str] = Field(default_factory=list, max_length=20)
    policy_status: Literal["operational_default", "approved"] = "operational_default"
    source_reference: str | None = Field(default=None, max_length=500)
    source_url: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def approved_policy_requires_source(self):
        if self.policy_status == "approved" and not self.source_reference:
            raise ValueError("Une politique approuvée doit référencer sa source officielle.")
        return self


@router.get("", summary="Catalogue actif des démarches administratives")
async def list_service_catalog(
    category_id: str | None = Query(None, max_length=100),
    search: str | None = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID
    now = datetime.now(timezone.utc)
    query = select(AdministrativeService).where(
        AdministrativeService.tenant_id == tenant_id,
        AdministrativeService.is_active.is_(True),
        AdministrativeService.effective_from <= now,
        or_(
            AdministrativeService.effective_to.is_(None),
            AdministrativeService.effective_to > now,
        ),
    )
    if category_id:
        query = query.where(AdministrativeService.category_id == category_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                AdministrativeService.name.ilike(term),
                AdministrativeService.description.ilike(term),
                AdministrativeService.service_id.ilike(term),
            )
        )

    items = (
        await db.execute(
            query.order_by(
                AdministrativeService.category_name,
                AdministrativeService.name,
                AdministrativeService.version.desc(),
            )
        )
    ).scalars().all()
    return {"items": [serialize_service(item) for item in items]}


@router.get("/{service_id}/history", summary="Historique des versions d'une démarche")
async def service_history(
    service_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if current_user.role not in (RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Historique réservé aux administrateurs.")

    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID
    items = (
        await db.execute(
            select(AdministrativeService)
            .where(
                AdministrativeService.tenant_id == tenant_id,
                AdministrativeService.service_id == service_id,
            )
            .order_by(AdministrativeService.version.desc())
        )
    ).scalars().all()
    return {"items": [serialize_service(item) for item in items]}


@router.post(
    "/{service_id}/versions",
    status_code=status.HTTP_201_CREATED,
    summary="Publier une nouvelle version de démarche",
)
async def publish_service_version(
    service_id: str,
    payload: ServiceVersionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if current_user.role not in (RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Publication réservée aux administrateurs.")

    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID
    now = datetime.now(timezone.utc)

    existing = (
        await db.execute(
            select(AdministrativeService)
            .where(
                AdministrativeService.tenant_id == tenant_id,
                AdministrativeService.service_id == service_id,
            )
            .order_by(AdministrativeService.version.desc())
        )
    ).scalars().all()

    new_version = (existing[0].version + 1) if existing else 1
    for current in existing:
        if current.is_active and current.effective_to is None:
            current.is_active = False
            current.effective_to = now

    item = AdministrativeService(
        tenant_id=tenant_id,
        service_id=service_id,
        version=new_version,
        category_id=payload.category_id,
        category_name=payload.category_name,
        name=payload.name,
        description=payload.description,
        fee_label=payload.fee_label,
        expected_processing_label=payload.expected_processing_label,
        sla_business_days=payload.sla_business_days,
        required_documents=payload.required_documents,
        routing_terms=payload.routing_terms,
        policy_status=payload.policy_status,
        source_reference=payload.source_reference,
        source_url=payload.source_url,
        effective_from=now,
        is_active=True,
        created_by=current_user.id,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return serialize_service(item)
