#!/bin/bash
# =============================================================================
# Entrypoint - eAdmin Guinée Backend
# Waits for PostgreSQL, runs Alembic migrations, then starts uvicorn
# =============================================================================

set -e

echo "=== eAdmin Guinée Backend Starting ==="

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
until pg_isready -h ${POSTGRES_HOST:-postgres} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-eadmin} -q; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is ready!"

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Start the server
echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS:-4}
