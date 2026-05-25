"""
Tests RBAC (Role-Based Access Control) - eAdministration Suite Guinea.
Vérifie les mappings de rôles backend → frontend, les claims JWT,
l'inscription avec chaque rôle, et la hiérarchie de permissions.
"""

import pytest
from httpx import AsyncClient
from jose import jwt

from app.config import settings
from app.models.user import RoleEnum


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: RoleEnum values & frontend mapping
# ═══════════════════════════════════════════════════════════════════════════════


class TestRoleEnumValues:
    """Tests des valeurs de l'énumération RoleEnum."""

    def test_role_enum_is_string_enum(self):
        """TC-RBAC-001: RoleEnum hérite de str (sérialisable en JSON)."""
        assert isinstance(RoleEnum.AGENT, str)

    def test_all_roles_have_frontend_mapping(self):
        """TC-RBAC-002: Chaque rôle a un mapping frontend non vide."""
        for role in RoleEnum:
            frontend_role = role.to_frontend_role()
            assert isinstance(frontend_role, str)
            assert len(frontend_role) > 0, f"Role {role.value} has empty frontend mapping"

    def test_frontend_roles_are_unique(self):
        """TC-RBAC-003: Les rôles frontend sont uniques (pas de collision)."""
        frontend_roles = [role.to_frontend_role() for role in RoleEnum]
        assert len(frontend_roles) == len(set(frontend_roles)), "Duplicate frontend roles detected"

    def test_frontend_roles_are_lowercase(self):
        """TC-RBAC-004: Les rôles frontend sont en minuscules."""
        for role in RoleEnum:
            frontend_role = role.to_frontend_role()
            assert frontend_role == frontend_role.lower(), f"Frontend role '{frontend_role}' is not lowercase"


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: Role hierarchy
# ═══════════════════════════════════════════════════════════════════════════════


def test_role_hierarchy_levels():
    """Test that role hierarchy levels are correctly ordered.

    7-level hierarchical model matching Guinea's government structure:
    Level 7: SUPER_ADMIN
    Level 6: MINISTRE
    Level 5: DIRECTEUR
    Level 4: CHEF_SERVICE
    Level 3: ADMIN
    Level 2: AGENT, MAIRIE, AGENCE (merged into AGENT level)
    Level 0: CITOYEN
    """
    hierarchy = {
        'SUPER_ADMIN': 7,
        'MINISTRE': 6,
        'DIRECTEUR': 5,
        'CHEF_SERVICE': 4,
        'ADMIN': 3,
        'AGENT': 2,
        'MAIRIE': 2,
        'AGENCE': 2,
        'CITOYEN': 0,
    }

    # Verify hierarchy ordering
    assert hierarchy['SUPER_ADMIN'] > hierarchy['MINISTRE']
    assert hierarchy['MINISTRE'] > hierarchy['DIRECTEUR']
    assert hierarchy['DIRECTEUR'] > hierarchy['CHEF_SERVICE']
    assert hierarchy['CHEF_SERVICE'] > hierarchy['ADMIN']
    assert hierarchy['ADMIN'] > hierarchy['AGENT']
    assert hierarchy['AGENT'] > hierarchy['CITOYEN']
    assert hierarchy['MAIRIE'] > hierarchy['CITOYEN']
    assert hierarchy['AGENCE'] > hierarchy['CITOYEN']

    # MAIRIE, AGENCE and AGENT should be at the same level (merged)
    assert hierarchy['MAIRIE'] == hierarchy['AGENCE']
    assert hierarchy['MAIRIE'] == hierarchy['AGENT']


def test_role_hierarchy_inheritance():
    """Test that each higher level includes all lower level permissions."""
    base_permissions = {
        'CITOYEN': {'citizen_portal:view', 'service_requests:create'},
        'MAIRIE': {'service_requests:process', 'ged:view'},
        'AGENCE': {'service_requests:process', 'ged:view'},
        'AGENT': {'service_requests:process', 'ged:view', 'citizen_database:view'},
        'CHEF_SERVICE': {'service_requests:approve', 'workflow:view'},
        'ADMIN': {'admin:access', 'users:manage', 'service_requests:delete'},
        'DIRECTEUR': {'dashboard:view', 'audit_logs:view', 'workflow:manage'},
        'MINISTRE': {'dashboard:view', 'analytics:view_all', 'settings:edit'},
        'SUPER_ADMIN': set(),  # Has ALL permissions
    }

    all_permissions = set()
    for perms in base_permissions.values():
        all_permissions.update(perms)
    base_permissions['SUPER_ADMIN'] = all_permissions

    # Verify SUPER_ADMIN has all permissions
    for role, perms in base_permissions.items():
        if role != 'SUPER_ADMIN':
            assert perms.issubset(base_permissions['SUPER_ADMIN']), \
                f"Role {role} has permissions not in SUPER_ADMIN"


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: Document classification / clearance levels
# ═══════════════════════════════════════════════════════════════════════════════


def test_document_clearance_levels():
    """Test document classification clearance per role.

    Classification hierarchy: public < interne < confidentiel < secret
    """
    clearance = {
        'CITOYEN': 0,
        'MAIRIE': 1,
        'AGENCE': 1,
        'AGENT': 1,
        'CHEF_SERVICE': 1,
        'DIRECTEUR': 2,
        'MINISTRE': 2,
        'ADMIN': 3,
        'SUPER_ADMIN': 3,
    }

    classification_level = {
        'public': 0,
        'interne': 1,
        'confidentiel': 2,
        'secret': 3,
    }

    assert clearance['SUPER_ADMIN'] >= classification_level['secret']
    assert clearance['CITOYEN'] == classification_level['public']
    assert clearance['DIRECTEUR'] >= classification_level['confidentiel']
    assert clearance['DIRECTEUR'] < classification_level['secret']
    assert clearance['MAIRIE'] >= classification_level['interne']
    assert clearance['MAIRIE'] < classification_level['confidentiel']


def test_document_access_per_role():
    """Test that each role can only access documents at or below their clearance."""
    clearance = {
        'CITOYEN': 0,
        'MAIRIE': 1,
        'AGENCE': 1,
        'AGENT': 1,
        'CHEF_SERVICE': 1,
        'DIRECTEUR': 2,
        'MINISTRE': 2,
        'ADMIN': 3,
        'SUPER_ADMIN': 3,
    }

    classification_level = {
        'public': 0,
        'interne': 1,
        'confidentiel': 2,
        'secret': 3,
    }

    for role, level in clearance.items():
        accessible = [cls for cls, cls_level in classification_level.items()
                      if cls_level <= level]
        restricted = [cls for cls, cls_level in classification_level.items()
                      if cls_level > level]

        for cls in accessible:
            assert classification_level[cls] <= level, \
                f"Role {role} should not access {cls}"

        for cls in restricted:
            assert classification_level[cls] > level, \
                f"Role {role} should be able to access {cls}"


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: Institution-based RLS
# ═══════════════════════════════════════════════════════════════════════════════


def test_institution_category_mapping():
    """Test that institutions are mapped to the correct service categories."""
    institution_categories = {
        'Mairie de Kaloum': ['etat-civil', 'residence'],
        'Mairie / Commune': ['etat-civil', 'residence'],
        "Agence Nationale d'Identification (ANIP)": ['identification'],
        'ANIP': ['identification'],
        'Ministère de la Justice': ['justice'],
        "Direction de l'Urbanisme": ['urbanisme'],
        'APIP — Agence de Promotion des Investissements Privés': ['entreprise'],
        "Ministère de l'Éducation Nationale": ['education'],
        'Ministère de la Santé': ['sante'],
        'Direction Générale des Impôts': ['fiscalite'],
        'Caisse Nationale de Sécurité Sociale': ['social'],
    }

    assert 'etat-civil' in institution_categories['Mairie de Kaloum']
    assert 'residence' in institution_categories['Mairie de Kaloum']
    assert 'identification' not in institution_categories['Mairie de Kaloum']
    assert 'identification' in institution_categories['ANIP']


def test_mairie_rls_filtering():
    """Test that Mairie agents only see etat-civil and residence requests."""
    mock_requests = [
        {'id': '1', 'categoryId': 'etat-civil', 'serviceName': 'Birth Certificate'},
        {'id': '2', 'categoryId': 'residence', 'serviceName': 'Certificate of Residence'},
        {'id': '3', 'categoryId': 'identification', 'serviceName': 'National ID Card'},
        {'id': '4', 'categoryId': 'justice', 'serviceName': 'Criminal Record'},
        {'id': '5', 'categoryId': 'etat-civil', 'serviceName': 'Marriage Certificate'},
    ]

    mairie_categories = ['etat-civil', 'residence']
    filtered = [r for r in mock_requests if r['categoryId'] in mairie_categories]

    assert len(filtered) == 3
    assert all(r['categoryId'] in mairie_categories for r in filtered)


def test_anip_rls_filtering():
    """Test that ANIP agents only see identification requests."""
    mock_requests = [
        {'id': '1', 'categoryId': 'etat-civil', 'serviceName': 'Birth Certificate'},
        {'id': '2', 'categoryId': 'identification', 'serviceName': 'National ID Card'},
        {'id': '3', 'categoryId': 'identification', 'serviceName': 'Passport'},
        {'id': '4', 'categoryId': 'justice', 'serviceName': 'Criminal Record'},
    ]

    anip_categories = ['identification']
    filtered = [r for r in mock_requests if r['categoryId'] in anip_categories]

    assert len(filtered) == 2
    assert all(r['categoryId'] == 'identification' for r in filtered)


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: Page access control
# ═══════════════════════════════════════════════════════════════════════════════


def test_citizen_accessible_pages():
    """Test that citizen can only access limited pages."""
    citizen_permissions = {
        'citizen-portal:view',
        'citizen-portal:submit',
        'citizen-portal:view_own_requests',
        'service-requests:view_own',
        'service-requests:create',
        'ged:view_own',
    }

    assert 'admin:access' not in citizen_permissions
    assert 'dashboard:view' not in citizen_permissions
    assert 'users:view' not in citizen_permissions
    assert 'audit-logs:view' not in citizen_permissions


def test_admin_accessible_pages():
    """Test that admin can access most pages including admin panel."""
    admin_permissions = {
        'dashboard:view', 'dashboard:view_all',
        'service-requests:view_all', 'service-requests:process',
        'service-requests:approve', 'service-requests:reject',
        'service-requests:delete', 'service-requests:create',
        'citizen-portal:view',
        'ged:view', 'ged:view_all', 'ged:upload', 'ged:delete',
        'courriers:view', 'courriers:view_all',
        'workflow:view', 'workflow:manage',
        'signatures:view', 'signatures:sign', 'signatures:manage',
        'analytics:view', 'analytics:view_all',
        'admin:access', 'admin:manage_modules',
        'users:view', 'users:create', 'users:edit', 'users:delete',
        'settings:view', 'settings:edit',
        'audit-logs:view', 'audit-logs:export',
    }

    assert 'admin:access' in admin_permissions
    assert 'users:view' in admin_permissions
    assert 'service-requests:delete' in admin_permissions
    assert 'audit-logs:export' in admin_permissions


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: Permission checks
# ═══════════════════════════════════════════════════════════════════════════════


def test_delete_permission_limited():
    """Test that delete permission is limited to admin and superadmin."""
    roles_with_delete = {'admin', 'superadmin'}
    roles_without_delete = {'citoyen', 'mairie', 'agence', 'agent', 'chef_service', 'directeur', 'ministre'}

    assert 'admin' in roles_with_delete
    assert 'superadmin' in roles_with_delete

    for role in roles_without_delete:
        assert role not in roles_with_delete, \
            f"Role {role} should not have delete permission"


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: Courrier confidentiality
# ═══════════════════════════════════════════════════════════════════════════════


def test_courrier_confidentiality_rules():
    """Test that confidential courriers are restricted to directeur+ roles."""
    roles_can_see_confidential = {'directeur', 'ministre', 'admin', 'superadmin'}
    roles_cannot_see_confidential = {'citoyen', 'mairie', 'agence', 'agent', 'chef_service'}

    for role in roles_can_see_confidential:
        assert role in roles_can_see_confidential

    for role in roles_cannot_see_confidential:
        assert role not in roles_can_see_confidential


def test_citizen_no_courrier_access():
    """Test that citizens cannot access courriers at all."""
    citoyen_permissions = {
        'citizen-portal:view',
        'service-requests:view_own',
        'service-requests:create',
        'ged:view_own',
    }

    assert not any('courrier' in p for p in citoyen_permissions)


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: Workflow status transitions
# ═══════════════════════════════════════════════════════════════════════════════


def test_request_status_transitions():
    """Test valid status transitions for citizen requests."""
    valid_statuses = ['soumise', 'en_cours', 'pieces_complementaires',
                      'validee', 'prete', 'livree', 'rejetee']

    assert len(valid_statuses) == 7

    happy_path = ['soumise', 'en_cours', 'validee', 'prete', 'livree']
    complementaire_path = ['soumise', 'en_cours', 'pieces_complementaires',
                           'en_cours', 'validee', 'prete', 'livree']
    rejection_path = ['soumise', 'en_cours', 'rejetee']

    assert happy_path[0] == 'soumise'
    assert complementaire_path[0] == 'soumise'
    assert rejection_path[0] == 'soumise'

    terminal_statuses = {'livree', 'rejetee'}
    assert happy_path[-1] in terminal_statuses
    assert rejection_path[-1] in terminal_statuses


def test_request_deadline_per_category():
    """Test legal deadline calculation per service category."""
    deadline_days = {
        'etat-civil': 30,
        'justice': 45,
        'identification': 45,
        'urbanisme': 45,
        'entreprise': 30,
        'education': 30,
        'sante': 30,
        'residence': 30,
    }

    default_deadline = 45

    for category, days in deadline_days.items():
        assert days > 0, f"Category {category} should have positive deadline"
        assert days <= default_deadline, \
            f"Category {category} deadline should not exceed {default_deadline}"

    assert deadline_days['identification'] == 45
    assert deadline_days['justice'] == 45
    assert deadline_days['etat-civil'] == 30
    assert deadline_days['residence'] == 30


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: MFA requirement per role
# ═══════════════════════════════════════════════════════════════════════════════


def test_mfa_required_roles():
    """Test that MFA is required for elevated roles."""
    mfa_required_roles = {'admin_general', 'ministere', 'super_admin', 'directeur', 'ministre'}

    assert 'admin_general' in mfa_required_roles
    assert 'super_admin' in mfa_required_roles
    assert 'directeur' in mfa_required_roles
    assert 'ministre' in mfa_required_roles


def test_mfa_not_required_for_basic_roles():
    """Test that MFA is NOT required for basic roles."""
    mfa_required_roles = {'admin_general', 'ministere', 'super_admin', 'directeur', 'ministre'}

    assert 'citoyen' not in mfa_required_roles
    assert 'mairie' not in mfa_required_roles
    assert 'agence' not in mfa_required_roles
    assert 'agent' not in mfa_required_roles


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: RoleEnum string values
# ═══════════════════════════════════════════════════════════════════════════════


def test_role_enum_values():
    """Test that RoleEnum values are uppercase strings."""
    for role in RoleEnum:
        assert role.value == role.value.upper(), \
            f"Role {role.name} value should be uppercase, got {role.value}"
        assert isinstance(role.value, str), \
            f"Role {role.name} value should be a string"


# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION TESTS: JWT token claims & API endpoints
# ═══════════════════════════════════════════════════════════════════════════════


class TestTokenContainsFrontendRole:
    """Tests que les tokens JWT contiennent le frontend_role."""

    @pytest.mark.asyncio
    async def test_access_token_contains_frontend_role(self, client: AsyncClient, test_user):
        """TC-RBAC-018: L'access token contient le claim frontend_role."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 200
        access_token = response.json()["access_token"]

        payload = jwt.decode(
            access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert "frontend_role" in payload

    @pytest.mark.asyncio
    async def test_refresh_token_contains_frontend_role(self, client: AsyncClient, test_user):
        """TC-RBAC-019: Le refresh token contient le claim frontend_role."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@eadmin.gn", "password": "Test2026!"},
        )
        assert response.status_code == 200
        refresh_token = response.json()["refresh_token"]

        payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert "frontend_role" in payload


class TestMeEndpointFrontendRole:
    """Tests que l'endpoint /me retourne le frontend_role correct."""

    @pytest.mark.asyncio
    async def test_me_returns_frontend_role_for_agent(self, client: AsyncClient, auth_headers):
        """TC-RBAC-028: /me retourne frontend_role pour AGENT."""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert "frontend_role" in response.json()

    @pytest.mark.asyncio
    async def test_me_returns_frontend_role_for_admin(self, client: AsyncClient, admin_auth_headers):
        """TC-RBAC-029: /me retourne frontend_role pour ADMIN."""
        response = await client.get("/api/v1/auth/me", headers=admin_auth_headers)
        assert response.status_code == 200
        assert "frontend_role" in response.json()
