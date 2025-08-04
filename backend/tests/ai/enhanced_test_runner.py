#!/usr/bin/env python3
"""
Enhanced AI Manager Test Runner
Comprehensive test execution with detailed reporting following GI.md guidelines

This script provides multiple execution modes:
- Quick tests (fast, essential tests only)
- Full test suite (all tests including performance)
- CI mode (optimized for continuous integration)
- Benchmark mode (performance tracking over time)

Usage:
    python enhanced_test_runner.py [mode]

Modes:
    quick    - Run essential tests only (default)
    full     - Run complete test suite
    ci       - CI-optimized execution
    benchmark- Performance benchmarking
"""

import os
import sys
import time
import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

def run_command(cmd: List[str], timeout: int = 300) -> Dict[str, Any]:
    """Run a command and return results"""
    start_time = time.time()
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=Path(__file__).parent
        )
        duration = time.time() - start_time

        return {
            'success': result.returncode == 0,
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'duration': duration,
            'command': ' '.join(cmd)
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'returncode': -1,
            'stdout': '',
            'stderr': f'Command timed out after {timeout} seconds',
            'duration': timeout,
            'command': ' '.join(cmd)
        }
    except Exception as e:
        return {
            'success': False,
            'returncode': -1,
            'stdout': '',
            'stderr': str(e),
            'duration': time.time() - start_time,
            'command': ' '.join(cmd)
        }

def run_quick_tests() -> Dict[str, Any]:
    """Run quick essential tests"""
    print("🚀 Running Quick Tests (Essential AI Manager functionality)")
    print("=" * 60)

    # Run standalone tests (fastest)
    standalone_result = run_command([
        sys.executable, 'test_ai_manager_simple.py'
    ], timeout=120)

    if not standalone_result['success']:
        print("❌ Standalone tests failed")
        print(standalone_result['stderr'])
        return standalone_result

    # Run pytest fast tests only
    pytest_result = run_command([
        sys.executable, '-m', 'pytest',
        'test_ai_manager_pytest.py',
        '-v', '-m', 'not slow',
        '--tb=short'
    ], timeout=180)

    return {
        'success': standalone_result['success'] and pytest_result['success'],
        'standalone': standalone_result,
        'pytest_fast': pytest_result,
        'total_duration': standalone_result['duration'] + pytest_result['duration']
    }

def run_full_tests() -> Dict[str, Any]:
    """Run complete test suite including performance tests"""
    print("🔥 Running Full Test Suite (All AI Manager tests)")
    print("=" * 60)

    # Run standalone comprehensive tests
    standalone_result = run_command([
        sys.executable, 'test_ai_manager_simple.py'
    ], timeout=300)

    # Run all pytest tests
    pytest_result = run_command([
        sys.executable, '-m', 'pytest',
        'test_ai_manager_pytest.py',
        '-v', '--tb=short'
    ], timeout=600)

    return {
        'success': standalone_result['success'] and pytest_result['success'],
        'standalone': standalone_result,
        'pytest_full': pytest_result,
        'total_duration': standalone_result['duration'] + pytest_result['duration']
    }

def run_benchmark_tests() -> Dict[str, Any]:
    """Run performance benchmarking tests"""
    print("📊 Running Benchmark Tests (Performance monitoring)")
    print("=" * 60)

    # Run the critical concurrent games test for benchmarking
    result = run_command([
        sys.executable, '-m', 'pytest',
        'test_ai_manager_pytest.py::TestAIManager::test_100_concurrent_ai_games',
        '-v', '-s'
    ], timeout=300)

    return {
        'success': result['success'],
        'benchmark_result': result,
        'total_duration': result['duration']
    }

def generate_report(results: Dict[str, Any], mode: str) -> None:
    """Generate test execution report"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"ai_manager_test_report_{mode}_{timestamp}.json"

    report = {
        'timestamp': datetime.now().isoformat(),
        'mode': mode,
        'results': results,
        'environment': {
            'python_version': sys.version,
            'platform': sys.platform,
            'cwd': str(Path.cwd())
        },
        'summary': {
            'success': results.get('success', False),
            'total_duration': results.get('total_duration', 0),
            'mode': mode
        }
    }

    # Write detailed report
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)

    # Print summary
    print("\n" + "=" * 60)
    print("📋 TEST EXECUTION SUMMARY")
    print("=" * 60)
    print(f"Mode: {mode.upper()}")
    print(f"Success: {'✅ PASSED' if results['success'] else '❌ FAILED'}")
    print(f"Duration: {results.get('total_duration', 0):.2f} seconds")
    print(f"Report: {report_file}")
    print("=" * 60)

def main():
    """Main test runner entry point"""
    mode = sys.argv[1] if len(sys.argv) > 1 else 'quick'

    print("🧪 Enhanced AI Manager Test Runner")
    print(f"Following GI.md guidelines for comprehensive testing")
    print(f"Mode: {mode.upper()}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    # Execute tests based on mode
    if mode == 'quick':
        results = run_quick_tests()
    elif mode == 'full':
        results = run_full_tests()
    elif mode == 'benchmark':
        results = run_benchmark_tests()
    else:
        print(f"❌ Unknown mode: {mode}")
        print("Available modes: quick, full, benchmark")
        sys.exit(1)

    # Generate report
    generate_report(results, mode)

    # Exit with appropriate code
    sys.exit(0 if results['success'] else 1)

if __name__ == "__main__":
    main()
