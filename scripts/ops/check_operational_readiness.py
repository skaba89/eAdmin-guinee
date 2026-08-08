"""Static operational policy checks for the national production baseline."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []

    platform_path = ROOT / "infra/kubernetes/base/platform.yaml"
    runbook_path = ROOT / "docs/operations/DISASTER_RECOVERY.md"
    rules_path = ROOT / "monitoring/alerts/eadmin.rules.yml"
    prometheus_path = ROOT / "monitoring/prometheus.production.yml"

    for path in (platform_path, runbook_path, rules_path, prometheus_path):
        require(path.exists(), f"Missing required operational file: {path.relative_to(ROOT)}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    platform = platform_path.read_text(encoding="utf-8")
    runbook = runbook_path.read_text(encoding="utf-8")
    rules = rules_path.read_text(encoding="utf-8")
    prometheus = prometheus_path.read_text(encoding="utf-8")

    require("kind: StatefulSet" not in platform, "Stateful singletons are forbidden in the production app base", errors)
    require(":latest" not in platform, "Mutable :latest image tags are forbidden", errors)
    require(platform.count("replicas: 3") >= 2, "Backend and frontend must start with at least 3 replicas", errors)
    require(platform.count("minReplicas: 3") >= 2, "HPAs must keep at least 3 replicas", errors)
    require(platform.count("kind: PodDisruptionBudget") >= 2, "Backend and frontend require PodDisruptionBudgets", errors)
    require("path: /health/live" in platform, "Backend liveness probe is required", errors)
    require("path: /health/ready" in platform, "Backend dependency readiness probe is required", errors)
    require(platform.count("readOnlyRootFilesystem: true") >= 2, "Application containers must use read-only root filesystems", errors)
    require(platform.count('drop: ["ALL"]') >= 2, "Linux capabilities must be dropped", errors)
    require("kind: Secret" not in platform, "Runtime secrets must not be committed in the Kubernetes base", errors)

    for token in ("RPO", "RTO", "PITR", "mensuel", "trimestriel", "checksum"):
        require(token in runbook, f"PRA runbook missing required concept: {token}", errors)

    required_alerts = (
        "EAdminBackendDown",
        "EAdminHighServerErrorRate",
        "EAdminHighP95Latency",
        "EAdminPostgresExporterDown",
        "EAdminRedisExporterDown",
        "EAdminAuthenticationFailureSpike",
    )
    for alert in required_alerts:
        require(f"alert: {alert}" in rules, f"Missing required alert rule: {alert}", errors)

    require("rule_files:" in prometheus, "Production Prometheus must load alert rules", errors)
    require("alertmanagers:" in prometheus, "Production Prometheus must forward alerts", errors)
    require("postgres-exporter:9187" in prometheus, "PostgreSQL exporter must be scraped", errors)
    require("redis-exporter:9121" in prometheus, "Redis exporter must be scraped", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("Operational resilience policy: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
