from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(rel: str, old: str, new: str) -> None:
    path = ROOT / rel
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"anchor not found in {rel}: {old[:120]!r}")
    if text.count(old) != 1:
        raise RuntimeError(f"anchor not unique in {rel}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def write(rel: str, content: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


# ---------------------------------------------------------------------------
# ORM: explicit municipality -> catalog service -> processing service mapping.
# ---------------------------------------------------------------------------
write(
    "backend/app/models/institution_service_assignment.py",
    '''"""Municipality-owned routing of catalog services to internal service units."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class InstitutionServiceAssignment(Base):
    """Bind one logical catalog service to one municipality and processing unit.

    ``institution_id`` is the citizen-facing mairie. ``service_institution_id``
    is the internal child service whose team processes the dossier. The mapping
    uses the logical service id so publishing a new catalog version does not
    silently break municipal routing.
    """

    __tablename__ = "institution_service_assignments"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "institution_id",
            "service_id",
            name="uq_institution_service_assignment",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    institution_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    service_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    service_institution_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
''',
)

replace_once(
    "backend/app/models/__init__.py",
    "from app.models.institution import Institution\n",
    "from app.models.institution import Institution\nfrom app.models.institution_service_assignment import InstitutionServiceAssignment\n",
)
replace_once(
    "backend/app/models/__init__.py",
    '    "Institution",\n',
    '    "Institution",\n    "InstitutionServiceAssignment",\n',
)

replace_once(
    "backend/app/models/service_request.py",
    '    institution_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)\n',
    '''    # Citizen-facing destination (typically the mairie root).\n    institution_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)\n    # Internal processing unit. New municipal requests always populate this\n    # from a server-governed InstitutionServiceAssignment. Historical rows may\n    # remain NULL and keep their previous exact-institution behavior.\n    service_institution_id: Mapped[str | None] = mapped_column(\n        String(100), ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True\n    )\n''',
)

# ---------------------------------------------------------------------------
# Catalog service helpers.
# ---------------------------------------------------------------------------
replace_once(
    "backend/app/services/service_catalog.py",
    "from sqlalchemy import or_, select\n",
    "from sqlalchemy import and_, or_, select\n",
)
replace_once(
    "backend/app/services/service_catalog.py",
    "from app.models.administrative_service import AdministrativeService\n",
    "from app.models.administrative_service import AdministrativeService\nfrom app.models.institution_service_assignment import InstitutionServiceAssignment\n",
)
replace_once(
    "backend/app/services/service_catalog.py",
    '''async def get_service_version(\n    db: AsyncSession,\n    tenant_id: str,\n    service_id: str,\n    version: int,\n) -> AdministrativeService | None:\n''',
    '''async def get_active_service_assignment(\n    db: AsyncSession,\n    tenant_id: str,\n    institution_id: str,\n    service_id: str,\n) -> InstitutionServiceAssignment | None:\n    """Resolve the active server-governed municipal routing for a service."""\n    query = select(InstitutionServiceAssignment).where(\n        InstitutionServiceAssignment.tenant_id == tenant_id,\n        InstitutionServiceAssignment.institution_id == institution_id,\n        InstitutionServiceAssignment.service_id == service_id,\n        InstitutionServiceAssignment.is_active.is_(True),\n    )\n    return (await db.execute(query)).scalar_one_or_none()\n\n\nasync def get_service_version(\n    db: AsyncSession,\n    tenant_id: str,\n    service_id: str,\n    version: int,\n) -> AdministrativeService | None:\n''',
)
replace_once(
    "backend/app/services/service_catalog.py",
    '''    category_id: str | None = None,\n    search: str | None = None,\n    at: datetime | None = None,\n) -> list[AdministrativeService]:\n    """Return active catalog rows for one trusted tenant scope."""\n    effective_at = at or datetime.now(timezone.utc)\n    query = _effective_catalog_query(tenant_id, effective_at)\n\n''',
    '''    category_id: str | None = None,\n    search: str | None = None,\n    institution_id: str | None = None,\n    service_institution_id: str | None = None,\n    at: datetime | None = None,\n) -> list[AdministrativeService]:\n    """Return active catalog rows for one trusted tenant/institution scope."""\n    effective_at = at or datetime.now(timezone.utc)\n    query = _effective_catalog_query(tenant_id, effective_at)\n\n    if institution_id or service_institution_id:\n        query = query.join(\n            InstitutionServiceAssignment,\n            and_(\n                InstitutionServiceAssignment.tenant_id == AdministrativeService.tenant_id,\n                InstitutionServiceAssignment.service_id == AdministrativeService.service_id,\n                InstitutionServiceAssignment.is_active.is_(True),\n            ),\n        )\n        if institution_id:\n            query = query.where(InstitutionServiceAssignment.institution_id == institution_id)\n        if service_institution_id:\n            query = query.where(\n                InstitutionServiceAssignment.service_institution_id == service_institution_id\n            )\n\n''',
)

# ---------------------------------------------------------------------------
# Service request routing and visibility.
# ---------------------------------------------------------------------------
replace_once(
    "backend/app/api/service_requests.py",
    "from sqlalchemy import func, select, text\n",
    "from sqlalchemy import and_, func, or_, select, text\n",
)
replace_once(
    "backend/app/api/service_requests.py",
    "from app.services.service_catalog import get_active_service, get_service_version\n",
    "from app.services.service_catalog import (\n    get_active_service,\n    get_active_service_assignment,\n    get_service_version,\n)\n",
)
replace_once(
    "backend/app/api/service_requests.py",
    '''    - operational staff (including mairie admins): their institution only;\n    - CITOYEN: only requests they personally own.\n''',
    '''    - MAIRIE/ADMIN/AGENCE: requests addressed to their institution only;\n    - AGENT/CHEF_SERVICE: requests routed to their internal service only;\n    - CITOYEN: only requests they personally own.\n''',
)
replace_once(
    "backend/app/api/service_requests.py",
    '''    if current_user.role == RoleEnum.DIRECTEUR:\n        return scoped.where(\n            ServiceRequest.institution_id.in_(\n                institution_descendant_ids_query(\n                    tenant_id=tenant_id,\n                    root_institution_id=institution_id,\n                    name="director_request_scope",\n                )\n            )\n        )\n\n    return scoped.where(ServiceRequest.institution_id == institution_id)\n''',
    '''    if current_user.role == RoleEnum.DIRECTEUR:\n        return scoped.where(\n            ServiceRequest.institution_id.in_(\n                institution_descendant_ids_query(\n                    tenant_id=tenant_id,\n                    root_institution_id=institution_id,\n                    name="director_request_scope",\n                )\n            )\n        )\n\n    if current_user.role in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE):\n        return scoped.where(\n            or_(\n                ServiceRequest.service_institution_id == institution_id,\n                and_(\n                    ServiceRequest.service_institution_id.is_(None),\n                    ServiceRequest.institution_id == institution_id,\n                ),\n            )\n        )\n\n    return scoped.where(ServiceRequest.institution_id == institution_id)\n''',
)
replace_once(
    "backend/app/api/service_requests.py",
    '        "institutionId": item.institution_id,\n',
    '        "institutionId": item.institution_id,\n        "serviceInstitutionId": item.service_institution_id,\n',
)
replace_once(
    "backend/app/api/service_requests.py",
    '''    if not institution:\n        raise HTTPException(status_code=400, detail="Institution cible invalide ou inactive.")\n\n    if current_user.role not in (RoleEnum.CITOYEN, RoleEnum.SUPER_ADMIN):\n''',
    '''    if not institution:\n        raise HTTPException(status_code=400, detail="Institution cible invalide ou inactive.")\n    if institution.type.lower() != "mairie":\n        raise HTTPException(\n            status_code=400,\n            detail="Une demande citoyenne municipale doit cibler une mairie active.",\n        )\n\n    assignment = await get_active_service_assignment(\n        db, tenant_id, institution.id, catalog_service.service_id\n    )\n    if not assignment:\n        raise HTTPException(\n            status_code=400,\n            detail="Cette démarche n'est pas proposée par la mairie sélectionnée.",\n        )\n\n    processing_service = await db.scalar(\n        select(Institution).where(\n            Institution.id == assignment.service_institution_id,\n            Institution.tenant_id == tenant_id,\n            Institution.is_active.is_(True),\n            Institution.type == "service",\n            Institution.id.in_(\n                institution_descendant_ids_query(\n                    tenant_id=tenant_id,\n                    root_institution_id=institution.id,\n                    name="request_processing_service_scope",\n                )\n            ),\n        )\n    )\n    if not processing_service:\n        raise HTTPException(\n            status_code=409,\n            detail="Le routage interne de cette démarche est invalide ou inactif.",\n        )\n\n    if current_user.role not in (RoleEnum.CITOYEN, RoleEnum.SUPER_ADMIN):\n''',
)
replace_once(
    "backend/app/api/service_requests.py",
    '''        assigned_service=institution.name,\n        timeline=_default_timeline(),\n''',
    '''        assigned_service=processing_service.name,\n        timeline=_default_timeline(),\n''',
)
replace_once(
    "backend/app/api/service_requests.py",
    '''        tenant_id=tenant_id,\n        institution_id=institution.id,\n    )\n''',
    '''        tenant_id=tenant_id,\n        institution_id=institution.id,\n        service_institution_id=processing_service.id,\n    )\n''',
)
replace_once(
    "backend/app/api/service_requests.py",
    '''        f"Demande soumise. Référence officielle : {item.reference}. Institution : {institution.name}.",\n''',
    '''        (\n            f"Demande soumise. Référence officielle : {item.reference}. "\n            f"Mairie : {institution.name}. Service compétent : {processing_service.name}."\n        ),\n''',
)

# ---------------------------------------------------------------------------
# Catalog API: municipal filtering and governed assignment management.
# ---------------------------------------------------------------------------
replace_once(
    "backend/app/api/service_catalog.py",
    "from app.models.administrative_service import AdministrativeService\n",
    "from app.models.administrative_service import AdministrativeService\nfrom app.models.institution import Institution\nfrom app.models.institution_service_assignment import InstitutionServiceAssignment\n",
)
replace_once(
    "backend/app/api/service_catalog.py",
    "from app.services.service_catalog import list_active_services, serialize_service\n",
    "from app.services.institution_scope import institution_descendant_ids_query\nfrom app.services.service_catalog import (\n    get_active_service,\n    list_active_services,\n    serialize_service,\n)\n",
)
replace_once(
    "backend/app/api/service_catalog.py",
    '''class ServiceVersionCreate(BaseModel):\n''',
    '''class ServiceAssignmentUpsert(BaseModel):\n    service_institution_id: str = Field(min_length=1, max_length=100)\n    is_active: bool = True\n\n\nclass ServiceVersionCreate(BaseModel):\n''',
)
replace_once(
    "backend/app/api/service_catalog.py",
    '''    category_id: str | None = None,\n    search: str | None = None,\n) -> dict:\n''',
    '''    category_id: str | None = None,\n    search: str | None = None,\n    institution_id: str | None = None,\n    service_institution_id: str | None = None,\n) -> dict:\n''',
)
replace_once(
    "backend/app/api/service_catalog.py",
    '''        category_id=category_id,\n        search=search,\n    )\n''',
    '''        category_id=category_id,\n        search=search,\n        institution_id=institution_id,\n        service_institution_id=service_institution_id,\n    )\n''',
)
replace_once(
    "backend/app/api/service_catalog.py",
    '''async def public_service_catalog(\n    category_id: str | None = Query(None, max_length=100),\n    search: str | None = Query(None, max_length=100),\n''',
    '''async def public_service_catalog(\n    category_id: str | None = Query(None, max_length=100),\n    search: str | None = Query(None, max_length=100),\n    institution_id: str | None = Query(None, max_length=100),\n''',
)
replace_once(
    "backend/app/api/service_catalog.py",
    '''        category_id=category_id,\n        search=search,\n    )\n\n\n@router.get("", summary="Catalogue actif des démarches administratives")\n''',
    '''        category_id=category_id,\n        search=search,\n        institution_id=institution_id,\n    )\n\n\n@router.get("", summary="Catalogue actif des démarches administratives")\n''',
)
replace_once(
    "backend/app/api/service_catalog.py",
    '''async def list_service_catalog(\n    category_id: str | None = Query(None, max_length=100),\n    search: str | None = Query(None, max_length=100),\n''',
    '''async def list_service_catalog(\n    category_id: str | None = Query(None, max_length=100),\n    search: str | None = Query(None, max_length=100),\n    institution_id: str | None = Query(None, max_length=100),\n''',
)
replace_once(
    "backend/app/api/service_catalog.py",
    '''    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID\n    return await _catalog_response(\n        db,\n        tenant_id,\n        category_id=category_id,\n        search=search,\n    )\n\n\n@router.get("/{service_id}/history", summary="Historique des versions d'une démarche")\n''',
    '''    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID\n    service_institution_id = None\n    effective_institution_id = institution_id\n\n    if current_user.role in (RoleEnum.MAIRIE, RoleEnum.ADMIN, RoleEnum.AGENCE):\n        if not current_user.institution_id:\n            raise HTTPException(status_code=403, detail="Périmètre institutionnel absent.")\n        if institution_id and institution_id != current_user.institution_id:\n            raise HTTPException(status_code=403, detail="Catalogue hors de votre mairie interdit.")\n        effective_institution_id = current_user.institution_id\n    elif current_user.role in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE):\n        if not current_user.institution_id:\n            raise HTTPException(status_code=403, detail="Service de rattachement absent.")\n        effective_institution_id = None\n        service_institution_id = current_user.institution_id\n\n    return await _catalog_response(\n        db,\n        tenant_id,\n        category_id=category_id,\n        search=search,\n        institution_id=effective_institution_id,\n        service_institution_id=service_institution_id,\n    )\n\n\n@router.get("/assignments", summary="Routages mairie vers services internes")\nasync def list_service_assignments(\n    db: AsyncSession = Depends(get_db),\n    current_user: User = Depends(get_current_user),\n) -> dict:\n    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID\n    query = select(InstitutionServiceAssignment).where(\n        InstitutionServiceAssignment.tenant_id == tenant_id\n    )\n    if current_user.role in (RoleEnum.MAIRIE, RoleEnum.ADMIN, RoleEnum.AGENCE):\n        if not current_user.institution_id:\n            raise HTTPException(status_code=403, detail="Périmètre institutionnel absent.")\n        query = query.where(\n            InstitutionServiceAssignment.institution_id == current_user.institution_id\n        )\n    elif current_user.role in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE):\n        if not current_user.institution_id:\n            raise HTTPException(status_code=403, detail="Service de rattachement absent.")\n        query = query.where(\n            InstitutionServiceAssignment.service_institution_id == current_user.institution_id\n        )\n    elif current_user.role not in (RoleEnum.SUPER_ADMIN, RoleEnum.MINISTRE, RoleEnum.DIRECTEUR):\n        raise HTTPException(status_code=403, detail="Accès aux routages interdit.")\n\n    items = (await db.execute(query.order_by(InstitutionServiceAssignment.service_id))).scalars().all()\n    return {\n        "items": [\n            {\n                "id": str(item.id),\n                "institutionId": item.institution_id,\n                "serviceId": item.service_id,\n                "serviceInstitutionId": item.service_institution_id,\n                "isActive": item.is_active,\n            }\n            for item in items\n        ]\n    }\n\n\n@router.put(\n    "/assignments/{institution_id}/{service_id}",\n    summary="Affecter une démarche à un service interne de mairie",\n)\nasync def upsert_service_assignment(\n    institution_id: str,\n    service_id: str,\n    payload: ServiceAssignmentUpsert,\n    db: AsyncSession = Depends(get_db),\n    current_user: User = Depends(get_current_user),\n) -> dict:\n    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID\n    if current_user.role != RoleEnum.SUPER_ADMIN:\n        if current_user.role not in (RoleEnum.MAIRIE, RoleEnum.ADMIN):\n            raise HTTPException(status_code=403, detail="Affectation réservée à la mairie administratrice.")\n        if current_user.institution_id != institution_id:\n            raise HTTPException(status_code=403, detail="Affectation inter-mairie interdite.")\n\n    mairie = await db.scalar(\n        select(Institution).where(\n            Institution.id == institution_id,\n            Institution.tenant_id == tenant_id,\n            Institution.is_active.is_(True),\n        )\n    )\n    if not mairie or mairie.type.lower() != "mairie":\n        raise HTTPException(status_code=422, detail="Mairie cible inconnue ou inactive.")\n\n    catalog_service = await get_active_service(db, tenant_id, service_id)\n    if not catalog_service:\n        raise HTTPException(status_code=422, detail="Démarche active inconnue.")\n\n    processing_service = await db.scalar(\n        select(Institution).where(\n            Institution.id == payload.service_institution_id,\n            Institution.tenant_id == tenant_id,\n            Institution.is_active.is_(True),\n            Institution.type == "service",\n            Institution.id.in_(\n                institution_descendant_ids_query(\n                    tenant_id=tenant_id,\n                    root_institution_id=mairie.id,\n                    name="catalog_assignment_scope",\n                )\n            ),\n        )\n    )\n    if not processing_service:\n        raise HTTPException(\n            status_code=422,\n            detail="Le service de traitement doit être un service actif de cette mairie.",\n        )\n\n    assignment = await db.scalar(\n        select(InstitutionServiceAssignment).where(\n            InstitutionServiceAssignment.tenant_id == tenant_id,\n            InstitutionServiceAssignment.institution_id == mairie.id,\n            InstitutionServiceAssignment.service_id == catalog_service.service_id,\n        )\n    )\n    if assignment is None:\n        assignment = InstitutionServiceAssignment(\n            tenant_id=tenant_id,\n            institution_id=mairie.id,\n            service_id=catalog_service.service_id,\n            service_institution_id=processing_service.id,\n            is_active=payload.is_active,\n            created_by=current_user.id,\n        )\n        db.add(assignment)\n    else:\n        assignment.service_institution_id = processing_service.id\n        assignment.is_active = payload.is_active\n\n    await db.flush()\n    return {\n        "id": str(assignment.id),\n        "institutionId": assignment.institution_id,\n        "serviceId": assignment.service_id,\n        "serviceInstitutionId": assignment.service_institution_id,\n        "isActive": assignment.is_active,\n    }\n\n\n@router.get("/{service_id}/history", summary="Historique des versions d'une démarche")\n''',
)

# ---------------------------------------------------------------------------
# Mairie team management: root mairie admins can manage only their descendants.
# ---------------------------------------------------------------------------
replace_once(
    "backend/app/api/users.py",
    "from app.services.identity_lifecycle_service import identity_lifecycle_service\n",
    "from app.services.identity_lifecycle_service import identity_lifecycle_service\nfrom app.services.institution_scope import institution_descendant_ids_query\n",
)
replace_once(
    "backend/app/api/users.py",
    '''    if data.institution_id and data.institution_id.strip() != actor_institution:\n        raise HTTPException(status_code=403, detail="Création hors institution interdite.")\n    return actor_tenant, actor_institution\n''',
    '''    requested_institution = (data.institution_id or actor_institution).strip()\n    if requested_institution != actor_institution:\n        if actor.role not in (RoleEnum.MAIRIE, RoleEnum.ADMIN) or data.role not in (\n            RoleEnum.AGENT,\n            RoleEnum.CHEF_SERVICE,\n        ):\n            raise HTTPException(status_code=403, detail="Création hors institution interdite.")\n    return actor_tenant, requested_institution\n''',
)
replace_once(
    "backend/app/api/users.py",
    '''def _can_view_user(actor: User, target: User) -> bool:\n''',
    '''async def _institution_in_actor_scope(\n    db: AsyncSession, actor: User, target_institution_id: str | None\n) -> bool:\n    if actor.role in (RoleEnum.SUPER_ADMIN, RoleEnum.MINISTRE):\n        return True\n    if not actor.institution_id or not target_institution_id:\n        return False\n    if actor.institution_id == target_institution_id:\n        return True\n    if actor.role not in (RoleEnum.MAIRIE, RoleEnum.ADMIN):\n        return False\n    tenant_id = actor.tenant_id or settings.TENANT_DEFAULT_ID\n    candidate = await db.scalar(\n        select(Institution.id).where(\n            Institution.id == target_institution_id,\n            Institution.id.in_(\n                institution_descendant_ids_query(\n                    tenant_id=tenant_id,\n                    root_institution_id=actor.institution_id,\n                    name="mairie_team_scope",\n                )\n            ),\n        )\n    )\n    return candidate is not None\n\n\nasync def _can_view_user_governed(db: AsyncSession, actor: User, target: User) -> bool:\n    if actor.role == RoleEnum.SUPER_ADMIN or actor.id == target.id:\n        return True\n    if (actor.tenant_id or settings.TENANT_DEFAULT_ID) != (\n        target.tenant_id or settings.TENANT_DEFAULT_ID\n    ):\n        return False\n    if actor.role.hierarchy_level() <= target.role.hierarchy_level():\n        return False\n    return await _institution_in_actor_scope(db, actor, target.institution_id)\n\n\ndef _can_view_user(actor: User, target: User) -> bool:\n''',
)
replace_once(
    "backend/app/api/users.py",
    '''            query = query.where(User.institution_id == current_user.institution_id)\n\n        manageable_roles = [\n''',
    '''            if current_user.role in (RoleEnum.MAIRIE, RoleEnum.ADMIN):\n                query = query.where(\n                    User.institution_id.in_(\n                        institution_descendant_ids_query(\n                            tenant_id=tenant,\n                            root_institution_id=current_user.institution_id,\n                            name="mairie_user_list_scope",\n                        )\n                    )\n                )\n            else:\n                query = query.where(User.institution_id == current_user.institution_id)\n\n        manageable_roles = [\n''',
)
replace_once(
    "backend/app/api/users.py",
    '''    canonical_institution, _ = await _validate_target_assignment(\n        db,\n        tenant_id=tenant_id,\n        institution_id=institution_id,\n        role=user_data.role,\n    )\n\n    user = User(\n''',
    '''    canonical_institution, _ = await _validate_target_assignment(\n        db,\n        tenant_id=tenant_id,\n        institution_id=institution_id,\n        role=user_data.role,\n    )\n    if current_user.role not in (RoleEnum.SUPER_ADMIN, RoleEnum.MINISTRE) and not await _institution_in_actor_scope(\n        db, current_user, institution_id\n    ):\n        raise HTTPException(status_code=403, detail="Service cible hors de votre mairie.")\n\n    user = User(\n''',
)
replace_once(
    "backend/app/api/users.py",
    '''    if not _can_view_user(current_user, user):\n        raise HTTPException(status_code=403, detail="Utilisateur hors de votre périmètre administratif.")\n''',
    '''    if not await _can_view_user_governed(db, current_user, user):\n        raise HTTPException(status_code=403, detail="Utilisateur hors de votre périmètre administratif.")\n''',
)
replace_once(
    "backend/app/api/users.py",
    '''    if not authorization_service.can_administer_user(current_user, user):\n        raise HTTPException(\n            status_code=403,\n            detail="Compte hors de votre niveau ou périmètre administratif.",\n        )\n''',
    '''    if not await _can_view_user_governed(db, current_user, user):\n        raise HTTPException(\n            status_code=403,\n            detail="Compte hors de votre niveau ou périmètre administratif.",\n        )\n''',
)
# The same exact authorization anchor appears once more in deactivate_user.
replace_once(
    "backend/app/api/users.py",
    '''    if not authorization_service.can_administer_user(current_user, user):\n        raise HTTPException(status_code=403, detail="Désactivation hors périmètre interdite.")\n''',
    '''    if not await _can_view_user_governed(db, current_user, user):\n        raise HTTPException(status_code=403, detail="Désactivation hors périmètre interdite.")\n''',
)
# During a governed update, a mairie admin may move an AGENT/CHEF_SERVICE only
# within its own subtree; all other institution changes remain forbidden.
replace_once(
    "backend/app/api/users.py",
    '''        requested_institution = update_data.get("institution_id", user.institution_id)\n        if current_user.role != RoleEnum.MINISTRE and requested_institution != user.institution_id:\n            raise HTTPException(\n                status_code=403,\n                detail="Changement d'institution hors périmètre interdit.",\n            )\n''',
    '''        requested_institution = update_data.get("institution_id", user.institution_id)\n        if current_user.role != RoleEnum.MINISTRE and requested_institution != user.institution_id:\n            requested_role = update_data.get("role") or user.role\n            if (\n                current_user.role not in (RoleEnum.MAIRIE, RoleEnum.ADMIN)\n                or requested_role not in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE)\n                or not await _institution_in_actor_scope(db, current_user, requested_institution)\n            ):\n                raise HTTPException(\n                    status_code=403,\n                    detail="Changement d'institution hors périmètre interdit.",\n                )\n''',
)

# ---------------------------------------------------------------------------
# Alembic: schema + RLS. New rows route to a service, legacy rows stay readable.
# ---------------------------------------------------------------------------
write(
    "backend/alembic/versions/municipality_service_request_routing.py",
    '''"""Route municipal requests to mairie-owned internal services.

Revision ID: municipality_service_routing
Revises: directeur_scope_rls_fn
Create Date: 2026-08-15
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "municipality_service_routing"
down_revision = "directeur_scope_rls_fn"
branch_labels = None
depends_on = None


def _staff_scope() -> str:
    return """
        tenant_id = current_setting('app.current_tenant_id', true)
        AND (
            current_setting('app.current_role', true) = 'MINISTRE'
            OR (
                current_setting('app.current_role', true) = 'DIRECTEUR'
                AND institution_id IN (
                    SELECT scope_id FROM eadmin_current_directeur_institution_scope()
                )
            )
            OR (
                current_setting('app.current_role', true) IN ('MAIRIE', 'AGENCE', 'ADMIN')
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
            OR (
                current_setting('app.current_role', true) IN ('AGENT', 'CHEF_SERVICE')
                AND (
                    service_institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                    OR (
                        service_institution_id IS NULL
                        AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
                    )
                )
            )
        )
    """


def _previous_staff_scope() -> str:
    return """
        tenant_id = current_setting('app.current_tenant_id', true)
        AND (
            current_setting('app.current_role', true) = 'MINISTRE'
            OR (
                current_setting('app.current_role', true) = 'DIRECTEUR'
                AND institution_id IN (
                    SELECT scope_id FROM eadmin_current_directeur_institution_scope()
                )
            )
            OR (
                current_setting('app.current_role', true) IN ('MAIRIE', 'AGENCE', 'AGENT', 'ADMIN', 'CHEF_SERVICE')
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
        )
    """


def _replace_staff_policies(scope: str) -> None:
    op.execute('DROP POLICY IF EXISTS "service_requests_staff_select" ON service_requests')
    op.execute('DROP POLICY IF EXISTS "service_requests_staff_update" ON service_requests')
    op.execute(
        f"""
        CREATE POLICY "service_requests_staff_select" ON service_requests
            FOR SELECT USING ({scope});
        CREATE POLICY "service_requests_staff_update" ON service_requests
            FOR UPDATE USING ({scope}) WITH CHECK ({scope});
        """
    )


def upgrade() -> None:
    op.create_table(
        "institution_service_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", sa.String(100), nullable=False),
        sa.Column("institution_id", sa.String(100), nullable=False),
        sa.Column("service_id", sa.String(100), nullable=False),
        sa.Column("service_institution_id", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_institution_id"], ["institutions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("tenant_id", "institution_id", "service_id", name="uq_institution_service_assignment"),
    )
    for name, column in (
        ("ix_institution_service_assignments_tenant_id", "tenant_id"),
        ("ix_institution_service_assignments_institution_id", "institution_id"),
        ("ix_institution_service_assignments_service_id", "service_id"),
        ("ix_institution_service_assignments_service_institution_id", "service_institution_id"),
        ("ix_institution_service_assignments_is_active", "is_active"),
    ):
        op.create_index(name, "institution_service_assignments", [column])

    op.add_column(
        "service_requests",
        sa.Column("service_institution_id", sa.String(100), nullable=True),
    )
    op.create_foreign_key(
        "fk_service_requests_service_institution",
        "service_requests",
        "institutions",
        ["service_institution_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_service_requests_service_institution_id",
        "service_requests",
        ["service_institution_id"],
    )

    op.execute("ALTER TABLE institution_service_assignments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE institution_service_assignments FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY institution_service_assignments_select
        ON institution_service_assignments
        FOR SELECT
        USING (
            current_setting('app.current_role', true) = 'SUPER_ADMIN'
            OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
        );

        CREATE POLICY institution_service_assignments_write
        ON institution_service_assignments
        FOR ALL
        USING (
            current_setting('app.current_role', true) = 'SUPER_ADMIN'
            OR (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
                AND current_setting('app.current_role', true) IN ('MAIRIE', 'ADMIN')
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
        )
        WITH CHECK (
            current_setting('app.current_role', true) = 'SUPER_ADMIN'
            OR (
                tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
                AND current_setting('app.current_role', true) IN ('MAIRIE', 'ADMIN')
                AND institution_id = NULLIF(current_setting('app.current_institution_id', true), '')
            )
        );
        """
    )
    _replace_staff_policies(_staff_scope())


def downgrade() -> None:
    _replace_staff_policies(_previous_staff_scope())
    op.drop_index("ix_service_requests_service_institution_id", table_name="service_requests")
    op.drop_constraint("fk_service_requests_service_institution", "service_requests", type_="foreignkey")
    op.drop_column("service_requests", "service_institution_id")
    op.drop_table("institution_service_assignments")
''',
)

# ---------------------------------------------------------------------------
# Focused regression test: two municipalities, two services, no cross visibility.
# ---------------------------------------------------------------------------
write(
    "backend/tests/test_municipality_service_request_routing.py",
    '''from datetime import datetime, timedelta, timezone
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.service_requests import ServiceRequestCreate, _apply_request_scope, create_service_request
from app.models.administrative_service import AdministrativeService
from app.models.institution import Institution
from app.models.institution_service_assignment import InstitutionServiceAssignment
from app.models.service_request import ServiceRequest
from app.models.user import RoleEnum, User
from app.services.service_catalog import list_active_services


TENANT = "guinee-routing-test"


def principal(role: RoleEnum, institution_id: str | None, email: str) -> User:
    return User(
        id=uuid.uuid4(),
        email=email,
        hashed_password="test-only-not-used",
        full_name=email.split("@")[0],
        role=role,
        tenant_id=TENANT,
        institution_id=institution_id,
        is_active=True,
    )


def request_row(reference: str, citizen: User, mairie: str, service_unit: str, service_id: str) -> ServiceRequest:
    now = datetime.now(timezone.utc)
    return ServiceRequest(
        reference=reference,
        service_id=service_id,
        service_name=service_id,
        category="Etat civil",
        category_id="etat-civil",
        citizen_id=citizen.id,
        citizen_name="Citoyen",
        citizen_first_name=reference,
        citizen_nin=f"NIN-{reference}",
        citizen_phone="+224600000000",
        citizen_email=citizen.email,
        citizen_address="Conakry",
        motif="Test isolation municipale",
        required_documents=[],
        assigned_service=service_unit,
        timeline=[],
        deadline_days=5,
        deadline_date=now + timedelta(days=5),
        tenant_id=TENANT,
        institution_id=mairie,
        service_institution_id=service_unit,
    )


@pytest.mark.asyncio
async def test_two_mairies_two_services_are_strictly_isolated(db_session):
    mairie_a = Institution(id="mairie-a", tenant_id=TENANT, name="Mairie A", type="mairie", is_active=True)
    service_a = Institution(id="service-a", tenant_id=TENANT, name="Etat civil A", type="service", parent_id="mairie-a", is_active=True)
    mairie_b = Institution(id="mairie-b", tenant_id=TENANT, name="Mairie B", type="mairie", is_active=True)
    service_b = Institution(id="service-b", tenant_id=TENANT, name="Etat civil B", type="service", parent_id="mairie-b", is_active=True)
    db_session.add_all([mairie_a, service_a, mairie_b, service_b])

    citizen_a = principal(RoleEnum.CITOYEN, None, "citizen-a@test.gn")
    citizen_b = principal(RoleEnum.CITOYEN, None, "citizen-b@test.gn")
    agent_a = principal(RoleEnum.AGENT, "service-a", "agent-a@test.gn")
    agent_b = principal(RoleEnum.AGENT, "service-b", "agent-b@test.gn")
    mairie_user_a = principal(RoleEnum.MAIRIE, "mairie-a", "mairie-a@test.gn")
    mairie_user_b = principal(RoleEnum.MAIRIE, "mairie-b", "mairie-b@test.gn")

    db_session.add_all(
        [
            request_row("REQ-A", citizen_a, "mairie-a", "service-a", "acte-a"),
            request_row("REQ-B", citizen_b, "mairie-b", "service-b", "acte-b"),
        ]
    )
    await db_session.flush()

    async def visible(user: User) -> set[str]:
        rows = (await db_session.execute(_apply_request_scope(select(ServiceRequest), user))).scalars().all()
        return {row.reference for row in rows}

    assert await visible(agent_a) == {"REQ-A"}
    assert await visible(agent_b) == {"REQ-B"}
    assert await visible(mairie_user_a) == {"REQ-A"}
    assert await visible(mairie_user_b) == {"REQ-B"}


@pytest.mark.asyncio
async def test_catalog_and_submission_are_bound_to_selected_mairie(db_session):
    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            Institution(id="mairie-a", tenant_id=TENANT, name="Mairie A", type="mairie", is_active=True),
            Institution(id="service-a", tenant_id=TENANT, name="Etat civil A", type="service", parent_id="mairie-a", is_active=True),
            Institution(id="mairie-b", tenant_id=TENANT, name="Mairie B", type="mairie", is_active=True),
            Institution(id="service-b", tenant_id=TENANT, name="Etat civil B", type="service", parent_id="mairie-b", is_active=True),
            AdministrativeService(
                tenant_id=TENANT,
                service_id="acte-a",
                version=1,
                category_id="etat-civil",
                category_name="Etat civil",
                name="Acte A",
                description="",
                sla_business_days=5,
                required_documents=[],
                routing_terms=[],
                effective_from=now - timedelta(days=1),
                is_active=True,
            ),
            AdministrativeService(
                tenant_id=TENANT,
                service_id="acte-b",
                version=1,
                category_id="etat-civil",
                category_name="Etat civil",
                name="Acte B",
                description="",
                sla_business_days=5,
                required_documents=[],
                routing_terms=[],
                effective_from=now - timedelta(days=1),
                is_active=True,
            ),
            InstitutionServiceAssignment(
                tenant_id=TENANT,
                institution_id="mairie-a",
                service_id="acte-a",
                service_institution_id="service-a",
                is_active=True,
            ),
            InstitutionServiceAssignment(
                tenant_id=TENANT,
                institution_id="mairie-b",
                service_id="acte-b",
                service_institution_id="service-b",
                is_active=True,
            ),
        ]
    )
    await db_session.flush()

    assert [s.service_id for s in await list_active_services(db_session, TENANT, institution_id="mairie-a")] == ["acte-a"]
    assert [s.service_id for s in await list_active_services(db_session, TENANT, institution_id="mairie-b")] == ["acte-b"]

    citizen = principal(RoleEnum.CITOYEN, None, "citizen-submit@test.gn")
    payload = ServiceRequestCreate(
        service_id="acte-a",
        target_institution_id="mairie-a",
        citizen_name="Diallo",
        citizen_first_name="Aminata",
        citizen_nin="GN-TEST-001",
        citizen_phone="+224600000001",
        citizen_address="Commune A",
        motif="Demande acte A",
    )
    created = await create_service_request(payload, db_session, citizen)
    assert created["institutionId"] == "mairie-a"
    assert created["serviceInstitutionId"] == "service-a"

    wrong = payload.model_copy(update={"service_id": "acte-b"})
    with pytest.raises(HTTPException) as exc:
        await create_service_request(wrong, db_session, citizen)
    assert exc.value.status_code == 400
    assert "pas proposée" in exc.value.detail
''',
)

print("municipality routing patch applied")
