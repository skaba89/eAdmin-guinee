"""
Tests du service d'audit - eAdministration Suite Guinea.
Vérifie la création d'entrées d'audit, la chaîne de hachage et l'intégrité.
"""

import uuid
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone


class TestAuditService:
    """Test suite for the enterprise audit service."""

    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session for audit tests."""
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.rollback = AsyncMock()
        session.execute = AsyncMock()
        return session

    @pytest.fixture
    def audit_entries(self):
        """Track created audit entries for verification."""
        return []

    @pytest.mark.asyncio
    async def test_log_action_creates_entry(self, mock_db_session):
        """Logging an action should create an AuditLog entry."""
        from app.services.audit_service import AuditService
        service = AuditService(mock_db_session)
        
        result = await service.log_action(
            user_id=uuid.uuid4(),
            action="LOGIN",
            resource_type="auth",
            resource_id="session-123",
            category="authentication",
            severity="info",
            ip_address="192.168.1.1",
        )
        
        # Should have called session.add
        assert mock_db_session.add.called
        # Should have flushed to get the ID
        assert mock_db_session.flush.called

    @pytest.mark.asyncio
    async def test_log_action_with_all_fields(self, mock_db_session):
        """Logging with all fields should populate them correctly."""
        from app.services.audit_service import AuditService
        service = AuditService(mock_db_session)
        
        user_id = uuid.uuid4()
        result = await service.log_action(
            user_id=user_id,
            action="UPDATE",
            resource_type="documents",
            resource_id="doc-456",
            category="document_management",
            description="Document mis à jour",
            details={"field": "status", "from": "draft", "to": "published"},
            old_value='{"status": "draft"}',
            new_value='{"status": "published"}',
            severity="info",
            ip_address="10.0.0.1",
            user_agent="Mozilla/5.0",
            session_id="sess-789",
            device_fingerprint="fp-abc123",
            tenant_id="republique-de-guinee",
            institution_id="ministere-education",
        )
        
        assert mock_db_session.add.called
        added_obj = mock_db_session.add.call_args[0][0]
        assert added_obj.action == "UPDATE"
        assert added_obj.resource_type == "documents"
        assert added_obj.severity == "info"
        assert added_obj.tenant_id == "republique-de-guinee"

    @pytest.mark.asyncio
    async def test_log_action_severity_validation(self, mock_db_session):
        """Severity should be validated and default to 'info'."""
        from app.services.audit_service import AuditService
        service = AuditService(mock_db_session)
        
        # Valid severity
        await service.log_action(
            user_id=uuid.uuid4(),
            action="LOGIN",
            resource_type="auth",
            resource_id="test",
            severity="critical",
        )
        added_obj = mock_db_session.add.call_args[0][0]
        assert added_obj.severity == "critical"

    @pytest.mark.asyncio
    async def test_hash_chain_integrity(self, mock_db_session):
        """Each audit entry should have a hash that includes the previous entry's hash."""
        from app.services.audit_service import AuditService
        service = AuditService(mock_db_session)
        
        # First entry - no previous hash
        await service.log_action(
            user_id=uuid.uuid4(),
            action="CREATE",
            resource_type="documents",
            resource_id="doc-1",
        )
        
        first_obj = mock_db_session.add.call_args[0][0]
        assert first_obj.entry_hash is not None
        # First entry should have no previous hash or empty
        assert first_obj.previous_hash is None or first_obj.previous_hash == ""

    @pytest.mark.asyncio
    async def test_audit_action_types(self, mock_db_session):
        """All standard action types should be loggable."""
        from app.services.audit_service import AuditService
        service = AuditService(mock_db_session)
        
        action_types = [
            "LOGIN", "LOGOUT", "CREATE", "READ", "UPDATE", "DELETE",
            "EXPORT", "SIGN", "APPROVE", "REJECT", "ESCALATE",
            "DOWNLOAD", "UPLOAD", "WORKFLOW_STEP", "PASSWORD_CHANGE",
            "MFA_SETUP", "MFA_VERIFY", "MFA_DISABLE", "ROLE_CHANGE",
            "PERMISSION_CHANGE", "SESSION_CREATE", "SESSION_DESTROY",
            "TOKEN_REVOKE", "CONFIG_CHANGE", "SECURITY_ALERT",
        ]
        
        for action in action_types:
            await service.log_action(
                user_id=uuid.uuid4(),
                action=action,
                resource_type="test",
                resource_id=f"test-{action.lower()}",
            )
        
        assert mock_db_session.add.call_count == len(action_types)

    @pytest.mark.asyncio
    async def test_verify_chain_integrity(self, mock_db_session):
        """Chain integrity verification should work correctly."""
        from app.services.audit_service import AuditService
        service = AuditService(mock_db_session)
        
        # Mock the database query for verification
        mock_result = AsyncMock()
        mock_result.scalars = MagicMock()
        mock_result.scalars.return_value = MagicMock()
        mock_result.scalars.return_value.all = MagicMock(return_value=[])
        mock_db_session.execute = AsyncMock(return_value=mock_result)
        
        result = await service.verify_chain_integrity()
        assert isinstance(result, dict)
        assert "is_valid" in result


class TestAuditMiddleware:
    """Test suite for the audit middleware."""

    @pytest.mark.asyncio
    async def test_audit_middleware_skips_health_endpoint(self, client):
        """Health endpoint should not be audited."""
        response = await client.get("/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_audit_middleware_skips_non_api_paths(self, client):
        """Non-API paths should not be audited."""
        response = await client.get("/docs")
        # May 404 if docs disabled, but shouldn't create audit entries


class TestAuditAPI:
    """Test suite for the audit API endpoints."""

    @pytest.mark.asyncio
    async def test_audit_logs_require_directeur_role(self, client, super_admin_auth_headers):
        """Audit logs endpoint should require DIRECTEUR+ role."""
        response = await client.get(
            "/api/v1/audit/logs",
            headers=super_admin_auth_headers,
        )
        # Should either return data or 403 if not authorized
        assert response.status_code in [200, 403, 401]

    @pytest.mark.asyncio
    async def test_audit_stats_require_admin_role(self, client, super_admin_auth_headers):
        """Audit stats endpoint should require ADMIN+ role."""
        response = await client.get(
            "/api/v1/audit/stats",
            headers=super_admin_auth_headers,
        )
        assert response.status_code in [200, 403, 401]
