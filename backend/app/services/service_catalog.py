"""Server-authoritative administrative-service catalog helpers."""

from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.administrative_service import AdministrativeService


async def get_active_service(
    db: AsyncSession,
    tenant_id: str,
    service_id: str,
    *,
    at: datetime | None = None,
) -> AdministrativeService | None:
    """Return the newest active/effective version for a tenant and service id."""
    effective_at = at or datetime.now(timezone.utc)
    query = (
        select(AdministrativeService)
        .where(
            AdministrativeService.tenant_id == tenant_id,
            AdministrativeService.service_id == service_id,
            AdministrativeService.is_active.is_(True),
            AdministrativeService.effective_from <= effective_at,
            or_(
                AdministrativeService.effective_to.is_(None),
                AdministrativeService.effective_to > effective_at,
            ),
        )
        .order_by(AdministrativeService.version.desc())
        .limit(1)
    )
    return (await db.execute(query)).scalar_one_or_none()


def serialize_service(item: AdministrativeService) -> dict:
    """Public, auditable representation of one catalog version."""
    return {
        "id": str(item.id),
        "serviceId": item.service_id,
        "version": item.version,
        "categoryId": item.category_id,
        "categoryName": item.category_name,
        "name": item.name,
        "description": item.description,
        "feeLabel": item.fee_label,
        "expectedProcessingLabel": item.expected_processing_label,
        "slaBusinessDays": item.sla_business_days,
        "requiredDocuments": item.required_documents or [],
        "routingTerms": item.routing_terms or [],
        "policyStatus": item.policy_status,
        "sourceReference": item.source_reference,
        "sourceUrl": item.source_url,
        "effectiveFrom": item.effective_from.isoformat() if item.effective_from else None,
        "effectiveTo": item.effective_to.isoformat() if item.effective_to else None,
        "isActive": item.is_active,
    }
