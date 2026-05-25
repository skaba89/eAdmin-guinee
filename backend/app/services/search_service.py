"""
Service de recherche et indexation - eAdministration Suite Guinea.
Recherche plein texte et indexation des documents avec isolation multi-tenant.
Supporte le filtrage par institution, statut, classification et RBAC.
"""

import logging
import re
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
from app.models.document import Document, DocumentStatusEnum

logger = logging.getLogger(__name__)


class SearchIndex(str, Enum):
    """Index de recherche disponibles."""
    DOCUMENTS = "documents"
    COURRIERS = "courriers"
    ALL = "all"


@dataclass
class SearchHit:
    """Résultat individuel de recherche."""
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
    """Résultat complet de recherche."""
    query: str
    total: int
    hits: list[SearchHit]
    page: int
    page_size: int
    facets: dict = field(default_factory=dict)
    search_time_ms: int = 0


class SearchService:
    """
    Service de recherche plein texte et d'indexation pour les documents.

    Fonctionnalités :
    - Recherche plein texte avec pertinence
    - Filtrage par institution, statut, type, tags
    - Isolation multi-tenant (RBAC)
    - Facettes pour la navigation par catégorie
    - Snippets et surlignage des termes trouvés

    En production, ce service peut être remplacé par :
    - Elasticsearch / OpenSearch
    - Meilisearch
    - PostgreSQL full-text search (tsvector/tsquery)
    """

    def __init__(self):
        self._search_backend = "postgresql"  # ou "elasticsearch" en production
        self._index_cache: dict[str, dict] = {}  # Cache d'index en mémoire (dev)

    async def index_document(self, document_id: str, content: str, metadata: dict) -> None:
        """
        Indexe un document pour la recherche plein texte.

        En production, cette méthode alimente un index Elasticsearch.
        En développement, utilise un cache en mémoire et la recherche SQL.

        Args:
            document_id: Identifiant unique du document
            content: Contenu textuel du document (extrait via OCR)
            metadata: Métadonnées du document (titre, type, tags, etc.)
        """
        try:
            # Index en mémoire pour le développement
            self._index_cache[document_id] = {
                "content": content.lower(),
                "metadata": metadata,
                "indexed_at": time.time(),
            }

            # Limiter le cache à 10000 entrées
            if len(self._index_cache) > 10000:
                # Supprimer les plus anciens
                sorted_keys = sorted(
                    self._index_cache.keys(),
                    key=lambda k: self._index_cache[k].get("indexed_at", 0)
                )
                for key in sorted_keys[:1000]:
                    del self._index_cache[key]

            logger.debug(f"Document {document_id} indexé pour la recherche")

        except Exception as e:
            logger.error(f"Erreur lors de l'indexation du document {document_id}: {e}")

    async def search(
        self,
        query: str,
        filters: dict | None = None,
        tenant_id: str | None = None,
        institution_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        """
        Recherche plein texte avec filtres et isolation tenant.

        Args:
            query: Terme de recherche
            filters: Filtres additionnels (status, file_type, tags, date_from, date_to)
            tenant_id: Isolation tenant (obligatoire sauf SUPER_ADMIN)
            institution_id: Filtrage par institution
            page: Numéro de page (1-indexed)
            page_size: Nombre de résultats par page

        Returns:
            Dictionnaire avec total, results, page, page_size, facets
        """
        start = time.time()
        filters = filters or {}

        try:
            async with async_session_factory() as session:
                # Construction de la requête de base
                sql_query = select(Document)

                # Isolation multi-tenant
                if tenant_id:
                    sql_query = sql_query.where(Document.tenant_id == tenant_id)

                # Filtrage par institution
                if institution_id:
                    sql_query = sql_query.where(Document.institution_id == institution_id)

                # Recherche plein texte
                if query:
                    search_term = f"%{query}%"
                    sql_query = sql_query.where(
                        or_(
                            Document.title.ilike(search_term),
                            Document.description.ilike(search_term),
                        )
                    )

                # Filtres additionnels
                if filters.get("status"):
                    try:
                        status_enum = DocumentStatusEnum(filters["status"])
                        sql_query = sql_query.where(Document.status == status_enum)
                    except ValueError:
                        pass

                if filters.get("file_type"):
                    sql_query = sql_query.where(Document.file_type == filters["file_type"])

                if filters.get("institution"):
                    sql_query = sql_query.where(Document.institution_id == filters["institution"])

                # Comptage total
                count_query = select(func.count()).select_from(sql_query.subquery())
                total_result = await session.execute(count_query)
                total = total_result.scalar() or 0

                # Pagination
                offset = (page - 1) * page_size
                sql_query = sql_query.order_by(desc(Document.created_at)).offset(offset).limit(page_size)

                result = await session.execute(sql_query)
                documents = result.scalars().all()

                # Calcul des facettes
                facets = await self._compute_facets(session, query, tenant_id, institution_id, filters)

                # Construction des résultats
                hits = []
                for doc in documents:
                    snippet = self._generate_snippet(doc.description or doc.title, query)
                    score = self._calculate_relevance(doc, query)
                    hits.append({
                        "document_id": str(doc.id),
                        "title": doc.title,
                        "description": doc.description,
                        "score": score,
                        "snippet": snippet,
                        "institution_id": doc.institution_id,
                        "status": doc.status.value if hasattr(doc.status, 'value') else str(doc.status),
                        "file_type": doc.file_type,
                        "version": getattr(doc, 'current_version', 1),
                        "created_at": doc.created_at.isoformat() if doc.created_at else None,
                    })

                search_time_ms = int((time.time() - start) * 1000)

                return {
                    "query": query,
                    "total": total,
                    "results": hits,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total + page_size - 1) // page_size,
                    "facets": facets,
                    "search_time_ms": search_time_ms,
                }

        except Exception as e:
            logger.error(f"Erreur lors de la recherche: {e}")
            return {
                "query": query,
                "total": 0,
                "results": [],
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
                "facets": {},
                "search_time_ms": int((time.time() - start) * 1000),
                "error": str(e),
            }

    async def _compute_facets(
        self,
        session: AsyncSession,
        query: str | None,
        tenant_id: str | None,
        institution_id: str | None,
        filters: dict,
    ) -> dict:
        """Calcule les facettes pour la navigation par catégorie."""
        facets = {}

        try:
            # Facette par statut
            base_query = select(Document.status, func.count(Document.id))
            if tenant_id:
                base_query = base_query.where(Document.tenant_id == tenant_id)
            if institution_id:
                base_query = base_query.where(Document.institution_id == institution_id)
            if query:
                search_term = f"%{query}%"
                base_query = base_query.where(
                    or_(Document.title.ilike(search_term), Document.description.ilike(search_term))
                )

            status_query = base_query.group_by(Document.status)
            result = await session.execute(status_query)
            facets["status"] = {str(row[0]): row[1] for row in result.all()}

            # Facette par type de fichier
            type_query = select(Document.file_type, func.count(Document.id))
            if tenant_id:
                type_query = type_query.where(Document.tenant_id == tenant_id)
            if query:
                search_term = f"%{query}%"
                type_query = type_query.where(
                    or_(Document.title.ilike(search_term), Document.description.ilike(search_term))
                )
            type_query = type_query.group_by(Document.file_type)
            result = await session.execute(type_query)
            facets["file_type"] = {str(row[0] or "unknown"): row[1] for row in result.all()}

        except Exception as e:
            logger.debug(f"Erreur calcul facettes: {e}")

        return facets

    def _calculate_relevance(self, document: Document, query: str) -> float:
        """
        Calcule le score de pertinence d'un document pour une requête.

        Prend en compte :
        - Correspondance dans le titre (poids 3x)
        - Correspondance dans la description (poids 1x)
        - Documents récents (bonus)
        - Documents approuvés (bonus)
        """
        if not query:
            return 1.0

        score = 0.0
        query_lower = query.lower()
        query_terms = query_lower.split()

        # Score titre
        title_lower = (document.title or "").lower()
        for term in query_terms:
            if term in title_lower:
                score += 30.0
            elif any(t.startswith(term) for t in title_lower.split()):
                score += 15.0

        # Score description
        desc_lower = (document.description or "").lower()
        for term in query_terms:
            if term in desc_lower:
                score += 10.0

        # Bonus statut approuvé
        if document.status == DocumentStatusEnum.APPROVED:
            score += 5.0

        # Bonus récence (documents des 30 derniers jours)
        if document.created_at:
            from datetime import datetime, timezone, timedelta
            if document.created_at > datetime.now(timezone.utc) - timedelta(days=30):
                score += 5.0

        return min(score, 100.0)

    def _generate_snippet(self, text: str, query: str, max_length: int = 200) -> str:
        """
        Génère un extrait (snippet) du texte avec les termes de recherche surlignés.

        Args:
            text: Texte source
            query: Requête de recherche
            max_length: Longueur maximale du snippet
        """
        if not text or not query:
            return (text or "")[:max_length]

        # Trouver la position du premier match
        text_lower = text.lower()
        query_lower = query.lower()

        pos = text_lower.find(query_lower)
        if pos == -1:
            # Chercher le premier terme
            for term in query_lower.split():
                pos = text_lower.find(term)
                if pos != -1:
                    break

        if pos == -1:
            return text[:max_length] + ("..." if len(text) > max_length else "")

        # Centrer le snippet autour du match
        start = max(0, pos - max_length // 3)
        end = min(len(text), start + max_length)
        snippet = text[start:end]

        if start > 0:
            snippet = "..." + snippet
        if end < len(text):
            snippet = snippet + "..."

        return snippet

    async def remove_from_index(self, document_id: str) -> None:
        """Supprime un document de l'index de recherche."""
        self._index_cache.pop(document_id, None)
        logger.debug(f"Document {document_id} retiré de l'index")

    async def reindex_all(self, tenant_id: str | None = None) -> dict:
        """
        Réindexe tous les documents (opération lourde, à utiliser avec parcimonie).

        Returns:
            Dictionnaire avec le nombre de documents réindexés
        """
        count = 0
        try:
            async with async_session_factory() as session:
                query = select(Document)
                if tenant_id:
                    query = query.where(Document.tenant_id == tenant_id)

                result = await session.execute(query)
                documents = result.scalars().all()

                for doc in documents:
                    await self.index_document(
                        document_id=str(doc.id),
                        content=f"{doc.title} {doc.description or ''}",
                        metadata={
                            "title": doc.title,
                            "status": doc.status.value if hasattr(doc.status, 'value') else str(doc.status),
                            "file_type": doc.file_type,
                            "institution_id": doc.institution_id,
                            "tenant_id": doc.tenant_id,
                        }
                    )
                    count += 1

                logger.info(f"Réindexation terminée: {count} documents")
                return {"reindexed": count, "tenant_id": tenant_id}

        except Exception as e:
            logger.error(f"Erreur lors de la réindexation: {e}")
            return {"reindexed": count, "error": str(e)}


# Singleton
search_service = SearchService()
