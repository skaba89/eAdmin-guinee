"""Versioned administrative-service catalog API.

The active catalog is public administrative information, while version history
and publication remain authenticated governance operations. Public reads still
install a tenant-scoped PostgreSQL RLS context derived from the trusted host
resolution; production callers cannot switch tenant scope with request headers.
"""

from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import current_rls_scope, get_db
from app.models.administrative_service import AdministrativeService
from app.models.user import RoleEnum, User
from app.services.service_catalog import list_active_services, serialize_service

router = APIRouter()
public_router = APIRouter()


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


async def set_public_catalog_context(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AsyncGenerator[str, None]:
    """Install a read-only tenant RLS scope for the unauthenticated catalog.

    Tenant headers are intentionally rejected outside development because the
    public surface must be routed by trusted deployment host/domain context,
    not by an arbitrary browser-provided tenant identifier.
    """
    if not settings.is_development and (
        request.headers.get("X-Tenant-ID") or request.headers.get("X-Institution-ID")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les en-têtes de périmètre ne sont pas autorisés sur le catalogue public.",
        )

    tenant_id = getattr(request.state, "tenant_id", None) or settings.TENANT_DEFAULT_ID
    scope = {
        "user_id": "",
        "tenant_id": tenant_id,
        "institution_id": "",
        "role": "PUBLIC",
        "is_super_admin": False,
    }
    db.sync_session.info["rls_scope"] = scope
    context_token = current_rls_scope.set(scope)

    try:
        bind = db.get_bind()
        dialect_name = bind.dialect.name if bind is not None else "unknown"
        if dialect_name == "postgresql":
            await db.execute(
                text(
                    """
                    SELECT
                        set_config('app.current_user_id', '', true),
                        set_config('app.current_tenant_id', :tenant_id, true),
                        set_config('app.current_institution_id', '', true),
                        set_config('app.current_role', 'PUBLIC', true)
                    """
                ),
                {"tenant_id": tenant_id},
            )
        elif not settings.is_test:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Le catalogue public nécessite le contexte de sécurité PostgreSQL.",
            )

        yield tenant_id
    finally:
        current_rls_scope.reset(context_token)
        db.sync_session.info.pop("rls_scope", None)


async def _catalog_response(
    db: AsyncSession,
    tenant_id: str,
    *,
    category_id: str | None = None,
    search: str | None = None,
) -> dict:
    items = await list_active_services(
        db,
        tenant_id,
        category_id=category_id,
        search=search,
    )
    return {"items": [serialize_service(item) for item in items]}


@public_router.get("", summary="Catalogue public actif des démarches administratives")
async def public_service_catalog(
    category_id: str | None = Query(None, max_length=100),
    search: str | None = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(set_public_catalog_context),
) -> dict:
    return await _catalog_response(
        db,
        tenant_id,
        category_id=category_id,
        search=search,
    )


@router.get("", summary="Catalogue actif des démarches administratives")
async def list_service_catalog(
    category_id: str | None = Query(None, max_length=100),
    search: str | None = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID
    return await _catalog_response(
        db,
        tenant_id,
        category_id=category_id,
        search=search,
    )


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
