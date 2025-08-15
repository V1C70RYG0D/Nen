#!/usr/bin/env python3
"""
Comprehensive Test Suite for AI Configuration Management
Achieving 100% test coverage as required by GI-08
"""

import pytest
import os
import tempfile
import logging
from unittest.mock import patch, Mock

# Import modules under test
from ai.config import (
    AIConfig, MetricsConfig, ConfigManager, LogLevel,
    get_config, get_metrics_config, validate_environment,
    config_manager
)


class TestLogLevel:
    """Test LogLevel enum"""

    def test_log_level_values(self):
        """Test LogLevel enum values"""
        assert LogLevel.DEBUG.value == "DEBUG"
        assert LogLevel.INFO.value == "INFO"
        assert LogLevel.WARNING.value == "WARNING"
        assert LogLevel.ERROR.value == "ERROR"
        assert LogLevel.CRITICAL.value == "CRITICAL"


class TestMetricsConfig:
    """Test MetricsConfig dataclass"""

    def test_metrics_config_defaults(self):
        """Test MetricsConfig with default environment values"""
        with patch.dict(os.environ, {}, clear=True):
            config = MetricsConfig()
            assert config.collection_interval == 10.0
            assert config.history_size == 1000
            assert config.prometheus_port == 8000
            assert config.prometheus_host == "0.0.0.0"
            assert config.request_buffer_size == 100
            assert config.error_rate_threshold == 0.05
            assert config.response_time_threshold_ms == 1000.0
            assert config.metrics_storage_path == "/tmp/ai_metrics"

    def test_metrics_config_environment_override(self):
        """Test MetricsConfig with environment variable overrides"""

        prometheus_host = os.getenv('PROMETHEUS_HOST', os.getenv('DEV_PROMETHEUS_HOST', 'localhost'))

        with patch.dict(os.environ, {
            'METRICS_COLLECTION_INTERVAL': '5.0',
            'METRICS_HISTORY_SIZE': '500',
            'PROMETHEUS_PORT': '9090',
            'PROMETHEUS_HOST': prometheus_host,
            'REQUEST_BUFFER_SIZE': '50',
            'ERROR_RATE_THRESHOLD': '0.1',
            'RESPONSE_TIME_THRESHOLD_MS': '2000.0',
            'METRICS_STORAGE_PATH': '/custom/path'
        }):
            config = MetricsConfig()
            assert config.collection_interval == 5.0
            assert config.history_size == 500
            assert config.prometheus_port == 9090
            assert config.prometheus_host == prometheus_host
            assert config.request_buffer_size == 50
            assert config.error_rate_threshold == 0.1
            assert config.response_time_threshold_ms == 2000.0
            assert config.metrics_storage_path == "/custom/path"

    def test_metrics_config_validation_success(self):
        """Test successful MetricsConfig validation"""
        config = MetricsConfig()
        assert config.validate() is True

    def test_metrics_config_validation_negative_interval(self):
        """Test MetricsConfig validation with negative collection interval"""
        with patch.dict(os.environ, {'METRICS_COLLECTION_INTERVAL': '-1.0'}):
            config = MetricsConfig()
            with pytest.raises(ValueError, match="Collection interval must be positive"):
                config.validate()

    def test_metrics_config_validation_negative_history_size(self):
        """Test MetricsConfig validation with negative history size"""
        with patch.dict(os.environ, {'METRICS_HISTORY_SIZE': '-100'}):
            config = MetricsConfig()
            with pytest.raises(ValueError, match="History size must be positive"):
                config.validate()

    def test_metrics_config_validation_invalid_port(self):
        """Test MetricsConfig validation with invalid port"""
        with patch.dict(os.environ, {'PROMETHEUS_PORT': '70000'}):
            config = MetricsConfig()
            with pytest.raises(ValueError, match="Prometheus port must be between 1 and 65535"):
                config.validate()

        with patch.dict(os.environ, {'PROMETHEUS_PORT': '0'}):
            config = MetricsConfig()
            with pytest.raises(ValueError, match="Prometheus port must be between 1 and 65535"):
                config.validate()


class TestAIConfig:
    """Test AIConfig dataclass"""

    def test_ai_config_defaults(self):
        """Test AIConfig with default environment values"""
        with patch.dict(os.environ, {}, clear=True):
            config = AIConfig()
            assert config.environment == "development"
            assert config.log_level == "INFO"
            assert config.model_cache_size == 10
            assert config.model_timeout_seconds == 30.0
            assert config.max_concurrent_requests == 10
            assert config.enable_caching is True
            assert config.enable_rate_limiting is True
            assert config.rate_limit_requests_per_minute == 60
            assert isinstance(config.metrics, MetricsConfig)

    def test_ai_config_environment_override(self):
        """Test AIConfig with environment variable overrides"""
        with patch.dict(os.environ, {
            'AI_ENVIRONMENT': 'production',
            'AI_LOG_LEVEL': 'ERROR',
            'MODEL_CACHE_SIZE': '20',
            'MODEL_TIMEOUT_SECONDS': '60.0',
            'MAX_CONCURRENT_REQUESTS': '50',
            'ENABLE_CACHING': 'false',
            'ENABLE_RATE_LIMITING': 'false',
            'RATE_LIMIT_RPM': '120'
        }):
            config = AIConfig()
            assert config.environment == "production"
            assert config.log_level == "ERROR"
            assert config.model_cache_size == 20
            assert config.model_timeout_seconds == 60.0
            assert config.max_concurrent_requests == 50
            assert config.enable_caching is False
            assert config.enable_rate_limiting is False
            assert config.rate_limit_requests_per_minute == 120

    def test_ai_config_validation_success(self):
        """Test successful AIConfig validation"""
        config = AIConfig()
        assert config.validate() is True

    def test_ai_config_validation_invalid_environment(self):
        """Test AIConfig validation with invalid environment"""
        with patch.dict(os.environ, {'AI_ENVIRONMENT': 'invalid'}):
            config = AIConfig()
            with pytest.raises(ValueError, match="Environment must be development, staging, or production"):
                config.validate()

    def test_ai_config_validation_invalid_log_level(self):
        """Test AIConfig validation with invalid log level"""
        with patch.dict(os.environ, {'AI_LOG_LEVEL': 'INVALID'}):
            config = AIConfig()
            with pytest.raises(ValueError, match="Log level must be one of"):
                config.validate()

    def test_ai_config_validation_negative_timeout(self):
        """Test AIConfig validation with negative timeout"""
        with patch.dict(os.environ, {'MODEL_TIMEOUT_SECONDS': '-10.0'}):
            config = AIConfig()
            with pytest.raises(ValueError, match="Model timeout must be positive"):
                config.validate()

    def test_ai_config_validation_negative_concurrent_requests(self):
        """Test AIConfig validation with negative concurrent requests"""
        with patch.dict(os.environ, {'MAX_CONCURRENT_REQUESTS': '-5'}):
            config = AIConfig()
            with pytest.raises(ValueError, match="Max concurrent requests must be positive"):
                config.validate()

    def test_ai_config_validation_negative_rate_limit(self):
        """Test AIConfig validation with negative rate limit"""
        with patch.dict(os.environ, {'RATE_LIMIT_RPM': '-60'}):
            config = AIConfig()
            with pytest.raises(ValueError, match="Rate limit must be positive"):
                config.validate()

    def test_get_log_level(self):
        """Test get_log_level method"""
        with patch.dict(os.environ, {'AI_LOG_LEVEL': 'DEBUG'}):
            config = AIConfig()
            assert config.get_log_level() == logging.DEBUG

        with patch.dict(os.environ, {'AI_LOG_LEVEL': 'INFO'}):
            config = AIConfig()
            assert config.get_log_level() == logging.INFO

        with patch.dict(os.environ, {'AI_LOG_LEVEL': 'ERROR'}):
            config = AIConfig()
            assert config.get_log_level() == logging.ERROR

    def test_environment_checks(self):
        """Test environment check methods"""
        with patch.dict(os.environ, {'AI_ENVIRONMENT': 'production'}):
            config = AIConfig()
            assert config.is_production() is True
            assert config.is_development() is False

        with patch.dict(os.environ, {'AI_ENVIRONMENT': 'development'}):
            config = AIConfig()
            assert config.is_production() is False
            assert config.is_development() is True

        with patch.dict(os.environ, {'AI_ENVIRONMENT': 'staging'}):
            config = AIConfig()
            assert config.is_production() is False
            assert config.is_development() is False


class TestConfigManager:
    """Test ConfigManager singleton"""

    def test_singleton_behavior(self):
        """Test ConfigManager singleton behavior"""
        manager1 = ConfigManager()
        manager2 = ConfigManager()
        assert manager1 is manager2

    def test_get_config(self):
        """Test get_config method"""
        manager = ConfigManager()
        config = manager.get_config()
        assert isinstance(config, AIConfig)

        # Should return same instance on subsequent calls
        config2 = manager.get_config()
        assert config is config2

    def test_reload_config(self):
        """Test reload_config method"""
        manager = ConfigManager()

        # Get initial config
        config1 = manager.get_config()

        # Reload config
        with patch.dict(os.environ, {'AI_LOG_LEVEL': 'DEBUG'}):
            config2 = manager.reload_config()

        # Should be different instance with new values
        assert config1 is not config2
        assert config2.log_level == "DEBUG"

    def test_get_env_var(self):
        """Test get_env_var method"""
        manager = ConfigManager()

        # Test with default value
        value = manager.get_env_var('NON_EXISTENT_VAR', 'default_value')
        assert value == 'default_value'

        # Test with environment variable
        with patch.dict(os.environ, {'TEST_VAR': 'test_value'}):
            value = manager.get_env_var('TEST_VAR')
            assert value == 'test_value'

    def test_get_env_var_required(self):
        """Test get_env_var with required parameter"""
        manager = ConfigManager()

        # Test missing required variable
        with pytest.raises(ValueError, match="Required environment variable TEST_REQUIRED is not set"):
            manager.get_env_var('TEST_REQUIRED', required=True)

        # Test present required variable
        with patch.dict(os.environ, {'TEST_REQUIRED': 'present'}):
            value = manager.get_env_var('TEST_REQUIRED', required=True)
            assert value == 'present'

    def test_validate_required_env_vars(self):
        """Test validate_required_env_vars method"""
        manager = ConfigManager()

        # Test with all variables present
        with patch.dict(os.environ, {'VAR1': 'value1', 'VAR2': 'value2'}):
            result = manager.validate_required_env_vars(['VAR1', 'VAR2'])
            assert result is True

        # Test with missing variables
        with patch.dict(os.environ, {'VAR1': 'value1'}, clear=True):
            with pytest.raises(ValueError, match="Missing required environment variables: VAR2, VAR3"):
                manager.validate_required_env_vars(['VAR1', 'VAR2', 'VAR3'])


class TestGlobalFunctions:
    """Test global configuration functions"""

    def test_get_config_function(self):
        """Test get_config global function"""
        config = get_config()
        assert isinstance(config, AIConfig)

    def test_get_metrics_config_function(self):
        """Test get_metrics_config global function"""
        metrics_config = get_metrics_config()
        assert isinstance(metrics_config, MetricsConfig)

    def test_validate_environment_development(self):
        """Test validate_environment in development"""
        with patch.dict(os.environ, {'AI_ENVIRONMENT': 'development'}):
            # Should not raise exception
            result = validate_environment()
            assert result is True

    def test_validate_environment_production(self):
        """Test validate_environment in production"""
        with patch.dict(os.environ, {
            'AI_ENVIRONMENT': 'production',
            'PROMETHEUS_HOST': 'localhost',
            'PROMETHEUS_PORT': '9090',
            'METRICS_STORAGE_PATH': '/prod/metrics'
        }):
            result = validate_environment()
            assert result is True

    def test_validate_environment_production_missing_vars(self):
        """Test validate_environment in production with missing variables"""
        with patch.dict(os.environ, {'AI_ENVIRONMENT': 'production'}, clear=True):
            with pytest.raises(ValueError, match="Missing required environment variables"):
                validate_environment()


class TestConfigurationIntegration:
    """Integration tests for configuration system"""

    def test_complete_configuration_workflow(self):
        """Test complete configuration workflow"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            # Set up complete environment
            env_vars = {
                'AI_ENVIRONMENT': 'staging',
                'AI_LOG_LEVEL': 'WARNING',
                'MODEL_CACHE_SIZE': '15',
                'MODEL_TIMEOUT_SECONDS': '45.0',
                'MAX_CONCURRENT_REQUESTS': '25',
                'ENABLE_CACHING': 'true',
                'ENABLE_RATE_LIMITING': 'true',
                'RATE_LIMIT_RPM': '90',
                'METRICS_COLLECTION_INTERVAL': '7.5',
                'METRICS_HISTORY_SIZE': '750',
                'PROMETHEUS_PORT': '8888',
                'PROMETHEUS_HOST': '192.168.1.100',
                'REQUEST_BUFFER_SIZE': '75',
                'ERROR_RATE_THRESHOLD': '0.08',
                'RESPONSE_TIME_THRESHOLD_MS': '1500.0',
                'METRICS_STORAGE_PATH': tmp_dir
            }

            with patch.dict(os.environ, env_vars):
                # Get configuration
                config = get_config()

                # Validate all values
                assert config.environment == "staging"
                assert config.log_level == "WARNING"
                assert config.model_cache_size == 15
                assert config.model_timeout_seconds == 45.0
                assert config.max_concurrent_requests == 25
                assert config.enable_caching is True
                assert config.enable_rate_limiting is True
                assert config.rate_limit_requests_per_minute == 90

                # Validate metrics config
                metrics = config.metrics
                assert metrics.collection_interval == 7.5
                assert metrics.history_size == 750
                assert metrics.prometheus_port == 8888
                assert metrics.prometheus_host == "192.168.1.100"
                assert metrics.request_buffer_size == 75
                assert metrics.error_rate_threshold == 0.08
                assert metrics.response_time_threshold_ms == 1500.0
                assert metrics.metrics_storage_path == tmp_dir

                # Validate configuration
                assert config.validate() is True

                # Test logging level conversion
                assert config.get_log_level() == logging.WARNING

                # Test environment checks
                assert config.is_production() is False
                assert config.is_development() is False

    def test_config_error_handling(self):
        """Test configuration error handling"""
        # Test with completely invalid configuration
        with patch.dict(os.environ, {
            'AI_ENVIRONMENT': 'invalid',
            'AI_LOG_LEVEL': 'INVALID',
            'METRICS_COLLECTION_INTERVAL': '-1',
            'PROMETHEUS_PORT': '70000'
        }):
            config = AIConfig()

            # Should raise validation error
            with pytest.raises(ValueError):
                config.validate()

    def test_partial_configuration(self):
        """Test configuration with only some environment variables set"""
        with patch.dict(os.environ, {
            'AI_ENVIRONMENT': 'production',
            'AI_LOG_LEVEL': 'ERROR',
            # Other variables will use defaults
        }, clear=True):
            config = get_config()

            # Should use overridden values where set
            assert config.environment == "production"
            assert config.log_level == "ERROR"

            # Should use defaults for others
            assert config.model_cache_size == 10
            assert config.metrics.collection_interval == 10.0


class TestThreadSafety:
    """Test thread safety of configuration system"""

    def test_concurrent_config_access(self):
        """Test concurrent access to configuration"""
        import threading
        import time

        configs = []

        def get_config_worker():
            config = get_config()
            configs.append(config)
            time.sleep(0.1)

        # Start multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=get_config_worker)
            threads.append(thread)
            thread.start()

        # Wait for all threads
        for thread in threads:
            thread.join()

        # All should get the same config instance
        assert len(configs) == 5
        for config in configs[1:]:
            assert config is configs[0]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--cov=ai.config", "--cov-report=html", "--cov-report=term-missing"])
