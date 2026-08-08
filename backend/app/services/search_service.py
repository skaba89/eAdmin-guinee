"""PostgreSQL full-text search for the government GED.

Production search authority lives in PostgreSQL, not process memory. Metadata
and persisted OCR are queried through GIN-backed vectors and combined into one
relevance score under the active RLS transaction context.

The repository test suite uses SQLite for API tests. A deliberately isolated
SQLite compatibility path is therefore enabled only when ENVIRONMENT=test; it
exists to exercise routing/filter behaviour without weakening the production
requirement for PostgreSQL full-text search.
"""

import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import AsyncIterator

from sqlalchemy import exists, false, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_factory
from app.models.document import Document, DocumentStatusEnum
from app.models.document_ocr import DocumentOCRResult

logger = logging.getLogger(__name__)


class SearchIndex(str, Enum):
    DOCUMENTS = "documents"
    COURRIERS = "courriers"
    ALL = "all"


@dataclass
class SearchHit:
    document_id: str
    title: str
    description: str | None
    score: float
    snippet: str
    highlights: list[str] = field(default_factory=list)
    institution_id: str | None = None
    status: str | None = None
    file_type: str | None = None


@dataclass
class SearchResult:
    query: str
    total: int
    hits: list[SearchHit]
    page: int
    page_size: int
    facets: dict = field(default_factory=dict)
    search_time_ms: int = 0


# Static SQL only. User-controlled values are passed exclusively as bound
# parameters. Keeping the statement static also prevents Ruff/Bandit S608
# regressions and makes the security boundary obvious during review.
_POSTGRES_SEARCH_SQL = text(
    """
    WITH search_query AS (
        SELECT websearch_to_tsquery('french', :query) AS tsq
    ),
    ranked AS (
        SELECT
            d.id,
            d.title,
            d.description,
            d.institution_id,
            CAST(d.status AS text) AS status,
            d.file_type,
            d.current_version AS version,
            d.created_at,
            d.tags,
            (
                2.0 * ts_rank_cd(
                    to_tsvector(
                        'french',
                        COALESCE(d.title, '') || ' ' ||
                        COALESCE(d.description, '') || ' ' ||
                        COALESCE(d.tags ->> 'reference', '') || ' ' ||
                        COALESCE(d.tags ->> 'document_type', '')
                    ),
                    sq.tsq
                )
                + COALESCE((
                    SELECT MAX(
                        ts_rank_cd(
                            to_tsvector('french', COALESCE(o.extracted_text, '')),
                            sq.tsq
                        )
                    )
                    FROM document_ocr_results o
                    WHERE o.document_id = d.id
                      AND o.version_number = d.current_version
                      AND to_tsvector('french', COALESCE(o.extracted_text, '')) @@ sq.tsq
                ), 0.0)
            ) AS relevance_score,
            COALESCE(
                (
                    SELECT ts_headline(
                        'french',
                        o.extracted_text,
                        sq.tsq,
                        'StartSel=‹, StopSel=›, MaxWords=32, MinWords=12, ShortWord=3, HighlightAll=false'
                    )
                    FROM document_ocr_results o
                    WHERE o.document_id = d.id
                      AND o.version_number = d.current_version
                      AND to_tsvector('french', COALESCE(o.extracted_text, '')) @@ sq.tsq
                    ORDER BY ts_rank_cd(
                        to_tsvector('french', COALESCE(o.extracted_text, '')),
                        sq.tsq
                    ) DESC
                    LIMIT 1
                ),
                ts_headline(
                    'french',
                    COALESCE(d.title, '') || ' ' || COALESCE(d.description, ''),
                    sq.tsq,
                    'StartSel=‹, StopSel=›, MaxWords=32, MinWords=12, ShortWord=3, HighlightAll=false'
                )
            ) AS snippet
        FROM documents d
        CROSS JOIN search_query sq
        WHERE (
            to_tsvector(
                'french',
                COALESCE(d.title, '') || ' ' ||
                COALESCE(d.description, '') || ' ' ||
                COALESCE(d.tags ->> 'reference', '') || ' ' ||
                COALESCE(d.tags ->> 'document_type', '')
            ) @@ sq.tsq
            OR EXISTS (
                SELECT 1
                FROM document_ocr_results o
                WHERE o.document_id = d.id
                  AND o.version_number = d.current_version
                  AND to_tsvector('french', COALESCE(o.extracted_text, '')) @@ sq.tsq
            )
        )
          AND (
              CAST(:tenant_id AS text) IS NULL
              OR d.tenant_id = CAST(:tenant_id AS text)
          )
          AND (
              CAST(:institution_id AS text) IS NULL
              OR d.institution_id = CAST(:institution_id AS text)
          )
          AND (
              CAST(:requested_institution AS text) IS NULL
              OR d.institution_id = CAST(:requested_institution AS text)
          )
          AND (
              CAST(:status AS text) IS NULL
              OR CAST(d.status AS text) = CAST(:status AS text)
          )
          AND (
              CAST(:file_type AS text) IS NULL
              OR d.file_type = CAST(:file_type AS text)
          )
          AND (
              CAST(:classification AS text) IS NULL
              OR d.tags ->> 'classification' = CAST(:classification AS text)
          )
          AND (
              CAST(:document_type AS text) IS NULL
              OR d.tags ->> 'document_type' = CAST(:document_type AS text)
          )
          AND (
              CAST(:date_from AS timestamptz) IS NULL
              OR d.created_at >= CAST(:date_from AS timestamptz)
          )
          AND (
              CAST(:date_to AS timestamptz) IS NULL
              OR d.created_at <= CAST(:date_to AS timestamptz)
          )
    )
    SELECT ranked.*, COUNT(*) OVER() AS total_count
    FROM ranked
    ORDER BY relevance_score DESC, created_at DESC
    LIMIT :limit OFFSET :offset
    """
)


_POSTGRES_FACET_SQL = text(
    """
    WITH search_query AS (
        SELECT websearch_to_tsquery('french', :query) AS tsq
    ),
    matched AS (
        SELECT
            d.id,
            CAST(d.status AS text) AS status,
            COALESCE(d.tags ->> 'classification', 'NON_CLASSÉ') AS classification
        FROM documents d
        CROSS JOIN search_query sq
        WHERE (
            to_tsvector(
                'french',
                COALESCE(d.title, '') || ' ' ||
                COALESCE(d.description, '') || ' ' ||
                COALESCE(d.tags ->> 'reference', '') || ' ' ||
                COALESCE(d.tags ->> 'document_type', '')
            ) @@ sq.tsq
            OR EXISTS (
                SELECT 1
                FROM document_ocr_results o
                WHERE o.document_id = d.id
                  AND o.version_number = d.current_version
                  AND to_tsvector('french', COALESCE(o.extracted_text, '')) @@ sq.tsq
            )
        )
          AND (
              CAST(:tenant_id AS text) IS NULL
              OR d.tenant_id = CAST(:tenant_id AS text)
          )
          AND (
              CAST(:institution_id AS text) IS NULL
              OR d.institution_id = CAST(:institution_id AS text)
          )
          AND (
              CAST(:requested_institution AS text) IS NULL
              OR d.institution_id = CAST(:requested_institution AS text)
          )
          AND (
              CAST(:status AS text) IS NULL
              OR CAST(d.status AS text) = CAST(:status AS text)
          )
          AND (
              CAST(:file_type AS text) IS NULL
              OR d.file_type = CAST(:file_type AS text)
          )
          AND (
              CAST(:classification AS text) IS NULL
              OR d.tags ->> 'classification' = CAST(:classification AS text)
          )
          AND (
              CAST(:document_type AS text) IS NULL
              OR d.tags ->> 'document_type' = CAST(:document_type AS text)
          )
          AND (
              CAST(:date_from AS timestamptz) IS NULL
              OR d.created_at >= CAST(:date_from AS timestamptz)
          )
          AND (
              CAST(:date_to AS timestamptz) IS NULL
              OR d.created_at <= CAST(:date_to AS timestamptz)
          )
    )
    SELECT 'status' AS facet, status AS value, COUNT(*) AS count
    FROM matched
    GROUP BY status
    UNION ALL
    SELECT 'classification' AS facet, classification AS value, COUNT(*) AS count
    FROM matched
    GROUP BY classification
    """
)


class SearchService:
    """GIN-backed full-text search over GED metadata and current-version OCR."""

    def __init__(self) -> None:
        self._search_backend = "postgresql_fts"

    async def index_document(self, document_id: str, content: str, metadata: dict) -> None:
        """Compatibility no-op; PostgreSQL indexes persisted rows transactionally."""
        logger.debug(
            "Ignoring legacy in-memory index request document_id=%s content_length=%s metadata_keys=%s",
            document_id,
            len(content or ""),
            sorted(metadata.keys()),
        )

    @asynccontextmanager
    async def _session_scope(
        self,
        session: AsyncSession | None,
    ) -> AsyncIterator[AsyncSession]:
        if session is not None:
            yield session
            return
        async with async_session_factory() as owned_session:
            yield owned_session

    @staticmethod
    def _params(
        *,
        normalized_query: str,
        filters: dict,
        tenant_id: str | None,
        institution_id: str | None,
        page: int,
        page_size: int,
    ) -> dict:
        return {
            "query": normalized_query,
            "tenant_id": tenant_id,
            "institution_id": institution_id,
            "requested_institution": filters.get("institution"),
            "status": filters.get("status"),
            "file_type": filters.get("file_type"),
            "classification": filters.get("classification"),
            "document_type": filters.get("document_type"),
            "date_from": filters.get("date_from"),
            "date_to": filters.get("date_to"),
            "limit": page_size,
            "offset": (page - 1) * page_size,
        }

    async def search(
        self,
        query: str,
        filters: dict | None = None,
        tenant_id: str | None = None,
        institution_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
        session: AsyncSession | None = None,
    ) -> dict:
        start = time.monotonic()
        normalized_query = " ".join((query or "").split())
        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        if not normalized_query:
            return {
                "query": "",
                "total": 0,
                "results": [],
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
                "facets": {},
                "search_time_ms": int((time.monotonic() - start) * 1000),
                "backend": self._search_backend,
            }
        if len(normalized_query) > 300:
            raise ValueError("La requête de recherche est limitée à 300 caractères.")

        filters = filters or {}
        async with self._session_scope(session) as db:
            dialect_name = db.get_bind().dialect.name
            if dialect_name == "postgresql":
                return await self._search_postgresql(
                    db=db,
                    normalized_query=normalized_query,
                    filters=filters,
                    tenant_id=tenant_id,
                    institution_id=institution_id,
                    page=page,
                    page_size=page_size,
                    start=start,
                )
            if settings.is_test and dialect_name == "sqlite":
                return await self._search_sqlite_test_fallback(
                    db=db,
                    normalized_query=normalized_query,
                    filters=filters,
                    tenant_id=tenant_id,
                    institution_id=institution_id,
                    page=page,
                    page_size=page_size,
                    start=start,
                )
            raise RuntimeError(
                "La recherche GED de production exige PostgreSQL et ses index full-text."
            )

    async def _search_postgresql(
        self,
        *,
        db: AsyncSession,
        normalized_query: str,
        filters: dict,
        tenant_id: str | None,
        institution_id: str | None,
        page: int,
        page_size: int,
        start: float,
    ) -> dict:
        params = self._params(
            normalized_query=normalized_query,
            filters=filters,
            tenant_id=tenant_id,
            institution_id=institution_id,
            page=page,
            page_size=page_size,
        )
        rows = (await db.execute(_POSTGRES_SEARCH_SQL, params)).mappings().all()
        facet_rows = (await db.execute(_POSTGRES_FACET_SQL, params)).mappings().all()

        total = int(rows[0]["total_count"]) if rows else 0
        facets: dict[str, dict[str, int]] = {"status": {}, "classification": {}}
        for row in facet_rows:
            facets.setdefault(str(row["facet"]), {})[str(row["value"])] = int(row["count"])

        results = [
            {
                "document_id": str(row["id"]),
                "title": row["title"],
                "description": row["description"],
                "score": round(float(row["relevance_score"] or 0.0), 6),
                "snippet": row["snippet"] or "",
                "institution_id": row["institution_id"],
                "status": row["status"],
                "file_type": row["file_type"],
                "version": int(row["version"] or 0),
                "reference": (row["tags"] or {}).get("reference"),
                "classification": (row["tags"] or {}).get("classification"),
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
            for row in rows
        ]
        return self._result_payload(
            normalized_query=normalized_query,
            total=total,
            results=results,
            page=page,
            page_size=page_size,
            facets=facets,
            start=start,
            backend=self._search_backend,
        )

    async def _search_sqlite_test_fallback(
        self,
        *,
        db: AsyncSession,
        normalized_query: str,
        filters: dict,
        tenant_id: str | None,
        institution_id: str | None,
        page: int,
        page_size: int,
        start: float,
    ) -> dict:
        """Portable semantic-equivalent path used only by the SQLite API tests."""
        pattern = f"%{normalized_query.casefold()}%"
        metadata_match = or_(
            func.lower(func.coalesce(Document.title, "")).like(pattern),
            func.lower(func.coalesce(Document.description, "")).like(pattern),
            func.lower(func.coalesce(Document.tags["reference"].as_string(), "")).like(pattern),
            func.lower(func.coalesce(Document.tags["document_type"].as_string(), "")).like(pattern),
        )
        ocr_match = exists(
            select(1).where(
                DocumentOCRResult.document_id == Document.id,
                DocumentOCRResult.version_number == Document.current_version,
                func.lower(DocumentOCRResult.extracted_text).like(pattern),
            )
        )
        statement = select(Document).where(or_(metadata_match, ocr_match))

        if tenant_id:
            statement = statement.where(Document.tenant_id == tenant_id)
        if institution_id:
            statement = statement.where(Document.institution_id == institution_id)
        if filters.get("institution"):
            statement = statement.where(Document.institution_id == str(filters["institution"]))
        if filters.get("file_type"):
            statement = statement.where(Document.file_type == str(filters["file_type"]))
        if filters.get("classification"):
            statement = statement.where(
                Document.tags["classification"].as_string() == str(filters["classification"])
            )
        if filters.get("document_type"):
            statement = statement.where(
                Document.tags["document_type"].as_string() == str(filters["document_type"])
            )
        if filters.get("status"):
            try:
                status_value = DocumentStatusEnum(str(filters["status"]))
            except ValueError:
                statement = statement.where(false())
            else:
                statement = statement.where(Document.status == status_value)
        if filters.get("date_from"):
            statement = statement.where(Document.created_at >= filters["date_from"])
        if filters.get("date_to"):
            statement = statement.where(Document.created_at <= filters["date_to"])

        documents = (await db.execute(statement)).scalars().all()
        document_ids = [document.id for document in documents]
        ocr_rows = []
        if document_ids:
            ocr_rows = (
                await db.execute(
                    select(DocumentOCRResult).where(
                        DocumentOCRResult.document_id.in_(document_ids)
                    )
                )
            ).scalars().all()

        ocr_by_document: dict[str, list[DocumentOCRResult]] = {}
        for row in ocr_rows:
            ocr_by_document.setdefault(str(row.document_id), []).append(row)

        query_folded = normalized_query.casefold()
        ranked: list[tuple[float, Document, str]] = []
        for document in documents:
            reference = self._tag_value(document, "reference")
            document_type = self._tag_value(document, "document_type")
            title = document.title or ""
            description = document.description or ""
            metadata_blob = " ".join([title, description, reference, document_type]).casefold()

            score = 0.0
            if query_folded in title.casefold():
                score += 2.0
            elif query_folded in metadata_blob:
                score += 1.5

            current_ocr_texts = [
                row.extracted_text or ""
                for row in ocr_by_document.get(str(document.id), [])
                if row.version_number == document.current_version
            ]
            ocr_text = "\n".join(current_ocr_texts)
            if query_folded in ocr_text.casefold():
                score += 1.0

            snippet_source = ocr_text if query_folded in ocr_text.casefold() else f"{title} {description}"
            ranked.append((score, document, self._plain_snippet(snippet_source, query_folded)))

        ranked.sort(
            key=lambda item: (
                item[0],
                item[1].created_at.timestamp() if item[1].created_at else 0.0,
            ),
            reverse=True,
        )

        total = len(ranked)
        facets: dict[str, dict[str, int]] = {"status": {}, "classification": {}}
        for _score, document, _snippet in ranked:
            status_name = document.status.value if hasattr(document.status, "value") else str(document.status)
            classification = self._tag_value(document, "classification") or "NON_CLASSÉ"
            facets["status"][status_name] = facets["status"].get(status_name, 0) + 1
            facets["classification"][classification] = (
                facets["classification"].get(classification, 0) + 1
            )

        offset = (page - 1) * page_size
        page_rows = ranked[offset : offset + page_size]
        results = [
            {
                "document_id": str(document.id),
                "title": document.title,
                "description": document.description,
                "score": round(score, 6),
                "snippet": snippet,
                "institution_id": document.institution_id,
                "status": document.status.value if hasattr(document.status, "value") else str(document.status),
                "file_type": document.file_type,
                "version": int(document.current_version or 0),
                "reference": self._tag_value(document, "reference") or None,
                "classification": self._tag_value(document, "classification") or None,
                "created_at": document.created_at.isoformat() if document.created_at else None,
            }
            for score, document, snippet in page_rows
        ]
        return self._result_payload(
            normalized_query=normalized_query,
            total=total,
            results=results,
            page=page,
            page_size=page_size,
            facets=facets,
            start=start,
            backend="sqlite_test_fallback",
        )

    @staticmethod
    def _tag_value(document: Document, key: str) -> str:
        value = (document.tags or {}).get(key)
        return str(value) if value is not None else ""

    @staticmethod
    def _plain_snippet(source: str, query_folded: str, radius: int = 90) -> str:
        if not source:
            return ""
        folded = source.casefold()
        position = folded.find(query_folded)
        if position < 0:
            return source[: radius * 2].strip()
        start = max(0, position - radius)
        end = min(len(source), position + len(query_folded) + radius)
        snippet = source[start:end].strip()
        local_position = snippet.casefold().find(query_folded)
        if local_position >= 0:
            end_position = local_position + len(query_folded)
            snippet = (
                snippet[:local_position]
                + "‹"
                + snippet[local_position:end_position]
                + "›"
                + snippet[end_position:]
            )
        return snippet

    @staticmethod
    def _result_payload(
        *,
        normalized_query: str,
        total: int,
        results: list[dict],
        page: int,
        page_size: int,
        facets: dict,
        start: float,
        backend: str,
    ) -> dict:
        return {
            "query": normalized_query,
            "total": total,
            "results": results,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "facets": facets,
            "search_time_ms": int((time.monotonic() - start) * 1000),
            "backend": backend,
        }

    async def remove_from_index(self, document_id: str) -> None:
        logger.debug(
            "No explicit search-index deletion required for document_id=%s; PostgreSQL indexes follow row state.",
            document_id,
        )

    async def reindex_all(self, tenant_id: str | None = None) -> dict:
        """PostgreSQL expression indexes are maintained transactionally."""
        return {
            "reindexed": 0,
            "tenant_id": tenant_id,
            "backend": self._search_backend,
            "message": "Aucune réindexation applicative nécessaire: les index PostgreSQL sont transactionnels.",
        }


search_service = SearchService()
