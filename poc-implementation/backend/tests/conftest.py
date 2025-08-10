"""
Global pytest configuration and fixtures for the Nen Platform testing environment.
Follows best practices with environment variable configurations and no hardcoding.
"""

import os
import sys
import pytest
import asyncio
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from unittest.mock import Mock, AsyncMock

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(
    level=os.getenv('TEST_LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)class TestConfig:
    """Test configuration loaded from environment variables."""

    def __init__(self):
        # Load environment variables with defaults
        self.node_env = os.getenv('NODE_ENV', 'test')
        self.test_timeout = int(os.getenv('TEST_TIMEOUT', '60'))
        self.test_timeout_unit = int(os.getenv('TEST_TIMEOUT_UNIT', '5'))
        self.test_timeout_integration = int(os.getenv('TEST_TIMEOUT_INTEGRATION', '15'))
        self.test_timeout_e2e = int(os.getenv('TEST_TIMEOUT_E2E', '30'))

        # Database configuration
        self.database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:test_password@localhost:5433/nen_platform_test')
        self.db_host = os.getenv('DB_HOST', 'localhost')
        self.db_port = int(os.getenv('DB_PORT', '5433'))
        self.db_name = os.getenv('DB_NAME', 'nen_platform_test')
        self.db_username = os.getenv('DB_USERNAME', 'postgres')
        self.db_password = os.getenv('DB_PASSWORD', 'test_password')

        # Redis configuration
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6380/1')
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', '6380'))
        self.redis_db = int(os.getenv('REDIS_DB', '1'))
        self.redis_password = os.getenv('REDIS_PASSWORD', '')

        # Service URLs
        self.ai_service_url = os.getenv('AI_SERVICE_URL', 'http://localhost:8002')
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:3003')
        self.frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')

        # Security configuration
        self.jwt_secret = os.getenv('JWT_SECRET', 'test-jwt-secret-for-testing-only')
        self.session_secret = os.getenv('SESSION_SECRET', 'test-session-secret-for-testing-only')

        # Coverage thresholds
        self.coverage_threshold_branches = int(os.getenv('COVERAGE_THRESHOLD_BRANCHES', '80'))
        self.coverage_threshold_functions = int(os.getenv('COVERAGE_THRESHOLD_FUNCTIONS', '80'))
        self.coverage_threshold_lines = int(os.getenv('COVERAGE_THRESHOLD_LINES', '80'))
        self.coverage_threshold_statements = int(os.getenv('COVERAGE_THRESHOLD_STATEMENTS', '80'))

        # Feature flags
        self.enable_parallel_tests = os.getenv('ENABLE_PARALLEL_TESTS', 'true').lower() == 'true'
        self.enable_test_metrics = os.getenv('ENABLE_TEST_METRICS', 'true').lower() == 'true'
        self.enable_test_monitoring = os.getenv('ENABLE_TEST_MONITORING', 'true').lower() == 'true'

        # Mock service flags
        self.mock_ai_service_enabled = os.getenv('MOCK_AI_SERVICE_ENABLED', 'false').lower() == 'true'
        self.mock_blockchain_service_enabled = os.getenv('MOCK_BLOCKCHAIN_SERVICE_ENABLED', 'false').lower() == 'true'
        self.mock_external_apis_enabled = os.getenv('MOCK_EXTERNAL_APIS_ENABLED', 'false').lower() == 'true'

        # Test user credentials
        self.test_user_email = os.getenv('TEST_USER_EMAIL', 'test@nen.platform')
        self.test_user_password = os.getenv('TEST_USER_PASSWORD', 'test_password_123')
        self.test_admin_email = os.getenv('TEST_ADMIN_EMAIL', 'admin@nen.platform')
        self.test_admin_password = os.getenv('TEST_ADMIN_PASSWORD', 'admin_password_123')

        # Solana configuration
        self.solana_network = os.getenv('SOLANA_NETWORK', 'devnet')
        self.solana_rpc_url = os.getenv('SOLANA_RPC_URL', 'https://api.devnet.solana.com')
        self.solana_commitment = os.getenv('SOLANA_COMMITMENT', 'confirmed')

        logger.info(f"Test configuration loaded for environment: {self.node_env}")@pytest.fixture(scope="session")
def test_config():
    """Provide test configuration loaded from environment variables."""
    return TestConfig()@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()@pytest.fixture
def mock_ai_service(test_config):
    """Mock AI service for testing when external service is unavailable."""
    if test_config.mock_ai_service_enabled:
        mock = AsyncMock()
        mock.generate_move.return_value = {"move": "test_move", "confidence": 0.85}
        mock.analyze_game_state.return_value = {"analysis": "test_analysis", "score": 0.75}
        return mock
    return None@pytest.fixture
def mock_database_connection(test_config):
    """Mock database connection for isolated testing."""
    mock_conn = Mock()
    mock_conn.execute = AsyncMock()
    mock_conn.fetchone = AsyncMock()
    mock_conn.fetchall = AsyncMock()
    mock_conn.commit = AsyncMock()
    mock_conn.rollback = AsyncMock()
    mock_conn.close = AsyncMock()
    return mock_conn@pytest.fixture
def mock_redis_client(test_config):
    """Mock Redis client for testing cache operations."""
    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock()
    mock_redis.set = AsyncMock()
    mock_redis.delete = AsyncMock()
    mock_redis.exists = AsyncMock()
    mock_redis.expire = AsyncMock()
    mock_redis.flushdb = AsyncMock()
    return mock_redis@pytest.fixture
def test_user_data(test_config):
    """Provide test user data from environment variables."""
    return {
        "email": test_config.test_user_email,
        "password": test_config.test_user_password,
        "username": "test_user",
        "is_admin": False
    }@pytest.fixture
def test_admin_data(test_config):
    """Provide test admin data from environment variables."""
    return {
        "email": test_config.test_admin_email,
        "password": test_config.test_admin_password,
        "username": "test_admin",
        "is_admin": True
    }@pytest.fixture(autouse=True)
def setup_test_environment(test_config, monkeypatch):
    """Set up test environment variables for each test."""
    # Ensure test environment is properly configured
    monkeypatch.setenv("NODE_ENV", test_config.node_env)
    monkeypatch.setenv("DATABASE_URL", test_config.database_url)
    monkeypatch.setenv("REDIS_URL", test_config.redis_url)
    monkeypatch.setenv("JWT_SECRET", test_config.jwt_secret)
    monkeypatch.setenv("SESSION_SECRET", test_config.session_secret)

    # Create necessary directories
    os.makedirs("coverage", exist_ok=True)
    os.makedirs("reports", exist_ok=True)
    os.makedirs("logs", exist_ok=True)

    yield

    # Cleanup can be added here if needed@pytest.fixture
def test_database_url(test_config):
    """Provide test database URL from environment variables."""
    return test_config.database_url@pytest.fixture
def test_redis_url(test_config):
    """Provide test Redis URL from environment variables."""
    return test_config.redis_urldef pytest_configure(config):
    """Configure pytest with environment-specific settings."""
    test_config = TestConfig()

    # Configure coverage thresholds from environment variables
    config.option.cov_fail_under = test_config.coverage_threshold_lines

    # Configure parallel execution based on environment variable
    if test_config.enable_parallel_tests and hasattr(config.option, 'numprocesses'):
        if config.option.numprocesses == 'auto':
            import multiprocessing
            config.option.numprocesses = multiprocessing.cpu_count()

    logger.info(f"Pytest configured for {test_config.node_env} environment")def pytest_collection_modifyitems(config, items):
    """Modify test collection based on environment configuration."""
    test_config = TestConfig()

    # Add timeout markers based on test type
    for item in items:
        # Set timeouts based on test markers
        if "slow" in item.keywords:
            item.add_marker(pytest.mark.timeout(test_config.test_timeout_e2e))
        elif "integration" in item.keywords:
            item.add_marker(pytest.mark.timeout(test_config.test_timeout_integration))
        elif "unit" in item.keywords:
            item.add_marker(pytest.mark.timeout(test_config.test_timeout_unit))
        else:
            item.add_marker(pytest.mark.timeout(test_config.test_timeout))def pytest_report_header(config):
    """Add custom header information to pytest report."""
    test_config = TestConfig()
    return [
        f"Test Environment: {test_config.node_env}",
        f"Python Path: {sys.executable}",
        f"Project Root: {project_root}",
        f"Database URL: {test_config.database_url.replace(test_config.db_password, '***')}",
        f"Redis URL: {test_config.redis_url}",
        f"AI Service URL: {test_config.ai_service_url}",
        f"Parallel Tests: {test_config.enable_parallel_tests}",
        f"Test Metrics: {test_config.enable_test_metrics}",
    ]def pytest_sessionstart(session):
    """Session start hook for setup."""
    logger.info("Starting pytest session with environment variable configuration")def pytest_sessionfinish(session, exitstatus):
    """Session finish hook for cleanup."""
    logger.info(f"Pytest session finished with exit status: {exitstatus}")# Performance testing utilities
@pytest.fixture
def performance_monitor():
    """Monitor test performance metrics."""
    import time
    import psutil

    class PerformanceMonitor:
        def __init__(self):
            self.start_time = None
            self.end_time = None
            self.process = psutil.Process()

        def start(self):
            self.start_time = time.time()
            return self

        def stop(self):
            self.end_time = time.time()
            return self

        @property
        def duration(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None

        @property
        def memory_usage(self):
            return self.process.memory_info().rss / 1024 / 1024  # MB

        @property
        def cpu_percent(self):
            return self.process.cpu_percent()

    return PerformanceMonitor()# Custom pytest markers - plugins are automatically discovered
