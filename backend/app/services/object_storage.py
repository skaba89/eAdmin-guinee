"""MinIO/S3 object storage abstraction for administrative attachments."""

import asyncio
import io
import logging
from datetime import timedelta

from minio import Minio

from app.config import settings

logger = logging.getLogger("eadmin.object_storage")


class ObjectStorageService:
    def __init__(self) -> None:
        self._client: Minio | None = None
        self._bucket_ready = False

    def _get_client(self) -> Minio:
        if self._client is None:
            self._client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
            )
        return self._client

    def _ensure_bucket_sync(self) -> None:
        if self._bucket_ready:
            return
        client = self._get_client()
        bucket = settings.MINIO_BUCKET_NAME
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
        self._bucket_ready = True

    async def put_bytes(self, object_key: str, content: bytes, content_type: str) -> None:
        def _put() -> None:
            self._ensure_bucket_sync()
            self._get_client().put_object(
                settings.MINIO_BUCKET_NAME,
                object_key,
                io.BytesIO(content),
                length=len(content),
                content_type=content_type or "application/octet-stream",
            )

        await asyncio.to_thread(_put)
        logger.info("Stored administrative object key=%s size=%s", object_key, len(content))

    async def get_bytes(self, object_key: str, max_bytes: int | None = None) -> bytes:
        """Read an object into memory with an optional fail-closed size bound."""

        def _get() -> bytes:
            self._ensure_bucket_sync()
            client = self._get_client()
            if max_bytes is not None:
                stat = client.stat_object(settings.MINIO_BUCKET_NAME, object_key)
                if stat.size is not None and stat.size > max_bytes:
                    raise ValueError(
                        f"Object {object_key!r} exceeds the allowed processing size "
                        f"({stat.size} > {max_bytes} bytes)."
                    )

            response = client.get_object(settings.MINIO_BUCKET_NAME, object_key)
            try:
                content = response.read(max_bytes + 1 if max_bytes is not None else None)
                if max_bytes is not None and len(content) > max_bytes:
                    raise ValueError(
                        f"Object {object_key!r} exceeds the allowed processing size."
                    )
                return content
            finally:
                response.close()
                response.release_conn()

        content = await asyncio.to_thread(_get)
        logger.info("Read administrative object key=%s size=%s", object_key, len(content))
        return content

    async def healthcheck(self) -> bool:
        """Check that the configured bucket exists without mutating storage state."""

        def _check() -> bool:
            return bool(
                self._get_client().bucket_exists(settings.MINIO_BUCKET_NAME)
            )

        return await asyncio.to_thread(_check)

    async def delete(self, object_key: str) -> None:
        def _delete() -> None:
            self._ensure_bucket_sync()
            self._get_client().remove_object(settings.MINIO_BUCKET_NAME, object_key)

        await asyncio.to_thread(_delete)

    async def presigned_get_url(self, object_key: str, expires_minutes: int = 10) -> str:
        def _url() -> str:
            self._ensure_bucket_sync()
            return self._get_client().presigned_get_object(
                settings.MINIO_BUCKET_NAME,
                object_key,
                expires=timedelta(minutes=expires_minutes),
            )

        return await asyncio.to_thread(_url)


object_storage = ObjectStorageService()
