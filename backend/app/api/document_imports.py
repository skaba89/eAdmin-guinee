"""Atomic server-authoritative import for the government GED.

A document and its first immutable version are created in one request from
validated bytes. Clients cannot provide an object-storage path or a digest.
"""

import hashlib
import os
import tempfile
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.document import Document, DocumentStatusEnum
from app.models.document_version import DocumentVersion
from app.models.user import RoleEnum, User
from app.services.object_storage import object_storage
from app.services.upload_security import UploadSecurityService

router = APIRouter()
upload_security = UploadSecurityService()

_ALLOWED_CLASSIFICATIONS = {"PUBLIC", "DIFFUSION LIMITÉE", "CONFIDENTIEL", "SECRET"}
_ALLOWED_TYPES = {"Décret", "Arrêté", "Circulaire", "Note de service", "Rapport", "Ordonnance", "Autre"}


async def _scan_content_or_fail(content: bytes, sanitized_name: str) -> None:
    if settings.is_production and not settings.UPLOAD_ANTIVIRUS_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Le scan antivirus doit être activé en production avant tout import GED.",
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
        if (
            not scan.get("clean")
            or scan.get("scanner") != "clamav"
            or details.startswith("erreur")
            or "timeout" in details
        ):
            raise HTTPException(status_code=400, detail="Fichier refusé par le contrôle antivirus.")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


def _serialize(document: Document, version: DocumentVersion) -> dict:
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
        "file_hash": version.file_hash,
        "server_stored": True,
        "digest_source": "server_bytes",
    }


@router.post(
    "/import",
    status_code=status.HTTP_201_CREATED,
    summary="Importer atomiquement un document officiel dans la GED",
)
async def import_document(
    file: UploadFile = File(...),
    reference: str = Form(...),
    title: str = Form(...),
    document_type: str = Form("Autre"),
    classification: str = Form("PUBLIC"),
    description: str = Form(""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Validate, scan, hash, store and persist the document as one operation."""
    if current_user.role == RoleEnum.CITOYEN:
        raise HTTPException(status_code=403, detail="Import GED réservé aux agents habilités.")

    reference = reference.strip()
    title = title.strip()
    document_type = document_type.strip() or "Autre"
    classification = classification.strip().upper()
    description = description.strip()

    if not reference:
        raise HTTPException(status_code=422, detail="La référence officielle est obligatoire.")
    if not title:
        raise HTTPException(status_code=422, detail="L'objet/titre du document est obligatoire.")
    if len(reference) > 160:
        raise HTTPException(status_code=422, detail="La référence officielle est trop longue.")
    if document_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=422, detail="Type de document non reconnu.")
    if classification not in _ALLOWED_CLASSIFICATIONS:
        raise HTTPException(status_code=422, detail="Classification non reconnue.")

    # Reference uniqueness is enforced within the visible RLS scope.
    existing = (
        await db.execute(
            select(Document).where(Document.tags["reference"].as_string() == reference)
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Cette référence officielle existe déjà dans votre périmètre GED.")

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
    document_id = uuid.uuid4()
    tenant_id = getattr(current_user, "tenant_id", None) or settings.TENANT_DEFAULT_ID
    object_key = f"documents/{tenant_id}/{document_id}/v1/{uuid.uuid4().hex}/{sanitized}"

    await object_storage.put_bytes(object_key, content, content_type)
    try:
        now = datetime.now(timezone.utc)
        document = Document(
            id=document_id,
            title=title,
            description=description or None,
            file_path=object_key,
            file_type=content_type,
            file_size=len(content),
            version=1,
            current_version=1,
            status=DocumentStatusEnum.DRAFT,
            tags={
                "reference": reference,
                "document_type": document_type,
                "classification": classification,
                "original_name": file.filename or sanitized,
                "storage": "object_storage",
            },
            owner_id=current_user.id,
            tenant_id=tenant_id,
            institution_id=current_user.institution_id,
            updated_at=now,
        )
        db.add(document)
        await db.flush()

        version = DocumentVersion(
            document_id=document.id,
            version_number=1,
            file_path=object_key,
            file_size=len(content),
            file_hash=digest,
            change_summary="Import initial dans la GED sécurisée",
            change_type="create",
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
        await db.flush()
        return _serialize(document, version)
    except Exception:
        await object_storage.delete(object_key)
        raise
