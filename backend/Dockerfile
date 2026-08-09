# =============================================================================
# Dockerfile - eAdmin Guinée Backend (FastAPI)
# Multi-stage production build with Alembic migrations
# =============================================================================

# ---- Stage 1: Builder ----
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Stage 2: Production ----
FROM python:3.12-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    postgresql-client \
    curl \
    tesseract-ocr \
    tesseract-ocr-fra \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r eadmin && useradd -r -g eadmin eadmin

COPY --from=builder /install /usr/local
COPY . .

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV UVICORN_WORKERS=2

USER eadmin

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f "http://localhost:${PORT:-8000}/health" || exit 1

# Do not depend on a repository shell entrypoint at runtime. This avoids a
# Render/Docker-command mismatch producing `exec /app/entrypoint.sh: no such
# file or directory`, and it also uses the platform-provided PORT.
#
# Alembic retries are deliberately bounded: a temporarily unavailable managed
# PostgreSQL instance can recover, while a bad DATABASE_URL or broken migration
# still fails the deploy instead of looping forever.
CMD ["sh", "-c", "set -eu; attempt=1; while ! alembic upgrade head; do if [ \"$attempt\" -ge 12 ]; then echo 'ERROR: Alembic migrations failed after 12 attempts.' >&2; exit 1; fi; echo \"Database/migration unavailable (attempt $attempt/12); retrying in 5s...\"; attempt=$((attempt + 1)); sleep 5; done; python -m app.bootstrap_runtime; exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${UVICORN_WORKERS:-2}"]
