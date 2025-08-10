#!/usr/bin/env python3
"""
Performance Testing Demonstration
Quick demonstration of the MagicBlock compliance testing suite

This script shows:
- Basic test execution
- Performance measurement
- Report generation
- Compliance validation

Usage:
    python demo_performance_testing.py
"""

import time
import sys
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from test_latency import (
    TestLatencyRequirements,
    PerformanceAnalyzer,
    load_test_positions,
    PERFORMANCE_CONFIG
)

def demonstrate_position_generation():
    """Demonstrate test position generation"""
    print("📊 Test Position Generation Demo")
    print("-" * 40)

    positions = load_test_positions(10)
    print(f"Generated {len(positions)} test positions:")

    for i, pos in enumerate(positions[:5]):  # Show first 5
        print(f"  {i+1}. {pos['type']} - {pos['complexity']} complexity ({pos['move_number']} moves)")

    print(f"  ... and {len(positions) - 5} more positions")
    print()

def demonstrate_performance_analysis():
    """Demonstrate performance analysis capabilities"""
    print("🔍 Performance Analysis Demo")
    print("-" * 40)

    # Simulate timing data
    mock_times = [5.2, 6.1, 4.8, 7.3, 5.9, 6.5, 5.0, 6.8, 5.4, 6.2]

    print(f"Sample timing data: {mock_times}")

    analysis = PerformanceAnalyzer.analyze_execution_times(mock_times)
    print(f"Performance Analysis:")
    print(f"  Maximum: {analysis['max']:.2f}ms")
    print(f"  Average: {analysis['avg']:.2f}ms")
    print(f"  P95: {analysis['p95']:.2f}ms")
    print(f"  P99: {analysis['p99']:.2f}ms")

    # Check compliance for 10ms target
    compliance, message = PerformanceAnalyzer.check_compliance(mock_times, 10.0)
    print(f"  Compliance (10ms target): {'✅ PASS' if compliance else '❌ FAIL'}")
    if not compliance:
        print(f"    Reason: {message}")
    print()

def demonstrate_quick_test():
    """Demonstrate a quick performance test"""
    print("⚡ Quick Performance Test Demo")
    print("-" * 40)

    # Create test instance
    test_suite = TestLatencyRequirements()

    class MockMethod:
        __name__ = "demo_test"

    # Setup
    test_suite.setup_method(MockMethod())

    print("Running quick easy agent test...")
    start_time = time.time()

    try:
        # Use a smaller number of test positions for demo
        original_count = PERFORMANCE_CONFIG['test_position_count']
        PERFORMANCE_CONFIG['test_position_count'] = 5  # Quick demo

        test_suite.test_easy_agent_10ms_target()

        # Restore original
        PERFORMANCE_CONFIG['test_position_count'] = original_count

        duration = time.time() - start_time
        print(f"✅ Test completed in {duration:.2f} seconds")

    except Exception as e:
        print(f"❌ Test error: {e}")
    finally:
        test_suite.teardown_method(MockMethod())

    print()

def demonstrate_configuration():
    """Demonstrate configuration system"""
    print("⚙️  Configuration Demo")
    print("-" * 40)

    print("Current Performance Targets:")
    print(f"  Easy Agent: {PERFORMANCE_CONFIG['easy_agent_target_ms']}ms")
    print(f"  Medium Agent: {PERFORMANCE_CONFIG['medium_agent_target_ms']}ms")
    print(f"  Hard Agent: {PERFORMANCE_CONFIG['hard_agent_target_ms']}ms")
    print(f"  Test Positions: {PERFORMANCE_CONFIG['test_position_count']}")
    print(f"  Concurrent Limit: {PERFORMANCE_CONFIG['concurrent_request_limit']}")
    print()

def main():
    """Main demonstration function"""
    print("🚀 MagicBlock Performance Testing Suite Demo")
    print("=" * 60)
    print()

    # Run demonstrations
    demonstrate_configuration()
    demonstrate_position_generation()
    demonstrate_performance_analysis()
    demonstrate_quick_test()

    print("📋 Testing Suite Features:")
    print("  ✅ Individual Agent Latency Testing")
    print("  ✅ System-wide Performance Testing")
    print("  ✅ Load Testing Under Various Conditions")
    print("  ✅ MagicBlock Compliance Validation")
    print("  ✅ Comprehensive Performance Reporting")
    print("  ✅ CI/CD Integration Support")
    print("  ✅ Environment-based Configuration")
    print()

    print("🎯 Usage Examples:")
    print("  python run_performance_tests.py --test-type latency")
    print("  python run_performance_tests.py --compliance --strict")
    print("  pytest test_latency.py -m 'latency' -v")
    print("  pytest test_latency.py::TestLatencyRequirements::test_magicblock_strict_compliance")
    print()

    print("📊 Reports Generated:")
    print("  • JSON performance reports with detailed metrics")
    print("  • Markdown summaries for human readability")
    print("  • JUnit XML for CI/CD integration")
    print("  • CSV exports for data analysis")
    print()

    print("=" * 60)
    print("🎉 Demo Complete - Performance Testing Suite Ready!")

if __name__ == "__main__":
    main()
