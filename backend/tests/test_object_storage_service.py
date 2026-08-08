"""Unit tests for the MinIO/S3 administrative object storage abstraction."""

from datetime import timedelta
from types import SimpleNamespace
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
async def test_get_bytes_reads_object_and_always_releases_connection(service):
    client = storage_client()
    response = MagicMock()
    response.read.return_value = b"stored-document"
    client.get_object.return_value = response
    service._client = client

    content = await service.get_bytes("tenant/documents/read.pdf")

    assert content == b"stored-document"
    client.get_object.assert_called_once_with(
        module.settings.MINIO_BUCKET_NAME,
        "tenant/documents/read.pdf",
    )
    response.read.assert_called_once_with(None)
    response.close.assert_called_once_with()
    response.release_conn.assert_called_once_with()


@pytest.mark.asyncio
async def test_get_bytes_honors_size_bound_before_download(service):
    client = storage_client()
    client.stat_object.return_value = SimpleNamespace(size=4)
    response = MagicMock()
    response.read.return_value = b"data"
    client.get_object.return_value = response
    service._client = client

    content = await service.get_bytes("tenant/documents/read.pdf", max_bytes=5)

    assert content == b"data"
    client.stat_object.assert_called_once_with(
        module.settings.MINIO_BUCKET_NAME,
        "tenant/documents/read.pdf",
    )
    response.read.assert_called_once_with(6)
    response.close.assert_called_once_with()
    response.release_conn.assert_called_once_with()


@pytest.mark.asyncio
async def test_get_bytes_rejects_object_larger_than_declared_limit(service):
    client = storage_client()
    client.stat_object.return_value = SimpleNamespace(size=6)
    service._client = client

    with pytest.raises(ValueError, match="exceeds the allowed processing size"):
        await service.get_bytes("tenant/documents/too-large.pdf", max_bytes=5)

    client.get_object.assert_not_called()


@pytest.mark.asyncio
async def test_get_bytes_rejects_stream_that_exceeds_bound_and_still_cleans_up(service):
    client = storage_client()
    client.stat_object.return_value = SimpleNamespace(size=5)
    response = MagicMock()
    response.read.return_value = b"123456"
    client.get_object.return_value = response
    service._client = client

    with pytest.raises(ValueError, match="exceeds the allowed processing size"):
        await service.get_bytes("tenant/documents/stream-too-large.pdf", max_bytes=5)

    response.read.assert_called_once_with(6)
    response.close.assert_called_once_with()
    response.release_conn.assert_called_once_with()


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
