#!/usr/bin/env python3
"""
Simple test runner for AI services
Alternative to pytest for direct execution
"""

import sys
import os
import time
import traceback
from typing import Dict, Any, List, Callable

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

# Import test modules
from tests.conftest import *
from tests.test_basic_agents import *
from tests.test_ai_manager import *
from tests.test_hard_agent import *

class SimpleTestRunner:
    """Simple test runner that mimics pytest functionality"""
    
    def __init__(self):
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': 0,
            'total': 0
        }
        self.test_details = []

    def run_test_method(self, test_instance, method_name: str, fixtures: Dict[str, Any]) -> bool:
        """Run a single test method with fixture injection"""
        try:
            method = getattr(test_instance, method_name)
            
            # Get method signature to inject fixtures
            import inspect
            signature = inspect.signature(method)
            kwargs = {}
            
            for param_name in signature.parameters:
                if param_name in fixtures and param_name != 'self':
                    kwargs[param_name] = fixtures[param_name]
            
            # Run the test
            start_time = time.time()
            method(**kwargs)
            duration = time.time() - start_time
            
            self.test_details.append({
                'name': f"{test_instance.__class__.__name__}::{method_name}",
                'status': 'PASSED',
                'duration': duration * 1000,  # ms
                'error': None
            })
            
            print(f"✅ {test_instance.__class__.__name__}::{method_name} - {duration*1000:.2f}ms")
            self.results['passed'] += 1
            return True
            
        except AssertionError as e:
            self.test_details.append({
                'name': f"{test_instance.__class__.__name__}::{method_name}",
                'status': 'FAILED',
                'duration': 0,
                'error': str(e)
            })
            print(f"❌ {test_instance.__class__.__name__}::{method_name} - FAILED: {e}")
            self.results['failed'] += 1
            return False
            
        except Exception as e:
            self.test_details.append({
                'name': f"{test_instance.__class__.__name__}::{method_name}",
                'status': 'ERROR',
                'duration': 0,
                'error': str(e)
            })
            print(f"💥 {test_instance.__class__.__name__}::{method_name} - ERROR: {e}")
            self.results['errors'] += 1
            return False

    def create_fixtures(self) -> Dict[str, Any]:
        """Create all test fixtures"""
        fixtures = {}
        
        try:
            # Create fixture instances
            fixtures['sample_board_state'] = sample_board_state()
            fixtures['sample_valid_moves'] = sample_valid_moves()
            fixtures['sample_capture_moves'] = sample_capture_moves()
            fixtures['basic_ai_config'] = basic_ai_config()
            fixtures['aggressive_ai_config'] = aggressive_ai_config()
            fixtures['defensive_ai_config'] = defensive_ai_config()
            fixtures['empty_board_state'] = empty_board_state()
            fixtures['endgame_board_state'] = endgame_board_state()
            fixtures['invalid_board_state'] = invalid_board_state()
            fixtures['performance_timer'] = performance_timer()
            fixtures['board_evaluator'] = board_evaluator()
            
            # Create AI instances
            fixtures['random_ai'] = random_ai(fixtures['basic_ai_config'])
            fixtures['minimax_ai'] = minimax_ai(fixtures['basic_ai_config'])
            fixtures['mcts_ai'] = mcts_ai(fixtures['basic_ai_config'])
            fixtures['ai_manager'] = ai_manager()
            
            return fixtures
            
        except Exception as e:
            print(f"⚠️ Error creating fixtures: {e}")
            return {}

    def run_test_class(self, test_class, fixtures: Dict[str, Any]) -> bool:
        """Run all test methods in a test class"""
        test_instance = test_class()
        methods = [method for method in dir(test_instance) if method.startswith('test_')]
        
        print(f"\n🧪 Running {test_class.__name__} ({len(methods)} tests)")
        print("-" * 60)
        
        class_passed = True
        for method_name in methods:
            self.results['total'] += 1
            if not self.run_test_method(test_instance, method_name, fixtures):
                class_passed = False
        
        return class_passed

    def run_all_tests(self):
        """Run all available tests"""
        print("🚀 Starting AI System Test Execution")
        print("=" * 80)
        
        # Create fixtures
        print("📋 Setting up test fixtures...")
        fixtures = self.create_fixtures()
        if not fixtures:
            print("❌ Failed to create fixtures, aborting tests")
            return False
        
        print(f"✅ Created {len(fixtures)} fixtures")
        
        # Define test classes to run
        test_classes = [
            TestAIConfig,
            TestGungiBoardEvaluator,
            TestRandomAI,
            TestMinimaxAI,
            TestMCTSAI,
            TestAIAgentFactory,
            TestPerformanceMetrics
        ]
        
        start_time = time.time()
        
        # Run each test class
        for test_class in test_classes:
            try:
                self.run_test_class(test_class, fixtures)
            except Exception as e:
                print(f"💥 Error running {test_class.__name__}: {e}")
                traceback.print_exc()
        
        total_time = time.time() - start_time
        
        # Print summary
        self.print_summary(total_time)
        
        return self.results['failed'] == 0 and self.results['errors'] == 0

    def print_summary(self, total_time: float):
        """Print test execution summary"""
        print("\n" + "=" * 80)
        print("📊 TEST EXECUTION SUMMARY")
        print("=" * 80)
        
        print(f"⏱️  Total Time: {total_time:.2f}s")
        print(f"📝 Total Tests: {self.results['total']}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"💥 Errors: {self.results['errors']}")
        
        success_rate = (self.results['passed'] / max(self.results['total'], 1)) * 100
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.results['failed'] > 0 or self.results['errors'] > 0:
            print("\n🔍 FAILED/ERROR TESTS:")
            for detail in self.test_details:
                if detail['status'] in ['FAILED', 'ERROR']:
                    print(f"  • {detail['name']}: {detail['error']}")
        
        if success_rate >= 80:
            print("\n🎉 AI SYSTEM TESTS PASSED!")
            print("✅ Core functionality verified and ready for production")
        else:
            print("\n⚠️ AI SYSTEM NEEDS ATTENTION")
            print("❌ Some tests failed - review and fix issues before deployment")

def main():
    """Main execution function"""
    runner = SimpleTestRunner()
    success = runner.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
