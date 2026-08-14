"""Real HTTP E2E checks for every eAdmin role against the recette dataset.

This script is designed for the local/CI Docker stack after ``seed_recette_data.py``.
It signs short-lived test JWTs server-side so all nine roles can be exercised
without weakening the production login rate limiter. Requests still traverse
FastAPI authentication, middleware, RBAC/RLS scoping and PostgreSQL.
"""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass

import httpx
from sqlalchemy import select

from app.api.auth import create_access_token
from app.config import settings
from app.database import async_session_factory
from app.models.service_request import ServiceRequest, ServiceRequestStatusEnum
from app.models.user import RoleEnum, User

RECETTE_DOMAIN = "recette.eadmin.gn"
BASE_URL = os.getenv("EADMIN_RECETTE_E2E_BASE_URL", "http://localhost:8000/api/v1").rstrip("/")


@dataclass(frozen=True)
class ScopeCase:
    email: str
    role: RoleEnum
    expected_references: frozenset[str]


PRIMARY_REFERENCES = frozenset(f"REC-GN-2026-{index:03d}" for index in range(1, 9))
ALL_REFERENCES = PRIMARY_REFERENCES | {"REC-ISO-2026-001"}
RATOMA_REFERENCES = frozenset({"REC-GN-2026-001", "REC-GN-2026-002", "REC-GN-2026-007"})

CASES = (
    ScopeCase(
        f"citoyen.awa@{RECETTE_DOMAIN}",
        RoleEnum.CITOYEN,
        RATOMA_REFERENCES,
    ),
    ScopeCase(
        f"agent.ratoma@{RECETTE_DOMAIN}",
        RoleEnum.AGENT,
        RATOMA_REFERENCES,
    ),
    ScopeCase(
        f"mairie.ratoma@{RECETTE_DOMAIN}",
        RoleEnum.MAIRIE,
        RATOMA_REFERENCES,
    ),
    ScopeCase(
        f"agence.anip@{RECETTE_DOMAIN}",
        RoleEnum.AGENCE,
        frozenset({"REC-GN-2026-004"}),
    ),
    ScopeCase(
        f"admin.ratoma@{RECETTE_DOMAIN}",
        RoleEnum.ADMIN,
        RATOMA_REFERENCES,
    ),
    ScopeCase(
        f"chef.casier@{RECETTE_DOMAIN}",
        RoleEnum.CHEF_SERVICE,
        frozenset({"REC-GN-2026-006"}),
    ),
    # DIRECTEUR is scoped to its signed institution plus active descendants.
    # The seeded Justice dossier is attached to the child Casier service.
    ScopeCase(
        f"directeur.justice@{RECETTE_DOMAIN}",
        RoleEnum.DIRECTEUR,
        frozenset({"REC-GN-2026-006"}),
    ),
    ScopeCase(
        f"ministre.justice@{RECETTE_DOMAIN}",
        RoleEnum.MINISTRE,
        PRIMARY_REFERENCES,
    ),
    ScopeCase(
        f"superadmin.recette@{RECETTE_DOMAIN}",
        RoleEnum.SUPER_ADMIN,
        ALL_REFERENCES,
    ),
)


def _headers(user: User) -> dict[str, str]:
    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "frontend_role": user.role.to_frontend_role(),
            "tenant_id": user.tenant_id or settings.TENANT_DEFAULT_ID,
            "institution_id": user.institution_id or "",
            "mfa_required": False,
            "mfa_verified": True,
        }
    )
    return {"Authorization": f"Bearer {token}"}


async def _load_fixtures() -> tuple[dict[str, User], dict[str, ServiceRequest]]:
    async with async_session_factory() as session:
        users = list(
            (
                await session.execute(
                    select(User).where(User.email.in_([case.email for case in CASES]))
                )
            )
            .scalars()
            .all()
        )
        requests = list(
            (
                await session.execute(
                    select(ServiceRequest).where(ServiceRequest.reference.in_(ALL_REFERENCES))
                )
            )
            .scalars()
            .all()
        )

    user_map = {user.email: user for user in users}
    request_map = {request.reference: request for request in requests}
    missing_users = {case.email for case in CASES} - set(user_map)
    missing_requests = ALL_REFERENCES - set(request_map)
    assert not missing_users, f"Utilisateurs recette manquants: {sorted(missing_users)}"
    assert not missing_requests, f"Dossiers recette manquants: {sorted(missing_requests)}"
    return user_map, request_map


async def _assert_role_scope(
    client: httpx.AsyncClient,
    *,
    user: User,
    case: ScopeCase,
) -> None:
    response = await client.get(
        "/service-requests",
        params={"page": 1, "page_size": 200},
        headers=_headers(user),
    )
    assert response.status_code == 200, (
        f"{case.role.value}: liste HTTP {response.status_code}: {response.text}"
    )
    payload = response.json()
    references = {item["reference"] for item in payload["items"] if item["reference"].startswith("REC-")}
    assert references == set(case.expected_references), (
        f"{case.role.value}: scope inattendu. attendu={sorted(case.expected_references)}, "
        f"reçu={sorted(references)}"
    )
    assert payload["total"] == len(case.expected_references), (
        f"{case.role.value}: total inattendu {payload['total']}"
    )
    print(f"PASS scope {case.role.value}: {len(references)} dossier(s)")


async def _assert_hidden_detail(
    client: httpx.AsyncClient,
    *,
    user: User,
    target: ServiceRequest,
    label: str,
) -> None:
    response = await client.get(
        f"/service-requests/{target.id}",
        headers=_headers(user),
    )
    assert response.status_code == 404, (
        f"{label}: HTTP 404 attendu pour un dossier hors périmètre, "
        f"reçu {response.status_code}: {response.text}"
    )
    print(f"PASS isolation {label}: 404 fail-closed")


async def _assert_decision_probe(
    client: httpx.AsyncClient,
    *,
    user: User,
    target: ServiceRequest,
    target_status: ServiceRequestStatusEnum,
    expected_http_status: int,
    expected_detail_fragment: str,
    label: str,
) -> None:
    """Probe approve/reject authorization without changing seeded business state.

    A 403 proves the role is blocked by RBAC before any workflow mutation.
    A 409 on a terminal dossier proves approve/reject permission and request
    scope both passed, then the workflow state machine safely rejected the
    impossible transition without mutating the seeded state.
    """
    response = await client.post(
        f"/service-requests/{target.id}/status",
        json={"status": target_status.value, "note": f"Probe E2E {label}"},
        headers=_headers(user),
    )
    assert response.status_code == expected_http_status, (
        f"{label}: HTTP {expected_http_status} attendu, reçu "
        f"{response.status_code}: {response.text}"
    )
    detail = str(response.json().get("detail", ""))
    assert expected_detail_fragment.lower() in detail.lower(), (
        f"{label}: détail inattendu: {detail!r}"
    )
    print(
        f"PASS decision {label}: HTTP {expected_http_status} "
        f"({target_status.value})"
    )


async def _assert_request_status_unchanged(
    client: httpx.AsyncClient,
    *,
    user: User,
    target: ServiceRequest,
    expected_status: ServiceRequestStatusEnum,
    label: str,
) -> None:
    response = await client.get(
        f"/service-requests/{target.id}",
        headers=_headers(user),
    )
    assert response.status_code == 200, f"{label}: GET HTTP {response.status_code}: {response.text}"
    current_status = response.json()["status"]
    assert current_status == expected_status.value, (
        f"{label}: statut modifié par un probe refusé: {current_status}"
    )
    print(f"PASS non-mutation {label}: {current_status}")


async def _assert_decision_permissions(
    client: httpx.AsyncClient,
    *,
    user_map: dict[str, User],
    request_map: dict[str, ServiceRequest],
) -> None:
    ratoma_en_cours = request_map["REC-GN-2026-002"]
    anip_validee = request_map["REC-GN-2026-004"]
    justice_livree = request_map["REC-GN-2026-006"]

    denied_cases = (
        (f"citoyen.awa@{RECETTE_DOMAIN}", ratoma_en_cours, "CITOYEN"),
        (f"agent.ratoma@{RECETTE_DOMAIN}", ratoma_en_cours, "AGENT"),
        (f"mairie.ratoma@{RECETTE_DOMAIN}", ratoma_en_cours, "MAIRIE"),
        (f"admin.ratoma@{RECETTE_DOMAIN}", ratoma_en_cours, "ADMIN"),
        (f"agence.anip@{RECETTE_DOMAIN}", anip_validee, "AGENCE"),
    )
    for email, target, role_label in denied_cases:
        user = user_map[email]
        for target_status, action_label in (
            (ServiceRequestStatusEnum.VALIDEE, "approve"),
            (ServiceRequestStatusEnum.REJETEE, "reject"),
        ):
            await _assert_decision_probe(
                client,
                user=user,
                target=target,
                target_status=target_status,
                expected_http_status=403,
                expected_detail_fragment="permission",
                label=f"{role_label} sans {action_label}",
            )

    # CHEF_SERVICE, DIRECTEUR, MINISTRE and SUPER_ADMIN own approve/reject permission.
    # The terminal Justice dossier guarantees a non-destructive 409 after RBAC
    # and scope evaluation.
    for email, role_label in (
        (f"chef.casier@{RECETTE_DOMAIN}", "CHEF_SERVICE"),
        (f"directeur.justice@{RECETTE_DOMAIN}", "DIRECTEUR"),
        (f"ministre.justice@{RECETTE_DOMAIN}", "MINISTRE"),
        (f"superadmin.recette@{RECETTE_DOMAIN}", "SUPER_ADMIN"),
    ):
        user = user_map[email]
        for target_status, action_label in (
            (ServiceRequestStatusEnum.VALIDEE, "approve"),
            (ServiceRequestStatusEnum.REJETEE, "reject"),
        ):
            await _assert_decision_probe(
                client,
                user=user,
                target=justice_livree,
                target_status=target_status,
                expected_http_status=409,
                expected_detail_fragment="Transition interdite",
                label=f"{role_label} possède {action_label}",
            )

    # Forbidden probes must not have altered the seeded in-progress request.
    await _assert_request_status_unchanged(
        client,
        user=user_map[f"admin.ratoma@{RECETTE_DOMAIN}"],
        target=ratoma_en_cours,
        expected_status=ServiceRequestStatusEnum.EN_COURS,
        label="REC-GN-2026-002 après probes RBAC",
    )


async def main() -> None:
    if settings.is_production:
        raise RuntimeError("Le contrôle E2E de recette est interdit en production.")

    user_map, request_map = await _load_fixtures()
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=20.0) as client:
        for case in CASES:
            user = user_map[case.email]
            assert user.role == case.role, (
                f"{case.email}: rôle seed {user.role.value}, attendu {case.role.value}"
            )
            await _assert_role_scope(client, user=user, case=case)

        await _assert_hidden_detail(
            client,
            user=user_map[f"citoyen.awa@{RECETTE_DOMAIN}"],
            target=request_map["REC-GN-2026-003"],
            label="CITOYEN propriétaire -> dossier autre citoyen",
        )
        await _assert_hidden_detail(
            client,
            user=user_map[f"admin.ratoma@{RECETTE_DOMAIN}"],
            target=request_map["REC-GN-2026-003"],
            label="ADMIN Ratoma -> dossier Matoto",
        )
        await _assert_hidden_detail(
            client,
            user=user_map[f"ministre.justice@{RECETTE_DOMAIN}"],
            target=request_map["REC-ISO-2026-001"],
            label="MINISTRE tenant principal -> tenant secondaire",
        )

        await _assert_decision_permissions(
            client,
            user_map=user_map,
            request_map=request_map,
        )

    print(
        "PASS: recette E2E tous rôles + isolation propriétaire/institution/tenant "
        "+ frontières approve/reject"
    )


if __name__ == "__main__":
    asyncio.run(main())
