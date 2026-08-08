"""Server-authoritative file operations for the government GED.

This router intentionally owns the unsafe legacy version-mutation paths before
``documents.router`` is registered. Official document versions are created only
from bytes received, validated, malware-scanned and stored by the backend.
"""

import hashlib
import os
import tempfile
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.user import User
from app.services.object_storage import object_storage
from app.services.upload_security import UploadSecurityService

router = APIRouter()
upload_security = UploadSecurityService()


class RestoreVersionRequest(BaseModel):
    version_number: int


async def _load_document(db: AsyncSession, document_id: uuid.UUID) -> Document:
    document = (
        await db.execute(select(Document).where(Document.id == document_id))
    ).scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    return document


async def _next_version_number(db: AsyncSession, document_id: uuid.UUID) -> int:
    current = (
        await db.execute(
            select(func.max(DocumentVersion.version_number)).where(
                DocumentVersion.document_id == document_id
            )
        )
    ).scalar()
    return int(current or 0) + 1


async def _scan_content_or_fail(content: bytes, sanitized_name: str) -> None:
    """National production is fail-closed when malware scanning is unavailable."""
    if settings.is_production and not settings.UPLOAD_ANTIVIRUS_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Le scan antivirus doit être activé en production avant tout upload GED.",
        )

    if not settings.UPLOAD_ANTIVIRUS_ENABLED:
        return

    temp_path = ""
    try:
        suffix = os.path.splitext(sanitized_name)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(content)
            temp_path = temp.name

        scan = await upload_security.scan_for_virus(temp_path)
        details = str(scan.get("details", "")).lower()
        scan_failed = (
            not scan.get("clean")
            or scan.get("scanner") != "clamav"
            or details.startswith("erreur")
            or "timeout" in details
        )
        if scan_failed:
            raise HTTPException(
                status_code=400,
                detail="Fichier refusé par le contrôle antivirus.",
            )
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@router.post(
    "/{document_id}/versions",
    status_code=status.HTTP_201_CREATED,
    summary="Uploader une version GED autoritative",
)
async def upload_document_version(
    document_id: uuid.UUID,
    file: UploadFile = File(...),
    change_summary: str = Form(...),
    change_type: str = Form("update"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Create a version only from backend-validated file bytes.

    The client cannot provide a path or a digest. SHA-256 is computed from the
    exact bytes that are stored in object storage.
    """
    document = await _load_document(db, document_id)

    validation = await upload_security.validate_upload(file)
    if not validation.get("valid"):
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Fichier GED rejeté",
                "errors": validation.get("errors", []),
            },
        )

    content = await file.read()
    sanitized = str(validation["sanitized_name"])
    content_type = str(validation.get("content_type") or "application/octet-stream")
    await _scan_content_or_fail(content, sanitized)

    digest = hashlib.sha256(content).hexdigest()
    version_number = await _next_version_number(db, document_id)
    tenant_id = (
        getattr(document, "tenant_id", None)
        or getattr(current_user, "tenant_id", None)
        or settings.TENANT_DEFAULT_ID
    )
    object_key = (
        f"documents/{tenant_id}/{document_id}/v{version_number}/"
        f"{uuid.uuid4().hex}/{sanitized}"
    )

    await object_storage.put_bytes(object_key, content, content_type)
    try:
        version = DocumentVersion(
            document_id=document_id,
            version_number=version_number,
            file_path=object_key,
            file_size=len(content),
            file_hash=digest,
            change_summary=change_summary.strip(),
            change_type=change_type.strip() or "update",
            changed_by=current_user.id,
            metadata_={
                "original_name": file.filename or sanitized,
                "sanitized_name": sanitized,
                "content_type": content_type,
                "storage": "object_storage",
                "digest_source": "server_bytes",
                "validation_warnings": validation.get("warnings", []),
            },
        )
        db.add(version)

        document.version = version_number
        document.current_version = version_number
        document.file_path = object_key
        document.file_type = content_type
        document.file_size = len(content)
        document.updated_at = datetime.now(timezone.utc)
        await db.flush()
    except Exception:
        await object_storage.delete(object_key)
        raise

    return {
        "version_id": str(version.id),
        "document_id": str(document_id),
        "version_number": version_number,
        "file_hash": digest,
        "file_size": len(content),
        "content_type": content_type,
        "change_summary": version.change_summary,
        "change_type": version.change_type,
        "server_stored": True,
        "digest_source": "server_bytes",
    }


@router.post(
    "/{document_id}/versions/restore",
    status_code=status.HTTP_201_CREATED,
    summary="Restaurer une version GED sans recalcul fictif",
)
async def restore_document_version(
    document_id: uuid.UUID,
    payload: RestoreVersionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Restore by referencing the exact immutable object/hash of a past version."""
    document = await _load_document(db, document_id)
    source = (
        await db.execute(
            select(DocumentVersion).where(
                DocumentVersion.document_id == document_id,
                DocumentVersion.version_number == payload.version_number,
            )
        )
    ).scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Version à restaurer introuvable")
    if not source.file_hash or not source.file_path:
        raise HTTPException(
            status_code=409,
            detail="Cette version historique ne possède pas de preuve fichier exploitable.",
        )

    version_number = await _next_version_number(db, document_id)
    restored = DocumentVersion(
        document_id=document_id,
        version_number=version_number,
        file_path=source.file_path,
        file_size=source.file_size,
        file_hash=source.file_hash,
        change_summary=f"Restauration de la version {payload.version_number}",
        change_type="restore",
        changed_by=current_user.id,
        metadata_={
            **(source.metadata_ or {}),
            "restored_from": payload.version_number,
            "restored_source_version_id": str(source.id),
            "digest_source": "preserved_server_hash",
        },
    )
    db.add(restored)

    document.version = version_number
    document.current_version = version_number
    document.file_path = source.file_path
    document.file_size = source.file_size
    document.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return {
        "restored": True,
        "document_id": str(document_id),
        "from_version": payload.version_number,
        "version_number": version_number,
        "file_hash": source.file_hash,
        "server_stored": True,
    }


@router.get(
    "/{document_id}/versions/{version_number}/download",
    summary="URL temporaire de téléchargement d'une version GED",
)
async def download_document_version(
    document_id: uuid.UUID,
    version_number: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str | int]:
    await _load_document(db, document_id)
    version = (
        await db.execute(
            select(DocumentVersion).where(
                DocumentVersion.document_id == document_id,
                DocumentVersion.version_number == version_number,
            )
        )
    ).scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version introuvable")

    metadata = version.metadata_ or {}
    if metadata.get("storage") != "object_storage":
        raise HTTPException(
            status_code=409,
            detail="Cette version historique n'est pas disponible dans le stockage GED sécurisé.",
        )

    return {
        "url": await object_storage.presigned_get_url(version.file_path, expires_minutes=5),
        "expires_minutes": 5,
    }
