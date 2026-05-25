"""
Service de sécurité des téléchargements - eAdministration Suite Guinea.
Validation des fichiers, sanitisation, scan antivirus, vérification des
magic bytes, détection de scripts embarqués et prévention de double extensions.

Sécurise les téléchargements de fichiers pour la plateforme GovTech :
- Vérification du type MIME vs extension
- Vérification des magic bytes (signature fichier)
- Détection de scripts embarqués dans les PDF
- Prévention des doubles extensions (file.php.pdf)
- Scan antivirus ClamAV (si disponible)
- Sanitisation des noms de fichiers
- Mise en quarantaine des fichiers suspects
"""

import asyncio
import logging
import os
import re
import shutil
import struct
import tempfile
import time
from pathlib import Path
from typing import Any

from fastapi import UploadFile

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Signatures de fichiers (magic bytes) ─────────────────────────────────────
# Référence: https://en.wikipedia.org/wiki/List_of_file_signatures
MAGIC_BYTES: dict[str, list[bytes]] = {
    "application/pdf": [b"%PDF"],
    "application/msword": [
        b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",  # OLE2 Compound Document
    ],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        b"PK\x03\x04",  # ZIP (OOXML est un ZIP)
    ],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF", b"WEBP"],
}

# Types MIME autorisés avec leurs extensions correspondantes
ALLOWED_MIME_TYPES: dict[str, set[str]] = {
    "application/pdf": {".pdf"},
    "application/msword": {".doc"},
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {".docx"},
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
}

# Extensions dangereuses bloquées
BLOCKED_EXTENSIONS: set[str] = {
    ".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".vbs", ".ps1",
    ".dll", ".so", ".dylib", ".app", ".deb", ".rpm", ".msi",
    ".com", ".scr", ".pif", ".hta", ".cpl", ".inf", ".reg",
    ".py", ".rb", ".pl", ".cgi", ".asp", ".aspx", ".jsp",
    ".sql", ".db", ".sqlite", ".htaccess", ".htpasswd",
    ".svg",  # SVG peut contenir du JavaScript
    ".xml",  # XML peut contenir des entités malveillantes (XXE)
}

# Motifs de scripts dangereux dans les PDF
DANGEROUS_PDF_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"/JavaScript", re.IGNORECASE),
    re.compile(r"/JS", re.IGNORECASE),
    re.compile(r"/Launch", re.IGNORECASE),
    re.compile(r"/SubmitForm", re.IGNORECASE),
    re.compile(r"/ImportData", re.IGNORECASE),
    re.compile(r"/GoToR", re.IGNORECASE),  # Remote GoTo
    re.compile(r"/GoToE", re.IGNORECASE),  # Embedded GoTo
    re.compile(r"/OpenAction", re.IGNORECASE),
    re.compile(r"/AA", re.IGNORECASE),  # Additional Actions
]


class UploadSecurityService:
    """
    Service de sécurité des téléchargements de fichiers.

    Fonctionnalités :
    - Validation complète des fichiers (type, taille, extension, magic bytes)
    - Détection de scripts embarqués dans les PDF
    - Prévention des doubles extensions
    - Scan antivirus via ClamAV (si activé)
    - Sanitisation des noms de fichiers
    - Mise en quarantaine des fichiers suspects
    """

    def __init__(self) -> None:
        self._clamav_available: bool | None = None
        self._quarantine_path = settings.UPLOAD_QUARANTINE_PATH

    def _check_magic_bytes(self, file_content: bytes, expected_mime: str) -> bool:
        """
        Vérifie que les magic bytes du fichier correspondent au type MIME attendu.

        Args:
            file_content: Premiers octets du fichier (header)
            expected_mime: Type MIME attendu

        Returns:
            True si les magic bytes correspondent, False sinon
        """
        signatures = MAGIC_BYTES.get(expected_mime, [])

        if not signatures:
            # Pas de signature connue pour ce type — on ne peut pas vérifier
            return True

        for sig in signatures:
            if file_content[: len(sig)] == sig:
                return True

        return False

    def _check_double_extension(self, filename: str) -> bool:
        """
        Vérifie si un nom de fichier a une double extension dangereuse.

        Exemples suspects : document.php.pdf, image.js.png, script.exe.docx

        Args:
            filename: Nom du fichier à vérifier

        Returns:
            True si une double extension dangereuse est détectée
        """
        parts = filename.lower().split(".")

        if len(parts) < 3:
            return False

        # Vérifier chaque partie intermédiaire pour des extensions dangereuses
        for part in parts[:-1]:  # Exclure la dernière extension (la vraie)
            if f".{part}" in BLOCKED_EXTENSIONS:
                return True

        return False

    def _scan_pdf_for_scripts(self, file_content: bytes) -> list[str]:
        """
        Scanne le contenu d'un PDF pour détecter des scripts embarqués.

        Recherche des mots-clés JavaScript, Launch, SubmitForm, etc.
        qui peuvent être utilisés pour exécuter du code malveillant.

        Args:
            file_content: Contenu binaire du fichier PDF

        Returns:
            Liste des motifs dangereux détectés
        """
        if not file_content.startswith(b"%PDF"):
            return []

        detected: list[str] = []

        try:
            # Décoder le contenu en texte pour la recherche de motifs
            # Les PDF utilisent souvent des encodages variés
            try:
                text_content = file_content.decode("latin-1")
            except (UnicodeDecodeError, ValueError):
                text_content = file_content.decode("utf-8", errors="replace")

            for pattern in DANGEROUS_PDF_PATTERNS:
                matches = pattern.findall(text_content)
                if matches:
                    detected.append(f"Motif suspect trouvé: {pattern.pattern}")

        except Exception as e:
            logger.warning(f"Erreur lors du scan PDF: {e}")

        return detected

    async def validate_upload(self, file: UploadFile) -> dict[str, Any]:
        """
        Valide un fichier téléchargé de manière exhaustive.

        Vérifications effectuées :
        1. Taille du fichier (contre UPLOAD_MAX_SIZE_MB)
        2. Type MIME autorisé
        3. Correspondance MIME / extension
        4. Magic bytes (signature fichier)
        5. Doubles extensions dangereuses
        6. Extensions bloquées
        7. Scripts embarqués dans les PDF
        8. Sanitisation du nom de fichier

        Args:
            file: Fichier UploadFile de FastAPI

        Returns:
            Dictionnaire avec valid, errors, warnings, sanitized_name
        """
        errors: list[str] = []
        warnings: list[str] = []

        # Récupérer le nom du fichier
        raw_filename = file.filename or "unnamed"
        sanitized_name = self.sanitize_filename(raw_filename)

        # 1. Vérifier la taille du fichier
        max_size_bytes = settings.UPLOAD_MAX_SIZE_MB * 1024 * 1024

        # Lire le contenu du fichier pour les vérifications
        content = await file.read()
        file_size = len(content)

        # Rembobiner le fichier pour les usages ultérieurs
        await file.seek(0)

        if file_size == 0:
            errors.append("Le fichier est vide")
            return {
                "valid": False,
                "errors": errors,
                "warnings": warnings,
                "sanitized_name": sanitized_name,
            }

        if file_size > max_size_bytes:
            errors.append(
                f"Le fichier dépasse la taille maximale autorisée "
                f"({settings.UPLOAD_MAX_SIZE_MB} Mo). "
                f"Taille actuelle: {file_size / (1024 * 1024):.1f} Mo"
            )

        # 2. Vérifier l'extension
        file_ext = Path(raw_filename).suffix.lower()

        if not file_ext:
            errors.append("Le fichier n'a pas d'extension")
        elif file_ext in BLOCKED_EXTENSIONS:
            errors.append(
                f"L'extension '{file_ext}' est interdite pour des raisons de sécurité"
            )

        # 3. Vérifier les doubles extensions
        if self._check_double_extension(raw_filename):
            errors.append(
                f"Double extension dangereuse détectée dans '{raw_filename}'. "
                f"Cette technique est couramment utilisée pour dissimuler des fichiers malveillants."
            )

        # 4. Vérifier le type MIME déclaré
        content_type = file.content_type or ""

        # Récupérer les types MIME autorisés depuis la config
        allowed_types_str = settings.UPLOAD_ALLOWED_TYPES
        allowed_types = {
            t.strip() for t in allowed_types_str.split(",") if t.strip()
        }

        if content_type and content_type not in allowed_types:
            errors.append(
                f"Le type MIME '{content_type}' n'est pas autorisé. "
                f"Types autorisés: {', '.join(sorted(allowed_types))}"
            )

        # 5. Vérifier la correspondance MIME / extension
        if content_type and file_ext:
            expected_extensions = ALLOWED_MIME_TYPES.get(content_type, set())
            if expected_extensions and file_ext not in expected_extensions:
                warnings.append(
                    f"Incohérence détectée: le type MIME '{content_type}' "
                    f"ne correspond pas à l'extension '{file_ext}'. "
                    f"Extensions attendues: {', '.join(sorted(expected_extensions))}"
                )

        # 6. Vérifier les magic bytes
        if content_type and content not in errors:
            header_bytes = content[:64]  # Suffisant pour la plupart des signatures
            if not self._check_magic_bytes(header_bytes, content_type):
                errors.append(
                    f"Les octets de signature du fichier ne correspondent pas "
                    f"au type MIME déclaré '{content_type}'. "
                    f"Le fichier pourrait être déguisé."
                )

        # 7. Scanner les PDF pour les scripts embarqués
        if content_type == "application/pdf" or file_ext == ".pdf":
            if content:
                dangerous_patterns = self._scan_pdf_for_scripts(content)
                for pattern in dangerous_patterns:
                    warnings.append(
                        f"Script embarqué potentiellement dangereux dans le PDF: {pattern}"
                    )

                if len(dangerous_patterns) >= 3:
                    errors.append(
                        f"Le PDF contient {len(dangerous_patterns)} motifs suspects. "
                        f"Téléchargement bloqué pour des raisons de sécurité."
                    )

        # Résultat de la validation
        is_valid = len(errors) == 0

        result: dict[str, Any] = {
            "valid": is_valid,
            "errors": errors,
            "warnings": warnings,
            "sanitized_name": sanitized_name,
            "file_size": file_size,
            "content_type": content_type,
            "extension": file_ext,
        }

        if not is_valid:
            logger.warning(
                f"Téléchargement rejeté pour '{raw_filename}': {'; '.join(errors)}"
            )
        elif warnings:
            logger.info(
                f"Téléchargement accepté avec avertissements pour '{raw_filename}': "
                f"{'; '.join(warnings)}"
            )

        return result

    async def scan_for_virus(self, file_path: str) -> dict[str, Any]:
        """
        Scanne un fichier pour détecter des virus en utilisant ClamAV.

        Si ClamAV n'est pas disponible ou si le scan antivirus est désactivé,
        retourne un résultat indiquant que le scan a été ignoré.

        Les fichiers infectés sont déplacés en quarantaine.

        Args:
            file_path: Chemin absolu du fichier à scanner

        Returns:
            Dictionnaire avec clean, scanner, details, quarantined
        """
        if not settings.UPLOAD_ANTIVIRUS_ENABLED:
            return {
                "clean": True,
                "scanner": "none",
                "details": "Scan antivirus désactivé dans la configuration",
                "quarantined": False,
            }

        # Vérifier si ClamAV est disponible
        if self._clamav_available is None:
            self._clamav_available = await self._check_clamav()

        if not self._clamav_available:
            return {
                "clean": True,
                "scanner": "unavailable",
                "details": "ClamAV n'est pas disponible sur ce serveur",
                "quarantined": False,
            }

        # Exécuter le scan ClamAV
        try:
            proc = await asyncio.create_subprocess_exec(
                "clamscan",
                "--no-summary",
                "--infected",
                file_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=300  # 5 minutes max
            )

            stdout_str = stdout.decode("utf-8", errors="replace").strip()
            stderr_str = stderr.decode("utf-8", errors="replace").strip()

            if proc.returncode == 0:
                # Aucun virus détecté
                return {
                    "clean": True,
                    "scanner": "clamav",
                    "details": "Aucune menace détectée",
                    "quarantined": False,
                }
            elif proc.returncode == 1:
                # Virus détecté — mettre en quarantaine
                quarantine_path = await self._quarantine_file(file_path)

                # Extraire le nom du virus
                virus_name = "unknown"
                for line in stdout_str.split("\n"):
                    if "FOUND" in line:
                        parts = line.split()
                        if len(parts) >= 2:
                            virus_name = parts[-2]
                        break

                logger.warning(
                    f"VIRUS DÉTECTÉ: {virus_name} dans {file_path}. "
                    f"Fichier mis en quarantaine: {quarantine_path}"
                )

                return {
                    "clean": False,
                    "scanner": "clamav",
                    "details": f"Virus détecté: {virus_name}",
                    "virus_name": virus_name,
                    "quarantined": quarantine_path is not None,
                    "quarantine_path": quarantine_path,
                }
            else:
                # Erreur de scan
                logger.error(f"Erreur ClamAV (code {proc.returncode}): {stderr_str}")
                return {
                    "clean": True,  # Par défaut, on accepte en cas d'erreur de scan
                    "scanner": "clamav",
                    "details": f"Erreur de scan: {stderr_str[:200]}",
                    "quarantined": False,
                }

        except asyncio.TimeoutError:
            logger.error("Timeout du scan ClamAV (5 min)")
            return {
                "clean": True,
                "scanner": "clamav",
                "details": "Timeout du scan antivirus",
                "quarantined": False,
            }
        except FileNotFoundError:
            self._clamav_available = False
            return {
                "clean": True,
                "scanner": "unavailable",
                "details": "ClamAV n'est pas installé sur ce serveur",
                "quarantined": False,
            }
        except Exception as e:
            logger.error(f"Erreur inattendue lors du scan antivirus: {e}")
            return {
                "clean": True,
                "scanner": "clamav",
                "details": f"Erreur inattendue: {str(e)[:200]}",
                "quarantined": False,
            }

    async def _check_clamav(self) -> bool:
        """
        Vérifie si ClamAV est disponible sur le serveur.

        Returns:
            True si ClamAV est installé et fonctionnel
        """
        try:
            proc = await asyncio.create_subprocess_exec(
                "clamscan",
                "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await asyncio.wait_for(proc.communicate(), timeout=10)
            available = proc.returncode == 0
            if available:
                logger.info("ClamAV détecté et fonctionnel")
            else:
                logger.warning("ClamAV détecté mais non fonctionnel")
            return available
        except (FileNotFoundError, asyncio.TimeoutError):
            logger.info("ClamAV non disponible sur ce serveur")
            return False

    async def _quarantine_file(self, file_path: str) -> str | None:
        """
        Déplace un fichier infecté en quarantaine.

        Args:
            file_path: Chemin du fichier à mettre en quarantaine

        Returns:
            Chemin du fichier en quarantaine, ou None en cas d'erreur
        """
        try:
            quarantine_dir = Path(self._quarantine_path)
            quarantine_dir.mkdir(parents=True, exist_ok=True)

            filename = Path(file_path).name
            timestamp = int(time.time())
            quarantine_filename = f"{timestamp}_{filename}"
            quarantine_path = quarantine_dir / quarantine_filename

            shutil.move(file_path, str(quarantine_path))

            logger.info(f"Fichier mis en quarantaine: {quarantine_path}")
            return str(quarantine_path)

        except Exception as e:
            logger.error(f"Erreur lors de la mise en quarantaine: {e}")
            return None

    def sanitize_filename(self, filename: str) -> str:
        """
        Sanitise un nom de fichier pour éliminer les caractères dangereux.

        Opérations effectuées :
        - Suppression des caractères de contrôle
        - Suppression des séquences de traversal de chemin (.., /, \\)
        - Remplacement des caractères spéciaux par des tirets bas
        - Limitation de la longueur du nom
        - Suppression des espaces multiples

        Args:
            filename: Nom du fichier brut à sanitiser

        Returns:
            Nom de fichier sanitisé et sûr
        """
        if not filename:
            return f"unnamed_{int(time.time())}"

        # Supprimer les caractères de contrôle
        sanitized = re.sub(r"[\x00-\x1f\x7f]", "", filename)

        # Supprimer les séquences de traversal de chemin
        sanitized = sanitized.replace("../", "").replace("..\\", "")
        sanitized = sanitized.replace("/", "_").replace("\\", "_")

        # Supprimer les chemins absolus (C:, /home, etc.)
        if ":" in sanitized:
            # Garder uniquement le nom après le dernier ":" (utile pour les paths Windows)
            sanitized = sanitized.split(":")[-1]

        # Remplacer les caractères spéciaux par des tirets bas
        sanitized = re.sub(r'[<>"|?*\x00-\x1f]', "_", sanitized)

        # Remplacer les espaces multiples par un seul
        sanitized = re.sub(r"\s+", "_", sanitized)

        # Supprimer les points en début de nom (fichiers cachés Unix)
        sanitized = sanitized.lstrip(".")

        # Limiter la longueur (garder l'extension)
        max_length = 200
        if len(sanitized) > max_length:
            name_part = sanitized[:max_length]
            # Essayer de préserver l'extension
            ext_match = re.search(r"\.[^.]+$", sanitized)
            if ext_match:
                ext = ext_match.group()
                name_part = sanitized[: max_length - len(ext)] + ext
            sanitized = name_part

        # Si le nom est vide après sanitisation
        if not sanitized or sanitized == "_":
            sanitized = f"file_{int(time.time())}"

        return sanitized


# Instance singleton du service
upload_security = UploadSecurityService()
