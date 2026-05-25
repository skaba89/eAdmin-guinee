# =============================================================================
# eAdministration Suite Guinea — Makefile
# Commandes de développement, test et déploiement
# =============================================================================

.PHONY: help dev dev-backend dev-frontend build test e2e seed lint clean docker-up docker-down docker-build

# --- Configuration ---
DOCKER_COMPOSE = docker compose
DOCKER_COMPOSE_DEV = docker compose -f docker-compose.yml -f docker-compose.dev.yml

# --- Aide ---
help: ## Afficher l'aide
	@echo "eAdministration Suite Guinea — Commandes disponibles :"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Développement ---
dev: ## Lancer le frontend en mode développement
	cd /home/z/my-project && bun run dev

dev-backend: ## Lancer le backend en mode développement
	cd /home/z/my-project/backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Lancer le frontend en mode développement
	cd /home/z/my-project && bun run dev

# --- Build ---
build: ## Builder le frontend
	cd /home/z/my-project && bun run build

# --- Base de données ---
seed: ## Seeder les comptes démo en base
	cd /home/z/my-project/backend && python -m app.seed_demo

seed-reset: ## Supprimer et recréer les comptes démo
	cd /home/z/my-project/backend && python -m app.seed_demo --reset

migrate: ## Lancer les migrations Alembic
	cd /home/z/my-project/backend && alembic upgrade head

migrate-create: ## Créer une nouvelle migration (usage: make migrate-create msg="description")
	cd /home/z/my-project/backend && alembic revision --autogenerate -m "$(msg)"

# --- Tests ---
test-backend: ## Lancer les tests backend Pytest
	cd /home/z/my-project/backend && python -m pytest tests/ -v --tb=short

test-backend-cov: ## Lancer les tests backend avec couverture
	cd /home/z/my-project/backend && python -m pytest tests/ -v --cov=app --cov-report=html --cov-report=term

test-frontend: ## Lancer les tests frontend (si configurés)
	cd /home/z/my-project && bun run lint

e2e: ## Lancer les tests E2E Playwright
	cd /home/z/my-project && npx playwright install --with-deps chromium && npx playwright test --reporter=html

e2e-headed: ## Lancer les tests E2E avec navigateur visible
	cd /home/z/my-project && npx playwright test --headed

# --- Qualité du code ---
lint: ## Linter le frontend
	cd /home/z/my-project && bun run lint

lint-backend: ## Linter le backend
	cd /home/z/my-project/backend && ruff check app/ tests/

lint-backend-fix: ## Linter et corriger le backend
	cd /home/z/my-project/backend && ruff check --fix app/ tests/

# --- Docker ---
docker-up: ## Lancer tous les services Docker
	$(DOCKER_COMPOSE) up -d

docker-down: ## Arrêter tous les services Docker
	$(DOCKER_COMPOSE) down

docker-build: ## Builder et lancer les services Docker
	$(DOCKER_COMPOSE) up --build -d

docker-dev: ## Lancer l'environnement de développement Docker
	$(DOCKER_COMPOSE_DEV) up -d

docker-logs: ## Afficher les logs Docker
	$(DOCKER_COMPOSE) logs -f

docker-ps: ## Afficher l'état des conteneurs
	$(DOCKER_COMPOSE) ps

# --- Nettoyage ---
clean: ## Nettoyer les artefacts de build
	rm -rf /home/z/my-project/.next
	rm -rf /home/z/my-project/backend/__pycache__
	rm -rf /home/z/my-project/backend/app/__pycache__
	rm -rf /home/z/my-project/backend/tests/__pycache__
	rm -rf /home/z/my-project/backend/test_eadmin.db
	rm -rf /home/z/my-project/backend/htmlcov
	rm -rf /home/z/my-project/backend/.pytest_cache
	rm -rf /home/z/my-project/test-results
	rm -rf /home/z/my-project/playwright-report

# --- Git ---
push: ## Commit et push
	cd /home/z/my-project && git add -A && git status
