# =============================================================================
# Dockerfile - eAdministration Suite Guinea
# Backend FastAPI asynchrone
# =============================================================================

# ---- Étape 1 : Dépendances ----
FROM python:3.12-slim AS deps

WORKDIR /app

# Installer les dépendances système nécessaires
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- Étape 2 : Production ----
FROM python:3.12-slim AS production

WORKDIR /app

# Installer uniquement les bibliothèques runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Créer un utilisateur non-root pour la sécurité
RUN groupadd -r eadmin && useradd -r -g eadmin eadmin

# Copier les dépendances Python depuis l'étape de build
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copier le code source
COPY . .

# Changer le propriétaire des fichiers
RUN chown -R eadmin:eadmin /app

USER eadmin

EXPOSE 8000

# Commande de démarrage avec uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
