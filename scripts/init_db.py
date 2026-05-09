"""
Script d'initialisation de la base de données - eAdministration Suite Guinea.
Crée les tables et insère des données de démonstration avec des institutions guinéennes.
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Configuration
DATABASE_URL = "postgresql+asyncpg://eadmin:eadmin@localhost:5432/eadmin"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Institutions guinéennes réalistes
INSTITUTIONS_GUINEE = [
    "Ministère de l'Administration du Territoire et de la Décentralisation",
    "Ministère de l'Économie et des Finances",
    "Ministère de l'Éducation Nationale et de l'Alphabétisation",
    "Ministère de la Santé et de l'Hygiène Publique",
    "Présidence de la République",
    "Primature",
    "Cour Suprême",
    "Cour des Comptes",
    "Assemblée Nationale",
    "Mairie de Conakry",
    "Gouvernorat de Conakry",
    "Gouvernorat de Kindia",
    "Gouvernorat de Kankan",
    "Gouvernorat de N'Zérékoré",
    "Agence Nationale de l'Informatique et des Technologies",
    "Direction Nationale du Budget",
    "Direction Générale des Impôts",
    "Direction Nationale de la Planification",
    "Office National des Chemins de Fer de Guinée",
    "Société des Eaux de Guinée",
]


async def init_database() -> None:
    """Initialise la base de données avec les données de démonstration."""
    # Importer les modèles et la base
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

    from app.database import Base
    from app.models.user import RoleEnum, User
    from app.models.document import Document, DocumentStatusEnum
    from app.models.courrier import (
        Courrier,
        CourrierTypeEnum,
        CourrierPriorityEnum,
        CourrierStatusEnum,
    )
    from app.models.workflow import (
        Workflow,
        WorkflowStep,
        WorkflowStatusEnum,
        WorkflowStepStatusEnum,
    )
    from app.models.audit import AuditLog

    print("🔧 Création du moteur de base de données...")
    engine = create_async_engine(DATABASE_URL, echo=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Créer les tables
    print("📦 Création des tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables créées avec succès")

    # Insérer les données de démonstration
    async with session_factory() as session:
        # --- Utilisateurs ---
        print("👥 Création des utilisateurs de démonstration...")
        users_data = [
            {
                "email": "admin@eadmin.gouv.gn",
                "full_name": "Amadou Diallo",
                "role": RoleEnum.SUPER_ADMIN,
                "institution": "Présidence de la République",
            },
            {
                "email": "fatou.bah@eadmin.gouv.gn",
                "full_name": "Fatoumata Bah",
                "role": RoleEnum.ADMIN,
                "institution": "Ministère de l'Administration du Territoire et de la Décentralisation",
            },
            {
                "email": "ibrahima.sow@eadmin.gouv.gn",
                "full_name": "Ibrahima Sow",
                "role": RoleEnum.DIRECTOR,
                "institution": "Ministère de l'Économie et des Finances",
            },
            {
                "email": "mariama.cisse@eadmin.gouv.gn",
                "full_name": "Mariama Cissé",
                "role": RoleEnum.CHEF_SERVICE,
                "institution": "Ministère de l'Éducation Nationale et de l'Alphabétisation",
            },
            {
                "email": "ousmane.keita@eadmin.gouv.gn",
                "full_name": "Ousmane Keïta",
                "role": RoleEnum.AGENT,
                "institution": "Direction Générale des Impôts",
            },
            {
                "email": "aissatou.diallo@eadmin.gouv.gn",
                "full_name": "Aissatou Diallo",
                "role": RoleEnum.AGENT,
                "institution": "Mairie de Conakry",
            },
            {
                "email": "mamadou.toure@eadmin.gouv.gn",
                "full_name": "Mamadou Touré",
                "role": RoleEnum.LECTEUR,
                "institution": "Cour des Comptes",
            },
            {
                "email": "kadiatou.sylla@eadmin.gouv.gn",
                "full_name": "Kadiatou Sylla",
                "role": RoleEnum.CHEF_SERVICE,
                "institution": "Ministère de la Santé et de l'Hygiène Publique",
            },
        ]

        users = []
        for user_data in users_data:
            user = User(
                email=user_data["email"],
                hashed_password=pwd_context.hash("password123"),
                full_name=user_data["full_name"],
                role=user_data["role"],
                institution=user_data["institution"],
                is_active=True,
            )
            session.add(user)
            users.append(user)

        await session.flush()
        print(f"✅ {len(users)} utilisateurs créés")

        # --- Documents ---
        print("📄 Création des documents de démonstration...")
        documents_data = [
            {
                "title": "Décret portant organisation du Ministère de l'Administration du Territoire",
                "description": "Décret présidentiel définissant l'organigramme et les attributions du ministère",
                "file_type": "pdf",
                "file_size": 2450000,
                "status": DocumentStatusEnum.APPROVED,
                "tags": {"category": "décret", "classification": "officiel"},
                "institution_id": "Ministère de l'Administration du Territoire et de la Décentralisation",
            },
            {
                "title": "Rapport annuel d'exécution budgétaire 2024",
                "description": "Bilan de l'exécution du budget national pour l'exercice 2024",
                "file_type": "xlsx",
                "file_size": 5800000,
                "status": DocumentStatusEnum.PENDING_REVIEW,
                "tags": {"category": "rapport", "type": "budgétaire", "année": "2024"},
                "institution_id": "Ministère de l'Économie et des Finances",
            },
            {
                "title": "Arrêté de nomination des directeurs régionaux",
                "description": "Arrêté ministériel nommant les nouveaux directeurs régionaux de l'éducation",
                "file_type": "pdf",
                "file_size": 890000,
                "status": DocumentStatusEnum.DRAFT,
                "tags": {"category": "arrêté", "type": "nomination"},
                "institution_id": "Ministère de l'Éducation Nationale et de l'Alphabétisation",
            },
            {
                "title": "Plan stratégique de digitalisation 2024-2028",
                "description": "Vision et feuille de route pour la transformation numérique de l'administration",
                "file_type": "pdf",
                "file_size": 15200000,
                "status": DocumentStatusEnum.APPROVED,
                "tags": {"category": "stratégie", "type": "digitalisation"},
                "institution_id": "Agence Nationale de l'Informatique et des Technologies",
            },
            {
                "title": "Note de service - Organisation des concertations régionales",
                "description": "Note de service relative à l'organisation des concertations dans les régions administratives",
                "file_type": "docx",
                "file_size": 450000,
                "status": DocumentStatusEnum.APPROVED,
                "tags": {"category": "note_de_service", "type": "organisation"},
                "institution_id": "Primature",
            },
            {
                "title": "Bilan statistique de la rentrée scolaire 2024-2025",
                "description": "Statistiques détaillées des effectifs scolaires pour la rentrée 2024-2025",
                "file_type": "pdf",
                "file_size": 3200000,
                "status": DocumentStatusEnum.PENDING_REVIEW,
                "tags": {"category": "statistiques", "secteur": "éducation"},
                "institution_id": "Ministère de l'Éducation Nationale et de l'Alphabétisation",
            },
        ]

        documents = []
        for i, doc_data in enumerate(documents_data):
            doc = Document(
                title=doc_data["title"],
                description=doc_data["description"],
                file_type=doc_data["file_type"],
                file_size=doc_data["file_size"],
                status=doc_data["status"],
                tags=doc_data["tags"],
                owner_id=users[i % len(users)].id,
                institution_id=doc_data["institution_id"],
            )
            session.add(doc)
            documents.append(doc)

        await session.flush()
        print(f"✅ {len(documents)} documents créés")

        # --- Courriers ---
        print("📬 Création des courriers de démonstration...")
        courriers_data = [
            {
                "reference": "CE-2024-000001",
                "subject": "Demande d'autorisation de construction - Zone Kaloum",
                "type": CourrierTypeEnum.ENTRANT,
                "priority": CourrierPriorityEnum.NORMAL,
                "status": CourrierStatusEnum.TREATED,
                "sender": "Société GUINEA CONSTRUCTION SA",
                "recipient": "Mairie de Conakry",
                "due_date": datetime.now(timezone.utc) + timedelta(days=15),
            },
            {
                "reference": "CS-2024-000002",
                "subject": "Convocation du Conseil des Ministres - Session extraordinaire",
                "type": CourrierTypeEnum.SORTANT,
                "priority": CourrierPriorityEnum.URGENT,
                "status": CourrierStatusEnum.IN_PROGRESS,
                "sender": "Présidence de la République",
                "recipient": "Primature",
                "due_date": datetime.now(timezone.utc) + timedelta(days=2),
            },
            {
                "reference": "CE-2024-000003",
                "subject": "Rapport d'audit de la Direction Générale des Impôts",
                "type": CourrierTypeEnum.ENTRANT,
                "priority": CourrierPriorityEnum.IMPORTANT,
                "status": CourrierStatusEnum.PENDING,
                "sender": "Cour des Comptes",
                "recipient": "Ministère de l'Économie et des Finances",
                "due_date": datetime.now(timezone.utc) + timedelta(days=30),
            },
            {
                "reference": "CE-2024-000004",
                "subject": "Requête pour le recrutement de 500 enseignants contractuels",
                "type": CourrierTypeEnum.ENTRANT,
                "priority": CourrierPriorityEnum.IMPORTANT,
                "status": CourrierStatusEnum.IN_PROGRESS,
                "sender": "Ministère de l'Éducation Nationale et de l'Alphabétisation",
                "recipient": "Ministère de l'Économie et des Finances",
                "due_date": datetime.now(timezone.utc) + timedelta(days=20),
            },
            {
                "reference": "CS-2024-000005",
                "subject": "Circulaire relative à la digitalisation des services administratifs",
                "type": CourrierTypeEnum.SORTANT,
                "priority": CourrierPriorityEnum.NORMAL,
                "status": CourrierStatusEnum.TREATED,
                "sender": "Primature",
                "recipient": "Tous les Ministères",
                "due_date": datetime.now(timezone.utc) + timedelta(days=45),
            },
            {
                "reference": "CE-2024-000006",
                "subject": "Alerte épidémiologique - Fièvre de Lassa dans la préfecture de Macenta",
                "type": CourrierTypeEnum.ENTRANT,
                "priority": CourrierPriorityEnum.URGENT,
                "status": CourrierStatusEnum.IN_PROGRESS,
                "sender": "Organisation Mondiale de la Santé - Bureau Guinée",
                "recipient": "Ministère de la Santé et de l'Hygiène Publique",
                "due_date": datetime.now(timezone.utc) + timedelta(days=1),
            },
            {
                "reference": "CS-2024-000007",
                "subject": "Programme de formation des agents publics à l'e-administration",
                "type": CourrierTypeEnum.SORTANT,
                "priority": CourrierPriorityEnum.FAIBLE,
                "status": CourrierStatusEnum.PENDING,
                "sender": "Agence Nationale de l'Informatique et des Technologies",
                "recipient": "Direction Nationale de la Fonction Publique",
                "due_date": datetime.now(timezone.utc) + timedelta(days=60),
            },
        ]

        courriers = []
        for courrier_data in courriers_data:
            courrier = Courrier(
                reference=courrier_data["reference"],
                subject=courrier_data["subject"],
                type=courrier_data["type"],
                priority=courrier_data["priority"],
                status=courrier_data["status"],
                sender=courrier_data["sender"],
                recipient=courrier_data["recipient"],
                due_date=courrier_data["due_date"],
            )
            session.add(courrier)
            courriers.append(courrier)

        await session.flush()
        print(f"✅ {len(courriers)} courriers créés")

        # --- Workflows ---
        print("🔄 Création des workflows de démonstration...")
        workflows_data = [
            {
                "name": "Circuit de validation - Décret présidentiel",
                "description": "Processus de validation et de signature d'un décret présidentiel",
                "steps": [
                    "Rédaction par le secrétariat",
                    "Revue juridique par le Conseil Juridique",
                    "Validation par le Ministre concerné",
                    "Signature par le Secrétaire Général",
                    "Contresignature par le Président de la République",
                    "Publication au Journal Officiel",
                ],
            },
            {
                "name": "Circuit de traitement - Courrier entrant",
                "description": "Parcours standard d'un courrier entrant dans l'administration",
                "steps": [
                    "Enregistrement au service d'ordonnancement",
                    "Orientation vers le service compétent",
                    "Traitement par l'agent responsable",
                    "Validation par le Chef de Service",
                    "Visa du Directeur",
                    "Clôture et archivage",
                ],
            },
            {
                "name": "Circuit budgétaire - Crédit supplémentaire",
                "description": "Procédure de demande de crédit budgétaire supplémentaire",
                "steps": [
                    "Demande justifiée par le service",
                    "Avis du Contrôleur Financier",
                    "Validation par la Direction du Budget",
                    "Approbation par le Ministre des Finances",
                    "Ordonnancement par le Trésor Public",
                ],
            },
        ]

        workflows = []
        for wf_data in workflows_data:
            workflow = Workflow(
                name=wf_data["name"],
                description=wf_data["description"],
                status=WorkflowStatusEnum.ACTIVE,
                current_step=1,
                steps={"total": len(wf_data["steps"])},
                created_by=users[0].id,
                institution_id=users[0].institution,
            )
            session.add(workflow)
            workflows.append(workflow)

        await session.flush()

        # Créer les étapes de chaque workflow
        for wf, wf_data in zip(workflows, workflows_data):
            for idx, step_name in enumerate(wf_data["steps"]):
                step = WorkflowStep(
                    workflow_id=wf.id,
                    name=step_name,
                    assignee_id=users[idx % len(users)].id if idx < len(users) else None,
                    order=idx,
                    status=(
                        WorkflowStepStatusEnum.COMPLETED
                        if idx < 1
                        else (
                            WorkflowStepStatusEnum.IN_PROGRESS
                            if idx == 1
                            else WorkflowStepStatusEnum.PENDING
                        )
                    ),
                    completed_at=datetime.now(timezone.utc) if idx < 1 else None,
                )
                session.add(step)

        await session.flush()
        print(f"✅ {len(workflows)} workflows créés avec leurs étapes")

        # --- Audit Logs ---
        print("📋 Création des entrées d'audit de démonstration...")
        audit_actions = [
            ("LOGIN", "user", "Connexion réussie"),
            ("CREATE", "document", "Création du document: Décret portant organisation"),
            ("UPDATE", "courrier", "Mise à jour du statut du courrier CE-2024-000001"),
            ("APPROVE", "document", "Approbation du document: Plan stratégique"),
            ("DOWNLOAD", "document", "Téléchargement du rapport annuel budgétaire"),
            ("CREATE", "workflow", "Création du circuit de validation"),
            ("ADVANCE", "workflow", "Avancement du workflow: Courrier entrant"),
            ("LOGIN", "user", "Connexion réussie"),
            ("CREATE", "courrier", "Enregistrement du courrier CS-2024-000002"),
            ("UPDATE", "user", "Mise à jour du profil utilisateur"),
        ]

        audit_logs = []
        for i, (action, resource_type, detail) in enumerate(audit_actions):
            log = AuditLog(
                user_id=users[i % len(users)].id,
                action=action,
                resource_type=resource_type,
                resource_id=str(uuid.uuid4()),
                details={"detail": detail, "browser": "Chrome/120", "os": "Windows 11"},
                ip_address=f"192.168.1.{100 + i}",
                timestamp=datetime.now(timezone.utc) - timedelta(hours=i * 2),
            )
            session.add(log)
            audit_logs.append(log)

        await session.flush()
        print(f"✅ {len(audit_logs)} entrées d'audit créées")

        # Commit final
        await session.commit()

    # Fermer le moteur
    await engine.dispose()

    print("\n" + "=" * 60)
    print("🎉 Base de données initialisée avec succès !")
    print("=" * 60)
    print(f"  👥 {len(users)} utilisateurs")
    print(f"  📄 {len(documents)} documents")
    print(f"  📬 {len(courriers)} courriers")
    print(f"  🔄 {len(workflows)} workflows")
    print(f"  📋 {len(audit_logs)} entrées d'audit")
    print("=" * 60)
    print("\n🔑 Comptes de démonstration :")
    print("  admin@eadmin.gouv.gn / password123 (SUPER_ADMIN)")
    print("  fatou.bah@eadmin.gouv.gn / password123 (ADMIN)")
    print("  ibrahima.sow@eadmin.gouv.gn / password123 (DIRECTOR)")
    print("  mariama.cisse@eadmin.gouv.gn / password123 (CHEF_SERVICE)")
    print("  ousmane.keita@eadmin.gouv.gn / password123 (AGENT)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(init_database())
