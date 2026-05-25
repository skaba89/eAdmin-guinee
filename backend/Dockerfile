# =============================================================================
# Dockerfile - eAdmin Guinée Backend (FastAPI)
# Multi-stage production build with Alembic migrations
# =============================================================================

# ---- Stage 1: Builder ----
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Stage 2: Production ----
FROM python:3.12-slim AS production

WORKDIR /app

# Install runtime dependencies only (including postgresql-client for pg_isready)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r eadmin && useradd -r -g eadmin eadmin

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code (includes alembic/, alembic.ini, app/, etc.)
COPY . .

# Copy and configure entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Switch to non-root user
USER eadmin

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Use entrypoint script: waits for PostgreSQL, runs migrations, starts server
ENTRYPOINT ["/app/entrypoint.sh"]
