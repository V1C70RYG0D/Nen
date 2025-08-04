#!/usr/bin/env python3
"""
Performance Testing Runner
Comprehensive script for running MagicBlock compliance and performance tests

This script provides:
- Automated test execution with proper setup
- Environment validation and configuration
- Test result aggregation and reporting
- CI/CD integration support
- Performance benchmarking

Implementation follows GI.md guidelines:
- Production readiness (Guideline #3)
- Comprehensive testing (Guideline #8)
- No hardcoding (Guideline #18)
- Robust error handling (Guideline #20)
"""

import os
import sys
import time
import subprocess
import argparse
import json
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime
import shutil

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from config import get_config, get_magicblock_config, get_ci_config

class PerformanceTestRunner:
    """Comprehensive performance test runner"""

    def __init__(self, args):
        """Initialize test runner with arguments"""
        self.args = args
        self.config = get_config()
        self.magicblock_config = get_magicblock_config()
        self.ci_config = get_ci_config()

        # Setup directories
        self.reports_dir = Path(self.config.reports_directory)
        self.reports_dir.mkdir(exist_ok=True)

        self.logs_dir = Path("logs")
        self.logs_dir.mkdir(exist_ok=True)

        # Test results
        self.test_results = {}
        self.start_time = None
        self.end_time = None

    def validate_environment(self) -> bool:
        """Validate test environment and dependencies"""
        print("🔍 Validating test environment...")

        # Check Python version
        if sys.version_info < (3, 8):
            print("❌ Python 3.8+ required")
            return False

        # Check required directories
        required_dirs = [
            Path(__file__).parent.parent.parent / "ai-services",
            Path(__file__).parent.parent / "integration",
        ]

        for dir_path in required_dirs:
            if not dir_path.exists():
                print(f"⚠️  Directory not found: {dir_path}")

        # Check environment variables
        required_env_vars = []
        if self.args.strict:
            required_env_vars = [
                'EASY_AGENT_TARGET_MS',
                'MEDIUM_AGENT_TARGET_MS',
                'HARD_AGENT_TARGET_MS'
            ]

        missing_vars = [var for var in required_env_vars if not os.getenv(var)]
        if missing_vars:
            print(f"⚠️  Missing environment variables: {missing_vars}")
            if self.args.strict:
                return False

        print("✅ Environment validation passed")
        return True

    def setup_test_environment(self):
        """Setup test environment and dependencies"""
        print("⚙️  Setting up test environment...")

        # Set test-specific environment variables
        os.environ['PYTEST_RUNNING'] = 'true'
        os.environ['TEST_ENVIRONMENT'] = 'testing'

        if self.args.ci:
            os.environ['CI'] = 'true'
            os.environ['CI_REDUCED_LOAD'] = 'true'

        # Create test data directories
        test_data_dir = Path("test_data")
        test_data_dir.mkdir(exist_ok=True)

        print("✅ Test environment setup complete")

    def run_test_suite(self, test_type: str = "all") -> bool:
        """Run specified test suite"""
        print(f"🚀 Running {test_type} performance tests...")

        self.start_time = time.time()

        # Build pytest command
        cmd = ["python", "-m", "pytest", "test_latency.py"]

        # Add test-specific markers
        if test_type == "latency":
            cmd.extend(["-m", "latency"])
        elif test_type == "load":
            cmd.extend(["-m", "load"])
        elif test_type == "compliance":
            cmd.extend(["-m", "compliance"])
        elif test_type == "system":
            cmd.extend(["-m", "system"])
        elif test_type == "fast":
            cmd.extend(["-m", "fast"])

        # Add output options
        cmd.extend([
            "--verbose",
            "--tb=short",
            f"--junitxml={self.reports_dir}/junit_results_{test_type}.xml"
        ])

        # Add CI-specific options
        if self.ci_config['is_ci_environment']:
            cmd.extend([
                "--timeout=600",  # Longer timeout for CI
                "--maxfail=1",    # Fail fast in CI
            ])

            if self.ci_config['parallel_test_workers'] > 1:
                cmd.extend(["-n", str(self.ci_config['parallel_test_workers'])])

        # Run tests
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=1800 if not self.args.quick else 300  # 30min or 5min timeout
            )

            self.end_time = time.time()

            # Store results
            self.test_results[test_type] = {
                'return_code': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'duration': self.end_time - self.start_time,
                'success': result.returncode == 0
            }

            # Print results
            if result.returncode == 0:
                print(f"✅ {test_type.title()} tests passed ({self.test_results[test_type]['duration']:.2f}s)")
            else:
                print(f"❌ {test_type.title()} tests failed")
                if self.args.verbose:
                    print("STDOUT:", result.stdout)
                    print("STDERR:", result.stderr)

            return result.returncode == 0

        except subprocess.TimeoutExpired:
            print(f"⏰ {test_type.title()} tests timed out")
            self.test_results[test_type] = {
                'return_code': -1,
                'error': 'timeout',
                'duration': 1800 if not self.args.quick else 300,
                'success': False
            }
            return False

        except Exception as e:
            print(f"💥 Error running {test_type} tests: {e}")
            self.test_results[test_type] = {
                'return_code': -1,
                'error': str(e),
                'duration': 0,
                'success': False
            }
            return False

    def run_compliance_test(self) -> bool:
        """Run MagicBlock compliance test specifically"""
        print("🎮 Running MagicBlock compliance validation...")

        # Run the specific compliance test
        cmd = [
            "python", "-c",
            "from test_latency import TestLatencyRequirements; "
            "t = TestLatencyRequirements(); "
            "t.test_magicblock_strict_compliance()"
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

            if result.returncode == 0:
                print("✅ MagicBlock compliance test passed")
                return True
            else:
                print("❌ MagicBlock compliance test failed")
                if self.args.verbose:
                    print("Error output:", result.stderr)
                return False

        except Exception as e:
            print(f"💥 Error running compliance test: {e}")
            return False

    def benchmark_performance(self) -> Dict[str, Any]:
        """Run performance benchmarking"""
        print("📊 Running performance benchmarks...")

        benchmark_results = {}

        # Quick performance test
        try:
            cmd = [
                "python", "-c",
                "from test_latency import TestLatencyRequirements; "
                "import time; "
                "t = TestLatencyRequirements(); "
                "start = time.time(); "
                "t.test_easy_agent_10ms_target(); "
                "duration = time.time() - start; "
                f"print(f'Benchmark completed in {{duration:.2f}}s')"
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

            if result.returncode == 0:
                # Extract duration from output
                output_lines = result.stdout.strip().split('\n')
                for line in output_lines:
                    if 'Benchmark completed' in line:
                        duration_str = line.split()[-1].replace('s', '')
                        benchmark_results['easy_agent_test_duration'] = float(duration_str)
                        break

                print(f"✅ Benchmark completed: {benchmark_results.get('easy_agent_test_duration', 'N/A')}s")
            else:
                print("❌ Benchmark failed")
                benchmark_results['error'] = result.stderr

        except Exception as e:
            print(f"💥 Benchmark error: {e}")
            benchmark_results['error'] = str(e)

        return benchmark_results

    def generate_summary_report(self):
        """Generate comprehensive test summary report"""
        print("📋 Generating test summary report...")

        # Calculate overall success
        all_passed = all(result.get('success', False) for result in self.test_results.values())
        total_duration = sum(result.get('duration', 0) for result in self.test_results.values())

        # Create summary
        summary = {
            'test_run_summary': {
                'timestamp': datetime.now().isoformat(),
                'total_duration_seconds': total_duration,
                'all_tests_passed': all_passed,
                'environment': self.ci_config['is_ci_environment'] and 'CI' or 'local',
                'configuration': {
                    'easy_target_ms': self.config.easy_agent_target_ms,
                    'medium_target_ms': self.config.medium_agent_target_ms,
                    'hard_target_ms': self.config.hard_agent_target_ms,
                    'test_position_count': self.config.test_position_count,
                }
            },
            'test_results': self.test_results,
            'magicblock_compliance': self.magicblock_config['strict_compliance'],
            'ci_configuration': self.ci_config
        }

        # Save JSON report
        json_report = self.reports_dir / f"test_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(json_report, 'w') as f:
            json.dump(summary, f, indent=2)

        # Generate markdown summary
        md_report = self.reports_dir / f"test_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(md_report, 'w') as f:
            f.write("# Performance Test Summary\n\n")
            f.write(f"**Timestamp:** {summary['test_run_summary']['timestamp']}\n")
            f.write(f"**Duration:** {total_duration:.2f}s\n")
            f.write(f"**Status:** {'✅ PASS' if all_passed else '❌ FAIL'}\n\n")

            f.write("## Test Results\n\n")
            for test_type, result in self.test_results.items():
                status = '✅ PASS' if result.get('success', False) else '❌ FAIL'
                f.write(f"- **{test_type.title()}:** {status} ({result.get('duration', 0):.2f}s)\n")

            if not all_passed:
                f.write("\n## Failed Tests\n\n")
                for test_type, result in self.test_results.items():
                    if not result.get('success', False):
                        f.write(f"### {test_type.title()}\n")
                        f.write(f"- Return code: {result.get('return_code', 'N/A')}\n")
                        if 'error' in result:
                            f.write(f"- Error: {result['error']}\n")
                        f.write("\n")

        print(f"📄 Summary report saved: {json_report}")
        print(f"📝 Markdown summary: {md_report}")

        return summary

    def cleanup(self):
        """Cleanup test environment"""
        if not self.args.keep_files:
            # Remove temporary test files
            temp_files = [
                "test_data",
                ".pytest_cache",
                "__pycache__"
            ]

            for temp_file in temp_files:
                temp_path = Path(temp_file)
                if temp_path.exists():
                    if temp_path.is_dir():
                        shutil.rmtree(temp_path, ignore_errors=True)
                    else:
                        temp_path.unlink(missing_ok=True)

    def run(self) -> bool:
        """Main test runner execution"""
        print("🚀 Starting Performance Test Runner")
        print("=" * 60)

        try:
            # Validate environment
            if not self.validate_environment():
                print("❌ Environment validation failed")
                return False

            # Setup test environment
            self.setup_test_environment()

            # Run tests based on arguments
            success = True

            if self.args.test_type == "all":
                # Run all test types
                test_types = ["latency", "system", "load"] if not self.args.quick else ["latency"]
                for test_type in test_types:
                    if not self.run_test_suite(test_type):
                        success = False
                        if self.args.fail_fast:
                            break
            else:
                # Run specific test type
                success = self.run_test_suite(self.args.test_type)

            # Run compliance test if requested
            if self.args.compliance:
                if not self.run_compliance_test():
                    success = False

            # Run benchmark if requested
            if self.args.benchmark:
                benchmark_results = self.benchmark_performance()
                self.test_results['benchmark'] = benchmark_results

            # Generate summary report
            summary = self.generate_summary_report()

            # Print final status
            print("\n" + "=" * 60)
            if success:
                print("🎉 ALL TESTS PASSED")
            else:
                print("❌ SOME TESTS FAILED")
            print("=" * 60)

            return success

        except KeyboardInterrupt:
            print("\n⚠️  Test run interrupted by user")
            return False

        except Exception as e:
            print(f"\n💥 Unexpected error: {e}")
            if self.args.verbose:
                import traceback
                traceback.print_exc()
            return False

        finally:
            self.cleanup()

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Performance Testing Runner for MagicBlock Compliance",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_performance_tests.py --test-type latency
  python run_performance_tests.py --compliance --strict
  python run_performance_tests.py --quick --benchmark
  python run_performance_tests.py --ci --test-type all
        """
    )

    parser.add_argument(
        '--test-type',
        choices=['all', 'latency', 'load', 'system', 'compliance'],
        default='all',
        help='Type of tests to run (default: all)'
    )

    parser.add_argument(
        '--compliance',
        action='store_true',
        help='Run MagicBlock compliance tests'
    )

    parser.add_argument(
        '--benchmark',
        action='store_true',
        help='Run performance benchmarks'
    )

    parser.add_argument(
        '--quick',
        action='store_true',
        help='Run quick tests only (reduced test cases)'
    )

    parser.add_argument(
        '--strict',
        action='store_true',
        help='Strict mode - fail on any warnings or missing env vars'
    )

    parser.add_argument(
        '--ci',
        action='store_true',
        help='CI mode - optimized for continuous integration'
    )

    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Verbose output'
    )

    parser.add_argument(
        '--fail-fast',
        action='store_true',
        help='Stop on first test failure'
    )

    parser.add_argument(
        '--keep-files',
        action='store_true',
        help='Keep temporary test files after completion'
    )

    args = parser.parse_args()

    # Create and run test runner
    runner = PerformanceTestRunner(args)
    success = runner.run()

    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
