"""Integration tests for server-authoritative GED file versions."""

import hashlib
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select

from app.api import document_files
from app.models.document import Document
from app.models.document_version import DocumentVersion


@pytest.mark.asyncio
async def test_upload_version_hashes_exact_server_bytes(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
    monkeypatch,
):
    document = Document(
        title="Décret de test GED",
        description="Document de contrôle d'intégrité",
        owner_id=super_admin_user.id,
    )
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)

    stored = AsyncMock()
    monkeypatch.setattr(document_files.object_storage, "put_bytes", stored)
    monkeypatch.setattr(document_files.object_storage, "delete", AsyncMock())

    content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"
    expected_hash = hashlib.sha256(content).hexdigest()

    response = await client.post(
        f"/api/v1/documents/{document.id}/versions",
        headers=super_admin_auth_headers,
        data={"change_summary": "Version officielle initiale", "change_type": "create"},
        files={"file": ("decret-officiel.pdf", content, "application/pdf")},
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["file_hash"] == expected_hash
    assert payload["digest_source"] == "server_bytes"
    assert payload["server_stored"] is True
    assert payload["version_number"] == 1

    stored.assert_awaited_once()
    object_key, stored_content, content_type = stored.await_args.args
    assert stored_content == content
    assert content_type == "application/pdf"
    assert str(document.id) in object_key

    version = (
        await db_session.execute(
            select(DocumentVersion).where(DocumentVersion.document_id == document.id)
        )
    ).scalar_one()
    assert version.file_hash == expected_hash
    assert version.file_path == object_key
    assert version.metadata_["digest_source"] == "server_bytes"
    assert version.metadata_["storage"] == "object_storage"


@pytest.mark.asyncio
async def test_restore_preserves_original_server_hash(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
    monkeypatch,
):
    document = Document(
        title="Rapport versionné",
        owner_id=super_admin_user.id,
    )
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)

    content = b"%PDF-1.4\nrestorable-content\n%%EOF\n"
    digest = hashlib.sha256(content).hexdigest()
    object_key = f"documents/test/{document.id}/v1/report.pdf"
    source = DocumentVersion(
        document_id=document.id,
        version_number=1,
        file_path=object_key,
        file_size=len(content),
        file_hash=digest,
        change_summary="Version source",
        change_type="create",
        changed_by=super_admin_user.id,
        metadata_={"storage": "object_storage", "digest_source": "server_bytes"},
    )
    db_session.add(source)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/documents/{document.id}/versions/restore",
        headers=super_admin_auth_headers,
        json={"version_number": 1},
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["file_hash"] == digest
    assert payload["version_number"] == 2

    versions = (
        await db_session.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document.id)
            .order_by(DocumentVersion.version_number)
        )
    ).scalars().all()
    assert len(versions) == 2
    assert versions[1].file_hash == digest
    assert versions[1].file_path == object_key
    assert versions[1].metadata_["digest_source"] == "preserved_server_hash"


@pytest.mark.asyncio
async def test_download_uses_short_lived_presigned_url(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
    monkeypatch,
):
    document = Document(title="Note téléchargeable", owner_id=super_admin_user.id)
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)

    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        file_path=f"documents/test/{document.id}/v1/note.pdf",
        file_size=42,
        file_hash="a" * 64,
        change_summary="Initial",
        change_type="create",
        changed_by=super_admin_user.id,
        metadata_={"storage": "object_storage", "digest_source": "server_bytes"},
    )
    db_session.add(version)
    await db_session.commit()

    presigned = AsyncMock(return_value="https://storage.invalid/signed")
    monkeypatch.setattr(document_files.object_storage, "presigned_get_url", presigned)

    response = await client.get(
        f"/api/v1/documents/{document.id}/versions/1/download",
        headers=super_admin_auth_headers,
    )

    assert response.status_code == 200, response.text
    assert response.json() == {
        "url": "https://storage.invalid/signed",
        "expires_minutes": 5,
    }
    presigned.assert_awaited_once_with(version.file_path, expires_minutes=5)
