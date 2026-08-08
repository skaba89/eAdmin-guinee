"""Readiness tests for object storage without mutating bucket state."""

from unittest.mock import MagicMock

import pytest

from app.config import settings
from app.services.object_storage import ObjectStorageService


@pytest.mark.asyncio
async def test_object_storage_healthcheck_returns_true_when_bucket_exists():
    service = ObjectStorageService()
    client = MagicMock()
    client.bucket_exists.return_value = True
    service._client = client

    assert await service.healthcheck() is True
    client.bucket_exists.assert_called_once_with(settings.MINIO_BUCKET_NAME)
    client.make_bucket.assert_not_called()


@pytest.mark.asyncio
async def test_object_storage_healthcheck_returns_false_when_bucket_missing():
    service = ObjectStorageService()
    client = MagicMock()
    client.bucket_exists.return_value = False
    service._client = client

    assert await service.healthcheck() is False
    client.bucket_exists.assert_called_once_with(settings.MINIO_BUCKET_NAME)
    client.make_bucket.assert_not_called()
