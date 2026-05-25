"""
Application FastAPI principale - eAdministration Suite Guinea.
Point d'entrée de l'API backend.
"""

import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import ai, analytics, audit, auth, courriers, documents, documents_search, metrics, security, security_events, users, workflows
from app.config import settings
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.audit import AuditMiddleware
from app.middleware.tenant import TenantResolutionMiddleware

logger = logging.getLogger("eadmin")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter(
    '{"time":"%(asctime)s","level":"%(levelname)s","module":"%(name)s","message":"%(message)s"}'
))
logger.addHandler(handler)

# --- In-memory metrics counters ---
request_counter = 0
error_counter = 0
total_response_time_ms = 0.0
active_sessions_count = 1
APP_START_TIME = time.time()


# --- Request Logging Middleware ---
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Journalise toutes les requêtes API pour l'audit et incrémente les compteurs de métriques."""

    async def dispatch(self, request: Request, call_next):
        global request_counter, error_counter, total_response_time_ms

        start_time = time.time()

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = round((time.time() - start_time) * 1000)

        # Increment request counter
        request_counter += 1
        total_response_time_ms += duration_ms

        # Increment error counter for 4xx/5xx
        if response.status_code >= 400:
            error_counter += 1

        # Log structured request info
        logger.info(
            f"method={request.method} path={request.url.path} "
            f"status={response.status_code} duration={duration_ms}ms "
            f"ip={request.client.host if request.client else 'unknown'}"
        )

        # Add server timing header
        response.headers["X-Response-Time"] = f"{duration_ms}ms"

        return response


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Cycle de vie de l'application."""
    logger.info("Starting eAdministration Suite Guinea API...")
    application.state.settings = settings
    logger.info(f"Démarrage de {settings.APP_NAME} v{settings.APP_VERSION} ({settings.ENVIRONMENT})")

    # Vérification de la clé secrète en production
    if settings.is_production and settings.SECRET_KEY == "dev-secret-key-change-in-production":
        logger.critical("SECRET_KEY par défaut détectée en production ! Changez-la immédiatement.")

    # Initialiser OpenTelemetry (dégénération gracieuse si non disponible)
    try:
        from app.services.telemetry import telemetry_service
        telemetry_service.setup(otlp_endpoint="http://localhost:4317")
    except Exception as e:
        logger.warning(f"OpenTelemetry non initialisé: {e}")

    # Initialiser Sentry (dégénération gracieuse si non configuré)
    try:
        from app.services.sentry_service import sentry_service
        sentry_dsn = getattr(settings, 'SENTRY_DSN', '') or ''
        if sentry_dsn:
            sentry_service.init(
                dsn=sentry_dsn,
                environment=settings.ENVIRONMENT,
                release=settings.APP_VERSION,
            )
    except Exception as e:
        logger.warning(f"Sentry non initialisé: {e}")

    # Vérifier la connexion Redis (optionnel — ne pas bloquer le démarrage)
    try:
        from app.services.token_blacklist import token_blacklist
        redis = await token_blacklist._get_redis()
        await redis.ping()
        logger.info("Connexion Redis établie avec succès")
    except Exception as e:
        logger.warning(f"Redis indisponible — la blacklist JWT fonctionne en mode dégradé: {e}")

    yield
    logger.info("Shutting down eAdministration Suite Guinea API...")

    from app.database import engine
    await engine.dispose()

    from app.services.token_blacklist import token_blacklist
    await token_blacklist.close()

    from app.services.session_service import session_service
    await session_service.close()

    # Nettoyer Sentry
    try:
        from app.services.sentry_service import sentry_service
        sentry_service.clear_user_context()
    except Exception:
        pass

    logger.info("Arrêt propre de l'application")


app = FastAPI(
    title="eAdministration Suite Guinea - API",
    description="Plateforme GovTech de nouvelle génération pour la République de Guinée",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# --- Middlewares (ordre important : outermost → innermost) ---
# L'ordre d'ajout est INVERSE : le dernier ajouté est le premier exécuté.
# On veut : CORS → Tenant Resolution → Security Headers → Rate Limiting → Audit → Request Logging
# Donc on ajoute dans l'ordre inverse :

# 6. Request Logging (innermost — le plus proche de l'app)
app.add_middleware(RequestLoggingMiddleware)

# 5. Audit — journalisation automatique des accès API
app.add_middleware(AuditMiddleware)

# 4. Rate Limiting — protection brute-force et abus d'API
app.add_middleware(RateLimitMiddleware)

# 3. Security Headers — en-têtes de sécurité HTTP
app.add_middleware(SecurityHeadersMiddleware)

# 2. Tenant Resolution — résolution du tenant multi-tenant (avant tout le reste)
app.add_middleware(TenantResolutionMiddleware)

# 1. CORS (outermost — premier à traiter la requête)
ALLOWED_ORIGINS_DEV = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

ALLOWED_ORIGINS_PROD = [
    "https://eadmin.gouv.gn",
    "https://admin.eadmin.gouv.gn",
    "https://citoyen.eadmin.gouv.gn",
    "https://api.eadmin.gouv.gn",
]

allowed_origins = (
    ALLOWED_ORIGINS_DEV + ALLOWED_ORIGINS_PROD
    if settings.is_development
    else ALLOWED_ORIGINS_PROD
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
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-Tenant-ID", "X-Institution-ID"],
    expose_headers=["X-Request-ID", "X-Response-Time", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# --- Routeurs API ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentification"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(documents_search.router, prefix="/api/v1/documents", tags=["Recherche Documentaire"])
app.include_router(courriers.router, prefix="/api/v1/courriers", tags=["Courriers"])
app.include_router(workflows.router, prefix="/api/v1/workflows", tags=["Workflows"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Utilisateurs"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytique"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["Audit"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["Intelligence Artificielle"])
app.include_router(security.router, prefix="/api/v1/security", tags=["Sécurité"])
app.include_router(security_events.router, prefix="/api/v1/security-events", tags=["Événements de Sécurité"])
app.include_router(metrics.router, tags=["Métriques"])


# --- Endpoint de santé enrichi ---
@app.get("/health", tags=["Santé"])
async def health_check():
    """
    Vérifie l'état de santé de l'API et des services dépendants.
    Utilisé par les monitors et les load balancers.
    """
    health_status = {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptime_seconds": round(time.time() - APP_START_TIME),
    }

    # Vérifier PostgreSQL
    try:
        from app.database import engine
        start = time.time()
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_latency = round((time.time() - start) * 1000)
        health_status["postgresql"] = "healthy"
        health_status["postgresql_latency_ms"] = db_latency
    except Exception as e:
        health_status["postgresql"] = f"unhealthy: {str(e)[:100]}"
        health_status["status"] = "degraded"

    # Vérifier Redis
    try:
        from app.services.token_blacklist import token_blacklist
        redis = await token_blacklist._get_redis()
        start = time.time()
        await redis.ping()
        redis_latency = round((time.time() - start) * 1000)
        health_status["redis"] = "healthy"
        health_status["redis_latency_ms"] = redis_latency
    except Exception as e:
        health_status["redis"] = f"unhealthy: {str(e)[:100]}"
        health_status["status"] = "degraded"

    # MinIO / storage (simulated in development)
    health_status["minio"] = "healthy" if settings.is_development else "not_configured"

    return health_status


# --- API v1 health alias (for frontend monitoring) ---
@app.get("/api/v1/health", tags=["Santé"])
async def api_v1_health_check():
    """Alias API v1 pour le health check — utilisé par le monitoring frontend."""
    return await health_check()


# --- Endpoint de métriques Prometheus-compatible ---
@app.get("/metrics", tags=["Métriques"])
async def get_metrics():
    """Prometheus-compatible metrics endpoint."""
    avg_response_time = round(total_response_time_ms / request_counter, 2) if request_counter > 0 else 0
    return {
        "eadmin_requests_total": request_counter,
        "eadmin_errors_total": error_counter,
        "eadmin_active_sessions": active_sessions_count,
        "eadmin_avg_response_time_ms": avg_response_time,
        "eadmin_uptime_seconds": round(time.time() - APP_START_TIME),
        "eadmin_environment": settings.ENVIRONMENT,
        "eadmin_version": settings.APP_VERSION,
    }
