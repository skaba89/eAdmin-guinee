"""
RBAC Middleware - eAdministration Suite Guinea.
Contrôle d'accès basé sur les rôles pour toutes les routes API.
Hiérarchie à 7 niveaux : CITOYEN(0) → AGENT(2) → ADMIN(3) → CHEF_SERVICE(4) → DIRECTEUR(5) → MINISTRE(6) → SUPER_ADMIN(7)
Inclut les permissions multi-tenant, signatures et parapheur numérique.
"""

import logging
from typing import Callable

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import RoleEnum, User
from app.api.auth import get_current_user

logger = logging.getLogger("eadmin.rbac")


# --- Permission Matrix ---
# Maps (resource, action) → minimum hierarchy level required
# Hiérarchie : CITOYEN(0), AGENT/MAIRIE/AGENCE(2), ADMIN(3),
#              CHEF_SERVICE(4), DIRECTEUR(5), MINISTRE(6), SUPER_ADMIN(7)
PERMISSION_MATRIX: dict[tuple[str, str], int] = {
    # Users
    ("users", "read"): 3,       # ADMIN+
    ("users", "create"): 3,     # ADMIN+
    ("users", "update"): 3,     # ADMIN+
    ("users", "delete"): 7,     # SUPER_ADMIN only

    # Service requests
    ("requests", "read_own"): 0,     # CITOYEN+
    ("requests", "read_assigned"): 2, # AGENT+ (was MAIRIE/AGENCE)
    ("requests", "read_all"): 5,     # DIRECTEUR+
    ("requests", "process"): 2,      # AGENT+ (was MAIRIE/AGENCE)
    ("requests", "approve"): 4,      # CHEF_SERVICE+
    ("requests", "reject"): 4,       # CHEF_SERVICE+
    ("requests", "delete"): 3,       # ADMIN+

    # Documents (GED)
    ("documents", "read"): 2,        # AGENT+ (was MAIRIE/AGENCE)
    ("documents", "read_all"): 5,    # DIRECTEUR+
    ("documents", "upload"): 2,      # AGENT+ (was MAIRIE/AGENCE)
    ("documents", "delete"): 3,      # ADMIN+

    # Courriers
    ("courriers", "read"): 2,        # AGENT+ (was MAIRIE/AGENCE)
    ("courriers", "read_all"): 5,    # DIRECTEUR+
    ("courriers", "create"): 2,      # AGENT+ (was MAIRIE/AGENCE)

    # Workflows
    ("workflows", "read"): 4,        # CHEF_SERVICE+
    ("workflows", "manage"): 5,      # DIRECTEUR+

    # Audit logs
    ("audit", "read"): 5,            # DIRECTEUR+
    ("audit", "export"): 3,          # ADMIN+

    # Analytics
    ("analytics", "read"): 2,        # AGENT+ (was MAIRIE/AGENCE)
    ("analytics", "read_all"): 5,    # DIRECTEUR+

    # Admin
    ("admin", "access"): 3,          # ADMIN+
    ("settings", "read"): 3,         # ADMIN+
    ("settings", "update"): 7,       # SUPER_ADMIN

    # AI
    ("ai", "view"): 2,              # AGENT+ (was MAIRIE/AGENCE)
    ("ai", "configure"): 5,         # DIRECTEUR+
    ("ai", "process"): 3,           # ADMIN+

    # Multi-tenant
    ("tenants", "read"): 3,          # ADMIN+
    ("tenants", "manage"): 7,        # SUPER_ADMIN only

    # Institutions
    ("institutions", "read"): 2,     # AGENT+
    ("institutions", "manage"): 5,   # DIRECTEUR+

    # Reports
    ("reports", "generate"): 2,      # AGENT+
    ("reports", "export"): 3,        # ADMIN+

    # Signatures numériques
    ("signatures", "sign"): 2,       # AGENT+
    ("signatures", "approve"): 4,    # CHEF_SERVICE+

    # Parapheur numérique
    ("parapheur", "read"): 2,        # AGENT+
    ("parapheur", "manage"): 4,      # CHEF_SERVICE+
}


def require_permission(resource: str, action: str):
    """
    Dépendance qui vérifie si l'utilisateur courant a la permission requise.
    Utilise la hiérarchie à 7 niveaux pour l'héritage des permissions.

    Usage:
        @router.get("/", dependencies=[Depends(require_permission("users", "read"))])
    """
    async def permission_checker(current_user: User = Depends(get_current_user)):
        required_level = PERMISSION_MATRIX.get((resource, action), 7)
        user_level = current_user.role.hierarchy_level()

        if user_level < required_level:
            logger.warning(
                f"Permission refusée: {current_user.email} ({current_user.role.value}, niveau={user_level}) "
                f"a tenté {resource}:{action} (nécessite niveau={required_level})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission insuffisante pour {resource}:{action}. "
                       f"Rôle requis: niveau {required_level}+, votre niveau: {user_level}.",
            )

        return current_user

    return permission_checker


def require_role(*roles: RoleEnum):
    """
    Dépendance qui vérifie si l'utilisateur courant a l'un des rôles requis.

    Usage:
        @router.get("/", dependencies=[Depends(require_role(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN))])
    """
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            role_names = [r.value for r in roles]
            logger.warning(
                f"Vérification de rôle échouée: {current_user.email} ({current_user.role.value}) "
                f"a tenté d'accéder à un endpoint nécessitant {role_names}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle requis: {' ou '.join(role_names)}. Votre rôle: {current_user.role.value}",
            )
        return current_user

    return role_checker


def require_clearance(
    resource: str,
    action: str,
    *,
    check_tenant: bool = True,
    check_institution: bool = False,
):
    """
    Dépendance qui vérifie à la fois la hiérarchie de rôles ET la portée institutionnelle.

    Vérifie :
    1. Le niveau hiérarchique de l'utilisateur (comme require_permission)
    2. Le tenant_id correspond si check_tenant=True (sauf pour SUPER_ADMIN/MINISTRE)
    3. L'institution_id correspond si check_institution=True (sauf pour DIRECTEUR+)

    Args:
        resource: Ressource demandée (ex: "documents", "users")
        action: Action demandée (ex: "read", "manage")
        check_tenant: Vérifier l'isolation tenant (défaut: True)
        check_institution: Vérifier l'isolation institutionnelle (défaut: False)

    Usage:
        @router.get("/", dependencies=[Depends(require_clearance("documents", "read"))])
        @router.get("/", dependencies=[Depends(require_clearance("users", "read", check_institution=True))])
    """
    async def clearance_checker(
        request: Request,
        current_user: User = Depends(get_current_user),
    ):
        # 1. Vérifier le niveau hiérarchique
        required_level = PERMISSION_MATRIX.get((resource, action), 7)
        user_level = current_user.role.hierarchy_level()

        if user_level < required_level:
            logger.warning(
                f"Clearance refusée (niveau): {current_user.email} ({current_user.role.value}, niveau={user_level}) "
                f"a tenté {resource}:{action} (nécessite niveau={required_level})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission insuffisante pour {resource}:{action}. "
                       f"Rôle requis: niveau {required_level}+, votre niveau: {user_level}.",
            )

        # 2. Vérifier l'isolation tenant (sauf SUPER_ADMIN et MINISTRE qui sont transversaux)
        if check_tenant and user_level < 6:
            request_tenant = request.headers.get("X-Tenant-ID", "")
            user_tenant = current_user.tenant_id or ""
            if request_tenant and user_tenant and request_tenant != user_tenant:
                logger.warning(
                    f"Clearance refusée (tenant): {current_user.email} (tenant={user_tenant}) "
                    f"a tenté d'accéder au tenant {request_tenant}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Accès refusé: vous n'avez pas accès aux données de ce tenant.",
                )

        # 3. Vérifier l'isolation institutionnelle (sauf DIRECTEUR+ qui voient tout)
        if check_institution and user_level < 5:
            request_institution = request.headers.get("X-Institution-ID", "")
            user_institution = current_user.institution_id or ""
            if request_institution and user_institution and request_institution != user_institution:
                logger.warning(
                    f"Clearance refusée (institution): {current_user.email} "
                    f"(institution={user_institution}) a tenté d'accéder à l'institution {request_institution}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Accès refusé: vous n'avez pas accès aux données de cette institution.",
                )

        return current_user

    return clearance_checker


def require_any_permission(*permissions: tuple[str, str]):
    """
    Dépendance qui accepte n'importe laquelle des permissions spécifiées (logique OU).
    L'utilisateur doit avoir AU MOINS UNE des permissions listées.

    Args:
        permissions: Tuples (resource, action) — l'utilisateur doit en avoir au moins une

    Usage:
        @router.get("/", dependencies=[Depends(require_any_permission(
            ("documents", "read"), ("documents", "read_all")
        ))])
    """
    async def any_permission_checker(current_user: User = Depends(get_current_user)):
        user_level = current_user.role.hierarchy_level()

        for resource, action in permissions:
            required_level = PERMISSION_MATRIX.get((resource, action), 7)
            if user_level >= required_level:
                return current_user

        # Aucune permission satisfaite
        perm_descriptions = [f"{r}:{a}" for r, a in permissions]
        logger.warning(
            f"Aucune permission requise: {current_user.email} ({current_user.role.value}, niveau={user_level}) "
            f"a tenté d'accéder (nécessite l'une de: {perm_descriptions})"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission insuffisante. Nécessite l'une des permissions: {', '.join(perm_descriptions)}. "
                   f"Votre niveau: {user_level}.",
        )

    return any_permission_checker
