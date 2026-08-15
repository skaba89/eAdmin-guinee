from datetime import datetime, timedelta, timezone
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.service_catalog import (
    ServiceAssignmentUpsert,
    list_service_catalog,
    upsert_service_assignment,
)
from app.api.service_requests import ServiceRequestCreate, _apply_request_scope, create_service_request
from app.api.users import _can_view_user_governed, _institution_in_actor_scope
from app.models.administrative_service import AdministrativeService
from app.models.institution import Institution
from app.models.institution_service_assignment import InstitutionServiceAssignment
from app.models.service_request import ServiceRequest
from app.models.user import RoleEnum, User


TENANT = "routing-matrix-tenant"
OTHER_TENANT = "routing-matrix-other"


def principal(
    role: RoleEnum,
    institution_id: str | None,
    email: str,
    *,
    tenant_id: str = TENANT,
) -> User:
    return User(
        id=uuid.uuid4(),
        email=email,
        hashed_password="test-only-not-used",
        full_name=email.split("@")[0],
        role=role,
        tenant_id=tenant_id,
        institution_id=institution_id,
        is_active=True,
    )


def catalog_service(service_id: str, name: str) -> AdministrativeService:
    return AdministrativeService(
        tenant_id=TENANT,
        service_id=service_id,
        version=1,
        category_id="etat-civil",
        category_name="Etat civil",
        name=name,
        description=f"Démarche {name}",
        fee_label="Gratuit",
        expected_processing_label="5 jours ouvrés",
        sla_business_days=5,
        required_documents=["CNI"],
        routing_terms=[],
        policy_status="operational_default",
        effective_from=datetime.now(timezone.utc) - timedelta(days=1),
        is_active=True,
    )


def request_row(
    reference: str,
    citizen: User,
    mairie: str,
    service_unit: str | None,
    service_id: str,
    *,
    tenant_id: str = TENANT,
) -> ServiceRequest:
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
        motif="Test matrice de routage",
        required_documents=[],
        assigned_service=service_unit or "Service historique",
        timeline=[],
        deadline_days=5,
        deadline_date=now + timedelta(days=5),
        tenant_id=tenant_id,
        institution_id=mairie,
        service_institution_id=service_unit,
    )


async def seed_topology(db_session) -> dict[str, object]:
    institutions = {
        "mairie_a": Institution(
            id="matrix-mairie-a",
            tenant_id=TENANT,
            name="Mairie A",
            type="mairie",
            is_active=True,
        ),
        "service_a1": Institution(
            id="matrix-service-a1",
            tenant_id=TENANT,
            name="Etat civil A1",
            type="service",
            parent_id="matrix-mairie-a",
            is_active=True,
        ),
        "service_a2": Institution(
            id="matrix-service-a2",
            tenant_id=TENANT,
            name="Urbanisme A2",
            type="service",
            parent_id="matrix-mairie-a",
            is_active=True,
        ),
        "mairie_b": Institution(
            id="matrix-mairie-b",
            tenant_id=TENANT,
            name="Mairie B",
            type="mairie",
            is_active=True,
        ),
        "service_b1": Institution(
            id="matrix-service-b1",
            tenant_id=TENANT,
            name="Etat civil B1",
            type="service",
            parent_id="matrix-mairie-b",
            is_active=True,
        ),
    }
    services = {
        "a1": catalog_service("matrix-acte-a1", "Acte A1"),
        "a2": catalog_service("matrix-acte-a2", "Acte A2"),
        "b1": catalog_service("matrix-acte-b1", "Acte B1"),
    }
    assignments = {
        "a1": InstitutionServiceAssignment(
            tenant_id=TENANT,
            institution_id="matrix-mairie-a",
            service_id="matrix-acte-a1",
            service_institution_id="matrix-service-a1",
            is_active=True,
        ),
        "a2": InstitutionServiceAssignment(
            tenant_id=TENANT,
            institution_id="matrix-mairie-a",
            service_id="matrix-acte-a2",
            service_institution_id="matrix-service-a2",
            is_active=True,
        ),
        "b1": InstitutionServiceAssignment(
            tenant_id=TENANT,
            institution_id="matrix-mairie-b",
            service_id="matrix-acte-b1",
            service_institution_id="matrix-service-b1",
            is_active=True,
        ),
    }
    db_session.add_all([*institutions.values(), *services.values(), *assignments.values()])
    await db_session.flush()
    return {
        "institutions": institutions,
        "services": services,
        "assignments": assignments,
    }


@pytest.mark.asyncio
async def test_visibility_matrix_for_all_relevant_roles(db_session):
    await seed_topology(db_session)
    citizen_a = principal(RoleEnum.CITOYEN, None, "matrix-citizen-a@test.gn")
    citizen_b = principal(RoleEnum.CITOYEN, None, "matrix-citizen-b@test.gn")
    citizen_other = principal(
        RoleEnum.CITOYEN,
        None,
        "matrix-citizen-other@test.gn",
        tenant_id=OTHER_TENANT,
    )

    db_session.add_all(
        [
            request_row(
                "MATRIX-A1",
                citizen_a,
                "matrix-mairie-a",
                "matrix-service-a1",
                "matrix-acte-a1",
            ),
            request_row(
                "MATRIX-A2",
                citizen_a,
                "matrix-mairie-a",
                "matrix-service-a2",
                "matrix-acte-a2",
            ),
            request_row(
                "MATRIX-B1",
                citizen_b,
                "matrix-mairie-b",
                "matrix-service-b1",
                "matrix-acte-b1",
            ),
            request_row(
                "MATRIX-OTHER",
                citizen_other,
                "other-mairie",
                "other-service",
                "other-acte",
                tenant_id=OTHER_TENANT,
            ),
        ]
    )
    await db_session.flush()

    async def visible(user: User) -> set[str]:
        rows = (
            await db_session.execute(_apply_request_scope(select(ServiceRequest), user))
        ).scalars().all()
        return {row.reference for row in rows if row.reference.startswith("MATRIX-")}

    cases = [
        (citizen_a, {"MATRIX-A1", "MATRIX-A2"}),
        (citizen_b, {"MATRIX-B1"}),
        (principal(RoleEnum.AGENT, "matrix-service-a1", "agent-a1@test.gn"), {"MATRIX-A1"}),
        (
            principal(RoleEnum.CHEF_SERVICE, "matrix-service-a1", "chef-a1@test.gn"),
            {"MATRIX-A1"},
        ),
        (principal(RoleEnum.AGENT, "matrix-service-a2", "agent-a2@test.gn"), {"MATRIX-A2"}),
        (
            principal(RoleEnum.MAIRIE, "matrix-mairie-a", "mairie-a@test.gn"),
            {"MATRIX-A1", "MATRIX-A2"},
        ),
        (
            principal(RoleEnum.ADMIN, "matrix-mairie-a", "admin-a@test.gn"),
            {"MATRIX-A1", "MATRIX-A2"},
        ),
        (
            principal(RoleEnum.DIRECTEUR, "matrix-mairie-a", "directeur-a@test.gn"),
            {"MATRIX-A1", "MATRIX-A2"},
        ),
        (
            principal(RoleEnum.MINISTRE, None, "ministre@test.gn"),
            {"MATRIX-A1", "MATRIX-A2", "MATRIX-B1"},
        ),
        (
            principal(RoleEnum.SUPER_ADMIN, None, "super@test.gn"),
            {"MATRIX-A1", "MATRIX-A2", "MATRIX-B1", "MATRIX-OTHER"},
        ),
        (
            principal(
                RoleEnum.AGENT,
                "matrix-service-a1",
                "other-tenant-agent@test.gn",
                tenant_id=OTHER_TENANT,
            ),
            set(),
        ),
    ]

    for user, expected in cases:
        assert await visible(user) == expected, user.email

    with pytest.raises(HTTPException) as exc:
        _apply_request_scope(
            select(ServiceRequest),
            principal(RoleEnum.AGENT, None, "agent-without-service@test.gn"),
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_catalog_is_scoped_to_mairie_and_internal_service(db_session):
    await seed_topology(db_session)

    admin_a = principal(RoleEnum.ADMIN, "matrix-mairie-a", "catalog-admin-a@test.gn")
    mairie_a = principal(RoleEnum.MAIRIE, "matrix-mairie-a", "catalog-mairie-a@test.gn")
    agent_a1 = principal(RoleEnum.AGENT, "matrix-service-a1", "catalog-agent-a1@test.gn")
    chef_a2 = principal(
        RoleEnum.CHEF_SERVICE,
        "matrix-service-a2",
        "catalog-chef-a2@test.gn",
    )

    admin_catalog = await list_service_catalog(
        category_id=None,
        search=None,
        institution_id=None,
        db=db_session,
        current_user=admin_a,
    )
    mairie_catalog = await list_service_catalog(
        category_id=None,
        search=None,
        institution_id=None,
        db=db_session,
        current_user=mairie_a,
    )
    agent_catalog = await list_service_catalog(
        category_id=None,
        search=None,
        institution_id=None,
        db=db_session,
        current_user=agent_a1,
    )
    chef_catalog = await list_service_catalog(
        category_id=None,
        search=None,
        institution_id=None,
        db=db_session,
        current_user=chef_a2,
    )

    assert {item["serviceId"] for item in admin_catalog["items"]} == {
        "matrix-acte-a1",
        "matrix-acte-a2",
    }
    assert {item["serviceId"] for item in mairie_catalog["items"]} == {
        "matrix-acte-a1",
        "matrix-acte-a2",
    }
    assert {item["serviceId"] for item in agent_catalog["items"]} == {"matrix-acte-a1"}
    assert {item["serviceId"] for item in chef_catalog["items"]} == {"matrix-acte-a2"}

    with pytest.raises(HTTPException) as exc:
        await list_service_catalog(
            category_id=None,
            search=None,
            institution_id="matrix-mairie-b",
            db=db_session,
            current_user=admin_a,
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_submission_uses_server_authoritative_catalog_and_identity(db_session):
    await seed_topology(db_session)
    citizen = principal(RoleEnum.CITOYEN, None, "real-citizen-email@test.gn")

    payload = ServiceRequestCreate.model_validate(
        {
            "service_id": "matrix-acte-a1",
            "service_name": "FAUX SERVICE",
            "category": "FAUSSE CATEGORIE",
            "category_id": "fake",
            "target_institution_id": "matrix-mairie-a",
            "citizen_name": "Diallo",
            "citizen_first_name": "Aminata",
            "citizen_nin": "GN-MATRIX-001",
            "citizen_phone": "+224600000001",
            "citizen_email": "spoofed@test.invalid",
            "citizen_address": "Commune A",
            "motif": "Demande valide",
            "required_documents": ["FAUX DOCUMENT"],
        }
    )

    created = await create_service_request(payload, db_session, citizen)
    assert created["serviceName"] == "Acte A1"
    assert created["category"] == "Etat civil"
    assert created["categoryId"] == "etat-civil"
    assert created["documents"] == ["CNI"]
    assert created["citizenEmail"] == "real-citizen-email@test.gn"
    assert created["institutionId"] == "matrix-mairie-a"
    assert created["serviceInstitutionId"] == "matrix-service-a1"
    assert created["assignedService"] == "Etat civil A1"


@pytest.mark.asyncio
async def test_submission_rejects_invalid_or_cross_mairie_routing(db_session):
    seeded = await seed_topology(db_session)
    institutions = seeded["institutions"]
    services = seeded["services"]
    assignments = seeded["assignments"]
    citizen = principal(RoleEnum.CITOYEN, None, "validation-citizen@test.gn")

    def payload(service_id: str = "matrix-acte-a1", target: str = "matrix-mairie-a"):
        return ServiceRequestCreate(
            service_id=service_id,
            target_institution_id=target,
            citizen_name="Diallo",
            citizen_first_name="Aminata",
            citizen_nin=f"GN-{uuid.uuid4().hex[:12]}",
            citizen_phone="+224600000001",
            citizen_address="Conakry",
            motif="Test validation routage",
        )

    with pytest.raises(HTTPException) as exc:
        await create_service_request(payload("unknown-service"), db_session, citizen)
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        await create_service_request(
            payload(target="matrix-service-a1"), db_session, citizen
        )
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        await create_service_request(
            payload("matrix-acte-a1", "matrix-mairie-b"), db_session, citizen
        )
    assert exc.value.status_code == 400

    admin_a = principal(RoleEnum.ADMIN, "matrix-mairie-a", "validation-admin-a@test.gn")
    with pytest.raises(HTTPException) as exc:
        await create_service_request(
            payload("matrix-acte-b1", "matrix-mairie-b"), db_session, admin_a
        )
    assert exc.value.status_code == 403

    assignments["a1"].is_active = False
    await db_session.flush()
    with pytest.raises(HTTPException) as exc:
        await create_service_request(payload(), db_session, citizen)
    assert exc.value.status_code == 400
    assignments["a1"].is_active = True

    institutions["service_a1"].is_active = False
    await db_session.flush()
    with pytest.raises(HTTPException) as exc:
        await create_service_request(payload(), db_session, citizen)
    assert exc.value.status_code == 409
    institutions["service_a1"].is_active = True

    assignments["a1"].service_institution_id = "matrix-service-b1"
    await db_session.flush()
    with pytest.raises(HTTPException) as exc:
        await create_service_request(payload(), db_session, citizen)
    assert exc.value.status_code == 409
    assignments["a1"].service_institution_id = "matrix-service-a1"

    institutions["mairie_a"].is_active = False
    await db_session.flush()
    with pytest.raises(HTTPException) as exc:
        await create_service_request(payload(), db_session, citizen)
    assert exc.value.status_code == 400
    institutions["mairie_a"].is_active = True

    services["a1"].is_active = False
    await db_session.flush()
    with pytest.raises(HTTPException) as exc:
        await create_service_request(payload(), db_session, citizen)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_assignment_management_rejects_cross_mairie_and_invalid_team(db_session):
    seeded = await seed_topology(db_session)
    institutions = seeded["institutions"]
    admin_a = principal(RoleEnum.ADMIN, "matrix-mairie-a", "assignment-admin-a@test.gn")
    agent_a = principal(RoleEnum.AGENT, "matrix-service-a1", "assignment-agent-a@test.gn")

    moved = await upsert_service_assignment(
        institution_id="matrix-mairie-a",
        service_id="matrix-acte-a1",
        payload=ServiceAssignmentUpsert(service_institution_id="matrix-service-a2"),
        db=db_session,
        current_user=admin_a,
    )
    assert moved["institutionId"] == "matrix-mairie-a"
    assert moved["serviceInstitutionId"] == "matrix-service-a2"

    with pytest.raises(HTTPException) as exc:
        await upsert_service_assignment(
            institution_id="matrix-mairie-b",
            service_id="matrix-acte-b1",
            payload=ServiceAssignmentUpsert(service_institution_id="matrix-service-b1"),
            db=db_session,
            current_user=admin_a,
        )
    assert exc.value.status_code == 403

    with pytest.raises(HTTPException) as exc:
        await upsert_service_assignment(
            institution_id="matrix-mairie-a",
            service_id="matrix-acte-a2",
            payload=ServiceAssignmentUpsert(service_institution_id="matrix-service-b1"),
            db=db_session,
            current_user=admin_a,
        )
    assert exc.value.status_code == 422

    with pytest.raises(HTTPException) as exc:
        await upsert_service_assignment(
            institution_id="matrix-mairie-a",
            service_id="matrix-acte-a2",
            payload=ServiceAssignmentUpsert(service_institution_id="matrix-service-a2"),
            db=db_session,
            current_user=agent_a,
        )
    assert exc.value.status_code == 403

    institutions["service_a2"].is_active = False
    await db_session.flush()
    with pytest.raises(HTTPException) as exc:
        await upsert_service_assignment(
            institution_id="matrix-mairie-a",
            service_id="matrix-acte-a2",
            payload=ServiceAssignmentUpsert(service_institution_id="matrix-service-a2"),
            db=db_session,
            current_user=admin_a,
        )
    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_mairie_admin_team_scope_is_descendant_only(db_session):
    await seed_topology(db_session)
    admin_a = principal(RoleEnum.ADMIN, "matrix-mairie-a", "team-admin-a@test.gn")
    agent_a = principal(RoleEnum.AGENT, "matrix-service-a1", "team-agent-a@test.gn")
    agent_b = principal(RoleEnum.AGENT, "matrix-service-b1", "team-agent-b@test.gn")
    chef_a = principal(RoleEnum.CHEF_SERVICE, "matrix-service-a1", "team-chef-a@test.gn")

    assert await _institution_in_actor_scope(db_session, admin_a, "matrix-mairie-a")
    assert await _institution_in_actor_scope(db_session, admin_a, "matrix-service-a1")
    assert await _institution_in_actor_scope(db_session, admin_a, "matrix-service-a2")
    assert not await _institution_in_actor_scope(db_session, admin_a, "matrix-mairie-b")
    assert not await _institution_in_actor_scope(db_session, admin_a, "matrix-service-b1")

    assert await _can_view_user_governed(db_session, admin_a, agent_a)
    assert not await _can_view_user_governed(db_session, admin_a, agent_b)
    assert not await _can_view_user_governed(db_session, admin_a, chef_a)

    other_tenant_agent = principal(
        RoleEnum.AGENT,
        "matrix-service-a1",
        "team-other-tenant@test.gn",
        tenant_id=OTHER_TENANT,
    )
    assert not await _can_view_user_governed(db_session, admin_a, other_tenant_agent)
