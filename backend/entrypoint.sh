#!/bin/sh
# Backward-compatible launcher for existing Render Docker Command overrides.
# The Docker image's normal CMD no longer depends on this file.

set -eu

echo "=== eAdmin Guinée Backend Starting ==="

attempt=1
while ! alembic upgrade head; do
  if [ "$attempt" -ge 12 ]; then
    echo "ERROR: Alembic migrations failed after 12 attempts." >&2
    exit 1
  fi
  echo "Database/migration unavailable (attempt $attempt/12); retrying in 5s..."
  attempt=$((attempt + 1))
  sleep 5
done

python -m app.bootstrap_runtime

exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "${UVICORN_WORKERS:-2}"
