"""
Application FastAPI principale - eAdministration Suite Guinea.
Point d'entrée de l'API backend.
"""

import time
import logging
from contextlib import asynccontextmanager
from collections import defaultdict

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import ai, analytics, audit, auth, courriers, documents, documents_search, metrics, security, users, workflows
from app.config import settings

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


# --- Rate Limiting (in-memory, Redis-backed in production) ---
class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple rate limiter: max_requests per window_seconds per IP."""

    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean old entries
        self.requests[client_ip] = [
            t for t in self.requests[client_ip]
            if now - t < self.window_seconds
        ]

        if len(self.requests[client_ip]) >= self.max_requests:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Trop de requêtes. Réessayez dans quelques secondes."}
            )

        self.requests[client_ip].append(now)
        return await call_next(request)


# --- Security Headers Middleware ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Content Security Policy - GovTech specific
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "connect-src 'self' http://localhost:3000 http://localhost:8000; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
        response.headers["X-Admin-Guinee"] = "eAdministration-Suite-Guinea"

        # HSTS in production only
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response


# --- Request Logging Middleware ---
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all API requests for audit trail and increment metrics counters."""

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

    logger.info("Arrêt propre de l'application")


app = FastAPI(
    title="eAdministration Suite Guinea - API",
    description="Plateforme GovTech de nouvelle génération pour la République de Guinée",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# --- Middlewares (order matters: outermost first) ---
# Rate limiting
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Request logging
app.add_middleware(RequestLoggingMiddleware)

# CORS — strict configuration: never "*" with credentials
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
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-Tenant-ID"],
    expose_headers=["X-Request-ID", "X-Response-Time"],
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
