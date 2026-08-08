"""Real OCR service for server-stored administrative documents.

The service is deliberately fail-closed: it never fabricates OCR text or a
confidence score. PDF pages are rendered with Poppler and raster images are
processed with the Tesseract CLI. Source bytes are read from object storage.
"""

import asyncio
import csv
import hashlib
import io
import logging
import re
import shutil
import tempfile
import time
from enum import Enum
from pathlib import Path

from app.config import settings
from app.services.object_storage import object_storage

logger = logging.getLogger(__name__)


class DocumentType(str, Enum):
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


class OCRService:
    """Tesseract/Poppler OCR over immutable objects stored by the GED."""

    SUPPORTED_FORMATS = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/tiff": ".tiff",
        "image/webp": ".webp",
    }
    ALLOWED_LANGUAGES = {"fra", "eng", "fra+eng"}
    PROCESS_TIMEOUT_SECONDS = 120

    GUINEAN_PATTERNS = {
        DocumentType.ACTE_NAISSANCE: {
            "num_acte": r"N[°o]\s*:?\s*([A-Z0-9\-/]+)",
            "nom": r"(?:Nom|NOM)\s*:?\s*([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+)",
            "prenoms": r"(?:Prénoms|PRENOMS|Prénom)\s*:?\s*([A-Za-zÀâéèêëîïôùûü\s\-]+)",
            "date_naissance": r"(?:Date de naissance|Né(?:e)? le)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "lieu_naissance": r"(?:Lieu de naissance|Né(?:e)? à)\s*:?\s*([A-Za-zÀâéèêëîïôùûü\s\-]+)",
        },
        DocumentType.CERTIFICAT_NATIONALITE: {
            "num_certificat": r"N[°o]\s*:?\s*([A-Z0-9\-/]+)",
            "nom": r"(?:Nom|NOM)\s*:?\s*([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+)",
            "prenoms": r"(?:Prénoms|PRENOMS)\s*:?\s*([A-Za-zÀâéèêëîïôùûü\s\-]+)",
            "date_naissance": r"(?:Né(?:e)? le)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
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
            "reference": r"(?:Référence|Réf\.)\s*:?\s*([A-Z0-9\-/.]+)",
        },
        DocumentType.ARRETE: {
            "num_arrete": r"(?:Arrêté|ARRETE)\s+N[°o]\s*([A-Z0-9\-/]+)",
            "date_arrete": r"(?:du)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            "objet": r"(?:Objet)\s*:?\s*(.+)",
        },
        DocumentType.CERTIFICAT: {
            "type_certificat": r"(?:CERTIFICAT|ATTESTATION)\s+(?:DE|D')\s*(.+?)(?:\n|$)",
            "nom": r"(?:Nom|NOM)\s*:?\s*([A-ZÀÂÉÈÊËÎÏÔÙÛÜ\s\-]+)",
        },
    }

    def __init__(self) -> None:
        self._tesseract_path = shutil.which("tesseract")
        self._pdftoppm_path = shutil.which("pdftoppm")
        self.engine = "tesseract" if self._tesseract_path else "unavailable"

    @property
    def available(self) -> bool:
        return self._tesseract_path is not None

    async def extract_text(
        self,
        file_path: str,
        language: str = "fra",
        content_type: str | None = None,
    ) -> dict:
        """Extract text from the real object bytes. Never returns synthetic text."""
        start = time.monotonic()
        language = language.strip().lower()
        if language not in self.ALLOWED_LANGUAGES:
            return self._error_result(
                language,
                "unsupported_language",
                "Langue OCR non supportée. Utilisez fra, eng ou fra+eng.",
                start,
            )
        if not self.available:
            return self._error_result(
                language,
                "ocr_unavailable",
                "Le moteur Tesseract OCR n'est pas disponible sur ce serveur.",
                start,
            )
        if not file_path:
            return self._error_result(
                language,
                "missing_object",
                "Le document ne possède aucune version fichier exploitable.",
                start,
            )

        resolved_type = content_type or self._guess_file_type(file_path)
        if resolved_type not in self.SUPPORTED_FORMATS:
            return self._error_result(
                language,
                "unsupported_format",
                f"Format OCR non supporté: {resolved_type}.",
                start,
            )
        if resolved_type == "application/pdf" and not self._pdftoppm_path:
            return self._error_result(
                language,
                "pdf_renderer_unavailable",
                "Poppler/pdftoppm n'est pas disponible pour rendre les pages PDF.",
                start,
            )

        max_bytes = settings.UPLOAD_MAX_SIZE_MB * 1024 * 1024
        try:
            content = await object_storage.get_bytes(file_path, max_bytes=max_bytes)
        except ValueError as exc:
            return self._error_result(language, "file_too_large", str(exc), start)
        except Exception as exc:
            logger.exception("Unable to read OCR source object key=%s", file_path)
            return self._error_result(
                language,
                "storage_read_failed",
                f"Impossible de lire le fichier GED: {exc}",
                start,
            )

        if not content:
            return self._error_result(language, "empty_file", "Le fichier est vide.", start)

        try:
            with tempfile.TemporaryDirectory(prefix="eadmin-ocr-") as temp_dir:
                temp_root = Path(temp_dir)
                source = temp_root / f"source{self.SUPPORTED_FORMATS[resolved_type]}"
                source.write_bytes(content)

                page_files = await self._materialize_pages(source, resolved_type, temp_root)
                if not page_files:
                    return self._error_result(
                        language,
                        "no_pages",
                        "Aucune page exploitable n'a été produite pour l'OCR.",
                        start,
                    )

                page_texts: list[str] = []
                confidences: list[float] = []
                for page_number, page_file in enumerate(page_files, start=1):
                    text, page_confidence = await self._ocr_page(page_file, language)
                    if text.strip():
                        page_texts.append(
                            f"--- Page {page_number} ---\n{text.strip()}"
                            if len(page_files) > 1
                            else text.strip()
                        )
                    if page_confidence is not None:
                        confidences.append(page_confidence)

                text = "\n\n".join(page_texts).strip()
                confidence = (
                    round(sum(confidences) / len(confidences), 2)
                    if confidences
                    else 0.0
                )
                return {
                    "text": text,
                    "confidence": confidence,
                    "pages": len(page_files),
                    "language": language,
                    "engine": "tesseract",
                    "synthetic": False,
                    "processing_time_ms": int((time.monotonic() - start) * 1000),
                }
        except asyncio.TimeoutError:
            return self._error_result(
                language,
                "ocr_timeout",
                "Le traitement OCR a dépassé le délai maximal autorisé.",
                start,
            )
        except Exception as exc:
            logger.exception("Real OCR failed for object key=%s", file_path)
            return self._error_result(
                language,
                "ocr_failed",
                f"Échec du traitement OCR: {exc}",
                start,
            )

    async def _materialize_pages(
        self,
        source: Path,
        content_type: str,
        temp_root: Path,
    ) -> list[Path]:
        if content_type != "application/pdf":
            return [source]

        output_prefix = temp_root / "page"
        process = await asyncio.create_subprocess_exec(
            self._pdftoppm_path,
            "-png",
            "-r",
            "200",
            str(source),
            str(output_prefix),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=self.PROCESS_TIMEOUT_SECONDS,
        )
        if process.returncode != 0:
            raise RuntimeError(
                f"pdftoppm a échoué: {stderr.decode('utf-8', errors='replace')[:300]}"
            )
        return sorted(
            temp_root.glob("page-*.png"),
            key=lambda path: int(path.stem.rsplit("-", 1)[-1]),
        )

    async def _ocr_page(self, page_file: Path, language: str) -> tuple[str, float | None]:
        process = await asyncio.create_subprocess_exec(
            self._tesseract_path,
            str(page_file),
            "stdout",
            "-l",
            language,
            "--psm",
            "6",
            "tsv",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=self.PROCESS_TIMEOUT_SECONDS,
        )
        if process.returncode != 0:
            raise RuntimeError(
                f"Tesseract a échoué: {stderr.decode('utf-8', errors='replace')[:300]}"
            )
        return self._parse_tesseract_tsv(stdout.decode("utf-8", errors="replace"))

    def _parse_tesseract_tsv(self, tsv_text: str) -> tuple[str, float | None]:
        reader = csv.DictReader(io.StringIO(tsv_text), delimiter="\t")
        lines: dict[tuple[str, str, str, str], list[str]] = {}
        confidences: list[float] = []

        for row in reader:
            word = (row.get("text") or "").strip()
            if not word:
                continue
            key = (
                row.get("page_num") or "0",
                row.get("block_num") or "0",
                row.get("par_num") or "0",
                row.get("line_num") or "0",
            )
            lines.setdefault(key, []).append(word)
            try:
                confidence = float(row.get("conf") or -1)
            except ValueError:
                confidence = -1
            if confidence >= 0:
                confidences.append(confidence)

        text = "\n".join(" ".join(words) for words in lines.values()).strip()
        average = sum(confidences) / len(confidences) if confidences else None
        return text, round(average, 2) if average is not None else None

    async def extract_structured_data(
        self,
        file_path: str,
        document_type: str,
        language: str = "fra",
        content_type: str | None = None,
    ) -> dict:
        ocr_result = await self.extract_text(
            file_path=file_path,
            language=language,
            content_type=content_type,
        )
        if ocr_result.get("error"):
            return {
                "document_type": document_type,
                "confidence": 0.0,
                "fields": {},
                "raw_text": "",
                "warnings": [ocr_result["error"]],
                "engine": ocr_result.get("engine", self.engine),
                "error": ocr_result["error"],
                "error_code": ocr_result.get("error_code"),
            }
        return self.extract_structured_text(ocr_result["text"], document_type)

    def extract_structured_text(self, raw_text: str, document_type: str) -> dict:
        """Apply deterministic field extraction to already OCR'd real text."""
        try:
            doc_type = DocumentType(document_type)
        except ValueError:
            doc_type = DocumentType.AUTRE

        fields: dict = {}
        warnings: list[str] = []
        patterns = self.GUINEAN_PATTERNS.get(doc_type, {})

        if not raw_text:
            confidence = 0.0
            warnings.append("Aucun texte OCR réel n'a été extrait du document.")
        elif patterns:
            matches_found = 0
            for field_name, pattern in patterns.items():
                match = re.search(pattern, raw_text, re.IGNORECASE | re.MULTILINE)
                if match:
                    fields[field_name] = match.group(1).strip()
                    matches_found += 1
                else:
                    warnings.append(f"Champ '{field_name}' non trouvé dans le document")
            confidence = matches_found / len(patterns) * 100 if patterns else 0.0
        else:
            fields = self._extract_generic_fields(raw_text)
            confidence = 30.0 if fields else 0.0
            warnings.append("Type non spécialisé: extraction déterministe générique.")

        return {
            "document_type": doc_type.value,
            "confidence": round(confidence, 2),
            "fields": fields,
            "raw_text": raw_text,
            "warnings": warnings,
            "engine": "tesseract",
            "synthetic": False,
        }

    def _extract_generic_fields(self, text: str) -> dict:
        fields: dict = {}
        dates = re.findall(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text)
        if dates:
            fields["dates"] = dates

        names = re.findall(
            r"\b([A-ZÀÂÉÈÊËÎÏÔÙÛÜ]{2,}(?:\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜ]+)*)\b",
            text,
        )
        if names:
            fields["noms_propres"] = list(dict.fromkeys(names))[:10]

        references = re.findall(
            r"(?:N[°o]|Réf\.?|Reference)\s*:?\s*([A-Z0-9\-/.]+)",
            text,
            re.IGNORECASE,
        )
        if references:
            fields["references"] = references

        amounts = re.findall(
            r"(\d[\d\s]*(?:,\d{2})?)\s*(?:GNF|FG|francs?\s*guinéens?)",
            text,
            re.IGNORECASE,
        )
        if amounts:
            fields["montants"] = amounts
        return fields

    def _guess_file_type(self, file_path: str) -> str:
        extension = Path(file_path).suffix.lower()
        return {
            ".pdf": "application/pdf",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".tiff": "image/tiff",
            ".tif": "image/tiff",
            ".webp": "image/webp",
        }.get(extension, "application/octet-stream")

    def _error_result(
        self,
        language: str,
        error_code: str,
        error: str,
        start: float,
    ) -> dict:
        return {
            "text": "",
            "confidence": 0.0,
            "pages": 0,
            "language": language,
            "engine": self.engine,
            "synthetic": False,
            "error": error,
            "error_code": error_code,
            "processing_time_ms": int((time.monotonic() - start) * 1000),
        }

    async def compute_file_hash(self, file_content: bytes) -> str:
        return hashlib.sha256(file_content).hexdigest()

    def is_format_supported(self, file_type: str) -> bool:
        return file_type in self.SUPPORTED_FORMATS


ocr_service = OCRService()
