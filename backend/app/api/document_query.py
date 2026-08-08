"""RLS-scoped query surface for the government GED."""

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.document import Document, DocumentStatusEnum
from app.models.user import User

router = APIRouter()

_ALLOWED_CLASSIFICATIONS = {"PUBLIC", "DIFFUSION LIMITÉE", "CONFIDENTIEL", "SECRET"}
_ALLOWED_TYPES = {"Décret", "Arrêté", "Circulaire", "Note de service", "Rapport", "Ordonnance", "Autre"}


def _serialize(document: Document) -> dict[str, Any]:
    return {
        "id": str(document.id),
        "title": document.title,
        "description": document.description,
        "file_path": document.file_path,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "version": document.version,
        "status": document.status.value if hasattr(document.status, "value") else str(document.status),
        "tags": document.tags or {},
        "owner_id": str(document.owner_id),
        "institution_id": document.institution_id,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "updated_at": document.updated_at.isoformat() if document.updated_at else None,
    }


@router.get("/statistics", summary="Statistiques GED du périmètre courant")
async def document_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    classification_expr = Document.tags["classification"].as_string()
    type_expr = Document.tags["document_type"].as_string()

    result = await db.execute(
        select(
            func.count(Document.id).label("total"),
            func.sum(case((Document.status == DocumentStatusEnum.ARCHIVED, 1), else_=0)).label("archived"),
            func.sum(case((Document.status == DocumentStatusEnum.DRAFT, 1), else_=0)).label("draft"),
            func.sum(case((Document.status == DocumentStatusEnum.PENDING_REVIEW, 1), else_=0)).label("pending"),
            func.sum(case((Document.status == DocumentStatusEnum.APPROVED, 1), else_=0)).label("approved"),
            func.sum(case((classification_expr.in_(["CONFIDENTIEL", "SECRET"]), 1), else_=0)).label("sensitive"),
            func.sum(case((type_expr.in_(["Décret", "Arrêté"]), 1), else_=0)).label("acts"),
        )
    )
    row = result.one()
    return {
        "total": int(row.total or 0),
        "archived": int(row.archived or 0),
        "draft": int(row.draft or 0),
        "pending": int(row.pending or 0),
        "approved": int(row.approved or 0),
        "sensitive": int(row.sensitive or 0),
        "acts": int(row.acts or 0),
    }


@router.get("", summary="Recherche paginée des documents GED")
async def query_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: str | None = Query(None),
    status_filter: DocumentStatusEnum | None = Query(None, alias="status"),
    classification: str | None = Query(None),
    document_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    query = select(Document)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Document.title.ilike(term),
                Document.description.ilike(term),
                Document.tags["reference"].as_string().ilike(term),
            )
        )
    if status_filter:
        query = query.where(Document.status == status_filter)
    if classification:
        normalized = classification.strip().upper()
        if normalized in _ALLOWED_CLASSIFICATIONS:
            query = query.where(Document.tags["classification"].as_string() == normalized)
    if document_type:
        normalized_type = document_type.strip()
        if normalized_type in _ALLOWED_TYPES:
            query = query.where(Document.tags["document_type"].as_string() == normalized_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = int((await db.execute(count_query)).scalar() or 0)
    offset = (page - 1) * page_size
    documents = (
        await db.execute(
            query.order_by(Document.created_at.desc()).offset(offset).limit(page_size)
        )
    ).scalars().all()

    return {
        "items": [_serialize(document) for document in documents],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }
