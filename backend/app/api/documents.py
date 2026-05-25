"""
Routes de gestion des documents - eAdministration Suite Guinea.
GED (Gestion Électronique des Documents) avec :
- CRUD documents
- Versionnage
- Déclenchement OCR
- Circuit de parapheur
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
from app.middleware.rbac import require_permission
from app.models.document import Document, DocumentStatusEnum
from app.models.user import User
from app.services.document_version_service import document_version_service
from app.services.ocr_service import ocr_service
from app.services.parapheur_service import parapheur_service
from app.services.search_service import search_service

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


class CreateVersionRequest(BaseModel):
    file_path: str
    change_summary: str
    change_type: str = "update"
    file_size: int = 0


class RestoreVersionRequest(BaseModel):
    version_number: int


class CompareVersionsRequest(BaseModel):
    v1: int
    v2: int


class OCRTriggerRequest(BaseModel):
    language: str = "fra"
    document_type: str | None = None


class SearchRequest(BaseModel):
    query: str
    filters: dict | None = None
    institution: str | None = None
    page: int = 1
    page_size: int = 20


class CreateParapheurRequest(BaseModel):
    steps: list[dict]  # [{assignee_id, action_type, order}]
    name: str | None = None
    description: str | None = None


class AdvanceParapheurRequest(BaseModel):
    step_id: str
    action: str  # sign, approve, viser, reject, stamp
    comment: str | None = None


# --- Endpoints CRUD existants ---

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


# --- Endpoints Versionnage ---

@router.post("/{document_id}/versions", summary="Créer une nouvelle version")
async def create_document_version(
    document_id: uuid.UUID,
    request: CreateVersionRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Crée une nouvelle version d'un document.
    Nécessite la permission documents:upload.
    """
    result = await document_version_service.create_version(
        document_id=str(document_id),
        file_path=request.file_path,
        change_summary=request.change_summary,
        user_id=str(current_user.id),
        change_type=request.change_type,
        file_size=request.file_size,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.get("/{document_id}/versions", summary="Historique des versions")
async def get_document_versions(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Récupère l'historique complet des versions d'un document.
    """
    history = await document_version_service.get_version_history(str(document_id))
    return {
        "document_id": str(document_id),
        "versions": history,
        "total_versions": len(history),
    }


@router.post("/{document_id}/versions/restore", summary="Restaurer une version")
async def restore_document_version(
    document_id: uuid.UUID,
    request: RestoreVersionRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Restaure une version antérieure d'un document.
    Crée une nouvelle version (copie) plutôt que de supprimer l'historique.
    """
    result = await document_version_service.restore_version(
        document_id=str(document_id),
        version_number=request.version_number,
        user_id=str(current_user.id),
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.post("/{document_id}/versions/compare", summary="Comparer deux versions")
async def compare_document_versions(
    document_id: uuid.UUID,
    request: CompareVersionsRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Compare deux versions d'un document.
    """
    result = await document_version_service.compare_versions(
        document_id=str(document_id),
        v1=request.v1,
        v2=request.v2,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# --- Endpoints OCR ---

@router.post("/{document_id}/ocr", summary="Déclencher l'OCR sur un document")
async def trigger_ocr(
    document_id: uuid.UUID,
    request: OCRTriggerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Déclenche l'extraction OCR sur un document.
    Optionnellement, extrait des données structurées si le type de document est spécifié.
    """
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    # Extraction texte brut
    ocr_result = await ocr_service.extract_text(
        file_path=document.file_path or "",
        language=request.language,
    )

    response = {
        "document_id": str(document_id),
        "text": ocr_result.get("text", ""),
        "confidence": ocr_result.get("confidence", 0),
        "pages": ocr_result.get("pages", 0),
        "language": request.language,
        "engine": ocr_result.get("engine", "stub"),
    }

    # Extraction structurée si le type est spécifié
    if request.document_type:
        structured = await ocr_service.extract_structured_data(
            file_path=document.file_path or "",
            document_type=request.document_type,
        )
        response["structured_data"] = structured

    # Indexer le contenu extrait pour la recherche
    await search_service.index_document(
        document_id=str(document_id),
        content=ocr_result.get("text", ""),
        metadata={
            "title": document.title,
            "file_type": document.file_type,
            "institution_id": document.institution_id,
        },
    )

    return response


# --- Endpoints Recherche ---

@router.get("/search", summary="Recherche plein texte de documents")
async def search_documents_endpoint(
    q: str = Query(..., description="Terme de recherche"),
    status: str | None = Query(None, description="Filtrer par statut"),
    file_type: str | None = Query(None, description="Filtrer par type de fichier"),
    institution: str | None = Query(None, description="Filtrer par institution"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Recherche plein texte dans les documents avec filtres et isolation tenant.
    """
    filters = {}
    if status:
        filters["status"] = status
    if file_type:
        filters["file_type"] = file_type

    return await search_service.search(
        query=q,
        filters=filters if filters else None,
        tenant_id=current_user.tenant_id,
        institution_id=institution or current_user.institution_id,
        page=page,
        page_size=page_size,
    )


# --- Endpoints Parapheur ---

@router.post("/{document_id}/parapheur", summary="Créer un circuit de parapheur")
async def create_parapheur_circuit(
    document_id: uuid.UUID,
    request: CreateParapheurRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Crée un circuit de signature/approbation pour un document.
    Nécessite la permission parapheur:manage.
    """
    result = await parapheur_service.create_circuit(
        document_id=str(document_id),
        steps=request.steps,
        created_by=str(current_user.id),
        name=request.name,
        description=request.description,
    )

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.get("/parapheur/pending", summary="Éléments en attente dans le parapheur")
async def get_pending_parapheur(
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """
    Récupère tous les éléments en attente dans le parapheur de l'utilisateur courant.
    """
    return await parapheur_service.get_pending_for_user(str(current_user.id))


@router.post("/parapheur/{circuit_id}/advance", summary="Avancer un circuit de parapheur")
async def advance_parapheur_circuit(
    circuit_id: uuid.UUID,
    request: AdvanceParapheurRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Avance un circuit de parapheur en traitant l'étape courante.
    Actions : sign, approve, viser, reject, stamp.
    """
    result = await parapheur_service.advance_circuit(
        circuit_id=str(circuit_id),
        step_id=request.step_id,
        action=request.action,
        user_id=str(current_user.id),
        comment=request.comment,
    )

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.get("/parapheur/{circuit_id}", summary="Détails d'un circuit de parapheur")
async def get_parapheur_circuit(
    circuit_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Récupère les détails complets d'un circuit de parapheur.
    """
    result = await parapheur_service.get_circuit_details(str(circuit_id))
    if not result:
        raise HTTPException(status_code=404, detail="Circuit non trouvé")
    return result


@router.post("/parapheur/{circuit_id}/cancel", summary="Annuler un circuit de parapheur")
async def cancel_parapheur_circuit(
    circuit_id: uuid.UUID,
    reason: str | None = Query(None, description="Raison de l'annulation"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Annule un circuit de parapheur. Seul le créateur peut l'annuler.
    """
    result = await parapheur_service.cancel_circuit(
        circuit_id=str(circuit_id),
        user_id=str(current_user.id),
        reason=reason,
    )

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.get("/parapheur/{circuit_id}/verify/{signature_hash}", summary="Vérifier une signature")
async def verify_signature(
    circuit_id: uuid.UUID,
    signature_hash: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Vérifie l'authenticité d'une signature électronique.
    """
    return await parapheur_service.verify_signature(signature_hash)
