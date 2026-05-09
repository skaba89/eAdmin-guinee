"""
Application FastAPI principale - eAdministration Suite Guinea.
Point d'entrée de l'API backend.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, audit, auth, courriers, documents, users, workflows
from app.config import settings


@asynccontextmanager
async def lifespan(application: FastAPI):
    """
    Cycle de vie de l'application.
    Initialisation et nettoyage des ressources.
    """
    # Démarrage
    application.state.settings = settings
    yield
    # Arrêt — fermeture du pool de connexions
    from app.database import engine

    await engine.dispose()


app = FastAPI(
    title="eAdministration Suite Guinea - API",
    description="Plateforme GovTech de nouvelle génération",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- Middleware CORS ---
# En développement, on autorise toutes les origines
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.is_development else [
        "https://eadmin.gouv.gn",
        "https://admin.eadmin.gouv.gn",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    """
    return {
        "status": "healthy",
        "service": "eAdministration Suite Guinea - API",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }
