"""HTTP security tests for the unauthenticated administrative-service catalog."""

from datetime import datetime, timedelta, timezone

import pytest

from app.config import settings
from app.models.administrative_service import AdministrativeService
from app.models.tenant import Tenant


async def _ensure_default_tenant(db_session):
    tenant = await db_session.get(Tenant, settings.TENANT_DEFAULT_ID)
    if tenant:
        return tenant

    tenant = Tenant(
        id=settings.TENANT_DEFAULT_ID,
        name="République de Guinée Test",
        domain="eadmin.gouv.gn",
        is_active=True,
        max_users=1000,
        max_documents=10000,
        max_storage_mb=4096,
        primary_color="#CE1126",
        secondary_color="#FCD116",
        accent_color="#009460",
    )
    db_session.add(tenant)
    await db_session.flush()
    return tenant


def _catalog_item(
    *,
    service_id: str,
    version: int = 1,
    active: bool = True,
    effective_from=None,
    effective_to=None,
):
    return AdministrativeService(
        tenant_id=settings.TENANT_DEFAULT_ID,
        service_id=service_id,
        version=version,
        category_id="etat-civil",
        category_name="État Civil",
        name=f"Service public {service_id}",
        description="Description publique",
        fee_label="Gratuit",
        expected_processing_label="48h",
        sla_business_days=30,
        required_documents=["CNI"],
        routing_terms=["mairie"],
        policy_status="operational_default",
        source_reference="Référentiel public test",
        effective_from=effective_from or datetime.now(timezone.utc) - timedelta(minutes=1),
        effective_to=effective_to,
        is_active=active,
    )


@pytest.mark.asyncio
async def test_public_catalog_is_readable_without_authentication(client, db_session):
    await _ensure_default_tenant(db_session)
    db_session.add(_catalog_item(service_id="public-1"))
    await db_session.flush()

    response = await client.get("/api/v1/public/service-catalog")

    assert response.status_code == 200
    items = response.json()["items"]
    assert any(item["serviceId"] == "public-1" for item in items)
    item = next(item for item in items if item["serviceId"] == "public-1")
    assert item["requiredDocuments"] == ["CNI"]
    assert item["policyStatus"] == "operational_default"
    assert item["sourceReference"] == "Référentiel public test"


@pytest.mark.asyncio
async def test_public_catalog_excludes_inactive_future_and_expired_versions(client, db_session):
    await _ensure_default_tenant(db_session)
    now = datetime.now(timezone.utc)
    db_session.add_all([
        _catalog_item(service_id="visible"),
        _catalog_item(service_id="inactive", active=False),
        _catalog_item(
            service_id="future",
            effective_from=now + timedelta(days=1),
        ),
        _catalog_item(
            service_id="expired",
            effective_from=now - timedelta(days=2),
            effective_to=now - timedelta(days=1),
        ),
    ])
    await db_session.flush()

    response = await client.get("/api/v1/public/service-catalog")

    assert response.status_code == 200
    ids = {item["serviceId"] for item in response.json()["items"]}
    assert "visible" in ids
    assert "inactive" not in ids
    assert "future" not in ids
    assert "expired" not in ids


@pytest.mark.asyncio
async def test_public_catalog_supports_category_and_search_filters(client, db_session):
    await _ensure_default_tenant(db_session)
    first = _catalog_item(service_id="birth-certificate")
    first.name = "Extrait naissance"
    second = _catalog_item(service_id="marriage-certificate")
    second.name = "Extrait mariage"
    second.category_id = "justice"
    second.category_name = "Justice"
    db_session.add_all([first, second])
    await db_session.flush()

    response = await client.get(
        "/api/v1/public/service-catalog",
        params={"category_id": "etat-civil", "search": "naissance"},
    )

    assert response.status_code == 200
    assert [item["serviceId"] for item in response.json()["items"]] == [
        "birth-certificate"
    ]


@pytest.mark.asyncio
async def test_public_catalog_rejects_client_tenant_header(client):
    response = await client.get(
        "/api/v1/public/service-catalog",
        headers={"X-Tenant-ID": "attacker-controlled-tenant"},
    )

    assert response.status_code == 400
    assert "périmètre" in response.json()["detail"]


@pytest.mark.asyncio
async def test_public_catalog_rejects_client_institution_header(client):
    response = await client.get(
        "/api/v1/public/service-catalog",
        headers={"X-Institution-ID": "attacker-controlled-institution"},
    )

    assert response.status_code == 400
    assert "périmètre" in response.json()["detail"]


@pytest.mark.asyncio
async def test_public_catalog_does_not_expose_governance_routes(client):
    history = await client.get("/api/v1/public/service-catalog/public-1/history")
    publish = await client.post(
        "/api/v1/public/service-catalog/public-1/versions",
        json={
            "category_id": "etat-civil",
            "category_name": "État Civil",
            "name": "Tentative",
            "sla_business_days": 1,
        },
    )

    assert history.status_code == 404
    assert publish.status_code in (404, 405)
