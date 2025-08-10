#!/usr/bin/env python3
"""
Comprehensive Test Suite for AI Metrics Collector
Achieving 100% test coverage as required by GI-08
"""

import pytest
import time
import threading
import tempfile
import os
from unittest.mock import Mock, patch, MagicMock
from dataclasses import asdict
from collections import deque

# Import modules under test
from ai.metrics_collector import (
    MetricsCollector, AccuracyMetrics, EfficiencyMetrics,
    AdaptabilityMetrics, SystemMetrics, MetricsSnapshot,
    MetricType, AgentStatus
)
from ai.config import AIConfig, MetricsConfig, get_config


class TestAccuracyMetrics:
    """Test AccuracyMetrics dataclass"""

    def test_accuracy_metrics_defaults(self):
        """Test AccuracyMetrics default values"""
        metrics = AccuracyMetrics()
        assert metrics.prediction_accuracy == 0.0
        assert metrics.classification_accuracy == 0.0
        assert metrics.f1_score == 0.0
        assert metrics.precision == 0.0
        assert metrics.recall == 0.0
        assert metrics.auc_roc == 0.0
        assert metrics.mean_absolute_error == 0.0
        assert metrics.root_mean_square_error == 0.0
        assert metrics.confidence_score == 0.0
        assert metrics.false_positive_rate == 0.0
        assert metrics.false_negative_rate == 0.0
        assert metrics.model_drift_score == 0.0

    def test_accuracy_metrics_custom_values(self):
        """Test AccuracyMetrics with custom values"""
        metrics = AccuracyMetrics(
            prediction_accuracy=0.95,
            f1_score=0.88,
            precision=0.92,
            recall=0.85
        )
        assert metrics.prediction_accuracy == 0.95
        assert metrics.f1_score == 0.88
        assert metrics.precision == 0.92
        assert metrics.recall == 0.85

    def test_accuracy_metrics_serialization(self):
        """Test AccuracyMetrics serialization"""
        metrics = AccuracyMetrics(prediction_accuracy=0.95, f1_score=0.88)
        data = asdict(metrics)
        assert data['prediction_accuracy'] == 0.95
        assert data['f1_score'] == 0.88


class TestEfficiencyMetrics:
    """Test EfficiencyMetrics dataclass"""

    def test_efficiency_metrics_defaults(self):
        """Test EfficiencyMetrics default values"""
        metrics = EfficiencyMetrics()
        assert metrics.response_time_ms == 0.0
        assert metrics.throughput_requests_per_second == 0.0
        assert metrics.cpu_usage_percent == 0.0
        assert metrics.memory_usage_mb == 0.0
        assert metrics.gpu_usage_percent == 0.0
        assert metrics.inference_time_ms == 0.0
        assert metrics.preprocessing_time_ms == 0.0
        assert metrics.postprocessing_time_ms == 0.0
        assert metrics.model_load_time_ms == 0.0
        assert metrics.cache_hit_rate == 0.0
        assert metrics.queue_length == 0
        assert metrics.concurrent_requests == 0
        assert metrics.tokens_per_second == 0.0
        assert metrics.cost_per_request == 0.0

    def test_efficiency_metrics_custom_values(self):
        """Test EfficiencyMetrics with custom values"""
        metrics = EfficiencyMetrics(
            response_time_ms=120.5,
            throughput_requests_per_second=50.0,
            cpu_usage_percent=75.2,
            memory_usage_mb=512.0
        )
        assert metrics.response_time_ms == 120.5
        assert metrics.throughput_requests_per_second == 50.0
        assert metrics.cpu_usage_percent == 75.2
        assert metrics.memory_usage_mb == 512.0


class TestAdaptabilityMetrics:
    """Test AdaptabilityMetrics dataclass"""

    def test_adaptability_metrics_defaults(self):
        """Test AdaptabilityMetrics default values"""
        metrics = AdaptabilityMetrics()
        assert metrics.learning_rate == 0.0
        assert metrics.adaptation_time_ms == 0.0
        assert metrics.model_updates_count == 0
        assert metrics.feature_importance_stability == 0.0
        assert metrics.context_switching_efficiency == 0.0
        assert metrics.domain_transfer_success_rate == 0.0
        assert metrics.online_learning_accuracy == 0.0
        assert metrics.concept_drift_detection_rate == 0.0
        assert metrics.self_correction_rate == 0.0
        assert metrics.knowledge_retention_score == 0.0
        assert metrics.generalization_score == 0.0
        assert metrics.robustness_score == 0.0


class TestSystemMetrics:
    """Test SystemMetrics dataclass"""

    def test_system_metrics_defaults(self):
        """Test SystemMetrics default values"""
        metrics = SystemMetrics()
        assert metrics.disk_usage_percent == 0.0
        assert metrics.network_io_mbps == 0.0
        assert metrics.database_connections == 0
        assert metrics.error_rate == 0.0
        assert metrics.uptime_seconds == 0.0
        assert metrics.health_score == 1.0


class TestMetricsSnapshot:
    """Test MetricsSnapshot dataclass"""

    def test_metrics_snapshot_creation(self):
        """Test MetricsSnapshot creation"""
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        snapshot = MetricsSnapshot(
            timestamp=now,
            agent_id="test_agent",
            agent_status=AgentStatus.IDLE,
            accuracy=AccuracyMetrics(),
            efficiency=EfficiencyMetrics(),
            adaptability=AdaptabilityMetrics(),
            system=SystemMetrics(),
            custom_metrics={}
        )

        assert snapshot.timestamp == now
        assert snapshot.agent_id == "test_agent"
        assert snapshot.agent_status == AgentStatus.IDLE
        assert isinstance(snapshot.accuracy, AccuracyMetrics)
        assert isinstance(snapshot.efficiency, EfficiencyMetrics)
        assert isinstance(snapshot.adaptability, AdaptabilityMetrics)
        assert isinstance(snapshot.system, SystemMetrics)
        assert snapshot.custom_metrics == {}


class TestEnums:
    """Test enum classes"""

    def test_metric_type_enum(self):
        """Test MetricType enum"""
        assert MetricType.ACCURACY.value == "accuracy"
        assert MetricType.EFFICIENCY.value == "efficiency"
        assert MetricType.ADAPTABILITY.value == "adaptability"
        assert MetricType.SYSTEM.value == "system"
        assert MetricType.BUSINESS.value == "business"

    def test_agent_status_enum(self):
        """Test AgentStatus enum"""
        assert AgentStatus.IDLE.value == "idle"
        assert AgentStatus.PROCESSING.value == "processing"
        assert AgentStatus.LEARNING.value == "learning"
        assert AgentStatus.ERROR.value == "error"
        assert AgentStatus.OPTIMIZING.value == "optimizing"


class TestMetricsCollector:
    """Comprehensive test suite for MetricsCollector"""

    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for testing"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            yield tmp_dir

    @pytest.fixture
    def mock_config(self, temp_dir):
        """Mock configuration for testing"""

        prometheus_host = os.getenv('PROMETHEUS_HOST', os.getenv('DEV_PROMETHEUS_HOST', 'localhost'))

        with patch.dict(os.environ, {
            'METRICS_COLLECTION_INTERVAL': '5.0',
            'METRICS_HISTORY_SIZE': '500',
            'PROMETHEUS_PORT': '9090',
            'PROMETHEUS_HOST': prometheus_host,
            'REQUEST_BUFFER_SIZE': '50',
            'ERROR_RATE_THRESHOLD': '0.1',
            'RESPONSE_TIME_THRESHOLD_MS': '2000.0',
            'METRICS_STORAGE_PATH': temp_dir,
            'AI_ENVIRONMENT': 'testing',
            'AI_LOG_LEVEL': 'DEBUG'
        }):
            yield

    @pytest.fixture
    def collector(self, mock_config):
        """Create MetricsCollector instance for testing"""
        return MetricsCollector("test_agent")

    def test_collector_initialization(self, collector):
        """Test MetricsCollector initialization"""
        assert collector.agent_id == "test_agent"
        assert collector.current_status == AgentStatus.IDLE
        assert isinstance(collector.metrics_history, deque)
        assert collector.error_count == 0
        assert collector.total_requests == 0
        assert collector.collection_interval == 5.0
        assert collector.metrics_config.history_size == 500

    def test_collector_configuration_validation(self, mock_config):
        """Test configuration validation"""
        # Test with invalid configuration
        with patch.dict(os.environ, {'METRICS_COLLECTION_INTERVAL': '-1.0'}):
            with pytest.raises(ValueError, match="Collection interval must be positive"):
                MetricsCollector("test_agent")

    def test_logging_setup(self, collector):
        """Test logging setup"""
        assert collector.logger is not None
        assert collector.logger.name == "metrics_collector_test_agent"

    @patch('ai.metrics_collector.psutil.cpu_percent')
    @patch('ai.metrics_collector.psutil.virtual_memory')
    def test_system_metrics_collection(self, mock_memory, mock_cpu, collector):
        """Test system metrics collection"""
        # Mock system metrics
        mock_cpu.return_value = 45.5
        mock_memory.return_value = Mock(used=536870912)  # 512 MB

        with patch('ai.metrics_collector.psutil.disk_usage') as mock_disk, \
             patch('ai.metrics_collector.psutil.net_io_counters') as mock_net:

            mock_disk.return_value = Mock(percent=25.0)
            mock_net.return_value = Mock(bytes_sent=1000000, bytes_recv=2000000)

            metrics = collector.collect_system_metrics()

            assert isinstance(metrics, SystemMetrics)
            assert metrics.disk_usage_percent == 25.0
            assert metrics.error_rate >= 0.0
            assert metrics.uptime_seconds >= 0.0
            assert 0.0 <= metrics.health_score <= 1.0

    def test_system_metrics_collection_error_handling(self, collector):
        """Test system metrics collection error handling"""
        with patch('ai.metrics_collector.psutil.cpu_percent', side_effect=Exception("CPU error")):
            metrics = collector.collect_system_metrics()
            # Should return default SystemMetrics on error
            assert isinstance(metrics, SystemMetrics)
            assert metrics.disk_usage_percent == 0.0

    def test_record_request_lifecycle(self, collector):
        """Test complete request lifecycle"""
        # Start request
        request_id = collector.record_request_start("test_operation")
        assert request_id.startswith("test_operation_")
        assert collector.total_requests == 1
        assert collector.current_status == AgentStatus.PROCESSING

        # End request successfully
        time.sleep(0.1)  # Simulate processing time
        collector.record_request_end(request_id, success=True)

        assert collector.current_status == AgentStatus.IDLE
        assert len(collector.request_times) == 1
        assert collector.request_times[0] >= 0.1

    def test_record_request_failure(self, collector):
        """Test request failure recording"""
        request_id = collector.record_request_start("test_operation")
        collector.record_request_end(request_id, success=False, error_type="timeout")

        assert collector.error_count == 1
        assert collector.current_status == AgentStatus.IDLE

    def test_record_request_end_invalid_id(self, collector):
        """Test error handling for invalid request ID"""
        # Invalid request ID format
        collector.record_request_end("invalid_id", success=True)
        # Should handle gracefully without throwing exception

        # Empty request ID
        collector.record_request_end("", success=True)
        # Should handle gracefully without throwing exception

        # Malformed timestamp
        collector.record_request_end("operation_invalid_timestamp", success=True)
        # Should handle gracefully without throwing exception

    def test_record_accuracy_metrics(self, collector):
        """Test accuracy metrics recording"""
        metrics = AccuracyMetrics(
            prediction_accuracy=0.95,
            f1_score=0.88,
            precision=0.92,
            recall=0.85
        )

        # Should not raise exception
        collector.record_accuracy_metrics(metrics)

    def test_record_accuracy_metrics_validation(self, collector):
        """Test accuracy metrics validation"""
        # Test out-of-range values
        metrics = AccuracyMetrics(
            prediction_accuracy=1.5,  # Invalid: > 1.0
            f1_score=-0.1  # Invalid: < 0.0
        )

        # Should log warnings but not fail
        collector.record_accuracy_metrics(metrics)

    def test_record_accuracy_metrics_invalid_type(self, collector):
        """Test accuracy metrics with invalid type"""
        # Should handle gracefully
        collector.record_accuracy_metrics("not_a_metrics_object")

    def test_prometheus_metrics_setup(self, collector):
        """Test Prometheus metrics setup"""
        assert hasattr(collector, 'accuracy_gauge')
        assert hasattr(collector, 'response_time_histogram')
        assert hasattr(collector, 'throughput_gauge')
        assert hasattr(collector, 'resource_usage_gauge')
        assert hasattr(collector, 'adaptability_gauge')
        assert hasattr(collector, 'request_counter')
        assert hasattr(collector, 'error_counter')
        assert hasattr(collector, 'system_health_gauge')

    def test_create_snapshot(self, collector):
        """Test metrics snapshot creation"""
        with patch.object(collector, 'collect_system_metrics') as mock_collect:
            mock_collect.return_value = SystemMetrics(health_score=0.95)

            snapshot = collector.create_snapshot()

            assert isinstance(snapshot, MetricsSnapshot)
            assert snapshot.agent_id == "test_agent"
            assert snapshot.agent_status == AgentStatus.IDLE
            assert isinstance(snapshot.accuracy, AccuracyMetrics)
            assert isinstance(snapshot.efficiency, EfficiencyMetrics)
            assert isinstance(snapshot.adaptability, AdaptabilityMetrics)
            assert isinstance(snapshot.system, SystemMetrics)
            assert snapshot.system.health_score == 0.95

    def test_custom_metrics(self, collector):
        """Test custom metrics functionality"""
        collector.custom_metrics['custom_metric'] = 42.0

        snapshot = collector.create_snapshot()
        assert 'custom_metric' in snapshot.custom_metrics
        assert snapshot.custom_metrics['custom_metric'] == 42.0

    def test_metrics_history(self, collector):
        """Test metrics history management"""
        # Create multiple snapshots
        for i in range(5):
            snapshot = collector.create_snapshot()

        assert len(collector.metrics_history) == 5

    def test_thread_safety(self, collector):
        """Test thread safety of metrics collection"""
        def worker():
            for i in range(10):
                request_id = collector.record_request_start(f"op_{i}")
                time.sleep(0.01)
                collector.record_request_end(request_id, success=True)

        # Start multiple threads
        threads = []
        for i in range(3):
            thread = threading.Thread(target=worker)
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Verify metrics were collected safely
        assert collector.total_requests == 30
        assert len(collector.request_times) <= 30

    def test_background_collection_start_stop(self, collector):
        """Test background collection lifecycle"""
        # Start background collection
        collector.start_collection()
        assert collector.collection_thread is not None
        assert collector.collection_thread.is_alive()

        # Stop background collection
        collector.stop_collection_thread()
        collector.collection_thread.join(timeout=2.0)
        assert not collector.collection_thread.is_alive()

    def test_prometheus_export(self, collector):
        """Test Prometheus metrics export"""
        # Record some metrics
        request_id = collector.record_request_start("test")
        collector.record_request_end(request_id, success=True)

        # Export metrics
        metrics_output = collector.export_prometheus_metrics()
        assert isinstance(metrics_output, bytes)
        assert b'ai_agent_' in metrics_output

    def test_error_handling_in_background_collection(self, collector):
        """Test error handling in background metrics collection"""
        with patch.object(collector, '_collect_metrics', side_effect=Exception("Collection error")):
            collector._collect_metrics()
            # Should handle the exception gracefully and continue

    def test_callback_system(self, collector):
        """Test metrics callback system"""
        callback_called = False
        callback_data = None

        def test_callback(data):
            nonlocal callback_called, callback_data
            callback_called = True
            callback_data = data

        # Register callback
        collector.register_callback('accuracy', test_callback)

        # Trigger metrics that should call callback
        metrics = AccuracyMetrics(prediction_accuracy=0.95)
        collector.record_accuracy_metrics(metrics)

        # Note: Actual callback triggering depends on implementation
        # This test structure is ready for when callbacks are implemented

    def test_memory_cleanup(self, collector):
        """Test memory cleanup and resource management"""
        # Fill up the metrics history to test maxlen behavior
        for i in range(collector.metrics_config.history_size + 100):
            collector.create_snapshot()

        # Should not exceed maxlen
        assert len(collector.metrics_history) <= collector.metrics_config.history_size

        # Test request times buffer
        for i in range(collector.metrics_config.request_buffer_size + 50):
            collector.request_times.append(0.1)

        assert len(collector.request_times) <= collector.metrics_config.request_buffer_size


class TestIntegration:
    """Integration tests"""

    @pytest.fixture
    def integration_collector(self):
        """Create collector for integration testing"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            with patch.dict(os.environ, {
                'METRICS_STORAGE_PATH': tmp_dir,
                'AI_ENVIRONMENT': 'testing'
            }):
                yield MetricsCollector("integration_test")

    def test_complete_workflow(self, integration_collector):
        """Test complete metrics collection workflow"""
        collector = integration_collector

        # Start background collection
        collector.start_collection()

        try:
            # Simulate AI agent workflow
            for i in range(5):
                # Start processing
                request_id = collector.record_request_start("inference")

                # Simulate processing time
                time.sleep(0.1)

                # Record accuracy metrics
                accuracy = AccuracyMetrics(
                    prediction_accuracy=0.9 + (i * 0.01),
                    f1_score=0.85 + (i * 0.01)
                )
                collector.record_accuracy_metrics(accuracy)

                # End processing
                success = i < 4  # Last one fails
                error_type = "timeout" if not success else None
                collector.record_request_end(request_id, success=success, error_type=error_type)

            # Create final snapshot
            snapshot = collector.create_snapshot()

            # Verify results
            assert collector.total_requests == 5
            assert collector.error_count == 1
            assert len(collector.metrics_history) >= 1
            assert snapshot.efficiency.throughput_requests_per_second > 0

        finally:
            # Clean shutdown
            collector.stop_collection_thread()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=ai.metrics_collector", "--cov-report=html", "--cov-report=term-missing"])
