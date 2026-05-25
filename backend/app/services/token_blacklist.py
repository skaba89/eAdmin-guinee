"""
Service de blacklist JWT et suivi des tentatives de connexion via Redis - eAdministration Suite Guinea.
Stocke les tokens révoqués dans Redis avec TTL automatique.
Suit les tentatives de connexion échouées pour le verrouillage de compte.
Supporte le multi-instance (contrairement à un set Python en mémoire).
"""

import time
import logging
from datetime import datetime, timezone

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

# Préfixe Redis pour les clés de blacklist
BLACKLIST_PREFIX = "eadmin:token_blacklist:"
# Préfixe Redis pour les refresh tokens actifs
REFRESH_TOKEN_PREFIX = "eadmin:refresh_tokens:"
# Préfixe Redis pour les tentatives de connexion
LOGIN_ATTEMPTS_PREFIX = "eadmin:login_attempts:"


class TokenBlacklistService:
    """
    Service de gestion de la blacklist JWT avec Redis.

    Avantages par rapport à un set Python en mémoire :
    - Persistant après redémarrage du serveur
    - Partagé entre plusieurs instances backend
    - TTL automatique pour le nettoyage des tokens expirés
    - Performant (opérations O(1) en Redis)
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

    async def revoke_token(self, token_jti: str, expires_in_seconds: int) -> None:
        """
        Ajoute un token à la blacklist avec un TTL correspondant à son expiration.

        Args:
            token_jti: Identifiant unique du token (claim 'jti' ou hash du token)
            expires_in_seconds: Durée restante avant expiration du token
        """
        if expires_in_seconds <= 0:
            # Token déjà expiré, pas besoin de le blacklister
            return

        redis = await self._get_redis()
        key = f"{BLACKLIST_PREFIX}{token_jti}"
        await redis.setex(key, expires_in_seconds, "revoked")
        logger.info(f"Token révoqué: {token_jti[:8]}... (TTL: {expires_in_seconds}s)")

    async def is_token_revoked(self, token_jti: str) -> bool:
        """
        Vérifie si un token est dans la blacklist.

        Args:
            token_jti: Identifiant unique du token

        Returns:
            True si le token est révoqué, False sinon
        """
        redis = await self._get_redis()
        key = f"{BLACKLIST_PREFIX}{token_jti}"
        return await redis.exists(key) > 0

    async def store_refresh_token(self, user_id: str, refresh_jti: str, expires_in_seconds: int = 7 * 24 * 3600) -> None:
        """
        Stocke un refresh token actif pour un utilisateur.
        Permet de révoquer tous les refresh tokens d'un utilisateur en une fois.

        Args:
            user_id: ID de l'utilisateur
            refresh_jti: Identifiant unique du refresh token
            expires_in_seconds: Durée de vie (7 jours par défaut)
        """
        redis = await self._get_redis()
        key = f"{REFRESH_TOKEN_PREFIX}{user_id}"
        await redis.sadd(key, refresh_jti)
        await redis.expire(key, expires_in_seconds)
        logger.info(f"Refresh token stocké pour utilisateur {user_id}: {refresh_jti[:8]}...")

    async def is_refresh_token_valid(self, user_id: str, refresh_jti: str) -> bool:
        """
        Vérifie si un refresh token est toujours actif pour un utilisateur.

        Args:
            user_id: ID de l'utilisateur
            refresh_jti: Identifiant unique du refresh token

        Returns:
            True si le refresh token est actif, False sinon
        """
        redis = await self._get_redis()
        key = f"{REFRESH_TOKEN_PREFIX}{user_id}"
        return await redis.sismember(key, refresh_jti) > 0

    async def revoke_all_user_tokens(self, user_id: str) -> int:
        """
        Révoque tous les refresh tokens d'un utilisateur.
        Utile pour une déconnexion globale ou un changement de mot de passe.

        Args:
            user_id: ID de l'utilisateur

        Returns:
            Nombre de tokens révoqués
        """
        redis = await self._get_redis()
        key = f"{REFRESH_TOKEN_PREFIX}{user_id}"
        count = await redis.scard(key)
        await redis.delete(key)
        logger.info(f"Tous les refresh tokens révoqués pour l'utilisateur {user_id} ({count} tokens)")
        return count

    # --- Suivi des tentatives de connexion (Redis-backed) ---

    async def is_account_locked(self, email: str, max_attempts: int = 5, lockout_seconds: int = 900) -> bool:
        """
        Vérifie si un compte est verrouillé suite à trop de tentatives échouées.

        Args:
            email: Adresse email du compte
            max_attempts: Nombre maximum de tentatives avant verrouillage (défaut: 5)
            lockout_seconds: Durée du verrouillage en secondes (défaut: 900 = 15 min)

        Returns:
            True si le compte est verrouillé, False sinon
        """
        redis = await self._get_redis()
        key = f"{LOGIN_ATTEMPTS_PREFIX}{email}"
        now = time.time()

        # Récupérer les tentatives existantes
        attempts_raw = await redis.lrange(key, 0, -1)
        attempts = [float(t) for t in attempts_raw if now - float(t) < lockout_seconds]

        # Nettoyer les tentatives expirées et remettre à jour la liste
        if len(attempts) != len(attempts_raw):
            await redis.delete(key)
            if attempts:
                await redis.rpush(key, *[str(t) for t in attempts])
                await redis.expire(key, lockout_seconds)

        return len(attempts) >= max_attempts

    async def record_failed_login(self, email: str, lockout_seconds: int = 900) -> None:
        """
        Enregistre une tentative de connexion échouée dans Redis.

        Args:
            email: Adresse email du compte
            lockout_seconds: Durée du verrouillage en secondes (défaut: 900 = 15 min)
        """
        redis = await self._get_redis()
        key = f"{LOGIN_ATTEMPTS_PREFIX}{email}"
        now = time.time()

        await redis.rpush(key, str(now))
        await redis.expire(key, lockout_seconds)
        logger.info(f"Tentative de connexion échouée enregistrée pour {email}")

    async def reset_login_attempts(self, email: str) -> None:
        """
        Réinitialise le compteur de tentatives de connexion après une connexion réussie.

        Args:
            email: Adresse email du compte
        """
        redis = await self._get_redis()
        key = f"{LOGIN_ATTEMPTS_PREFIX}{email}"
        await redis.delete(key)

    async def get_remaining_attempts(self, email: str, max_attempts: int = 5, lockout_seconds: int = 900) -> int:
        """
        Retourne le nombre de tentatives restantes avant verrouillage.

        Args:
            email: Adresse email du compte
            max_attempts: Nombre maximum de tentatives (défaut: 5)
            lockout_seconds: Fenêtre de temps en secondes (défaut: 900 = 15 min)

        Returns:
            Nombre de tentatives restantes (0 si verrouillé)
        """
        redis = await self._get_redis()
        key = f"{LOGIN_ATTEMPTS_PREFIX}{email}"
        now = time.time()

        attempts_raw = await redis.lrange(key, 0, -1)
        valid_attempts = [float(t) for t in attempts_raw if now - float(t) < lockout_seconds]

        return max(0, max_attempts - len(valid_attempts))

    async def close(self) -> None:
        """Ferme la connexion Redis."""
        if self._redis is not None:
            await self._redis.close()
            self._redis = None
            logger.info("Connexion Redis fermée")


# Instance singleton du service
token_blacklist = TokenBlacklistService()
