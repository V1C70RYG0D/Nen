#!/usr/bin/env python3
"""
Performance Testing Package Initialization
Following GI.md guidelines for modular and professional design
"""

from .config import get_config, get_magicblock_config, get_ci_config
from .test_latency import TestLatencyRequirements, PerformanceResult, LoadTestResult

__version__ = "1.0.0"
__author__ = "Nen Platform Development Team"
__description__ = "MagicBlock Performance Testing Suite"

# Package metadata
__all__ = [
    'TestLatencyRequirements',
    'PerformanceResult',
    'LoadTestResult',
    'get_config',
    'get_magicblock_config',
    'get_ci_config'
]
