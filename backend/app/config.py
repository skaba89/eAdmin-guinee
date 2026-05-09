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
    ENVIRONMENT: Literal["development", "production"] = "development"

    # --- Base de données ---
    DATABASE_URL: str = "postgresql://eadmin:eadmin@localhost:5432/eadmin"

    # --- Sécurité / JWT ---
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

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

    @property
    def is_development(self) -> bool:
        """Vérifie si l'application est en mode développement."""
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        """Vérifie si l'application est en mode production."""
        return self.ENVIRONMENT == "production"


# Instance singleton de la configuration
settings = Settings()
