# Render backend runbook — eAdmin Guinée

## Backend service contract

For the backend service, use these Render settings:

- Runtime / Language: `Docker`
- Root Directory: `backend`
- Dockerfile Path: `./Dockerfile`
- Docker Build Context: `.`
- Docker Command: **empty** (let the image `CMD` run)
- Health Check Path: `/health`

The backend image runs Alembic migrations, optional controlled bootstrap, then Uvicorn on the platform-provided `PORT`.

If an existing Render service still overrides Docker Command with `/app/entrypoint.sh`, the repository keeps a compatible executable launcher so the next build can recover. Remove the override after the deployment is healthy.

## Required runtime configuration

At minimum, production/staging must provide the settings required by `app.config.Settings`, including:

- `ENVIRONMENT`
- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `ENCRYPTION_KEY`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- object-storage endpoint/bucket settings appropriate to the environment
- `EXTRA_CORS_ORIGINS` containing the exact frontend HTTPS origin

Do not store real secrets in Git.

## First SUPER_ADMIN

Only when the target database contains no SUPER_ADMIN, temporarily configure:

- `EADMIN_BOOTSTRAP_SUPERADMIN_ENABLED=true`
- `EADMIN_BOOTSTRAP_SUPERADMIN_EMAIL=<real-admin-email>`
- `EADMIN_BOOTSTRAP_SUPERADMIN_PASSWORD=<strong-secret>`
- optional `EADMIN_BOOTSTRAP_SUPERADMIN_NAME=<display-name>`

Deploy once, log in successfully, then disable/remove the bootstrap variables. The bootstrap refuses to overwrite an existing account or silently elevate an existing email.

## Staging portal test accounts

Never enable test-account bootstrap in production. For a staging/test service:

- `ENVIRONMENT=staging`
- `EADMIN_BOOTSTRAP_TEST_USERS=true`
- `EADMIN_BOOTSTRAP_TEST_PASSWORD=<shared-strong-test-secret>`
- optional `EADMIN_BOOTSTRAP_TEST_DOMAIN=<test-domain>`
- optional test institution name/id variables from `.env.example`

The bootstrap creates missing accounts only, one for each portal role:

- `citoyen@<domain>` → CITOYEN
- `agent@<domain>` → AGENT
- `mairie@<domain>` → MAIRIE
- `agence@<domain>` → AGENCE
- `admin@<domain>` → ADMIN
- `chef-service@<domain>` → CHEF_SERVICE
- `directeur@<domain>` → DIRECTEUR
- `ministre@<domain>` → MINISTRE

The same configured password is used for these staging accounts. Existing accounts are never overwritten.

## Functional verification

1. Backend `/health` responds.
2. Public citizen registration creates a CITOYEN account.
3. SUPER_ADMIN signs in and opens the Users page.
4. Users page lists database-backed accounts, not demo rows.
5. Create an account with an allowed lower role and a strong initial password.
6. Log out and sign in with the new account.
7. Confirm the frontend lands on the role-specific portal/dashboard.
8. Disable the account from Users and confirm subsequent authentication is rejected.
