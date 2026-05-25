# Task 5-16: Docker & Infrastructure Configuration Fix

## Summary
Fixed backend Dockerfile (Alembic migrations + entrypoint), updated .env files with all new config variables, and created comprehensive Kubernetes manifests for production deployment.

## Files Modified
1. `/home/z/my-project/backend/Dockerfile` — Added postgresql-client, entrypoint.sh, ENTRYPOINT
2. `/home/z/my-project/backend/.env` — Added 14 new config variables
3. `/home/z/my-project/.env` — Added NEXT_PUBLIC_ENCRYPTION_KEY

## Files Created
1. `/home/z/my-project/backend/entrypoint.sh` — PostgreSQL wait + Alembic migration + uvicorn start
2. `/home/z/my-project/k8s/backend-service.yaml` — Dedicated ClusterIP service
3. `/home/z/my-project/k8s/backend-hpa.yaml` — HPA 3-10 replicas, CPU 70%
4. `/home/z/my-project/k8s/networkpolicy.yaml` — Default deny + per-service allow rules
5. `/home/z/my-project/k8s/pdb.yaml` — PodDisruptionBudget minAvailable=2
6. `/home/z/my-project/k8s/postgres-deployment.yaml` — StatefulSet + headless Service
7. `/home/z/my-project/k8s/redis-deployment.yaml` — Deployment + PVC + Service

## Files Updated
1. `/home/z/my-project/k8s/secrets.yaml` — Base64-encoded, all required secrets
2. `/home/z/my-project/k8s/configmap.yaml` — Full non-secret config
3. `/home/z/my-project/k8s/backend-deployment.yaml` — Tier labels, updated probes

## Key Decisions
- Entrypoint uses `exec` for uvicorn to properly handle signals (SIGTERM)
- `pg_isready` used for PostgreSQL health check (from postgresql-client package)
- K8s secrets use `data` (base64) instead of `stringData` for template correctness
- PostgreSQL uses StatefulSet with headless Service for stable DNS
- Redis uses Deployment with PVC for simpler management
- NetworkPolicy follows least-privilege: default deny + explicit allow rules
- Docker Compose files left untouched for backward compatibility
