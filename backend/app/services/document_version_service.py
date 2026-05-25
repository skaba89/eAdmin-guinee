"""
Service de gestion des versions de documents - eAdministration Suite Guinea.
Contrôle de version complet avec historique, restauration et comparaison.
Assure la traçabilité complète de l'évolution des documents administratifs.
"""

import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.document import Document, DocumentStatusEnum
from app.models.document_version import DocumentVersion
from app.models.user import User

logger = logging.getLogger(__name__)


class DocumentVersionService:
    """
    Service de contrôle de version des documents.

    Fonctionnalités :
    - Création de versions avec hash SHA-256 pour l'intégrité
    - Historique complet des versions
    - Restauration d'une version antérieure
    - Comparaison entre deux versions
    - Audit trail de chaque changement
    """

    async def create_version(
        self,
        document_id: str,
        file_path: str,
        change_summary: str,
        user_id: str,
        change_type: str = "update",
        file_size: int = 0,
        file_content: bytes | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """
        Crée une nouvelle version d'un document.

        Args:
            document_id: Identifiant du document
            file_path: Chemin vers le nouveau fichier
            change_summary: Résumé des modifications
            user_id: Identifiant de l'utilisateur effectuant le changement
            change_type: Type de changement (create, update, sign, classify, unclassify)
            file_size: Taille du fichier en octets
            file_content: Contenu binaire du fichier (pour calcul du hash)
            metadata: Métadonnées additionnelles

        Returns:
            Dictionnaire avec les informations de la nouvelle version
        """
        try:
            async with async_session_factory() as session:
                # Récupérer le document
                result = await session.execute(
                    select(Document).where(Document.id == uuid.UUID(document_id))
                )
                document = result.scalar_one_or_none()
                if not document:
                    return {"error": "Document non trouvé"}

                # Calculer le hash du fichier
                file_hash = hashlib.sha256(file_content).hexdigest() if file_content else self._compute_path_hash(file_path)

                # Déterminer le numéro de version
                version_result = await session.execute(
                    select(func := __import__('sqlalchemy').func.max(DocumentVersion.version_number))
                    .where(DocumentVersion.document_id == uuid.UUID(document_id))
                )
                max_version = version_result.scalar() or 0
                new_version_number = max_version + 1

                # Créer la version
                version = DocumentVersion(
                    document_id=uuid.UUID(document_id),
                    version_number=new_version_number,
                    file_path=file_path,
                    file_size=file_size,
                    file_hash=file_hash,
                    change_summary=change_summary,
                    change_type=change_type,
                    changed_by=uuid.UUID(user_id),
                    metadata_=metadata,
                )
                session.add(version)

                # Mettre à jour le document
                document.version = new_version_number
                document.current_version = new_version_number
                document.file_path = file_path
                if file_size:
                    document.file_size = file_size
                document.updated_at = datetime.now(timezone.utc)

                await session.commit()

                logger.info(
                    f"Version {new_version_number} créée pour le document {document_id} "
                    f"par l'utilisateur {user_id} ({change_type})"
                )

                return {
                    "version_id": str(version.id),
                    "document_id": document_id,
                    "version_number": new_version_number,
                    "file_hash": file_hash,
                    "change_summary": change_summary,
                    "change_type": change_type,
                    "changed_by": user_id,
                    "created_at": version.created_at.isoformat() if version.created_at else None,
                }

        except Exception as e:
            logger.error(f"Erreur création version: {e}")
            return {"error": str(e)}

    async def get_version_history(self, document_id: str) -> list[dict]:
        """
        Récupère l'historique complet des versions d'un document.

        Args:
            document_id: Identifiant du document

        Returns:
            Liste des versions triées de la plus récente à la plus ancienne
        """
        try:
            async with async_session_factory() as session:
                result = await session.execute(
                    select(DocumentVersion)
                    .where(DocumentVersion.document_id == uuid.UUID(document_id))
                    .order_by(desc(DocumentVersion.version_number))
                )
                versions = result.scalars().all()

                history = []
                for v in versions:
                    # Récupérer le nom de l'utilisateur
                    user_result = await session.execute(
                        select(User).where(User.id == v.changed_by)
                    )
                    user = user_result.scalar_one_or_none()

                    history.append({
                        "version_id": str(v.id),
                        "version_number": v.version_number,
                        "file_hash": v.file_hash,
                        "change_summary": v.change_summary,
                        "change_type": v.change_type,
                        "file_size": v.file_size,
                        "changed_by": user.full_name if user else "Inconnu",
                        "changed_by_id": str(v.changed_by),
                        "metadata": v.metadata_,
                        "created_at": v.created_at.isoformat() if v.created_at else None,
                    })

                return history

        except Exception as e:
            logger.error(f"Erreur récupération historique versions: {e}")
            return []

    async def restore_version(
        self,
        document_id: str,
        version_number: int,
        user_id: str,
    ) -> dict:
        """
        Restaure une version antérieure d'un document.

        Crée une nouvelle version qui est une copie de la version restaurée,
        plutôt que de supprimer les versions intermédiaires (audit trail).

        Args:
            document_id: Identifiant du document
            version_number: Numéro de la version à restaurer
            user_id: Identifiant de l'utilisateur effectuant la restauration

        Returns:
            Dictionnaire avec les informations de la version restaurée
        """
        try:
            async with async_session_factory() as session:
                # Récupérer la version à restaurer
                version_result = await session.execute(
                    select(DocumentVersion).where(
                        and_(
                            DocumentVersion.document_id == uuid.UUID(document_id),
                            DocumentVersion.version_number == version_number,
                        )
                    )
                )
                target_version = version_result.scalar_one_or_none()
                if not target_version:
                    return {"error": f"Version {version_number} non trouvée"}

                # Créer une nouvelle version (copie de la version restaurée)
                change_summary = f"Restauration de la version {version_number}"
                new_version = await self.create_version(
                    document_id=document_id,
                    file_path=target_version.file_path,
                    change_summary=change_summary,
                    user_id=user_id,
                    change_type="restore",
                    file_size=target_version.file_size,
                    metadata={
                        "restored_from": version_number,
                        "original_hash": target_version.file_hash,
                    },
                )

                logger.info(
                    f"Version {version_number} restaurée pour le document {document_id} "
                    f"par l'utilisateur {user_id}"
                )

                return {
                    "restored": True,
                    "from_version": version_number,
                    "new_version": new_version,
                    "restored_by": user_id,
                }

        except Exception as e:
            logger.error(f"Erreur restauration version: {e}")
            return {"error": str(e)}

    async def compare_versions(
        self,
        document_id: str,
        v1: int,
        v2: int,
    ) -> dict:
        """
        Compare deux versions d'un document.

        Fournit une comparaison des métadonnées et des hashes.
        En production, peut intégrer un diff de contenu texte.

        Args:
            document_id: Identifiant du document
            v1: Numéro de la première version
            v2: Numéro de la deuxième version

        Returns:
            Dictionnaire avec les différences entre les deux versions
        """
        try:
            async with async_session_factory() as session:
                # Récupérer les deux versions
                v1_result = await session.execute(
                    select(DocumentVersion).where(
                        and_(
                            DocumentVersion.document_id == uuid.UUID(document_id),
                            DocumentVersion.version_number == v1,
                        )
                    )
                )
                version1 = v1_result.scalar_one_or_none()

                v2_result = await session.execute(
                    select(DocumentVersion).where(
                        and_(
                            DocumentVersion.document_id == uuid.UUID(document_id),
                            DocumentVersion.version_number == v2,
                        )
                    )
                )
                version2 = v2_result.scalar_one_or_none()

                if not version1 or not version2:
                    missing = []
                    if not version1:
                        missing.append(str(v1))
                    if not version2:
                        missing.append(str(v2))
                    return {"error": f"Version(s) non trouvée(s): {', '.join(missing)}"}

                # Comparaison
                differences = []

                if version1.file_hash != version2.file_hash:
                    differences.append({
                        "field": "file_hash",
                        "v1": version1.file_hash[:16] + "...",
                        "v2": version2.file_hash[:16] + "...",
                        "changed": True,
                    })
                else:
                    differences.append({
                        "field": "file_hash",
                        "changed": False,
                        "note": "Les fichiers sont identiques",
                    })

                if version1.file_size != version2.file_size:
                    diff_size = version2.file_size - version1.file_size
                    differences.append({
                        "field": "file_size",
                        "v1": version1.file_size,
                        "v2": version2.file_size,
                        "diff": diff_size,
                        "changed": True,
                    })

                if version1.change_type != version2.change_type:
                    differences.append({
                        "field": "change_type",
                        "v1": version1.change_type,
                        "v2": version2.change_type,
                        "changed": True,
                    })

                # Calculer l'intervalle de temps
                time_diff = None
                if version1.created_at and version2.created_at:
                    time_diff = (version2.created_at - version1.created_at).total_seconds()

                return {
                    "document_id": document_id,
                    "v1": {
                        "version_number": version1.version_number,
                        "file_hash": version1.file_hash,
                        "file_size": version1.file_size,
                        "change_type": version1.change_type,
                        "change_summary": version1.change_summary,
                        "created_at": version1.created_at.isoformat() if version1.created_at else None,
                    },
                    "v2": {
                        "version_number": version2.version_number,
                        "file_hash": version2.file_hash,
                        "file_size": version2.file_size,
                        "change_type": version2.change_type,
                        "change_summary": version2.change_summary,
                        "created_at": version2.created_at.isoformat() if version2.created_at else None,
                    },
                    "differences": differences,
                    "time_diff_seconds": time_diff,
                    "files_identical": version1.file_hash == version2.file_hash,
                }

        except Exception as e:
            logger.error(f"Erreur comparaison versions: {e}")
            return {"error": str(e)}

    async def get_version(self, document_id: str, version_number: int) -> dict | None:
        """Récupère les détails d'une version spécifique."""
        try:
            async with async_session_factory() as session:
                result = await session.execute(
                    select(DocumentVersion).where(
                        and_(
                            DocumentVersion.document_id == uuid.UUID(document_id),
                            DocumentVersion.version_number == version_number,
                        )
                    )
                )
                version = result.scalar_one_or_none()
                if not version:
                    return None

                return {
                    "version_id": str(version.id),
                    "document_id": document_id,
                    "version_number": version.version_number,
                    "file_path": version.file_path,
                    "file_size": version.file_size,
                    "file_hash": version.file_hash,
                    "change_summary": version.change_summary,
                    "change_type": version.change_type,
                    "metadata": version.metadata_,
                    "created_at": version.created_at.isoformat() if version.created_at else None,
                }

        except Exception as e:
            logger.error(f"Erreur récupération version: {e}")
            return None

    def _compute_path_hash(self, file_path: str) -> str:
        """Calcule un hash à partir du chemin du fichier (fallback quand le contenu n'est pas disponible)."""
        return hashlib.sha256(f"eadmin-path:{file_path}:{int(__import__('time').time())}".encode()).hexdigest()


# Singleton
document_version_service = DocumentVersionService()
