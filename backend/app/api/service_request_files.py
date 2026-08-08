"""Attachment mutation endpoints kept separate from the core request router."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.service_request import ServiceRequest, ServiceRequestAttachment
from app.models.user import User
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    request_item = (
        await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id))
    ).scalar_one_or_none()
    if not request_item:
        raise HTTPException(status_code=404, detail="Demande introuvable ou hors périmètre.")

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

    object_key = attachment.object_key
    await db.delete(attachment)
    await db.flush()

    # Storage deletion happens only after the database authorization checks have
    # succeeded. Failure is surfaced so an operator can reconcile the object.
    try:
        await object_storage.delete(object_key)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="La métadonnée a été supprimée mais le stockage objet doit être réconcilié.",
        ) from exc
