"""Standalone notification-outbox worker.

Designed for a Kubernetes CronJob, systemd timer or an external scheduler. One
run processes a bounded batch then exits, which keeps operational ownership
explicit and avoids hidden background tasks inside the FastAPI web process.
"""

import asyncio
import logging
import os

from app.database import AsyncSessionLocal
from app.services.notification_outbox import ProviderRegistry, process_outbox_batch

logger = logging.getLogger("eadmin.notification_outbox")


async def run_once() -> dict[str, int]:
    batch_size = max(1, min(500, int(os.getenv("EADMIN_NOTIFICATION_BATCH_SIZE", "50"))))
    registry = ProviderRegistry.from_environment()
    async with AsyncSessionLocal() as db:
        result = await process_outbox_batch(db, registry, batch_size=batch_size)
    logger.info("Notification outbox batch completed: %s", result)
    return result


def main() -> None:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
    asyncio.run(run_once())


if __name__ == "__main__":
    main()
