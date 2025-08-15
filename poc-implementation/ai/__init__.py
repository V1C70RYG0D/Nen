#!/usr/bin/env python3
"""
AI Module for Nen Platform
Production-ready AI agents with comprehensive metrics collection

"""

from .config import AIConfig, MetricsConfig, get_config, get_metrics_config, validate_environment
from .metrics_collector import (
    MetricsCollector, AccuracyMetrics, EfficiencyMetrics,
    AdaptabilityMetrics, SystemMetrics, MetricsSnapshot,
    MetricType, AgentStatus
)

__version__ = "1.0.0"
__author__ = "Nen Platform Team"

# Module-level configuration validation
try:
    validate_environment()
except Exception as e:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"AI module configuration validation failed: {e}")

__all__ = [
    # Configuration
    'AIConfig',
    'MetricsConfig',
    'get_config',
    'get_metrics_config',
    'validate_environment',

    # Metrics Collection
    'MetricsCollector',
    'AccuracyMetrics',
    'EfficiencyMetrics',
    'AdaptabilityMetrics',
    'SystemMetrics',
    'MetricsSnapshot',
    'MetricType',
    'AgentStatus',
]
