"""Unit tests for the MinIO/S3 administrative object storage abstraction."""

from datetime import timedelta
from unittest.mock import MagicMock

import pytest
import app.services.object_storage as module

from app.services.object_storage import ObjectStorageService


@pytest.fixture
def service() -> ObjectStorageService:
    return ObjectStorageService()


def storage_client(*, bucket_exists: bool = True) -> MagicMock:
    client = MagicMock()
    client.bucket_exists.return_value = bucket_exists
    client.presigned_get_object.return_value = "https://storage.example/presigned"
    return client


def test_get_client_is_lazy_and_cached(monkeypatch, service):
    client = storage_client()
    minio_factory = MagicMock(return_value=client)
    monkeypatch.setattr(module, "Minio", minio_factory)

    assert service._get_client() is client
    assert service._get_client() is client
    minio_factory.assert_called_once_with(
        module.settings.MINIO_ENDPOINT,
        access_key=module.settings.MINIO_ACCESS_KEY,
        secret_key=module.settings.MINIO_SECRET_KEY,
        secure=module.settings.MINIO_SECURE,
    )


def test_ensure_bucket_reuses_existing_bucket(service):
    client = storage_client(bucket_exists=True)
    service._client = client

    service._ensure_bucket_sync()
    service._ensure_bucket_sync()

    client.bucket_exists.assert_called_once_with(module.settings.MINIO_BUCKET_NAME)
    client.make_bucket.assert_not_called()
    assert service._bucket_ready is True


def test_ensure_bucket_creates_missing_bucket(service):
    client = storage_client(bucket_exists=False)
    service._client = client

    service._ensure_bucket_sync()

    client.make_bucket.assert_called_once_with(module.settings.MINIO_BUCKET_NAME)
    assert service._bucket_ready is True


@pytest.mark.asyncio
async def test_put_bytes_stores_content_with_default_content_type(service):
    client = storage_client()
    service._client = client

    payload = b"administrative-document"
    await service.put_bytes("tenant/documents/a.pdf", payload, "")

    client.put_object.assert_called_once()
    args, kwargs = client.put_object.call_args
    assert args[0] == module.settings.MINIO_BUCKET_NAME
    assert args[1] == "tenant/documents/a.pdf"
    assert kwargs["length"] == len(payload)
    assert kwargs["content_type"] == "application/octet-stream"
    assert args[2].read() == payload


@pytest.mark.asyncio
async def test_put_bytes_preserves_declared_content_type(service):
    client = storage_client()
    service._client = client

    await service.put_bytes("tenant/documents/a.pdf", b"%PDF", "application/pdf")

    assert client.put_object.call_args.kwargs["content_type"] == "application/pdf"


@pytest.mark.asyncio
async def test_delete_removes_object(service):
    client = storage_client()
    service._client = client

    await service.delete("tenant/documents/remove.pdf")

    client.remove_object.assert_called_once_with(
        module.settings.MINIO_BUCKET_NAME,
        "tenant/documents/remove.pdf",
    )


@pytest.mark.asyncio
async def test_presigned_url_uses_short_expiration(service):
    client = storage_client()
    service._client = client

    url = await service.presigned_get_url("tenant/documents/read.pdf", expires_minutes=7)

    assert url == "https://storage.example/presigned"
    client.presigned_get_object.assert_called_once_with(
        module.settings.MINIO_BUCKET_NAME,
        "tenant/documents/read.pdf",
        expires=timedelta(minutes=7),
    )
