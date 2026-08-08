"""Read-only institution catalog for authenticated request routing."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.institution import Institution
from app.models.user import User

router = APIRouter()


@router.get("", summary="Institutions actives du périmètre national")
async def list_institutions(
    institution_type: str | None = Query(None, alias="type"),
    search: str | None = Query(None, max_length=100),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return active institutions from the authenticated user's tenant only."""

    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID
    query = select(Institution).where(
        Institution.tenant_id == tenant_id,
        Institution.is_active.is_(True),
    )

    if institution_type:
        query = query.where(Institution.type == institution_type)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Institution.name.ilike(term),
                Institution.id.ilike(term),
                Institution.code.ilike(term),
            )
        )

    result = await db.execute(query.order_by(Institution.type, Institution.name).limit(limit))
    items = result.scalars().all()
    return {
        "items": [
            {
                "id": institution.id,
                "name": institution.name,
                "type": institution.type,
                "code": institution.code,
                "parentId": institution.parent_id,
            }
            for institution in items
        ]
    }
