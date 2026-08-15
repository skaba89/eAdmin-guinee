"""Public catalog isolation by selected municipality."""

from datetime import datetime, timedelta, timezone

import pytest

from app.config import settings
from app.models.administrative_service import AdministrativeService
from app.models.institution import Institution
from app.models.institution_service_assignment import InstitutionServiceAssignment
from app.models.tenant import Tenant


async def _ensure_tenant(db_session) -> None:
    if await db_session.get(Tenant, settings.TENANT_DEFAULT_ID):
        return
    db_session.add(
        Tenant(
            id=settings.TENANT_DEFAULT_ID,
            name="République de Guinée Catalogue Municipal",
            is_active=True,
            max_users=1000,
            max_documents=10000,
            max_storage_mb=4096,
            primary_color="#CE1126",
            secondary_color="#FCD116",
            accent_color="#009460",
        )
    )
    await db_session.flush()


def _service(service_id: str, name: str) -> AdministrativeService:
    return AdministrativeService(
        tenant_id=settings.TENANT_DEFAULT_ID,
        service_id=service_id,
        version=1,
        category_id="etat-civil",
        category_name="État civil",
        name=name,
        description=f"Démarche {name}",
        fee_label="Gratuit",
        expected_processing_label="5 jours ouvrés",
        sla_business_days=5,
        required_documents=["CNI"],
        routing_terms=["mairie"],
        policy_status="operational_default",
        source_reference="Test catalogue municipal",
        effective_from=datetime.now(timezone.utc) - timedelta(days=1),
        is_active=True,
    )


@pytest.mark.asyncio
async def test_public_catalog_returns_only_services_assigned_to_selected_mairie(
    client,
    db_session,
):
    await _ensure_tenant(db_session)
    db_session.add_all(
        [
            Institution(
                id="public-mairie-a",
                tenant_id=settings.TENANT_DEFAULT_ID,
                name="Mairie publique A",
                type="mairie",
                is_active=True,
            ),
            Institution(
                id="public-service-a",
                tenant_id=settings.TENANT_DEFAULT_ID,
                name="Service public A",
                type="service",
                parent_id="public-mairie-a",
                is_active=True,
            ),
            Institution(
                id="public-mairie-b",
                tenant_id=settings.TENANT_DEFAULT_ID,
                name="Mairie publique B",
                type="mairie",
                is_active=True,
            ),
            Institution(
                id="public-service-b",
                tenant_id=settings.TENANT_DEFAULT_ID,
                name="Service public B",
                type="service",
                parent_id="public-mairie-b",
                is_active=True,
            ),
            _service("public-mairie-acte-a", "Acte Mairie A"),
            _service("public-mairie-acte-b", "Acte Mairie B"),
            _service("public-national-unassigned", "Démarche non affectée"),
        ]
    )
    await db_session.flush()
    db_session.add_all(
        [
            InstitutionServiceAssignment(
                tenant_id=settings.TENANT_DEFAULT_ID,
                institution_id="public-mairie-a",
                service_id="public-mairie-acte-a",
                service_institution_id="public-service-a",
                is_active=True,
            ),
            InstitutionServiceAssignment(
                tenant_id=settings.TENANT_DEFAULT_ID,
                institution_id="public-mairie-b",
                service_id="public-mairie-acte-b",
                service_institution_id="public-service-b",
                is_active=True,
            ),
        ]
    )
    await db_session.flush()

    response_a = await client.get(
        "/api/v1/public/service-catalog",
        params={"institution_id": "public-mairie-a"},
    )
    response_b = await client.get(
        "/api/v1/public/service-catalog",
        params={"institution_id": "public-mairie-b"},
    )
    response_unknown = await client.get(
        "/api/v1/public/service-catalog",
        params={"institution_id": "public-mairie-inconnue"},
    )

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    assert response_unknown.status_code == 200

    ids_a = {item["serviceId"] for item in response_a.json()["items"]}
    ids_b = {item["serviceId"] for item in response_b.json()["items"]}

    assert ids_a == {"public-mairie-acte-a"}
    assert ids_b == {"public-mairie-acte-b"}
    assert response_unknown.json()["items"] == []
    assert "public-national-unassigned" not in ids_a | ids_b


@pytest.mark.asyncio
async def test_public_catalog_excludes_inactive_assignment_for_selected_mairie(
    client,
    db_session,
):
    await _ensure_tenant(db_session)
    db_session.add_all(
        [
            Institution(
                id="public-mairie-inactive-route",
                tenant_id=settings.TENANT_DEFAULT_ID,
                name="Mairie route inactive",
                type="mairie",
                is_active=True,
            ),
            Institution(
                id="public-service-inactive-route",
                tenant_id=settings.TENANT_DEFAULT_ID,
                name="Service route inactive",
                type="service",
                parent_id="public-mairie-inactive-route",
                is_active=True,
            ),
            _service("public-inactive-route-acte", "Acte non publié par la mairie"),
        ]
    )
    await db_session.flush()
    db_session.add(
        InstitutionServiceAssignment(
            tenant_id=settings.TENANT_DEFAULT_ID,
            institution_id="public-mairie-inactive-route",
            service_id="public-inactive-route-acte",
            service_institution_id="public-service-inactive-route",
            is_active=False,
        )
    )
    await db_session.flush()

    response = await client.get(
        "/api/v1/public/service-catalog",
        params={"institution_id": "public-mairie-inactive-route"},
    )

    assert response.status_code == 200
    assert response.json()["items"] == []
