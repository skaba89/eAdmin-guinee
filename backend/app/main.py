"""
Application FastAPI principale - eAdministration Suite Guinea.
Point d'entrée de l'API backend.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, audit, auth, courriers, documents, users, workflows
from app.config import settings

logger = logging.getLogger(__name__)

# Origines autorisées par environnement
DEVELOPMENT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

PRODUCTION_ORIGINS = [
    "https://eadmin.gouv.gn",
    "https://admin.eadmin.gouv.gn",
    "https://citoyen.eadmin.gouv.gn",
]


@asynccontextmanager
async def lifespan(application: FastAPI):
    """
    Cycle de vie de l'application.
    Initialisation et nettoyage des ressources.
    """
    # Démarrage
    application.state.settings = settings
    logger.info(f"Démarrage de {settings.APP_NAME} v{settings.APP_VERSION} ({settings.ENVIRONMENT})")

    # Vérification de la clé secrète en production
    if settings.is_production and settings.SECRET_KEY == "dev-secret-key-change-in-production":
        logger.critical("SECRET_KEY par défaut détectée en production ! Changez-la immédiatement.")

    # Vérifier la connexion Redis (optionnel — ne pas bloquer le démarrage)
    try:
        from app.services.token_blacklist import token_blacklist
        redis = await token_blacklist._get_redis()
        await redis.ping()
        logger.info("Connexion Redis établie avec succès")
    except Exception as e:
        logger.warning(f"Redis indisponible — la blacklist JWT fonctionne en mode dégradé: {e}")

    yield

    # Arrêt — fermeture des ressources
    from app.database import engine
    await engine.dispose()

    from app.services.token_blacklist import token_blacklist
    await token_blacklist.close()

    logger.info("Arrêt propre de l'application")


app = FastAPI(
    title="eAdministration Suite Guinea - API",
    description="Plateforme GovTech de nouvelle génération pour l'administration guinéenne",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# --- Middleware de Rate Limiting ---
from app.middleware.rate_limit import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware)

# --- Middleware CORS ---
# CORS sécurisé : origines explicites uniquement, jamais "*" avec credentials
allowed_origins = (
    DEVELOPMENT_ORIGINS + PRODUCTION_ORIGINS
    if settings.is_development
    else PRODUCTION_ORIGINS
)

# En développement, on peut aussi autoriser les origines supplémentaires via env
if settings.is_development and hasattr(settings, "EXTRA_CORS_ORIGINS"):
    import json
    try:
        extra = json.loads(settings.EXTRA_CORS_ORIGINS)
        allowed_origins.extend(extra)
    except Exception:
        pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

# --- Inclusion des routeurs API ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentification"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(courriers.router, prefix="/api/v1/courriers", tags=["Courriers"])
app.include_router(workflows.router, prefix="/api/v1/workflows", tags=["Workflows"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Utilisateurs"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytique"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["Audit"])


# --- Endpoint de santé ---
@app.get("/health", tags=["Santé"])
async def health_check():
    """
    Vérifie l'état de santé de l'API.
    Utilisé par les monitors et les load balancers.
    Inclut la vérification des services dépendants.
    """
    services_status = {}

    # Vérifier PostgreSQL
    try:
        from app.database import engine
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        services_status["postgresql"] = "healthy"
    except Exception as e:
        services_status["postgresql"] = f"unhealthy: {str(e)[:100]}"

    # Vérifier Redis
    try:
        from app.services.token_blacklist import token_blacklist
        redis = await token_blacklist._get_redis()
        await redis.ping()
        services_status["redis"] = "healthy"
    except Exception as e:
        services_status["redis"] = f"unhealthy: {str(e)[:100]}"

    overall_healthy = all(v == "healthy" for v in services_status.values())

    return {
        "status": "healthy" if overall_healthy else "degraded",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "services": services_status,
    }
