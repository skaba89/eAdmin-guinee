"""
Service Sentry - eAdministration Suite Guinea.
Suivi des erreurs et exceptions avec Sentry.
Dégénération gracieuse si Sentry n'est pas configuré.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class SentryService:
    """
    Intégration Sentry pour le suivi des erreurs en production.

    Fonctionnalités :
    - Capture des exceptions avec contexte enrichi
    - Attribution des erreurs aux utilisateurs (user context)
    - Tags personnalisés pour le filtrage (tenant, institution, rôle)
    - Dégénération gracieuse si sentry-sdk n'est pas installé
    """

    def __init__(self):
        self._initialized = False
        self._sentry_available = False

    def init(self, dsn: str, environment: str = "development", release: str = "1.0.0"):
        """
        Initialise Sentry avec la configuration appropriée.

        Args:
            dsn: Data Source Name Sentry (URL du projet)
            environment: Environnement de déploiement (development, staging, production)
            release: Version de l'application pour le suivi des déploiements
        """
        if not dsn:
            logger.info("Sentry DSN non configuré — suivi des erreurs désactivé")
            return

        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration
            from sentry_sdk.integrations.redis import RedisIntegration
            from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

            sentry_sdk.init(
                dsn=dsn,
                environment=environment,
                release=release,
                integrations=[
                    FastApiIntegration(),
                    RedisIntegration(),
                    SqlalchemyIntegration(),
                ],
                # Échantillonnage des traces
                traces_sample_rate=0.1 if environment == "production" else 1.0,
                # Profiling
                profiles_sample_rate=0.1 if environment == "production" else 1.0,
                # Ne pas envoyer en développement si DSN manuel
                send_default_pii=False,  # Conformité RGPD — pas de PII par défaut
                # Seuil de surveillance des performances
                max_breadcrumbs=50,
                # Attacher la stacktrace locale
                attach_stacktrace=True,
                # Tags par défaut
                default_integrations=True,
            )

            # Ajouter des tags globaux
            sentry_sdk.set_tag("system", "eadmin-guinea")
            sentry_sdk.set_tag("govtech", "guinea")
            sentry_sdk.set_tag("component", "backend")

            self._initialized = True
            self._sentry_available = True
            logger.info(f"Sentry initialisé avec succès (env={environment}, release={release})")

        except ImportError:
            logger.warning(
                "sentry-sdk non installé. Installez-le avec : pip install sentry-sdk[fastapi,redis,sqlalchemy]"
            )
            self._sentry_available = False
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation de Sentry: {e}")
            self._sentry_available = False

    def capture_exception(self, exception: Exception, context: dict | None = None):
        """
        Capture une exception avec contexte additionnel.

        Args:
            exception: L'exception à capturer
            context: Contexte additionnel (dictionnaire clé-valeur)
        """
        if not self._sentry_available:
            # Fallback : journalisation standard
            logger.error(
                f"Exception non capturée par Sentry: {type(exception).__name__}: {exception}",
                exc_info=True,
                extra=context or {}
            )
            return

        try:
            import sentry_sdk

            with sentry_sdk.push_scope() as scope:
                # Ajouter le contexte personnalisé
                if context:
                    for key, value in context.items():
                        scope.set_context(key, value if isinstance(value, dict) else {"value": str(value)})
                        scope.set_tag(f"context.{key}", str(value)[:200])

                # Capturer l'exception
                sentry_sdk.capture_exception(exception)

        except Exception as e:
            logger.error(f"Erreur lors de la capture Sentry: {e}")
            logger.error(f"Exception originale: {type(exception).__name__}: {exception}")

    def set_user_context(self, user_id: str, role: str, tenant_id: str):
        """
        Définit le contexte utilisateur Sentry pour l'attribution des erreurs.

        Permet de savoir quel utilisateur a rencontré l'erreur,
        dans quel tenant et avec quel rôle.

        Args:
            user_id: Identifiant unique de l'utilisateur
            role: Rôle de l'utilisateur (AGENT, ADMIN, etc.)
            tenant_id: Identifiant du tenant
        """
        if not self._sentry_available:
            return

        try:
            import sentry_sdk

            sentry_sdk.set_user({
                "id": user_id,
                "role": role,
                "tenant_id": tenant_id,
            })

            # Tags pour le filtrage dans l'interface Sentry
            sentry_sdk.set_tag("user.role", role)
            sentry_sdk.set_tag("user.tenant_id", tenant_id)

        except Exception as e:
            logger.debug(f"Erreur Sentry set_user_context: {e}")

    def clear_user_context(self):
        """Supprime le contexte utilisateur Sentry (déconnexion)."""
        if not self._sentry_available:
            return

        try:
            import sentry_sdk
            sentry_sdk.set_user(None)
        except Exception:
            pass

    def add_breadcrumb(self, category: str, message: str, level: str = "info", data: dict | None = None):
        """
        Ajoute un breadcrumb (trace de navigation) pour le contexte d'erreur.

        Args:
            category: Catégorie du breadcrumb (auth, navigation, request, etc.)
            message: Message descriptif
            level: Niveau (debug, info, warning, error)
            data: Données additionnelles
        """
        if not self._sentry_available:
            return

        try:
            import sentry_sdk
            sentry_sdk.add_breadcrumb(
                category=category,
                message=message,
                level=level,
                data=data or {},
            )
        except Exception:
            pass

    def capture_message(self, message: str, level: str = "info", context: dict | None = None):
        """
        Capture un message avec niveau de sévérité.

        Args:
            message: Message à capturer
            level: Niveau de sévérité (debug, info, warning, error, fatal)
            context: Contexte additionnel
        """
        if not self._sentry_available:
            logger.log(
                getattr(logging, level.upper(), logging.INFO),
                f"[Sentry fallback] {message}",
                extra=context or {}
            )
            return

        try:
            import sentry_sdk

            with sentry_sdk.push_scope() as scope:
                if context:
                    for key, value in context.items():
                        scope.set_context(key, value if isinstance(value, dict) else {"value": str(value)})
                sentry_sdk.capture_message(message, level=level)

        except Exception as e:
            logger.debug(f"Erreur Sentry capture_message: {e}")


# Singleton
sentry_service = SentryService()
