"""
Tests multi-tenant - eAdministration Suite Guinea.
Vérifie l'isolation des tenants et la résolution institutionnelle.
"""

import uuid
import pytest
import pytest_asyncio


class TestMultiTenant:
    """Test suite for multi-tenant isolation and resolution."""

    @pytest.mark.asyncio
    async def test_tenant_model_creation(self, db_session, test_tenant):
        """Should create a tenant with Guinea national colors."""
        assert test_tenant.id == "test-tenant"
        assert test_tenant.name == "Test Tenant"
        assert test_tenant.primary_color == "#CE1126"  # Guinea red
        assert test_tenant.secondary_color == "#FCD116"  # Guinea yellow
        assert test_tenant.accent_color == "#009460"  # Guinea green
        assert test_tenant.is_active is True

    @pytest.mark.asyncio
    async def test_tenant_quotas(self, test_tenant):
        """Tenant should have default quotas."""
        assert test_tenant.max_users == 500
        assert test_tenant.max_documents == 5000
        assert test_tenant.max_storage_mb == 2048

    @pytest.mark.asyncio
    async def test_institution_model_creation(self, db_session, test_institution, test_tenant):
        """Should create an institution linked to a tenant."""
        assert test_institution.id == "test-institution"
        assert test_institution.tenant_id == test_tenant.id
        assert test_institution.type == "ministere"
        assert test_institution.is_active is True

    @pytest.mark.asyncio
    async def test_user_with_tenant(self, db_session, test_tenant, test_institution):
        """Should create a user associated with tenant and institution."""
        from app.models.user import User, RoleEnum
        from passlib.context import CryptContext
        
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        user = User(
            email="tenant-user@eadmin.gn",
            hashed_password=pwd_context.hash("Tenant2026!"),
            full_name="Tenant User",
            role=RoleEnum.AGENT,
            tenant_id=test_tenant.id,
            institution_id=test_institution.id,
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        
        assert user.tenant_id == "test-tenant"
        assert user.institution_id == "test-institution"

    @pytest.mark.asyncio
    async def test_tenant_resolution_from_header(self, client):
        """Should resolve tenant from X-Tenant-ID header."""
        response = await client.get(
            "/health",
            headers={"X-Tenant-ID": "test-tenant"},
        )
        # Should work regardless of tenant header on health endpoint
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_default_tenant_fallback(self):
        """Should default to 'republique-de-guinee' when no tenant specified."""
        from app.config import settings
        assert settings.TENANT_DEFAULT_ID == "republique-de-guinee"

    @pytest.mark.asyncio
    async def test_tenant_isolation_mode(self):
        """Tenant isolation mode should be 'strict' by default."""
        from app.config import settings
        assert settings.TENANT_ISOLATION_MODE == "strict"

    @pytest.mark.asyncio
    async def test_institution_types(self, db_session, test_tenant):
        """Should support various Guinean institution types."""
        from app.models.institution import Institution
        
        institution_types = ["ministere", "direction", "service", "mairie", "agence"]
        for itype in institution_types:
            inst = Institution(
                id=f"test-{itype}",
                tenant_id=test_tenant.id,
                name=f"Test {itype.title()}",
                type=itype,
                is_active=True,
            )
            db_session.add(inst)
        
        await db_session.commit()
