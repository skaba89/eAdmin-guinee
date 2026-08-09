"""Fail-closed policy checks for low-bandwidth/PWA behavior."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []
    paths = {
        "sw": ROOT / "public/sw.js",
        "manifest": ROOT / "public/manifest.webmanifest",
        "bootstrap": ROOT / "src/components/pwa/pwa-bootstrap.tsx",
        "client_idempotency": ROOT / "src/lib/idempotency-client.ts",
        "service_requests_client": ROOT / "src/lib/service-requests-api.ts",
        "middleware": ROOT / "backend/app/middleware/idempotency.py",
        "main": ROOT / "backend/app/main.py",
        "tests": ROOT / "backend/tests/test_idempotency_middleware.py",
    }
    for name, path in paths.items():
        require(path.exists(), f"Missing low-bandwidth {name}: {path.relative_to(ROOT)}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    text = {name: path.read_text(encoding="utf-8") for name, path in paths.items()}

    sw = text["sw"]
    require("Authorization" in sw, "Service worker must explicitly detect Authorization", errors)
    require("isPrivateApi" in sw, "Service worker private API guard missing", errors)
    require("/api/v1/public/service-catalog" in sw, "Public service catalogue offline cache missing", errors)
    require("staleWhileRevalidatePublic" in sw, "Public catalogue stale-while-revalidate missing", errors)
    require("if (hasAuthorization(request) || isPrivateApi(url))" in sw, "Authenticated/private requests must be network-only", errors)
    require("fetch(request)" in sw, "Network-only path missing", errors)
    require("set-cookie" in sw.lower(), "Public API cache must reject responses carrying cookies", errors)
    require("caches.delete" in sw, "Old PWA cache eviction missing", errors)

    manifest = text["manifest"]
    require('"display": "standalone"' in manifest, "PWA manifest must be installable", errors)
    require('"lang": "fr-GN"' in manifest, "PWA manifest locale must be fr-GN", errors)

    bootstrap = text["bootstrap"]
    require("serviceWorker.register('/sw.js'" in bootstrap, "Service worker registration missing", errors)
    require("navigator.onLine" in bootstrap, "Network state detection missing", errors)
    require("window.addEventListener('online'" in bootstrap, "Online recovery listener missing", errors)
    require("window.addEventListener('offline'" in bootstrap, "Offline listener missing", errors)

    client_idempotency = text["client_idempotency"]
    require("sessionStorage" in client_idempotency, "Idempotency metadata must be session-scoped", errors)
    require("localStorage" not in client_idempotency, "Idempotency metadata must not use localStorage", errors)
    require("crypto.subtle.digest('SHA-256'" in client_idempotency, "Payload fingerprint must use SHA-256", errors)
    require("JSON.stringify(stableValue(payload))" in client_idempotency, "Stable payload canonicalization missing", errors)
    require("ENTRY_TTL_MS" in client_idempotency, "Client idempotency TTL missing", errors)

    service_client = text["service_requests_client"]
    require("getStableIdempotencyKey" in service_client, "Service request client must obtain stable idempotency key", errors)
    require("Idempotency-Key" in service_client, "Service request creation must send Idempotency-Key", errors)

    middleware = text["middleware"]
    for marker in (
        '"/api/v1/service-requests"',
        "Idempotency-Key",
        "user_id",
        "fingerprint",
        "nx=True",
        "IDEMPOTENCY_KEY_REUSED",
        "IDEMPOTENCY_IN_PROGRESS",
        "Idempotency-Replayed",
        "_MAX_REPLAY_BODY_BYTES",
    ):
        require(marker in middleware, f"Backend idempotency invariant missing: {marker}", errors)
    require("/signatures" not in middleware, "Signature operations must not be replay-cached", errors)
    require("/security" not in middleware, "Security operations must not be replay-cached", errors)
    require("/access" not in middleware, "IAM operations must not be replay-cached", errors)

    main = text["main"]
    require("IdempotencyMiddleware" in main, "Idempotency middleware must be registered", errors)
    require("PwaBootstrap" not in main, "Backend must remain independent of browser PWA code", errors)

    tests = text["tests"]
    for scenario in (
        "same_key_and_payload_replays_success_without_second_mutation",
        "same_key_with_different_payload_is_rejected",
        "key_is_scoped_per_authenticated_user",
        "processing_state_returns_retry_after_without_duplicate_call",
        "invalid_key_is_rejected_before_mutation",
    ):
        require(scenario in tests, f"Idempotency scenario missing: {scenario}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("Low-bandwidth and offline privacy policy: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
