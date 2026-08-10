"""Seed a rich, idempotent non-production dataset for eAdmin functional recette.

The dataset covers every application role, several governed institutions, two
tenants, service catalog entries, service requests at every workflow status,
notes, generated documents, satisfaction and notification-outbox examples.

It is deliberately impossible to run in production. Passwords are never stored
in source: the script reuses EADMIN_RECETTE_PASSWORD or the local bootstrap test
password already present in the Docker environment.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from passlib.context import CryptContext
from sqlalchemy import select

from app.config import settings
from app.database import async_session_factory
from app.models.administrative_service import AdministrativeService
from app.models.institution import Institution
from app.models.notification_outbox import NotificationOutbox
from app.models.service_request import (
    DeliveryModeEnum,
    GeneratedServiceDocument,
    ServiceRequest,
    ServiceRequestNote,
    ServiceRequestStatusEnum,
)
from app.models.tenant import Tenant
from app.models.user import RoleEnum, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
PRIMARY_TENANT = settings.TENANT_DEFAULT_ID
ISOLATION_TENANT = "tenant-recette-isolation"
RECETTE_DOMAIN = "recette.eadmin.gn"


ROLE_SECURITY: dict[RoleEnum, tuple[int, int, bool]] = {
    RoleEnum.CITOYEN: (0, 1, False),
    RoleEnum.AGENT: (1, 1, False),
    RoleEnum.MAIRIE: (1, 1, False),
    RoleEnum.AGENCE: (1, 1, False),
    RoleEnum.ADMIN: (2, 2, True),
    RoleEnum.CHEF_SERVICE: (2, 2, True),
    RoleEnum.DIRECTEUR: (3, 3, True),
    RoleEnum.MINISTRE: (4, 3, True),
    RoleEnum.SUPER_ADMIN: (4, 3, True),
}


INSTITUTIONS: tuple[dict[str, Any], ...] = (
    {
        "id": "min-justice-recette",
        "tenant_id": PRIMARY_TENANT,
        "name": "Ministère de la Justice — Recette",
        "type": "ministere",
        "code": "REC-MJ",
        "address": "Kaloum, Conakry",
    },
    {
        "id": "dir-justice-recette",
        "tenant_id": PRIMARY_TENANT,
        "name": "Direction des services judiciaires — Recette",
        "type": "direction",
        "parent_id": "min-justice-recette",
        "code": "REC-DSJ",
    },
    {
        "id": "service-casier-recette",
        "tenant_id": PRIMARY_TENANT,
        "name": "Service du casier judiciaire — Recette",
        "type": "service",
        "parent_id": "dir-justice-recette",
        "code": "REC-CASIER",
    },
    {
        "id": "mairie-ratoma-recette",
        "tenant_id": PRIMARY_TENANT,
        "name": "Mairie de Ratoma — Recette",
        "type": "mairie",
        "code": "REC-RATOMA",
        "address": "Ratoma, Conakry",
    },
    {
        "id": "mairie-matoto-recette",
        "tenant_id": PRIMARY_TENANT,
        "name": "Mairie de Matoto — Recette",
        "type": "mairie",
        "code": "REC-MATOTO",
        "address": "Matoto, Conakry",
    },
    {
        "id": "agence-anip-recette",
        "tenant_id": PRIMARY_TENANT,
        "name": "ANIP — Recette",
        "type": "agence",
        "code": "REC-ANIP",
        "address": "Conakry",
    },
    {
        "id": "agence-apip-recette",
        "tenant_id": PRIMARY_TENANT,
        "name": "APIP Guinée — Recette",
        "type": "agence",
        "code": "REC-APIP",
        "address": "Conakry",
    },
    {
        "id": "mairie-isolation-recette",
        "tenant_id": ISOLATION_TENANT,
        "name": "Mairie Isolation — Recette",
        "type": "mairie",
        "code": "REC-ISO",
        "address": "Tenant secondaire de recette",
    },
)


USERS: tuple[dict[str, Any], ...] = (
    {
        "email": f"superadmin.recette@{RECETTE_DOMAIN}",
        "name": "Super Admin Recette",
        "role": RoleEnum.SUPER_ADMIN,
        "tenant_id": PRIMARY_TENANT,
    },
    {
        "email": f"ministre.justice@{RECETTE_DOMAIN}",
        "name": "Ministre Justice Recette",
        "role": RoleEnum.MINISTRE,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "min-justice-recette",
    },
    {
        "email": f"directeur.justice@{RECETTE_DOMAIN}",
        "name": "Directeur Justice Recette",
        "role": RoleEnum.DIRECTEUR,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "dir-justice-recette",
    },
    {
        "email": f"chef.casier@{RECETTE_DOMAIN}",
        "name": "Chef Service Casier Recette",
        "role": RoleEnum.CHEF_SERVICE,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "service-casier-recette",
    },
    {
        "email": f"admin.ratoma@{RECETTE_DOMAIN}",
        "name": "Admin Ratoma Recette",
        "role": RoleEnum.ADMIN,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "mairie-ratoma-recette",
    },
    {
        "email": f"admin.matoto@{RECETTE_DOMAIN}",
        "name": "Admin Matoto Recette",
        "role": RoleEnum.ADMIN,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "mairie-matoto-recette",
    },
    {
        "email": f"mairie.ratoma@{RECETTE_DOMAIN}",
        "name": "Agent Mairie Ratoma Recette",
        "role": RoleEnum.MAIRIE,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "mairie-ratoma-recette",
    },
    {
        "email": f"agence.anip@{RECETTE_DOMAIN}",
        "name": "Agent Agence ANIP Recette",
        "role": RoleEnum.AGENCE,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "agence-anip-recette",
    },
    {
        "email": f"agent.ratoma@{RECETTE_DOMAIN}",
        "name": "Ibrahima Barry",
        "role": RoleEnum.AGENT,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "mairie-ratoma-recette",
    },
    {
        "email": f"agent.matoto@{RECETTE_DOMAIN}",
        "name": "Moussa Condé",
        "role": RoleEnum.AGENT,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "mairie-matoto-recette",
    },
    {
        "email": f"agent.anip@{RECETTE_DOMAIN}",
        "name": "Mariama Keita",
        "role": RoleEnum.AGENT,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "agence-anip-recette",
    },
    {
        "email": f"agent.apip@{RECETTE_DOMAIN}",
        "name": "Abdoulaye Sylla",
        "role": RoleEnum.AGENT,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "agence-apip-recette",
    },
    {
        "email": f"agent.justice@{RECETTE_DOMAIN}",
        "name": "Fodé Bangoura",
        "role": RoleEnum.AGENT,
        "tenant_id": PRIMARY_TENANT,
        "institution_id": "service-casier-recette",
    },
    {
        "email": f"citoyen.awa@{RECETTE_DOMAIN}",
        "name": "Awa Diallo",
        "role": RoleEnum.CITOYEN,
        "tenant_id": PRIMARY_TENANT,
    },
    {
        "email": f"citoyen.mamadou@{RECETTE_DOMAIN}",
        "name": "Mamadou Camara",
        "role": RoleEnum.CITOYEN,
        "tenant_id": PRIMARY_TENANT,
    },
    {
        "email": f"citoyen.fatou@{RECETTE_DOMAIN}",
        "name": "Fatou Bah",
        "role": RoleEnum.CITOYEN,
        "tenant_id": PRIMARY_TENANT,
    },
    {
        "email": f"citoyen.isolation@{RECETTE_DOMAIN}",
        "name": "Citoyen Tenant Isolation",
        "role": RoleEnum.CITOYEN,
        "tenant_id": ISOLATION_TENANT,
    },
)


SERVICES: tuple[dict[str, Any], ...] = (
    {
        "tenant_id": PRIMARY_TENANT,
        "service_id": "recette-acte-naissance",
        "category_id": "etat-civil",
        "category_name": "État civil",
        "name": "Copie d'acte de naissance — Recette",
        "description": "Démarche fictive de recette pour tester les parcours mairie.",
        "fee_label": "Gratuit",
        "processing": "3 jours ouvrés",
        "sla": 3,
        "required": ["Pièce d'identité", "Informations de naissance"],
        "routing": ["mairie", "etat civil"],
    },
    {
        "tenant_id": PRIMARY_TENANT,
        "service_id": "recette-certificat-residence",
        "category_id": "residence",
        "category_name": "Résidence",
        "name": "Certificat de résidence — Recette",
        "description": "Démarche fictive de recette pour les mairies.",
        "fee_label": "Gratuit",
        "processing": "2 jours ouvrés",
        "sla": 2,
        "required": ["Pièce d'identité", "Justificatif de domicile"],
        "routing": ["mairie", "residence"],
    },
    {
        "tenant_id": PRIMARY_TENANT,
        "service_id": "recette-carte-identite",
        "category_id": "identification",
        "category_name": "Identification",
        "name": "Carte nationale d'identité — Recette",
        "description": "Démarche fictive de recette ANIP.",
        "fee_label": "Tarif de recette",
        "processing": "10 jours ouvrés",
        "sla": 10,
        "required": ["Acte de naissance", "Photo d'identité"],
        "routing": ["anip", "identification"],
    },
    {
        "tenant_id": PRIMARY_TENANT,
        "service_id": "recette-casier-judiciaire",
        "category_id": "justice",
        "category_name": "Justice",
        "name": "Extrait de casier judiciaire — Recette",
        "description": "Démarche fictive de recette Justice.",
        "fee_label": "Gratuit",
        "processing": "5 jours ouvrés",
        "sla": 5,
        "required": ["Pièce d'identité"],
        "routing": ["justice", "casier"],
    },
    {
        "tenant_id": PRIMARY_TENANT,
        "service_id": "recette-creation-entreprise",
        "category_id": "entreprise",
        "category_name": "Entreprise",
        "name": "Création d'entreprise — Recette",
        "description": "Démarche fictive de recette APIP.",
        "fee_label": "Tarif de recette",
        "processing": "4 jours ouvrés",
        "sla": 4,
        "required": ["Pièce d'identité", "Statuts"],
        "routing": ["apip", "entreprise"],
    },
    {
        "tenant_id": ISOLATION_TENANT,
        "service_id": "recette-isolation-service",
        "category_id": "etat-civil",
        "category_name": "État civil",
        "name": "Service tenant isolation — Recette",
        "description": "Service réservé au tenant secondaire de recette.",
        "fee_label": "Gratuit",
        "processing": "2 jours ouvrés",
        "sla": 2,
        "required": [],
        "routing": ["mairie"],
    },
)


REQUESTS: tuple[dict[str, Any], ...] = (
    {
        "reference": "REC-GN-2026-001",
        "citizen": f"citoyen.awa@{RECETTE_DOMAIN}",
        "service": "recette-acte-naissance",
        "institution": "mairie-ratoma-recette",
        "status": ServiceRequestStatusEnum.SOUMISE,
        "motif": "Obtenir une copie d'acte pour un dossier administratif.",
        "delivery": DeliveryModeEnum.GUICHET,
        "age_days": 0,
    },
    {
        "reference": "REC-GN-2026-002",
        "citizen": f"citoyen.awa@{RECETTE_DOMAIN}",
        "service": "recette-certificat-residence",
        "institution": "mairie-ratoma-recette",
        "status": ServiceRequestStatusEnum.EN_COURS,
        "agent": f"agent.ratoma@{RECETTE_DOMAIN}",
        "motif": "Constitution d'un dossier de résidence.",
        "delivery": DeliveryModeEnum.EN_LIGNE,
        "age_days": 1,
    },
    {
        "reference": "REC-GN-2026-003",
        "citizen": f"citoyen.mamadou@{RECETTE_DOMAIN}",
        "service": "recette-acte-naissance",
        "institution": "mairie-matoto-recette",
        "status": ServiceRequestStatusEnum.PIECES_COMPLEMENTAIRES,
        "agent": f"agent.matoto@{RECETTE_DOMAIN}",
        "motif": "Demande d'acte avec justificatif manquant.",
        "delivery": DeliveryModeEnum.GUICHET,
        "age_days": 2,
    },
    {
        "reference": "REC-GN-2026-004",
        "citizen": f"citoyen.fatou@{RECETTE_DOMAIN}",
        "service": "recette-carte-identite",
        "institution": "agence-anip-recette",
        "status": ServiceRequestStatusEnum.VALIDEE,
        "agent": f"agent.anip@{RECETTE_DOMAIN}",
        "motif": "Première demande de carte nationale d'identité.",
        "delivery": DeliveryModeEnum.GUICHET,
        "age_days": 4,
    },
    {
        "reference": "REC-GN-2026-005",
        "citizen": f"citoyen.fatou@{RECETTE_DOMAIN}",
        "service": "recette-creation-entreprise",
        "institution": "agence-apip-recette",
        "status": ServiceRequestStatusEnum.PRETE,
        "agent": f"agent.apip@{RECETTE_DOMAIN}",
        "motif": "Création d'une entreprise fictive de recette.",
        "delivery": DeliveryModeEnum.EN_LIGNE,
        "age_days": 5,
        "generated": True,
    },
    {
        "reference": "REC-GN-2026-006",
        "citizen": f"citoyen.mamadou@{RECETTE_DOMAIN}",
        "service": "recette-casier-judiciaire",
        "institution": "service-casier-recette",
        "status": ServiceRequestStatusEnum.LIVREE,
        "agent": f"agent.justice@{RECETTE_DOMAIN}",
        "motif": "Casier judiciaire pour un dossier professionnel.",
        "delivery": DeliveryModeEnum.COURRIER,
        "age_days": 8,
        "generated": True,
        "rating": 5,
    },
    {
        "reference": "REC-GN-2026-007",
        "citizen": f"citoyen.awa@{RECETTE_DOMAIN}",
        "service": "recette-certificat-residence",
        "institution": "mairie-ratoma-recette",
        "status": ServiceRequestStatusEnum.REJETEE,
        "agent": f"agent.ratoma@{RECETTE_DOMAIN}",
        "motif": "Cas de recette de rejet pour justificatif incohérent.",
        "delivery": DeliveryModeEnum.GUICHET,
        "age_days": 6,
    },
    {
        "reference": "REC-GN-2026-008",
        "citizen": f"citoyen.mamadou@{RECETTE_DOMAIN}",
        "service": "recette-acte-naissance",
        "institution": "mairie-matoto-recette",
        "status": ServiceRequestStatusEnum.EN_COURS,
        "agent": f"agent.matoto@{RECETTE_DOMAIN}",
        "motif": "Cas de recette SLA dépassé.",
        "delivery": DeliveryModeEnum.EN_LIGNE,
        "age_days": 10,
        "overdue": True,
    },
    {
        "reference": "REC-ISO-2026-001",
        "citizen": f"citoyen.isolation@{RECETTE_DOMAIN}",
        "service": "recette-isolation-service",
        "institution": "mairie-isolation-recette",
        "status": ServiceRequestStatusEnum.SOUMISE,
        "motif": "Dossier du tenant secondaire pour tester l'isolation.",
        "delivery": DeliveryModeEnum.EN_LIGNE,
        "age_days": 1,
    },
)


def _strong_password() -> str:
    password = os.getenv("EADMIN_RECETTE_PASSWORD") or os.getenv(
        "EADMIN_BOOTSTRAP_TEST_PASSWORD", ""
    )
    if len(password) < 12:
        raise RuntimeError(
            "EADMIN_RECETTE_PASSWORD ou EADMIN_BOOTSTRAP_TEST_PASSWORD doit contenir "
            "au moins 12 caractères."
        )
    checks = (
        any(ch.islower() for ch in password),
        any(ch.isupper() for ch in password),
        any(ch.isdigit() for ch in password),
        any(not ch.isalnum() for ch in password),
    )
    if not all(checks):
        raise RuntimeError("Le mot de passe de recette doit respecter la politique de complexité.")
    return password


def _deterministic_uuid(value: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, f"https://eadmin.gn/recette/{value}")


def _timeline(status: ServiceRequestStatusEnum, now: datetime) -> list[dict[str, str]]:
    labels = [
        "Soumission de la demande",
        "Vérification des pièces justificatives",
        "Traitement par le service compétent",
        "Validation par le responsable",
        "Document prêt",
        "Livraison / Retrait",
    ]
    completed_by_status = {
        ServiceRequestStatusEnum.SOUMISE: 1,
        ServiceRequestStatusEnum.PIECES_COMPLEMENTAIRES: 2,
        ServiceRequestStatusEnum.EN_COURS: 3,
        ServiceRequestStatusEnum.VALIDEE: 4,
        ServiceRequestStatusEnum.PRETE: 5,
        ServiceRequestStatusEnum.LIVREE: 6,
        ServiceRequestStatusEnum.REJETEE: 2,
    }
    completed = completed_by_status[status]
    result: list[dict[str, str]] = []
    for index, label in enumerate(labels):
        step: dict[str, str] = {
            "label": label,
            "status": "completed" if index < completed else "pending",
        }
        if index < completed:
            step["date"] = (now - timedelta(hours=completed - index)).isoformat()
        result.append(step)
    if status == ServiceRequestStatusEnum.REJETEE:
        result.append(
            {
                "label": "Demande rejetée",
                "status": "completed",
                "date": now.isoformat(),
            }
        )
    return result


async def _ensure_tenant(session, tenant_id: str, name: str) -> Tenant:
    tenant = await session.get(Tenant, tenant_id)
    if tenant is None:
        tenant = Tenant(
            id=tenant_id,
            name=name,
            domain=None,
            is_active=True,
            max_users=5000,
            max_documents=50000,
            max_storage_mb=10240,
            features={"recette": True},
            settings={"dataset": "comprehensive-role-recette"},
        )
        session.add(tenant)
        await session.flush()
    else:
        tenant.is_active = True
    return tenant


async def _ensure_institutions(session) -> dict[str, Institution]:
    result: dict[str, Institution] = {}
    for spec in INSTITUTIONS:
        institution = await session.get(Institution, spec["id"])
        if institution is None:
            institution = Institution(id=spec["id"], tenant_id=spec["tenant_id"], name=spec["name"], type=spec["type"])
            session.add(institution)
        institution.tenant_id = spec["tenant_id"]
        institution.name = spec["name"]
        institution.type = spec["type"]
        institution.parent_id = spec.get("parent_id")
        institution.code = spec.get("code")
        institution.address = spec.get("address")
        institution.is_active = True
        institution.settings = {"recette": True, "dataset": "comprehensive-role-recette"}
        result[institution.id] = institution
    await session.flush()
    return result


async def _ensure_users(
    session,
    password: str,
    institutions: dict[str, Institution],
) -> dict[str, User]:
    result: dict[str, User] = {}
    for spec in USERS:
        email = spec["email"].lower()
        user = await session.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                id=_deterministic_uuid(f"user:{email}"),
                email=email,
                hashed_password=pwd_context.hash(password),
                full_name=spec["name"],
                role=spec["role"],
            )
            session.add(user)
        else:
            user.hashed_password = pwd_context.hash(password)
        user.full_name = spec["name"]
        user.role = spec["role"]
        user.tenant_id = spec["tenant_id"]
        user.institution_id = spec.get("institution_id")
        institution = institutions.get(spec.get("institution_id", ""))
        user.institution = institution.name if institution else None
        user.is_active = True
        clearance, assurance, privileged = ROLE_SECURITY[user.role]
        user.security_clearance = clearance
        user.assurance_level = assurance
        user.privileged_account = privileged
        user.employment_status = "active"
        result[email] = user
    await session.flush()
    return result


def _template_hash(body: str) -> str:
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


async def _ensure_services(session, approver: User) -> dict[tuple[str, str], AdministrativeService]:
    result: dict[tuple[str, str], AdministrativeService] = {}
    now = datetime.now(timezone.utc)
    for spec in SERVICES:
        service = await session.scalar(
            select(AdministrativeService).where(
                AdministrativeService.tenant_id == spec["tenant_id"],
                AdministrativeService.service_id == spec["service_id"],
                AdministrativeService.version == 1,
            )
        )
        template_body = (
            f"DOCUMENT DE RECETTE — {spec['name']}\n"
            "Ce document est exclusivement destiné aux tests fonctionnels eAdmin."
        )
        if service is None:
            service = AdministrativeService(
                id=_deterministic_uuid(
                    f"service:{spec['tenant_id']}:{spec['service_id']}:1"
                ),
                tenant_id=spec["tenant_id"],
                service_id=spec["service_id"],
                version=1,
                category_id=spec["category_id"],
                category_name=spec["category_name"],
                name=spec["name"],
                description=spec["description"],
                sla_business_days=spec["sla"],
            )
            session.add(service)
        service.category_id = spec["category_id"]
        service.category_name = spec["category_name"]
        service.name = spec["name"]
        service.description = spec["description"]
        service.fee_label = spec["fee_label"]
        service.expected_processing_label = spec["processing"]
        service.sla_business_days = spec["sla"]
        service.required_documents = spec["required"]
        service.routing_terms = spec["routing"]
        service.policy_status = "recette_only"
        service.source_reference = "Dataset de recette eAdmin — aucune valeur juridique"
        service.source_url = None
        service.document_template_status = "approved"
        service.document_template_title = f"{spec['name']} — Document de recette"
        service.document_template_body = template_body
        service.document_template_source_reference = "Dataset de recette eAdmin"
        service.document_template_hash = _template_hash(template_body)
        service.document_template_approved_by = approver.id
        service.document_template_approved_at = now
        service.effective_from = now - timedelta(days=30)
        service.effective_to = None
        service.is_active = True
        service.created_by = approver.id
        result[(service.tenant_id, service.service_id)] = service
    await session.flush()
    return result


async def _ensure_note(
    session,
    request: ServiceRequest,
    author: User,
    text: str,
    note_type: str,
) -> None:
    existing = await session.scalar(
        select(ServiceRequestNote).where(
            ServiceRequestNote.request_id == request.id,
            ServiceRequestNote.text == text,
        )
    )
    if existing is None:
        session.add(
            ServiceRequestNote(
                id=_deterministic_uuid(f"note:{request.reference}:{text}"),
                request_id=request.id,
                author_id=author.id,
                author_name=author.full_name,
                author_role=author.role.value,
                note_type=note_type,
                text=text,
            )
        )


async def _ensure_generated_document(
    session,
    request: ServiceRequest,
    generator: User,
) -> None:
    existing = await session.scalar(
        select(GeneratedServiceDocument).where(
            GeneratedServiceDocument.request_id == request.id
        )
    )
    if existing is not None:
        return
    html = (
        "<h1>Document administratif — Recette</h1>"
        f"<p>Référence : {request.reference}</p>"
        "<p>Document fictif, sans valeur administrative.</p>"
    )
    session.add(
        GeneratedServiceDocument(
            id=_deterministic_uuid(f"generated:{request.reference}"),
            request_id=request.id,
            title=f"Document {request.reference}",
            html_content=html,
            content_hash=hashlib.sha256(html.encode("utf-8")).hexdigest(),
            file_name=f"{request.reference.lower()}.html",
            generated_by=generator.id,
            generated_by_name=generator.full_name,
            template_service_version=1,
            template_hash=hashlib.sha256(html.encode("utf-8")).hexdigest(),
            template_source_reference="Dataset de recette eAdmin",
            rendered_server_side=True,
        )
    )


async def _ensure_requests(
    session,
    users: dict[str, User],
    institutions: dict[str, Institution],
    services: dict[tuple[str, str], AdministrativeService],
) -> dict[str, ServiceRequest]:
    result: dict[str, ServiceRequest] = {}
    now = datetime.now(timezone.utc)
    generator = users[f"chef.casier@{RECETTE_DOMAIN}"]
    for spec in REQUESTS:
        citizen = users[spec["citizen"]]
        institution = institutions[spec["institution"]]
        service = services[(citizen.tenant_id or PRIMARY_TENANT, spec["service"])]
        agent = users.get(spec.get("agent", ""))
        created_at = now - timedelta(days=spec["age_days"])
        deadline = created_at + timedelta(days=service.sla_business_days)
        if spec.get("overdue"):
            deadline = now - timedelta(days=2)

        request = await session.scalar(
            select(ServiceRequest).where(ServiceRequest.reference == spec["reference"])
        )
        if request is None:
            request = ServiceRequest(
                id=_deterministic_uuid(f"request:{spec['reference']}"),
                reference=spec["reference"],
                service_id=service.service_id,
                service_name=service.name,
                category=service.category_name,
                category_id=service.category_id,
                citizen_id=citizen.id,
                citizen_name=citizen.full_name.split(" ")[-1],
                citizen_first_name=citizen.full_name.split(" ")[0],
                citizen_nin=f"REC-NIN-{spec['reference'][-3:]}",
                citizen_phone=f"+22462000{spec['reference'][-3:]}",
                citizen_email=citizen.email,
                citizen_address="Conakry — adresse fictive de recette",
                motif=spec["motif"],
                assigned_service=institution.name,
                deadline_days=service.sla_business_days,
                deadline_date=deadline,
                delivery_mode=spec["delivery"],
                tenant_id=citizen.tenant_id or PRIMARY_TENANT,
                institution_id=institution.id,
                created_at=created_at,
            )
            session.add(request)
        request.service_id = service.service_id
        request.service_name = service.name
        request.category = service.category_name
        request.category_id = service.category_id
        request.service_catalog_version = service.version
        request.service_policy_status = service.policy_status
        request.service_policy_source = service.source_reference
        request.service_fee_label = service.fee_label
        request.expected_processing_label = service.expected_processing_label
        request.citizen_id = citizen.id
        request.citizen_email = citizen.email
        request.motif = spec["motif"]
        request.required_documents = list(service.required_documents or [])
        request.status = spec["status"]
        request.assigned_service = institution.name
        request.assigned_agent_id = agent.id if agent else None
        request.assigned_agent_name = agent.full_name if agent else None
        request.timeline = _timeline(spec["status"], now)
        request.deadline_days = service.sla_business_days
        request.deadline_date = deadline
        request.mairie = institution.name if institution.type == "mairie" else None
        request.delivery_mode = spec["delivery"]
        request.tenant_id = citizen.tenant_id or PRIMARY_TENANT
        request.institution_id = institution.id

        if spec["status"] == ServiceRequestStatusEnum.LIVREE:
            request.delivery_location = "Guichet de recette"
            request.delivered_at = now - timedelta(hours=2)
            if spec.get("rating"):
                request.satisfaction_rating = spec["rating"]
                request.satisfaction_comment = "Parcours de recette terminé avec succès."
                request.satisfaction_rated_at = now - timedelta(hours=1)
        else:
            request.delivery_location = None
            request.delivered_at = None

        await session.flush()
        result[request.reference] = request

        author = agent or citizen
        await _ensure_note(
            session,
            request,
            citizen,
            f"Demande de recette créée : {request.reference}.",
            "notification",
        )
        if agent:
            await _ensure_note(
                session,
                request,
                agent,
                f"Prise en charge de recette au statut {request.status.value}.",
                "note",
            )
        if request.status == ServiceRequestStatusEnum.PIECES_COMPLEMENTAIRES:
            await _ensure_note(
                session,
                request,
                author,
                "Pièce complémentaire fictive demandée au citoyen.",
                "decision",
            )
        if request.status == ServiceRequestStatusEnum.REJETEE:
            await _ensure_note(
                session,
                request,
                author,
                "Rejet de recette : justificatif volontairement incohérent.",
                "decision",
            )
        if spec.get("generated"):
            await _ensure_generated_document(session, request, generator)

    await session.flush()
    return result


async def _ensure_notification_examples(
    session,
    requests: dict[str, ServiceRequest],
) -> None:
    now = datetime.now(timezone.utc)
    specs = (
        {
            "key": "recette-notif-sent",
            "request": "REC-GN-2026-006",
            "event": "service_request_delivered",
            "channel": "email",
            "status": "sent",
            "recipient": f"citoyen.mamadou@{RECETTE_DOMAIN}",
            "sent_at": now - timedelta(hours=1),
        },
        {
            "key": "recette-notif-retry",
            "request": "REC-GN-2026-003",
            "event": "service_request_missing_documents",
            "channel": "email",
            "status": "retry",
            "recipient": f"citoyen.mamadou@{RECETTE_DOMAIN}",
            "next_attempt_at": now + timedelta(hours=1),
            "last_error": "Erreur fournisseur simulée pour la recette.",
        },
        {
            "key": "recette-notif-whatsapp-blocked",
            "request": "REC-GN-2026-002",
            "event": "service_request_processing",
            "channel": "whatsapp",
            "status": "blocked",
            "recipient": "+224620000002",
            "last_error": "Canal WhatsApp volontairement bloqué dans ce scénario de recette.",
        },
    )
    for spec in specs:
        idempotency_key = hashlib.sha256(spec["key"].encode("utf-8")).hexdigest()
        existing = await session.scalar(
            select(NotificationOutbox).where(
                NotificationOutbox.idempotency_key == idempotency_key
            )
        )
        if existing is not None:
            continue
        request = requests[spec["request"]]
        session.add(
            NotificationOutbox(
                id=_deterministic_uuid(f"notification:{spec['key']}"),
                tenant_id=request.tenant_id,
                institution_id=request.institution_id,
                request_id=request.id,
                event_type=spec["event"],
                channel=spec["channel"],
                recipient=spec["recipient"],
                template_key="recette_generic",
                payload={
                    "reference": request.reference,
                    "dataset": "comprehensive-role-recette",
                },
                idempotency_key=idempotency_key,
                status=spec["status"],
                attempt_count=1 if spec["status"] == "retry" else 0,
                next_attempt_at=spec.get("next_attempt_at"),
                last_error=spec.get("last_error"),
                sent_at=spec.get("sent_at"),
                provider_name="recette-simulator" if spec["status"] == "sent" else None,
                provider_message_id="RECETTE-MSG-001" if spec["status"] == "sent" else None,
            )
        )


async def main() -> None:
    if settings.is_production:
        raise RuntimeError("Le dataset de recette est strictement interdit en production.")

    password = _strong_password()
    async with async_session_factory() as session:
        await _ensure_tenant(session, PRIMARY_TENANT, "République de Guinée")
        await _ensure_tenant(session, ISOLATION_TENANT, "Tenant Isolation — Recette")
        institutions = await _ensure_institutions(session)
        users = await _ensure_users(session, password, institutions)
        approver = users[f"superadmin.recette@{RECETTE_DOMAIN}"]
        services = await _ensure_services(session, approver)
        requests = await _ensure_requests(session, users, institutions, services)
        await _ensure_notification_examples(session, requests)
        await session.commit()

    print("PASS: dataset de recette eAdmin créé/mis à jour de façon idempotente.")
    print(f"  Utilisateurs de recette : {len(USERS)}")
    print(f"  Institutions : {len(INSTITUTIONS)}")
    print(f"  Services : {len(SERVICES)}")
    print(f"  Dossiers : {len(REQUESTS)}")
    print("  Mot de passe : valeur locale de EADMIN_RECETTE_PASSWORD ou LOCAL_TEST_PASSWORD")
    print("  Documentation : docs/RECETTE_TEST_DATA.md")


if __name__ == "__main__":
    asyncio.run(main())
