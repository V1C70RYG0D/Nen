#!/usr/bin/env python3
"""
Performance Testing Configuration
Environment-based configuration following GI.md guidelines

This module provides:
- Environment-specific performance targets
- Test configuration parameters
- MagicBlock compliance settings
- Monitoring and reporting configuration

Implementation follows GI.md:
- No hardcoding or placeholders (Guideline #18)
- Environment-based configuration (Guideline #6)
- Production readiness (Guideline #3)
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path

@dataclass
class PerformanceConfig:
    """Performance testing configuration"""
    # Agent performance targets (milliseconds)
    easy_agent_target_ms: int = 10
    medium_agent_target_ms: int = 50
    hard_agent_target_ms: int = 90

    # System performance targets
    api_response_timeout_ms: int = 200
    database_query_timeout_ms: int = 100
    websocket_timeout_ms: int = 5000

    # Load testing parameters
    max_load_test_duration: int = 300
    concurrent_request_limit: int = 100
    peak_users_min: int = 20
    peak_users_max: int = 80

    # Test data configuration
    test_position_count: int = 100
    opening_positions_ratio: float = 0.2
    midgame_positions_ratio: float = 0.5
    endgame_positions_ratio: float = 0.3

    # Compliance thresholds
    compliance_p99_ratio: float = 0.9  # P99 should be <90% of target
    compliance_avg_ratio: float = 0.6  # Average should be <60% of target
    min_success_rate: float = 95.0
    max_error_rate: float = 5.0

    # Reporting configuration
    reports_directory: str = "performance_reports"
    enable_detailed_logging: bool = True
    generate_charts: bool = True
    export_csv: bool = True

    # Monitoring configuration
    enable_prometheus_metrics: bool = False
    prometheus_port: int = 8090
    enable_memory_profiling: bool = False
    enable_cpu_profiling: bool = False

def get_performance_config() -> PerformanceConfig:
    """Get performance configuration from environment variables"""
    return PerformanceConfig(
        # Agent targets
        easy_agent_target_ms=int(os.getenv('EASY_AGENT_TARGET_MS', '10')),
        medium_agent_target_ms=int(os.getenv('MEDIUM_AGENT_TARGET_MS', '50')),
        hard_agent_target_ms=int(os.getenv('HARD_AGENT_TARGET_MS', '90')),

        # System targets
        api_response_timeout_ms=int(os.getenv('API_RESPONSE_TIMEOUT_MS', '200')),
        database_query_timeout_ms=int(os.getenv('DATABASE_QUERY_TIMEOUT_MS', '100')),
        websocket_timeout_ms=int(os.getenv('WEBSOCKET_TIMEOUT_MS', '5000')),

        # Load testing
        max_load_test_duration=int(os.getenv('MAX_LOAD_TEST_DURATION', '300')),
        concurrent_request_limit=int(os.getenv('CONCURRENT_REQUEST_LIMIT', '100')),
        peak_users_min=int(os.getenv('PEAK_USERS_MIN', '20')),
        peak_users_max=int(os.getenv('PEAK_USERS_MAX', '80')),

        # Test data
        test_position_count=int(os.getenv('TEST_POSITION_COUNT', '100')),
        opening_positions_ratio=float(os.getenv('OPENING_POSITIONS_RATIO', '0.2')),
        midgame_positions_ratio=float(os.getenv('MIDGAME_POSITIONS_RATIO', '0.5')),
        endgame_positions_ratio=float(os.getenv('ENDGAME_POSITIONS_RATIO', '0.3')),

        # Compliance
        compliance_p99_ratio=float(os.getenv('COMPLIANCE_P99_RATIO', '0.9')),
        compliance_avg_ratio=float(os.getenv('COMPLIANCE_AVG_RATIO', '0.6')),
        min_success_rate=float(os.getenv('MIN_SUCCESS_RATE', '95.0')),
        max_error_rate=float(os.getenv('MAX_ERROR_RATE', '5.0')),

        # Reporting
        reports_directory=os.getenv('REPORTS_DIRECTORY', 'performance_reports'),
        enable_detailed_logging=os.getenv('ENABLE_DETAILED_LOGGING', 'true').lower() == 'true',
        generate_charts=os.getenv('GENERATE_CHARTS', 'true').lower() == 'true',
        export_csv=os.getenv('EXPORT_CSV', 'true').lower() == 'true',

        # Monitoring
        enable_prometheus_metrics=os.getenv('ENABLE_PROMETHEUS_METRICS', 'false').lower() == 'true',
        prometheus_port=int(os.getenv('PROMETHEUS_PORT', '8090')),
        enable_memory_profiling=os.getenv('ENABLE_MEMORY_PROFILING', 'false').lower() == 'true',
        enable_cpu_profiling=os.getenv('ENABLE_CPU_PROFILING', 'false').lower() == 'true',
    )

def get_test_environment() -> str:
    """Get current test environment"""
    return os.getenv('TEST_ENVIRONMENT', 'development')

def get_magicblock_config() -> Dict[str, Any]:
    """Get MagicBlock-specific configuration"""
    return {
        'strict_compliance': os.getenv('MAGICBLOCK_STRICT_COMPLIANCE', 'true').lower() == 'true',
        'sub_100ms_requirement': True,
        'geographic_region': os.getenv('GEOGRAPHIC_REGION', 'US-WEST'),
        'latency_zone': int(os.getenv('LATENCY_ZONE', '1')),
        'chain_integration': os.getenv('ENABLE_CHAIN_INTEGRATION', 'false').lower() == 'true',
    }

def get_ci_config() -> Dict[str, Any]:
    """Get CI/CD-specific configuration"""
    return {
        'is_ci_environment': os.getenv('CI', 'false').lower() == 'true',
        'ci_timeout_multiplier': float(os.getenv('CI_TIMEOUT_MULTIPLIER', '2.0')),
        'ci_reduced_load': os.getenv('CI_REDUCED_LOAD', 'true').lower() == 'true',
        'ci_skip_long_tests': os.getenv('CI_SKIP_LONG_TESTS', 'false').lower() == 'true',
        'parallel_test_workers': int(os.getenv('PARALLEL_TEST_WORKERS', '4')),
    }

# Environment-specific configurations
ENVIRONMENT_CONFIGS = {
    'development': {
        'test_position_count': 50,
        'max_load_test_duration': 60,
        'concurrent_request_limit': 25,
    },
    'staging': {
        'test_position_count': 75,
        'max_load_test_duration': 180,
        'concurrent_request_limit': 50,
    },
    'production': {
        'test_position_count': 100,
        'max_load_test_duration': 300,
        'concurrent_request_limit': 100,
    },
    'ci': {
        'test_position_count': 25,
        'max_load_test_duration': 30,
        'concurrent_request_limit': 10,
    }
}

def get_environment_overrides() -> Dict[str, Any]:
    """Get environment-specific configuration overrides"""
    env = get_test_environment()
    ci_config = get_ci_config()

    if ci_config['is_ci_environment']:
        env = 'ci'

    return ENVIRONMENT_CONFIGS.get(env, {})

def apply_environment_config(config: PerformanceConfig) -> PerformanceConfig:
    """Apply environment-specific overrides to configuration"""
    overrides = get_environment_overrides()
    ci_config = get_ci_config()

    # Apply CI-specific modifications
    if ci_config['is_ci_environment']:
        # Increase timeouts for CI environment
        config.easy_agent_target_ms = int(config.easy_agent_target_ms * ci_config['ci_timeout_multiplier'])
        config.medium_agent_target_ms = int(config.medium_agent_target_ms * ci_config['ci_timeout_multiplier'])
        config.hard_agent_target_ms = int(config.hard_agent_target_ms * ci_config['ci_timeout_multiplier'])

        # Reduce load for CI
        if ci_config['ci_reduced_load']:
            config.concurrent_request_limit = min(config.concurrent_request_limit, 20)
            config.max_load_test_duration = min(config.max_load_test_duration, 60)

    # Apply environment-specific overrides
    for key, value in overrides.items():
        if hasattr(config, key):
            setattr(config, key, value)

    return config

# Main configuration instance
_performance_config = None

def get_config() -> PerformanceConfig:
    """Get singleton performance configuration instance"""
    global _performance_config
    if _performance_config is None:
        _performance_config = apply_environment_config(get_performance_config())
    return _performance_config

def reset_config():
    """Reset configuration singleton (useful for testing)"""
    global _performance_config
    _performance_config = None

if __name__ == "__main__":
    """Display current configuration"""
    config = get_config()
    magicblock_config = get_magicblock_config()
    ci_config = get_ci_config()

    print("🔧 Performance Testing Configuration")
    print("=" * 50)

    print(f"\n📊 Agent Performance Targets:")
    print(f"  Easy Agent:   {config.easy_agent_target_ms}ms")
    print(f"  Medium Agent: {config.medium_agent_target_ms}ms")
    print(f"  Hard Agent:   {config.hard_agent_target_ms}ms")

    print(f"\n🌐 System Performance Targets:")
    print(f"  API Response:    {config.api_response_timeout_ms}ms")
    print(f"  Database Query:  {config.database_query_timeout_ms}ms")
    print(f"  WebSocket:       {config.websocket_timeout_ms}ms")

    print(f"\n⚡ Load Testing:")
    print(f"  Max Duration:    {config.max_load_test_duration}s")
    print(f"  Concurrent Limit: {config.concurrent_request_limit}")
    print(f"  Test Positions:  {config.test_position_count}")

    print(f"\n🎯 MagicBlock Configuration:")
    print(f"  best practices: {magicblock_config['strict_compliance']}")
    print(f"  Sub-100ms Required: {magicblock_config['sub_100ms_requirement']}")
    print(f"  Geographic Region: {magicblock_config['geographic_region']}")

    print(f"\n🤖 CI/CD Configuration:")
    print(f"  CI Environment: {ci_config['is_ci_environment']}")
    print(f"  Timeout Multiplier: {ci_config['ci_timeout_multiplier']}")
    print(f"  Reduced Load: {ci_config['ci_reduced_load']}")

    print("\n" + "=" * 50)
