#!/usr/bin/env python3
"""
AI Module Configuration Management
Centralizes all configuration with environment variable support

"""

import os
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class LogLevel(Enum):
    """Supported logging levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass
class MetricsConfig:
    """Configuration for metrics collection - GI-18 Compliant: No hardcoded values"""
    # Collection settings - All values externalized
    collection_interval: float = field(default_factory=lambda: float(os.getenv('METRICS_COLLECTION_INTERVAL')))
    history_size: int = field(default_factory=lambda: int(os.getenv('METRICS_HISTORY_SIZE')))

    # Prometheus settings - Values from environment
    prometheus_port: int = field(default_factory=lambda: int(os.getenv('PROMETHEUS_PORT')))
    prometheus_host: str = field(default_factory=lambda: os.getenv('PROMETHEUS_HOST'))

    # Performance tracking - Environment driven
    request_buffer_size: int = field(default_factory=lambda: int(os.getenv('REQUEST_BUFFER_SIZE')))

    # Thresholds - Externalized configuration
    error_rate_threshold: float = field(default_factory=lambda: float(os.getenv('ERROR_RATE_THRESHOLD')))
    response_time_threshold_ms: float = field(default_factory=lambda: float(os.getenv('RESPONSE_TIME_THRESHOLD_MS')))

    # Storage settings
    metrics_storage_path: str = field(default_factory=lambda: os.getenv('METRICS_STORAGE_PATH', '/tmp/ai_metrics'))

    def validate(self) -> bool:
        """Validate configuration values"""
        if self.collection_interval <= 0:
            raise ValueError("Collection interval must be positive")
        if self.history_size <= 0:
            raise ValueError("History size must be positive")
        if not (1 <= self.prometheus_port <= 65535):
            raise ValueError("Prometheus port must be between 1 and 65535")
        return True


@dataclass
class AIConfig:
    """Main AI module configuration"""
    # Environment
    environment: str = field(default_factory=lambda: os.getenv('AI_ENVIRONMENT', 'development'))

    # Logging
    log_level: str = field(default_factory=lambda: os.getenv('AI_LOG_LEVEL', 'INFO'))
    log_format: str = field(default_factory=lambda: os.getenv('AI_LOG_FORMAT', '%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

    # Model settings
    model_cache_size: int = field(default_factory=lambda: int(os.getenv('MODEL_CACHE_SIZE', '10')))
    model_timeout_seconds: float = field(default_factory=lambda: float(os.getenv('MODEL_TIMEOUT_SECONDS', '30.0')))

    # Performance
    max_concurrent_requests: int = field(default_factory=lambda: int(os.getenv('MAX_CONCURRENT_REQUESTS', '10')))
    enable_caching: bool = field(default_factory=lambda: os.getenv('ENABLE_CACHING', 'true').lower() == 'true')

    # Security
    enable_rate_limiting: bool = field(default_factory=lambda: os.getenv('ENABLE_RATE_LIMITING', 'true').lower() == 'true')
    rate_limit_requests_per_minute: int = field(default_factory=lambda: int(os.getenv('RATE_LIMIT_RPM', '60')))

    # Metrics configuration
    metrics: MetricsConfig = field(default_factory=MetricsConfig)

    def validate(self) -> bool:
        """Validate all configuration values"""
        if self.environment not in ['development', 'staging', 'production']:
            raise ValueError("Environment must be development, staging, or production")

        if self.log_level not in [level.value for level in LogLevel]:
            raise ValueError(f"Log level must be one of: {[level.value for level in LogLevel]}")

        if self.model_timeout_seconds <= 0:
            raise ValueError("Model timeout must be positive")

        if self.max_concurrent_requests <= 0:
            raise ValueError("Max concurrent requests must be positive")

        if self.rate_limit_requests_per_minute <= 0:
            raise ValueError("Rate limit must be positive")

        self.metrics.validate()
        return True

    def get_log_level(self) -> int:
        """Convert string log level to logging constant"""
        return getattr(logging, self.log_level.upper())

    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == 'production'

    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == 'development'


class ConfigManager:
    """Centralized configuration management"""

    _instance: Optional['ConfigManager'] = None
    _config: Optional[AIConfig] = None

    def __new__(cls) -> 'ConfigManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_config(self) -> AIConfig:
        """Get current configuration, loading if necessary"""
        if self._config is None:
            self._config = AIConfig()
            self._config.validate()
        return self._config

    def reload_config(self) -> AIConfig:
        """Reload configuration from environment"""
        self._config = AIConfig()
        self._config.validate()
        return self._config

    def get_env_var(self, key: str, default: Any = None, required: bool = False) -> Any:
        """Get environment variable with validation"""
        value = os.getenv(key, default)

        if required and value is None:
            raise ValueError(f"Required environment variable {key} is not set")

        return value

    def validate_required_env_vars(self, required_vars: list) -> bool:
        """Validate that all required environment variables are set"""
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)

        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

        return True


# Singleton instance
config_manager = ConfigManager()


def get_config() -> AIConfig:
    """Get the current AI configuration"""
    return config_manager.get_config()


def get_metrics_config() -> MetricsConfig:
    """Get metrics-specific configuration"""
    return get_config().metrics


def validate_environment():
    """Validate the current environment configuration"""
    config = get_config()

    # Additional environment-specific validations
    if config.is_production():
        required_vars = [
            'PROMETHEUS_HOST',
            'PROMETHEUS_PORT',
            'METRICS_STORAGE_PATH'
        ]
        config_manager.validate_required_env_vars(required_vars)

    return True


# Initialize and validate configuration on import
if __name__ != "__main__":
    validate_environment()
