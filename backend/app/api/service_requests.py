"""Citizen service-request API backed by PostgreSQL and object storage."""

import hashlib
import os
import secrets
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.middleware.rbac import require_permission
from app.models.institution import Institution
from app.models.service_request import (
    DeliveryModeEnum,
    GeneratedServiceDocument,
    ServiceRequest,
    ServiceRequestAttachment,
    ServiceRequestNote,
    ServiceRequestStatusEnum,
)
from app.models.user import RoleEnum, User
from app.services.object_storage import object_storage
from app.services.service_catalog import get_active_service, get_service_version
from app.services.service_document_templates import render_approved_document
from app.services.upload_security import upload_security

router = APIRouter()

ALLOWED_TRANSITIONS: dict[ServiceRequestStatusEnum, set[ServiceRequestStatusEnum]] = {
    ServiceRequestStatusEnum.SOUMISE: {
        ServiceRequestStatusEnum.EN_COURS,
        ServiceRequestStatusEnum.REJETEE,
    },
    ServiceRequestStatusEnum.EN_COURS: {
        ServiceRequestStatusEnum.PIECES_COMPLEMENTAIRES,
        ServiceRequestStatusEnum.VALIDEE,
        ServiceRequestStatusEnum.REJETEE,
    },
    ServiceRequestStatusEnum.PIECES_COMPLEMENTAIRES: {
        ServiceRequestStatusEnum.EN_COURS,
        ServiceRequestStatusEnum.REJETEE,
    },
    ServiceRequestStatusEnum.VALIDEE: {
        ServiceRequestStatusEnum.PRETE,
        ServiceRequestStatusEnum.REJETEE,
    },
    ServiceRequestStatusEnum.PRETE: {ServiceRequestStatusEnum.LIVREE},
    ServiceRequestStatusEnum.LIVREE: set(),
    ServiceRequestStatusEnum.REJETEE: set(),
}


class ServiceRequestCreate(BaseModel):
    service_id: str = Field(min_length=1, max_length=100)
    # Compatibility-only hints from older clients. The server deliberately
    # ignores them and resolves authoritative metadata from service_id.
    service_name: str | None = Field(default=None, max_length=255)
    category: str | None = Field(default=None, max_length=150)
    category_id: str | None = Field(default=None, max_length=100)
    target_institution_id: str = Field(min_length=1, max_length=100)
    citizen_name: str = Field(min_length=1, max_length=150)
    citizen_first_name: str = Field(min_length=1, max_length=150)
    citizen_nin: str = Field(min_length=3, max_length=120)
    citizen_phone: str = Field(min_length=3, max_length=50)
    citizen_email: EmailStr
    citizen_address: str = Field(min_length=3, max_length=500)
    motif: str = Field(min_length=3, max_length=5000)
    required_documents: list[str] = Field(default_factory=list)
    mairie: str | None = Field(default=None, max_length=255)
    delivery_mode: DeliveryModeEnum = DeliveryModeEnum.EN_LIGNE


class StatusUpdate(BaseModel):
    status: ServiceRequestStatusEnum
    note: str | None = Field(default=None, max_length=5000)


class AssignmentUpdate(BaseModel):
    # Compatibility-only hints from the historical frontend. Assignment is
    # server-authoritative: these values are never trusted as agent identity.
    agent_id: uuid.UUID | None = None
    agent_name: str = Field(min_length=1, max_length=255)


class NoteCreate(BaseModel):
    text: str = Field(min_length=1, max_length=10000)
    note_type: str = Field(default="note", max_length=50)


class CompletionRequest(BaseModel):
    delivery_mode: DeliveryModeEnum
    delivery_location: str | None = Field(default=None, max_length=500)


class GeneratedDocumentCreate(BaseModel):
    """Legacy client payload accepted for compatibility but never trusted."""

    title: str = Field(min_length=1, max_length=500)
    html_content: str = Field(min_length=1, max_length=2_000_000)
    file_name: str = Field(min_length=1, max_length=255)


class SatisfactionCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=5000)


def _add_business_days(start: datetime, days: int) -> datetime:
    """Add weekdays only. Holiday policy will be externalized/versioned later."""
    current = start
    added = 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() < 5:
            added += 1
    return current


def _reference() -> str:
    return f"GN-{datetime.now(timezone.utc).year}-{secrets.token_hex(5).upper()}"


def _default_timeline() -> list[dict[str, Any]]:
    return [
        {
            "label": "Soumission de la demande",
            "status": "completed",
            "date": datetime.now(timezone.utc).isoformat(),
        },
        {"label": "Vérification des pièces justificatives", "status": "pending"},
        {"label": "Traitement par le service compétent", "status": "pending"},
        {"label": "Validation par le responsable", "status": "pending"},
        {"label": "Document prêt", "status": "pending"},
        {"label": "Livraison / Retrait", "status": "pending"},
    ]


def _is_staff(user: User) -> bool:
    """Compatibility helper retained for tests and legacy call sites."""
    return user.role != RoleEnum.CITOYEN


def _status_permission_action(target_status: ServiceRequestStatusEnum) -> str:
    """Map a workflow decision to the IAM permission that must authorize it."""
    if target_status == ServiceRequestStatusEnum.VALIDEE:
        return "approve"
    if target_status == ServiceRequestStatusEnum.REJETEE:
        return "reject"
    return "process"


def _ensure_transition_business_invariants(
    item: ServiceRequest,
    target_status: ServiceRequestStatusEnum,
) -> None:
    """Reject workflow states whose required business evidence is absent."""
    if target_status == ServiceRequestStatusEnum.PRETE and item.generated_document is None:
        raise HTTPException(
            status_code=409,
            detail="Un document administratif enregistré est requis avant le passage au statut 'prete'.",
        )


def _apply_request_scope(query: Select, current_user: User) -> Select:
    """Apply the authoritative dossier visibility boundary in application code.

    PostgreSQL RLS remains the database-level barrier. This explicit predicate is
    defense in depth and makes the municipality rule visible/testable in the API:
    - SUPER_ADMIN: global visibility;
    - MINISTRE: tenant-wide visibility;
    - operational staff (including mairie admins): their institution only;
    - CITOYEN: only requests they personally own.

    A municipality therefore cannot read or mutate another municipality's
    dossier even if a client tampers with IDs, headers or frontend state.
    """
    if current_user.role == RoleEnum.SUPER_ADMIN:
        return query

    tenant_id = (current_user.tenant_id or settings.TENANT_DEFAULT_ID).strip()
    scoped = query.where(ServiceRequest.tenant_id == tenant_id)

    if current_user.role == RoleEnum.CITOYEN:
        return scoped.where(ServiceRequest.citizen_id == current_user.id)

    if current_user.role == RoleEnum.MINISTRE:
        return scoped

    institution_id = (current_user.institution_id or "").strip()
    if not institution_id:
        raise HTTPException(
            status_code=403,
            detail="Périmètre institutionnel absent du compte administratif.",
        )
    return scoped.where(ServiceRequest.institution_id == institution_id)


def _serialize_request(item: ServiceRequest) -> dict[str, Any]:
    notes = sorted(
        item.notes or [],
        key=lambda note: note.created_at or datetime.min.replace(tzinfo=timezone.utc),
    )
    attachments = sorted(
        item.attachments or [],
        key=lambda att: att.uploaded_at or datetime.min.replace(tzinfo=timezone.utc),
    )

    generated = None
    if item.generated_document:
        generated = {
            "id": str(item.generated_document.id),
            "title": item.generated_document.title,
            "htmlContent": item.generated_document.html_content,
            "contentHash": item.generated_document.content_hash,
            "generatedAt": item.generated_document.generated_at.isoformat(),
            "generatedBy": item.generated_document.generated_by_name,
            "fileName": item.generated_document.file_name,
            "templateServiceVersion": item.generated_document.template_service_version,
            "templateHash": item.generated_document.template_hash,
            "templateSourceReference": item.generated_document.template_source_reference,
            "renderedServerSide": item.generated_document.rendered_server_side,
        }

    satisfaction = None
    if item.satisfaction_rating:
        satisfaction = {
            "rating": item.satisfaction_rating,
            "comment": item.satisfaction_comment or "",
            "ratedAt": (
                item.satisfaction_rated_at.isoformat()
                if item.satisfaction_rated_at
                else None
            ),
        }

    return {
        "id": str(item.id),
        "reference": item.reference,
        "serviceId": item.service_id,
        "serviceName": item.service_name,
        "category": item.category,
        "categoryId": item.category_id,
        "serviceCatalogVersion": item.service_catalog_version,
        "servicePolicyStatus": item.service_policy_status,
        "servicePolicySource": item.service_policy_source,
        "serviceFeeLabel": item.service_fee_label,
        "expectedProcessingLabel": item.expected_processing_label,
        "citizenName": item.citizen_name,
        "citizenFirstName": item.citizen_first_name,
        "citizenNIN": item.citizen_nin,
        "citizenPhone": item.citizen_phone,
        "citizenEmail": item.citizen_email,
        "citizenAddress": item.citizen_address,
        "motif": item.motif,
        "documents": item.required_documents or [],
        "uploadedDocuments": [
            {
                "id": str(att.id),
                "name": att.original_name,
                "type": att.content_type,
                "size": att.file_size,
                "data": "",
                "uploadedAt": att.uploaded_at.isoformat(),
                "requiredDocName": att.required_doc_name or "",
                "verified": att.verified,
                "serverStored": True,
            }
            for att in attachments
        ],
        "generatedDocument": generated,
        "satisfaction": satisfaction,
        "status": item.status.value,
        "assignedService": item.assigned_service,
        "assignedAgent": item.assigned_agent_name or "",
        "processingNotes": [
            {
                "id": str(note.id),
                "author": note.author_name,
                "authorRole": note.author_role,
                "text": note.text,
                "date": note.created_at.isoformat(),
                "type": note.note_type,
            }
            for note in notes
        ],
        "timeline": item.timeline or [],
        "createdAt": item.created_at.isoformat(),
        "updatedAt": item.updated_at.isoformat(),
        "completedAt": item.delivered_at.isoformat() if item.delivered_at else None,
        "deadlineDays": item.deadline_days,
        "deadlineDate": item.deadline_date.isoformat(),
        "mairie": item.mairie,
        "deliveryMode": item.delivery_mode.value,
        "deliveryLocation": item.delivery_location,
        "aiProcessingStatus": item.ai_processing_status,
        "aiConfidence": item.ai_confidence,
        "aiProcessingDate": (
            item.ai_processing_date.isoformat() if item.ai_processing_date else None
        ),
        "aiProcessingDetails": item.ai_processing_details,
        "tenantId": item.tenant_id,
        "institutionId": item.institution_id,
    }


async def _load_request(
    db: AsyncSession,
    request_id: uuid.UUID,
    current_user: User,
) -> ServiceRequest:
    query = _apply_request_scope(
        select(ServiceRequest).where(ServiceRequest.id == request_id),
        current_user,
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    if not item:
        # 404 intentionally hides whether a dossier exists outside this scope.
        raise HTTPException(
            status_code=404,
            detail="Demande introuvable ou hors de votre périmètre.",
        )
    return item


async def _append_note(
    db: AsyncSession,
    item: ServiceRequest,
    user: User,
    text_value: str,
    note_type: str,
) -> ServiceRequestNote:
    note = ServiceRequestNote(
        request_id=item.id,
        author_id=user.id,
        author_name=user.full_name,
        author_role=user.role.value,
        note_type=note_type,
        text=text_value,
    )
    db.add(note)
    await db.flush()
    return note


@router.get("", summary="Liste des demandes administratives")
async def list_service_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status_filter: ServiceRequestStatusEnum | None = Query(None, alias="status"),
    category_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    query = _apply_request_scope(select(ServiceRequest), current_user)
    if status_filter:
        query = query.where(ServiceRequest.status == status_filter)
    if category_id:
        query = query.where(ServiceRequest.category_id == category_id)

    total = (
        await db.execute(select(func.count()).select_from(query.subquery()))
    ).scalar() or 0
    query = (
        query.order_by(ServiceRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = (await db.execute(query)).scalars().unique().all()
    return {
        "items": [_serialize_request(item) for item in items],
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


@router.post("", status_code=status.HTTP_201_CREATED, summary="Soumettre une demande")
async def create_service_request(
    payload: ServiceRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    tenant_id = current_user.tenant_id or settings.TENANT_DEFAULT_ID

    catalog_service = await get_active_service(db, tenant_id, payload.service_id)
    if not catalog_service:
        raise HTTPException(
            status_code=400,
            detail="Démarche administrative inconnue, inactive ou non encore effective.",
        )

    institution = (
        await db.execute(
            select(Institution).where(
                Institution.id == payload.target_institution_id,
                Institution.tenant_id == tenant_id,
                Institution.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if not institution:
        raise HTTPException(status_code=400, detail="Institution cible invalide ou inactive.")

    if current_user.role not in (RoleEnum.CITOYEN, RoleEnum.SUPER_ADMIN):
        if current_user.institution_id != institution.id:
            raise HTTPException(
                status_code=403,
                detail="Vous ne pouvez créer que dans votre institution.",
            )

    # The RLS/ORM layer accepts a citizen routing institution only through this
    # trusted server-side slot and matching transaction-local PostgreSQL setting.
    if current_user.role == RoleEnum.CITOYEN:
        db.sync_session.info["trusted_target_institution_id"] = institution.id
        if db.get_bind().dialect.name == "postgresql":
            await db.execute(
                text(
                    "SELECT set_config('app.current_target_institution_id', :institution_id, true)"
                ),
                {"institution_id": institution.id},
            )

    now = datetime.now(timezone.utc)
    deadline_days = catalog_service.sla_business_days

    item = ServiceRequest(
        reference=_reference(),
        service_id=catalog_service.service_id,
        service_name=catalog_service.name,
        category=catalog_service.category_name,
        category_id=catalog_service.category_id,
        service_catalog_version=catalog_service.version,
        service_policy_status=catalog_service.policy_status,
        service_policy_source=catalog_service.source_reference,
        service_fee_label=catalog_service.fee_label,
        expected_processing_label=catalog_service.expected_processing_label,
        citizen_id=current_user.id,
        citizen_name=payload.citizen_name,
        citizen_first_name=payload.citizen_first_name,
        citizen_nin=payload.citizen_nin,
        citizen_phone=payload.citizen_phone,
        # Identity email comes from the authenticated account, not the payload.
        citizen_email=current_user.email,
        citizen_address=payload.citizen_address,
        motif=payload.motif,
        required_documents=list(catalog_service.required_documents or []),
        assigned_service=institution.name,
        timeline=_default_timeline(),
        deadline_days=deadline_days,
        deadline_date=_add_business_days(now, deadline_days),
        mairie=payload.mairie,
        delivery_mode=payload.delivery_mode,
        tenant_id=tenant_id,
        institution_id=institution.id,
    )
    db.add(item)
    await db.flush()

    await _append_note(
        db,
        item,
        current_user,
        f"Demande soumise. Référence officielle : {item.reference}. Institution : {institution.name}.",
        "notification",
    )
    await db.refresh(item)
    return _serialize_request(item)


@router.get("/{request_id}", summary="Détail d'une demande")
async def get_service_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return _serialize_request(await _load_request(db, request_id, current_user))


@router.post("/{request_id}/status", summary="Changer le statut")
async def update_service_request_status(
    request_id: uuid.UUID,
    payload: StatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    action = _status_permission_action(payload.status)
    permission_checker = require_permission("requests", action)
    await permission_checker(request=request, current_user=current_user, db=db)

    item = await _load_request(db, request_id, current_user)
    if payload.status not in ALLOWED_TRANSITIONS[item.status]:
        raise HTTPException(
            status_code=409,
            detail=f"Transition interdite : {item.status.value} → {payload.status.value}.",
        )
    _ensure_transition_business_invariants(item, payload.status)

    old_status = item.status
    item.status = payload.status
    if payload.status == ServiceRequestStatusEnum.LIVREE:
        item.delivered_at = datetime.now(timezone.utc)

    await _append_note(
        db,
        item,
        current_user,
        payload.note or f"Statut modifié : {old_status.value} → {payload.status.value}",
        "decision",
    )
    await db.flush()
    await db.refresh(item)
    return _serialize_request(item)


@router.post("/{request_id}/assign", summary="Prendre en charge une demande")
async def assign_service_request(
    request_id: uuid.UUID,
    payload: AssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("requests", "process")),
) -> dict[str, Any]:
    # Never trust agent_id/agent_name from the browser. This compatibility
    # endpoint means "take charge": the authenticated principal becomes owner.
    del payload
    item = await _load_request(db, request_id, current_user)
    if item.status in {ServiceRequestStatusEnum.LIVREE, ServiceRequestStatusEnum.REJETEE}:
        raise HTTPException(
            status_code=409,
            detail="Une demande terminée ne peut plus être affectée.",
        )
    item.assigned_agent_id = current_user.id
    item.assigned_agent_name = current_user.full_name
    await _append_note(
        db,
        item,
        current_user,
        f"Demande prise en charge par {current_user.full_name}.",
        "notification",
    )
    await db.flush()
    return _serialize_request(item)


@router.post("/{request_id}/notes", summary="Ajouter une note de traitement")
async def add_service_request_note(
    request_id: uuid.UUID,
    payload: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("requests", "process")),
) -> dict[str, Any]:
    item = await _load_request(db, request_id, current_user)
    note = await _append_note(db, item, current_user, payload.text, payload.note_type)
    return {
        "id": str(note.id),
        "author": note.author_name,
        "authorRole": note.author_role,
        "text": note.text,
        "date": note.created_at.isoformat(),
        "type": note.note_type,
    }


@router.post("/{request_id}/complete", summary="Finaliser la livraison")
async def complete_service_request(
    request_id: uuid.UUID,
    payload: CompletionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("requests", "process")),
) -> dict[str, Any]:
    item = await _load_request(db, request_id, current_user)
    if item.status != ServiceRequestStatusEnum.PRETE:
        raise HTTPException(
            status_code=409,
            detail="La demande doit être au statut 'prete' avant livraison.",
        )
    item.delivery_mode = payload.delivery_mode
    item.delivery_location = payload.delivery_location
    item.status = ServiceRequestStatusEnum.LIVREE
    item.delivered_at = datetime.now(timezone.utc)
    await _append_note(
        db,
        item,
        current_user,
        "Document livré au citoyen.",
        "decision",
    )
    await db.flush()
    return _serialize_request(item)


@router.post(
    "/{request_id}/generated-document",
    summary="Générer le document administratif depuis un modèle approuvé",
)
async def save_generated_document(
    request_id: uuid.UUID,
    payload: GeneratedDocumentCreate | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("requests", "approve")),
) -> dict[str, Any]:
    # Legacy clients may still send HTML/title/file_name. The server accepts
    # the shape for compatibility but never reads it as an authority source.
    del payload

    item = await _load_request(db, request_id, current_user)
    if item.status != ServiceRequestStatusEnum.VALIDEE:
        raise HTTPException(
            status_code=409,
            detail="Le document ne peut être généré que lorsque la demande est validée.",
        )
    if item.service_catalog_version is None:
        raise HTTPException(
            status_code=409,
            detail="Cette demande historique ne référence aucune version de catalogue vérifiable.",
        )

    catalog_service = await get_service_version(
        db,
        item.tenant_id,
        item.service_id,
        item.service_catalog_version,
    )
    if not catalog_service:
        raise HTTPException(
            status_code=409,
            detail="La version de démarche utilisée par cette demande est introuvable.",
        )

    generated_at = datetime.now(timezone.utc)
    title, html_content, file_name, template_hash = render_approved_document(
        request=item,
        service=catalog_service,
        generated_by_name=current_user.full_name,
        generated_at=generated_at,
    )
    digest = hashlib.sha256(html_content.encode("utf-8")).hexdigest()

    generated = item.generated_document
    if generated is None:
        generated = GeneratedServiceDocument(request_id=item.id)
        db.add(generated)

    generated.title = title
    generated.html_content = html_content
    generated.content_hash = digest
    generated.file_name = file_name
    generated.generated_by = current_user.id
    generated.generated_by_name = current_user.full_name
    generated.generated_at = generated_at
    generated.template_service_version = catalog_service.version
    generated.template_hash = template_hash
    generated.template_source_reference = catalog_service.document_template_source_reference
    generated.rendered_server_side = True

    await db.flush()
    await db.refresh(item)
    return _serialize_request(item)


@router.post(
    "/{request_id}/attachments",
    status_code=201,
    summary="Téléverser une pièce justificative",
)
async def upload_service_request_attachment(
    request_id: uuid.UUID,
    file: UploadFile = File(...),
    required_doc_name: str = Form(""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    item = await _load_request(db, request_id, current_user)
    validation = await upload_security.validate_upload(file)
    if not validation.get("valid"):
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Fichier rejeté",
                "errors": validation.get("errors", []),
            },
        )

    content = await file.read()
    sanitized = validation["sanitized_name"]
    content_type = validation.get("content_type") or "application/octet-stream"

    # National production is fail-closed for malware scanning.
    if settings.is_production and not settings.UPLOAD_ANTIVIRUS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Le scan antivirus doit être activé en production avant tout upload.",
        )

    if settings.UPLOAD_ANTIVIRUS_ENABLED:
        temp_path = ""
        try:
            with tempfile.NamedTemporaryFile(
                delete=False,
                suffix=os.path.splitext(sanitized)[1],
            ) as temp:
                temp.write(content)
                temp_path = temp.name
            scan = await upload_security.scan_for_virus(temp_path)
            scan_failed = (
                not scan.get("clean")
                or scan.get("scanner") != "clamav"
                or str(scan.get("details", "")).lower().startswith("erreur")
                or "timeout" in str(scan.get("details", "")).lower()
            )
            if scan_failed:
                raise HTTPException(
                    status_code=400,
                    detail="Fichier refusé par le contrôle antivirus.",
                )
        finally:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)

    tenant_id = item.tenant_id
    object_key = (
        f"service-requests/{tenant_id}/{item.id}/"
        f"{uuid.uuid4().hex}/{sanitized}"
    )
    await object_storage.put_bytes(object_key, content, content_type)

    attachment = ServiceRequestAttachment(
        request_id=item.id,
        original_name=file.filename or sanitized,
        sanitized_name=sanitized,
        content_type=content_type,
        file_size=len(content),
        object_key=object_key,
        required_doc_name=required_doc_name or None,
        verified=False,
        uploaded_by=current_user.id,
    )
    db.add(attachment)
    await db.flush()

    return {
        "id": str(attachment.id),
        "name": attachment.original_name,
        "type": attachment.content_type,
        "size": attachment.file_size,
        "data": "",
        "uploadedAt": attachment.uploaded_at.isoformat(),
        "requiredDocName": attachment.required_doc_name or "",
        "verified": attachment.verified,
        "serverStored": True,
    }


@router.get(
    "/{request_id}/attachments/{attachment_id}/download",
    summary="URL temporaire de téléchargement",
)
async def download_service_request_attachment(
    request_id: uuid.UUID,
    attachment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    await _load_request(db, request_id, current_user)
    attachment = (
        await db.execute(
            select(ServiceRequestAttachment).where(
                ServiceRequestAttachment.id == attachment_id,
                ServiceRequestAttachment.request_id == request_id,
            )
        )
    ).scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Pièce jointe introuvable.")
    return {
        "url": await object_storage.presigned_get_url(
            attachment.object_key,
            expires_minutes=5,
        )
    }


@router.post(
    "/{request_id}/attachments/{attachment_id}/verify",
    summary="Vérifier une pièce",
)
async def verify_service_request_attachment(
    request_id: uuid.UUID,
    attachment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("requests", "process")),
) -> dict[str, bool]:
    await _load_request(db, request_id, current_user)
    attachment = (
        await db.execute(
            select(ServiceRequestAttachment).where(
                ServiceRequestAttachment.id == attachment_id,
                ServiceRequestAttachment.request_id == request_id,
            )
        )
    ).scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Pièce jointe introuvable.")
    attachment.verified = True
    await db.flush()
    return {"verified": True}


@router.post("/{request_id}/satisfaction", summary="Noter une demande livrée")
async def rate_service_request(
    request_id: uuid.UUID,
    payload: SatisfactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    item = await _load_request(db, request_id, current_user)
    if current_user.role != RoleEnum.CITOYEN or item.citizen_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Seul le citoyen propriétaire peut noter cette demande.",
        )
    if item.status != ServiceRequestStatusEnum.LIVREE:
        raise HTTPException(
            status_code=409,
            detail="Une demande doit être livrée avant notation.",
        )
    item.satisfaction_rating = payload.rating
    item.satisfaction_comment = payload.comment
    item.satisfaction_rated_at = datetime.now(timezone.utc)
    await db.flush()
    return _serialize_request(item)
