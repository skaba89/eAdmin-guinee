"""Tests for session lifecycle, risk scoring and trusted devices."""

import uuid

import pytest


class TestSessionService:
    @pytest.mark.asyncio
    async def test_create_session(self, mock_session_service):
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp-abc123",
        )
        assert session_id.startswith("sess-mock-")

    @pytest.mark.asyncio
    async def test_validate_session(self, mock_session_service):
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp-abc123",
        )
        session = await mock_session_service.validate_session(session_id)
        assert session is not None
        assert session["user_id"] == user_id
        assert session["ip_address"] == "192.168.1.1"

    @pytest.mark.asyncio
    async def test_validate_invalid_session(self, mock_session_service):
        assert await mock_session_service.validate_session("nonexistent-session") is None

    @pytest.mark.asyncio
    async def test_destroy_session(self, mock_session_service):
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp-abc123",
        )
        await mock_session_service.destroy_session(session_id)
        assert await mock_session_service.validate_session(session_id) is None

    @pytest.mark.asyncio
    async def test_destroy_all_sessions(self, mock_session_service):
        user_id = str(uuid.uuid4())
        sid1 = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp1",
        )
        sid2 = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.2",
            user_agent="Chrome/100",
            device_fingerprint="fp2",
        )
        assert await mock_session_service.destroy_all_sessions(user_id) == 2
        assert await mock_session_service.validate_session(sid1) is None
        assert await mock_session_service.validate_session(sid2) is None

    @pytest.mark.asyncio
    async def test_get_user_sessions(self, mock_session_service):
        user_id = str(uuid.uuid4())
        await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp1",
        )
        await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.2",
            user_agent="Chrome/100",
            device_fingerprint="fp2",
        )
        assert len(await mock_session_service.get_user_sessions(user_id)) == 2

    @pytest.mark.asyncio
    async def test_ip_change_adds_risk_without_single_signal_lockout(self, mock_session_service):
        """An IP change is a risk signal, not enough alone to flag a session."""
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp1",
        )
        result = await mock_session_service.detect_suspicious_session(
            session_id=session_id,
            current_ip="10.0.0.1",
            current_user_agent="Mozilla/5.0",
        )
        assert result["is_suspicious"] is False
        assert result["risk_score"] == 30
        assert any("IP" in reason for reason in result["reasons"])

    @pytest.mark.asyncio
    async def test_user_agent_change_adds_risk_without_single_signal_lockout(self, mock_session_service):
        """A UA change is a risk signal, not enough alone to flag a session."""
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp1",
        )
        result = await mock_session_service.detect_suspicious_session(
            session_id=session_id,
            current_ip="192.168.1.1",
            current_user_agent="Chrome/100",
        )
        assert result["is_suspicious"] is False
        assert result["risk_score"] == 20
        assert any("User-Agent" in reason for reason in result["reasons"])

    @pytest.mark.asyncio
    async def test_combined_context_change_is_suspicious(self, mock_session_service):
        """Multiple independent risk signals must cross the alert threshold."""
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp1",
        )
        result = await mock_session_service.detect_suspicious_session(
            session_id=session_id,
            current_ip="10.0.0.1",
            current_user_agent="Chrome/100",
        )
        assert result["is_suspicious"] is True
        assert result["risk_score"] == 50

    @pytest.mark.asyncio
    async def test_no_suspicious_activity_same_context(self, mock_session_service):
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp1",
        )
        result = await mock_session_service.detect_suspicious_session(
            session_id=session_id,
            current_ip="192.168.1.1",
            current_user_agent="Mozilla/5.0",
        )
        assert result["is_suspicious"] is False
        assert result["risk_score"] == 0

    @pytest.mark.asyncio
    async def test_trusted_device_management(self, mock_session_service):
        user_id = str(uuid.uuid4())
        await mock_session_service.add_trusted_device(
            user_id=user_id,
            device_fingerprint="fp-trusted-1",
        )
        assert await mock_session_service.get_trusted_devices(user_id)
        assert await mock_session_service.remove_trusted_device(
            user_id=user_id,
            device_id="fp-trusted-1",
        ) is True

    @pytest.mark.asyncio
    async def test_security_events(self, mock_session_service):
        assert isinstance(
            await mock_session_service.get_security_events(str(uuid.uuid4())),
            list,
        )

    @pytest.mark.asyncio
    async def test_mfa_verified_flag(self, mock_session_service):
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp1",
        )
        await mock_session_service.mark_session_mfa_verified(session_id)
        session = await mock_session_service.validate_session(session_id)
        assert session["mfa_verified"] == "1"
