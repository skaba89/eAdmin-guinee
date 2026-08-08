"""Regression tests for the server-backed GED workspace."""

import hashlib
import uuid
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select

from app.api import document_imports
from app.models.document import Document, DocumentStatusEnum
from app.models.document_version import DocumentVersion


@pytest.mark.asyncio
async def test_atomic_import_persists_exact_hash_and_official_metadata(
    client,
    db_session,
    super_admin_auth_headers,
    monkeypatch,
):
    stored = AsyncMock()
    monkeypatch.setattr(document_imports.object_storage, "put_bytes", stored)
    monkeypatch.setattr(document_imports.object_storage, "delete", AsyncMock())

    content = b"%PDF-1.4\nserver-authoritative-ged-import\n%%EOF\n"
    expected_hash = hashlib.sha256(content).hexdigest()

    response = await client.post(
        "/api/v1/documents/import",
        headers=super_admin_auth_headers,
        data={
            "reference": "A/2026/TEST/001",
            "title": "Arrêté de test GED",
            "document_type": "Arrêté",
            "classification": "CONFIDENTIEL",
            "description": "Preuve d'import atomique",
        },
        files={"file": ("arrete-test.pdf", content, "application/pdf")},
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["file_hash"] == expected_hash
    assert payload["server_stored"] is True
    assert payload["digest_source"] == "server_bytes"
    assert payload["version"] == 1
    assert payload["tags"]["reference"] == "A/2026/TEST/001"
    assert payload["tags"]["document_type"] == "Arrêté"
    assert payload["tags"]["classification"] == "CONFIDENTIEL"

    document_id = uuid.UUID(payload["id"])
    document = (
        await db_session.execute(select(Document).where(Document.id == document_id))
    ).scalar_one()
    version = (
        await db_session.execute(
            select(DocumentVersion).where(DocumentVersion.document_id == document.id)
        )
    ).scalar_one()

    assert document.file_path == version.file_path
    assert document.file_size == len(content)
    assert version.file_hash == expected_hash
    assert version.metadata_["digest_source"] == "server_bytes"
    stored.assert_awaited_once()
    assert stored.await_args.args[1] == content


@pytest.mark.asyncio
async def test_legacy_create_cannot_inject_file_authority(
    client,
    db_session,
    super_admin_auth_headers,
):
    response = await client.post(
        "/api/v1/documents",
        headers=super_admin_auth_headers,
        json={
            "title": "Fiche GED sans fichier",
            "description": "Compatibilité métadonnées",
            "file_path": "../../client-controlled.pdf",
            "file_type": "application/pdf",
            "file_size": 999999,
            "institution_id": "client-controlled-institution",
            "tags": {
                "reference": "META/2026/001",
                "document_type": "Rapport",
                "classification": "PUBLIC",
            },
        },
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["file_path"] is None
    assert payload["file_type"] is None
    assert payload["file_size"] is None
    assert payload["version"] == 0

    document_id = uuid.UUID(payload["id"])
    document = (
        await db_session.execute(select(Document).where(Document.id == document_id))
    ).scalar_one()
    assert document.file_path is None
    assert document.current_version == 0
    versions = (
        await db_session.execute(
            select(DocumentVersion).where(DocumentVersion.document_id == document.id)
        )
    ).scalars().all()
    assert versions == []


@pytest.mark.asyncio
async def test_server_query_filters_and_statistics_use_real_documents(
    client,
    db_session,
    super_admin_user,
    super_admin_auth_headers,
):
    documents = [
        Document(
            title="Rapport secret audit",
            description="Audit interne 2026",
            owner_id=super_admin_user.id,
            status=DocumentStatusEnum.DRAFT,
            tags={
                "reference": "R/SECRET/001",
                "document_type": "Rapport",
                "classification": "SECRET",
            },
        ),
        Document(
            title="Décret approuvé",
            owner_id=super_admin_user.id,
            status=DocumentStatusEnum.APPROVED,
            tags={
                "reference": "D/PUBLIC/001",
                "document_type": "Décret",
                "classification": "PUBLIC",
            },
        ),
        Document(
            title="Arrêté archivé",
            owner_id=super_admin_user.id,
            status=DocumentStatusEnum.ARCHIVED,
            tags={
                "reference": "A/ARCH/001",
                "document_type": "Arrêté",
                "classification": "CONFIDENTIEL",
            },
        ),
    ]
    db_session.add_all(documents)
    await db_session.commit()

    filtered = await client.get(
        "/api/v1/documents",
        headers=super_admin_auth_headers,
        params={
            "search": "audit",
            "classification": "SECRET",
            "document_type": "Rapport",
            "page": 1,
            "page_size": 25,
        },
    )
    assert filtered.status_code == 200, filtered.text
    payload = filtered.json()
    assert payload["total"] == 1
    assert payload["items"][0]["tags"]["reference"] == "R/SECRET/001"

    stats_response = await client.get(
        "/api/v1/documents/statistics",
        headers=super_admin_auth_headers,
    )
    assert stats_response.status_code == 200, stats_response.text
    stats = stats_response.json()
    assert stats["total"] >= 3
    assert stats["sensitive"] >= 2
    assert stats["acts"] >= 2
    assert stats["approved"] >= 1
    assert stats["archived"] >= 1
