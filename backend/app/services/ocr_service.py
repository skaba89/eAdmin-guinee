"""
Service OCR - eAdministration Suite Guinea.
Reconnaissance optique de caractères pour la numérisation de documents.
Supporte l'extraction de texte et de données structurées à partir de documents guinéens.
Dégénération gracieuse si Tesseract ou les APIs cloud ne sont pas disponibles.
"""

import hashlib
import logging
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class DocumentType(str, Enum):
    """Types de documents administratifs guinéens supportés pour l'extraction structurée."""
    ACTE_NAISSANCE = "acte_naissance"
    ACTE_MARIAGE = "acte_mariage"
    ACTE_DECES = "acte_deces"
    CERTIFICAT_NATIONALITE = "certificat_nationalite"
    CERTIFICAT_RESIDENCE = "certificat_residence"
    CARTE_IDENTITE = "carte_identite"
    PASSEPORT = "passeport"
    PERMIS_CONDUIRE = "permis_conduire"
    CASIER_JUDICIAIRE = "casier_judiciaire"
    LETTRE_OFFICIELLE = "lettre_officielle"
    ARRETE = "arrete"
    CERTIFICAT = "certificat"
    FACTURE = "facture"
    AUTRE = "autre"


@dataclass
class OCRResult:
    """Résultat du traitement OCR."""
    text: str
    confidence: float  # 0-100
    language: str
    page_count: int
    processing_time_ms: int
    engine: str


@dataclass
class StructuredExtraction:
    """Résultat de l'extraction structurée d'un document."""
    document_type: DocumentType
    confidence: float
    fields: dict = field(default_factory=dict)
    raw_text: str = ""
    warnings: list[str] = field(default_factory=list)


class OCRService:
    """
    Service OCR pour l'extraction de texte à partir de documents numérisés.

    En production, ce service peut utiliser :
    - Tesseract OCR (open source, auto-hébergé)
    - Google Cloud Vision API
    - AWS Textract
    - Azure Form Recognizer

    Pour l'instant, fournit une extraction basée sur les métadonnées
    et des patterns regex pour les documents guinéens.
    """

    SUPPORTED_FORMATS = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpeg',
        'image/png': 'png',
        'image/tiff': 'tiff',
        'image/webp': 'webp',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    }

    # Patterns pour l'extraction structurée des documents guinéens
    GUINEAN_PATTERNS = {
        DocumentType.ACTE_NAISSANCE: {
            "num_acte": r"N[°o]\s*:?\s*([A-Z0-9\-/]+)",
            "nom": r"(?:Nom|NOM)\s*:?\s*([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+)",
            "prenoms": r"(?:Prénoms|PRENOMS|Prénom)\s*:?\s*([A-Za-zÀâéèêëîïôùûü\s\-]+)",
            "date_naissance": r"(?:Date de naissance|Né(?:e)? le)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "lieu_naissance": r"(?:Lieu de naissance|Né(?:e)? à)\s*:?\s*([A-Za-zÀâéèêëîïôùûü\s\-]+)",
            "sexe": r"(?:Sexe)\s*:?\s*([MF])",
            "pere": r"(?:Fils|Fille) de\s*:?\s*([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+)",
            "mere": r"(?:et de|Fille de)\s*:?\s*([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+)",
        },
        DocumentType.CERTIFICAT_NATIONALITE: {
            "num_certificat": r"N[°o]\s*:?\s*([A-Z0-9\-/]+)",
            "nom": r"(?:Nom|NOM)\s*:?\s*([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+)",
            "prenoms": r"(?:Prénoms|PRENOMS)\s*:?\s*([A-Za-zÀâéèêëîïôùûü\s\-]+)",
            "date_naissance": r"(?:Né(?:e)? le)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "lieu_naissance": r"(?:à)\s+([A-Za-zÀâéèêëîïôùûü\s\-]+)",
        },
        DocumentType.CARTE_IDENTITE: {
            "num_cni": r"(?:N[°o]\s*CNI|CNI)\s*:?\s*([A-Z0-9]+)",
            "nom": r"(?:Nom|NOM)\s*:?\s*([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+)",
            "prenoms": r"(?:Prénoms|PRENOMS)\s*:?\s*([A-Za-zÀâéèêëîïôùûü\s\-]+)",
            "date_naissance": r"(?:Né(?:e)? le)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "date_expiration": r"(?:Expire le|Valable jusqu'au)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        },
        DocumentType.LETTRE_OFFICIELLE: {
            "expediteur": r"(?:De|Expéditeur)\s*:?\s*(.+)",
            "destinataire": r"(?:À|Destinataire)\s*:?\s*(.+)",
            "objet": r"(?:Objet|Réf)\s*:?\s*(.+)",
            "date": r"(?:Conakry,?\s+le|Fait à .+,?\s+le)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "reference": r"(?:Référence|Réf\.)\s*:?\s*([A-Z0-9\-/.]+)",
        },
        DocumentType.ARRETE: {
            "num_arrete": r"(?:Arrêté|ARRETE)\s+N[°o]\s*([A-Z0-9\-/]+)",
            "date_arrete": r"(?:du)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "autorite": r"(?:Le Ministre|Le Directeur|Le Préfet|Le Gouverneur)\s+(.+?)(?:,|arrête)",
            "objet": r"(?:Objet)\s*:?\s*(.+)",
        },
        DocumentType.CERTIFICAT: {
            "type_certificat": r"(?:CERTIFICAT|ATTESTATION)\s+(?:DE|D')\s*(.+?)(?:\n|$)",
            "nom": r"(?:Nom|NOM)\s*:?\s*([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+)",
            "date": r"(?:Fait à|Émis le)\s+.+,?\s+le\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "autorite": r"(?:Le|La|Signé par)\s+(.+?)(?:,|\n)",
        },
    }

    def __init__(self):
        self.engine = "stub"
        self._tesseract_available = False
        self._check_tesseract()

    def _check_tesseract(self):
        """Vérifie si Tesseract OCR est disponible sur le système."""
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            self._tesseract_available = True
            self.engine = "tesseract"
            logger.info("Tesseract OCR détecté et disponible")
        except Exception:
            self._tesseract_available = False
            logger.info("Tesseract OCR non disponible — utilisation du mode stub")

    async def extract_text(self, file_path: str, language: str = "fra") -> dict:
        """
        Extrait le texte d'un document numérisé (PDF, images).

        Args:
            file_path: Chemin vers le fichier (MinIO/S3 ou local)
            language: Langue du document (fra=français, en=anglais, nko=N'Ko)

        Returns:
            Dictionnaire avec : text, confidence, pages, language, engine
        """
        start = time.time()

        # Déterminer le type de fichier
        file_type = self._guess_file_type(file_path)
        if file_type not in self.SUPPORTED_FORMATS:
            return {
                "text": "",
                "confidence": 0.0,
                "pages": 0,
                "language": language,
                "engine": self.engine,
                "error": f"Format non supporté: {file_type}",
            }

        # Si Tesseract est disponible, l'utiliser
        if self._tesseract_available:
            try:
                result = await self._extract_with_tesseract(file_path, language)
                processing_time = int((time.time() - start) * 1000)
                result["processing_time_ms"] = processing_time
                return result
            except Exception as e:
                logger.warning(f"Tesseract a échoué, fallback stub: {e}")

        # Fallback : extraction stub
        processing_time = int((time.time() - start) * 1000)
        return {
            "text": self._generate_stub_text(file_path, file_type, language),
            "confidence": 50.0,
            "pages": 1,
            "language": language,
            "engine": self.engine,
            "processing_time_ms": processing_time,
        }

    async def _extract_with_tesseract(self, file_path: str, language: str) -> dict:
        """Extraction OCR avec Tesseract."""
        import pytesseract
        from PIL import Image

        # Support PDF multipage via pdf2image
        if file_path.lower().endswith('.pdf'):
            try:
                from pdf2image import convert_from_path
                pages = convert_from_path(file_path)
                all_text = []
                for i, page in enumerate(pages):
                    text = pytesseract.image_to_string(page, lang=language)
                    all_text.append(text)
                return {
                    "text": "\n\n--- Page {} ---\n\n".join(all_text).format(*range(1, len(pages) + 1)),
                    "confidence": 85.0,
                    "pages": len(pages),
                    "language": language,
                    "engine": "tesseract",
                }
            except ImportError:
                logger.warning("pdf2image non installé — impossible d'extraire les PDF multipage")
        else:
            # Image unique
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img, lang=language)
            try:
                data = pytesseract.image_to_data(img, lang=language, output_type=pytesseract.Output.DICT)
                confidences = [int(c) for c in data['conf'] if int(c) > 0]
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            except Exception:
                avg_confidence = 80.0

            return {
                "text": text,
                "confidence": avg_confidence,
                "pages": 1,
                "language": language,
                "engine": "tesseract",
            }

    async def extract_structured_data(self, file_path: str, document_type: str) -> dict:
        """
        Extrait des données structurées d'un document de type connu.

        Supporte les types de documents administratifs guinéens :
        acte_naissance, certificat, lettre_officielle, arrete, carte_identite, etc.

        Args:
            file_path: Chemin vers le fichier
            document_type: Type de document (DocumentType value)

        Returns:
            Dictionnaire avec : document_type, confidence, fields, raw_text, warnings
        """
        start = time.time()

        # D'abord extraire le texte brut
        ocr_result = await self.extract_text(file_path)
        raw_text = ocr_result.get("text", "")

        # Déterminer le type de document
        try:
            doc_type = DocumentType(document_type)
        except ValueError:
            doc_type = DocumentType.AUTRE

        # Extraire les champs structurés
        fields = {}
        warnings = []
        confidence = 0.0

        patterns = self.GUINEAN_PATTERNS.get(doc_type, {})
        if patterns and raw_text:
            matches_found = 0
            total_fields = len(patterns)

            for field_name, pattern in patterns.items():
                try:
                    match = re.search(pattern, raw_text, re.IGNORECASE | re.MULTILINE)
                    if match:
                        fields[field_name] = match.group(1).strip()
                        matches_found += 1
                    else:
                        warnings.append(f"Champ '{field_name}' non trouvé dans le document")
                except re.error as e:
                    warnings.append(f"Erreur regex pour '{field_name}': {e}")

            confidence = (matches_found / total_fields * 100) if total_fields > 0 else 0
        elif not raw_text:
            warnings.append("Aucun texte extrait du document")
            confidence = 0.0
        else:
            # Type AUTRE — extraction générique
            confidence = 30.0
            fields = self._extract_generic_fields(raw_text)
            warnings.append("Type de document non reconnu — extraction générique")

        processing_time = int((time.time() - start) * 1000)

        return {
            "document_type": doc_type.value,
            "confidence": round(confidence, 2),
            "fields": fields,
            "raw_text": raw_text,
            "warnings": warnings,
            "processing_time_ms": processing_time,
            "engine": self.engine,
        }

    def _extract_generic_fields(self, text: str) -> dict:
        """Extraction générique de champs à partir d'un texte non structuré."""
        fields = {}

        # Dates
        date_pattern = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b'
        dates = re.findall(date_pattern, text)
        if dates:
            fields["dates"] = dates

        # Noms propres (majuscules)
        name_pattern = r'\b([A-ZÀÂÉÈÊËÎÏÔÙÛÜ]{2,}(?:\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜ]+)*)\b'
        names = re.findall(name_pattern, text)
        if names:
            fields["noms_propres"] = list(set(names))[:10]

        # Numéros de référence
        ref_pattern = r'(?:N[°o]|Réf\.?|Reference)\s*:?\s*([A-Z0-9\-/.]+)'
        refs = re.findall(ref_pattern, text, re.IGNORECASE)
        if refs:
            fields["references"] = refs

        # Montants
        amount_pattern = r'(\d[\d\s]*(?:,\d{2})?)\s*(?:GNF|FG|francs?\s*guinéens?)'
        amounts = re.findall(amount_pattern, text, re.IGNORECASE)
        if amounts:
            fields["montants"] = amounts

        return fields

    def _guess_file_type(self, file_path: str) -> str:
        """Devine le type MIME à partir de l'extension du fichier."""
        ext = file_path.rsplit('.', 1)[-1].lower() if '.' in file_path else ''
        mime_map = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'tiff': 'image/tiff',
            'tif': 'image/tiff',
            'webp': 'image/webp',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        return mime_map.get(ext, 'application/octet-stream')

    def _generate_stub_text(self, file_path: str, file_type: str, language: str) -> str:
        """Génère un texte stub pour le développement."""
        return (
            f"[OCR Stub] Document: {file_path}\n"
            f"Type: {file_type}\n"
            f"Langue: {language}\n"
            f"Note: Connectez un moteur OCR réel (Tesseract, Google Vision, etc.) "
            f"pour une extraction en production.\n"
            f"RÉPUBLIQUE DE GUINÉE\n"
            f"Travail — Justice — Solidarité\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        )

    async def compute_file_hash(self, file_content: bytes) -> str:
        """Calcule le hash SHA-256 du contenu du fichier pour la vérification d'intégrité."""
        return hashlib.sha256(file_content).hexdigest()

    def is_format_supported(self, file_type: str) -> bool:
        """Vérifie si un type de fichier est supporté pour l'OCR."""
        return file_type in self.SUPPORTED_FORMATS


# Singleton
ocr_service = OCRService()
