"""
Application FastAPI principale - eAdministration Suite Guinea.
Point d'entrée de l'API backend.
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import (
    ai,
    analytics,
    audit,
    auth,
    auth_hardening,
    courriers,
    document_files,
    document_imports,
    document_ocr,
    document_query,
    document_search,
    documents,
    documents_search,
    institutions,
    metrics,
    security,
    security_events,
    security_hardening,
    service_catalog,
    service_request_files,
    service_requests,
    users,
    workflows,
)
from app.config import settings
from app.middleware.audit import AuditMiddleware
from app.middleware.mfa_guard import MFAGuardMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.rls import set_rls_context
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.tenant import TenantResolutionMiddleware

logger = logging.getLogger("eadmin")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter(
    '{"time":"%(asctime)s","level":"%(levelname)s","module":"%(name)s","message":"%(message)s"}'
))
if not logger.handlers:
    logger.addHandler(handler)

request_counter = 0
error_counter = 0
total_response_time_ms = 0.0
active_sessions_count = 1
APP_START_TIME = time.time()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Journalise toutes les requêtes API et incrémente les compteurs de métriques."""

    async def dispatch(self, request: Request, call_next):
        global request_counter, error_counter, total_response_time_ms

        start_time = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000)

        request_counter += 1
        total_response_time_ms += duration_ms
        if response.status_code >= 400:
            error_counter += 1

        logger.info(
            "method=%s path=%s status=%s duration=%sms ip=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request.client.host if request.client else "unknown",
        )
        response.headers["X-Response-Time"] = f"{duration_ms}ms"
        return response


@asynccontextmanager
async def lifespan(application: FastAPI):
    logger.info("Starting eAdministration Suite Guinea API...")
    application.state.settings = settings
    logger.info("Démarrage de %s v%s (%s)", settings.APP_NAME, settings.APP_VERSION, settings.ENVIRONMENT)

    try:
        from app.services.telemetry import telemetry_service
        telemetry_service.setup(otlp_endpoint=settings.OTLP_ENDPOINT)
    except Exception as exc:
        logger.warning("OpenTelemetry non initialisé: %s", exc)

    try:
        from app.services.sentry_service import sentry_service
        sentry_dsn = getattr(settings, "SENTRY_DSN", "") or ""
        if sentry_dsn:
            sentry_service.init(
                dsn=sentry_dsn,
                environment=settings.ENVIRONMENT,
                release=settings.APP_VERSION,
            )
    except Exception as exc:
        logger.warning("Sentry non initialisé: %s", exc)

    try:
        from app.services.token_blacklist import token_blacklist
        redis = await token_blacklist._get_redis()
        await redis.ping()
        logger.info("Connexion Redis établie avec succès")
    except Exception as exc:
        if settings.is_production:
            logger.critical("Redis indisponible en production: %s", exc)
            raise RuntimeError(
                "Redis est obligatoire en production pour la sécurité des sessions."
            ) from exc
        logger.warning("Redis indisponible en environnement non-production: %s", exc)

    yield

    logger.info("Shutting down eAdministration Suite Guinea API...")

    from app.database import engine
    await engine.dispose()

    from app.services.token_blacklist import token_blacklist
    await token_blacklist.close()

    from app.services.session_service import session_service
    await session_service.close()

    try:
        from app.services.sentry_service import sentry_service
        sentry_service.clear_user_context()
    except Exception:
        pass

    logger.info("Arrêt propre de l'application")


app = FastAPI(
    title="eAdministration Suite Guinea - API",
    description="Plateforme GovTech de nouvelle génération pour la République de Guinée",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# Starlette executes the last added middleware first.
# Request order: CORS -> Tenant -> Security Headers -> MFA -> Rate -> Audit -> Logging
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(AuditMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(MFAGuardMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TenantResolutionMiddleware)

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

if settings.is_development and hasattr(settings, "EXTRA_CORS_ORIGINS"):
    import json

    try:
        extra = json.loads(settings.EXTRA_CORS_ORIGINS)
        if isinstance(extra, list):
            allowed_origins.extend(str(origin) for origin in extra)
    except Exception:
        logger.warning("EXTRA_CORS_ORIGINS invalide; valeur ignorée")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Request-ID",
        "X-Tenant-ID",
        "X-Institution-ID",
    ],
    expose_headers=[
        "X-Request-ID",
        "X-Response-Time",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
    ],
)

# Authentication and security overrides are intentionally registered first.
app.include_router(auth_hardening.router, prefix="/api/v1/auth", tags=["Authentification"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentification"])

rls_dependencies = [Depends(set_rls_context)]

# Public administrative-service metadata is readable without authentication.
# The route installs its own host-derived PUBLIC RLS context and does not accept
# client tenant/institution headers in non-development environments.
app.include_router(
    service_catalog.public_router,
    prefix="/api/v1/public/service-catalog",
    tags=["Catalogue public des démarches"],
)

app.include_router(
    institutions.router,
    prefix="/api/v1/institutions",
    tags=["Institutions"],
    dependencies=rls_dependencies,
)
app.include_router(
    service_catalog.router,
    prefix="/api/v1/service-catalog",
    tags=["Catalogue des démarches"],
    dependencies=rls_dependencies,
)
app.include_router(
    service_request_files.router,
    prefix="/api/v1/service-requests",
    tags=["Pièces des demandes"],
    dependencies=rls_dependencies,
)
app.include_router(
    service_requests.router,
    prefix="/api/v1/service-requests",
    tags=["Demandes citoyennes"],
    dependencies=rls_dependencies,
)
# Register all server-authoritative GED routes before the historical
# documents router. Import/query/file routes therefore own duplicate method/path
# combinations and prevent client-authoritative legacy mutations.
app.include_router(
    document_imports.router,
    prefix="/api/v1/documents",
    tags=["Import GED sécurisé"],
    dependencies=rls_dependencies,
)
app.include_router(
    document_query.router,
    prefix="/api/v1/documents",
    tags=["Consultation GED"],
    dependencies=rls_dependencies,
)
app.include_router(
    document_ocr.router,
    prefix="/api/v1/documents",
    tags=["OCR documentaire"],
    dependencies=rls_dependencies,
)
app.include_router(
    document_search.router,
    prefix="/api/v1/documents",
    tags=["Recherche Documentaire PostgreSQL"],
    dependencies=rls_dependencies,
)
app.include_router(
    document_files.router,
    prefix="/api/v1/documents",
    tags=["Fichiers GED sécurisés"],
    dependencies=rls_dependencies,
)
app.include_router(
    documents.router,
    prefix="/api/v1/documents",
    tags=["Documents"],
    dependencies=rls_dependencies,
)
app.include_router(
    documents_search.router,
    prefix="/api/v1/documents",
    tags=["Recherche Documentaire"],
    dependencies=rls_dependencies,
)
app.include_router(
    courriers.router,
    prefix="/api/v1/courriers",
    tags=["Courriers"],
    dependencies=rls_dependencies,
)
app.include_router(
    workflows.router,
    prefix="/api/v1/workflows",
    tags=["Workflows"],
    dependencies=rls_dependencies,
)
app.include_router(
    users.router,
    prefix="/api/v1/users",
    tags=["Utilisateurs"],
    dependencies=rls_dependencies,
)
app.include_router(
    analytics.router,
    prefix="/api/v1/analytics",
    tags=["Analytique"],
    dependencies=rls_dependencies,
)
app.include_router(
    audit.router,
    prefix="/api/v1/audit",
    tags=["Audit"],
    dependencies=rls_dependencies,
)
app.include_router(
    ai.router,
    prefix="/api/v1/ai",
    tags=["Intelligence Artificielle"],
    dependencies=rls_dependencies,
)

app.include_router(security_hardening.router, prefix="/api/v1/security", tags=["Sécurité"])
app.include_router(security.router, prefix="/api/v1/security", tags=["Sécurité"])
app.include_router(
    security_events.router,
    prefix="/api/v1/security-events",
    tags=["Événements de Sécurité"],
    dependencies=rls_dependencies,
)
app.include_router(metrics.router, tags=["Métriques"])


@app.get("/health", tags=["Santé"])
async def health_check():
    health_status = {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptime_seconds": round(time.time() - APP_START_TIME),
    }

    try:
        from app.database import engine
        start = time.time()
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        health_status["postgresql"] = "healthy"
        health_status["postgresql_latency_ms"] = round((time.time() - start) * 1000)
    except Exception as exc:
        health_status["postgresql"] = f"unhealthy: {str(exc)[:100]}"
        health_status["status"] = "degraded"

    try:
        from app.services.token_blacklist import token_blacklist
        redis = await token_blacklist._get_redis()
        start = time.time()
        await redis.ping()
        health_status["redis"] = "healthy"
        health_status["redis_latency_ms"] = round((time.time() - start) * 1000)
    except Exception as exc:
        health_status["redis"] = f"unhealthy: {str(exc)[:100]}"
        health_status["status"] = "degraded"

    health_status["minio"] = "healthy" if settings.is_development else "not_configured"
    return health_status


@app.get("/api/v1/health", tags=["Santé"])
async def api_v1_health_check():
    return await health_check()


@app.get("/metrics", tags=["Métriques"])
async def get_metrics():
    avg_response_time = (
        round(total_response_time_ms / request_counter, 2)
        if request_counter > 0
        else 0
    )
    return {
        "eadmin_requests_total": request_counter,
        "eadmin_errors_total": error_counter,
        "eadmin_active_sessions": active_sessions_count,
        "eadmin_avg_response_time_ms": avg_response_time,
        "eadmin_uptime_seconds": round(time.time() - APP_START_TIME),
        "eadmin_environment": settings.ENVIRONMENT,
        "eadmin_version": settings.APP_VERSION,
    }
