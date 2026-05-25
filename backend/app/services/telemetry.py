"""
Service de télémétrie - eAdministration Suite Guinea.
Intégration OpenTelemetry pour le tracing distribué et les métriques.
Dégénération gracieuse si les dépendances OTLP ne sont pas disponibles.
"""

import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)


class TelemetryService:
    """
    Intégration OpenTelemetry pour le tracing distribué et les métriques.

    Fournit :
    - Tracing distribué via OTLP exporter
    - Métriques Prometheus via OTLP + PrometheusMetricReader
    - Dégénération gracieuse si les dépendances ne sont pas installées
    """

    def __init__(self):
        self.tracer: Optional[object] = None
        self.meter: Optional[object] = None
        self.request_counter: Optional[object] = None
        self.error_counter: Optional[object] = None
        self.response_time_histogram: Optional[object] = None
        self.active_sessions_gauge: Optional[object] = None
        self.db_query_counter: Optional[object] = None
        self._initialized = False
        self._otel_available = False

    def setup(self, otlp_endpoint: str = "http://localhost:4317"):
        """
        Initialise OpenTelemetry avec l'exporter OTLP.

        Dégénère gracieusement si les bibliothèques opentelemetry
        ne sont pas installées dans l'environnement.

        Args:
            otlp_endpoint: URL du collecteur OTLP (défaut: localhost:4317)
        """
        try:
            from opentelemetry import trace, metrics
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
            from opentelemetry.sdk.metrics import MeterProvider
            from opentelemetry.sdk.resources import Resource

            # Ressource avec métadonnées du service
            resource = Resource.create({
                "service.name": "eadmin-backend",
                "service.version": "1.0.0",
                "deployment.environment": "guinea-govtech",
                "service.namespace": "eadministration-guinea",
            })

            # --- Tracing ---
            try:
                from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
                trace_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
                trace_provider = TracerProvider(resource=resource)
                trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
                trace.set_tracer_provider(trace_provider)
            except Exception as e:
                logger.warning(f"OTLP trace exporter indisponible, utilisation du provider par défaut: {e}")
                trace.set_tracer_provider(TracerProvider(resource=resource))

            self.tracer = trace.get_tracer("eadmin.backend", "1.0.0")

            # --- Métriques ---
            try:
                from opentelemetry.exporter.prometheus import PrometheusMetricReader
                metric_reader = PrometheusMetricReader()
                meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
                metrics.set_meter_provider(meter_provider)
            except Exception as e:
                logger.warning(f"PrometheusMetricReader indisponible, utilisation du provider par défaut: {e}")
                metrics.set_meter_provider(MeterProvider(resource=resource))

            self.meter = metrics.get_meter("eadmin.backend", "1.0.0")

            # Créer les instruments de métriques
            self.request_counter = self.meter.create_counter(
                name="eadmin.requests.total",
                description="Nombre total de requêtes API",
                unit="1",
            )
            self.error_counter = self.meter.create_counter(
                name="eadmin.errors.total",
                description="Nombre total d'erreurs API",
                unit="1",
            )
            self.response_time_histogram = self.meter.create_histogram(
                name="eadmin.response.duration",
                description="Temps de réponse des requêtes API",
                unit="ms",
            )
            self.active_sessions_gauge = self.meter.create_up_down_counter(
                name="eadmin.sessions.active",
                description="Nombre de sessions utilisateur actives",
                unit="1",
            )
            self.db_query_counter = self.meter.create_counter(
                name="eadmin.db.queries.total",
                description="Nombre total de requêtes base de données",
                unit="1",
            )

            self._initialized = True
            self._otel_available = True
            logger.info(f"OpenTelemetry initialisé avec succès (endpoint: {otlp_endpoint})")

        except ImportError:
            logger.warning(
                "OpenTelemetry non disponible. Installez les dépendances : "
                "pip install opentelemetry-api opentelemetry-sdk "
                "opentelemetry-exporter-otlp-proto-grpc opentelemetry-exporter-prometheus"
            )
            self._otel_available = False
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation OpenTelemetry: {e}")
            self._otel_available = False

    def record_request(self, method: str, path: str, status_code: int, duration_ms: float):
        """
        Enregistre une requête API avec tracing et métriques.

        Args:
            method: Méthode HTTP (GET, POST, etc.)
            path: Chemin de la requête
            status_code: Code de statut HTTP
            duration_ms: Durée de la requête en millisecondes
        """
        if not self._otel_available:
            return

        try:
            attributes = {
                "http.method": method,
                "http.path": path,
                "http.status_code": status_code,
            }

            # Incrémenter le compteur de requêtes
            if self.request_counter:
                self.request_counter.add(1, attributes)

            # Enregistrer le temps de réponse
            if self.response_time_histogram:
                self.response_time_histogram.record(duration_ms, attributes)

            # Incrémenter le compteur d'erreurs si 4xx/5xx
            if status_code >= 400 and self.error_counter:
                error_attrs = {**attributes, "error.type": "client" if status_code < 500 else "server"}
                self.error_counter.add(1, error_attrs)

        except Exception as e:
            logger.debug(f"Erreur télémétrie record_request: {e}")

    def record_db_query(self, operation: str, table: str, duration_ms: float):
        """
        Enregistre une requête base de données.

        Args:
            operation: Type d'opération (SELECT, INSERT, UPDATE, DELETE)
            table: Nom de la table
            duration_ms: Durée de la requête en millisecondes
        """
        if not self._otel_available:
            return

        try:
            attributes = {
                "db.operation": operation,
                "db.table": table,
            }

            if self.db_query_counter:
                self.db_query_counter.add(1, attributes)

            if self.response_time_histogram:
                self.response_time_histogram.record(duration_ms, {
                    "type": "db_query",
                    "db.operation": operation,
                    "db.table": table,
                })

        except Exception as e:
            logger.debug(f"Erreur télémétrie record_db_query: {e}")

    def record_auth_event(self, event_type: str, success: bool, user_id: str | None = None):
        """
        Enregistre un événement d'authentification.

        Args:
            event_type: Type d'événement (login, logout, mfa_verify, token_refresh)
            success: Succès ou échec de l'opération
            user_id: Identifiant de l'utilisateur (optionnel)
        """
        if not self._otel_available:
            return

        try:
            attributes = {
                "auth.event_type": event_type,
                "auth.success": str(success),
            }
            if user_id:
                attributes["auth.user_id"] = user_id

            if self.request_counter:
                self.request_counter.add(1, attributes)

            if not success and self.error_counter:
                self.error_counter.add(1, {**attributes, "error.type": "auth_failure"})

        except Exception as e:
            logger.debug(f"Erreur télémétrie record_auth_event: {e}")

    def start_span(self, name: str, attributes: dict | None = None):
        """
        Démarre un span de tracing distribué.

        Args:
            name: Nom du span
            attributes: Attributs additionnels

        Returns:
            Un context manager de span, ou un no-op si OTel non disponible
        """
        if not self._otel_available or not self.tracer:
            return _NoOpSpan()

        try:
            return self.tracer.start_as_current_span(name, attributes=attributes)
        except Exception:
            return _NoOpSpan()

    def increment_sessions(self, delta: int = 1):
        """Incrémente le compteur de sessions actives."""
        if self._otel_available and self.active_sessions_gauge:
            try:
                self.active_sessions_gauge.add(delta)
            except Exception:
                pass


class _NoOpSpan:
    """Span no-op pour la dégénération gracieuse quand OTel n'est pas disponible."""

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def set_attribute(self, key: str, value):
        pass

    def set_status(self, status, description: str = ""):
        pass

    def record_exception(self, exception: Exception):
        pass


# Singleton
telemetry_service = TelemetryService()
