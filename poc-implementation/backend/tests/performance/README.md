# Performance Testing Suite for MagicBlock Compliance

Comprehensive latency and performance testing for AI system compliance with MagicBlock sub-100ms requirements.

## Overview

This testing suite provides:

- **Individual Agent Latency Testing** - Validates each AI agent meets specific timing requirements
- **System-wide Performance Testing** - Tests API, database, and WebSocket latency
- **Load Testing** - Validates performance under various load conditions
- **MagicBlock Compliance Validation** - Ensures strict sub-100ms compliance
- **Comprehensive Reporting** - Detailed performance analysis and recommendations

## Quick Start

### Prerequisites

```bash
cd /workspaces/Nen/backend/tests/performance
pip install -r requirements-performance.txt
```

### Running Tests

#### Basic Test Execution

```bash
# Run all performance tests
python run_performance_tests.py

# Run specific test type
python run_performance_tests.py --test-type latency

# Quick test run (reduced test cases)
python run_performance_tests.py --quick

# Run with MagicBlock compliance validation
python run_performance_tests.py --compliance
```

#### Advanced Testing

```bash
# CI/CD mode with optimizations
python run_performance_tests.py --ci --test-type all

# Strict mode with all validations
python run_performance_tests.py --strict --compliance --verbose

# Performance benchmarking
python run_performance_tests.py --benchmark --test-type latency
```

#### Using Pytest Directly

```bash
# Run all tests
pytest test_latency.py -v

# Run specific test categories
pytest test_latency.py -m "latency" -v
pytest test_latency.py -m "compliance" -v
pytest test_latency.py -m "load" -v

# Run with detailed output
pytest test_latency.py -v -s --tb=long
```

## Test Configuration

### Environment Variables

The testing suite uses environment variables for configuration (following GI.md guideline #18):

```bash
# Agent performance targets (milliseconds)
export EASY_AGENT_TARGET_MS=10
export MEDIUM_AGENT_TARGET_MS=50
export HARD_AGENT_TARGET_MS=90

# System performance targets
export API_RESPONSE_TIMEOUT_MS=200
export DATABASE_QUERY_TIMEOUT_MS=100
export WEBSOCKET_TIMEOUT_MS=5000

# Test configuration
export TEST_POSITION_COUNT=100
export MAX_LOAD_TEST_DURATION=300
export CONCURRENT_REQUEST_LIMIT=100

# MagicBlock configuration
export MAGICBLOCK_STRICT_COMPLIANCE=true
export GEOGRAPHIC_REGION=US-WEST
export LATENCY_ZONE=1

# CI/CD configuration
export CI=true
export CI_REDUCED_LOAD=true
export CI_TIMEOUT_MULTIPLIER=2.0
```

### Configuration File

The `config.py` file provides comprehensive configuration management:

```python
from config import get_config, get_magicblock_config

config = get_config()
print(f"Easy agent target: {config.easy_agent_target_ms}ms")
```

## Test Categories

### 1. Individual Agent Latency Tests

Tests each AI difficulty level against specific timing requirements:

- **Easy Agent**: 10ms target (random move selection)
- **Medium Agent**: 50ms target (minimax with alpha-beta pruning)
- **Hard Agent**: 90ms target (deep analysis with neural networks)

Each test validates:
- Maximum execution time < target
- P99 execution time < 90% of target
- Average execution time < 60% of target

### 2. System-wide Performance Tests

- **API Response Times**: <200ms for HTTP endpoints
- **Database Query Performance**: <100ms for standard queries
- **WebSocket Message Latency**: <5000ms for real-time communication

### 3. Load Testing

- **Latency Under Load**: Performance with 1-50 concurrent users
- **Concurrent Request Handling**: Maximum throughput testing
- **Peak Usage Simulation**: Variable load patterns over time

### 4. MagicBlock Compliance Testing

Comprehensive validation against MagicBlock requirements:

```python
def test_magicblock_strict_compliance():
    """All agents must be sub-100ms with strict validation"""
    test_scenarios = [
        ("easy", "aggressive", 10),
        ("easy", "defensive", 10),
        ("easy", "balanced", 10),
        ("medium", "aggressive", 50),
        ("medium", "defensive", 50),
        ("medium", "balanced", 50),
        ("hard", "aggressive", 90),
        ("hard", "defensive", 90),
        ("hard", "balanced", 90)
    ]
    # ... test implementation
```

## Test Results and Reporting

### Performance Reports

Tests generate comprehensive reports in multiple formats:

- **JSON Reports**: Machine-readable detailed results
- **Markdown Summaries**: Human-readable test summaries
- **CSV Exports**: Data for analysis and visualization
- **JUnit XML**: CI/CD integration

### Report Location

```
performance_reports/
├── magicblock_compliance_report_20250801_143022.json
├── magicblock_compliance_summary_20250801_143022.md
├── test_summary_20250801_143022.json
└── junit_results_latency.xml
```

### Sample Report Structure

```json
{
  "test_summary": {
    "timestamp": "2025-08-01T14:30:22",
    "total_scenarios": 9,
    "passed_scenarios": 9,
    "failed_scenarios": 0,
    "overall_compliance": true
  },
  "detailed_results": {
    "easy_aggressive": {
      "max_time_ms": 8.5,
      "avg_time_ms": 4.2,
      "p99_time_ms": 7.8,
      "compliance_status": "PASS"
    }
  },
  "recommendations": [
    "✅ All agents meet MagicBlock compliance requirements",
    "💡 Consider optimizing further for safety margin"
  ]
}
```

## Performance Benchmarks

### Target Performance

| Agent Type | Target (ms) | Expected Average (ms) | Expected P99 (ms) |
|------------|-------------|----------------------|-------------------|
| Easy       | 10          | <6                   | <9                |
| Medium     | 50          | <30                  | <45               |
| Hard       | 90          | <54                  | <81               |

### System Performance

| Component  | Target (ms) | Expected (ms) |
|------------|-------------|---------------|
| API        | 200         | <100          |
| Database   | 100         | <50           |
| WebSocket  | 5000        | <100          |

## CI/CD Integration

### GitHub Actions

```yaml
name: Performance Tests
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          cd backend/tests/performance
          pip install -r requirements-performance.txt
      - name: Run performance tests
        run: |
          cd backend/tests/performance
          python run_performance_tests.py --ci --compliance
```

### Environment-specific Testing

The suite automatically adapts to different environments:

- **Development**: Reduced test counts, shorter durations
- **Staging**: Medium test load, full feature testing
- **Production**: Full test suite, maximum load testing
- **CI**: Optimized for build pipelines, parallel execution

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Ensure project paths are correct
   export PYTHONPATH="/workspaces/Nen/backend:$PYTHONPATH"
   ```

2. **Timeout Issues**
   ```bash
   # Increase timeouts for slower environments
   export CI_TIMEOUT_MULTIPLIER=3.0
   ```

3. **Performance Failures**
   ```bash
   # Check system load
   python -c "from config import get_config; print(get_config())"
   ```

### Debug Mode

```bash
# Run with verbose output and debugging
python run_performance_tests.py --verbose --keep-files
pytest test_latency.py -v -s --tb=long --capture=no
```

## Development

### Adding New Tests

1. Create test method in `TestLatencyRequirements` class
2. Add appropriate pytest markers
3. Update configuration if needed
4. Add documentation

Example:
```python
@pytest.mark.latency
@pytest.mark.fast
def test_new_agent_performance(self):
    """Test new agent performance requirements"""
    # Implementation here
    pass
```

### Custom Configuration

```python
from config import PerformanceConfig

custom_config = PerformanceConfig(
    easy_agent_target_ms=5,  # Stricter requirement
    test_position_count=200  # More test cases
)
```

## Performance Optimization

### For Better Test Performance

1. **Reduce Test Position Count** (development)
   ```bash
   export TEST_POSITION_COUNT=25
   ```

2. **Use Quick Mode**
   ```bash
   python run_performance_tests.py --quick
   ```

3. **Parallel Execution**
   ```bash
   pytest test_latency.py -n auto
   ```

### For Better AI Performance

1. **Profile Agent Performance**
   - Use built-in timing analysis
   - Check for performance bottlenecks
   - Optimize AI algorithms

2. **Monitor System Resources**
   - CPU usage during tests
   - Memory consumption
   - I/O performance

## Architecture

### Test Structure

```
performance/
├── __init__.py              # Package initialization
├── config.py                # Configuration management
├── test_latency.py          # Main test suite
├── run_performance_tests.py # Test runner script
├── pytest.ini              # Pytest configuration
├── requirements-performance.txt # Dependencies
└── README.md               # This documentation
```

### Key Components

- **TestLatencyRequirements**: Main test class with all performance tests
- **PerformanceAnalyzer**: Statistical analysis and validationing
- **TestPositionGenerator**: Realistic game position generation
- **PerformanceTestRunner**: Comprehensive test execution and reporting

## Contributing

1. Follow GI.md guidelines for all contributions
2. Ensure 100% test coverage for new features
3. Update documentation for any changes
4. Test in multiple environments before submitting

## License

This performance testing suite is part of the Nen Platform and follows the same licensing terms.
