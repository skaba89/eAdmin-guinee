"""Run one bounded SOC correlation batch.

Designed for a Kubernetes CronJob or dedicated worker process. Multiple workers
are safe because the PostgreSQL query uses FOR UPDATE SKIP LOCKED.
"""

from __future__ import annotations

import asyncio
import json
import os

from app.database import async_session_factory
from app.services.soc_service import soc_service


def _batch_size() -> int:
    raw = os.getenv("SOC_CORRELATOR_BATCH_SIZE", "500")
    try:
        value = int(raw)
    except ValueError as exc:
        raise RuntimeError("SOC_CORRELATOR_BATCH_SIZE must be an integer") from exc
    if not 1 <= value <= 2000:
        raise RuntimeError("SOC_CORRELATOR_BATCH_SIZE must be between 1 and 2000")
    return value


async def run_once() -> dict[str, int]:
    async with async_session_factory() as db:
        result = await soc_service.correlate_unprocessed(db, limit=_batch_size())
        await db.commit()
        return result


async def main() -> None:
    result = await run_once()
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    asyncio.run(main())
