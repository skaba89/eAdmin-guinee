"""Authoritative PostgreSQL full-text search API for GED documents."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.user import RoleEnum, User
from app.services.search_service import search_service

router = APIRouter()


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=300)
    institution: str | None = None
    classification: str | None = None
    document_type: str | None = None
    file_type: str | None = None
    status: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


def _tenant_scope(current_user: User) -> str | None:
    if current_user.role == RoleEnum.SUPER_ADMIN:
        return None
    return current_user.tenant_id


def _filters(
    *,
    institution: str | None,
    classification: str | None,
    document_type: str | None,
    file_type: str | None,
    status: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
) -> dict[str, Any]:
    return {
        key: value
        for key, value in {
            "institution": institution,
            "classification": classification,
            "document_type": document_type,
            "file_type": file_type,
            "status": status,
            "date_from": date_from,
            "date_to": date_to,
        }.items()
        if value is not None and value != ""
    }


@router.get("/search", summary="Recherche plein texte GED")
async def search_documents_get(
    q: str = Query(..., min_length=1, max_length=300),
    institution: str | None = Query(None),
    classification: str | None = Query(None),
    document_type: str | None = Query(None),
    file_type: str | None = Query(None),
    status: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await search_service.search(
        query=q,
        filters=_filters(
            institution=institution,
            classification=classification,
            document_type=document_type,
            file_type=file_type,
            status=status,
            date_from=date_from,
            date_to=date_to,
        ),
        tenant_id=_tenant_scope(current_user),
        page=page,
        page_size=page_size,
        session=db,
    )


@router.post("/search", summary="Recherche plein texte GED avancée")
async def search_documents_post(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await search_service.search(
        query=request.query,
        filters=_filters(
            institution=request.institution,
            classification=request.classification,
            document_type=request.document_type,
            file_type=request.file_type,
            status=request.status,
            date_from=request.date_from,
            date_to=request.date_to,
        ),
        tenant_id=_tenant_scope(current_user),
        page=request.page,
        page_size=request.page_size,
        session=db,
    )
