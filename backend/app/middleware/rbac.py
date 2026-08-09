"""RBAC + ABAC enforcement for eAdministration Suite Guinea.

Every route-level permission decision is delegated to AuthorizationService so
permanent roles, trusted organizational scope and approved temporary grants are
enforced by the same authority. Client headers are never treated as an
authorization source; PostgreSQL RLS remains the final data-scope boundary.
"""

import logging

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import RoleEnum, User

logger = logging.getLogger("eadmin.rbac")


# Maps (resource, action) -> minimum permanent hierarchy level required.
PERMISSION_MATRIX: dict[tuple[str, str], int] = {
    ("users", "read"): 3,
    ("users", "create"): 3,
    ("users", "update"): 3,
    ("users", "delete"): 7,
    ("requests", "read_own"): 0,
    ("requests", "read_assigned"): 2,
    ("requests", "read_all"): 5,
    ("requests", "process"): 2,
    ("requests", "approve"): 4,
    ("requests", "reject"): 4,
    ("requests", "delete"): 3,
    ("documents", "read"): 2,
    ("documents", "read_all"): 5,
    ("documents", "upload"): 2,
    ("documents", "delete"): 3,
    ("courriers", "read"): 2,
    ("courriers", "read_all"): 5,
    ("courriers", "create"): 2,
    ("workflows", "read"): 4,
    ("workflows", "manage"): 5,
    ("audit", "read"): 5,
    ("audit", "export"): 3,
    ("analytics", "read"): 2,
    ("analytics", "read_all"): 5,
    ("admin", "access"): 3,
    ("settings", "read"): 3,
    ("settings", "update"): 7,
    ("ai", "view"): 2,
    ("ai", "configure"): 5,
    ("ai", "process"): 3,
    ("tenants", "read"): 3,
    ("tenants", "manage"): 7,
    ("institutions", "read"): 2,
    ("institutions", "manage"): 5,
    ("reports", "generate"): 2,
    ("reports", "export"): 3,
    ("signatures", "sign"): 2,
    ("signatures", "approve"): 4,
    ("parapheur", "read"): 2,
    ("parapheur", "manage"): 4,
}


def _mfa_verified(request: Request, user: User) -> bool:
    payload = getattr(request.state, "jwt_payload", {}) or {}
    return bool(user.mfa_enabled and payload.get("mfa_verified") is True)


def _trusted_scope(
    request: Request,
    user: User,
    *,
    check_tenant: bool = True,
    check_institution: bool = False,
) -> tuple[str | None, str | None]:
    """Return server-trusted scope only.

    The authenticated User is authoritative. RLS may already have normalized
    the same values on request.state, but client-supplied routing headers are not
    consulted here. Resource-specific rows are still constrained by FORCE RLS.
    """
    if user.role == RoleEnum.SUPER_ADMIN and not check_tenant:
        tenant_id = None
    else:
        tenant_id = user.tenant_id or settings.TENANT_DEFAULT_ID

    institution_id = user.institution_id if check_institution else None
    return tenant_id, institution_id


async def _audit_authorization_decision(
    *,
    request: Request,
    db: AsyncSession,
    user: User,
    resource: str,
    action: str,
    decision,
) -> None:
    """Audit denials and temporary privilege use without blocking the request."""
    if decision.allowed and decision.source == "role":
        return

    try:
        from app.services.audit_service import AuditService

        severity = "critical" if decision.source == "break_glass" else "warning"
        await AuditService(db).log_action(
            user_id=user.id,
            action="AUTHORIZATION",
            resource_type=resource,
            resource_id=f"{resource}:{action}",
            category="security",
            description=(
                "Accès accordé via habilitation temporaire"
                if decision.allowed
                else "Décision d'autorisation refusée"
            ),
            details={
                "allowed": decision.allowed,
                "reason": decision.reason,
                "source": decision.source,
                "grant_id": str(decision.grant_id) if decision.grant_id else None,
                "permission_action": action,
            },
            severity=severity,
            ip_address=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("User-Agent", "unknown")[:512],
            tenant_id=user.tenant_id or settings.TENANT_DEFAULT_ID,
            institution_id=user.institution_id,
        )
    except Exception as exc:  # audit failure must not silently grant access
        logger.error(
            "Authorization audit write failed user=%s permission=%s:%s error=%s",
            user.id,
            resource,
            action,
            exc,
        )


async def _effective_authorization(
    *,
    request: Request,
    db: AsyncSession,
    current_user: User,
    resource: str,
    action: str,
    check_tenant: bool = True,
    check_institution: bool = False,
):
    """Evaluate one route permission through the central authorization service."""
    from app.services.authorization_service import authorization_service

    tenant_id, institution_id = _trusted_scope(
        request,
        current_user,
        check_tenant=check_tenant,
        check_institution=check_institution,
    )
    decision = await authorization_service.authorize(
        user=current_user,
        resource=resource,
        action=action,
        db=db,
        tenant_id=tenant_id,
        institution_id=institution_id,
        mfa_verified=_mfa_verified(request, current_user),
        allow_temporary_grants=True,
    )

    request.state.authorization_decision = {
        "resource": resource,
        "action": action,
        "allowed": decision.allowed,
        "reason": decision.reason,
        "source": decision.source,
        "grant_id": str(decision.grant_id) if decision.grant_id else None,
    }
    await _audit_authorization_decision(
        request=request,
        db=db,
        user=current_user,
        resource=resource,
        action=action,
        decision=decision,
    )
    return decision


def require_permission(resource: str, action: str):
    """Require the effective RBAC+ABAC permission for one route."""

    async def permission_checker(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        decision = await _effective_authorization(
            request=request,
            db=db,
            current_user=current_user,
            resource=resource,
            action=action,
        )
        if not decision.allowed:
            logger.warning(
                "Permission denied user=%s role=%s permission=%s:%s reason=%s",
                current_user.id,
                current_user.role.value,
                resource,
                action,
                decision.reason,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission insuffisante pour {resource}:{action}.",
            )
        return current_user

    return permission_checker


def require_role(*roles: RoleEnum):
    """Require one exact permanent role; temporary grants never change roles."""

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            role_names = [role.value for role in roles]
            logger.warning(
                "Role check denied user=%s current=%s required=%s",
                current_user.id,
                current_user.role.value,
                role_names,
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
    """Require permission plus trusted tenant/institution attributes."""

    async def clearance_checker(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        decision = await _effective_authorization(
            request=request,
            db=db,
            current_user=current_user,
            resource=resource,
            action=action,
            check_tenant=check_tenant,
            check_institution=check_institution,
        )
        if not decision.allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Habilitation insuffisante pour {resource}:{action}.",
            )
        return current_user

    return clearance_checker


def require_any_permission(*permissions: tuple[str, str]):
    """Allow when any effective RBAC+ABAC permission succeeds."""

    async def any_permission_checker(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        denied_reasons: list[str] = []
        for resource, action in permissions:
            decision = await _effective_authorization(
                request=request,
                db=db,
                current_user=current_user,
                resource=resource,
                action=action,
            )
            if decision.allowed:
                return current_user
            denied_reasons.append(f"{resource}:{action}={decision.reason}")

        logger.warning(
            "Any-permission denied user=%s candidates=%s",
            current_user.id,
            denied_reasons,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucune des habilitations demandées n'est active.",
        )

    return any_permission_checker
