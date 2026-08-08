"""Add the versioned national administrative-service catalog.

Revision ID: versioned_service_catalog
Revises: service_request_mutation_policies
Create Date: 2026-08-08

Bootstrap rows reproduce the current operational eAdmin service cards. They are
explicitly labelled ``operational_default`` and MUST NOT be interpreted as
statutory legal deadlines. Future approved versions can carry their source
reference and effective dates without rewriting historical requests.
"""

import uuid

from alembic import op
import sqlalchemy as sa

revision = "versioned_service_catalog"
down_revision = "service_request_mutation_policies"
branch_labels = None
depends_on = None


TENANT_ID = "republique-de-guinee"
SOURCE = "Bootstrap opérationnel eAdmin v1 — à homologuer par l'autorité compétente"


SERVICES = [
    ("ec-1", "etat-civil", "État Civil", "Extrait d'acte de naissance", "Copie intégrale ou extrait d'acte de naissance", "Gratuit", "48h", 30, ["Carte d'identité", "Acte de naissance original ou numéro d'acte"], ["mairie"]),
    ("ec-2", "etat-civil", "État Civil", "Extrait d'acte de mariage", "Attestation officielle d'acte de mariage", "Gratuit", "48h", 30, ["Carte d'identité", "Acte de mariage original ou numéro d'acte"], ["mairie"]),
    ("ec-3", "etat-civil", "État Civil", "Extrait d'acte de décès", "Document officiel d'acte de décès", "Gratuit", "48h", 30, ["Carte d'identité du demandeur", "Acte de décès original ou numéro"], ["mairie"]),
    ("ec-4", "etat-civil", "État Civil", "Certificat de nationalité", "Attestation de nationalité guinéenne", "5 000 GNF", "5 jours", 30, ["Carte d'identité nationale", "Extrait d'acte de naissance", "2 photos d'identité", "Certificat de résidence"], ["justice"]),
    ("ec-5", "etat-civil", "État Civil", "Déclaration de naissance", "Enregistrement d'une naissance à l'état civil", "Gratuit", "24h", 30, ["Certificat médical de naissance", "Pièce d'identité d'un parent", "Déclaration du père ou de la mère"], ["mairie"]),
    ("j-1", "justice", "Justice & Légal", "Casier judiciaire", "Extrait de casier judiciaire B3", "5 000 GNF", "5 jours", 45, ["Carte d'identité nationale", "2 photos d'identité", "Timbre fiscal"], ["justice"]),
    ("j-2", "justice", "Justice & Légal", "Certificat de non-poursuite", "Attestation de non-poursuite judiciaire", "3 000 GNF", "3 jours", 45, ["Carte d'identité nationale", "Casier judiciaire récent"], ["justice"]),
    ("j-3", "justice", "Justice & Légal", "Légalisation de documents", "Authentification officielle de documents", "2 000 GNF", "24h", 45, ["Document original à légaliser", "Carte d'identité nationale", "Photocopie du document"], ["justice"]),
    ("id-1", "identification", "Identification", "Carte d'identité nationale biométrique", "CNI biométrique sécurisée", "Gratuit", "7 jours", 45, ["Extrait d'acte de naissance", "Certificat de nationalité", "4 photos d'identité", "Certificat de résidence", "Témoin avec CNI valide"], ["identification", "interieur"]),
    ("id-2", "identification", "Identification", "Passeport biométrique", "Passeport biométrique international", "150 000 GNF", "10 jours", 45, ["Carte d'identité nationale", "Extrait d'acte de naissance", "4 photos d'identité récentes", "Certificat de résidence", "Ancien passeport (si renouvellement)"], ["identification", "interieur"]),
    ("id-3", "identification", "Identification", "Permis de conduire", "Permis de conduire national ou international", "25 000 GNF", "10 jours", 45, ["Carte d'identité nationale", "Certificat médical d'aptitude", "Attestation de réussite auto-école", "4 photos d'identité", "Ancien permis (si renouvellement)"], ["transport", "interieur"]),
    ("u-1", "urbanisme", "Urbanisme & Construction", "Permis de construire", "Autorisation de construction immobilière", "50 000 GNF", "15 jours", 45, ["Plan de construction certifié", "Titre foncier ou bail", "Étude d'impact environnemental", "Plan de situation du terrain", "Carte d'identité"], ["urbanisme"]),
    ("e-1", "entreprise", "Entreprise & Commerce", "Enregistrement entreprise (APIP)", "Création d'entreprise via l'APIP", "50 000 GNF", "3 jours", 30, ["Statuts de l'entreprise", "Pièce d'identité du gérant", "Casier judiciaire du gérant", "Attestation de siège social", "Capital social minimum"], ["apip", "promotion des investissements"]),
    ("e-2", "entreprise", "Entreprise & Commerce", "Registre de commerce", "Immatriculation au RCCM", "100 000 GNF", "7 jours", 30, ["Statuts enregistrés", "Carte d'identité du gérant", "Certificat de résidence", "Attestation APIP"], ["apip", "commerce"]),
    ("ed-1", "education", "Éducation", "Attestation de scolarité", "Certificat de fréquentation scolaire", "Gratuit", "48h", 30, ["Carte d'identité", "Certificat d'inscription", "Dernier bulletin scolaire"], ["education"]),
    ("ed-2", "education", "Éducation", "Diplôme et relevé de notes", "Copie certifiée de diplôme et relevé", "10 000 GNF", "5 jours", 30, ["Carte d'identité", "Numéro matricule", "Ancien diplôme (si duplicata)"], ["education"]),
    ("s-1", "sante", "Santé", "Certificat de vaccination", "Carnet ou certificat de vaccination international", "Gratuit", "24h", 30, ["Carte d'identité", "Ancien carnet de vaccination (si disponible)"], ["sante"]),
    ("s-2", "sante", "Santé", "Carte sanitaire", "Carte nationale d'assurance maladie", "2 000 GNF", "5 jours", 30, ["Carte d'identité nationale", "Photo d'identité", "Certificat de résidence", "Attestation d'emploi ou de chômage"], ["sante"]),
    ("r-1", "residence", "Résidence & Citoyenneté", "Certificat de résidence", "Attestation de domicile délivrée par la mairie", "Gratuit", "24h", 30, ["Carte d'identité nationale", "Quittance de loyer ou titre de propriété", "Témoignage de 2 voisins"], ["mairie"]),
    ("r-2", "residence", "Résidence & Citoyenneté", "Attestation de domicile", "Attestation de lieu d'habitation", "1 000 GNF", "24h", 30, ["Carte d'identité", "Facture d'eau ou d'électricité récente"], ["mairie"]),
]


def upgrade() -> None:
    op.create_table(
        "administrative_services",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False),
        sa.Column("service_id", sa.String(100), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.String(100), nullable=False),
        sa.Column("category_name", sa.String(150), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("fee_label", sa.String(100), nullable=False, server_default="Gratuit"),
        sa.Column("expected_processing_label", sa.String(100), nullable=False, server_default=""),
        sa.Column("sla_business_days", sa.Integer(), nullable=False),
        sa.Column("required_documents", sa.JSON(), nullable=False),
        sa.Column("routing_terms", sa.JSON(), nullable=False),
        sa.Column("policy_status", sa.String(50), nullable=False, server_default="operational_default"),
        sa.Column("source_reference", sa.String(500), nullable=True),
        sa.Column("source_url", sa.String(1000), nullable=True),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint(
            "tenant_id",
            "service_id",
            "version",
            name="uq_administrative_service_tenant_service_version",
        ),
    )
    op.create_index("ix_administrative_services_tenant_id", "administrative_services", ["tenant_id"])
    op.create_index("ix_administrative_services_service_id", "administrative_services", ["service_id"])
    op.create_index("ix_administrative_services_category_id", "administrative_services", ["category_id"])
    op.create_index("ix_administrative_services_is_active", "administrative_services", ["is_active"])
    op.create_index("ix_administrative_services_policy_status", "administrative_services", ["policy_status"])
    op.create_index("ix_administrative_services_effective_from", "administrative_services", ["effective_from"])

    catalog_table = sa.table(
        "administrative_services",
        sa.column("id", sa.UUID()),
        sa.column("tenant_id", sa.String()),
        sa.column("service_id", sa.String()),
        sa.column("version", sa.Integer()),
        sa.column("category_id", sa.String()),
        sa.column("category_name", sa.String()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("fee_label", sa.String()),
        sa.column("expected_processing_label", sa.String()),
        sa.column("sla_business_days", sa.Integer()),
        sa.column("required_documents", sa.JSON()),
        sa.column("routing_terms", sa.JSON()),
        sa.column("policy_status", sa.String()),
        sa.column("source_reference", sa.String()),
        sa.column("source_url", sa.String()),
        sa.column("is_active", sa.Boolean()),
    )
    op.bulk_insert(
        catalog_table,
        [
            {
                "id": uuid.uuid4(),
                "tenant_id": TENANT_ID,
                "service_id": service_id,
                "version": 1,
                "category_id": category_id,
                "category_name": category_name,
                "name": name,
                "description": description,
                "fee_label": fee_label,
                "expected_processing_label": expected_processing_label,
                "sla_business_days": sla_business_days,
                "required_documents": required_documents,
                "routing_terms": routing_terms,
                "policy_status": "operational_default",
                "source_reference": SOURCE,
                "source_url": None,
                "is_active": True,
            }
            for (
                service_id,
                category_id,
                category_name,
                name,
                description,
                fee_label,
                expected_processing_label,
                sla_business_days,
                required_documents,
                routing_terms,
            ) in SERVICES
        ],
    )

    op.add_column("service_requests", sa.Column("service_catalog_version", sa.Integer(), nullable=True))
    op.add_column("service_requests", sa.Column("service_policy_status", sa.String(50), nullable=True))
    op.add_column("service_requests", sa.Column("service_policy_source", sa.String(500), nullable=True))
    op.add_column("service_requests", sa.Column("service_fee_label", sa.String(100), nullable=True))
    op.add_column("service_requests", sa.Column("expected_processing_label", sa.String(100), nullable=True))

    # Existing requests predate the catalog and cannot be truthfully assigned a
    # catalog version retroactively. New requests are always stamped by the API.

    op.execute("ALTER TABLE administrative_services ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE administrative_services FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY "administrative_services_select" ON administrative_services
            FOR SELECT
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
                OR current_setting('app.current_role', true) = 'SUPER_ADMIN'
            );

        CREATE POLICY "administrative_services_insert" ON administrative_services
            FOR INSERT
            WITH CHECK (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND current_setting('app.current_role', true) IN ('ADMIN', 'SUPER_ADMIN')
            );

        CREATE POLICY "administrative_services_update" ON administrative_services
            FOR UPDATE
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND current_setting('app.current_role', true) IN ('ADMIN', 'SUPER_ADMIN')
            )
            WITH CHECK (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND current_setting('app.current_role', true) IN ('ADMIN', 'SUPER_ADMIN')
            );

        CREATE POLICY "administrative_services_delete" ON administrative_services
            FOR DELETE
            USING (
                tenant_id = current_setting('app.current_tenant_id', true)
                AND current_setting('app.current_role', true) IN ('ADMIN', 'SUPER_ADMIN')
            );
        """
    )


def downgrade() -> None:
    op.drop_column("service_requests", "expected_processing_label")
    op.drop_column("service_requests", "service_fee_label")
    op.drop_column("service_requests", "service_policy_source")
    op.drop_column("service_requests", "service_policy_status")
    op.drop_column("service_requests", "service_catalog_version")
    op.drop_table("administrative_services")
