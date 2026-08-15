from datetime import datetime, timedelta, timezone

import pytest

from app.models.administrative_service import AdministrativeService
from app.models.institution import Institution
from app.models.institution_service_assignment import InstitutionServiceAssignment
from app.services.service_catalog import get_active_service_assignment, list_active_services


def _catalog(tenant_id: str, service_id: str) -> AdministrativeService:
    return AdministrativeService(
        tenant_id=tenant_id,
        service_id=service_id,
        version=1,
        category_id="etat-civil",
        category_name="État civil",
        name=f"Démarche {service_id}",
        description="Démarche de test",
        sla_business_days=5,
        required_documents=[],
        routing_terms=["mairie"],
        policy_status="operational_default",
        source_reference="TEST-ACTIVE-ENDPOINTS",
        effective_from=datetime.now(timezone.utc) - timedelta(minutes=1),
        is_active=True,
    )


async def _seed_route(
    db_session,
    tenant_id: str,
    suffix: str,
    *,
    municipality_active: bool = True,
    processing_active: bool = True,
):
    municipality_id = f"active-mairie-{suffix}"
    processing_id = f"active-service-{suffix}"
    service_id = f"active-catalog-{suffix}"
    db_session.add_all(
        [
            Institution(
                id=municipality_id,
                tenant_id=tenant_id,
                name=f"Mairie {suffix}",
                type="mairie",
                code=f"ACT-M-{suffix}",
                is_active=municipality_active,
            ),
            Institution(
                id=processing_id,
                tenant_id=tenant_id,
                name=f"Service {suffix}",
                type="service",
                code=f"ACT-S-{suffix}",
                parent_id=municipality_id,
                is_active=processing_active,
            ),
            _catalog(tenant_id, service_id),
        ]
    )
    await db_session.flush()
    db_session.add(
        InstitutionServiceAssignment(
            tenant_id=tenant_id,
            institution_id=municipality_id,
            service_id=service_id,
            service_institution_id=processing_id,
            is_active=True,
        )
    )
    await db_session.flush()
    return municipality_id, processing_id, service_id


@pytest.mark.asyncio
async def test_scoped_catalog_hides_assignment_when_municipality_is_inactive(
    db_session, test_tenant
):
    municipality_id, _, service_id = await _seed_route(
        db_session,
        test_tenant.id,
        "inactive-mairie",
        municipality_active=False,
    )

    rows = await list_active_services(
        db_session,
        test_tenant.id,
        institution_id=municipality_id,
    )
    assignment = await get_active_service_assignment(
        db_session,
        test_tenant.id,
        municipality_id,
        service_id,
    )

    assert rows == []
    assert assignment is None


@pytest.mark.asyncio
async def test_scoped_catalog_hides_assignment_when_processing_service_is_inactive(
    db_session, test_tenant
):
    municipality_id, processing_id, service_id = await _seed_route(
        db_session,
        test_tenant.id,
        "inactive-service",
        processing_active=False,
    )

    municipality_rows = await list_active_services(
        db_session,
        test_tenant.id,
        institution_id=municipality_id,
    )
    service_rows = await list_active_services(
        db_session,
        test_tenant.id,
        service_institution_id=processing_id,
    )
    assignment = await get_active_service_assignment(
        db_session,
        test_tenant.id,
        municipality_id,
        service_id,
    )

    assert municipality_rows == []
    assert service_rows == []
    assert assignment is None


@pytest.mark.asyncio
async def test_scoped_catalog_keeps_valid_active_route(db_session, test_tenant):
    municipality_id, processing_id, service_id = await _seed_route(
        db_session,
        test_tenant.id,
        "valid",
    )

    rows = await list_active_services(
        db_session,
        test_tenant.id,
        institution_id=municipality_id,
    )
    service_rows = await list_active_services(
        db_session,
        test_tenant.id,
        service_institution_id=processing_id,
    )
    assignment = await get_active_service_assignment(
        db_session,
        test_tenant.id,
        municipality_id,
        service_id,
    )

    assert [row.service_id for row in rows] == [service_id]
    assert [row.service_id for row in service_rows] == [service_id]
    assert assignment is not None
