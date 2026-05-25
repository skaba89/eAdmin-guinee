"""
Configuration de l'application eAdministration Suite Guinea.
Utilise pydantic-settings pour la gestion des variables d'environnement.
"""

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Paramètres de configuration de l'application."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- Environnement ---
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # --- Base de données ---
    DATABASE_URL: str = "postgresql://eadmin:eadmin@localhost:5432/eadmin"

    # --- Sécurité / JWT ---
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- MFA ---
    MFA_ISSUER: str = "eAdmin Guinée"

    # --- Rate Limiting ---
    RATE_LIMIT_MAX_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_LOGIN_MAX_ATTEMPTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 300  # 5 minutes
    RATE_LIMIT_API_PER_MINUTE: int = 60

    # --- CORS ---
    EXTRA_CORS_ORIGINS: str = "[]"  # JSON array of additional allowed origins

    # --- Stockage objet (MinIO / S3) ---
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "eadmin-documents"
    MINIO_SECURE: bool = False

    # --- Cache (Redis) ---
    REDIS_URL: str = "redis://localhost:6379"

    # --- Application ---
    APP_NAME: str = "eAdministration Suite Guinea"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # --- CORS Origins ---
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

    @property
    def is_development(self) -> bool:
        """Vérifie si l'application est en mode développement."""
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        """Vérifie si l'application est en mode production."""
        return self.ENVIRONMENT == "production"

    @property
    def is_staging(self) -> bool:
        """Vérifie si l'application est en mode staging."""
        return self.ENVIRONMENT == "staging"


# Instance singleton de la configuration
settings = Settings()
