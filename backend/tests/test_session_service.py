"""
Tests du service de sessions - eAdministration Suite Guinea.
Vérifie la gestion des sessions, la détection d'activité suspecte et les appareils de confiance.
"""

import uuid
import pytest
from unittest.mock import AsyncMock, patch


class TestSessionService:
    """Test suite for the session management service."""

    @pytest.mark.asyncio
    async def test_create_session(self, mock_session_service):
        """Should create a new session and return session_id."""
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp-abc123",
        )
        assert session_id is not None
        assert session_id.startswith("sess-mock-")

    @pytest.mark.asyncio
    async def test_validate_session(self, mock_session_service):
        """Should validate and return session data."""
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
        """Should return None for invalid session_id."""
        session = await mock_session_service.validate_session("nonexistent-session")
        assert session is None

    @pytest.mark.asyncio
    async def test_destroy_session(self, mock_session_service):
        """Should destroy a specific session."""
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp-abc123",
        )
        
        await mock_session_service.destroy_session(session_id)
        session = await mock_session_service.validate_session(session_id)
        assert session is None

    @pytest.mark.asyncio
    async def test_destroy_all_sessions(self, mock_session_service):
        """Should destroy all sessions for a user."""
        user_id = str(uuid.uuid4())
        
        # Create multiple sessions
        sid1 = await mock_session_service.create_session(
            user_id=user_id, ip_address="192.168.1.1",
            user_agent="Mozilla/5.0", device_fingerprint="fp1",
        )
        sid2 = await mock_session_service.create_session(
            user_id=user_id, ip_address="192.168.1.2",
            user_agent="Chrome/100", device_fingerprint="fp2",
        )
        
        count = await mock_session_service.destroy_all_sessions(user_id)
        assert count == 2
        
        # Both sessions should be invalid
        assert await mock_session_service.validate_session(sid1) is None
        assert await mock_session_service.validate_session(sid2) is None

    @pytest.mark.asyncio
    async def test_get_user_sessions(self, mock_session_service):
        """Should list all active sessions for a user."""
        user_id = str(uuid.uuid4())
        
        await mock_session_service.create_session(
            user_id=user_id, ip_address="192.168.1.1",
            user_agent="Mozilla/5.0", device_fingerprint="fp1",
        )
        await mock_session_service.create_session(
            user_id=user_id, ip_address="192.168.1.2",
            user_agent="Chrome/100", device_fingerprint="fp2",
        )
        
        sessions = await mock_session_service.get_user_sessions(user_id)
        assert len(sessions) == 2

    @pytest.mark.asyncio
    async def test_detect_suspicious_ip_change(self, mock_session_service):
        """Should detect IP address change as suspicious."""
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id, ip_address="192.168.1.1",
            user_agent="Mozilla/5.0", device_fingerprint="fp1",
        )
        
        result = await mock_session_service.detect_suspicious_session(
            session_id=session_id,
            current_ip="10.0.0.1",  # Different IP
            current_user_agent="Mozilla/5.0",  # Same UA
        )
        
        assert result["is_suspicious"] is True
        assert any("IP" in r for r in result["reasons"])

    @pytest.mark.asyncio
    async def test_detect_suspicious_user_agent_change(self, mock_session_service):
        """Should detect user agent change as suspicious."""
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id, ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            device_fingerprint="fp1",
        )
        
        result = await mock_session_service.detect_suspicious_session(
            session_id=session_id,
            current_ip="192.168.1.1",  # Same IP
            current_user_agent="Chrome/100",  # Different UA
        )
        
        assert result["is_suspicious"] is True
        assert any("User-Agent" in r or "UA" in r for r in result["reasons"])

    @pytest.mark.asyncio
    async def test_no_suspicious_activity_same_context(self, mock_session_service):
        """Should not flag activity when IP and UA match."""
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id, ip_address="192.168.1.1",
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
        """Should manage trusted devices."""
        user_id = str(uuid.uuid4())
        
        # Add trusted device
        await mock_session_service.add_trusted_device(
            user_id=user_id,
            device_fingerprint="fp-trusted-1",
        )
        
        devices = await mock_session_service.get_trusted_devices(user_id)
        assert len(devices) >= 1
        
        # Remove trusted device
        removed = await mock_session_service.remove_trusted_device(
            user_id=user_id,
            device_id="fp-trusted-1",
        )
        assert removed is True

    @pytest.mark.asyncio
    async def test_security_events(self, mock_session_service):
        """Should record and retrieve security events."""
        user_id = str(uuid.uuid4())
        events = await mock_session_service.get_security_events(user_id)
        assert isinstance(events, list)

    @pytest.mark.asyncio
    async def test_mfa_verified_flag(self, mock_session_service):
        """Should mark session as MFA verified."""
        user_id = str(uuid.uuid4())
        session_id = await mock_session_service.create_session(
            user_id=user_id, ip_address="192.168.1.1",
            user_agent="Mozilla/5.0", device_fingerprint="fp1",
        )
        
        await mock_session_service.mark_session_mfa_verified(session_id)
        session = await mock_session_service.validate_session(session_id)
        assert session["mfa_verified"] == "1"
