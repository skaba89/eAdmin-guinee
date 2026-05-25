"""
Document Search & Indexing API - eAdministration Suite Guinea.
Full-text search, OCR extraction, and document intelligence.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.document import Document, DocumentStatusEnum
from app.models.document_version import DocumentVersion
from app.models.user import User
from app.api.auth import get_current_user
from app.services.ocr_service import ocr_service

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    institution: str | None = None
    classification: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    status: str | None = None


class SearchResult(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    classification: str | None
    status: str
    institution: str | None
    version: int
    relevance_score: float
    snippet: str | None


class OCRRequest(BaseModel):
    document_id: uuid.UUID
    language: str = "fra"


class VersionInfo(BaseModel):
    version_number: int
    change_type: str
    change_summary: str | None
    created_at: str
    changed_by: str


@router.post("/search", summary="Recherche de documents")
async def search_documents(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Full-text search across documents with RLS filtering.
    Returns matching documents ranked by relevance.
    """
    query = select(Document)

    # Apply text search
    if request.query:
        search_term = f"%{request.query}%"
        query = query.where(
            or_(
                Document.title.ilike(search_term),
                Document.description.ilike(search_term),
            )
        )

    # Apply filters
    if request.institution:
        query = query.where(Document.institution_id == request.institution)
    if request.status:
        try:
            query = query.where(Document.status == DocumentStatusEnum(request.status))
        except ValueError:
            pass

    # Apply RLS: non-admin users see only their institution
    if current_user.role.value not in ("SUPER_ADMIN", "ADMIN"):
        if current_user.institution:
            query = query.where(Document.institution_id == current_user.institution)

    result = await db.execute(query.limit(50))
    documents = result.scalars().all()

    return {
        "total": len(documents),
        "query": request.query,
        "results": [
            {
                "id": str(doc.id),
                "title": doc.title,
                "description": doc.description,
                "institution": doc.institution_id,
                "status": doc.status.value if hasattr(doc.status, 'value') else str(doc.status),
                "version": getattr(doc, 'current_version', 1),
                "relevance_score": 1.0,  # Placeholder for real relevance scoring
            }
            for doc in documents
        ]
    }


@router.post("/ocr", summary="Extraction OCR d'un document")
async def extract_ocr(
    request: OCRRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Extract text from a document using OCR.
    Returns extracted text, confidence, and processing metadata.
    """
    # Verify document exists
    result = await db.execute(select(Document).where(Document.id == request.document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    # Check access permissions
    if current_user.role.value not in ("SUPER_ADMIN", "ADMIN"):
        if document.institution_id != current_user.institution:
            raise HTTPException(status_code=403, detail="Accès refusé")

    # Run OCR
    ocr_result = await ocr_service.extract_text(
        file_path=document.file_path or "",
        file_type=document.file_type or "application/pdf",
        language=request.language,
    )

    return {
        "document_id": str(document.id),
        "text": ocr_result.text,
        "confidence": ocr_result.confidence,
        "language": ocr_result.language,
        "page_count": ocr_result.page_count,
        "processing_time_ms": ocr_result.processing_time_ms,
        "engine": ocr_result.engine,
    }


@router.get("/{document_id}/versions", summary="Historique des versions")
async def get_document_versions(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the version history of a document."""
    result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version_number.desc())
    )
    versions = result.scalars().all()

    return {
        "document_id": str(document_id),
        "versions": [
            {
                "version_number": v.version_number,
                "change_type": v.change_type,
                "change_summary": v.change_summary,
                "file_hash": v.file_hash[:16] + "...",  # Partial hash for security
                "created_at": v.created_at.isoformat(),
            }
            for v in versions
        ]
    }


@router.post("/{document_id}/stamp", summary="Apposer un cachet électronique")
async def apply_electronic_stamp(
    document_id: uuid.UUID,
    stamp_type: str = Query(..., description="Type: official, certified, registered, urgent"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Apply an electronic stamp (cachet électronique) to a document.
    Creates a tamper-proof digital stamp with verification hash.
    """
    import hashlib
    from datetime import datetime, timezone

    # Verify document
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")

    # Check permissions — only directors+ can apply stamps
    if current_user.role.value not in ("SUPER_ADMIN", "ADMIN", "DIRECTOR"):
        raise HTTPException(status_code=403, detail="Permissions insuffisantes pour apposer un cachet")

    # Generate stamp hash (document ID + timestamp + user ID + stamp type)
    stamp_data = f"{document.id}:{datetime.now(timezone.utc).isoformat()}:{current_user.id}:{stamp_type}"
    stamp_hash = hashlib.sha256(stamp_data.encode()).hexdigest()

    # Generate verification URL
    verification_url = f"https://eadmin.gouv.gn/verify/stamp/{stamp_hash[:16]}"

    # Create stamp record
    from app.models.electronic_stamp import ElectronicStamp
    stamp = ElectronicStamp(
        document_id=document.id,
        stamped_by=current_user.id,
        stamp_type=stamp_type,
        institution=current_user.institution or "Unknown",
        stamp_hash=stamp_hash,
        verification_url=verification_url,
        metadata_={
            "document_title": document.title,
            "stamper_name": current_user.full_name,
            "stamper_role": current_user.role.value,
        }
    )
    db.add(stamp)
    await db.flush()

    return {
        "stamp_id": str(stamp.id),
        "document_id": str(document.id),
        "stamp_type": stamp_type,
        "stamp_hash": stamp_hash,
        "verification_url": verification_url,
        "institution": current_user.institution,
        "stamped_by": current_user.full_name,
        "stamped_at": datetime.now(timezone.utc).isoformat(),
    }
