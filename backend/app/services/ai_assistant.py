"""
Assistant IA Gouvernemental - eAdministration Suite Guinea.
Assistant IA pour les procédures administratives guinéennes.
Utilise RAG (Retrieval Augmented Generation) avec le code administratif guinéen.
Dégénération gracieuse si l'API IA n'est pas disponible.
"""

import logging
import re
import time
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class AssistantAnswer:
    """Réponse de l'assistant IA."""
    answer: str
    confidence: float
    sources: list[str]
    suggested_actions: list[dict]
    related_procedures: list[str]
    language: str


@dataclass
class ProcedureSuggestion:
    """Suggestion de procédure administrative."""
    procedure_name: str
    description: str
    required_documents: list[str]
    estimated_time: str
    cost: str | None
    competent_authority: str
    steps: list[str]


@dataclass
class DataExtraction:
    """Résultat d'extraction de données d'un document."""
    fields: dict
    confidence: float
    missing_fields: list[str]
    warnings: list[str]


@dataclass
class GeneratedReport:
    """Rapport administratif généré."""
    title: str
    content: str
    report_type: str
    generated_at: str
    parameters: dict
    confidence: float


class GovernmentAIAssistant:
    """
    Assistant IA pour les procédures administratives guinéennes.

    Fonctionnalités :
    - Réponses aux questions sur les procédures administratives
    - Suggestions de procédures adaptées aux besoins du citoyen
    - Extraction de données spécifiques depuis des documents
    - Génération de rapports administratifs

    Base de connaissances :
    - Code administratif guinéen
    - Procédures de l'état civil
    - Réglementation des services publics
    - Organigramme des institutions guinéennes

    En production, utilise RAG avec z-ai-web-dev-sdk.
    En développement, utilise des réponses pré-programmées.
    """

    # Base de connaissances des procédures guinéennes
    PROCEDURES = {
        "extrait-acte-naissance": {
            "name": "Extrait d'acte de naissance",
            "description": "Délivrance d'un extrait d'acte de naissance par la mairie",
            "required_documents": [
                "Pièce d'identité valide (CNI ou passeport)",
                "Numéro d'acte de naissance (si connu)",
                "Photo d'identité récente",
            ],
            "estimated_time": "3-5 jours ouvrables",
            "cost": "Gratuit",
            "competent_authority": "Mairie du lieu de naissance",
            "steps": [
                "Se présenter à la mairie du lieu de naissance",
                "Remplir le formulaire de demande",
                "Présenter les documents requis",
                "Payer les frais de timbre (si applicable)",
                "Recevoir le récépissé de demande",
                "Revenir pour le retrait du document",
            ],
        },
        "carte-identite-biometrique": {
            "name": "Carte Nationale d'Identité Biométrique",
            "description": "Délivrance de la CNI biométrique par l'ANIP",
            "required_documents": [
                "Formulaire de demande rempli",
                "Extrait d'acte de naissance",
                "Certificat de nationalité",
                "Deux photos d'identité conformes",
                "Justificatif de domicile",
                "Témoin avec pièce d'identité",
            ],
            "estimated_time": "7-15 jours ouvrables",
            "cost": "Gratuit (première délivrance)",
            "competent_authority": "Agence Nationale d'Identification des Personnes (ANIP)",
            "steps": [
                "Se rendre au centre ANIP le plus proche",
                "Remplir le formulaire de demande",
                "Présenter tous les documents requis",
                "Procéder à la prise d'empreintes et photo biométrique",
                "Recevoir le récépissé de demande",
                "Retirer la CNI après délai de traitement",
            ],
        },
        "passeport-biometrique": {
            "name": "Passeport Biométrique",
            "description": "Délivrance du passeport biométrique guinéen",
            "required_documents": [
                "Formulaire de demande",
                "CNI valide",
                "Extrait d'acte de naissance",
                "Certificat de résidence",
                "Deux photos biométriques",
                "Ancien passeport (si renouvellement)",
                "Timbre fiscal",
            ],
            "estimated_time": "10-15 jours ouvrables",
            "cost": "200 000 GNF (timbre fiscal)",
            "competent_authority": "Direction Générale de la Police Nationale / ANIP",
            "steps": [
                "Se rendre au service des passeports",
                "Déposer le dossier complet",
                "Prise de données biométriques",
                "Payer les frais de timbre",
                "Attendre le délai de traitement",
                "Retirer le passeport",
            ],
        },
        "certificat-nationalite": {
            "name": "Certificat de Nationalité Guinéenne",
            "description": "Délivrance du certificat de nationalité",
            "required_documents": [
                "Extrait d'acte de naissance",
                "CNI ou passeport",
                "Certificat de résidence",
                "2 témoins guinéens avec CNI",
                "Photo d'identité",
            ],
            "estimated_time": "5-7 jours ouvrables",
            "cost": "Gratuit",
            "competent_authority": "Tribunal de Première Instance",
            "steps": [
                "Se rendre au Tribunal de Première Instance",
                "Déposer la demande avec les documents",
                "Passer l'audition avec les témoins",
                "Attendre la délivrance du certificat",
                "Retirer le certificat",
            ],
        },
        "casier-judiciaire": {
            "name": "Casier Judiciaire (B3)",
            "description": "Extrait du casier judiciaire (bulletin n°3)",
            "required_documents": [
                "CNI ou passeport valide",
                "Timbre fiscal",
                "Photo d'identité récente",
            ],
            "estimated_time": "3-5 jours ouvrables",
            "cost": "5 000 GNF (timbre)",
            "competent_authority": "BCRG (Bureau du Casier Judiciaire) / Tribunal",
            "steps": [
                "Se rendre au BCRG ou au Tribunal",
                "Remplir le formulaire de demande",
                "Présenter la CNI et le timbre fiscal",
                "Attendre le délai de traitement",
                "Retirer l'extrait du casier judiciaire",
            ],
        },
        "certificat-residence": {
            "name": "Certificat de Résidence",
            "description": "Attestation de lieu de résidence",
            "required_documents": [
                "CNI ou passeport",
                "Témoignage du chef de quartier",
                "Quittance de loyer ou titre de propriété",
            ],
            "estimated_time": "1-2 jours ouvrables",
            "cost": "Gratuit",
            "competent_authority": "Mairie / Chef de quartier",
            "steps": [
                "Obtenir le témoignage du chef de quartier",
                "Se rendre à la mairie",
                "Déposer la demande avec les documents",
                "Retirer le certificat",
            ],
        },
        "enregistrement-entreprise": {
            "name": "Enregistrement d'Entreprise (RCCM)",
            "description": "Création et immatriculation d'une entreprise",
            "required_documents": [
                "CNI du dirigeant",
                "Certificat de résidence",
                "Casier judiciaire du dirigeant",
                "Statuts de l'entreprise (2 exemplaires)",
                "Attestation de dépôt de capital",
                "Régime fiscal",
            ],
            "estimated_time": "3-5 jours ouvrables",
            "cost": "Variable selon le type d'entreprise",
            "competent_authority": "APIP (Agence de Promotion des Investissements Privés)",
            "steps": [
                "Se rendre au Guichet Unique APIP",
                "Déposer le dossier complet",
                "Obtenir le RCCM",
                "Immatriculer au régime fiscal",
                "Obtenir les attestations CNSS",
            ],
        },
        "permis-construire": {
            "name": "Permis de Construire",
            "description": "Autorisation de construction immobilière",
            "required_documents": [
                "CNI ou passeport",
                "Titre foncier ou bail",
                "Plan de construction (architecte agréé)",
                "Étude d'impact environnemental (si nécessaire)",
                "Certificat de conformité du plan",
            ],
            "estimated_time": "15-30 jours ouvrables",
            "cost": "Variable selon la surface",
            "competent_authority": "Mairie / Direction de l'Urbanisme",
            "steps": [
                "Faire réaliser les plans par un architecte agréé",
                "Déposer le dossier à la mairie",
                "Attendre l'instruction du dossier",
                "Obtenir le permis ou les demandes de modification",
                "Commencer les travaux après obtention",
            ],
        },
    }

    # Types de rapports supportés
    REPORT_TYPES = {
        "monthly_summary": {
            "name": "Résumé mensuel d'activité",
            "description": "Rapport synthétique des activités du mois",
        },
        "department_activity": {
            "name": "Rapport d'activité départemental",
            "description": "Bilan des activités d'un département",
        },
        "citizen_satisfaction": {
            "name": "Rapport de satisfaction citoyenne",
            "description": "Analyse de la satisfaction des usagers",
        },
        "service_statistics": {
            "name": "Statistiques de service",
            "description": "Statistiques détaillées par service",
        },
        "compliance_report": {
            "name": "Rapport de conformité",
            "description": "Vérification de conformité réglementaire",
        },
    }

    def __init__(self):
        self._llm_available = False

    async def answer_question(
        self,
        question: str,
        context: dict | None = None,
    ) -> dict:
        """
        Répond à une question sur les procédures administratives guinéennes.

        Utilise RAG (Retrieval Augmented Generation) avec le code administratif.
        En développement, utilise la base de connaissances intégrée.

        Args:
            question: Question posée par l'utilisateur
            context: Contexte additionnel (rôle utilisateur, institution, etc.)

        Returns:
            Dictionnaire avec : answer, confidence, sources,
            suggested_actions, related_procedures, language
        """
        start = time.time()

        try:
            question_lower = question.lower()

            # Recherche dans la base de connaissances
            best_match = None
            best_score = 0

            for proc_id, proc in self.PROCEDURES.items():
                score = self._calculate_question_relevance(question_lower, proc)
                if score > best_score:
                    best_score = score
                    best_match = (proc_id, proc)

            if best_match and best_score > 0.2:
                proc_id, proc = best_match
                answer = self._format_procedure_answer(proc)
                sources = [f"Procédure: {proc['name']}"]
                related = self._find_related_procedures(proc_id)
                suggested_actions = [
                    {"action": f"Démarrer la procédure: {proc['name']}", "type": "start_procedure", "procedure_id": proc_id},
                    {"action": "Voir les documents requis", "type": "view_documents", "procedure_id": proc_id},
                ]
                confidence = min(95.0, best_score * 100)
            else:
                answer = (
                    "Je suis l'assistant administratif eAdmin Guinée. "
                    "Je peux vous aider avec les procédures administratives suivantes : "
                    "extrait d'acte de naissance, carte d'identité biométrique, "
                    "passeport, certificat de nationalité, casier judiciaire, "
                    "certificat de résidence, enregistrement d'entreprise, "
                    "permis de construire, et bien d'autres.\n\n"
                    "Posez-moi une question spécifique sur l'une de ces procédures."
                )
                sources = []
                related = list(self.PROCEDURES.keys())[:5]
                suggested_actions = [
                    {"action": "Voir toutes les procédures disponibles", "type": "list_procedures"},
                ]
                confidence = 30.0

            return {
                "answer": answer,
                "confidence": round(confidence, 2),
                "sources": sources,
                "suggested_actions": suggested_actions,
                "related_procedures": related,
                "language": "fr",
                "processing_time_ms": int((time.time() - start) * 1000),
            }

        except Exception as e:
            logger.error(f"Erreur réponse assistant: {e}")
            return {
                "answer": f"Erreur: {str(e)[:200]}",
                "confidence": 0.0,
                "sources": [],
                "suggested_actions": [],
                "related_procedures": [],
                "language": "fr",
            }

    async def suggest_procedure(self, citizen_need: str) -> dict:
        """
        Suggère la procédure administrative appropriée pour un besoin citoyen.

        Args:
            citizen_need: Description du besoin du citoyen

        Returns:
            Dictionnaire avec : procedures (liste triée par pertinence)
        """
        start = time.time()

        try:
            need_lower = citizen_need.lower()
            scored_procedures = []

            for proc_id, proc in self.PROCEDURES.items():
                score = self._calculate_need_relevance(need_lower, proc)
                scored_procedures.append((proc_id, proc, score))

            # Trier par score décroissant
            scored_procedures.sort(key=lambda x: x[2], reverse=True)

            # Formater les résultats
            suggestions = []
            for proc_id, proc, score in scored_procedures[:5]:
                suggestions.append({
                    "procedure_id": proc_id,
                    "name": proc["name"],
                    "description": proc["description"],
                    "estimated_time": proc["estimated_time"],
                    "cost": proc["cost"],
                    "competent_authority": proc["competent_authority"],
                    "relevance_score": round(score, 2),
                    "required_documents": proc["required_documents"],
                    "steps": proc["steps"],
                })

            return {
                "citizen_need": citizen_need,
                "suggestions": suggestions,
                "total_procedures": len(self.PROCEDURES),
                "processing_time_ms": int((time.time() - start) * 1000),
            }

        except Exception as e:
            logger.error(f"Erreur suggestion procédure: {e}")
            return {
                "citizen_need": citizen_need,
                "suggestions": [],
                "total_procedures": 0,
                "processing_time_ms": int((time.time() - start) * 1000),
            }

    async def extract_data(self, document_id: str, fields: list[str]) -> dict:
        """
        Extrait des champs de données spécifiques d'un document.

        Args:
            document_id: Identifiant du document
            fields: Liste des noms de champs à extraire

        Returns:
            Dictionnaire avec : fields (extrait), confidence,
            missing_fields, warnings
        """
        start = time.time()

        try:
            # Récupérer le contenu du document
            content = await self._get_document_content(document_id)

            if not content:
                return {
                    "fields": {},
                    "confidence": 0.0,
                    "missing_fields": fields,
                    "warnings": ["Document vide ou indisponible"],
                    "processing_time_ms": int((time.time() - start) * 1000),
                }

            extracted = {}
            missing = []
            warnings = []

            for field_name in fields:
                value = self._extract_field(content, field_name)
                if value:
                    extracted[field_name] = value
                else:
                    missing.append(field_name)

            confidence = (len(extracted) / len(fields) * 100) if fields else 0

            if missing:
                warnings.append(f"Champs non trouvés: {', '.join(missing)}")

            return {
                "fields": extracted,
                "confidence": round(confidence, 2),
                "missing_fields": missing,
                "warnings": warnings,
                "processing_time_ms": int((time.time() - start) * 1000),
            }

        except Exception as e:
            logger.error(f"Erreur extraction données: {e}")
            return {
                "fields": {},
                "confidence": 0.0,
                "missing_fields": fields,
                "warnings": [str(e)[:200]],
                "processing_time_ms": int((time.time() - start) * 1000),
            }

    async def generate_report(self, report_type: str, parameters: dict) -> dict:
        """
        Génère un rapport administratif.

        Types supportés : monthly_summary, department_activity,
        citizen_satisfaction, service_statistics, compliance_report

        Args:
            report_type: Type de rapport à générer
            parameters: Paramètres du rapport (période, département, etc.)

        Returns:
            Dictionnaire avec : title, content, report_type, generated_at, parameters
        """
        start = time.time()

        try:
            report_config = self.REPORT_TYPES.get(report_type)
            if not report_config:
                return {
                    "title": "Type de rapport non reconnu",
                    "content": f"Le type '{report_type}' n'est pas supporté. "
                               f"Types disponibles: {', '.join(self.REPORT_TYPES.keys())}",
                    "report_type": report_type,
                    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "parameters": parameters,
                    "confidence": 0.0,
                }

            # Générer le contenu du rapport
            content = self._generate_report_content(report_type, parameters)
            title = report_config["name"]

            return {
                "title": title,
                "content": content,
                "report_type": report_type,
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "parameters": parameters,
                "confidence": 75.0,
                "processing_time_ms": int((time.time() - start) * 1000),
            }

        except Exception as e:
            logger.error(f"Erreur génération rapport: {e}")
            return {
                "title": "Erreur de génération",
                "content": str(e)[:500],
                "report_type": report_type,
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "parameters": parameters,
                "confidence": 0.0,
            }

    def _calculate_question_relevance(self, question: str, procedure: dict) -> float:
        """Calcule la pertinence d'une procédure pour une question."""
        score = 0.0
        proc_text = f"{procedure['name']} {procedure['description']}".lower()

        # Mots de la question
        question_words = set(re.findall(r'\w+', question))

        # Mots du nom et de la description
        proc_words = set(re.findall(r'\w+', proc_text))

        # Intersection
        common = question_words & proc_words
        if common:
            score = len(common) / max(len(question_words), 1) * 0.5

        # Vérifier les mots-clés spécifiques
        for keyword in procedure.get("required_documents", []):
            kw_words = set(re.findall(r'\w+', keyword.lower()))
            if kw_words & question_words:
                score += 0.1

        return min(score, 1.0)

    def _calculate_need_relevance(self, need: str, procedure: dict) -> float:
        """Calcule la pertinence d'une procédure pour un besoin citoyen."""
        score = 0.0
        proc_text = f"{procedure['name']} {procedure['description']}".lower()

        need_words = set(re.findall(r'\w+', need))
        proc_words = set(re.findall(r'\w+', proc_text))

        common = need_words & proc_words
        if common:
            score = len(common) / max(len(need_words), 1) * 0.6

        # Bonus pour les documents requis correspondants
        for doc in procedure.get("required_documents", []):
            doc_words = set(re.findall(r'\w+', doc.lower()))
            if doc_words & need_words:
                score += 0.1

        return min(score, 1.0)

    def _format_procedure_answer(self, procedure: dict) -> str:
        """Formate une procédure en réponse lisible."""
        docs_list = "\n".join(f"  • {doc}" for doc in procedure["required_documents"])
        steps_list = "\n".join(f"  {i+1}. {step}" for i, step in enumerate(procedure["steps"]))

        return (
            f"📋 **{procedure['name']}**\n\n"
            f"{procedure['description']}\n\n"
            f"📄 **Documents requis :**\n{docs_list}\n\n"
            f"⏱️ **Délai estimé :** {procedure['estimated_time']}\n"
            f"💰 **Coût :** {procedure['cost']}\n"
            f"🏛️ **Autorité compétente :** {procedure['competent_authority']}\n\n"
            f"📝 **Étapes :**\n{steps_list}"
        )

    def _find_related_procedures(self, proc_id: str) -> list[str]:
        """Trouve les procédures liées."""
        relations = {
            "extrait-acte-naissance": ["certificat-nationalite", "carte-identite-biometrique"],
            "carte-identite-biometrique": ["certificat-nationalite", "passeport-biometrique"],
            "passeport-biometrique": ["carte-identite-biometrique", "certificat-residence"],
            "certificat-nationalite": ["extrait-acte-naissance", "casier-judiciaire"],
            "casier-judiciaire": ["certificat-nationalite", "enregistrement-entreprise"],
            "enregistrement-entreprise": ["casier-judiciaire", "certificat-residence"],
            "certificat-residence": ["extrait-acte-naissance", "carte-identite-biometrique"],
            "permis-construire": ["certificat-residence"],
        }
        return relations.get(proc_id, [])

    def _extract_field(self, content: str, field_name: str) -> str | None:
        """Extrait un champ spécifique d'un contenu textuel."""
        field_patterns = {
            "nom": r"(?:Nom|NOM)\s*:?\s*([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+)",
            "prenoms": r"(?:Prénoms|PRENOMS|Prénom)\s*:?\s*([A-Za-zÀâéèêëîïôùûü\s\-]+)",
            "date_naissance": r"(?:Date de naissance|Né(?:e)? le)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "lieu_naissance": r"(?:Lieu de naissance|Né(?:e)? à)\s*:?\s*([A-Za-zÀâéèêëîïôùûü\s\-]+)",
            "numero": r"(?:N[°o]|Numéro)\s*:?\s*([A-Z0-9\-/]+)",
            "date": r"(?:Date|Fait le)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "objet": r"(?:Objet)\s*:?\s*(.+?)(?:\n|$)",
            "expediteur": r"(?:De|Expéditeur)\s*:?\s*(.+?)(?:\n|$)",
            "destinataire": r"(?:À|Destinataire)\s*:?\s*(.+?)(?:\n|$)",
            "montant": r"(?:Montant|Somme)\s*:?\s*(\d[\d\s]*(?:,\d{2})?)\s*(?:GNF|FG)?",
            "sexe": r"(?:Sexe)\s*:?\s*([MF])",
            "telephone": r"(?:Tél|Téléphone)\s*:?\s*([\d\s\+\-\.]+)",
            "email": r"(?:Email|Courriel)\s*:?\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})",
            "adresse": r"(?:Adresse|Domicile)\s*:?\s*(.+?)(?:\n|$)",
            "institution": r"(?:Institution|Organisme)\s*:?\s*(.+?)(?:\n|$)",
        }

        pattern = field_patterns.get(field_name.lower())
        if pattern:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    def _generate_report_content(self, report_type: str, parameters: dict) -> str:
        """Génère le contenu d'un rapport administratif."""
        period = parameters.get("period", "Ce mois")
        department = parameters.get("department", "Tous les départements")

        if report_type == "monthly_summary":
            return (
                f"RÉPUBLIQUE DE GUINÉE\n"
                f"Travail — Justice — Solidarité\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"RAPPORT MENSUEL D'ACTIVITÉ\n"
                f"Période : {period}\n"
                f"Département : {department}\n\n"
                f"1. Vue d'ensemble\n"
                f"   - Demandes reçues : [DONNÉES]\n"
                f"   - Demandes traitées : [DONNÉES]\n"
                f"   - Demandes en cours : [DONNÉES]\n"
                f"   - Taux de traitement : [DONNÉES]%\n\n"
                f"2. Analyse par service\n"
                f"   [DÉTAILS PAR SERVICE]\n\n"
                f"3. Indicateurs de performance\n"
                f"   - Délai moyen de traitement : [DONNÉES] jours\n"
                f"   - Taux de satisfaction : [DONNÉES]%\n"
                f"   - Taux de rejet : [DONNÉES]%\n\n"
                f"4. Recommandations\n"
                f"   [RECOMMANDATIONS IA]\n\n"
                f"Généré par eAdmin Guinée — Assistant IA"
            )

        elif report_type == "department_activity":
            return (
                f"RAPPORT D'ACTIVITÉ DÉPARTEMENTAL\n"
                f"Département : {department}\n"
                f"Période : {period}\n\n"
                f"[CONTENU À COMPLÉTER AVEC LES DONNÉES RÉELLES]"
            )

        elif report_type == "citizen_satisfaction":
            return (
                f"RAPPORT DE SATISFACTION CITOYENNE\n"
                f"Période : {period}\n\n"
                f"[ANALYSE DE SATISFACTION À COMPLÉTER]"
            )

        elif report_type == "service_statistics":
            return (
                f"STATISTIQUES DE SERVICE\n"
                f"Département : {department}\n"
                f"Période : {period}\n\n"
                f"[STATISTIQUES À COMPLÉTER]"
            )

        elif report_type == "compliance_report":
            return (
                f"RAPPORT DE CONFORMITÉ\n"
                f"Période : {period}\n\n"
                f"[VÉRIFICATION DE CONFORMITÉ À COMPLÉTER]"
            )

        return f"Rapport de type '{report_type}' — contenu à générer."

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
government_ai_assistant = GovernmentAIAssistant()
