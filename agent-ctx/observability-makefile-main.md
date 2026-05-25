# Task: Improve Makefile & Add Observability Infrastructure

## Summary
Enhanced the eAdmin Guinée project with a comprehensive Makefile and Prometheus + Grafana observability stack.

## Changes Made

### Part 1: Enhanced Makefile (`/home/z/my-project/Makefile`)
- **`help`**: Color-coded help output with `GREEN`, `YELLOW`, `CYAN` variables, `.DEFAULT_GOAL := help`
- **`test-all`**: Runs both backend (pytest) and frontend (tsc --noEmit) tests
- **`security-scan`**: Runs `bun audit` + `pip-audit` for dependency vulnerability scanning
- **`migrate`** / **`migrate-create`**: Alembic migration targets
- **`setup`**: First-time project setup (install deps, create .env from examples)
- **`status`**: Shows Docker containers, backend health, frontend HTTP status, and monitoring endpoints
- **`clean-all`**: Full cleanup including `docker compose down -v --remove-orphans`
- **`lint-fix`**: Auto-fix linting issues for both frontend and backend
- **All existing targets properly documented** with `##` comments

### Part 2: Observability Infrastructure

#### docker-compose.yml additions
- **Prometheus** (`prom/prometheus:v2.51.0`) on port 9090 with 30-day retention
- **Grafana** (`grafana/grafana:10.4.0`) on port 3001 with admin/eadmin2026 credentials
- Added `prometheus_data` and `grafana_data` named volumes

#### Monitoring configs (`/home/z/my-project/monitoring/`)
- `prometheus.yml`: Scrape configs for backend (10s interval), postgres_exporter, redis_exporter
- `grafana/datasources/datasource.yml`: Auto-provisioned Prometheus datasource
- `grafana/dashboards/dashboard.yml`: Dashboard provider for eAdmin Guinée

#### Backend metrics endpoint (`/home/z/my-project/backend/app/api/metrics.py`)
- `eadmin_http_requests_total` (Counter): method, endpoint, status_code
- `eadmin_request_duration_seconds` (Histogram): method, endpoint with custom buckets
- `eadmin_active_users_total` (Gauge): active user count
- `eadmin_documents_processed_total` (Counter): document processing by status
- `eadmin_service_requests_total` (Counter): service requests by service_id and status
- `GET /metrics` returns Prometheus-compatible plaintext metrics

#### Backend integration
- Registered `metrics.router` in `main.py` (no prefix, exposed at `/metrics`)
- Added `prometheus_client==0.20.0` to `requirements.txt`
