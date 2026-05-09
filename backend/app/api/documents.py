"""
Routes de gestion des documents - eAdministration Suite Guinea.
GED (Gestion Électronique des Documents).
"""

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.document import Document, DocumentStatusEnum
from app.models.user import User

router = APIRouter()


# --- Schémas Pydantic ---
class DocumentCreate(BaseModel):
    title: str
    description: str | None = None
    file_path: str | None = None
    file_type: str | None = None
    file_size: int | None = None
    tags: dict[str, Any] | None = None
    institution_id: str | None = None


class DocumentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: DocumentStatusEnum | None = None
    tags: dict[str, Any] | None = None


class DocumentResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    file_path: str | None
    file_type: str | None
    file_size: int | None
    version: int
    status: DocumentStatusEnum
    tags: dict[str, Any] | None
    owner_id: uuid.UUID
    institution_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedDocuments(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Endpoints ---

@router.get("", response_model=PaginatedDocuments, summary="Liste des documents")
async def list_documents(
    page: int = Query(1, ge=1, description="Numéro de page"),
    page_size: int = Query(20, ge=1, le=100, description="Éléments par page"),
    status_filter: DocumentStatusEnum | None = Query(None, alias="status", description="Filtrer par statut"),
    search: str | None = Query(None, description="Recherche dans le titre"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedDocuments:
    """
    Liste paginée des documents avec filtres optionnels.
    """
    query = select(Document)

    if status_filter:
        query = query.where(Document.status == status_filter)
    if search:
        query = query.where(Document.title.ilike(f"%{search}%"))

    # Comptage total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Document.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    documents = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size

    return PaginatedDocuments(
        items=documents,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED, summary="Créer un document")
async def create_document(
    doc_data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Document:
    """
    Crée un nouveau document dans la GED.
    """
    document = Document(
        title=doc_data.title,
        description=doc_data.description,
        file_path=doc_data.file_path,
        file_type=doc_data.file_type,
        file_size=doc_data.file_size,
        tags=doc_data.tags,
        owner_id=current_user.id,
        institution_id=doc_data.institution_id or current_user.institution,
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)
    return document


@router.get("/{document_id}", response_model=DocumentResponse, summary="Détail d'un document")
async def get_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Document:
    """
    Récupère un document par son identifiant.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé",
        )
    return document


@router.put("/{document_id}", response_model=DocumentResponse, summary="Mettre à jour un document")
async def update_document(
    document_id: uuid.UUID,
    doc_data: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Document:
    """
    Met à jour les métadonnées d'un document.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé",
        )

    update_data = doc_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)

    # Incrémenter la version si le statut change
    if doc_data.status and doc_data.status != document.status:
        document.version += 1

    await db.flush()
    await db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Supprimer un document")
async def delete_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Suppression logique (archivage) d'un document.
    Le document n'est pas réellement supprimé de la base.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé",
        )

    document.status = DocumentStatusEnum.ARCHIVED
    await db.flush()
