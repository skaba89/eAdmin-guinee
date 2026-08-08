"""PostgreSQL full-text search for the government GED.

Search authority lives in PostgreSQL, not process memory. Metadata and persisted
OCR are queried through separate GIN-backed vectors and combined into one
relevance score under the active RLS transaction context.
"""

import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory

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


_METADATA_VECTOR = """
to_tsvector(
    'french',
    COALESCE(d.title, '') || ' ' ||
    COALESCE(d.description, '') || ' ' ||
    COALESCE(d.tags ->> 'reference', '') || ' ' ||
    COALESCE(d.tags ->> 'document_type', '')
)
""".strip()

_OCR_VECTOR = "to_tsvector('french', COALESCE(o.extracted_text, ''))"


class SearchService:
    """GIN-backed full-text search over GED metadata and current-version OCR."""

    def __init__(self) -> None:
        self._search_backend = "postgresql_fts"

    async def index_document(self, document_id: str, content: str, metadata: dict) -> None:
        """Compatibility no-op.

        OCR indexing is now transactional: `document_ocr_results` is persisted by
        the OCR API and covered by a PostgreSQL GIN index. Keeping a second
        process-memory index would create stale, node-local search authority.
        """
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

    def _build_filters(
        self,
        *,
        filters: dict,
        tenant_id: str | None,
        institution_id: str | None,
    ) -> tuple[list[str], dict]:
        conditions: list[str] = []
        params: dict = {}

        if tenant_id:
            conditions.append("d.tenant_id = :tenant_id")
            params["tenant_id"] = tenant_id
        if institution_id:
            conditions.append("d.institution_id = :institution_id")
            params["institution_id"] = institution_id

        status_value = filters.get("status")
        if status_value:
            conditions.append("CAST(d.status AS text) = :status")
            params["status"] = str(status_value)

        file_type = filters.get("file_type")
        if file_type:
            conditions.append("d.file_type = :file_type")
            params["file_type"] = str(file_type)

        requested_institution = filters.get("institution")
        if requested_institution:
            conditions.append("d.institution_id = :requested_institution")
            params["requested_institution"] = str(requested_institution)

        classification = filters.get("classification")
        if classification:
            conditions.append("d.tags ->> 'classification' = :classification")
            params["classification"] = str(classification)

        document_type = filters.get("document_type")
        if document_type:
            conditions.append("d.tags ->> 'document_type' = :document_type")
            params["document_type"] = str(document_type)

        date_from = filters.get("date_from")
        if date_from:
            conditions.append("d.created_at >= :date_from")
            params["date_from"] = date_from

        date_to = filters.get("date_to")
        if date_to:
            conditions.append("d.created_at <= :date_to")
            params["date_to"] = date_to

        return conditions, params

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
        if not normalized_query:
            return {
                "query": "",
                "total": 0,
                "results": [],
                "page": max(1, page),
                "page_size": min(max(1, page_size), 100),
                "total_pages": 0,
                "facets": {},
                "search_time_ms": int((time.monotonic() - start) * 1000),
                "backend": self._search_backend,
            }
        if len(normalized_query) > 300:
            raise ValueError("La requête de recherche est limitée à 300 caractères.")

        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        filters = filters or {}
        filter_conditions, params = self._build_filters(
            filters=filters,
            tenant_id=tenant_id,
            institution_id=institution_id,
        )

        params.update(
            {
                "query": normalized_query,
                "limit": page_size,
                "offset": (page - 1) * page_size,
            }
        )

        metadata_match = f"({_METADATA_VECTOR}) @@ sq.tsq"
        ocr_match = f"""
EXISTS (
    SELECT 1
    FROM document_ocr_results o
    WHERE o.document_id = d.id
      AND o.version_number = d.current_version
      AND ({_OCR_VECTOR}) @@ sq.tsq
)
""".strip()

        where_parts = [f"({metadata_match} OR {ocr_match})", *filter_conditions]
        where_clause = " AND ".join(where_parts)

        search_sql = text(
            f"""
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
                        2.0 * ts_rank_cd(({_METADATA_VECTOR}), sq.tsq)
                        + COALESCE((
                            SELECT MAX(ts_rank_cd(({_OCR_VECTOR}), sq.tsq))
                            FROM document_ocr_results o
                            WHERE o.document_id = d.id
                              AND o.version_number = d.current_version
                              AND ({_OCR_VECTOR}) @@ sq.tsq
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
                              AND ({_OCR_VECTOR}) @@ sq.tsq
                            ORDER BY ts_rank_cd(({_OCR_VECTOR}), sq.tsq) DESC
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
                WHERE {where_clause}
            )
            SELECT
                ranked.*,
                COUNT(*) OVER() AS total_count
            FROM ranked
            ORDER BY relevance_score DESC, created_at DESC
            LIMIT :limit OFFSET :offset
            """
        )

        facet_sql = text(
            f"""
            WITH search_query AS (
                SELECT websearch_to_tsquery('french', :query) AS tsq
            ),
            matched AS (
                SELECT d.id, CAST(d.status AS text) AS status,
                       COALESCE(d.tags ->> 'classification', 'NON_CLASSÉ') AS classification
                FROM documents d
                CROSS JOIN search_query sq
                WHERE {where_clause}
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

        async with self._session_scope(session) as db:
            rows = (await db.execute(search_sql, params)).mappings().all()
            facet_rows = (await db.execute(facet_sql, params)).mappings().all()

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

        return {
            "query": normalized_query,
            "total": total,
            "results": results,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "facets": facets,
            "search_time_ms": int((time.monotonic() - start) * 1000),
            "backend": self._search_backend,
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
