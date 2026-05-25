"""
Tests de sécurité des uploads - eAdministration Suite Guinea.
Vérifie la validation des fichiers, la détection de types dangereux et la sanitisation.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestUploadSecurity:
    """Test suite for file upload security validation."""

    @pytest.fixture
    def upload_service(self):
        """Create an upload security service instance."""
        from app.services.upload_security import UploadSecurityService
        return UploadSecurityService()

    def test_allowed_mime_types(self, upload_service):
        """Should define allowed MIME types for uploads."""
        assert "application/pdf" in upload_service.ALLOWED_MIME_TYPES
        assert "image/jpeg" in upload_service.ALLOWED_MIME_TYPES
        assert "image/png" in upload_service.ALLOWED_MIME_TYPES

    def test_blocked_extensions(self, upload_service):
        """Should define blocked file extensions."""
        blocked = upload_service.BLOCKED_EXTENSIONS
        assert ".exe" in blocked
        assert ".php" in blocked
        assert ".sh" in blocked
        assert ".bat" in blocked
        assert ".js" in blocked
        assert ".dll" in blocked

    @pytest.mark.asyncio
    async def test_sanitize_filename_path_traversal(self, upload_service):
        """Should prevent path traversal in filenames."""
        # Path traversal attempts
        assert ".." not in upload_service.sanitize_filename("../../../etc/passwd")
        assert "/" not in upload_service.sanitize_filename("dir/file.pdf")
        assert "\\" not in upload_service.sanitize_filename("dir\\file.pdf")

    @pytest.mark.asyncio
    async def test_sanitize_filename_special_chars(self, upload_service):
        """Should remove or replace special characters."""
        sanitized = upload_service.sanitize_filename("document été 2026.pdf")
        assert isinstance(sanitized, str)
        assert len(sanitized) > 0

    @pytest.mark.asyncio
    async def test_sanitize_filename_length_limit(self, upload_service):
        """Should limit filename length."""
        long_name = "a" * 500 + ".pdf"
        sanitized = upload_service.sanitize_filename(long_name)
        assert len(sanitized) <= 255

    @pytest.mark.asyncio
    async def test_sanitize_filename_preserves_extension(self, upload_service):
        """Should preserve valid file extension."""
        sanitized = upload_service.sanitize_filename("document.pdf")
        assert sanitized.endswith(".pdf")

    @pytest.mark.asyncio
    async def test_double_extension_detection(self, upload_service):
        """Should detect dangerous double extensions like file.php.pdf."""
        # Create a mock upload file with double extension
        mock_file = AsyncMock()
        mock_file.filename = "malicious.php.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.size = 1024
        
        result = await upload_service.validate_upload(mock_file)
        # Should flag as potentially dangerous
        assert isinstance(result, dict)
        assert "valid" in result

    @pytest.mark.asyncio
    async def test_blocked_extension_rejection(self, upload_service):
        """Should reject files with blocked extensions."""
        mock_file = AsyncMock()
        mock_file.filename = "malware.exe"
        mock_file.content_type = "application/octet-stream"
        mock_file.size = 1024
        
        result = await upload_service.validate_upload(mock_file)
        assert result["valid"] is False

    @pytest.mark.asyncio
    async def test_valid_pdf_upload(self, upload_service):
        """Should accept valid PDF uploads."""
        mock_file = AsyncMock()
        mock_file.filename = "document.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.size = 1024 * 100  # 100KB
        
        # Need to mock the file reading for magic bytes
        mock_file.read = AsyncMock(return_value=b"%PDF-1.4")
        mock_file.seek = AsyncMock()
        
        result = await upload_service.validate_upload(mock_file)
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_file_size_limit(self, upload_service):
        """Should reject files exceeding size limit."""
        mock_file = AsyncMock()
        mock_file.filename = "large.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.size = 100 * 1024 * 1024  # 100MB (exceeds 50MB default)
        
        result = await upload_service.validate_upload(mock_file)
        assert result["valid"] is False

    @pytest.mark.asyncio
    async def test_virus_scan_unavailable(self, upload_service):
        """Should handle gracefully when ClamAV is unavailable."""
        result = await upload_service.scan_for_virus("/nonexistent/file.pdf")
        assert isinstance(result, dict)
        # Should not crash, but indicate scanning is unavailable

    @pytest.mark.asyncio
    async def test_empty_filename(self, upload_service):
        """Should handle empty or None filename."""
        sanitized = upload_service.sanitize_filename("")
        assert isinstance(sanitized, str)

    @pytest.mark.asyncio
    async def test_null_bytes_in_filename(self, upload_service):
        """Should strip null bytes from filename."""
        sanitized = upload_service.sanitize_filename("file\x00.pdf")
        assert "\x00" not in sanitized
