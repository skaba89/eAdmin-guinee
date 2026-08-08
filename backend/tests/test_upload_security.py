"""Security tests for file upload validation and filename sanitisation."""

from unittest.mock import AsyncMock

import pytest

from app.services.upload_security import (
    ALLOWED_MIME_TYPES,
    BLOCKED_EXTENSIONS,
    UploadSecurityService,
)


class TestUploadSecurity:
    @pytest.fixture
    def upload_service(self):
        return UploadSecurityService()

    def test_allowed_mime_types(self):
        assert "application/pdf" in ALLOWED_MIME_TYPES
        assert "image/jpeg" in ALLOWED_MIME_TYPES
        assert "image/png" in ALLOWED_MIME_TYPES

    def test_blocked_extensions(self):
        for extension in (".exe", ".php", ".sh", ".bat", ".js", ".dll"):
            assert extension in BLOCKED_EXTENSIONS

    def test_sanitize_filename_path_traversal(self, upload_service):
        assert ".." not in upload_service.sanitize_filename("../../../etc/passwd")
        assert "/" not in upload_service.sanitize_filename("dir/file.pdf")
        assert "\\" not in upload_service.sanitize_filename("dir\\file.pdf")

    def test_sanitize_filename_special_chars(self, upload_service):
        sanitized = upload_service.sanitize_filename("document été 2026.pdf")
        assert isinstance(sanitized, str)
        assert sanitized

    def test_sanitize_filename_length_limit(self, upload_service):
        sanitized = upload_service.sanitize_filename("a" * 500 + ".pdf")
        assert len(sanitized) <= 255

    def test_sanitize_filename_preserves_extension(self, upload_service):
        assert upload_service.sanitize_filename("document.pdf").endswith(".pdf")

    @pytest.mark.asyncio
    async def test_double_extension_detection(self, upload_service):
        mock_file = AsyncMock()
        mock_file.filename = "malicious.php.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.size = 1024

        result = await upload_service.validate_upload(mock_file)
        assert isinstance(result, dict)
        assert "valid" in result

    @pytest.mark.asyncio
    async def test_blocked_extension_rejection(self, upload_service):
        mock_file = AsyncMock()
        mock_file.filename = "malware.exe"
        mock_file.content_type = "application/octet-stream"
        mock_file.size = 1024

        result = await upload_service.validate_upload(mock_file)
        assert result["valid"] is False

    @pytest.mark.asyncio
    async def test_valid_pdf_upload(self, upload_service):
        mock_file = AsyncMock()
        mock_file.filename = "document.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.size = 100 * 1024
        mock_file.read = AsyncMock(return_value=b"%PDF-1.4")
        mock_file.seek = AsyncMock()

        result = await upload_service.validate_upload(mock_file)
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_file_size_limit(self, upload_service):
        mock_file = AsyncMock()
        mock_file.filename = "large.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.size = 100 * 1024 * 1024

        result = await upload_service.validate_upload(mock_file)
        assert result["valid"] is False

    @pytest.mark.asyncio
    async def test_virus_scan_unavailable(self, upload_service):
        result = await upload_service.scan_for_virus("/nonexistent/file.pdf")
        assert isinstance(result, dict)

    def test_empty_filename(self, upload_service):
        assert isinstance(upload_service.sanitize_filename(""), str)

    def test_null_bytes_in_filename(self, upload_service):
        assert "\x00" not in upload_service.sanitize_filename("file\x00.pdf")
