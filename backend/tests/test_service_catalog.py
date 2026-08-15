"""Tests for the server-authoritative, versioned administrative service catalog."""

from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError
from sqlalchemy import select

from app.api.service_catalog import ServiceVersionCreate, publish_service_version
from app.api.service_requests import ServiceRequestCreate, create_service_request
from app.models.administrative_service import AdministrativeService
from app.models.institution import Institution
from app.models.institution_service_assignment import InstitutionServiceAssignment
from app.models.service_request import ServiceRequest
from app.services.service_catalog import get_active_service


def catalog_row(
    tenant_id: str,
    *,
    service_id: str = "svc-test",
    version: int = 1,
    active: bool = True,
    effective_from=None,
    effective_to=None,
    name: str = "Service officiel",
    sla: int = 12,
):
    return AdministrativeService(
        tenant_id=tenant_id,
        service_id=service_id,
        version=version,
        category_id="etat-civil",
        category_name="État Civil",
        name=name,
        description="Description serveur",
        fee_label="5 000 GNF",
        expected_processing_label="5 jours",
        sla_business_days=sla,
        required_documents=["Pièce officielle A", "Pièce officielle B"],
        routing_terms=["mairie"],
        policy_status="operational_default",
        source_reference="Référentiel test approuvé par la recette",
        effective_from=effective_from or datetime.now(timezone.utc) - timedelta(minutes=1),
        effective_to=effective_to,
        is_active=active,
    )


@pytest.mark.asyncio
async def test_active_service_resolver_uses_newest_effective_version(db_session, test_tenant):
    db_session.add_all([
        catalog_row(test_tenant.id, version=1, name="Ancienne version", sla=20),
        catalog_row(test_tenant.id, version=2, name="Version courante", sla=10),
        catalog_row(
            test_tenant.id,
            version=3,
            name="Version future",
            sla=5,
            effective_from=datetime.now(timezone.utc) + timedelta(days=1),
        ),
    ])
    await db_session.flush()

    resolved = await get_active_service(db_session, test_tenant.id, "svc-test")

    assert resolved is not None
    assert resolved.version == 2
    assert resolved.name == "Version courante"
    assert resolved.sla_business_days == 10


@pytest.mark.asyncio
async def test_active_service_resolver_is_tenant_scoped(db_session, test_tenant):
    db_session.add(catalog_row(test_tenant.id, service_id="svc-tenant"))
    await db_session.flush()

    assert await get_active_service(db_session, "another-tenant", "svc-tenant") is None


def test_approved_catalog_version_requires_official_source():
    with pytest.raises(ValidationError):
        ServiceVersionCreate(
            category_id="justice",
            category_name="Justice",
            name="Casier judiciaire",
            sla_business_days=5,
            policy_status="approved",
        )


@pytest.mark.asyncio
async def test_admin_publication_closes_previous_version_and_creates_successor(
    db_session,
    test_tenant,
    admin_user,
):
    admin_user.tenant_id = test_tenant.id
    previous = catalog_row(test_tenant.id, service_id="svc-version", version=4)
    db_session.add(previous)
    await db_session.flush()

    created = await publish_service_version(
        "svc-version",
        ServiceVersionCreate(
            category_id="justice",
            category_name="Justice & Légal",
            name="Service versionné",
            description="Nouvelle règle",
            fee_label="Gratuit",
            expected_processing_label="3 jours",
            sla_business_days=8,
            required_documents=["CNI"],
            routing_terms=["justice"],
            policy_status="approved",
            source_reference="Décision officielle TEST-2026-001",
        ),
        db_session,
        admin_user,
    )

    await db_session.refresh(previous)
    assert previous.is_active is False
    assert previous.effective_to is not None
    assert created["version"] == 5
    assert created["policyStatus"] == "approved"
    assert created["sourceReference"] == "Décision officielle TEST-2026-001"


@pytest.mark.asyncio
async def test_request_creation_ignores_tampered_client_service_metadata(
    db_session,
    test_tenant,
    test_institution,
    citoyen_user,
):
    citoyen_user.tenant_id = test_tenant.id
    test_institution.type = "mairie"
    test_institution.name = "Mairie Test"
    processing_service = Institution(
        id="test-institution-service",
        tenant_id=test_tenant.id,
        name="Service interne Test",
        type="service",
        parent_id=test_institution.id,
        code="TEST-SVC-001",
        is_active=True,
    )
    db_session.add(processing_service)
    authoritative = catalog_row(
        test_tenant.id,
        service_id="svc-authoritative",
        version=7,
        name="Démarche officielle serveur",
        sla=9,
    )
    authoritative.category_id = "justice"
    authoritative.category_name = "Justice & Légal"
    authoritative.required_documents = ["CNI officielle", "Timbre officiel"]
    authoritative.fee_label = "10 000 GNF"
    authoritative.expected_processing_label = "4 jours"
    authoritative.policy_status = "approved"
    authoritative.source_reference = "Référence officielle TEST-7"
    db_session.add(authoritative)
    await db_session.flush()
    db_session.add(
        InstitutionServiceAssignment(
            tenant_id=test_tenant.id,
            institution_id=test_institution.id,
            service_id=authoritative.service_id,
            service_institution_id=processing_service.id,
            is_active=True,
        )
    )
    await db_session.flush()

    payload = ServiceRequestCreate(
        service_id="svc-authoritative",
        service_name="FAUX SERVICE GRATUIT",
        category="FAUSSE CATÉGORIE",
        category_id="fake",
        target_institution_id=test_institution.id,
        citizen_name="Diallo",
        citizen_first_name="Mamadou",
        citizen_nin="NIN-TEST-001",
        citizen_phone="+224600000001",
        citizen_email="attaquant@example.com",
        citizen_address="Conakry",
        motif="Demande de test",
        required_documents=[],
        delivery_mode="en_ligne",
    )

    response = await create_service_request(payload, db_session, citoyen_user)

    assert response["serviceName"] == "Démarche officielle serveur"
    assert response["category"] == "Justice & Légal"
    assert response["categoryId"] == "justice"
    assert response["documents"] == ["CNI officielle", "Timbre officiel"]
    assert response["deadlineDays"] == 9
    assert response["citizenEmail"] == citoyen_user.email
    assert response["serviceCatalogVersion"] == 7
    assert response["servicePolicyStatus"] == "approved"
    assert response["servicePolicySource"] == "Référence officielle TEST-7"
    assert response["serviceFeeLabel"] == "10 000 GNF"
    assert response["expectedProcessingLabel"] == "4 jours"

    stored = (
        await db_session.execute(
            select(ServiceRequest).where(ServiceRequest.reference == response["reference"])
        )
    ).scalar_one()
    assert stored.service_name == "Démarche officielle serveur"
    assert stored.required_documents == ["CNI officielle", "Timbre officiel"]


@pytest.mark.asyncio
async def test_request_creation_rejects_unknown_service(
    db_session,
    test_tenant,
    test_institution,
    citoyen_user,
):
    citoyen_user.tenant_id = test_tenant.id
    payload = ServiceRequestCreate(
        service_id="not-in-catalog",
        target_institution_id=test_institution.id,
        citizen_name="Diallo",
        citizen_first_name="Mamadou",
        citizen_nin="NIN-TEST-404",
        citizen_phone="+224600000404",
        citizen_email="citoyen.test@eadmin.gn",
        citizen_address="Conakry",
        motif="Demande inconnue",
    )

    with pytest.raises(Exception) as exc:
        await create_service_request(payload, db_session, citoyen_user)

    assert getattr(exc.value, "status_code", None) == 400
