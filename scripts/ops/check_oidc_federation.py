"""Static fail-closed checks for government OIDC federation invariants."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []
    paths = {
        "config": ROOT / "backend/app/config.py",
        "model": ROOT / "backend/app/models/federated_identity.py",
        "migration": ROOT / "backend/alembic/versions/add_federated_identities.py",
        "oidc": ROOT / "backend/app/services/oidc_service.py",
        "identity": ROOT / "backend/app/services/federated_identity_service.py",
        "api": ROOT / "backend/app/api/identity_federation.py",
        "session": ROOT / "backend/app/middleware/session_validity.py",
        "main": ROOT / "backend/app/main.py",
        "tests": ROOT / "backend/tests/test_oidc_federation.py",
        "auth_client": ROOT / "src/lib/auth-client.ts",
        "app_store": ROOT / "src/store/app-store.ts",
        "page": ROOT / "src/app/page.tsx",
        "login_page": ROOT / "src/components/auth/login-page.tsx",
    }
    for name, path in paths.items():
        require(path.exists(), f"Missing SSO {name}: {path.relative_to(ROOT)}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    text = {name: path.read_text(encoding="utf-8") for name, path in paths.items()}

    config = text["config"]
    require("OIDC_ENABLED: bool = False" in config, "OIDC must be disabled by default", errors)
    require("OIDC_AUTO_PROVISION: bool = False" in config, "OIDC auto-provision must default off", errors)
    require("OIDC_AUTO_PROVISION is forbidden" in config, "OIDC auto-provision must fail closed", errors)
    require("OIDC_ALLOWED_ALGORITHMS" in config, "OIDC algorithm allow-list missing", errors)
    require('{"RS256", "ES256"}' in config, "OIDC may only allow asymmetric RS256/ES256", errors)
    require("OIDC_STATE_TTL_SECONDS" in config, "OIDC state TTL is required", errors)

    model = text["model"]
    require("issuer" in model and "subject" in model, "Federated binding issuer/subject missing", errors)
    require("UniqueConstraint(\"issuer\", \"subject\"" in model, "Issuer+subject uniqueness missing", errors)
    require("UniqueConstraint(\"user_id\", \"issuer\"" in model, "Per-user issuer uniqueness missing", errors)

    migration = text["migration"]
    require("FORCE ROW LEVEL SECURITY" in migration, "Federated identities must FORCE RLS", errors)
    require("SSO_SERVICE" in migration, "Dedicated SSO_SERVICE DB context missing", errors)
    require("AUTH_SERVICE" in migration, "Dedicated AUTH_SERVICE read context missing", errors)
    require("sessions_invalid_before" in migration, "Immediate JWT invalidation cutoff missing", errors)

    oidc = text["oidc"]
    for claim in (
        '"code_challenge_method": "S256"',
        '"state": state',
        '"nonce": nonce',
        '"code_verifier": verifier',
        'execute_command("GETDEL"',
        "OIDC_JWKS_URI",
        "audience=settings.OIDC_CLIENT_ID",
        "issuer=settings.OIDC_ISSUER",
        "secrets.compare_digest(nonce, expected_nonce)",
        '"frontend_origin": frontend_origin',
    ):
        require(claim in oidc, f"OIDC protocol invariant missing: {claim}", errors)
    require("HS256" not in oidc, "OIDC service must not accept symmetric HS256", errors)
    require("follow_redirects=False" in oidc, "OIDC HTTP client must not follow redirects", errors)
    require("OIDC_EXCHANGE_TTL_SECONDS = 60" in oidc, "Local SSO exchange must remain short-lived", errors)

    identity = text["identity"]
    require("FederatedIdentity.issuer == claims.issuer" in identity, "Identity must resolve by issuer", errors)
    require("FederatedIdentity.subject == claims.subject" in identity, "Identity must resolve by subject", errors)
    require("User.email == claims.email" not in identity, "Email fallback is forbidden for SSO resolution", errors)
    require("validate_exchange_binding" in identity, "Binding must be revalidated before token issue", errors)
    require('"role": "SSO_SERVICE"' in identity, "Federation DB operations must use SSO_SERVICE", errors)

    api = text["api"]
    require("_trusted_frontend_origin" in api, "SSO frontend origin allow-list is required", errors)
    require("settings.CORS_ORIGINS_PROD" in api, "Trusted SSO origin must derive from server CORS policy", errors)
    require("frontend_origin=trusted_origin" in api, "Validated frontend origin must be bound to OIDC state", errors)
    require("create_local_exchange" in api, "Callback must create local one-time exchange", errors)
    require("consume_local_exchange" in api, "Token endpoint must consume local exchange", errors)
    require("validate_exchange_binding" in api, "Token exchange must revalidate identity", errors)
    require('"role": user.role.value' in api, "Local user role must be JWT authority", errors)
    require('"tenant_id": user.tenant_id' in api, "Local tenant must be JWT authority", errors)
    require('"institution_id": user.institution_id' in api, "Local institution must be JWT authority", errors)
    callback_section = api.split("async def oidc_callback", 1)[1].split("async def exchange_sso_code", 1)[0]
    require("access_token" not in callback_section, "OIDC callback must never return eAdmin access tokens", errors)
    require("refresh_token" not in callback_section, "OIDC callback must never return eAdmin refresh tokens", errors)
    require('urlencode({"sso_exchange": exchange_code})' in callback_section, "Callback must redirect only a one-time local exchange code", errors)
    require('response.headers["Cache-Control"] = "no-store"' in callback_section, "SSO callback must disable caching", errors)
    require('response.headers["Referrer-Policy"] = "no-referrer"' in callback_section, "SSO callback must suppress referrer leakage", errors)
    require("sessions_invalid_before" in api, "SSO disable must invalidate existing access JWTs", errors)
    require("revoke_all_user_tokens" in api, "SSO disable must revoke refresh tokens", errors)
    require("@admin_router.delete" not in api, "Federated identity history must not be destructively deleted", errors)

    session = text["session"]
    require("TOKEN_SCOPE_STALE" in session, "Stale authorization claims must be rejected", errors)
    require("SESSION_REVOKED" in session, "Revoked sessions must be rejected", errors)
    require("sessions_invalid_before" in session, "Session cutoff must be enforced", errors)
    require('"role": "AUTH_SERVICE"' in session, "Session lookup must use AUTH_SERVICE", errors)

    main = text["main"]
    require("SessionValidityMiddleware" in main, "Global session validity middleware must be registered", errors)
    require("identity_federation.public_router" in main, "Public SSO protocol router missing", errors)
    require("identity_federation.admin_router" in main, "Governed identity lifecycle router missing", errors)

    tests = text["tests"]
    for scenario in (
        "auto_provisioning_is_forbidden",
        "frontend_origin_must_be_exactly_trusted",
        "state_is_one_time",
        "external_role_claim_is_not_authority",
        "symmetric_id_token_algorithm_is_rejected",
        "never_falls_back_to_matching_email",
        "disabled_binding_and_disabled_local_account",
        "session_guard_rejects_cutoff_and_stale_role",
    ):
        require(scenario in tests, f"Adversarial SSO scenario missing: {scenario}", errors)

    auth_client = text["auth_client"]
    require("getSsoStatus" in auth_client, "Frontend must query server SSO readiness", errors)
    require("getSsoLoginUrl" in auth_client, "Frontend SSO login URL builder missing", errors)
    require("frontend_origin" in auth_client, "Frontend origin must be sent to SSO login", errors)
    require("exchangeSsoCode" in auth_client, "Frontend one-time code exchange missing", errors)
    require("/api/v1/auth/sso/exchange" in auth_client, "Frontend must use server SSO exchange endpoint", errors)

    app_store = text["app_store"]
    require("completeSsoExchange" in app_store, "App store must finalize SSO exchange", errors)
    require("storePendingTokens" in app_store, "SSO must preserve the existing MFA pending flow", errors)
    require("storeActiveTokens" in app_store, "SSO must use the existing active session store", errors)
    require("localStorage" not in app_store, "SSO/auth store must not persist tokens in localStorage", errors)

    page = text["page"]
    require("sso_exchange" in page, "Root page must detect the one-time SSO exchange code", errors)
    replace_index = page.find("window.history.replaceState")
    exchange_index = page.find("completeSsoExchange(exchangeCode)")
    require(replace_index >= 0, "Browser must remove the SSO exchange code from URL history", errors)
    require(
        exchange_index >= 0 and replace_index < exchange_index,
        "Browser must remove the SSO exchange code before sending it to the API",
        errors,
    )

    login_page = text["login_page"]
    require("getSsoStatus" in login_page, "Login page must query SSO readiness", errors)
    require("ssoEnabled &&" in login_page, "SSO button must render only when backend readiness is enabled", errors)
    require("window.location.origin" in login_page, "SSO must send the current exact frontend origin", errors)
    require("getSsoLoginUrl" in login_page, "SSO button must start the governed backend flow", errors)
    require("localStorage" not in login_page, "Login page must not store SSO tokens in localStorage", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("OIDC federation policy: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
