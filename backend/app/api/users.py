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
from app.models.user import RoleEnum, User
from app.services.audit_service import AuditService
from app.services.authorization_service import authorization_service
from app.services.token_blacklist import token_blacklist

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
    if actor.role == RoleEnum.SUPER_ADMIN:
        return (
            (data.tenant_id or settings.TENANT_DEFAULT_ID).strip(),
            (data.institution_id or "").strip() or None,
        )

    actor_tenant = (actor.tenant_id or settings.TENANT_DEFAULT_ID).strip()
    if data.tenant_id and data.tenant_id != actor_tenant:
        raise HTTPException(status_code=403, detail="Création inter-tenant interdite.")

    if actor.role == RoleEnum.MINISTRE:
        return actor_tenant, (data.institution_id or actor.institution_id or "").strip() or None

    actor_institution = (actor.institution_id or "").strip()
    if not actor_institution:
        raise HTTPException(status_code=403, detail="Périmètre institutionnel absent du compte administrateur.")
    if data.institution_id and data.institution_id != actor_institution:
        raise HTTPException(status_code=403, detail="Création hors institution interdite.")
    return actor_tenant, actor_institution


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
            raise HTTPException(status_code=403, detail="Filtre de rôle hors de votre périmètre administratif.")
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

    existing = await db.execute(select(User).where(User.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Un compte avec cet email existe déjà")

    tenant_id, institution_id = _target_scope_for_create(current_user, user_data)
    user = User(
        email=user_data.email,
        hashed_password=pwd_context.hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        institution=user_data.institution,
        tenant_id=tenant_id,
        institution_id=institution_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    await _audit_user_change(
        db,
        request,
        current_user,
        user,
        "Compte administratif créé dans un périmètre gouverné",
        {"role": user.role.value, "tenant_id": tenant_id, "institution_id": institution_id},
    )
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
    if not _can_view_user(current_user, user):
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
    if not authorization_service.can_administer_user(current_user, user):
        raise HTTPException(status_code=403, detail="Compte hors de votre niveau ou périmètre administratif.")

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
            raise HTTPException(status_code=403, detail="Changement d'institution hors périmètre interdit.")
        if current_user.role == RoleEnum.MINISTRE and requested_institution is not None:
            if (current_user.tenant_id or settings.TENANT_DEFAULT_ID) != (
                user.tenant_id or settings.TENANT_DEFAULT_ID
            ):
                raise HTTPException(status_code=403, detail="Changement institutionnel inter-tenant interdit.")

    for field, value in update_data.items():
        setattr(user, field, value)

    security_changed = (
        old_role != user.role
        or old_tenant != user.tenant_id
        or old_institution != user.institution_id
    )
    await db.flush()
    if security_changed:
        await token_blacklist.revoke_all_user_tokens(str(user.id))

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
        },
        "critical" if security_changed else "warning",
    )
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
    if not authorization_service.can_administer_user(current_user, user):
        raise HTTPException(status_code=403, detail="Désactivation hors périmètre interdite.")

    user.is_active = False
    await db.flush()
    await token_blacklist.revoke_all_user_tokens(str(user.id))
    await _audit_user_change(
        db,
        request,
        current_user,
        user,
        "Compte désactivé et sessions révoquées",
        {"is_active": False, "sessions_revoked": True},
        "critical",
    )
