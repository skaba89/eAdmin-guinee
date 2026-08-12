"""Seed non-terminal requests used only by strict browser RBAC checks.

The comprehensive recette dataset does not contain an EN_COURS request in every
institution needed by the browser contract. These deterministic fixtures let
Playwright prove process/decision buttons and exact institution scope for
CHEF_SERVICE, AGENCE and DIRECTEUR. The seed is idempotent and forbidden in
production.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.service_request import (
    DeliveryModeEnum,
    ServiceRequest,
    ServiceRequestStatusEnum,
)
from app.models.user import User

TENANT_ID = "republique-de-guinee"

FIXTURES: tuple[dict[str, Any], ...] = (
    {
        "reference": "REC-UI-CHEF-001",
        "id": uuid.UUID("33333333-3333-4333-8333-333333333333"),
        "citizen_email": "citoyen.awa@recette.eadmin.gn",
        "institution_id": "service-casier-recette",
        "service_id": "recette-ui-rbac-chef",
        "service_name": "Décision chef de service — recette UI",
        "category": "Justice",
        "category_id": "justice",
        "nin": "REC-UI-NIN-001",
        "phone": "+224600000001",
    },
    {
        "reference": "REC-UI-AGENCE-001",
        "id": uuid.UUID("44444444-4444-4444-8444-444444444444"),
        "citizen_email": "citoyen.fatou@recette.eadmin.gn",
        "institution_id": "agence-anip-recette",
        "service_id": "recette-ui-rbac-agence",
        "service_name": "Traitement agence ANIP — recette UI",
        "category": "Identification",
        "category_id": "identification",
        "nin": "REC-UI-NIN-002",
        "phone": "+224600000002",
    },
    {
        "reference": "REC-UI-DIRECTEUR-001",
        "id": uuid.UUID("55555555-5555-4555-8555-555555555555"),
        "citizen_email": "citoyen.mamadou@recette.eadmin.gn",
        "institution_id": "dir-justice-recette",
        "service_id": "recette-ui-rbac-directeur",
        "service_name": "Décision direction justice — recette UI",
        "category": "Justice",
        "category_id": "justice",
        "nin": "REC-UI-NIN-003",
        "phone": "+224600000003",
    },
)


async def seed() -> None:
    if settings.is_production:
        raise RuntimeError("Les fixtures Playwright de recette sont interdits en production.")

    async with async_session_factory() as session:
        for fixture in FIXTURES:
            existing = await session.scalar(
                select(ServiceRequest).where(ServiceRequest.reference == fixture["reference"])
            )
            if existing is not None:
                assert existing.tenant_id == TENANT_ID
                assert existing.institution_id == fixture["institution_id"]
                assert existing.status == ServiceRequestStatusEnum.EN_COURS
                print(f"Fixture déjà présent: {fixture['reference']}")
                continue

            citizen = await session.scalar(
                select(User).where(User.email == fixture["citizen_email"])
            )
            if citizen is None:
                raise RuntimeError(
                    "Le dataset de recette principal doit être chargé avant les fixtures UI RBAC."
                )

            session.add(
                ServiceRequest(
                    id=fixture["id"],
                    reference=fixture["reference"],
                    service_id=fixture["service_id"],
                    service_name=fixture["service_name"],
                    category=fixture["category"],
                    category_id=fixture["category_id"],
                    citizen_id=citizen.id,
                    citizen_name="Camara",
                    citizen_first_name="Awa",
                    citizen_nin=fixture["nin"],
                    citizen_phone=fixture["phone"],
                    citizen_email=fixture["citizen_email"],
                    citizen_address="Conakry",
                    motif="Vérification stricte des décisions et scopes RBAC dans le navigateur",
                    required_documents=[],
                    status=ServiceRequestStatusEnum.EN_COURS,
                    assigned_service=fixture["institution_id"],
                    timeline=[],
                    deadline_days=5,
                    deadline_date=datetime.now(timezone.utc) + timedelta(days=5),
                    delivery_mode=DeliveryModeEnum.EN_LIGNE,
                    tenant_id=TENANT_ID,
                    institution_id=fixture["institution_id"],
                )
            )

        await session.commit()

        for fixture in FIXTURES:
            print(f"Fixture prêt: {fixture['reference']}")


if __name__ == "__main__":
    asyncio.run(seed())
