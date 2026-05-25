"""
Metrics endpoint - eAdministration Suite Guinea.
Prometheus-compatible metrics for observability.
"""

from fastapi import APIRouter
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from starlette.responses import Response

router = APIRouter()

# --- Metrics Definitions ---
REQUEST_COUNT = Counter(
    'eadmin_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_LATENCY = Histogram(
    'eadmin_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

ACTIVE_USERS = Gauge(
    'eadmin_active_users_total',
    'Number of active users'
)

DOCUMENTS_PROCESSED = Counter(
    'eadmin_documents_processed_total',
    'Total documents processed',
    ['status']
)

SERVICE_REQUESTS = Counter(
    'eadmin_service_requests_total',
    'Total service requests',
    ['service_id', 'status']
)


@router.get("/metrics", tags=["Métriques"])
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type="text/plain"
    )
