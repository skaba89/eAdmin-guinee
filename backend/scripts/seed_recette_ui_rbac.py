"""Seed one non-terminal request for strict browser RBAC checks.

The comprehensive recette dataset intentionally gives CHEF_SERVICE a terminal
request. This extra fixture exists only so Playwright can prove that decision
buttons are visible to CHEF_SERVICE while remaining hidden from process-only
roles. It is idempotent and forbidden in production.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.service_request import (
    DeliveryModeEnum,
    ServiceRequest,
    ServiceRequestStatusEnum,
)
from app.models.user import User

REFERENCE = "REC-UI-CHEF-001"
REQUEST_ID = uuid.UUID("33333333-3333-4333-8333-333333333333")
CITIZEN_EMAIL = "citoyen.awa@recette.eadmin.gn"
INSTITUTION_ID = "service-casier-recette"
TENANT_ID = "republique-de-guinee"


async def seed() -> None:
    if settings.is_production:
        raise RuntimeError("Le fixture Playwright de recette est interdit en production.")

    async with async_session_factory() as session:
        existing = await session.scalar(
            select(ServiceRequest).where(ServiceRequest.reference == REFERENCE)
        )
        if existing is not None:
            assert existing.tenant_id == TENANT_ID
            assert existing.institution_id == INSTITUTION_ID
            assert existing.status == ServiceRequestStatusEnum.EN_COURS
            print(f"Fixture déjà présent: {REFERENCE}")
            return

        citizen = await session.scalar(select(User).where(User.email == CITIZEN_EMAIL))
        if citizen is None:
            raise RuntimeError(
                "Le dataset de recette principal doit être chargé avant le fixture UI RBAC."
            )

        session.add(
            ServiceRequest(
                id=REQUEST_ID,
                reference=REFERENCE,
                service_id="recette-ui-rbac",
                service_name="Décision chef de service — recette UI",
                category="Justice",
                category_id="justice",
                citizen_id=citizen.id,
                citizen_name="Camara",
                citizen_first_name="Awa",
                citizen_nin="REC-UI-NIN-001",
                citizen_phone="+224600000001",
                citizen_email=CITIZEN_EMAIL,
                citizen_address="Conakry",
                motif="Vérification stricte des décisions RBAC dans le navigateur",
                required_documents=[],
                status=ServiceRequestStatusEnum.EN_COURS,
                assigned_service=INSTITUTION_ID,
                timeline=[],
                deadline_days=5,
                deadline_date=datetime.now(timezone.utc) + timedelta(days=5),
                delivery_mode=DeliveryModeEnum.EN_LIGNE,
                tenant_id=TENANT_ID,
                institution_id=INSTITUTION_ID,
            )
        )
        await session.commit()
        print(f"Fixture créé: {REFERENCE}")


if __name__ == "__main__":
    asyncio.run(seed())
