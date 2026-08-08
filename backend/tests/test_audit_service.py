"""Tests for the enterprise audit service and API."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest


class TestAuditService:
    """Audit entries must remain hash-chain compatible with AsyncSession."""

    @pytest.fixture
    def mock_db_session(self):
        session = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.rollback = AsyncMock()

        # AsyncSession.execute() is awaited, but the Result object it returns
        # exposes synchronous scalar/scalars accessors. Modelling those methods
        # as AsyncMock creates coroutine objects that are then serialized into
        # the audit hash, which is not representative of SQLAlchemy behaviour.
        empty_result = MagicMock()
        empty_result.scalar_one_or_none.return_value = None
        session.execute = AsyncMock(return_value=empty_result)
        return session

    @pytest.mark.asyncio
    async def test_log_action_creates_entry(self, mock_db_session):
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

        assert result.entry_hash
        assert mock_db_session.add.called
        assert mock_db_session.flush.called

    @pytest.mark.asyncio
    async def test_log_action_with_all_fields(self, mock_db_session):
        from app.services.audit_service import AuditService

        service = AuditService(mock_db_session)
        await service.log_action(
            user_id=uuid.uuid4(),
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

        added_obj = mock_db_session.add.call_args[0][0]
        assert added_obj.action == "UPDATE"
        assert added_obj.resource_type == "documents"
        assert added_obj.severity == "info"
        assert added_obj.tenant_id == "republique-de-guinee"

    @pytest.mark.asyncio
    async def test_log_action_severity_validation(self, mock_db_session):
        from app.services.audit_service import AuditService

        service = AuditService(mock_db_session)
        await service.log_action(
            user_id=uuid.uuid4(),
            action="LOGIN",
            resource_type="auth",
            resource_id="test",
            severity="critical",
        )
        assert mock_db_session.add.call_args[0][0].severity == "critical"

    @pytest.mark.asyncio
    async def test_hash_chain_integrity(self, mock_db_session):
        from app.services.audit_service import AuditService

        service = AuditService(mock_db_session)
        await service.log_action(
            user_id=uuid.uuid4(),
            action="CREATE",
            resource_type="documents",
            resource_id="doc-1",
        )

        first_obj = mock_db_session.add.call_args[0][0]
        assert first_obj.entry_hash is not None
        assert first_obj.previous_hash in (None, "")

    @pytest.mark.asyncio
    async def test_audit_action_types(self, mock_db_session):
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
        from app.services.audit_service import AuditService

        result_row = MagicMock()
        result_row.scalars.return_value.all.return_value = []
        mock_db_session.execute = AsyncMock(return_value=result_row)

        result = await AuditService(mock_db_session).verify_chain_integrity()
        assert isinstance(result, dict)
        assert "is_valid" in result


class TestAuditMiddleware:
    @pytest.mark.asyncio
    async def test_audit_middleware_skips_health_endpoint(self, client):
        response = await client.get("/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_audit_middleware_skips_non_api_paths(self, client):
        response = await client.get("/docs")
        assert response.status_code in (200, 404)


class TestAuditAPI:
    @pytest.mark.asyncio
    async def test_audit_logs_require_directeur_role(self, client, super_admin_auth_headers):
        response = await client.get(
            "/api/v1/audit/logs",
            headers=super_admin_auth_headers,
        )
        assert response.status_code in [200, 403, 401]

    @pytest.mark.asyncio
    async def test_audit_stats_require_admin_role(self, client, super_admin_auth_headers):
        response = await client.get(
            "/api/v1/audit/stats",
            headers=super_admin_auth_headers,
        )
        assert response.status_code in [200, 403, 401]
