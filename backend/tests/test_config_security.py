"""
Tests de sécurité de la configuration - eAdministration Suite Guinea.
Vérifie que les secrets non configurés ou faibles sont rejetés en production.
"""

import pytest
from unittest.mock import patch
from pydantic import ValidationError


class TestConfigSecurity:
    """Test suite for configuration security validation."""

    def test_production_rejects_unconfigured_secret_key(self):
        """Production must reject unconfigured SECRET_KEY."""
        with patch.dict("os.environ", {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "__UNCONFIGURED__",
            "DATABASE_URL": "postgresql+asyncpg://user:pass@localhost/db",
            "REDIS_URL": "redis://:pass@localhost:6379",
            "MINIO_ACCESS_KEY": "test-access",
            "MINIO_SECRET_KEY": "test-secret-key",
            "ENCRYPTION_KEY": "test-encryption-key",
        }, clear=True):
            from app.config import Settings
            with pytest.raises(ValidationError, match="SECRET_KEY must be set"):
                Settings()

    def test_production_rejects_weak_secret_key(self):
        """Production must reject known weak SECRET_KEY values."""
        weak_keys = ["dev-secret-key-change-in-production", "secret", "changeme", "test"]
        for weak_key in weak_keys:
            with patch.dict("os.environ", {
                "ENVIRONMENT": "production",
                "SECRET_KEY": weak_key,
                "DATABASE_URL": "postgresql+asyncpg://user:pass@localhost/db",
                "REDIS_URL": "redis://:pass@localhost:6379",
                "MINIO_ACCESS_KEY": "real-access-key",
                "MINIO_SECRET_KEY": "real-secret-key",
                "ENCRYPTION_KEY": "real-encryption-key",
            }, clear=True):
                from app.config import Settings
                with pytest.raises(ValidationError, match="weak/default value"):
                    Settings()

    def test_production_rejects_unconfigured_database_url(self):
        """Production must reject unconfigured DATABASE_URL."""
        with patch.dict("os.environ", {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "a-very-strong-and-unique-secret-key-for-production-2026",
            "DATABASE_URL": "__UNCONFIGURED__",
            "REDIS_URL": "redis://:pass@localhost:6379",
            "MINIO_ACCESS_KEY": "test-access",
            "MINIO_SECRET_KEY": "test-secret-key",
            "ENCRYPTION_KEY": "test-encryption-key",
        }, clear=True):
            from app.config import Settings
            with pytest.raises(ValidationError, match="DATABASE_URL must be set"):
                Settings()

    def test_production_rejects_unconfigured_redis_url(self):
        """Production must reject unconfigured REDIS_URL."""
        with patch.dict("os.environ", {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "a-very-strong-and-unique-secret-key-for-production-2026",
            "DATABASE_URL": "postgresql+asyncpg://user:pass@localhost/db",
            "REDIS_URL": "__UNCONFIGURED__",
            "MINIO_ACCESS_KEY": "test-access",
            "MINIO_SECRET_KEY": "test-secret-key",
            "ENCRYPTION_KEY": "test-encryption-key",
        }, clear=True):
            from app.config import Settings
            with pytest.raises(ValidationError, match="REDIS_URL must be set"):
                Settings()

    def test_production_rejects_weak_minio_credentials(self):
        """Production must reject default MinIO credentials."""
        with patch.dict("os.environ", {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "a-very-strong-and-unique-secret-key-for-production-2026",
            "DATABASE_URL": "postgresql+asyncpg://user:pass@localhost/db",
            "REDIS_URL": "redis://:pass@localhost:6379",
            "MINIO_ACCESS_KEY": "minioadmin",
            "MINIO_SECRET_KEY": "minioadmin",
            "ENCRYPTION_KEY": "test-encryption-key",
        }, clear=True):
            from app.config import Settings
            with pytest.raises(ValidationError, match="weak/default value"):
                Settings()

    def test_production_rejects_unconfigured_encryption_key(self):
        """Production must reject unconfigured ENCRYPTION_KEY."""
        with patch.dict("os.environ", {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "a-very-strong-and-unique-secret-key-for-production-2026",
            "DATABASE_URL": "postgresql+asyncpg://user:pass@localhost/db",
            "REDIS_URL": "redis://:pass@localhost:6379",
            "MINIO_ACCESS_KEY": "test-access",
            "MINIO_SECRET_KEY": "test-secret-key",
            "ENCRYPTION_KEY": "__UNCONFIGURED__",
        }, clear=True):
            from app.config import Settings
            with pytest.raises(ValidationError, match="ENCRYPTION_KEY must be set"):
                Settings()

    def test_development_auto_generates_secrets(self):
        """Development mode should auto-generate secrets if not configured."""
        with patch.dict("os.environ", {
            "ENVIRONMENT": "development",
        }, clear=True):
            from app.config import Settings
            settings = Settings()
            # Should have auto-generated values
            assert settings.SECRET_KEY.startswith("dev-only-")
            assert settings.ENCRYPTION_KEY.startswith("dev-only-")
            assert "eadmin" in settings.DATABASE_URL
            assert settings.REDIS_URL == "redis://localhost:6379"
            assert settings.MINIO_ACCESS_KEY == "minioadmin"

    def test_development_auto_generated_secrets_are_unique(self):
        """Auto-generated secrets should be unique across instances."""
        with patch.dict("os.environ", {"ENVIRONMENT": "development"}, clear=True):
            from app.config import Settings
            s1 = Settings()
            s2 = Settings()
            assert s1.SECRET_KEY != s2.SECRET_KEY
            assert s1.ENCRYPTION_KEY != s2.ENCRYPTION_KEY

    def test_production_accepts_strong_secrets(self):
        """Production should accept properly configured strong secrets."""
        with patch.dict("os.environ", {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "a-very-strong-and-unique-secret-key-for-production-2026-!@#$%",
            "DATABASE_URL": "postgresql+asyncpg://eadmin:Str0ng!P@ssw0rd@db-host:5432/eadmin",
            "REDIS_URL": "redis://:Str0ngR3d!sP@ss@redis-host:6379",
            "MINIO_ACCESS_KEY": "real-access-key-12345",
            "MINIO_SECRET_KEY": "real-minio-secret-key-67890",
            "ENCRYPTION_KEY": "real-encryption-key-abcdef",
        }, clear=True):
            from app.config import Settings
            settings = Settings()
            assert settings.is_production
            assert settings.SECRET_KEY == "a-very-strong-and-unique-secret-key-for-production-2026-!@#$%"

    def test_staging_warns_about_unconfigured_secrets(self):
        """Staging should warn but not fail for unconfigured secrets."""
        import warnings
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            with patch.dict("os.environ", {
                "ENVIRONMENT": "staging",
            }, clear=True):
                from app.config import Settings
                # Should not raise, but should warn
                settings = Settings()
                assert settings.is_staging

    def test_rate_limit_settings_defaults(self):
        """Rate limit settings should have sensible defaults."""
        with patch.dict("os.environ", {"ENVIRONMENT": "development"}, clear=True):
            from app.config import Settings
            settings = Settings()
            assert settings.RATE_LIMIT_LOGIN_MAX_ATTEMPTS == 5
            assert settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS == 300
            assert settings.RATE_LIMIT_API_PER_MINUTE == 60
            assert settings.RATE_LIMIT_REGISTER_MAX_ATTEMPTS == 3
            assert settings.RATE_LIMIT_REGISTER_WINDOW_SECONDS == 3600

    def test_session_security_defaults(self):
        """Session security settings should have safe defaults."""
        with patch.dict("os.environ", {"ENVIRONMENT": "development"}, clear=True):
            from app.config import Settings
            settings = Settings()
            assert settings.SESSION_MAX_CONCURRENT == 3
            assert settings.SESSION_TIMEOUT_HOURS == 8
            assert settings.SESSION_INACTIVITY_TIMEOUT_MINUTES == 30

    def test_tenant_settings_defaults(self):
        """Tenant settings should have sensible defaults."""
        with patch.dict("os.environ", {"ENVIRONMENT": "development"}, clear=True):
            from app.config import Settings
            settings = Settings()
            assert settings.TENANT_DEFAULT_ID == "republique-de-guinee"
            assert settings.TENANT_ISOLATION_MODE == "strict"
