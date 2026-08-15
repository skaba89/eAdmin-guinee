from datetime import datetime, timedelta, timezone
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.service_requests import ServiceRequestCreate, _apply_request_scope, create_service_request
from app.models.administrative_service import AdministrativeService
from app.models.institution import Institution
from app.models.institution_service_assignment import InstitutionServiceAssignment
from app.models.service_request import ServiceRequest
from app.models.user import RoleEnum, User
from app.services.service_catalog import list_active_services


TENANT = "guinee-routing-test"


def principal(role: RoleEnum, institution_id: str | None, email: str) -> User:
    return User(
        id=uuid.uuid4(),
        email=email,
        hashed_password="test-only-not-used",
        full_name=email.split("@")[0],
        role=role,
        tenant_id=TENANT,
        institution_id=institution_id,
        is_active=True,
    )


def request_row(reference: str, citizen: User, mairie: str, service_unit: str, service_id: str) -> ServiceRequest:
    now = datetime.now(timezone.utc)
    return ServiceRequest(
        reference=reference,
        service_id=service_id,
        service_name=service_id,
        category="Etat civil",
        category_id="etat-civil",
        citizen_id=citizen.id,
        citizen_name="Citoyen",
        citizen_first_name=reference,
        citizen_nin=f"NIN-{reference}",
        citizen_phone="+224600000000",
        citizen_email=citizen.email,
        citizen_address="Conakry",
        motif="Test isolation municipale",
        required_documents=[],
        assigned_service=service_unit,
        timeline=[],
        deadline_days=5,
        deadline_date=now + timedelta(days=5),
        tenant_id=TENANT,
        institution_id=mairie,
        service_institution_id=service_unit,
    )


@pytest.mark.asyncio
async def test_two_mairies_two_services_are_strictly_isolated(db_session):
    mairie_a = Institution(id="mairie-a", tenant_id=TENANT, name="Mairie A", type="mairie", is_active=True)
    service_a = Institution(id="service-a", tenant_id=TENANT, name="Etat civil A", type="service", parent_id="mairie-a", is_active=True)
    mairie_b = Institution(id="mairie-b", tenant_id=TENANT, name="Mairie B", type="mairie", is_active=True)
    service_b = Institution(id="service-b", tenant_id=TENANT, name="Etat civil B", type="service", parent_id="mairie-b", is_active=True)
    db_session.add_all([mairie_a, service_a, mairie_b, service_b])

    citizen_a = principal(RoleEnum.CITOYEN, None, "citizen-a@test.gn")
    citizen_b = principal(RoleEnum.CITOYEN, None, "citizen-b@test.gn")
    agent_a = principal(RoleEnum.AGENT, "service-a", "agent-a@test.gn")
    agent_b = principal(RoleEnum.AGENT, "service-b", "agent-b@test.gn")
    mairie_user_a = principal(RoleEnum.MAIRIE, "mairie-a", "mairie-a@test.gn")
    mairie_user_b = principal(RoleEnum.MAIRIE, "mairie-b", "mairie-b@test.gn")

    db_session.add_all(
        [
            request_row("REQ-A", citizen_a, "mairie-a", "service-a", "acte-a"),
            request_row("REQ-B", citizen_b, "mairie-b", "service-b", "acte-b"),
        ]
    )
    await db_session.flush()

    async def visible(user: User) -> set[str]:
        rows = (await db_session.execute(_apply_request_scope(select(ServiceRequest), user))).scalars().all()
        return {row.reference for row in rows}

    assert await visible(agent_a) == {"REQ-A"}
    assert await visible(agent_b) == {"REQ-B"}
    assert await visible(mairie_user_a) == {"REQ-A"}
    assert await visible(mairie_user_b) == {"REQ-B"}


@pytest.mark.asyncio
async def test_catalog_and_submission_are_bound_to_selected_mairie(db_session):
    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            Institution(id="mairie-a", tenant_id=TENANT, name="Mairie A", type="mairie", is_active=True),
            Institution(id="service-a", tenant_id=TENANT, name="Etat civil A", type="service", parent_id="mairie-a", is_active=True),
            Institution(id="mairie-b", tenant_id=TENANT, name="Mairie B", type="mairie", is_active=True),
            Institution(id="service-b", tenant_id=TENANT, name="Etat civil B", type="service", parent_id="mairie-b", is_active=True),
            AdministrativeService(
                tenant_id=TENANT,
                service_id="acte-a",
                version=1,
                category_id="etat-civil",
                category_name="Etat civil",
                name="Acte A",
                description="",
                sla_business_days=5,
                required_documents=[],
                routing_terms=[],
                effective_from=now - timedelta(days=1),
                is_active=True,
            ),
            AdministrativeService(
                tenant_id=TENANT,
                service_id="acte-b",
                version=1,
                category_id="etat-civil",
                category_name="Etat civil",
                name="Acte B",
                description="",
                sla_business_days=5,
                required_documents=[],
                routing_terms=[],
                effective_from=now - timedelta(days=1),
                is_active=True,
            ),
            InstitutionServiceAssignment(
                tenant_id=TENANT,
                institution_id="mairie-a",
                service_id="acte-a",
                service_institution_id="service-a",
                is_active=True,
            ),
            InstitutionServiceAssignment(
                tenant_id=TENANT,
                institution_id="mairie-b",
                service_id="acte-b",
                service_institution_id="service-b",
                is_active=True,
            ),
        ]
    )
    await db_session.flush()

    assert [s.service_id for s in await list_active_services(db_session, TENANT, institution_id="mairie-a")] == ["acte-a"]
    assert [s.service_id for s in await list_active_services(db_session, TENANT, institution_id="mairie-b")] == ["acte-b"]

    citizen = principal(RoleEnum.CITOYEN, None, "citizen-submit@test.gn")
    payload = ServiceRequestCreate(
        service_id="acte-a",
        target_institution_id="mairie-a",
        citizen_name="Diallo",
        citizen_first_name="Aminata",
        citizen_nin="GN-TEST-001",
        citizen_phone="+224600000001",
        citizen_address="Commune A",
        motif="Demande acte A",
    )
    created = await create_service_request(payload, db_session, citizen)
    assert created["institutionId"] == "mairie-a"
    assert created["serviceInstitutionId"] == "service-a"

    wrong = payload.model_copy(update={"service_id": "acte-b"})
    with pytest.raises(HTTPException) as exc:
        await create_service_request(wrong, db_session, citizen)
    assert exc.value.status_code == 400
    assert "pas proposée" in exc.value.detail


@pytest.mark.asyncio
async def test_legacy_request_becomes_visible_through_mairie_service_mapping(db_session):
    db_session.add_all([
        Institution(id="legacy-mairie-a", tenant_id=TENANT, name="Legacy Mairie A", type="mairie", is_active=True),
        Institution(id="legacy-service-a", tenant_id=TENANT, name="Legacy Service A", type="service", parent_id="legacy-mairie-a", is_active=True),
        Institution(id="legacy-mairie-b", tenant_id=TENANT, name="Legacy Mairie B", type="mairie", is_active=True),
        Institution(id="legacy-service-b", tenant_id=TENANT, name="Legacy Service B", type="service", parent_id="legacy-mairie-b", is_active=True),
        InstitutionServiceAssignment(tenant_id=TENANT, institution_id="legacy-mairie-a", service_id="legacy-acte", service_institution_id="legacy-service-a", is_active=True),
    ])
    citizen = principal(RoleEnum.CITOYEN, None, "legacy-citizen@test.gn")
    legacy = request_row("REQ-LEGACY-A", citizen, "legacy-mairie-a", "legacy-service-a", "legacy-acte")
    legacy.service_institution_id = None
    db_session.add(legacy)
    await db_session.flush()

    agent_a = principal(RoleEnum.AGENT, "legacy-service-a", "legacy-agent-a@test.gn")
    agent_b = principal(RoleEnum.AGENT, "legacy-service-b", "legacy-agent-b@test.gn")
    visible_a = (await db_session.execute(_apply_request_scope(select(ServiceRequest), agent_a))).scalars().all()
    visible_b = (await db_session.execute(_apply_request_scope(select(ServiceRequest), agent_b))).scalars().all()
    assert {row.reference for row in visible_a} == {"REQ-LEGACY-A"}
    assert {row.reference for row in visible_b} == set()
