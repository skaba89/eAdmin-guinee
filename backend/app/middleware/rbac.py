"""
RBAC Middleware - eAdministration Suite Guinea.
Enforces role-based access control on all API routes.
"""

import logging
from functools import wraps
from typing import Callable

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import RoleEnum, User
from app.api.auth import get_current_user

logger = logging.getLogger("eadmin.rbac")


# --- Permission Matrix ---
# Maps (resource, action) → minimum hierarchy level required
PERMISSION_MATRIX: dict[tuple[str, str], int] = {
    # Users
    ("users", "read"): 4,       # ADMIN+
    ("users", "create"): 4,     # ADMIN+
    ("users", "update"): 4,     # ADMIN+
    ("users", "delete"): 7,     # SUPER_ADMIN only

    # Service requests
    ("requests", "read_own"): 0,     # CITOYEN+
    ("requests", "read_assigned"): 1, # MAIRIE/AGENCE+
    ("requests", "read_all"): 5,     # DIRECTEUR+
    ("requests", "process"): 1,      # MAIRIE/AGENCE+
    ("requests", "approve"): 3,      # CHEF_SERVICE+
    ("requests", "reject"): 3,       # CHEF_SERVICE+
    ("requests", "delete"): 4,       # ADMIN+

    # Documents (GED)
    ("documents", "read"): 1,        # MAIRIE/AGENCE+
    ("documents", "read_all"): 5,    # DIRECTEUR+
    ("documents", "upload"): 1,      # MAIRIE/AGENCE+
    ("documents", "delete"): 4,      # ADMIN+

    # Courriers
    ("courriers", "read"): 1,        # MAIRIE/AGENCE+
    ("courriers", "read_all"): 5,    # DIRECTEUR+
    ("courriers", "create"): 1,      # MAIRIE/AGENCE+

    # Workflows
    ("workflows", "read"): 3,        # CHEF_SERVICE+
    ("workflows", "manage"): 5,      # DIRECTEUR+

    # Audit logs
    ("audit", "read"): 5,            # DIRECTEUR+
    ("audit", "export"): 4,          # ADMIN+

    # Analytics
    ("analytics", "read"): 1,        # MAIRIE/AGENCE+
    ("analytics", "read_all"): 5,    # DIRECTEUR+

    # Admin
    ("admin", "access"): 4,          # ADMIN+
    ("settings", "read"): 4,         # ADMIN+
    ("settings", "update"): 7,       # SUPER_ADMIN

    # AI
    ("ai", "view"): 1,              # MAIRIE/AGENCE+
    ("ai", "configure"): 5,         # DIRECTEUR+
    ("ai", "process"): 4,           # ADMIN+
}


def require_permission(resource: str, action: str):
    """
    Dependency that checks if the current user has the required permission.
    Usage: @router.get("/", dependencies=[Depends(require_permission("users", "read"))])
    """
    async def permission_checker(current_user: User = Depends(get_current_user)):
        required_level = PERMISSION_MATRIX.get((resource, action), 7)
        user_level = current_user.role.hierarchy_level()

        if user_level < required_level:
            logger.warning(
                f"Permission denied: {current_user.email} ({current_user.role.value}, level={user_level}) "
                f"tried {resource}:{action} (requires level={required_level})"
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
    Dependency that checks if the current user has one of the required roles.
    Usage: @router.get("/", dependencies=[Depends(require_role(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN))])
    """
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            role_names = [r.value for r in roles]
            logger.warning(
                f"Role check failed: {current_user.email} ({current_user.role.value}) "
                f"tried to access endpoint requiring {role_names}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle requis: {' ou '.join(role_names)}. Votre rôle: {current_user.role.value}",
            )
        return current_user

    return role_checker
