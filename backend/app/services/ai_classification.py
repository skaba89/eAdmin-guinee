"""
Service de classification IA - eAdministration Suite Guinea.
Classification automatique des documents et demandes citoyennes.
Routage automatique vers les services compétents.
Dégénération gracieuse si l'API IA n'est pas disponible.
"""

import logging
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class DocumentClassification(str, Enum):
    """Classifications de documents administratifs guinéens."""
    ETAT_CIVIL = "etat_civil"
    IDENTIFICATION = "identification"
    JUSTICE = "justice"
    FISCALITE = "fiscalite"
    URBANISME = "urbanisme"
    ENTERPRISE = "entreprise"
    EDUCATION = "education"
    SANTE = "sante"
    RESIDENCE = "residence"
    SOCIAL = "social"
    DIPLOMATIE = "diplomatie"
    DEFENSE = "defense"
    INTERIEUR = "interieur"
    FINANCES = "finances"
    AGRICULTURE = "agriculture"
    TRANSPORT = "transport"
    COMMUNICATION = "communication"
    AUTRE = "autre"


class PriorityLevel(str, Enum):
    """Niveaux de priorité pour les documents et demandes."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# Mapping des départements guinéens
GUINEAN_DEPARTMENTS = {
    "etat_civil": "Ministère de l'Administration du Territoire et de la Décentralisation",
    "identification": "Agence Nationale d'Identification des Personnes (ANIP)",
    "justice": "Ministère de la Justice",
    "fiscalite": "Ministère de l'Économie et des Finances",
    "urbanisme": "Ministère de l'Habitat et de l'Urbanisme",
    "entreprise": "Agence de Promotion des Investissements Privés (APIP)",
    "education": "Ministère de l'Enseignement Pré-Universitaire",
    "sante": "Ministère de la Santé",
    "residence": "Mairie / Gouvernorat",
    "social": "Ministère de l'Action Sociale",
    "diplomatie": "Ministère des Affaires Étrangères",
    "defense": "Ministère de la Défense Nationale",
    "interieur": "Ministère de l'Intérieur et de la Sécurité",
    "finances": "Ministère de l'Économie et des Finances",
    "agriculture": "Ministère de l'Agriculture",
    "transport": "Ministère des Transports",
    "communication": "Ministère des Postes et Télécommunications",
}


@dataclass
class ClassificationResult:
    """Résultat de classification d'un document."""
    type: str
    priority: str
    department: str
    confidence: float
    suggested_tags: list[str]
    subcategory: str | None = None
    suggested_service: str | None = None


@dataclass
class RequestClassification:
    """Résultat de classification d'une demande citoyenne."""
    category: str
    priority: str
    department: str
    estimated_processing_days: int
    required_documents: list[str]
    confidence: float
    suggested_service: str | None = None


class AIClassificationService:
    """
    Service de classification IA pour les documents et demandes.

    Fonctionnalités :
    - Classification automatique par type, priorité et département
    - Routage automatique vers le service compétent
    - Suggestions de tags et sous-catégories
    - Estimation des délais de traitement
    - Liste des documents requis par type de demande

    En production, utilise z-ai-web-dev-sdk ou un modèle fine-tuné.
    En développement, utilise la classification par mots-clés.
    """

    # Mots-clés de classification par catégorie
    CLASSIFICATION_KEYWORDS: dict[str, list[str]] = {
        DocumentClassification.ETAT_CIVIL.value: [
            "naissance", "mariage", "décès", "acte", "extrait", "certificat",
            "état civil", "déclaration", "mairie",
        ],
        DocumentClassification.IDENTIFICATION.value: [
            "carte d'identité", "cni", "passeport", "biométrique",
            "identification", "anip", "pièce d'identité",
        ],
        DocumentClassification.JUSTICE.value: [
            "casier judiciaire", "tribunal", "justice", "poursuite",
            "legalisation", "légalisation", "recours", "avocat",
        ],
        DocumentClassification.FISCALITE.value: [
            "impôt", "taxe", "fiscal", "revenu", "douane",
            "trésor", "contribution", "patente",
        ],
        DocumentClassification.URBANISME.value: [
            "permis de construire", "urbanisme", "construction", "bâtiment",
            "habitation", "terrain", "lotissement",
        ],
        DocumentClassification.ENTERPRISE.value: [
            "entreprise", "sar", "sas", "rccm", "registre commerce",
            "apip", "immatriculation", "investissement", "création entreprise",
        ],
        DocumentClassification.EDUCATION.value: [
            "école", "université", "diplôme", "scolarité", "baccalauréat",
            "attestation", "relevé notes", "bourse",
        ],
        DocumentClassification.SANTE.value: [
            "santé", "hôpital", "vaccination", "médical", "certificat médical",
            "assurance maladie", "carte sanitaire",
        ],
        DocumentClassification.RESIDENCE.value: [
            "résidence", "domicile", "attestation domicile", "quartier",
            "certificat résidence", "logement",
        ],
        DocumentClassification.SOCIAL.value: [
            "social", "allocation", "famille", "pension", "retraite",
            "aide sociale", "handicap",
        ],
    }

    # Mots-clés de priorité
    PRIORITY_KEYWORDS: dict[str, list[str]] = {
        PriorityLevel.URGENT.value: [
            "urgent", "très urgent", "immédiat", "sécurité", "menace",
            "vie en danger", "crise", "état d'urgence",
        ],
        PriorityLevel.HIGH.value: [
            "important", "prioritaire", "délai", "rapidement",
            "sans délai", "accéléré",
        ],
        PriorityLevel.LOW.value: [
            "information", "pour information", "copie", "archive",
            "référence", "connaissance",
        ],
    }

    # Délais de traitement estimés par catégorie (en jours ouvrables)
    ESTIMATED_PROCESSING_DAYS: dict[str, int] = {
        DocumentClassification.ETAT_CIVIL.value: 3,
        DocumentClassification.IDENTIFICATION.value: 7,
        DocumentClassification.JUSTICE.value: 5,
        DocumentClassification.FISCALITE.value: 10,
        DocumentClassification.URBANISME.value: 15,
        DocumentClassification.ENTERPRISE.value: 5,
        DocumentClassification.EDUCATION.value: 7,
        DocumentClassification.SANTE.value: 3,
        DocumentClassification.RESIDENCE.value: 2,
        DocumentClassification.SOCIAL.value: 10,
    }

    # Documents requis par catégorie de demande
    REQUIRED_DOCUMENTS: dict[str, list[str]] = {
        DocumentClassification.ETAT_CIVIL.value: [
            "Pièce d'identité valide",
            "Extrait d'acte de naissance",
            "Photo d'identité récente",
        ],
        DocumentClassification.IDENTIFICATION.value: [
            "Extrait d'acte de naissance",
            "Certificat de nationalité",
            "Justificatif de domicile",
            "2 photos d'identité conformes",
            "Témoin avec pièce d'identité",
        ],
        DocumentClassification.JUSTICE.value: [
            "Pièce d'identité valide",
            "Timbre fiscal",
        ],
        DocumentClassification.ENTERPRISE.value: [
            "Pièce d'identité du dirigeant",
            "Certificat de résidence",
            "Casier judiciaire",
            "Statuts de l'entreprise",
        ],
    }

    # Tags suggérés par catégorie
    SUGGESTED_TAGS: dict[str, list[str]] = {
        DocumentClassification.ETAT_CIVIL.value: ["état-civil", "naissance", "mariage", "décès"],
        DocumentClassification.IDENTIFICATION.value: ["cni", "passeport", "biométrique", "anip"],
        DocumentClassification.JUSTICE.value: ["justice", "casier", "légalisation"],
        DocumentClassification.ENTERPRISE.value: ["entreprise", "rccm", "apip", "création"],
        DocumentClassification.EDUCATION.value: ["éducation", "diplôme", "scolarité"],
        DocumentClassification.SANTE.value: ["santé", "vaccination", "médical"],
    }

    async def classify_document(self, document_id: str) -> dict:
        """
        Classifie un document par type, priorité et département.

        Args:
            document_id: Identifiant du document à classifier

        Returns:
            Dictionnaire avec : type, priority, department, confidence, suggested_tags
        """
        start = time.time()

        try:
            # Récupérer le contenu du document
            content = await self._get_document_content(document_id)

            if not content or len(content.strip()) < 5:
                return {
                    "type": DocumentClassification.AUTRE.value,
                    "priority": PriorityLevel.MEDIUM.value,
                    "department": GUINEAN_DEPARTMENTS.get(DocumentClassification.AUTRE.value, "Non classifié"),
                    "confidence": 0.0,
                    "suggested_tags": [],
                    "processing_time_ms": int((time.time() - start) * 1000),
                }

            # Classification par mots-clés
            doc_type = self._classify_by_keywords(content)
            priority = self._classify_priority(content)
            department = GUINEAN_DEPARTMENTS.get(doc_type, GUINEAN_DEPARTMENTS[DocumentClassification.AUTRE.value])
            suggested_tags = self.SUGGESTED_TAGS.get(doc_type, ["document", "guinée"])

            # Calcul de la confiance
            confidence = self._calculate_confidence(content, doc_type)

            # Sous-catégorie et service suggéré
            subcategory = self._detect_subcategory(content, doc_type)
            suggested_service = self._suggest_service(doc_type, subcategory)

            return {
                "type": doc_type,
                "priority": priority,
                "department": department,
                "confidence": round(confidence, 2),
                "suggested_tags": suggested_tags,
                "subcategory": subcategory,
                "suggested_service": suggested_service,
                "processing_time_ms": int((time.time() - start) * 1000),
            }

        except Exception as e:
            logger.error(f"Erreur classification document: {e}")
            return {
                "type": DocumentClassification.AUTRE.value,
                "priority": PriorityLevel.MEDIUM.value,
                "department": "Non classifié",
                "confidence": 0.0,
                "suggested_tags": [],
                "processing_time_ms": int((time.time() - start) * 1000),
            }

    async def classify_request(self, request_data: dict) -> dict:
        """
        Classifie une demande de service citoyen.

        Args:
            request_data: Dictionnaire avec les données de la demande
                (service_name, motif, citizen_info, etc.)

        Returns:
            Dictionnaire avec : category, priority, department,
            estimated_processing_days, required_documents, confidence
        """
        start = time.time()

        try:
            # Combiner les champs de la demande pour la classification
            content = " ".join([
                request_data.get("service_name", ""),
                request_data.get("motif", ""),
                request_data.get("description", ""),
                request_data.get("citizen_info", ""),
            ])

            if not content.strip():
                return {
                    "category": DocumentClassification.AUTRE.value,
                    "priority": PriorityLevel.MEDIUM.value,
                    "department": "Non classifié",
                    "estimated_processing_days": 10,
                    "required_documents": ["Pièce d'identité valide"],
                    "confidence": 0.0,
                    "suggested_service": None,
                    "processing_time_ms": int((time.time() - start) * 1000),
                }

            # Classification
            category = self._classify_by_keywords(content)
            priority = self._classify_priority(content)
            department = GUINEAN_DEPARTMENTS.get(category, "Non classifié")
            estimated_days = self.ESTIMATED_PROCESSING_DAYS.get(category, 10)
            required_docs = self.REQUIRED_DOCUMENTS.get(category, ["Pièce d'identité valide"])
            confidence = self._calculate_confidence(content, category)
            suggested_service = self._suggest_service(category, None)

            return {
                "category": category,
                "priority": priority,
                "department": department,
                "estimated_processing_days": estimated_days,
                "required_documents": required_docs,
                "confidence": round(confidence, 2),
                "suggested_service": suggested_service,
                "processing_time_ms": int((time.time() - start) * 1000),
            }

        except Exception as e:
            logger.error(f"Erreur classification demande: {e}")
            return {
                "category": DocumentClassification.AUTRE.value,
                "priority": PriorityLevel.MEDIUM.value,
                "department": "Non classifié",
                "estimated_processing_days": 10,
                "required_documents": ["Pièce d'identité valide"],
                "confidence": 0.0,
                "suggested_service": None,
                "processing_time_ms": int((time.time() - start) * 1000),
            }

    async def auto_route(self, document_id: str) -> dict:
        """
        Route automatiquement un document vers le service/département compétent.

        Args:
            document_id: Identifiant du document à router

        Returns:
            Dictionnaire avec : document_id, target_department, target_service,
            confidence, routing_reason
        """
        try:
            classification = await self.classify_document(document_id)

            return {
                "document_id": document_id,
                "target_department": classification["department"],
                "target_service": classification.get("suggested_service"),
                "classification_type": classification["type"],
                "confidence": classification["confidence"],
                "routing_reason": (
                    f"Document classifié comme '{classification['type']}' "
                    f"avec {classification['confidence']}% de confiance. "
                    f"Routage vers {classification['department']}."
                ),
                "priority": classification["priority"],
            }

        except Exception as e:
            logger.error(f"Erreur routage automatique: {e}")
            return {
                "document_id": document_id,
                "target_department": "Non classifié",
                "confidence": 0.0,
                "routing_reason": f"Erreur de routage: {str(e)[:200]}",
            }

    def _classify_by_keywords(self, content: str) -> str:
        """Classification par mots-clés avec scoring."""
        content_lower = content.lower()
        scores: dict[str, int] = {}

        for category, keywords in self.CLASSIFICATION_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in content_lower)
            if score > 0:
                scores[category] = score

        if scores:
            return max(scores, key=scores.get)

        return DocumentClassification.AUTRE.value

    def _classify_priority(self, content: str) -> str:
        """Classification de la priorité."""
        content_lower = content.lower()

        for level in [PriorityLevel.URGENT, PriorityLevel.HIGH, PriorityLevel.LOW]:
            for keyword in self.PRIORITY_KEYWORDS[level.value]:
                if keyword in content_lower:
                    return level.value

        return PriorityLevel.MEDIUM.value

    def _calculate_confidence(self, content: str, classification: str) -> float:
        """Calcule le score de confiance de la classification."""
        if classification == DocumentClassification.AUTRE.value:
            return 20.0

        content_lower = content.lower()
        keywords = self.CLASSIFICATION_KEYWORDS.get(classification, [])
        matches = sum(1 for kw in keywords if kw in content_lower)
        total = len(keywords)

        if total == 0:
            return 30.0

        base_confidence = min(95.0, (matches / total) * 100 + 30)
        return base_confidence

    def _detect_subcategory(self, content: str, doc_type: str) -> str | None:
        """Détecte la sous-catégorie d'un document."""
        content_lower = content.lower()

        subcategories = {
            DocumentClassification.ETAT_CIVIL.value: {
                "naissance": ["naissance", "né", "née", "acte de naissance"],
                "mariage": ["mariage", "marié", "mariée"],
                "décès": ["décès", "décédé", "mort"],
                "nationalité": ["nationalité", "guinéen", "guinéenne"],
            },
            DocumentClassification.IDENTIFICATION.value: {
                "cni": ["carte d'identité", "cni", "carte nationale"],
                "passeport": ["passeport", "voyage"],
                "permis": ["permis de conduire", "conduite"],
            },
        }

        type_subcategories = subcategories.get(doc_type, {})
        for subcategory, keywords in type_subcategories.items():
            if any(kw in content_lower for kw in keywords):
                return subcategory

        return None

    def _suggest_service(self, doc_type: str, subcategory: str | None) -> str | None:
        """Suggère un service spécifique basé sur la classification."""
        service_mapping = {
            f"{DocumentClassification.ETAT_CIVIL.value}.naissance": "extrait-acte-naissance",
            f"{DocumentClassification.ETAT_CIVIL.value}.mariage": "extrait-acte-mariage",
            f"{DocumentClassification.ETAT_CIVIL.value}.décès": "extrait-acte-deces",
            f"{DocumentClassification.ETAT_CIVIL.value}.nationalité": "certificat-nationalite",
            f"{DocumentClassification.IDENTIFICATION.value}.cni": "carte-identite-biometrique",
            f"{DocumentClassification.IDENTIFICATION.value}.passeport": "passeport-biometrique",
            f"{DocumentClassification.JUSTICE.value}": "casier-judiciaire",
            f"{DocumentClassification.ENTERPRISE.value}": "enregistrement-entreprise",
        }

        if subcategory:
            key = f"{doc_type}.{subcategory}"
            if key in service_mapping:
                return service_mapping[key]

        return service_mapping.get(doc_type)

    async def _get_document_content(self, document_id: str) -> str:
        """Récupère le contenu textuel d'un document."""
        try:
            from app.database import async_session_factory
            from app.models.document import Document
            from sqlalchemy import select
            import uuid

            async with async_session_factory() as session:
                result = await session.execute(
                    select(Document).where(Document.id == uuid.UUID(document_id))
                )
                document = result.scalar_one_or_none()
                if document:
                    parts = [document.title]
                    if document.description:
                        parts.append(document.description)
                    return " ".join(parts)
        except Exception as e:
            logger.debug(f"Erreur récupération contenu: {e}")

        return ""


# Singleton
ai_classification_service = AIClassificationService()
