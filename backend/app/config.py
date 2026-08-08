"""
Configuration de l'application eAdministration Suite Guinea.
Utilise pydantic-settings pour la gestion des variables d'environnement.

SECURITY: No default secrets in source code.
All secrets MUST be provided via environment variables or .env file.
In production, missing secrets will cause a startup failure.
"""

import secrets as _secrets
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_UNCONFIGURED = "__UNCONFIGURED__"


class Settings(BaseSettings):
    """Paramètres de configuration de l'application."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    ENVIRONMENT: Literal["development", "test", "staging", "production"] = "development"

    DATABASE_URL: str = _UNCONFIGURED

    SECRET_KEY: str = _UNCONFIGURED
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ENCRYPTION_KEY: str = _UNCONFIGURED

    MFA_ISSUER: str = "eAdmin Guinée"

    RATE_LIMIT_MAX_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_LOGIN_MAX_ATTEMPTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 300
    RATE_LIMIT_API_PER_MINUTE: int = 60
    RATE_LIMIT_REGISTER_MAX_ATTEMPTS: int = 3
    RATE_LIMIT_REGISTER_WINDOW_SECONDS: int = 3600
    RATE_LIMIT_PASSWORD_CHANGE_MAX: int = 5
    RATE_LIMIT_PASSWORD_CHANGE_WINDOW: int = 900
    RATE_LIMIT_MFA_MAX: int = 5
    RATE_LIMIT_MFA_WINDOW: int = 300
    RATE_LIMIT_AI_PER_MINUTE: int = 20
    RATE_LIMIT_UPLOAD_PER_MINUTE: int = 10

    EXTRA_CORS_ORIGINS: str = "[]"

    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = _UNCONFIGURED
    MINIO_SECRET_KEY: str = _UNCONFIGURED
    MINIO_BUCKET_NAME: str = "eadmin-documents"
    MINIO_SECURE: bool = False

    REDIS_URL: str = _UNCONFIGURED

    APP_NAME: str = "eAdministration Suite Guinea"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    SESSION_MAX_CONCURRENT: int = 3
    SESSION_TIMEOUT_HOURS: int = 8
    SESSION_INACTIVITY_TIMEOUT_MINUTES: int = 30

    UPLOAD_MAX_SIZE_MB: int = 50
    UPLOAD_ALLOWED_TYPES: str = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
    UPLOAD_ANTIVIRUS_ENABLED: bool = False
    UPLOAD_QUARANTINE_PATH: str = "/tmp/eadmin-quarantine"

    TENANT_DEFAULT_ID: str = "republique-de-guinee"
    TENANT_ISOLATION_MODE: Literal["strict", "shared"] = "strict"

    SENTRY_DSN: str = ""
    OTLP_ENDPOINT: str = "http://localhost:4317"

    CORS_ORIGINS_DEV: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    CORS_ORIGINS_PROD: list[str] = [
        "https://eadmin.gouv.gn",
        "https://admin.eadmin.gouv.gn",
        "https://citoyen.eadmin.gouv.gn",
        "https://api.eadmin.gouv.gn",
    ]

    @model_validator(mode="after")
    def validate_secrets(self):
        """Valide les secrets selon le niveau de criticité de l'environnement."""
        critical_secrets = {
            "SECRET_KEY": self.SECRET_KEY,
            "DATABASE_URL": self.DATABASE_URL,
            "REDIS_URL": self.REDIS_URL,
            "MINIO_ACCESS_KEY": self.MINIO_ACCESS_KEY,
            "MINIO_SECRET_KEY": self.MINIO_SECRET_KEY,
            "ENCRYPTION_KEY": self.ENCRYPTION_KEY,
        }

        if self.is_production:
            for name, value in critical_secrets.items():
                if value == _UNCONFIGURED or not value:
                    raise ValueError(
                        f"CRITICAL: {name} must be set in production! "
                        f"Set the {name} environment variable."
                    )

            weak_secrets = {
                "SECRET_KEY": ["dev-secret-key-change-in-production", "secret", "changeme", "test"],
                "MINIO_SECRET_KEY": ["minioadmin", "changeme"],
                "MINIO_ACCESS_KEY": ["minioadmin"],
            }
            for name, weak_values in weak_secrets.items():
                if getattr(self, name) in weak_values:
                    raise ValueError(
                        f"CRITICAL: {name} uses a weak/default value in production! "
                        "Generate a strong random value before deployment."
                    )

        elif self.is_development:
            if self.SECRET_KEY == _UNCONFIGURED:
                self.SECRET_KEY = f"dev-only-{_secrets.token_urlsafe(32)}"
            if self.DATABASE_URL == _UNCONFIGURED:
                self.DATABASE_URL = "postgresql+asyncpg://eadmin:eadmin_dev@localhost:5432/eadmin"
            if self.REDIS_URL == _UNCONFIGURED:
                self.REDIS_URL = "redis://localhost:6379"
            if self.MINIO_ACCESS_KEY == _UNCONFIGURED:
                self.MINIO_ACCESS_KEY = "minioadmin"
            if self.MINIO_SECRET_KEY == _UNCONFIGURED:
                self.MINIO_SECRET_KEY = "minioadmin"
            if self.ENCRYPTION_KEY == _UNCONFIGURED:
                self.ENCRYPTION_KEY = f"dev-only-{_secrets.token_urlsafe(32)}"

        elif self.is_test:
            # CI provides explicit deterministic test values. Fail early when the
            # test job is misconfigured instead of silently generating secrets.
            missing = [
                name for name, value in critical_secrets.items()
                if value == _UNCONFIGURED or not value
            ]
            if missing:
                raise ValueError(
                    "Test environment is missing required settings: " + ", ".join(missing)
                )

        elif self.is_staging:
            import warnings

            for name, value in critical_secrets.items():
                if value == _UNCONFIGURED:
                    warnings.warn(
                        f"WARNING: {name} is not configured in staging! "
                        f"Set the {name} environment variable before production.",
                        stacklevel=2,
                    )

        return self

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_test(self) -> bool:
        return self.ENVIRONMENT == "test"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_staging(self) -> bool:
        return self.ENVIRONMENT == "staging"


settings = Settings()
