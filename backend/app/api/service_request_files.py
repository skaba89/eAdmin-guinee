"""Attachment mutation endpoints kept separate from the core request router."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.api.service_requests import _load_request
from app.database import get_db
from app.middleware.rbac import require_permission
from app.models.service_request import ServiceRequestAttachment
from app.models.user import RoleEnum, User
from app.services.object_storage import object_storage

router = APIRouter()


@router.delete(
    "/{request_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Supprimer une pièce jointe",
)
async def delete_service_request_attachment(
    request_id: uuid.UUID,
    attachment_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    # Apply the same server-authoritative dossier scope used by every other
    # request operation before resolving the child row.
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

    if current_user.role == RoleEnum.CITOYEN:
        if attachment.uploaded_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Seul l'auteur de cette pièce jointe peut la supprimer.",
            )
    else:
        permission_checker = require_permission("requests", "process")
        await permission_checker(
            request=request,
            current_user=current_user,
            db=db,
        )

    object_key = attachment.object_key
    await db.delete(attachment)
    await db.flush()

    # Object deletion runs after both application authorization and database
    # RLS checks. Raising keeps the surrounding request transaction rollbackable
    # when object storage is unavailable.
    try:
        await object_storage.delete(object_key)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Suppression annulée : le stockage objet est indisponible.",
        ) from exc
