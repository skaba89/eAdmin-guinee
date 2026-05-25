"""Add tenants and institutions tables, add tenant_id to business tables

Revision ID: add_tenants_and_institutions
Revises: add_rls_policies
Create Date: 2025-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_tenants_and_institutions'
down_revision = 'add_rls_policies'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Crée les tables tenants et institutions, ajoute tenant_id aux tables métier."""

    # ================================================================
    # 1. Créer la table tenants
    # ================================================================
    op.create_table(
        'tenants',
        sa.Column('id', sa.String(100), primary_key=True,
                  comment="Identifiant du tenant (ex: 'republique-de-guinee')"),
        sa.Column('name', sa.String(255), nullable=False,
                  comment="Nom complet du tenant"),
        sa.Column('domain', sa.String(255), nullable=True, unique=True,
                  comment="Domaine personnalisé"),
        sa.Column('logo_url', sa.String(512), nullable=True,
                  comment="URL du logo du tenant"),
        sa.Column('primary_color', sa.String(7), nullable=False, server_default='#CE1126',
                  comment="Couleur principale (rouge Guinée)"),
        sa.Column('secondary_color', sa.String(7), nullable=False, server_default='#FCD116',
                  comment="Couleur secondaire (jaune Guinée)"),
        sa.Column('accent_color', sa.String(7), nullable=False, server_default='#009460',
                  comment="Couleur d'accent (vert Guinée)"),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('max_users', sa.Integer(), nullable=False, server_default='1000'),
        sa.Column('max_documents', sa.Integer(), nullable=False, server_default='10000'),
        sa.Column('max_storage_mb', sa.Integer(), nullable=False, server_default='5120'),
        sa.Column('features', sa.JSON(), nullable=True,
                  comment="Feature flags du tenant"),
        sa.Column('settings', sa.JSON(), nullable=True,
                  comment="Paramètres spécifiques au tenant"),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ================================================================
    # 2. Créer la table institutions
    # ================================================================
    op.create_table(
        'institutions',
        sa.Column('id', sa.String(100), primary_key=True,
                  comment="Identifiant de l'institution"),
        sa.Column('tenant_id', sa.String(100), nullable=False, index=True,
                  comment="Tenant de rattachement"),
        sa.Column('name', sa.String(255), nullable=False,
                  comment="Nom complet de l'institution"),
        sa.Column('type', sa.String(50), nullable=False, index=True,
                  comment="Type: ministere, direction, service, mairie, agence"),
        sa.Column('parent_id', sa.String(100), nullable=True, index=True,
                  comment="Institution parente (hiérarchie)"),
        sa.Column('code', sa.String(50), nullable=True, unique=True,
                  comment="Code administratif"),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('settings', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ================================================================
    # 3. Ajouter tenant_id aux tables métier qui n'en ont pas encore
    #    (users a déjà tenant_id, documents et workflows ont déjà institution_id)
    # ================================================================

    # documents : ajouter tenant_id (institution_id existe déjà)
    op.add_column('documents', sa.Column(
        'tenant_id', sa.String(100), nullable=True, index=True,
        comment="Tenant identifier for multi-tenant isolation"
    ))

    # courriers : ajouter tenant_id et institution_id
    op.add_column('courriers', sa.Column(
        'tenant_id', sa.String(100), nullable=True, index=True,
        comment="Tenant identifier for multi-tenant isolation"
    ))
    op.add_column('courriers', sa.Column(
        'institution_id', sa.String(255), nullable=True,
        comment="Institution identifier for RLS"
    ))

    # workflows : ajouter tenant_id (institution_id existe déjà)
    op.add_column('workflows', sa.Column(
        'tenant_id', sa.String(100), nullable=True, index=True,
        comment="Tenant identifier for multi-tenant isolation"
    ))

    # audit_logs : ajouter tenant_id et institution_id
    op.add_column('audit_logs', sa.Column(
        'tenant_id', sa.String(100), nullable=True, index=True,
        comment="Tenant identifier for multi-tenant isolation"
    ))
    op.add_column('audit_logs', sa.Column(
        'institution_id', sa.String(255), nullable=True,
        comment="Institution identifier for RLS"
    ))

    # ================================================================
    # 4. Ajouter les clés étrangères
    # ================================================================

    # institutions.tenant_id → tenants.id
    op.create_foreign_key(
        'fk_institutions_tenant_id',
        'institutions', 'tenants',
        ['tenant_id'], ['id'],
        ondelete='CASCADE',
    )

    # institutions.parent_id → institutions.id (auto-référence)
    op.create_foreign_key(
        'fk_institutions_parent_id',
        'institutions', 'institutions',
        ['parent_id'], ['id'],
        ondelete='SET NULL',
    )

    # users.tenant_id → tenants.id
    op.create_foreign_key(
        'fk_users_tenant_id',
        'users', 'tenants',
        ['tenant_id'], ['id'],
        ondelete='SET NULL',
    )

    # users.institution_id → institutions.id
    op.create_foreign_key(
        'fk_users_institution_id',
        'users', 'institutions',
        ['institution_id'], ['id'],
        ondelete='SET NULL',
    )

    # documents.tenant_id → tenants.id
    op.create_foreign_key(
        'fk_documents_tenant_id',
        'documents', 'tenants',
        ['tenant_id'], ['id'],
        ondelete='SET NULL',
    )

    # documents.institution_id → institutions.id
    op.create_foreign_key(
        'fk_documents_institution_id',
        'documents', 'institutions',
        ['institution_id'], ['id'],
        ondelete='SET NULL',
    )

    # courriers.tenant_id → tenants.id
    op.create_foreign_key(
        'fk_courriers_tenant_id',
        'courriers', 'tenants',
        ['tenant_id'], ['id'],
        ondelete='SET NULL',
    )

    # courriers.institution_id → institutions.id
    op.create_foreign_key(
        'fk_courriers_institution_id',
        'courriers', 'institutions',
        ['institution_id'], ['id'],
        ondelete='SET NULL',
    )

    # workflows.tenant_id → tenants.id
    op.create_foreign_key(
        'fk_workflows_tenant_id',
        'workflows', 'tenants',
        ['tenant_id'], ['id'],
        ondelete='SET NULL',
    )

    # workflows.institution_id → institutions.id
    op.create_foreign_key(
        'fk_workflows_institution_id',
        'workflows', 'institutions',
        ['institution_id'], ['id'],
        ondelete='SET NULL',
    )

    # audit_logs.tenant_id → tenants.id
    op.create_foreign_key(
        'fk_audit_logs_tenant_id',
        'audit_logs', 'tenants',
        ['tenant_id'], ['id'],
        ondelete='SET NULL',
    )

    # audit_logs.institution_id → institutions.id
    op.create_foreign_key(
        'fk_audit_logs_institution_id',
        'audit_logs', 'institutions',
        ['institution_id'], ['id'],
        ondelete='SET NULL',
    )

    # ================================================================
    # 5. Insérer le tenant par défaut pour la République de Guinée
    # ================================================================
    op.execute("""
        INSERT INTO tenants (id, name, domain, primary_color, secondary_color, accent_color,
                             is_active, max_users, max_documents, max_storage_mb, features, settings)
        VALUES (
            'republique-de-guinee',
            'République de Guinée',
            'eadmin.gouv.gn',
            '#CE1126',
            '#FCD116',
            '#009460',
            true,
            50000,
            1000000,
            102400,
            '{"mfa": true, "ai": true, "parapheur": true, "ged": true, "courriers": true}'::jsonb,
            '{"default_language": "fr", "timezone": "Africa/Conakry", "currency": "GNF"}'::jsonb
        )
        ON CONFLICT (id) DO NOTHING;
    """)

    # ================================================================
    # 6. Insérer quelques institutions par défaut
    # ================================================================
    op.execute("""
        INSERT INTO institutions (id, tenant_id, name, type, code, is_active) VALUES
            ('presidence', 'republique-de-guinee', 'Présidence de la République', 'ministere', 'PR-001', true),
            ('min-justice', 'republique-de-guinee', 'Ministère de la Justice', 'ministere', 'MJ-001', true),
            ('min-interieur', 'republique-de-guinee', 'Ministère de l''Intérieur', 'ministere', 'MI-001', true),
            ('min-finances', 'republique-de-guinee', 'Ministère des Finances', 'ministere', 'MF-001', true),
            ('min-education', 'republique-de-guinee', 'Ministère de l''Éducation', 'ministere', 'ME-001', true),
            ('min-sante', 'republique-de-guinee', 'Ministère de la Santé', 'ministere', 'MS-001', true),
            ('mairie-conakry', 'republique-de-guinee', 'Mairie de Conakry', 'mairie', 'MC-001', true),
            ('agence-eadmin', 'republique-de-guinee', 'Agence eAdministration', 'agence', 'AE-001', true)
        ON CONFLICT (id) DO NOTHING;
    """)

    # ================================================================
    # 7. Mettre à jour les données existantes avec le tenant par défaut
    # ================================================================
    op.execute("""
        UPDATE documents SET tenant_id = 'republique-de-guinee' WHERE tenant_id IS NULL;
        UPDATE courriers SET tenant_id = 'republique-de-guinee' WHERE tenant_id IS NULL;
        UPDATE workflows SET tenant_id = 'republique-de-guinee' WHERE tenant_id IS NULL;
        UPDATE users SET tenant_id = 'republique-de-guinee' WHERE tenant_id IS NULL;
        UPDATE audit_logs SET tenant_id = 'republique-de-guinee' WHERE tenant_id IS NULL;
    """)


def downgrade() -> None:
    """Supprime les colonnes et tables ajoutées."""

    # Supprimer les clés étrangères d'abord
    op.drop_constraint('fk_audit_logs_institution_id', 'audit_logs', type_='foreignkey')
    op.drop_constraint('fk_audit_logs_tenant_id', 'audit_logs', type_='foreignkey')
    op.drop_constraint('fk_workflows_institution_id', 'workflows', type_='foreignkey')
    op.drop_constraint('fk_workflows_tenant_id', 'workflows', type_='foreignkey')
    op.drop_constraint('fk_courriers_institution_id', 'courriers', type_='foreignkey')
    op.drop_constraint('fk_courriers_tenant_id', 'courriers', type_='foreignkey')
    op.drop_constraint('fk_documents_institution_id', 'documents', type_='foreignkey')
    op.drop_constraint('fk_documents_tenant_id', 'documents', type_='foreignkey')
    op.drop_constraint('fk_users_institution_id', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_tenant_id', 'users', type_='foreignkey')
    op.drop_constraint('fk_institutions_parent_id', 'institutions', type_='foreignkey')
    op.drop_constraint('fk_institutions_tenant_id', 'institutions', type_='foreignkey')

    # Supprimer les colonnes ajoutées
    op.drop_column('audit_logs', 'institution_id')
    op.drop_column('audit_logs', 'tenant_id')
    op.drop_column('workflows', 'tenant_id')
    op.drop_column('courriers', 'institution_id')
    op.drop_column('courriers', 'tenant_id')
    op.drop_column('documents', 'tenant_id')

    # Supprimer les tables
    op.drop_table('institutions')
    op.drop_table('tenants')
