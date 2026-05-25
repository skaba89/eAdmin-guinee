"""
Service de gestion des sessions enterprise - eAdministration Suite Guinea.
Gestion des sessions avec Redis backend, détection d'activité suspecte,
empreinte numérique des appareils et limites de sessions concurrentes.

Clés Redis utilisées :
  - eadmin:sessions:{session_id}       → Métadonnées de la session (hash)
  - eadmin:user_sessions:{user_id}     → Set des session_ids actifs pour un utilisateur
  - eadmin:trusted_devices:{user_id}   → Set des empreintes d'appareils de confiance
  - eadmin:security_events:{user_id}   → Liste des événements de sécurité récents
"""

import json
import hashlib
import logging
import secrets
import time
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

# Préfixes Redis
SESSION_PREFIX = "eadmin:sessions:"
USER_SESSIONS_PREFIX = "eadmin:user_sessions:"
TRUSTED_DEVICES_PREFIX = "eadmin:trusted_devices:"
SECURITY_EVENTS_PREFIX = "eadmin:security_events:"

# Constantes de détection d'activité suspecte
IMPOSSIBLE_TRAVEL_THRESHOLD_KM = 500  # km
IMPOSSIBLE_TRAVEL_THRESHOLD_MINUTES = 60  # minutes
MAX_RISK_SCORE = 100


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcule la distance entre deux points géographiques (formule de Haversine).

    Args:
        lat1, lon1: Coordonnées du point 1 (degrés décimaux)
        lat2, lon2: Coordonnées du point 2 (degrés décimaux)

    Returns:
        Distance en kilomètres
    """
    import math
    R = 6371  # Rayon de la Terre en km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return R * c


class SessionService:
    """
    Service de gestion des sessions enterprise avec Redis.

    Fonctionnalités :
    - Sessions stockées dans Redis avec TTL automatique
    - Limite de sessions concurrentes par utilisateur (configurable)
    - Détection d'activité suspecte (changement d'IP, voyage impossible, nouvel appareil)
    - Appareils de confiance avec empreinte numérique
    - Journal des événements de sécurité
    - Timeout d'inactivité configurable
    """

    def __init__(self) -> None:
        self._redis: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis:
        """Obtient la connexion Redis (lazy initialization)."""
        if self._redis is None:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
        return self._redis

    async def create_session(
        self,
        user_id: str,
        ip_address: str,
        user_agent: str,
        device_fingerprint: str,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> str:
        """
        Crée une nouvelle session utilisateur.

        Applique la limite de sessions concurrentes : si l'utilisateur a déjà
        atteint le maximum (SESSION_MAX_CONCURRENT), la plus ancienne session
        est automatiquement terminée.

        Args:
            user_id: Identifiant unique de l'utilisateur
            ip_address: Adresse IP du client
            user_agent: En-tête User-Agent du client
            device_fingerprint: Empreinte numérique de l'appareil (hash SHA-256 tronqué)
            latitude: Latitude géographique (optionnel, pour détection voyage impossible)
            longitude: Longitude géographique (optionnel, pour détection voyage impossible)

        Returns:
            Identifiant unique de la session créée
        """
        redis = await self._get_redis()
        session_id = f"sess-{int(time.time())}-{secrets.token_hex(8)}"
        session_ttl = settings.SESSION_TIMEOUT_HOURS * 3600

        # Vérifier et appliquer la limite de sessions concurrentes
        max_concurrent = settings.SESSION_MAX_CONCURRENT
        user_sessions_key = f"{USER_SESSIONS_PREFIX}{user_id}"
        existing_sessions = await redis.smembers(user_sessions_key)

        # Nettoyer les sessions expirées
        active_session_ids = []
        for sid in existing_sessions:
            session_key = f"{SESSION_PREFIX}{sid}"
            if await redis.exists(session_key):
                active_session_ids.append(sid)
            else:
                await redis.srem(user_sessions_key, sid)

        # Si on a atteint la limite, terminer la plus ancienne session
        if len(active_session_ids) >= max_concurrent:
            # Récupérer les timestamps de création pour trouver la plus ancienne
            oldest_sid = None
            oldest_time = float("inf")
            for sid in active_session_ids:
                session_key = f"{SESSION_PREFIX}{sid}"
                created_at_str = await redis.hget(session_key, "created_at")
                if created_at_str:
                    try:
                        created_at = datetime.fromisoformat(created_at_str)
                        created_ts = created_at.timestamp()
                        if created_ts < oldest_time:
                            oldest_time = created_ts
                            oldest_sid = sid
                    except (ValueError, TypeError):
                        pass

            if oldest_sid:
                await self.destroy_session(oldest_sid)
                logger.info(
                    f"Session {oldest_sid[:20]}... terminée (limite concurrente atteinte) "
                    f"pour utilisateur {user_id}"
                )

        # Créer la session
        now = datetime.now(timezone.utc).isoformat()
        session_data = {
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "device_fingerprint": device_fingerprint,
            "created_at": now,
            "last_activity": now,
            "mfa_verified": "0",
            "is_active": "1",
            "latitude": str(latitude) if latitude is not None else "",
            "longitude": str(longitude) if longitude is not None else "",
        }

        session_key = f"{SESSION_PREFIX}{session_id}"
        await redis.hset(session_key, mapping=session_data)  # type: ignore[arg-type]
        await redis.expire(session_key, session_ttl)

        # Ajouter à l'ensemble des sessions de l'utilisateur
        await redis.sadd(user_sessions_key, session_id)
        await redis.expire(user_sessions_key, session_ttl)

        # Enregistrer l'événement de sécurité
        await self._add_security_event(
            user_id=user_id,
            event_type="session_created",
            description=f"Nouvelle session créée depuis {ip_address}",
            ip_address=ip_address,
            severity="info",
        )

        logger.info(
            f"Session créée: {session_id[:20]}... pour utilisateur {user_id} "
            f"depuis {ip_address} (fingerprint: {device_fingerprint[:8]}...)"
        )

        return session_id

    async def validate_session(self, session_id: str) -> dict[str, Any] | None:
        """
        Valide une session et retourne ses données.

        Vérifie que la session existe, est active et n'a pas dépassé
        le timeout d'inactivité.

        Args:
            session_id: Identifiant de la session à valider

        Returns:
            Dictionnaire des données de la session, ou None si invalide
        """
        redis = await self._get_redis()
        session_key = f"{SESSION_PREFIX}{session_id}"

        # Vérifier l'existence de la session
        if not await redis.exists(session_key):
            return None

        session_data = await redis.hgetall(session_key)

        if not session_data:
            return None

        # Vérifier que la session est active
        if session_data.get("is_active") != "1":
            return None

        # Vérifier le timeout d'inactivité
        last_activity_str = session_data.get("last_activity")
        if last_activity_str:
            try:
                last_activity = datetime.fromisoformat(last_activity_str)
                inactivity_minutes = (
                    datetime.now(timezone.utc) - last_activity
                ).total_seconds() / 60
                if inactivity_minutes > settings.SESSION_INACTIVITY_TIMEOUT_MINUTES:
                    await self.destroy_session(session_id)
                    logger.info(
                        f"Session {session_id[:20]}... expirée par inactivité "
                        f"({inactivity_minutes:.0f} min)"
                    )
                    return None
            except (ValueError, TypeError):
                pass

        return session_data

    async def destroy_session(self, session_id: str) -> None:
        """
        Détruit une session spécifique.

        Supprime la session de Redis et la retire de l'ensemble
        des sessions de l'utilisateur.

        Args:
            session_id: Identifiant de la session à détruire
        """
        redis = await self._get_redis()
        session_key = f"{SESSION_PREFIX}{session_id}"

        # Récupérer l'utilisateur avant de supprimer
        session_data = await redis.hgetall(session_key)
        user_id = session_data.get("user_id")

        # Marquer comme inactive puis supprimer
        await redis.delete(session_key)

        # Retirer de l'ensemble des sessions de l'utilisateur
        if user_id:
            user_sessions_key = f"{USER_SESSIONS_PREFIX}{user_id}"
            await redis.srem(user_sessions_key, session_id)

            # Enregistrer l'événement
            await self._add_security_event(
                user_id=user_id,
                event_type="session_terminated",
                description=f"Session {session_id[:16]}... terminée",
                ip_address=session_data.get("ip_address"),
                severity="info",
            )

        logger.info(f"Session détruite: {session_id[:20]}...")

    async def destroy_all_sessions(self, user_id: str) -> int:
        """
        Détruit toutes les sessions actives d'un utilisateur.

        Utile en cas de compromission détectée ou de changement de mot de passe.

        Args:
            user_id: Identifiant de l'utilisateur

        Returns:
            Nombre de sessions détruites
        """
        redis = await self._get_redis()
        user_sessions_key = f"{USER_SESSIONS_PREFIX}{user_id}"
        session_ids = await redis.smembers(user_sessions_key)

        destroyed_count = 0
        for sid in session_ids:
            session_key = f"{SESSION_PREFIX}{sid}"
            await redis.delete(session_key)
            destroyed_count += 1

        # Vider l'ensemble des sessions
        await redis.delete(user_sessions_key)

        # Enregistrer l'événement
        if destroyed_count > 0:
            await self._add_security_event(
                user_id=user_id,
                event_type="sessions_revoked",
                description=f"{destroyed_count} session(s) révoquée(s)",
                severity="warning",
            )

        logger.info(
            f"Toutes les sessions révoquées pour l'utilisateur {user_id}: "
            f"{destroyed_count} session(s)"
        )

        return destroyed_count

    async def get_user_sessions(self, user_id: str) -> list[dict[str, Any]]:
        """
        Récupère toutes les sessions actives d'un utilisateur.

        Args:
            user_id: Identifiant de l'utilisateur

        Returns:
            Liste des sessions actives avec leurs métadonnées
        """
        redis = await self._get_redis()
        user_sessions_key = f"{USER_SESSIONS_PREFIX}{user_id}"
        session_ids = await redis.smembers(user_sessions_key)

        active_sessions = []
        for sid in session_ids:
            session_key = f"{SESSION_PREFIX}{sid}"
            session_data = await redis.hgetall(session_key)

            if session_data and session_data.get("is_active") == "1":
                session_data["session_id"] = sid
                active_sessions.append(session_data)
            elif not session_data:
                # Nettoyer les sessions expirées
                await redis.srem(user_sessions_key, sid)

        # Trier par date de création (plus récent en premier)
        active_sessions.sort(
            key=lambda s: s.get("created_at", ""), reverse=True
        )

        return active_sessions

    async def detect_suspicious_session(
        self,
        session_id: str,
        current_ip: str,
        current_user_agent: str,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> dict[str, Any]:
        """
        Détecte une activité suspecte sur une session.

        Vérifications effectuées :
        - Changement d'adresse IP
        - Voyage impossible (changement de localisation en temps trop court)
        - Nouvel appareil (empreinte numérique inconnue)
        - Changement de User-Agent

        Args:
            session_id: Identifiant de la session
            current_ip: Adresse IP actuelle du client
            current_user_agent: User-Agent actuel du client
            latitude: Latitude actuelle (optionnel)
            longitude: Longitude actuelle (optionnel)

        Returns:
            Dictionnaire avec is_suspicious, reasons, risk_score
        """
        redis = await self._get_redis()
        session_key = f"{SESSION_PREFIX}{session_id}"
        session_data = await redis.hgetall(session_key)

        if not session_data:
            return {
                "is_suspicious": False,
                "reasons": [],
                "risk_score": 0,
                "detail": "Session introuvable",
            }

        reasons: list[str] = []
        risk_score = 0

        original_ip = session_data.get("ip_address", "")
        original_ua = session_data.get("user_agent", "")
        user_id = session_data.get("user_id", "")
        device_fp = session_data.get("device_fingerprint", "")

        # 1. Changement d'adresse IP
        if original_ip and current_ip != original_ip:
            reasons.append(
                f"Changement d'IP détecté: {original_ip} → {current_ip}"
            )
            risk_score += 30

        # 2. Changement de User-Agent
        if original_ua and current_user_agent != original_ua:
            reasons.append("Changement de navigateur/appareil détecté")
            risk_score += 20

        # 3. Voyage impossible (si les coordonnées sont disponibles)
        if latitude is not None and longitude is not None:
            orig_lat_str = session_data.get("latitude", "")
            orig_lon_str = session_data.get("longitude", "")

            if orig_lat_str and orig_lon_str:
                try:
                    orig_lat = float(orig_lat_str)
                    orig_lon = float(orig_lon_str)
                    distance = _haversine_distance(
                        orig_lat, orig_lon, latitude, longitude
                    )

                    created_at_str = session_data.get("created_at", "")
                    if created_at_str:
                        created_at = datetime.fromisoformat(created_at_str)
                        time_diff_minutes = (
                            datetime.now(timezone.utc) - created_at
                        ).total_seconds() / 60

                        if (
                            time_diff_minutes > 0
                            and distance / time_diff_minutes
                            > IMPOSSIBLE_TRAVEL_THRESHOLD_KM
                            / IMPOSSIBLE_TRAVEL_THRESHOLD_MINUTES
                        ):
                            reasons.append(
                                f"Voyage impossible détecté: {distance:.0f}km "
                                f"en {time_diff_minutes:.0f}min"
                            )
                            risk_score += 50
                except (ValueError, TypeError):
                    pass

        # 4. Nouvel appareil (empreinte non reconnue)
        if user_id:
            trusted_key = f"{TRUSTED_DEVICES_PREFIX}{user_id}"
            # Calculer l'empreinte actuelle de l'appareil
            current_fp = hashlib.sha256(
                f"{current_user_agent}|{current_ip}".encode()
            ).hexdigest()[:16]

            is_trusted = await redis.sismember(trusted_key, current_fp)
            if not is_trusted and device_fp != current_fp:
                reasons.append("Appareil non reconnu")
                risk_score += 25

        # Limiter le score de risque
        risk_score = min(risk_score, MAX_RISK_SCORE)

        result = {
            "is_suspicious": risk_score >= 40,
            "reasons": reasons,
            "risk_score": risk_score,
        }

        # Enregistrer un événement si suspect
        if result["is_suspicious"] and user_id:
            await self._add_security_event(
                user_id=user_id,
                event_type="suspicious_activity",
                description=f"Activité suspecte détectée: {'; '.join(reasons)}",
                ip_address=current_ip,
                severity="high" if risk_score >= 60 else "warning",
            )
            logger.warning(
                f"Activité suspecte détectée sur session {session_id[:20]}... "
                f"(score: {risk_score}): {'; '.join(reasons)}"
            )

        return result

    async def update_session_activity(self, session_id: str) -> None:
        """
        Met à jour l'horodatage de dernière activité d'une session.

        Utilisé pour le suivi du timeout d'inactivité. À appeler à chaque
        requête authentifiée pour prolonger la session.

        Args:
            session_id: Identifiant de la session à mettre à jour
        """
        redis = await self._get_redis()
        session_key = f"{SESSION_PREFIX}{session_id}"

        if not await redis.exists(session_key):
            return

        now = datetime.now(timezone.utc).isoformat()
        await redis.hset(session_key, "last_activity", now)  # type: ignore[arg-type]

        # Rafraîchir le TTL de la session
        session_ttl = settings.SESSION_TIMEOUT_HOURS * 3600
        await redis.expire(session_key, session_ttl)

    async def mark_session_mfa_verified(self, session_id: str) -> None:
        """
        Marque une session comme vérifiée par MFA.

        Args:
            session_id: Identifiant de la session
        """
        redis = await self._get_redis()
        session_key = f"{SESSION_PREFIX}{session_id}"

        if await redis.exists(session_key):
            await redis.hset(session_key, "mfa_verified", "1")  # type: ignore[arg-type]

    # ─── Appareils de confiance ────────────────────────────────────────────────

    async def get_trusted_devices(self, user_id: str) -> list[dict[str, Any]]:
        """
        Récupère la liste des appareils de confiance d'un utilisateur.

        Args:
            user_id: Identifiant de l'utilisateur

        Returns:
            Liste des appareils de confiance avec métadonnées
        """
        redis = await self._get_redis()
        trusted_key = f"{TRUSTED_DEVICES_PREFIX}{user_id}"
        device_fingerprints = await redis.smembers(trusted_key)

        devices = []
        for fp in device_fingerprints:
            # Essayer de récupérer les métadonnées de l'appareil
            device_meta_key = f"{TRUSTED_DEVICES_PREFIX}{user_id}:meta:{fp}"
            meta = await redis.hgetall(device_meta_key)

            device_info: dict[str, Any] = {
                "device_id": fp,
                "fingerprint": fp,
                "is_trusted": True,
            }
            if meta:
                device_info.update(meta)

            devices.append(device_info)

        return devices

    async def add_trusted_device(
        self,
        user_id: str,
        device_fingerprint: str,
        device_name: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        """
        Ajoute un appareil à la liste de confiance d'un utilisateur.

        Args:
            user_id: Identifiant de l'utilisateur
            device_fingerprint: Empreinte numérique de l'appareil
            device_name: Nom optionnel de l'appareil
            user_agent: User-Agent optionnel pour l'identification
        """
        redis = await self._get_redis()
        trusted_key = f"{TRUSTED_DEVICES_PREFIX}{user_id}"

        await redis.sadd(trusted_key, device_fingerprint)

        # Stocker les métadonnées de l'appareil
        if device_name or user_agent:
            device_meta_key = f"{TRUSTED_DEVICES_PREFIX}{user_id}:meta:{device_fingerprint}"
            meta: dict[str, str] = {
                "added_at": datetime.now(timezone.utc).isoformat(),
            }
            if device_name:
                meta["device_name"] = device_name
            if user_agent:
                meta["user_agent"] = user_agent[:255]  # Limiter la longueur
            await redis.hset(device_meta_key, mapping=meta)  # type: ignore[arg-type]
            await redis.expire(device_meta_key, 90 * 24 * 3600)  # 90 jours

        await redis.expire(trusted_key, 90 * 24 * 3600)  # 90 jours

        logger.info(f"Appareil de confiance ajouté pour utilisateur {user_id}: {device_fingerprint[:8]}...")

    async def remove_trusted_device(self, user_id: str, device_id: str) -> bool:
        """
        Retire un appareil de la liste de confiance d'un utilisateur.

        Args:
            user_id: Identifiant de l'utilisateur
            device_id: Identifiant/empreinte de l'appareil à retirer

        Returns:
            True si l'appareil a été retiré, False s'il n'était pas dans la liste
        """
        redis = await self._get_redis()
        trusted_key = f"{TRUSTED_DEVICES_PREFIX}{user_id}"

        removed = await redis.srem(trusted_key, device_id)

        # Supprimer les métadonnées
        device_meta_key = f"{TRUSTED_DEVICES_PREFIX}{user_id}:meta:{device_id}"
        await redis.delete(device_meta_key)

        if removed:
            await self._add_security_event(
                user_id=user_id,
                event_type="trusted_device_removed",
                description=f"Appareil de confiance retiré: {device_id[:8]}...",
                severity="info",
            )
            logger.info(
                f"Appareil de confiance retiré pour utilisateur {user_id}: {device_id[:8]}..."
            )

        return removed > 0

    # ─── Événements de sécurité ────────────────────────────────────────────────

    async def _add_security_event(
        self,
        user_id: str,
        event_type: str,
        description: str,
        ip_address: str | None = None,
        severity: str = "info",
    ) -> dict[str, Any]:
        """
        Ajoute un événement de sécurité au journal.

        Les événements sont stockés dans une liste Redis avec un TTL
        automatique de 30 jours.

        Args:
            user_id: Identifiant de l'utilisateur concerné
            event_type: Type d'événement (session_created, suspicious_activity, etc.)
            description: Description lisible de l'événement
            ip_address: Adresse IP associée à l'événement
            severity: Sévérité (info, warning, high, critical)

        Returns:
            Dictionnaire de l'événement créé
        """
        redis = await self._get_redis()

        event: dict[str, Any] = {
            "id": f"evt-{int(time.time())}-{secrets.token_hex(4)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "event_type": event_type,
            "description": description,
            "ip_address": ip_address or "",
            "severity": severity,
        }

        events_key = f"{SECURITY_EVENTS_PREFIX}{user_id}"
        await redis.lpush(events_key, json.dumps(event))
        # Garder les 200 derniers événements
        await redis.ltrim(events_key, 0, 199)
        # TTL de 30 jours
        await redis.expire(events_key, 30 * 24 * 3600)

        return event

    async def get_security_events(
        self, user_id: str, limit: int = 50
    ) -> list[dict[str, Any]]:
        """
        Récupère les événements de sécurité d'un utilisateur.

        Args:
            user_id: Identifiant de l'utilisateur
            limit: Nombre maximum d'événements à retourner (max 200)

        Returns:
            Liste des événements de sécurité, les plus récents en premier
        """
        redis = await self._get_redis()
        events_key = f"{SECURITY_EVENTS_PREFIX}{user_id}"

        limit = min(limit, 200)
        raw_events = await redis.lrange(events_key, 0, limit - 1)

        events = []
        for raw in raw_events:
            try:
                event = json.loads(raw)
                events.append(event)
            except (json.JSONDecodeError, TypeError):
                continue

        return events

    async def close(self) -> None:
        """Ferme la connexion Redis."""
        if self._redis is not None:
            await self._redis.close()
            self._redis = None
            logger.info("Connexion Redis fermée (SessionService)")


# Instance singleton du service
session_service = SessionService()
