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
    require("create_local_exchange" in api, "Callback must create local one-time exchange", errors)
    require("consume_local_exchange" in api, "Token endpoint must consume local exchange", errors)
    require("validate_exchange_binding" in api, "Token exchange must revalidate identity", errors)
    require('"role": user.role.value' in api, "Local user role must be JWT authority", errors)
    require('"tenant_id": user.tenant_id' in api, "Local tenant must be JWT authority", errors)
    require('"institution_id": user.institution_id' in api, "Local institution must be JWT authority", errors)
    callback_section = api.split("async def oidc_callback", 1)[1].split("async def exchange_sso_code", 1)[0]
    require("access_token" not in callback_section, "OIDC callback must never return eAdmin access tokens", errors)
    require("refresh_token" not in callback_section, "OIDC callback must never return eAdmin refresh tokens", errors)
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
        "state_is_one_time",
        "external_role_claim_is_not_authority",
        "symmetric_id_token_algorithm_is_rejected",
        "never_falls_back_to_matching_email",
        "disabled_binding_and_disabled_local_account",
        "session_guard_rejects_cutoff_and_stale_role",
    ):
        require(scenario in tests, f"Adversarial SSO scenario missing: {scenario}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("OIDC federation policy: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
