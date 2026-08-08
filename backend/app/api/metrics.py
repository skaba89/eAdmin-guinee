"""
Operational health and Prometheus metrics for eAdministration Suite Guinea.
"""

import time

from fastapi import APIRouter, status
from prometheus_client import Counter, Gauge, Histogram, generate_latest
from sqlalchemy import text
from starlette.responses import JSONResponse, Response

from app.database import engine
from app.services.object_storage import object_storage
from app.services.token_blacklist import token_blacklist

router = APIRouter()

# --- Métriques HTTP / API ---
REQUEST_COUNT = Counter(
    "eadmin_requests_total",
    "Nombre total de requêtes HTTP traitées",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "eadmin_request_duration_seconds",
    "Latence des requêtes HTTP en secondes",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0],
)

ACTIVE_SESSIONS = Gauge(
    "eadmin_active_sessions",
    "Nombre de sessions utilisateur actives",
)

# --- Métriques Base de données ---
DB_QUERY_LATENCY = Histogram(
    "eadmin_db_query_duration_seconds",
    "Latence des requêtes base de données en secondes",
    ["operation", "table"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
)

DB_CONNECTION_POOL_SIZE = Gauge(
    "eadmin_db_connection_pool_size",
    "Taille du pool de connexions base de données",
)

DB_CONNECTION_POOL_AVAILABLE = Gauge(
    "eadmin_db_connection_pool_available",
    "Connexions disponibles dans le pool",
)

# --- Métriques Authentification ---
AUTH_ATTEMPTS = Counter(
    "eadmin_auth_attempts_total",
    "Tentatives d'authentification",
    ["type", "result"],
)

MFA_OPERATIONS = Counter(
    "eadmin_mfa_operations_total",
    "Opérations MFA",
    ["operation", "result"],
)

# --- Métriques Documents (GED) ---
DOCUMENT_OPERATIONS = Counter(
    "eadmin_document_operations_total",
    "Opérations sur les documents",
    ["operation", "type"],
)

DOCUMENT_OCR_PROCESSING = Histogram(
    "eadmin_document_ocr_duration_seconds",
    "Durée de traitement OCR des documents",
    ["engine", "language"],
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0],
)

DOCUMENT_VERSION_OPERATIONS = Counter(
    "eadmin_document_version_operations_total",
    "Opérations de versionnage des documents",
    ["operation"],
)

# --- Métriques Parapheur ---
PARAPHEUR_CIRCUIT_OPERATIONS = Counter(
    "eadmin_parapheur_circuit_operations_total",
    "Opérations sur les circuits de parapheur",
    ["action"],
)

PARAPHEUR_PENDING_ITEMS = Gauge(
    "eadmin_parapheur_pending_items",
    "Éléments en attente dans le parapheur",
    ["institution"],
)

SIGNATURE_OPERATIONS = Counter(
    "eadmin_signature_operations_total",
    "Opérations de signature électronique",
    ["type", "result"],
)

# --- Métriques IA ---
AI_OPERATIONS = Counter(
    "eadmin_ai_operations_total",
    "Opérations d'intelligence artificielle",
    ["operation", "model"],
)

AI_PROCESSING_DURATION = Histogram(
    "eadmin_ai_processing_duration_seconds",
    "Durée de traitement IA en secondes",
    ["operation"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
)

AI_TOKEN_USAGE = Counter(
    "eadmin_ai_token_usage_total",
    "Consommation de tokens IA",
    ["model", "type"],
)

# --- Métriques Courriers ---
COURRIER_OPERATIONS = Counter(
    "eadmin_courrier_operations_total",
    "Opérations sur les courriers",
    ["operation", "direction"],
)

# --- Métriques Workflows ---
WORKFLOW_OPERATIONS = Counter(
    "eadmin_workflow_operations_total",
    "Opérations sur les workflows",
    ["operation", "status"],
)

# --- Métriques Recherche ---
SEARCH_OPERATIONS = Counter(
    "eadmin_search_operations_total",
    "Opérations de recherche documentaire",
    ["type", "result_count_bucket"],
)

SEARCH_DURATION = Histogram(
    "eadmin_search_duration_seconds",
    "Durée des recherches documentaires",
    ["type"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)

# --- Métriques Upload ---
UPLOAD_OPERATIONS = Counter(
    "eadmin_upload_operations_total",
    "Opérations de téléchargement de fichiers",
    ["result"],
)

UPLOAD_FILE_SIZE = Histogram(
    "eadmin_upload_file_size_bytes",
    "Taille des fichiers téléchargés",
    buckets=[1024, 10240, 102400, 1048576, 5242880, 10485760, 52428800, 104857600],
)

# --- Métriques Système ---
RATE_LIMIT_HITS = Counter(
    "eadmin_rate_limit_hits_total",
    "Requêtes bloquées par le rate limiter",
    ["endpoint", "limit_type"],
)

TENANT_REQUESTS = Counter(
    "eadmin_tenant_requests_total",
    "Requêtes par tenant",
    ["tenant_id"],
)

DEPENDENCY_READY = Gauge(
    "eadmin_dependency_ready",
    "État de disponibilité des dépendances critiques (1=prête, 0=indisponible)",
    ["dependency"],
)


async def _check_postgres() -> bool:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def _check_redis() -> bool:
    try:
        redis = await token_blacklist._get_redis()
        return bool(await redis.ping())
    except Exception:
        return False


async def _check_object_storage() -> bool:
    try:
        return await object_storage.healthcheck()
    except Exception:
        return False


@router.get("/health/live", tags=["Santé"])
async def liveness() -> dict[str, str]:
    """Process-level liveness probe. Never checks remote dependencies."""
    return {"status": "alive"}


@router.get("/health/ready", tags=["Santé"])
async def readiness() -> JSONResponse:
    """Traffic readiness probe for all critical stateful dependencies."""
    started = time.monotonic()
    checks = {
        "postgresql": await _check_postgres(),
        "redis": await _check_redis(),
        "object_storage": await _check_object_storage(),
    }
    for dependency, ready in checks.items():
        DEPENDENCY_READY.labels(dependency=dependency).set(1 if ready else 0)

    ready = all(checks.values())
    payload = {
        "status": "ready" if ready else "not_ready",
        "checks": checks,
        "check_duration_ms": int((time.monotonic() - started) * 1000),
    }
    return JSONResponse(
        status_code=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content=payload,
    )


@router.get("/metrics", tags=["Métriques"])
async def metrics() -> Response:
    """Expose Prometheus metrics for platform and operational monitoring."""
    return Response(
        content=generate_latest(),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )
