from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.api.ai_grounded import _catalog_scope
from app.models.administrative_service import AdministrativeService
from app.models.institution import Institution
from app.models.institution_service_assignment import InstitutionServiceAssignment
from app.models.user import RoleEnum
from app.services.grounded_ai_service import GroundedGovernmentAssistant


def _user(role: RoleEnum, institution_id: str | None):
    return SimpleNamespace(role=role, institution_id=institution_id)


def test_catalog_scope_ignores_client_escape_for_municipal_staff():
    assert _catalog_scope(_user(RoleEnum.MAIRIE, "mairie-a"), "mairie-b") == (
        "mairie-a",
        None,
    )
    assert _catalog_scope(_user(RoleEnum.ADMIN, "mairie-a"), "mairie-b") == (
        "mairie-a",
        None,
    )
    assert _catalog_scope(_user(RoleEnum.AGENT, "service-a"), "mairie-b") == (
        None,
        "service-a",
    )
    assert _catalog_scope(_user(RoleEnum.CHEF_SERVICE, "service-a"), "mairie-b") == (
        None,
        "service-a",
    )


def test_catalog_scope_allows_explicit_target_for_citizen_and_supervision():
    assert _catalog_scope(_user(RoleEnum.CITOYEN, None), "mairie-b") == (
        "mairie-b",
        None,
    )
    assert _catalog_scope(_user(RoleEnum.SUPER_ADMIN, None), "mairie-b") == (
        "mairie-b",
        None,
    )
    assert _catalog_scope(_user(RoleEnum.MINISTRE, None), "mairie-b") == (
        "mairie-b",
        None,
    )


def _catalog_service(tenant_id: str, service_id: str, name: str) -> AdministrativeService:
    now = datetime.now(timezone.utc)
    return AdministrativeService(
        tenant_id=tenant_id,
        service_id=service_id,
        version=1,
        category_id="etat-civil",
        category_name="État civil",
        name=name,
        description=f"Démarche municipale {name}",
        sla_business_days=5,
        required_documents=[],
        routing_terms=["naissance", "certificat"],
        policy_status="operational_default",
        source_reference="TEST-AI-SCOPE",
        effective_from=now - timedelta(minutes=1),
        effective_to=None,
        is_active=True,
    )


@pytest.mark.asyncio
async def test_find_services_is_scoped_by_municipality_assignment(db_session, test_tenant):
    mairie_a = Institution(
        id="ai-mairie-a",
        tenant_id=test_tenant.id,
        name="Mairie IA A",
        type="mairie",
        code="AI-MA-A",
        is_active=True,
    )
    mairie_b = Institution(
        id="ai-mairie-b",
        tenant_id=test_tenant.id,
        name="Mairie IA B",
        type="mairie",
        code="AI-MA-B",
        is_active=True,
    )
    service_a = Institution(
        id="ai-service-a",
        tenant_id=test_tenant.id,
        name="Service IA A",
        type="service",
        code="AI-SVC-A",
        parent_id=mairie_a.id,
        is_active=True,
    )
    service_b = Institution(
        id="ai-service-b",
        tenant_id=test_tenant.id,
        name="Service IA B",
        type="service",
        code="AI-SVC-B",
        parent_id=mairie_b.id,
        is_active=True,
    )
    catalog_a = _catalog_service(test_tenant.id, "ai-svc-a", "Naissance Alpha")
    catalog_b = _catalog_service(test_tenant.id, "ai-svc-b", "Naissance Beta")
    db_session.add_all([mairie_a, mairie_b, service_a, service_b, catalog_a, catalog_b])
    await db_session.flush()
    db_session.add_all(
        [
            InstitutionServiceAssignment(
                tenant_id=test_tenant.id,
                institution_id=mairie_a.id,
                service_id=catalog_a.service_id,
                service_institution_id=service_a.id,
                is_active=True,
            ),
            InstitutionServiceAssignment(
                tenant_id=test_tenant.id,
                institution_id=mairie_b.id,
                service_id=catalog_b.service_id,
                service_institution_id=service_b.id,
                is_active=True,
            ),
        ]
    )
    await db_session.flush()

    assistant = GroundedGovernmentAssistant()
    matches_a = await assistant.find_services(
        db_session,
        "naissance",
        test_tenant.id,
        institution_id=mairie_a.id,
    )
    matches_b = await assistant.find_services(
        db_session,
        "naissance",
        test_tenant.id,
        institution_id=mairie_b.id,
    )
    matches_service_a = await assistant.find_services(
        db_session,
        "naissance",
        test_tenant.id,
        service_institution_id=service_a.id,
    )

    assert [match.service.service_id for match in matches_a] == ["ai-svc-a"]
    assert [match.service.service_id for match in matches_b] == ["ai-svc-b"]
    assert [match.service.service_id for match in matches_service_a] == ["ai-svc-a"]


@pytest.mark.asyncio
async def test_scoped_grounded_ai_fails_closed_without_tenant(db_session):
    assistant = GroundedGovernmentAssistant()

    matches = await assistant.find_services(
        db_session,
        "naissance",
        None,
        institution_id="ai-mairie-a",
    )

    assert matches == []
