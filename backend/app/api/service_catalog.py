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
from app.models.institution import Institution
from app.models.institution_service_assignment import InstitutionServiceAssignment
from app.models.user import RoleEnum, User
from app.services.institution_scope import institution_descendant_ids_query
from app.services.service_catalog import (
    get_active_service,
    list_active_services,
    serialize_service,
)
from app.services.service_document_templates import (
    document_template_fingerprint,
    validate_document_template,
)

router = APIRouter()
public_router = APIRouter()


class ServiceAssignmentUpsert(BaseModel):
    service_institution_id: str = Field(min_length=1, max_length=100)
    is_active: bool = True


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

    document_template_status: Literal["not_configured", "draft", "approved"] = "not_configured"
    document_template_title: str | None = Field(default=None, max_length=500)
    document_template_body: str | None = Field(default=None, max_length=20_000)
    document_template_source_reference: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_governed_version(self):
        if self.policy_status == "approved" and not self.source_reference:
            raise ValueError("Une politique approuvée doit référencer sa source officielle.")

        template_values = (self.document_template_title, self.document_template_body)
        if self.document_template_status == "not_configured":
            if any(value for value in template_values) or self.document_template_source_reference:
                raise ValueError(
                    "Un modèle non configuré ne doit pas contenir de contenu documentaire."
                )
            return self

        if not self.document_template_title or not self.document_template_body:
            raise ValueError("Un modèle documentaire doit contenir un titre et un corps.")
        if self.document_template_status == "approved" and not self.document_template_source_reference:
            raise ValueError(
                "Un modèle documentaire approuvé doit référencer sa source institutionnelle."
            )
        try:
            validate_document_template(
                self.document_template_title,
                self.document_template_body,
            )
        except ValueError as exc:
            raise ValueError(str(exc)) from exc
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
    institution_id: str | None = None,
    service_institution_id: str | None = None,
) -> dict:
    items = await list_active_services(
        db,
        tenant_id,
        category_id=category_id,
        search=search,
        institution_id=institution_id,
        service_institution_id=service_institution_id,
    )
    return {"items": [serialize_service(item) for item in items]}


@public_router.get("", summary="Catalogue public actif des démarches administratives")
async def public_service_catalog(
    category_id: str | None = Query(None, max_length=100),
    search: str | None = Query(None, max_length=100),
    institution_id: str | None = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(set_public_catalog_context),
) -> dict:
    return await _catalog_response(
        db,
        tenant_id,
        category_id=category_id,
        search=search,
        institution_id=institution_id,
    )


@router.get("", summary="Catalogue actif des démarches administratives")
async def list_service_catalog(
    category_id: str | None = Query(None, max_length=100),
    search: str | None = Query(None, max_length=100),
    institution_id: str | None = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID
    service_institution_id = None
    effective_institution_id = institution_id

    if current_user.role in (RoleEnum.MAIRIE, RoleEnum.ADMIN, RoleEnum.AGENCE):
        if not current_user.institution_id:
            raise HTTPException(status_code=403, detail="Périmètre institutionnel absent.")
        if institution_id and institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Catalogue hors de votre mairie interdit.")
        effective_institution_id = current_user.institution_id
    elif current_user.role in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE):
        if not current_user.institution_id:
            raise HTTPException(status_code=403, detail="Service de rattachement absent.")
        effective_institution_id = None
        service_institution_id = current_user.institution_id

    return await _catalog_response(
        db,
        tenant_id,
        category_id=category_id,
        search=search,
        institution_id=effective_institution_id,
        service_institution_id=service_institution_id,
    )


@router.get("/assignments", summary="Routages mairie vers services internes")
async def list_service_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID
    query = select(InstitutionServiceAssignment).where(
        InstitutionServiceAssignment.tenant_id == tenant_id
    )
    if current_user.role in (RoleEnum.MAIRIE, RoleEnum.ADMIN, RoleEnum.AGENCE):
        if not current_user.institution_id:
            raise HTTPException(status_code=403, detail="Périmètre institutionnel absent.")
        query = query.where(
            InstitutionServiceAssignment.institution_id == current_user.institution_id
        )
    elif current_user.role in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE):
        if not current_user.institution_id:
            raise HTTPException(status_code=403, detail="Service de rattachement absent.")
        query = query.where(
            InstitutionServiceAssignment.service_institution_id == current_user.institution_id
        )
    elif current_user.role not in (RoleEnum.SUPER_ADMIN, RoleEnum.MINISTRE, RoleEnum.DIRECTEUR):
        raise HTTPException(status_code=403, detail="Accès aux routages interdit.")

    items = (await db.execute(query.order_by(InstitutionServiceAssignment.service_id))).scalars().all()
    return {
        "items": [
            {
                "id": str(item.id),
                "institutionId": item.institution_id,
                "serviceId": item.service_id,
                "serviceInstitutionId": item.service_institution_id,
                "isActive": item.is_active,
            }
            for item in items
        ]
    }


@router.put(
    "/assignments/{institution_id}/{service_id}",
    summary="Affecter une démarche à un service interne de mairie",
)
async def upsert_service_assignment(
    institution_id: str,
    service_id: str,
    payload: ServiceAssignmentUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID
    if current_user.role != RoleEnum.SUPER_ADMIN:
        if current_user.role not in (RoleEnum.MAIRIE, RoleEnum.ADMIN):
            raise HTTPException(status_code=403, detail="Affectation réservée à la mairie administratrice.")
        if current_user.institution_id != institution_id:
            raise HTTPException(status_code=403, detail="Affectation inter-mairie interdite.")

    mairie = await db.scalar(
        select(Institution).where(
            Institution.id == institution_id,
            Institution.tenant_id == tenant_id,
            Institution.is_active.is_(True),
        )
    )
    if not mairie or mairie.type.lower() != "mairie":
        raise HTTPException(status_code=422, detail="Mairie cible inconnue ou inactive.")

    catalog_service = await get_active_service(db, tenant_id, service_id)
    if not catalog_service:
        raise HTTPException(status_code=422, detail="Démarche active inconnue.")

    processing_service = await db.scalar(
        select(Institution).where(
            Institution.id == payload.service_institution_id,
            Institution.tenant_id == tenant_id,
            Institution.is_active.is_(True),
            Institution.type == "service",
            Institution.id.in_(
                institution_descendant_ids_query(
                    tenant_id=tenant_id,
                    root_institution_id=mairie.id,
                    name="catalog_assignment_scope",
                )
            ),
        )
    )
    if not processing_service:
        raise HTTPException(
            status_code=422,
            detail="Le service de traitement doit être un service actif de cette mairie.",
        )

    assignment = await db.scalar(
        select(InstitutionServiceAssignment).where(
            InstitutionServiceAssignment.tenant_id == tenant_id,
            InstitutionServiceAssignment.institution_id == mairie.id,
            InstitutionServiceAssignment.service_id == catalog_service.service_id,
        )
    )
    if assignment is None:
        assignment = InstitutionServiceAssignment(
            tenant_id=tenant_id,
            institution_id=mairie.id,
            service_id=catalog_service.service_id,
            service_institution_id=processing_service.id,
            is_active=payload.is_active,
            created_by=current_user.id,
        )
        db.add(assignment)
    else:
        assignment.service_institution_id = processing_service.id
        assignment.is_active = payload.is_active

    await db.flush()
    return {
        "id": str(assignment.id),
        "institutionId": assignment.institution_id,
        "serviceId": assignment.service_id,
        "serviceInstitutionId": assignment.service_institution_id,
        "isActive": assignment.is_active,
    }


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

    template_hash = None
    if payload.document_template_title and payload.document_template_body:
        template_hash = document_template_fingerprint(
            payload.document_template_title,
            payload.document_template_body,
        )

    template_is_approved = payload.document_template_status == "approved"
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
        document_template_status=payload.document_template_status,
        document_template_title=payload.document_template_title,
        document_template_body=payload.document_template_body,
        document_template_source_reference=payload.document_template_source_reference,
        document_template_hash=template_hash,
        document_template_approved_by=current_user.id if template_is_approved else None,
        document_template_approved_at=now if template_is_approved else None,
        effective_from=now,
        is_active=True,
        created_by=current_user.id,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return serialize_service(item)
