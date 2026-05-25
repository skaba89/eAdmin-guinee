"""
Endpoint de métriques Prometheus - eAdministration Suite Guinea.
Métriques enrichies pour l'observabilité de la plateforme GovTech.
Format compatible Prometheus pour le scraping par Grafana/Prometheus.
"""

from fastapi import APIRouter
from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY, CollectorRegistry
from starlette.responses import Response

router = APIRouter()

# --- Métriques HTTP / API ---
REQUEST_COUNT = Counter(
    'eadmin_requests_total',
    'Nombre total de requêtes HTTP traitées',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'eadmin_request_duration_seconds',
    'Latence des requêtes HTTP en secondes',
    ['method', 'endpoint'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0]
)

ACTIVE_SESSIONS = Gauge(
    'eadmin_active_sessions',
    'Nombre de sessions utilisateur actives'
)

# --- Métriques Base de données ---
DB_QUERY_LATENCY = Histogram(
    'eadmin_db_query_duration_seconds',
    'Latence des requêtes base de données en secondes',
    ['operation', 'table'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

DB_CONNECTION_POOL_SIZE = Gauge(
    'eadmin_db_connection_pool_size',
    'Taille du pool de connexions base de données'
)

DB_CONNECTION_POOL_AVAILABLE = Gauge(
    'eadmin_db_connection_pool_available',
    'Connexions disponibles dans le pool'
)

# --- Métriques Authentification ---
AUTH_ATTEMPTS = Counter(
    'eadmin_auth_attempts_total',
    'Tentatives d\'authentification',
    ['type', 'result']  # type: login, mfa, token_refresh; result: success, failure
)

MFA_OPERATIONS = Counter(
    'eadmin_mfa_operations_total',
    'Opérations MFA',
    ['operation', 'result']  # operation: setup, verify, disable; result: success, failure
)

# --- Métriques Documents (GED) ---
DOCUMENT_OPERATIONS = Counter(
    'eadmin_document_operations_total',
    'Opérations sur les documents',
    ['operation', 'type']  # operation: create, read, update, delete, upload, download; type: pdf, docx, image
)

DOCUMENT_OCR_PROCESSING = Histogram(
    'eadmin_document_ocr_duration_seconds',
    'Durée de traitement OCR des documents',
    ['engine', 'language'],
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0]
)

DOCUMENT_VERSION_OPERATIONS = Counter(
    'eadmin_document_version_operations_total',
    'Opérations de versionnage des documents',
    ['operation']  # operation: create, restore, compare
)

# --- Métriques Parapheur ---
PARAPHEUR_CIRCUIT_OPERATIONS = Counter(
    'eadmin_parapheur_circuit_operations_total',
    'Opérations sur les circuits de parapheur',
    ['action']  # action: create, advance, reject, complete
)

PARAPHEUR_PENDING_ITEMS = Gauge(
    'eadmin_parapheur_pending_items',
    'Éléments en attente dans le parapheur',
    ['institution']
)

SIGNATURE_OPERATIONS = Counter(
    'eadmin_signature_operations_total',
    'Opérations de signature électronique',
    ['type', 'result']  # type: sign, approve, viser, stamp; result: success, failure
)

# --- Métriques IA ---
AI_OPERATIONS = Counter(
    'eadmin_ai_operations_total',
    'Opérations d\'intelligence artificielle',
    ['operation', 'model']  # operation: classify, summarize, extract, generate; model: stub, gpt, etc.
)

AI_PROCESSING_DURATION = Histogram(
    'eadmin_ai_processing_duration_seconds',
    'Durée de traitement IA en secondes',
    ['operation'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0]
)

AI_TOKEN_USAGE = Counter(
    'eadmin_ai_token_usage_total',
    'Consommation de tokens IA',
    ['model', 'type']  # type: input, output
)

# --- Métriques Courriers ---
COURRIER_OPERATIONS = Counter(
    'eadmin_courrier_operations_total',
    'Opérations sur les courriers',
    ['operation', 'direction']  # direction: incoming, outgoing
)

# --- Métriques Workflows ---
WORKFLOW_OPERATIONS = Counter(
    'eadmin_workflow_operations_total',
    'Opérations sur les workflows',
    ['operation', 'status']  # operation: create, advance, complete; status: success, failure
)

# --- Métriques Recherche ---
SEARCH_OPERATIONS = Counter(
    'eadmin_search_operations_total',
    'Opérations de recherche documentaire',
    ['type', 'result_count_bucket']  # type: fulltext, ocr, filter
)

SEARCH_DURATION = Histogram(
    'eadmin_search_duration_seconds',
    'Durée des recherches documentaires',
    ['type'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# --- Métriques Upload ---
UPLOAD_OPERATIONS = Counter(
    'eadmin_upload_operations_total',
    'Opérations de téléchargement de fichiers',
    ['result']  # result: success, rejected_size, rejected_type, quarantined
)

UPLOAD_FILE_SIZE = Histogram(
    'eadmin_upload_file_size_bytes',
    'Taille des fichiers téléchargés',
    buckets=[1024, 10240, 102400, 1048576, 5242880, 10485760, 52428800, 104857600]
)

# --- Métriques Système ---
RATE_LIMIT_HITS = Counter(
    'eadmin_rate_limit_hits_total',
    'Requêtes bloquées par le rate limiter',
    ['endpoint', 'limit_type']  # limit_type: ip, user, global
)

TENANT_REQUESTS = Counter(
    'eadmin_tenant_requests_total',
    'Requêtes par tenant',
    ['tenant_id']
)


@router.get("/metrics", tags=["Métriques"])
async def metrics():
    """
    Endpoint de métriques au format Prometheus.
    Scrapé par Prometheus pour la surveillance de la plateforme.
    Inclut toutes les métriques HTTP, DB, auth, GED, IA et système.
    """
    return Response(
        content=generate_latest(),
        media_type="text/plain; version=0.0.4; charset=utf-8"
    )
