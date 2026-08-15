"""Governed user administration for eAdministration Suite Guinea."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import _validate_password_strength, get_current_user
from app.config import settings
from app.database import get_db
from app.middleware.rbac import require_permission
from app.models.institution import Institution
from app.models.user import RoleEnum, User
from app.services.audit_service import AuditService
from app.services.authorization_service import authorization_service
from app.services.identity_lifecycle_service import identity_lifecycle_service
from app.services.institution_scope import institution_descendant_ids_query

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Every operational role below ministry level is bound to one institution.
# This is especially important for municipalities: tenant_id is the national
# tenant, while institution_id is the hard municipality boundary.
INSTITUTION_BOUND_ROLES: frozenset[RoleEnum] = frozenset(
    {
        RoleEnum.AGENT,
        RoleEnum.MAIRIE,
        RoleEnum.AGENCE,
        RoleEnum.ADMIN,
        RoleEnum.CHEF_SERVICE,
        RoleEnum.DIRECTEUR,
    }
)


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: RoleEnum = RoleEnum.AGENT
    institution: str | None = None
    tenant_id: str | None = None
    institution_id: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_strength(value)


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    role: RoleEnum | None = None
    institution: str | None = None
    tenant_id: str | None = None
    institution_id: str | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: RoleEnum
    institution: str | None
    tenant_id: str | None
    institution_id: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedUsers(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


def _target_scope_for_create(actor: User, data: UserCreate) -> tuple[str, str | None]:
    """Resolve tenant/institution only from the authenticated administrative scope."""
    if actor.role == RoleEnum.SUPER_ADMIN:
        return (
            (data.tenant_id or settings.TENANT_DEFAULT_ID).strip(),
            (data.institution_id or "").strip() or None,
        )

    actor_tenant = (actor.tenant_id or settings.TENANT_DEFAULT_ID).strip()
    if data.tenant_id and data.tenant_id.strip() != actor_tenant:
        raise HTTPException(status_code=403, detail="Création inter-tenant interdite.")

    if actor.role == RoleEnum.MINISTRE:
        return actor_tenant, (data.institution_id or actor.institution_id or "").strip() or None

    actor_institution = (actor.institution_id or "").strip()
    if not actor_institution:
        raise HTTPException(
            status_code=403,
            detail="Périmètre institutionnel absent du compte administrateur.",
        )
    if data.institution_id and data.institution_id.strip() != actor_institution:
        raise HTTPException(status_code=403, detail="Création hors institution interdite.")
    return actor_tenant, actor_institution


async def _load_governed_institution(
    db: AsyncSession,
    *,
    tenant_id: str,
    institution_id: str,
    lock: bool = False,
) -> Institution:
    query = select(Institution).where(
        Institution.id == institution_id,
        Institution.tenant_id == tenant_id,
        Institution.is_active.is_(True),
    )
    if lock:
        query = query.with_for_update()
    institution = await db.scalar(query)
    if not institution:
        raise HTTPException(
            status_code=422,
            detail="Institution inconnue, inactive ou hors du tenant sélectionné.",
        )
    return institution


async def _ensure_single_active_mairie_admin(
    db: AsyncSession,
    *,
    tenant_id: str,
    institution: Institution,
    exclude_user_id: uuid.UUID | None = None,
) -> None:
    """Guarantee one active ADMIN account per mairie.

    The institution row is locked by the caller before this check, which makes
    concurrent admin creation for the same mairie deterministic.
    """
    if institution.type.lower() != "mairie":
        return

    query = select(User.id).where(
        User.tenant_id == tenant_id,
        User.institution_id == institution.id,
        User.role == RoleEnum.ADMIN,
        User.is_active.is_(True),
    )
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    existing = await db.scalar(query.limit(1))
    if existing:
        raise HTTPException(
            status_code=409,
            detail=(
                f"La mairie « {institution.name} » possède déjà un administrateur actif. "
                "Désactivez ou réaffectez ce compte avant d'en créer un autre."
            ),
        )


async def _validate_target_assignment(
    db: AsyncSession,
    *,
    tenant_id: str,
    institution_id: str | None,
    role: RoleEnum,
    exclude_user_id: uuid.UUID | None = None,
) -> tuple[str | None, Institution | None]:
    """Validate organizational assignment and return the canonical institution name."""
    if role in INSTITUTION_BOUND_ROLES and not institution_id:
        raise HTTPException(
            status_code=422,
            detail="Ce rôle doit obligatoirement être rattaché à une institution.",
        )

    if not institution_id:
        return None, None

    # ADMIN needs a row lock so the "one active admin per mairie" rule is safe
    # under concurrent requests.
    institution = await _load_governed_institution(
        db,
        tenant_id=tenant_id,
        institution_id=institution_id,
        lock=role == RoleEnum.ADMIN,
    )

    if role == RoleEnum.MAIRIE and institution.type.lower() != "mairie":
        raise HTTPException(
            status_code=422,
            detail="Un compte MAIRIE doit être rattaché à une institution de type mairie.",
        )
    if role == RoleEnum.AGENCE and institution.type.lower() != "agence":
        raise HTTPException(
            status_code=422,
            detail="Un compte AGENCE doit être rattaché à une institution de type agence.",
        )
    if role == RoleEnum.ADMIN:
        await _ensure_single_active_mairie_admin(
            db,
            tenant_id=tenant_id,
            institution=institution,
            exclude_user_id=exclude_user_id,
        )

    return institution.name, institution


async def _institution_in_actor_scope(
    db: AsyncSession, actor: User, target_institution_id: str | None
) -> bool:
    if actor.role in (RoleEnum.SUPER_ADMIN, RoleEnum.MINISTRE):
        return True
    if not actor.institution_id or not target_institution_id:
        return False
    if actor.institution_id == target_institution_id:
        return True
    if actor.role not in (RoleEnum.MAIRIE, RoleEnum.ADMIN):
        return False
    tenant_id = actor.tenant_id or settings.TENANT_DEFAULT_ID
    candidate = await db.scalar(
        select(Institution.id).where(
            Institution.id == target_institution_id,
            Institution.id.in_(
                institution_descendant_ids_query(
                    tenant_id=tenant_id,
                    root_institution_id=actor.institution_id,
                    name="mairie_team_scope",
                )
            ),
        )
    )
    return candidate is not None


async def _can_view_user_governed(db: AsyncSession, actor: User, target: User) -> bool:
    if actor.role == RoleEnum.SUPER_ADMIN or actor.id == target.id:
        return True
    if (actor.tenant_id or settings.TENANT_DEFAULT_ID) != (
        target.tenant_id or settings.TENANT_DEFAULT_ID
    ):
        return False
    if actor.role.hierarchy_level() <= target.role.hierarchy_level():
        return False
    return await _institution_in_actor_scope(db, actor, target.institution_id)


def _can_view_user(actor: User, target: User) -> bool:
    if actor.role == RoleEnum.SUPER_ADMIN or actor.id == target.id:
        return True
    if (actor.tenant_id or settings.TENANT_DEFAULT_ID) != (
        target.tenant_id or settings.TENANT_DEFAULT_ID
    ):
        return False
    if actor.role == RoleEnum.MINISTRE:
        return actor.role.hierarchy_level() > target.role.hierarchy_level()
    return (
        bool(actor.institution_id)
        and actor.institution_id == target.institution_id
        and actor.role.hierarchy_level() > target.role.hierarchy_level()
    )


async def _audit_user_change(
    db: AsyncSession,
    request: Request,
    actor: User,
    target: User,
    description: str,
    details: dict,
    severity: str = "warning",
) -> None:
    await AuditService(db).log_action(
        user_id=actor.id,
        action="ROLE_CHANGE" if "role" in details else "UPDATE",
        resource_type="user",
        resource_id=str(target.id),
        category="user",
        description=description,
        details=details,
        severity=severity,
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("User-Agent", "unknown")[:512],
        tenant_id=target.tenant_id,
        institution_id=target.institution_id,
    )


@router.get(
    "",
    response_model=PaginatedUsers,
    summary="Liste des utilisateurs",
    dependencies=[Depends(require_permission("users", "read"))],
)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role_filter: RoleEnum | None = Query(None, alias="role"),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedUsers:
    query = select(User)

    if current_user.role != RoleEnum.SUPER_ADMIN:
        tenant = current_user.tenant_id or settings.TENANT_DEFAULT_ID
        query = query.where(User.tenant_id == tenant)
        if current_user.role != RoleEnum.MINISTRE:
            if not current_user.institution_id:
                raise HTTPException(status_code=403, detail="Périmètre institutionnel absent.")
            if current_user.role in (RoleEnum.MAIRIE, RoleEnum.ADMIN):
                query = query.where(
                    User.institution_id.in_(
                        institution_descendant_ids_query(
                            tenant_id=tenant,
                            root_institution_id=current_user.institution_id,
                            name="mairie_user_list_scope",
                        )
                    )
                )
            else:
                query = query.where(User.institution_id == current_user.institution_id)

        manageable_roles = [
            role for role in RoleEnum
            if role.hierarchy_level() < current_user.role.hierarchy_level()
        ]
        query = query.where(User.role.in_(manageable_roles))

    if role_filter:
        if (
            current_user.role != RoleEnum.SUPER_ADMIN
            and role_filter.hierarchy_level() >= current_user.role.hierarchy_level()
        ):
            raise HTTPException(
                status_code=403,
                detail="Filtre de rôle hors de votre périmètre administratif.",
            )
        query = query.where(User.role == role_filter)
    if search:
        query = query.where(
            (User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    users = (await db.execute(query)).scalars().all()

    return PaginatedUsers(
        items=list(users),
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un utilisateur",
    dependencies=[Depends(require_permission("users", "create"))],
)
async def create_user(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    if not authorization_service.can_assign_role(current_user, user_data.role):
        raise HTTPException(
            status_code=403,
            detail="Élévation interdite: vous ne pouvez créer qu'un rôle strictement inférieur au vôtre.",
        )

    email = str(user_data.email).strip().lower()
    existing = await db.scalar(select(User).where(func.lower(User.email) == email))
    if existing:
        raise HTTPException(status_code=409, detail="Un compte avec cet email existe déjà")

    requested_institution = (user_data.institution_id or "").strip()
    governed_child_assignment = (
        current_user.role in (RoleEnum.MAIRIE, RoleEnum.ADMIN)
        and user_data.role in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE)
        and bool(requested_institution)
        and requested_institution != (current_user.institution_id or "").strip()
    )
    if governed_child_assignment:
        tenant_id = (current_user.tenant_id or settings.TENANT_DEFAULT_ID).strip()
        institution_id = requested_institution
    else:
        tenant_id, institution_id = _target_scope_for_create(current_user, user_data)

    canonical_institution, _ = await _validate_target_assignment(
        db,
        tenant_id=tenant_id,
        institution_id=institution_id,
        role=user_data.role,
    )
    if current_user.role not in (RoleEnum.SUPER_ADMIN, RoleEnum.MINISTRE) and not await _institution_in_actor_scope(
        db, current_user, institution_id
    ):
        raise HTTPException(status_code=403, detail="Service cible hors de votre mairie.")
    if governed_child_assignment:
        # Server-only slot consumed by the trusted before_flush guard. A browser
        # cannot populate this value and cross-mairie descendants are rejected above.
        db.sync_session.info["trusted_user_institution_id"] = institution_id

    user = User(
        email=email,
        hashed_password=pwd_context.hash(user_data.password),
        full_name=user_data.full_name.strip(),
        role=user_data.role,
        # The institution label is server-authoritative when an institution id
        # exists; browser-provided labels never define authorization scope.
        institution=canonical_institution if institution_id else (user_data.institution or None),
        tenant_id=tenant_id,
        institution_id=institution_id,
    )
    institution_scope_verified = await _institution_in_actor_scope(
        db, current_user, user.institution_id
    )
    if not authorization_service.can_administer_user(
        current_user,
        user,
        institution_scope_verified=institution_scope_verified,
    ):
        raise HTTPException(
            status_code=403,
            detail="Création du compte hors de votre périmètre administratif.",
        )
    db.add(user)
    await db.flush()
    await identity_lifecycle_service.record_joiner(
        db=db,
        actor=current_user,
        user=user,
    )
    await _audit_user_change(
        db,
        request,
        current_user,
        user,
        "Compte administratif créé et persisté dans un périmètre gouverné",
        {"role": user.role.value, "tenant_id": tenant_id, "institution_id": institution_id},
    )

    # A 201 response now means the row is already durable in PostgreSQL. This
    # prevents the frontend from reporting success while a later transaction
    # finalizer still has the possibility to roll the insert back.
    await db.commit()
    await db.refresh(user)
    return user


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Détail d'un utilisateur",
    dependencies=[Depends(require_permission("users", "read"))],
)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if not await _can_view_user_governed(db, current_user, user):
        raise HTTPException(status_code=403, detail="Utilisateur hors de votre périmètre administratif.")
    return user


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Mettre à jour un utilisateur",
    dependencies=[Depends(require_permission("users", "update"))],
)
async def update_user(
    user_id: uuid.UUID,
    user_data: UserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    user = await db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if not await _can_view_user_governed(db, current_user, user):
        raise HTTPException(
            status_code=403,
            detail="Compte hors de votre niveau ou périmètre administratif.",
        )
    institution_scope_verified = await _institution_in_actor_scope(
        db, current_user, user.institution_id
    )
    if not authorization_service.can_administer_user(
        current_user,
        user,
        institution_scope_verified=institution_scope_verified,
    ):
        raise HTTPException(
            status_code=403,
            detail="Mutation utilisateur hors de votre périmètre administratif.",
        )

    update_data = user_data.model_dump(exclude_unset=True)
    old_role = user.role
    old_tenant = user.tenant_id
    old_institution = user.institution_id

    if "role" in update_data and update_data["role"] is not None:
        if not authorization_service.can_assign_role(current_user, update_data["role"]):
            raise HTTPException(status_code=403, detail="Élévation de rôle non autorisée.")

    if current_user.role != RoleEnum.SUPER_ADMIN:
        requested_tenant = update_data.get("tenant_id", user.tenant_id)
        if requested_tenant != user.tenant_id:
            raise HTTPException(status_code=403, detail="Changement de tenant réservé au SUPER_ADMIN.")
        requested_institution = update_data.get("institution_id", user.institution_id)
        if current_user.role != RoleEnum.MINISTRE and requested_institution != user.institution_id:
            requested_role = update_data.get("role") or user.role
            if (
                current_user.role not in (RoleEnum.MAIRIE, RoleEnum.ADMIN)
                or requested_role not in (RoleEnum.AGENT, RoleEnum.CHEF_SERVICE)
                or not await _institution_in_actor_scope(db, current_user, requested_institution)
            ):
                raise HTTPException(
                    status_code=403,
                    detail="Changement d'institution hors périmètre interdit.",
                )
        if current_user.role == RoleEnum.MINISTRE and requested_institution is not None:
            if (current_user.tenant_id or settings.TENANT_DEFAULT_ID) != (
                user.tenant_id or settings.TENANT_DEFAULT_ID
            ):
                raise HTTPException(
                    status_code=403,
                    detail="Changement institutionnel inter-tenant interdit.",
                )

    target_role = update_data.get("role") or user.role
    target_tenant = (update_data.get("tenant_id", user.tenant_id) or settings.TENANT_DEFAULT_ID).strip()
    target_institution = update_data.get("institution_id", user.institution_id)
    if isinstance(target_institution, str):
        target_institution = target_institution.strip() or None

    canonical_institution, _ = await _validate_target_assignment(
        db,
        tenant_id=target_tenant,
        institution_id=target_institution,
        role=target_role,
        exclude_user_id=user.id,
    )

    if "email" in update_data and update_data["email"] is not None:
        normalized_email = str(update_data["email"]).strip().lower()
        duplicate = await db.scalar(
            select(User.id).where(func.lower(User.email) == normalized_email, User.id != user.id).limit(1)
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="Un compte avec cet email existe déjà")
        update_data["email"] = normalized_email

    for field, value in update_data.items():
        setattr(user, field, value)

    user.tenant_id = target_tenant
    user.institution_id = target_institution
    if target_institution:
        user.institution = canonical_institution

    security_changed = (
        old_role != user.role
        or old_tenant != user.tenant_id
        or old_institution != user.institution_id
    )
    if security_changed:
        await identity_lifecycle_service.handle_mover(
            db=db,
            actor=current_user,
            user=user,
            old_role=old_role.value,
            old_tenant_id=old_tenant,
            old_institution_id=old_institution,
        )
    else:
        await db.flush()

    await _audit_user_change(
        db,
        request,
        current_user,
        user,
        "Compte utilisateur mis à jour",
        {
            "role": {"old": old_role.value, "new": user.role.value},
            "tenant_id": {"old": old_tenant, "new": user.tenant_id},
            "institution_id": {"old": old_institution, "new": user.institution_id},
            "sessions_revoked": security_changed,
            "temporary_access_recertification_required": security_changed,
        },
        "critical" if security_changed else "warning",
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Désactiver un utilisateur",
    dependencies=[Depends(require_permission("users", "delete"))],
)
async def deactivate_user(
    user_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    user = await db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if not await _can_view_user_governed(db, current_user, user):
        raise HTTPException(status_code=403, detail="Désactivation hors périmètre interdite.")
    institution_scope_verified = await _institution_in_actor_scope(
        db, current_user, user.institution_id
    )
    if not authorization_service.can_administer_user(
        current_user,
        user,
        institution_scope_verified=institution_scope_verified,
    ):
        raise HTTPException(status_code=403, detail="Désactivation hors périmètre interdite.")

    await identity_lifecycle_service.offboard_user(
        db=db,
        actor=current_user,
        user=user,
    )
    await _audit_user_change(
        db,
        request,
        current_user,
        user,
        "Compte désactivé, sessions/grants/SSO révoqués",
        {
            "is_active": False,
            "sessions_revoked": True,
            "temporary_grants_revoked": True,
            "federated_identities_disabled": True,
        },
        "critical",
    )
    await db.commit()
