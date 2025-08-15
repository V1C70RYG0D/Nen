#!/usr/bin/env python3
"""
AI Agent Performance Metrics Collector
Tracks accuracy, efficiency, and adaptability metrics for AI agents
"""

import time
import json
import logging
import threading
import os
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from enum import Enum
from prometheus_client import Counter, Histogram, Gauge, Summary, CollectorRegistry, generate_latest
import psutil
import numpy as np
from collections import deque, defaultdict
import asyncio

from .config import get_config, get_metrics_config, AIConfig, MetricsConfigclass MetricType(Enum):
    """Types of metrics being collected"""
    ACCURACY = "accuracy"
    EFFICIENCY = "efficiency"
    ADAPTABILITY = "adaptability"
    SYSTEM = "system"
    BUSINESS = "business"class AgentStatus(Enum):
    """AI Agent operational status"""
    IDLE = "idle"
    PROCESSING = "processing"
    LEARNING = "learning"
    ERROR = "error"
    OPTIMIZING = "optimizing"@dataclass
class AccuracyMetrics:
    """Accuracy-related metrics for AI agents"""
    prediction_accuracy: float = 0.0
    classification_accuracy: float = 0.0
    f1_score: float = 0.0
    precision: float = 0.0
    recall: float = 0.0
    auc_roc: float = 0.0
    mean_absolute_error: float = 0.0
    root_mean_square_error: float = 0.0
    confidence_score: float = 0.0
    false_positive_rate: float = 0.0
    false_negative_rate: float = 0.0
    model_drift_score: float = 0.0@dataclass
class EfficiencyMetrics:
    """Efficiency-related metrics for AI agents"""
    response_time_ms: float = 0.0
    throughput_requests_per_second: float = 0.0
    cpu_usage_percent: float = 0.0
    memory_usage_mb: float = 0.0
    gpu_usage_percent: float = 0.0
    inference_time_ms: float = 0.0
    preprocessing_time_ms: float = 0.0
    postprocessing_time_ms: float = 0.0
    model_load_time_ms: float = 0.0
    cache_hit_rate: float = 0.0
    queue_length: int = 0
    concurrent_requests: int = 0
    tokens_per_second: float = 0.0
    cost_per_request: float = 0.0@dataclass
class AdaptabilityMetrics:
    """Adaptability-related metrics for AI agents"""
    learning_rate: float = 0.0
    adaptation_time_ms: float = 0.0
    model_updates_count: int = 0
    feature_importance_stability: float = 0.0
    context_switching_efficiency: float = 0.0
    domain_transfer_success_rate: float = 0.0
    online_learning_accuracy: float = 0.0
    concept_drift_detection_rate: float = 0.0
    self_correction_rate: float = 0.0
    knowledge_retention_score: float = 0.0
    generalization_score: float = 0.0
    robustness_score: float = 0.0@dataclass
class SystemMetrics:
    """System-level metrics"""
    disk_usage_percent: float = 0.0
    network_io_mbps: float = 0.0
    database_connections: int = 0
    error_rate: float = 0.0
    uptime_seconds: float = 0.0
    health_score: float = 1.0@dataclass
class MetricsSnapshot:
    """Complete metrics snapshot at a point in time"""
    timestamp: datetime
    agent_id: str
    agent_status: AgentStatus
    accuracy: AccuracyMetrics
    efficiency: EfficiencyMetrics
    adaptability: AdaptabilityMetrics
    system: SystemMetrics
    custom_metrics: Dict[str, Any]class MetricsCollector:
    """Central metrics collection and management system"""

    def __init__(self, agent_id: str, config: Optional[Dict] = None):
        self.agent_id = agent_id

        # Load configuration from centralized config system
        self.ai_config = get_config()
        self.metrics_config = get_metrics_config()

        # Override with provided config if any
        if config:
            # Merge provided config with defaults
            for key, value in config.items():
                if hasattr(self.metrics_config, key):
                    setattr(self.metrics_config, key, value)

        self.registry = CollectorRegistry()
        self.logger = self._setup_logging()

        # Prometheus metrics
        self._setup_prometheus_metrics()

        # Internal state
        self.current_status = AgentStatus.IDLE
        self.start_time = time.time()
        self.metrics_history = deque(maxlen=self.metrics_config.history_size)
        self.custom_metrics = {}
        self.callbacks = defaultdict(list)

        # Thread safety
        self.lock = threading.RLock()

        # Background collection - configured values
        self.collection_interval = self.metrics_config.collection_interval
        self.collection_thread = None
        self.stop_collection = threading.Event()

        # Performance tracking - configured buffer size
        self.request_times = deque(maxlen=self.metrics_config.request_buffer_size)
        self.error_count = 0
        self.total_requests = 0

        # Validation
        self._validate_configuration()

        self.logger.info(f"MetricsCollector initialized for agent {self.agent_id} in {self.ai_config.environment} environment")

    def _validate_configuration(self):
        """Validate configuration values"""
        try:
            self.ai_config.validate()
            self.metrics_config.validate()
        except ValueError as e:
            self.logger.error(f"Configuration validation failed: {e}")
            raise

    def _setup_logging(self) -> logging.Logger:
        """Setup structured logging for metrics"""
        logger = logging.getLogger(f'metrics_collector_{self.agent_id}')
        logger.setLevel(self.ai_config.get_log_level())

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(self.ai_config.log_format)
            handler.setFormatter(formatter)
            logger.addHandler(handler)

            # Add file handler for production
            if self.ai_config.is_production():
                log_file = os.path.join(
                    self.metrics_config.metrics_storage_path,
                    f'metrics_{self.agent_id}.log'
                )
                os.makedirs(os.path.dirname(log_file), exist_ok=True)
                file_handler = logging.FileHandler(log_file)
                file_handler.setFormatter(formatter)
                logger.addHandler(file_handler)

        return logger

    def _setup_prometheus_metrics(self):
        """Initialize Prometheus metrics"""
        # Accuracy metrics
        self.accuracy_gauge = Gauge(
            'ai_agent_accuracy_score',
            'AI agent prediction accuracy score',
            ['agent_id', 'metric_type'],
            registry=self.registry
        )

        # Efficiency metrics
        self.response_time_histogram = Histogram(
            'ai_agent_response_time_seconds',
            'AI agent response time distribution',
            ['agent_id', 'operation'],
            registry=self.registry
        )

        self.throughput_gauge = Gauge(
            'ai_agent_throughput_rps',
            'AI agent throughput in requests per second',
            ['agent_id'],
            registry=self.registry
        )

        self.resource_usage_gauge = Gauge(
            'ai_agent_resource_usage',
            'AI agent resource usage',
            ['agent_id', 'resource_type'],
            registry=self.registry
        )

        # Adaptability metrics
        self.adaptability_gauge = Gauge(
            'ai_agent_adaptability_score',
            'AI agent adaptability metrics',
            ['agent_id', 'adaptation_type'],
            registry=self.registry
        )

        # System metrics
        self.system_health_gauge = Gauge(
            'ai_agent_system_health',
            'AI agent system health score',
            ['agent_id'],
            registry=self.registry
        )

        # Request counters
        self.request_counter = Counter(
            'ai_agent_requests_total',
            'Total number of requests processed',
            ['agent_id', 'status'],
            registry=self.registry
        )

        self.error_counter = Counter(
            'ai_agent_errors_total',
            'Total number of errors encountered',
            ['agent_id', 'error_type'],
            registry=self.registry
        )

    def start_collection(self):
        """Start background metrics collection"""
        if self.collection_thread is None or not self.collection_thread.is_alive():
            self.stop_collection.clear()
            self.collection_thread = threading.Thread(
                target=self._collection_loop,
                daemon=True
            )
            self.collection_thread.start()
            self.logger.info(f"Started metrics collection for agent {self.agent_id}")

    def stop_collection_process(self):
        """Stop background metrics collection"""
        self.stop_collection.set()
        if self.collection_thread:
            self.collection_thread.join(timeout=5.0)
        self.logger.info(f"Stopped metrics collection for agent {self.agent_id}")

    def _collection_loop(self):
        """Background metrics collection loop"""
        while not self.stop_collection.wait(self.collection_interval):
            try:
                self.collect_system_metrics()
                self._update_prometheus_metrics()
            except Exception as e:
                self.logger.error(f"Error in metrics collection: {e}")

    def record_request_start(self, operation: str = "default") -> str:
        """Record the start of a request/operation"""
        request_id = f"{operation}_{time.time()}_{threading.current_thread().ident}"

        with self.lock:
            self.total_requests += 1
            self.current_status = AgentStatus.PROCESSING

        self.request_counter.labels(
            agent_id=self.agent_id,
            status="started"
        ).inc()

        return request_id

    def record_request_end(self, request_id: str, success: bool = True,
                          error_type: Optional[str] = None):
        """Record the end of a request/operation"""
        try:
            if not request_id or '_' not in request_id:
                self.logger.error(f"Invalid request_id format: {request_id}")
                return

            request_parts = request_id.split('_')
            if len(request_parts) < 2:
                self.logger.error(f"Malformed request_id: {request_id}")
                return

            operation = request_parts[0]
            try:
                start_time = float(request_parts[1])
            except (ValueError, IndexError) as e:
                self.logger.error(f"Invalid timestamp in request_id {request_id}: {e}")
                return

            duration = time.time() - start_time

            # Validate duration is reasonable
            if duration < 0 or duration > self.metrics_config.response_time_threshold_ms / 1000:
                self.logger.warning(f"Unusual request duration: {duration}s for operation {operation}")

            with self.lock:
                self.request_times.append(duration)
                if not success:
                    self.error_count += 1
                self.current_status = AgentStatus.IDLE

            # Update Prometheus metrics with error handling
            try:
                self.response_time_histogram.labels(
                    agent_id=self.agent_id,
                    operation=operation
                ).observe(duration)

                status = "success" if success else "error"
                self.request_counter.labels(
                    agent_id=self.agent_id,
                    status=status
                ).inc()

                if error_type:
                    self.error_counter.labels(
                        agent_id=self.agent_id,
                        error_type=error_type
                    ).inc()

            except Exception as e:
                self.logger.error(f"Failed to update Prometheus metrics: {e}")

        except Exception as e:
            self.logger.error(f"Unexpected error in record_request_end: {e}")
            # Continue execution - don't let metrics collection break the main flow

    def record_accuracy_metrics(self, metrics: AccuracyMetrics):
        """Record accuracy-related metrics with comprehensive error handling"""
        try:
            if not isinstance(metrics, AccuracyMetrics):
                self.logger.error(f"Invalid metrics type. Expected AccuracyMetrics, got {type(metrics)}")
                return

            with self.lock:
                # Validate metric values
                if not (0.0 <= metrics.prediction_accuracy <= 1.0):
                    self.logger.warning(f"Prediction accuracy out of range [0,1]: {metrics.prediction_accuracy}")

                if not (0.0 <= metrics.f1_score <= 1.0):
                    self.logger.warning(f"F1 score out of range [0,1]: {metrics.f1_score}")

                try:
                    # Update Prometheus gauges
                    self.accuracy_gauge.labels(
                        agent_id=self.agent_id,
                        metric_type="prediction_accuracy"
                    ).set(metrics.prediction_accuracy)

                    self.accuracy_gauge.labels(
                        agent_id=self.agent_id,
                        metric_type="f1_score"
                    ).set(metrics.f1_score)

                    self.accuracy_gauge.labels(
                        agent_id=self.agent_id,
                        metric_type="confidence"
                    ).set(metrics.confidence_score)

                    self.logger.debug(f"Recorded accuracy metrics for agent {self.agent_id}")

                except Exception as e:
                    self.logger.error(f"Failed to update accuracy metrics in Prometheus: {e}")

        except Exception as e:
            self.logger.error(f"Unexpected error in record_accuracy_metrics: {e}")

    def record_efficiency_metrics(self, metrics: EfficiencyMetrics):
        """Record efficiency-related metrics"""
        with self.lock:
            # Update Prometheus gauges
            self.throughput_gauge.labels(agent_id=self.agent_id).set(
                metrics.throughput_requests_per_second
            )

            self.resource_usage_gauge.labels(
                agent_id=self.agent_id,
                resource_type="cpu"
            ).set(metrics.cpu_usage_percent)

            self.resource_usage_gauge.labels(
                agent_id=self.agent_id,
                resource_type="memory"
            ).set(metrics.memory_usage_mb)

            self.logger.info(f"Recorded efficiency metrics: {asdict(metrics)}")

    def record_adaptability_metrics(self, metrics: AdaptabilityMetrics):
        """Record adaptability-related metrics with validation"""
        try:
            if not isinstance(metrics, AdaptabilityMetrics):
                self.logger.error(f"Invalid metrics type. Expected AdaptabilityMetrics, got {type(metrics)}")
                return

            with self.lock:
                # Validate metric values
                if metrics.learning_rate < 0:
                    self.logger.warning(f"Negative learning rate: {metrics.learning_rate}")

                if metrics.adaptation_time_ms < 0:
                    self.logger.warning(f"Negative adaptation time: {metrics.adaptation_time_ms}")

                try:
                    # Update Prometheus gauges
                    self.adaptability_gauge.labels(
                        agent_id=self.agent_id,
                        adaptation_type="learning_rate"
                    ).set(metrics.learning_rate)

                    self.adaptability_gauge.labels(
                        agent_id=self.agent_id,
                        adaptation_type="adaptation_time"
                    ).set(metrics.adaptation_time_ms)

                    self.adaptability_gauge.labels(
                        agent_id=self.agent_id,
                        adaptation_type="generalization"
                    ).set(metrics.generalization_score)

                    self.logger.debug(f"Recorded adaptability metrics for agent {self.agent_id}")

                except Exception as e:
                    self.logger.error(f"Failed to update adaptability metrics in Prometheus: {e}")

        except Exception as e:
            self.logger.error(f"Unexpected error in record_adaptability_metrics: {e}")

    def collect_system_metrics(self) -> SystemMetrics:
        """Collect current system metrics"""
        try:
            # CPU and memory usage
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            # Network I/O
            net_io = psutil.net_io_counters()

            # Uptime
            uptime = time.time() - self.start_time

            # Error rate calculation
            error_rate = (self.error_count / max(self.total_requests, 1)) * 100

            # Health score calculation
            health_score = max(0.0, 1.0 - (error_rate / 100.0) - (cpu_percent / 200.0))

            metrics = SystemMetrics(
                disk_usage_percent=disk.percent,
                network_io_mbps=(net_io.bytes_sent + net_io.bytes_recv) / (1024 * 1024),
                database_connections=0,  # To be implemented based on actual DB
                error_rate=error_rate,
                uptime_seconds=uptime,
                health_score=health_score
            )

            # Update Prometheus metrics
            self.system_health_gauge.labels(agent_id=self.agent_id).set(health_score)

            return metrics

        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")
            return SystemMetrics()

    def create_snapshot(self) -> MetricsSnapshot:
        """Create a complete metrics snapshot"""
        with self.lock:
            # Calculate efficiency metrics
            avg_response_time = np.mean(self.request_times) if self.request_times else 0
            throughput = len(self.request_times) / max(self.collection_interval, 1)

            efficiency = EfficiencyMetrics(
                response_time_ms=avg_response_time * 1000,
                throughput_requests_per_second=throughput,
                cpu_usage_percent=psutil.cpu_percent(),
                memory_usage_mb=psutil.virtual_memory().used / (1024 * 1024),
                queue_length=0,  # To be implemented based on actual queue
                concurrent_requests=0  # To be implemented based on actual concurrency
            )

            # Collect system metrics
            system = self.collect_system_metrics()

            # Create snapshot
            snapshot = MetricsSnapshot(
                timestamp=datetime.now(timezone.utc),
                agent_id=self.agent_id,
                agent_status=self.current_status,
                accuracy=AccuracyMetrics(),  # To be populated by specific implementations
                efficiency=efficiency,
                adaptability=AdaptabilityMetrics(),  # To be populated by specific implementations
                system=system,
                custom_metrics=self.custom_metrics.copy()
            )

            # Store in history
            self.metrics_history.append(snapshot)

            return snapshot

    def start_collection(self):
        """Start background metrics collection"""
        if self.collection_thread is not None and self.collection_thread.is_alive():
            self.logger.warning("Background collection already running")
            return

        self.stop_collection.clear()
        self.collection_thread = threading.Thread(target=self._background_collection, daemon=True)
        self.collection_thread.start()
        self.logger.info("Started background metrics collection")

    def stop_collection_thread(self):
        """Stop background metrics collection"""
        if self.collection_thread is None:
            return

        self.stop_collection.set()
        self.logger.info("Stopping background metrics collection")

    def _background_collection(self):
        """Background thread for periodic metrics collection"""
        while not self.stop_collection.wait(self.collection_interval):
            try:
                self._collect_metrics()
            except Exception as e:
                self.logger.error(f"Error in background metrics collection: {e}")

    def _collect_metrics(self):
        """Collect and record current metrics"""
        try:
            # Create and store snapshot
            snapshot = self.create_snapshot()

            # Update Prometheus metrics
            self._update_prometheus_metrics()

            # Trigger callbacks if any
            self._trigger_callbacks('periodic', snapshot)

        except Exception as e:
            self.logger.error(f"Error in metrics collection: {e}")

    def _update_prometheus_metrics(self):
        """Update Prometheus metrics with current values"""
        try:
            # Update system health
            system_metrics = self.collect_system_metrics()
            self.system_health_gauge.labels(agent_id=self.agent_id).set(system_metrics.health_score)

            # Update resource usage
            self.resource_usage_gauge.labels(
                agent_id=self.agent_id,
                resource_type="cpu"
            ).set(system_metrics.disk_usage_percent)  # CPU would be from psutil in real implementation

        except Exception as e:
            self.logger.error(f"Failed to update Prometheus metrics: {e}")

    def _trigger_callbacks(self, event_type: str, data: Any):
        """Trigger registered callbacks"""
        try:
            for callback in self.callbacks.get(event_type, []):
                try:
                    callback(data)
                except Exception as e:
                    self.logger.error(f"Error in callback: {e}")
        except Exception as e:
            self.logger.error(f"Error triggering callbacks: {e}")

    def register_callback(self, event_type: str, callback: Callable):
        """Register a callback for specific events"""
        self.callbacks[event_type].append(callback)
        self.logger.debug(f"Registered callback for {event_type}")

    def export_prometheus_metrics(self) -> bytes:
        """Export metrics in Prometheus format"""
        try:
            from prometheus_client import generate_latest
            return generate_latest(self.registry)
        except Exception as e:
            self.logger.error(f"Failed to export Prometheus metrics: {e}")
            return b""

    def get_health_status(self) -> dict:
        """Get current health status"""
        try:
            system_metrics = self.collect_system_metrics()

            return {
                "agent_id": self.agent_id,
                "status": self.current_status.value,
                "health_score": system_metrics.health_score,
                "error_rate": system_metrics.error_rate,
                "uptime_seconds": system_metrics.uptime_seconds,
                "total_requests": self.total_requests,
                "error_count": self.error_count
            }
        except Exception as e:
            self.logger.error(f"Error getting health status: {e}")
            return {"error": str(e)}

    def reset_metrics(self):
        """Reset all metrics (useful for testing)"""
        with self.lock:
            self.error_count = 0
            self.total_requests = 0
            self.request_times.clear()
            self.metrics_history.clear()
            self.custom_metrics.clear()
            self.start_time = time.time()

        self.logger.info("Reset all metrics")

    def get_summary_stats(self) -> dict:
        """Get summary statistics"""
        try:
            with self.lock:
                if self.request_times:
                    avg_response_time = np.mean(self.request_times)
                    p95_response_time = np.percentile(self.request_times, 95)
                    p99_response_time = np.percentile(self.request_times, 99)
                else:
                    avg_response_time = p95_response_time = p99_response_time = 0.0

                return {
                    "total_requests": self.total_requests,
                    "error_count": self.error_count,
                    "error_rate": (self.error_count / max(self.total_requests, 1)) * 100,
                    "avg_response_time_ms": avg_response_time * 1000,
                    "p95_response_time_ms": p95_response_time * 1000,
                    "p99_response_time_ms": p99_response_time * 1000,
                    "uptime_seconds": time.time() - self.start_time,
                    "metrics_history_size": len(self.metrics_history)
                }
        except Exception as e:
            self.logger.error(f"Error getting summary stats: {e}")
            return {"error": str(e)}

    def _update_prometheus_metrics(self):
        """Update all Prometheus metrics with current values"""
        snapshot = self.create_snapshot()

        # Update efficiency metrics
        self.resource_usage_gauge.labels(
            agent_id=self.agent_id,
            resource_type="cpu"
        ).set(snapshot.efficiency.cpu_usage_percent)

        self.resource_usage_gauge.labels(
            agent_id=self.agent_id,
            resource_type="memory"
        ).set(snapshot.efficiency.memory_usage_mb)

        self.throughput_gauge.labels(agent_id=self.agent_id).set(
            snapshot.efficiency.throughput_requests_per_second
        )

    def get_metrics_export(self) -> str:
        """Get Prometheus-formatted metrics for export"""
        return generate_latest(self.registry).decode('utf-8')

    def add_custom_metric(self, name: str, value: Any, metric_type: str = "gauge"):
        """Add a custom metric"""
        with self.lock:
            self.custom_metrics[name] = {
                'value': value,
                'type': metric_type,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }

    def register_callback(self, metric_type: MetricType, callback: Callable):
        """Register a callback for metric updates"""
        self.callbacks[metric_type].append(callback)

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get a comprehensive performance summary"""
        with self.lock:
            if not self.metrics_history:
                return {"status": "no_data"}

            recent_snapshots = list(self.metrics_history)[-10:]  # Last 10 snapshots

            # Calculate trends
            response_times = [s.efficiency.response_time_ms for s in recent_snapshots]
            throughputs = [s.efficiency.throughput_requests_per_second for s in recent_snapshots]
            health_scores = [s.system.health_score for s in recent_snapshots]

            return {
                "agent_id": self.agent_id,
                "current_status": self.current_status.value,
                "total_requests": self.total_requests,
                "error_count": self.error_count,
                "error_rate": self.error_count / max(self.total_requests, 1) * 100,
                "uptime_seconds": time.time() - self.start_time,
                "performance_trends": {
                    "avg_response_time_ms": np.mean(response_times) if response_times else 0,
                    "response_time_p95_ms": np.percentile(response_times, 95) if response_times else 0,
                    "avg_throughput_rps": np.mean(throughputs) if throughputs else 0,
                    "avg_health_score": np.mean(health_scores) if health_scores else 1.0,
                    "health_trend": "stable" if len(health_scores) < 2 else
                                   ("improving" if health_scores[-1] > health_scores[0] else "declining")
                },
                "resource_utilization": {
                    "current_cpu_percent": psutil.cpu_percent(),
                    "current_memory_mb": psutil.virtual_memory().used / (1024 * 1024),
                    "memory_utilization_percent": psutil.virtual_memory().percent
                },
                "last_updated": datetime.now(timezone.utc).isoformat()
            }# Decorator for automatic metrics collection
def track_performance(collector: MetricsCollector, operation: str = "default"):
    """Decorator to automatically track method performance"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            request_id = collector.record_request_start(operation)
            try:
                result = func(*args, **kwargs)
                collector.record_request_end(request_id, success=True)
                return result
            except Exception as e:
                collector.record_request_end(
                    request_id,
                    success=False,
                    error_type=type(e).__name__
                )
                raise
        return wrapper
    return decorator# Context manager for metrics collection
class MetricsContext:
    """Context manager for scoped metrics collection"""
    def __init__(self, collector: MetricsCollector, operation: str):
        self.collector = collector
        self.operation = operation
        self.request_id = None

    def __enter__(self):
        self.request_id = self.collector.record_request_start(self.operation)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        success = exc_type is None
        error_type = exc_type.__name__ if exc_type else None
        self.collector.record_request_end(self.request_id, success, error_type)if __name__ == "__main__":
    # Example usage
    collector = MetricsCollector("test_agent", {"collection_interval": 5.0})
    collector.start_collection()

    # Simulate some operations
    time.sleep(2)

    # Record some test metrics
    accuracy = AccuracyMetrics(prediction_accuracy=0.95, f1_score=0.87)
    collector.record_accuracy_metrics(accuracy)

    efficiency = EfficiencyMetrics(response_time_ms=150, throughput_requests_per_second=50)
    collector.record_efficiency_metrics(efficiency)

    adaptability = AdaptabilityMetrics(learning_rate=0.01, adaptation_time_ms=200)
    collector.record_adaptability_metrics(adaptability)

    # Get performance summary
    summary = collector.get_performance_summary()
    print(json.dumps(summary, indent=2))

    # Get Prometheus metrics
    print("\nPrometheus Metrics:")
    print(collector.get_metrics_export())

    collector.stop_collection_process()
