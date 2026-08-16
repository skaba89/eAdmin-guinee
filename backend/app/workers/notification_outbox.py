"""Standalone notification-outbox worker.

Designed for a Kubernetes CronJob, systemd timer or an external scheduler. One
run processes a bounded batch then exits, which keeps operational ownership
explicit and avoids hidden background tasks inside the FastAPI web process.
"""

import asyncio
import logging
import os

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.services.notification_outbox import ProviderRegistry, process_outbox_batch

logger = logging.getLogger("eadmin.notification_outbox")


def _empty_counters() -> dict[str, int]:
    return {
        "claimed": 0,
        "sent": 0,
        "retry": 0,
        "dead_letter": 0,
        "blocked": 0,
        "recovered": 0,
        "lost_claim": 0,
    }


def _merge_counters(target: dict[str, int], source: dict[str, int]) -> None:
    for key, value in source.items():
        target[key] = target.get(key, 0) + int(value)


async def _active_tenant_ids() -> list[str]:
    # ``tenants`` is the control-plane directory used to discover scopes. The
    # outbox itself remains FORCE-RLS protected and is never scanned globally.
    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            select(Tenant.id).where(Tenant.is_active.is_(True)).order_by(Tenant.id)
        )
        return [str(value) for value in rows.scalars().all()]


async def run_once() -> dict[str, int]:
    batch_size = max(1, min(500, int(os.getenv("EADMIN_NOTIFICATION_BATCH_SIZE", "50"))))
    registry = ProviderRegistry.from_environment()
    tenant_ids = await _active_tenant_ids()
    counters = _empty_counters()
    remaining = batch_size

    for index, tenant_id in enumerate(tenant_ids):
        if remaining <= 0:
            break
        tenants_left = len(tenant_ids) - index
        quota = max(1, remaining // max(1, tenants_left))
        async with AsyncSessionLocal() as db:
            result = await process_outbox_batch(
                db,
                registry,
                tenant_id=tenant_id,
                batch_size=quota,
            )
        _merge_counters(counters, result)
        remaining -= int(result.get("claimed", 0))

    logger.info("Notification outbox batch completed: %s", counters)
    return counters


def main() -> None:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
    asyncio.run(run_once())


if __name__ == "__main__":
    main()
