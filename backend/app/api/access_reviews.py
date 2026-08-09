"""Periodic IAM access recertification endpoints."""

from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.identity_lifecycle import AccessReviewCampaign, AccessReviewItem
from app.models.user import RoleEnum, User
from app.services.access_review_service import AccessReviewError, access_review_service
from app.services.audit_service import AuditService

router = APIRouter()


class CampaignCreate(BaseModel):
    name: str = Field(min_length=4, max_length=255)
    reviewer_id: uuid.UUID
    due_at: datetime
    tenant_id: str | None = Field(default=None, max_length=100)
    institution_id: str | None = Field(default=None, max_length=100)

    @field_validator("due_at")
    @classmethod
    def normalize_due_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("due_at doit inclure un fuseau horaire")
        return value.astimezone(timezone.utc)


class CampaignResponse(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    tenant_id: str
    institution_id: str | None
    reviewer_id: uuid.UUID
    created_by: uuid.UUID
    due_at: datetime
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewItemResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    user_id: uuid.UUID
    snapshot_role: str
    snapshot_tenant_id: str
    snapshot_institution_id: str | None
    snapshot_grants: list
    decision: str
    decision_reason: str | None
    decided_by: uuid.UUID | None
    decided_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewDecision(BaseModel):
    decision: str = Field(pattern="^(certified|revoke_temporary|disable_account)$")
    reason: str = Field(min_length=8, max_length=2000)


def _require_reviewer_level(user: User) -> None:
    if user.role.hierarchy_level() < RoleEnum.CHEF_SERVICE.hierarchy_level():
        raise HTTPException(status_code=403, detail="Rôle CHEF_SERVICE ou supérieur requis.")


def _require_verified_mfa(request: Request, user: User) -> None:
    payload = getattr(request.state, "jwt_payload", {}) or {}
    if not user.mfa_enabled or payload.get("mfa_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA vérifié requis pour modifier une campagne de recertification.",
        )


def _service_error(exc: AccessReviewError) -> HTTPException:
    message = str(exc)
    denied_markers = (
        "inter-tenant",
        "hors institution",
        "hors du périmètre",
        "hors périmètre",
        "réservée",
        "Seul le reviewer",
        "Auto-recertification",
        "rôle égal ou supérieur",
    )
    code = status.HTTP_403_FORBIDDEN if any(marker in message for marker in denied_markers) else 422
    return HTTPException(status_code=code, detail=message)


async def _audit_review(
    *,
    db: AsyncSession,
    request: Request,
    actor: User,
    campaign_id: uuid.UUID,
    description: str,
    details: dict,
    severity: str = "warning",
) -> None:
    await AuditService(db).log_action(
        user_id=actor.id,
        action="ACCESS_REVIEW",
        resource_type="access_review_campaign",
        resource_id=str(campaign_id),
        category="security",
        description=description,
        details=details,
        severity=severity,
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("User-Agent", "unknown")[:512],
        tenant_id=actor.tenant_id,
        institution_id=actor.institution_id,
    )


@router.get("", response_model=list[CampaignResponse], summary="Lister les campagnes de recertification")
async def list_campaigns(
    campaign_status: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AccessReviewCampaign]:
    _require_reviewer_level(current_user)
    query = select(AccessReviewCampaign).order_by(AccessReviewCampaign.created_at.desc()).limit(250)
    if campaign_status:
        query = query.where(AccessReviewCampaign.status == campaign_status)
    return list((await db.execute(query)).scalars().all())


@router.post(
    "",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer une campagne de recertification",
)
async def create_campaign(
    body: CampaignCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccessReviewCampaign:
    _require_verified_mfa(request, current_user)
    try:
        campaign = await access_review_service.create_campaign(
            db=db,
            actor=current_user,
            name=body.name,
            reviewer_id=body.reviewer_id,
            due_at=body.due_at,
            tenant_id=body.tenant_id,
            institution_id=body.institution_id,
        )
    except AccessReviewError as exc:
        raise _service_error(exc) from exc

    await _audit_review(
        db=db,
        request=request,
        actor=current_user,
        campaign_id=campaign.id,
        description="Campagne de recertification IAM créée",
        details={
            "reviewer_id": str(campaign.reviewer_id),
            "tenant_id": campaign.tenant_id,
            "institution_id": campaign.institution_id,
            "due_at": campaign.due_at.isoformat(),
        },
    )
    return campaign


@router.get(
    "/{campaign_id}/items",
    response_model=list[ReviewItemResponse],
    summary="Lister les accès à recertifier",
)
async def list_campaign_items(
    campaign_id: uuid.UUID,
    decision: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AccessReviewItem]:
    _require_reviewer_level(current_user)
    campaign = await db.scalar(select(AccessReviewCampaign).where(AccessReviewCampaign.id == campaign_id))
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campagne introuvable.")
    if current_user.role != RoleEnum.SUPER_ADMIN and current_user.id != campaign.reviewer_id:
        raise HTTPException(status_code=403, detail="Seul le reviewer désigné peut consulter les éléments.")

    query = (
        select(AccessReviewItem)
        .where(AccessReviewItem.campaign_id == campaign_id)
        .order_by(AccessReviewItem.created_at.asc())
    )
    if decision:
        query = query.where(AccessReviewItem.decision == decision)
    return list((await db.execute(query)).scalars().all())


@router.post(
    "/{campaign_id}/items/{item_id}/decision",
    response_model=ReviewItemResponse,
    summary="Décider la recertification d'un accès",
)
async def decide_access(
    campaign_id: uuid.UUID,
    item_id: uuid.UUID,
    body: ReviewDecision,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AccessReviewItem:
    _require_reviewer_level(current_user)
    _require_verified_mfa(request, current_user)
    try:
        item = await access_review_service.decide_item(
            db=db,
            actor=current_user,
            campaign_id=campaign_id,
            item_id=item_id,
            decision=body.decision,
            reason=body.reason,
        )
    except AccessReviewError as exc:
        raise _service_error(exc) from exc

    await _audit_review(
        db=db,
        request=request,
        actor=current_user,
        campaign_id=campaign_id,
        description="Décision de recertification IAM appliquée",
        details={
            "item_id": str(item.id),
            "user_id": str(item.user_id),
            "decision": item.decision,
            "reason": item.decision_reason,
        },
        severity="critical" if item.decision == "disable_account" else "warning",
    )
    return item
