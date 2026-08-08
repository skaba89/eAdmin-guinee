"""Fail-closed OCR routes backed by real GED object bytes and persisted evidence."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.document import Document
from app.models.document_ocr import DocumentOCRResult
from app.models.document_version import DocumentVersion
from app.models.user import RoleEnum, User
from app.services.ocr_service import ocr_service

router = APIRouter()


class OCRTriggerRequest(BaseModel):
    language: str = "fra"
    document_type: str | None = None


def _serialize(result: DocumentOCRResult, *, cached: bool) -> dict[str, Any]:
    return {
        "ocr_result_id": str(result.id),
        "document_id": str(result.document_id),
        "version_number": result.version_number,
        "document_hash": result.document_hash,
        "language": result.language,
        "engine": result.engine,
        "confidence": result.confidence,
        "pages": result.page_count,
        "text": result.extracted_text,
        "structured_data": result.structured_data,
        "synthetic": False,
        "cached": cached,
        "created_at": result.created_at.isoformat() if result.created_at else None,
    }


async def _load_document_and_version(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> tuple[Document, DocumentVersion]:
    document = (
        await db.execute(select(Document).where(Document.id == document_id))
    ).scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé.")
    if not document.file_path or document.current_version < 1:
        raise HTTPException(
            status_code=409,
            detail="Le document ne possède aucune version fichier sécurisée à OCRiser.",
        )

    version = (
        await db.execute(
            select(DocumentVersion).where(
                DocumentVersion.document_id == document.id,
                DocumentVersion.version_number == document.current_version,
            )
        )
    ).scalar_one_or_none()
    if not version or not version.file_hash:
        raise HTTPException(
            status_code=409,
            detail="La version courante ne possède pas de hash serveur vérifiable.",
        )
    return document, version


def _raise_ocr_error(result: dict) -> None:
    code = result.get("error_code")
    detail = str(result.get("error") or "Échec OCR.")
    if code in {"ocr_unavailable", "pdf_renderer_unavailable"}:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
    if code in {"unsupported_language", "unsupported_format", "missing_object", "empty_file", "file_too_large"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)
    if code == "ocr_timeout":
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=detail)
    if code == "storage_read_failed":
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


@router.post("/{document_id}/ocr", summary="Exécuter l'OCR réel sur la version courante")
async def trigger_real_ocr(
    document_id: uuid.UUID,
    request: OCRTriggerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    if current_user.role == RoleEnum.CITOYEN:
        raise HTTPException(status_code=403, detail="OCR GED réservé aux agents habilités.")

    document, version = await _load_document_and_version(db, document_id)
    language = request.language.strip().lower()

    existing = (
        await db.execute(
            select(DocumentOCRResult).where(
                DocumentOCRResult.document_id == document.id,
                DocumentOCRResult.version_number == version.version_number,
                DocumentOCRResult.language == language,
            )
        )
    ).scalar_one_or_none()
    if existing:
        if existing.document_hash != version.file_hash:
            raise HTTPException(
                status_code=409,
                detail="Conflit d'intégrité OCR: la version et son hash ne correspondent plus.",
            )
        return _serialize(existing, cached=True)

    ocr_result = await ocr_service.extract_text(
        file_path=version.file_path,
        language=language,
        content_type=document.file_type,
    )
    if ocr_result.get("error"):
        _raise_ocr_error(ocr_result)

    structured_data = None
    if request.document_type:
        structured_data = ocr_service.extract_structured_text(
            ocr_result.get("text", ""),
            request.document_type,
        )

    result = DocumentOCRResult(
        document_id=document.id,
        version_number=version.version_number,
        document_hash=version.file_hash,
        language=language,
        engine=str(ocr_result.get("engine") or "tesseract"),
        confidence=float(ocr_result.get("confidence") or 0.0),
        page_count=int(ocr_result.get("pages") or 0),
        extracted_text=str(ocr_result.get("text") or ""),
        structured_data=structured_data,
        created_by=current_user.id,
        tenant_id=document.tenant_id or current_user.tenant_id,
        institution_id=document.institution_id,
    )
    db.add(result)
    await db.flush()
    await db.refresh(result)
    return _serialize(result, cached=False)


@router.get("/{document_id}/ocr/latest", summary="Dernier résultat OCR vérifiable")
async def latest_real_ocr(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    document, _version = await _load_document_and_version(db, document_id)
    result = (
        await db.execute(
            select(DocumentOCRResult)
            .where(DocumentOCRResult.document_id == document.id)
            .order_by(desc(DocumentOCRResult.version_number), desc(DocumentOCRResult.created_at))
            .limit(1)
        )
    ).scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Aucun résultat OCR réel pour ce document.")
    return _serialize(result, cached=True)


@router.get("/{document_id}/ocr/history", summary="Historique OCR lié aux versions")
async def real_ocr_history(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    document, _version = await _load_document_and_version(db, document_id)
    results = (
        await db.execute(
            select(DocumentOCRResult)
            .where(DocumentOCRResult.document_id == document.id)
            .order_by(desc(DocumentOCRResult.version_number), desc(DocumentOCRResult.created_at))
        )
    ).scalars().all()
    return {
        "document_id": str(document.id),
        "items": [_serialize(result, cached=True) for result in results],
        "total": len(results),
    }
