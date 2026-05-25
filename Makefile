# ═══════════════════════════════════════════════════════════════
# eAdmin Guinée — Makefile
# Gouvernance de développement et DevOps
# ═══════════════════════════════════════════════════════════════

.PHONY: help dev dev-backend dev-frontend build seed seed-reset \
        migrate migrate-create test-backend test-frontend test-all \
        test-backend-cov e2e e2e-headed lint lint-backend lint-frontend lint-fix \
        security-scan docker-up docker-down docker-build docker-dev \
        docker-logs docker-ps status setup clean clean-all push

.DEFAULT_GOAL := help

# Colors
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

# --- Configuration ---
DOCKER_COMPOSE = docker compose
DOCKER_COMPOSE_DEV = docker compose -f docker-compose.yml -f docker-compose.dev.yml

help: ## Show this help message
	@echo "$(CYAN)═══ eAdmin Guinée — Commandes disponibles ═══$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'

# ─── Development ─────────────────────────────────────────────
dev: ## Start full dev environment (Docker)
	$(DOCKER_COMPOSE_DEV) up --build

dev-backend: ## Start backend only (with hot-reload)
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Start frontend only (with hot-reload)
	bun run dev

# ─── Build ───────────────────────────────────────────────────
build: ## Build frontend for production
	bun run build

# ─── Database ────────────────────────────────────────────────
seed: ## Seed demo accounts
	cd backend && python -m app.seed_demo

seed-reset: ## Reset and re-seed demo accounts
	cd backend && python -m app.seed_demo --reset

migrate: ## Run database migrations
	cd backend && alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create msg="description")
	cd backend && alembic revision --autogenerate -m "$(msg)"

# ─── Testing ─────────────────────────────────────────────────
test-backend: ## Run backend tests (SQLite, no external deps)
	cd backend && python -m pytest tests/ -v --tb=short

test-backend-cov: ## Run backend tests with coverage
	cd backend && python -m pytest tests/ -v --tb=short --cov=app --cov-report=term-missing

test-frontend: ## Run frontend type check
	bunx tsc --noEmit

test-all: ## Run all tests (backend + frontend)
	@echo "$(CYAN)═══ Running all tests ═══$(RESET)"
	@echo "$(YELLOW)--- Backend tests ---$(RESET)"
	cd backend && python -m pytest tests/ -v --tb=short
	@echo "$(YELLOW)--- Frontend type check ---$(RESET)"
	bunx tsc --noEmit

e2e: ## Run E2E tests (Playwright)
	npx playwright test

e2e-headed: ## Run E2E tests with browser visible
	npx playwright test --headed

# ─── Linting ─────────────────────────────────────────────────
lint: ## Lint all code (frontend + backend)
	bun run lint
	cd backend && ruff check app/ --ignore E501

lint-backend: ## Lint backend Python code
	cd backend && ruff check app/ --ignore E501

lint-frontend: ## Lint frontend TypeScript code
	bun run lint

lint-fix: ## Auto-fix linting issues
	bun run lint --fix
	cd backend && ruff check app/ --fix --ignore E501

# ─── Security ────────────────────────────────────────────────
security-scan: ## Run security audit
	@echo "$(CYAN)═══ Security Scan ═══$(RESET)"
	@echo "$(YELLOW)--- Frontend dependencies audit ---$(RESET)"
	bun audit || true
	@echo "$(YELLOW)--- Backend dependencies audit ---$(RESET)"
	cd backend && pip-audit || true

# ─── Docker ──────────────────────────────────────────────────
docker-up: ## Start all services (production mode)
	$(DOCKER_COMPOSE) up -d

docker-down: ## Stop all services
	$(DOCKER_COMPOSE) down

docker-build: ## Build all Docker images
	$(DOCKER_COMPOSE) build

docker-dev: ## Start dev environment with hot-reload
	$(DOCKER_COMPOSE_DEV) up --build

docker-logs: ## Show logs from all services
	$(DOCKER_COMPOSE) logs -f

docker-ps: ## Show running containers
	$(DOCKER_COMPOSE) ps

# ─── Setup ───────────────────────────────────────────────────
setup: ## First-time project setup
	@echo "$(CYAN)═══ eAdmin Guinée — Setup ═══$(RESET)"
	@echo "$(YELLOW)1. Installing frontend dependencies...$(RESET)"
	bun install
	@echo "$(YELLOW)2. Installing backend dependencies...$(RESET)"
	cd backend && pip install -r requirements.txt && pip install -r requirements-dev.txt
	@echo "$(YELLOW)3. Creating .env files from examples...$(RESET)"
	test -f .env || cp .env.example .env
	test -f backend/.env || cp backend/.env.example backend/.env
	@echo "$(GREEN)Setup complete! Run 'make dev' to start the application.$(RESET)"

# ─── Status ──────────────────────────────────────────────────
status: ## Show project status
	@echo "$(CYAN)═══ eAdmin Guinée — Status ═══$(RESET)"
	@echo "$(YELLOW)Docker containers:$(RESET)"
	@docker compose ps 2>/dev/null || echo "  Docker not running"
	@echo ""
	@echo "$(YELLOW)Backend health:$(RESET)"
	@curl -s http://localhost:8000/health | python -m json.tool 2>/dev/null || echo "  Backend not reachable"
	@echo ""
	@echo "$(YELLOW)Frontend:$(RESET)"
	@curl -s -o /dev/null -w "  HTTP %{http_code}" http://localhost:3000 2>/dev/null || echo "  Frontend not reachable"
	@echo ""
	@echo "$(YELLOW)Monitoring:$(RESET)"
	@curl -s -o /dev/null -w "  Prometheus HTTP %{http_code}" http://localhost:9090 2>/dev/null || echo "  Prometheus not reachable"
	@echo ""
	@curl -s -o /dev/null -w "  Grafana HTTP %{http_code}" http://localhost:3001 2>/dev/null || echo "  Grafana not reachable"

# ─── Cleanup ─────────────────────────────────────────────────
clean: ## Clean build artifacts
	rm -rf .next out node_modules/.cache
	rm -rf backend/__pycache__ backend/**/__pycache__
	rm -f backend/test.db
	rm -rf backend/htmlcov backend/.pytest_cache
	rm -rf test-results playwright-report

clean-all: ## Full cleanup including Docker volumes
	docker compose down -v --remove-orphans
	rm -rf .next out node_modules/.cache
	rm -rf backend/__pycache__ backend/**/__pycache__
	rm -f backend/test.db
	rm -rf backend/htmlcov backend/.pytest_cache
	rm -rf test-results playwright-report

# ─── Git ─────────────────────────────────────────────────────
push: ## Push to GitHub (usage: make push msg="commit message")
	git add -A && git commit -m "update: $(msg)" && git push origin main
