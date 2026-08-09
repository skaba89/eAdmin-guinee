"""Server-authoritative administrative-service catalog helpers."""

from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.administrative_service import AdministrativeService


def _effective_catalog_query(tenant_id: str, at: datetime):
    return select(AdministrativeService).where(
        AdministrativeService.tenant_id == tenant_id,
        AdministrativeService.is_active.is_(True),
        AdministrativeService.effective_from <= at,
        or_(
            AdministrativeService.effective_to.is_(None),
            AdministrativeService.effective_to > at,
        ),
    )


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
        _effective_catalog_query(tenant_id, effective_at)
        .where(AdministrativeService.service_id == service_id)
        .order_by(AdministrativeService.version.desc())
        .limit(1)
    )
    return (await db.execute(query)).scalar_one_or_none()


async def get_service_version(
    db: AsyncSession,
    tenant_id: str,
    service_id: str,
    version: int,
) -> AdministrativeService | None:
    """Load the exact historical catalog version captured by a request."""
    query = select(AdministrativeService).where(
        AdministrativeService.tenant_id == tenant_id,
        AdministrativeService.service_id == service_id,
        AdministrativeService.version == version,
    )
    return (await db.execute(query)).scalar_one_or_none()


async def list_active_services(
    db: AsyncSession,
    tenant_id: str,
    *,
    category_id: str | None = None,
    search: str | None = None,
    at: datetime | None = None,
) -> list[AdministrativeService]:
    """Return active catalog rows for one trusted tenant scope."""
    effective_at = at or datetime.now(timezone.utc)
    query = _effective_catalog_query(tenant_id, effective_at)

    if category_id:
        query = query.where(AdministrativeService.category_id == category_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                AdministrativeService.name.ilike(term),
                AdministrativeService.description.ilike(term),
                AdministrativeService.service_id.ilike(term),
            )
        )

    result = await db.execute(
        query.order_by(
            AdministrativeService.category_name,
            AdministrativeService.name,
            AdministrativeService.version.desc(),
        )
    )
    return list(result.scalars().all())


def serialize_service(item: AdministrativeService) -> dict:
    """Public, auditable representation of one catalog version.

    Template body text is intentionally not exposed on the public catalog.
    """
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
        "documentTemplateStatus": item.document_template_status,
        "documentTemplateTitle": item.document_template_title,
        "documentTemplateSourceReference": item.document_template_source_reference,
        "documentTemplateHash": item.document_template_hash,
        "documentTemplateApprovedAt": (
            item.document_template_approved_at.isoformat()
            if item.document_template_approved_at
            else None
        ),
        "effectiveFrom": item.effective_from.isoformat() if item.effective_from else None,
        "effectiveTo": item.effective_to.isoformat() if item.effective_to else None,
        "isActive": item.is_active,
    }
