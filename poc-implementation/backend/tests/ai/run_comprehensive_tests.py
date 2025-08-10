#!/usr/bin/env python3
"""
Comprehensive Test Runner for AI System
Following GI.md guidelines for production-ready testing

This script executes the complete test suite for BaseAIAgent and related components
with detailed reporting and performance metrics.
"""

import os
import sys
import time
import json
import subprocess
import argparse
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass, asdict
import pytest

# Add AI services to path
sys.path.append(str(Path(__file__).parent.parent.parent / "ai-services"))

@dataclass
class TestExecutionReport:
    """Comprehensive test execution report"""
    test_suite: str
    start_time: float
    end_time: float
    total_duration: float
    tests_run: int
    tests_passed: int
    tests_failed: int
    tests_skipped: int
    success_rate: float
    performance_metrics: Dict[str, Any]
    coverage_report: Dict[str, Any]
    environment_info: Dict[str, str]
    errors: List[str]

class ComprehensiveTestRunner:
    """
    Production-grade test runner with comprehensive reporting
    Following GI.md guidelines for testing excellence
    """

    def __init__(self):
        self.results = []
        self.start_time = time.time()
        self.environment_config = self._setup_environment()

    def _setup_environment(self) -> Dict[str, str]:
        """Setup test environment variables (GI.md #18 - No hardcoding)"""
        env_config = {
            'FRAUD_DETECTION_THRESHOLD_MS': os.environ.get('FRAUD_DETECTION_THRESHOLD_MS', '10'),
            'MAX_THINKING_TIME_S': os.environ.get('MAX_THINKING_TIME_S', '5.0'),
            'MIN_PERSONALITY_VARIANCE': os.environ.get('MIN_PERSONALITY_VARIANCE', '0.1'),
            'PERFORMANCE_TEST_ITERATIONS': os.environ.get('PERFORMANCE_TEST_ITERATIONS', '100'),
            'CONCURRENT_TEST_THREADS': os.environ.get('CONCURRENT_TEST_THREADS', '4'),
            'TEST_TIMEOUT_S': os.environ.get('TEST_TIMEOUT_S', '300'),
            'COVERAGE_THRESHOLD': os.environ.get('COVERAGE_THRESHOLD', '90'),
            'PYTHONPATH': str(Path(__file__).parent.parent.parent / "ai-services")
        }

        # Set environment variables for test execution
        for key, value in env_config.items():
            os.environ[key] = value

        return env_config

    def run_base_agent_tests(self, verbose: bool = True) -> TestExecutionReport:
        """
        Run comprehensive BaseAIAgent tests
        Following GI.md #8 - Test extensively at every stage
        """
        print("=" * 60)
        print("COMPREHENSIVE BASEAIAGENT TESTING")
        print("=" * 60)
        print(f"Environment Configuration:")
        for key, value in self.environment_config.items():
            print(f"  {key}: {value}")
        print()

        test_file = Path(__file__).parent / "test_base_agent.py"

        # Prepare pytest arguments
        pytest_args = [
            str(test_file),
            "-v" if verbose else "-q",
            "--tb=short",
            "--strict-markers",
            "--disable-warnings",
            f"--timeout={self.environment_config['TEST_TIMEOUT_S']}",
            "--capture=no" if verbose else "--capture=sys"
        ]

        # Add coverage reporting
        pytest_args.extend([
            "--cov=agents.basic_ai_agents",
            "--cov-report=term-missing",
            "--cov-report=json:coverage_report.json",
            f"--cov-fail-under={self.environment_config['COVERAGE_THRESHOLD']}"
        ])

        start_time = time.time()

        try:
            print("Starting BaseAIAgent test execution...")
            print(f"Command: pytest {' '.join(pytest_args)}")
            print()

            # Run tests with pytest
            result = pytest.main(pytest_args)

            end_time = time.time()
            duration = end_time - start_time

            # Parse results
            success = result == 0

            # Try to load coverage report
            coverage_data = {}
            coverage_file = Path("coverage_report.json")
            if coverage_file.exists():
                try:
                    with open(coverage_file, 'r') as f:
                        coverage_data = json.load(f)
                except Exception as e:
                    print(f"Warning: Could not load coverage report: {e}")

            # Create detailed report
            report = TestExecutionReport(
                test_suite="BaseAIAgent Comprehensive Tests",
                start_time=start_time,
                end_time=end_time,
                total_duration=duration,
                tests_run=0,  # Will be updated from pytest output
                tests_passed=0,
                tests_failed=0,
                tests_skipped=0,
                success_rate=1.0 if success else 0.0,
                performance_metrics={
                    'average_test_time': duration / max(1, 1),  # Placeholder
                    'memory_usage_mb': self._get_memory_usage(),
                    'cpu_usage_percent': self._get_cpu_usage()
                },
                coverage_report=coverage_data,
                environment_info=self.environment_config,
                errors=[] if success else ["Test execution failed"]
            )

            return report

        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time

            error_report = TestExecutionReport(
                test_suite="BaseAIAgent Comprehensive Tests",
                start_time=start_time,
                end_time=end_time,
                total_duration=duration,
                tests_run=0,
                tests_passed=0,
                tests_failed=1,
                tests_skipped=0,
                success_rate=0.0,
                performance_metrics={},
                coverage_report={},
                environment_info=self.environment_config,
                errors=[str(e)]
            )

            return error_report

    def run_fraud_detection_specific_tests(self) -> TestExecutionReport:
        """
        Run specific fraud detection tests with detailed analysis
        Following requirement for fraud detection validation
        """
        print("\n" + "=" * 60)
        print("FRAUD DETECTION SPECIFIC TESTING")
        print("=" * 60)

        test_file = Path(__file__).parent / "test_base_agent.py"

        # Run only fraud detection tests
        fraud_test_args = [
            str(test_file),
            "-k", "fraud_detection or fast_decision or suspicious_pattern",
            "-v",
            "--tb=long",
            "--capture=no"
        ]

        start_time = time.time()
        result = pytest.main(fraud_test_args)
        end_time = time.time()

        return TestExecutionReport(
            test_suite="Fraud Detection Tests",
            start_time=start_time,
            end_time=end_time,
            total_duration=end_time - start_time,
            tests_run=0,  # Parsed from output
            tests_passed=0,
            tests_failed=0,
            tests_skipped=0,
            success_rate=1.0 if result == 0 else 0.0,
            performance_metrics={},
            coverage_report={},
            environment_info=self.environment_config,
            errors=[] if result == 0 else ["Fraud detection tests failed"]
        )

    def run_personality_impact_tests(self) -> TestExecutionReport:
        """
        Run personality impact tests with variance analysis
        Following requirement for personality impact testing
        """
        print("\n" + "=" * 60)
        print("PERSONALITY IMPACT TESTING")
        print("=" * 60)

        test_file = Path(__file__).parent / "test_base_agent.py"

        # Run personality-related tests
        personality_test_args = [
            str(test_file),
            "-k", "personality",
            "-v",
            "--tb=short",
            "--capture=no"
        ]

        start_time = time.time()
        result = pytest.main(personality_test_args)
        end_time = time.time()

        return TestExecutionReport(
            test_suite="Personality Impact Tests",
            start_time=start_time,
            end_time=end_time,
            total_duration=end_time - start_time,
            tests_run=0,
            tests_passed=0,
            tests_failed=0,
            tests_skipped=0,
            success_rate=1.0 if result == 0 else 0.0,
            performance_metrics={},
            coverage_report={},
            environment_info=self.environment_config,
            errors=[] if result == 0 else ["Personality impact tests failed"]
        )

    def run_performance_benchmarks(self) -> TestExecutionReport:
        """
        Run performance and benchmarking tests
        Following GI.md #21 - Optimize for performance
        """
        print("\n" + "=" * 60)
        print("PERFORMANCE BENCHMARK TESTING")
        print("=" * 60)

        test_file = Path(__file__).parent / "test_base_agent.py"

        # Run performance tests
        performance_test_args = [
            str(test_file),
            "-k", "performance or timing or benchmark or concurrent",
            "-v",
            "--tb=short",
            "--capture=no"
        ]

        start_time = time.time()
        result = pytest.main(performance_test_args)
        end_time = time.time()

        return TestExecutionReport(
            test_suite="Performance Benchmarks",
            start_time=start_time,
            end_time=end_time,
            total_duration=end_time - start_time,
            tests_run=0,
            tests_passed=0,
            tests_failed=0,
            tests_skipped=0,
            success_rate=1.0 if result == 0 else 0.0,
            performance_metrics={
                'benchmark_duration': end_time - start_time,
                'memory_usage_mb': self._get_memory_usage(),
                'cpu_usage_percent': self._get_cpu_usage()
            },
            coverage_report={},
            environment_info=self.environment_config,
            errors=[] if result == 0 else ["Performance tests failed"]
        )

    def generate_comprehensive_report(self, reports: List[TestExecutionReport]) -> str:
        """
        Generate comprehensive test report
        Following GI.md #11 - Update and refer to documentation
        """
        total_start = min(r.start_time for r in reports)
        total_end = max(r.end_time for r in reports)
        total_duration = total_end - total_start

        report = []
        report.append("=" * 80)
        report.append("COMPREHENSIVE AI SYSTEM TEST REPORT")
        report.append("=" * 80)
        report.append(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Total Execution Time: {total_duration:.2f} seconds")
        report.append("")

        # Environment summary
        report.append("ENVIRONMENT CONFIGURATION:")
        report.append("-" * 40)
        for key, value in self.environment_config.items():
            report.append(f"  {key}: {value}")
        report.append("")

        # Test suite summaries
        total_success_rate = 0
        for test_report in reports:
            report.append(f"TEST SUITE: {test_report.test_suite}")
            report.append("-" * 40)
            report.append(f"  Duration: {test_report.total_duration:.2f}s")
            report.append(f"  Success Rate: {test_report.success_rate:.1%}")
            report.append(f"  Tests Run: {test_report.tests_run}")
            report.append(f"  Passed: {test_report.tests_passed}")
            report.append(f"  Failed: {test_report.tests_failed}")
            report.append(f"  Skipped: {test_report.tests_skipped}")

            if test_report.errors:
                report.append("  Errors:")
                for error in test_report.errors:
                    report.append(f"    - {error}")

            if test_report.performance_metrics:
                report.append("  Performance Metrics:")
                for metric, value in test_report.performance_metrics.items():
                    report.append(f"    {metric}: {value}")

            report.append("")
            total_success_rate += test_report.success_rate

        # Overall summary
        avg_success_rate = total_success_rate / len(reports) if reports else 0
        report.append("OVERALL SUMMARY:")
        report.append("-" * 40)
        report.append(f"  Average Success Rate: {avg_success_rate:.1%}")
        report.append(f"  Total Test Suites: {len(reports)}")
        report.append(f"  Overall Status: {'PASS' if avg_success_rate >= 0.95 else 'FAIL'}")
        report.append("")

        # Coverage summary (if available)
        coverage_reports = [r.coverage_report for r in reports if r.coverage_report]
        if coverage_reports:
            report.append("COVERAGE SUMMARY:")
            report.append("-" * 40)
            # Process coverage data here
            report.append("  Coverage data available in individual reports")
            report.append("")

        # Recommendations
        report.append("RECOMMENDATIONS:")
        report.append("-" * 40)
        if avg_success_rate < 0.95:
            report.append("  - Address failing tests before production deployment")
        if any(r.total_duration > 30 for r in reports):
            report.append("  - Consider optimizing slow test suites")
        report.append("  - Review performance metrics for optimization opportunities")
        report.append("")

        report.append("=" * 80)

        return "\n".join(report)

    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            import psutil
            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024
        except ImportError:
            return 0.0

    def _get_cpu_usage(self) -> float:
        """Get current CPU usage percentage"""
        try:
            import psutil
            return psutil.cpu_percent(interval=1)
        except ImportError:
            return 0.0

def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="Comprehensive AI System Test Runner")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--output", "-o", help="Output report file")
    parser.add_argument("--suite", choices=["all", "base", "fraud", "personality", "performance"],
                       default="all", help="Test suite to run")

    args = parser.parse_args()

    runner = ComprehensiveTestRunner()
    reports = []

    print("Starting Comprehensive AI System Testing")
    print("Following GI.md guidelines for production-ready testing")
    print()

    try:
        if args.suite in ["all", "base"]:
            base_report = runner.run_base_agent_tests(verbose=args.verbose)
            reports.append(base_report)

        if args.suite in ["all", "fraud"]:
            fraud_report = runner.run_fraud_detection_specific_tests()
            reports.append(fraud_report)

        if args.suite in ["all", "personality"]:
            personality_report = runner.run_personality_impact_tests()
            reports.append(personality_report)

        if args.suite in ["all", "performance"]:
            performance_report = runner.run_performance_benchmarks()
            reports.append(performance_report)

        # Generate comprehensive report
        final_report = runner.generate_comprehensive_report(reports)

        # Output report
        if args.output:
            with open(args.output, 'w') as f:
                f.write(final_report)
            print(f"Report written to: {args.output}")
        else:
            print("\n" + final_report)

        # Exit with appropriate code
        overall_success = all(r.success_rate >= 0.95 for r in reports)
        sys.exit(0 if overall_success else 1)

    except KeyboardInterrupt:
        print("\nTesting interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Error during test execution: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
