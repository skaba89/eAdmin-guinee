"""Contract tests for the non-production multi-role recette dataset."""

from scripts.seed_recette_data import (
    INSTITUTIONS,
    ISOLATION_TENANT,
    PRIMARY_TENANT,
    RECETTE_DOMAIN,
    REQUESTS,
    SERVICES,
    USERS,
)
from app.models.service_request import DeliveryModeEnum, ServiceRequestStatusEnum
from app.models.user import RoleEnum


def test_recette_seed_covers_every_application_role():
    seeded_roles = {spec["role"] for spec in USERS}
    assert seeded_roles == set(RoleEnum)


def test_recette_seed_covers_every_request_status():
    seeded_statuses = {spec["status"] for spec in REQUESTS}
    assert seeded_statuses == set(ServiceRequestStatusEnum)


def test_recette_seed_covers_every_delivery_mode():
    seeded_modes = {spec["delivery"] for spec in REQUESTS}
    assert seeded_modes == set(DeliveryModeEnum)


def test_recette_seed_has_primary_and_isolation_tenants():
    user_tenants = {spec["tenant_id"] for spec in USERS}
    institution_tenants = {spec["tenant_id"] for spec in INSTITUTIONS}
    service_tenants = {spec["tenant_id"] for spec in SERVICES}

    assert PRIMARY_TENANT in user_tenants
    assert ISOLATION_TENANT in user_tenants
    assert {PRIMARY_TENANT, ISOLATION_TENANT}.issubset(institution_tenants)
    assert {PRIMARY_TENANT, ISOLATION_TENANT}.issubset(service_tenants)


def test_recette_accounts_are_explicitly_separated_from_normal_accounts():
    emails = [spec["email"] for spec in USERS]
    assert len(emails) == len(set(emails))
    assert all(email.endswith(f"@{RECETTE_DOMAIN}") for email in emails)


def test_recette_request_references_are_unique_and_identifiable():
    references = [spec["reference"] for spec in REQUESTS]
    assert len(references) == len(set(references))
    assert all(reference.startswith("REC-") for reference in references)


def test_recette_institution_ids_and_service_ids_are_unique():
    institution_ids = [spec["id"] for spec in INSTITUTIONS]
    service_keys = [(spec["tenant_id"], spec["service_id"]) for spec in SERVICES]

    assert len(institution_ids) == len(set(institution_ids))
    assert len(service_keys) == len(set(service_keys))


def test_recette_contains_security_and_operational_edge_cases():
    assert any(spec.get("overdue") for spec in REQUESTS)
    assert any(spec.get("generated") for spec in REQUESTS)
    assert any(spec.get("rating") for spec in REQUESTS)
    assert any(spec["status"] == ServiceRequestStatusEnum.REJETEE for spec in REQUESTS)
    assert any(spec["tenant_id"] == ISOLATION_TENANT for spec in USERS)
