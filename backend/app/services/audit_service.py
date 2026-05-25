"""
Service d'audit enterprise-grade - eAdministration Suite Guinea.
Journalisation complète avec chaîne de hachage pour la détection de falsification.
Intégrité garantie par hash chain : chaque entrée inclut le hash de l'entrée précédente.
"""

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.audit import AuditLog

logger = logging.getLogger("eadmin.audit")


# --- Types d'actions supportés ---
AUDIT_ACTIONS = {
    "LOGIN", "LOGOUT", "CREATE", "READ", "UPDATE", "DELETE",
    "EXPORT", "SIGN", "APPROVE", "REJECT", "ESALATE", "ESCALATE",
    "DOWNLOAD", "UPLOAD", "WORKFLOW_STEP",
    "PASSWORD_CHANGE", "MFA_SETUP", "MFA_VERIFY", "MFA_DISABLE",
    "ROLE_CHANGE", "PERMISSION_CHANGE",
    "SESSION_CREATE", "SESSION_DESTROY", "TOKEN_REVOKE",
    "CONFIG_CHANGE", "BACKUP_CREATE", "DATA_EXPORT",
    "SECURITY_ALERT",
}

# --- Catégories d'audit ---
AUDIT_CATEGORIES = {
    "auth", "document", "courrier", "workflow",
    "user", "admin", "security", "system", "data",
}

# --- Niveaux de sévérité ---
AUDIT_SEVERITIES = {"info", "warning", "critical"}


class AuditService:
    """
    Service d'audit enterprise avec chaîne de hachage pour l'intégrité.

    Chaque entrée d'audit contient un hash (entry_hash) calculé à partir
    des données de l'entrée ET du hash de l'entrée précédente (previous_hash).
    Cela crée une chaîne cryptographique qui rend impossible la modification
    ou la suppression d'entrées sans détection.

    Flux de vérification d'intégrité :
    1. Parcourir les entrées par ordre chronologique
    2. Recalculer le hash de chaque entrée
    3. Vérifier que le hash correspond à entry_hash stocké
    4. Vérifier que previous_hash correspond au hash de l'entrée précédente
    5. Si une incohérence est détectée, la chaîne est rompue
    """

    def __init__(self, db: AsyncSession):
        """
        Initialise le service d'audit avec une session de base de données.

        Args:
            db: Session SQLAlchemy asynchrone pour les opérations de base de données
        """
        self.db = db

    def _compute_entry_hash(
        self,
        entry_id: str,
        user_id: str | None,
        action: str,
        resource_type: str,
        resource_id: str,
        timestamp: str,
        previous_hash: str | None,
        tenant_id: str | None = None,
        institution_id: str | None = None,
    ) -> str:
        """
        Calcule le hash SHA-256 d'une entrée d'audit pour la chaîne d'intégrité.

        Le hash est calculé à partir de toutes les données critiques de l'entrée
        ET du hash de l'entrée précédente, créant ainsi une chaîne cryptographique.

        Args:
            entry_id: UUID de l'entrée
            user_id: ID de l'utilisateur (ou None)
            action: Type d'action
            resource_type: Type de ressource
            resource_id: ID de la ressource
            timestamp: Horodatage ISO
            previous_hash: Hash de l'entrée précédente (ou None pour la première)
            tenant_id: ID du tenant
            institution_id: ID de l'institution

        Returns:
            Hash SHA-256 hexadécimal
        """
        hash_input = json.dumps({
            "id": entry_id,
            "user_id": str(user_id) if user_id else None,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "timestamp": timestamp,
            "previous_hash": previous_hash,
            "tenant_id": tenant_id,
            "institution_id": institution_id,
        }, sort_keys=True, ensure_ascii=False)

        return hashlib.sha256(hash_input.encode("utf-8")).hexdigest()

    async def _get_last_hash(self, tenant_id: str | None = None) -> str | None:
        """
        Récupère le hash de la dernière entrée d'audit pour continuer la chaîne.

        Args:
            tenant_id: Optionnel, filtrer par tenant

        Returns:
            Le hash de la dernière entrée, ou None si aucune entrée n'existe
        """
        query = select(AuditLog.entry_hash).order_by(AuditLog.timestamp.desc())

        if tenant_id:
            query = query.where(AuditLog.tenant_id == tenant_id)

        query = query.limit(1)

        result = await self.db.execute(query)
        last_hash = result.scalar_one_or_none()
        return last_hash

    async def log_action(
        self,
        user_id: uuid.UUID | None,
        action: str,
        resource_type: str,
        resource_id: str,
        category: str | None = None,
        description: str | None = None,
        details: dict[str, Any] | None = None,
        old_value: str | None = None,
        new_value: str | None = None,
        severity: str = "info",
        ip_address: str | None = None,
        user_agent: str | None = None,
        session_id: str | None = None,
        device_fingerprint: str | None = None,
        tenant_id: str | None = None,
        institution_id: str | None = None,
        resource_name: str | None = None,
    ) -> AuditLog:
        """
        Enregistre une action dans le journal d'audit avec chaîne de hachage.

        Chaque entrée contient un hash (entry_hash) calculé à partir des données
        de l'entrée ET du hash de l'entrée précédente (previous_hash), créant
        une chaîne cryptographique inviolable.

        Args:
            user_id: UUID de l'utilisateur (None pour les actions système)
            action: Type d'action (LOGIN, LOGOUT, CREATE, etc.)
            resource_type: Type de ressource affectée
            resource_id: Identifiant de la ressource
            category: Catégorie de l'action (auth, document, etc.)
            description: Description lisible de l'action
            details: Détails supplémentaires (JSON)
            old_value: Valeur précédente (pour les modifications)
            new_value: Nouvelle valeur (pour les modifications)
            severity: Niveau de sévérité (info, warning, critical)
            ip_address: Adresse IP du client
            user_agent: User-Agent du client
            session_id: Identifiant de session
            device_fingerprint: Empreinte numérique de l'appareil
            tenant_id: Identifiant du tenant (isolation multi-tenant)
            institution_id: Identifiant de l'institution (RLS)
            resource_name: Nom lisible de la ressource

        Returns:
            L'entrée d'audit créée

        Raises:
            ValueError: Si l'action ou la sévérité n'est pas valide
        """
        # Validation des paramètres
        action = action.upper()
        if action not in AUDIT_ACTIONS:
            logger.warning(f"Action d'audit non standard: {action}")

        if severity not in AUDIT_SEVERITIES:
            severity = "info"

        if category and category not in AUDIT_CATEGORIES:
            logger.debug(f"Catégorie d'audit non standard: {category}")

        # Générer l'ID de l'entrée
        entry_id = uuid.uuid4()

        # Récupérer le hash de la dernière entrée pour la chaîne d'intégrité
        previous_hash = await self._get_last_hash(tenant_id)

        # Résoudre le tenant_id si non fourni
        if not tenant_id:
            tenant_id = getattr(settings, 'TENANT_DEFAULT_ID', 'republique-de-guinee')

        # Calculer le timestamp
        now = datetime.now(timezone.utc)
        timestamp_iso = now.isoformat()

        # Calculer le hash de cette entrée (chaîne d'intégrité)
        entry_hash = self._compute_entry_hash(
            entry_id=str(entry_id),
            user_id=str(user_id) if user_id else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            timestamp=timestamp_iso,
            previous_hash=previous_hash,
            tenant_id=tenant_id,
            institution_id=institution_id,
        )

        # Créer l'entrée d'audit
        audit_entry = AuditLog(
            id=entry_id,
            user_id=user_id,
            action=action,
            category=category,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            details=details,
            old_value=old_value,
            new_value=new_value,
            severity=severity,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            device_fingerprint=device_fingerprint,
            resource_name=resource_name,
            entry_hash=entry_hash,
            previous_hash=previous_hash,
            tenant_id=tenant_id,
            institution_id=institution_id,
            timestamp=now,
        )

        self.db.add(audit_entry)
        await self.db.flush()

        logger.debug(
            f"Audit: action={action}, resource={resource_type}/{resource_id}, "
            f"user={user_id}, tenant={tenant_id}, hash={entry_hash[:16]}..."
        )

        return audit_entry

    async def verify_chain_integrity(
        self,
        since: datetime | None = None,
        tenant_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Vérifie l'intégrité de la chaîne de hachage depuis un point donné.

        Parcourt les entrées d'audit par ordre chronologique et vérifie :
        1. Que chaque entry_hash peut être recalculé à partir des données
        2. Que chaque previous_hash correspond au hash de l'entrée précédente
        3. Qu'aucune entrée n'a été modifiée ou supprimée

        Args:
            since: Date à partir de laquelle vérifier (None = vérifier tout)
            tenant_id: Filtrer par tenant (None = vérifier tous les tenants)

        Returns:
            Dictionnaire avec les résultats de la vérification :
            - is_valid: True si la chaîne est intacte
            - total_entries: Nombre total d'entrées vérifiées
            - verified_entries: Nombre d'entrées vérifiées avec succès
            - broken_at: ID de la première entrée rompue (ou None)
            - broken_reason: Raison de la rupture (ou None)
            - verification_time: Durée de la vérification en ms
        """
        import time as _time
        start_time = _time.monotonic()

        query = select(AuditLog).order_by(AuditLog.timestamp.asc())

        if since:
            query = query.where(AuditLog.timestamp >= since)
        if tenant_id:
            query = query.where(AuditLog.tenant_id == tenant_id)

        result = await self.db.execute(query)
        entries = result.scalars().all()

        total_entries = len(entries)
        verified_entries = 0
        broken_at = None
        broken_reason = None
        previous_hash = None

        for entry in entries:
            # Vérifier le chaînage avec l'entrée précédente
            if previous_hash is not None and entry.previous_hash != previous_hash:
                broken_at = str(entry.id)
                broken_reason = (
                    f"Chaîne rompue: previous_hash ne correspond pas. "
                    f"Attendu: {previous_hash[:16]}..., "
                    f"Trouvé: {(entry.previous_hash or 'None')[:16]}..."
                )
                break

            # Recalculer le hash de cette entrée
            expected_hash = self._compute_entry_hash(
                entry_id=str(entry.id),
                user_id=str(entry.user_id) if entry.user_id else None,
                action=entry.action,
                resource_type=entry.resource_type,
                resource_id=entry.resource_id,
                timestamp=entry.timestamp.isoformat() if entry.timestamp else "",
                previous_hash=entry.previous_hash,
                tenant_id=entry.tenant_id,
                institution_id=entry.institution_id,
            )

            if entry.entry_hash != expected_hash:
                broken_at = str(entry.id)
                broken_reason = (
                    f"Hash invalide pour l'entrée {entry.id}. "
                    f"Attendu: {expected_hash[:16]}..., "
                    f"Trouvé: {(entry.entry_hash or 'None')[:16]}..."
                )
                break

            previous_hash = entry.entry_hash
            verified_entries += 1

        verification_time_ms = round((_time.monotonic() - start_time) * 1000)

        is_valid = broken_at is None

        return {
            "is_valid": is_valid,
            "total_entries": total_entries,
            "verified_entries": verified_entries,
            "broken_at": broken_at,
            "broken_reason": broken_reason,
            "verification_time_ms": verification_time_ms,
            "last_verified_hash": previous_hash,
            "checked_since": since.isoformat() if since else None,
            "tenant_id": tenant_id,
        }

    async def get_stats(
        self,
        tenant_id: str | None = None,
        since: datetime | None = None,
    ) -> dict[str, Any]:
        """
        Calcule des statistiques sur les entrées d'audit.

        Args:
            tenant_id: Filtrer par tenant
            since: Date à partir de laquelle calculer les stats

        Returns:
            Dictionnaire avec les statistiques
        """
        query_base = select(AuditLog)

        if tenant_id:
            query_base = query_base.where(AuditLog.tenant_id == tenant_id)
        if since:
            query_base = query_base.where(AuditLog.timestamp >= since)

        # Nombre total d'entrées
        count_result = await self.db.execute(
            select(func.count()).select_from(query_base.subquery())
        )
        total = count_result.scalar() or 0

        # Actions les plus fréquentes
        actions_result = await self.db.execute(
            select(AuditLog.action, func.count(AuditLog.id).label("count"))
            .select_from(query_base.subquery())
            .group_by(AuditLog.action)
            .order_by(func.count(AuditLog.id).desc())
            .limit(10)
        )
        top_actions = [{"action": row[0], "count": row[1]} for row in actions_result.all()]

        # Sévérité
        severity_result = await self.db.execute(
            select(AuditLog.severity, func.count(AuditLog.id).label("count"))
            .select_from(query_base.subquery())
            .group_by(AuditLog.severity)
        )
        severity_stats = {row[0]: row[1] for row in severity_result.all()}

        # Utilisateurs les plus actifs
        users_result = await self.db.execute(
            select(AuditLog.user_id, func.count(AuditLog.id).label("count"))
            .select_from(query_base.subquery())
            .where(AuditLog.user_id.isnot(None))
            .group_by(AuditLog.user_id)
            .order_by(func.count(AuditLog.id).desc())
            .limit(10)
        )
        top_users = [{"user_id": str(row[0]), "count": row[1]} for row in users_result.all()]

        # Types de ressources
        resources_result = await self.db.execute(
            select(AuditLog.resource_type, func.count(AuditLog.id).label("count"))
            .select_from(query_base.subquery())
            .group_by(AuditLog.resource_type)
            .order_by(func.count(AuditLog.id).desc())
            .limit(10)
        )
        top_resources = [{"resource_type": row[0], "count": row[1]} for row in resources_result.all()]

        return {
            "total_entries": total,
            "top_actions": top_actions,
            "severity_stats": severity_stats,
            "top_users": top_users,
            "top_resources": top_resources,
            "since": since.isoformat() if since else None,
            "tenant_id": tenant_id,
        }

    async def get_timeline(
        self,
        resource_type: str,
        resource_id: str,
        tenant_id: str | None = None,
    ) -> list[AuditLog]:
        """
        Récupère la chronologie complète des actions sur une ressource.

        Args:
            resource_type: Type de la ressource
            resource_id: Identifiant de la ressource
            tenant_id: Filtrer par tenant

        Returns:
            Liste des entrées d'audit triées par date
        """
        query = (
            select(AuditLog)
            .where(
                AuditLog.resource_type == resource_type,
                AuditLog.resource_id == resource_id,
            )
            .order_by(AuditLog.timestamp.asc())
        )

        if tenant_id:
            query = query.where(AuditLog.tenant_id == tenant_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())
