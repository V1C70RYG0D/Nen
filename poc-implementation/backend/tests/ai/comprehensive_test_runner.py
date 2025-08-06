#!/usr/bin/env python3
"""
Comprehensive AI System Test Runner for Nen Platform POC
Following GI.md guidelines and POC AI System Testing Assignment

Tests all AI agents according to specifications:
- Easy AI (RandomAI): <10ms average, 70% capture preference
- Medium AI (MinimaxAI): <50ms average, minimax with alpha-beta
- Hard AI (MCTSAI): <90ms average, monte carlo tree search
- Fraud detection validation
- Performance monitoring for MagicBlock compliance
- Personality trait validation
- Production readiness testing
"""

import time
import sys
import statistics
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
import traceback
import concurrent.futures
from datetime import datetime

# Add AI services to path
sys.path.append(str(Path(__file__).parent.parent.parent / "ai-services"))

try:
    from agents.basic_ai_agents import (
        RandomAI, MinimaxAI, MCTSAI, 
        AIConfig, AIPersonality, AIAgentFactory,
        GungiBoardEvaluator
    )
    IMPORTS_OK = True
except ImportError as e:
    print(f"❌ Import error: {e}")
    IMPORTS_OK = False

class ComprehensiveAITester:
    """Comprehensive test runner for AI system validation"""
    
    def __init__(self):
        self.test_results = {}
        self.performance_data = {}
        self.errors = []
        
        # Test configurations matching POC plan requirements
        self.test_configs = {
            'easy': {
                'agent_class': RandomAI,
                'target_time_ms': 10.0,
                'max_time_ms': 25.0,
                'test_iterations': 100
            },
            'medium': {
                'agent_class': MinimaxAI,
                'target_time_ms': 50.0,
                'max_time_ms': 80.0,
                'test_iterations': 50
            },
            'hard': {
                'agent_class': MCTSAI,
                'target_time_ms': 90.0,
                'max_time_ms': 100.0,  # MagicBlock strict requirement
                'test_iterations': 30
            }
        }
        
        # Test board states
        self.test_board_states = self._create_test_positions()

    def _create_test_positions(self) -> List[Dict[str, Any]]:
        """Create diverse test positions for comprehensive testing"""
        return [
            # Basic starting position
            {
                'pieces': {
                    'player1': [
                        {'type': 'marshal', 'position': [4, 8]},
                        {'type': 'general', 'position': [3, 8]}
                    ] + [{'type': 'pawn', 'position': [i, 6]} for i in range(9)],
                    'player2': [
                        {'type': 'marshal', 'position': [4, 0]},
                        {'type': 'general', 'position': [3, 0]}
                    ] + [{'type': 'pawn', 'position': [i, 2]} for i in range(9)]
                },
                'currentPlayer': 1,
                'gamePhase': 'opening',
                'moveCount': 1
            },
            # Midgame position
            {
                'pieces': {
                    'player1': [
                        {'type': 'marshal', 'position': [4, 7]},
                        {'type': 'general', 'position': [5, 6]},
                        {'type': 'captain', 'position': [3, 5]},
                        {'type': 'pawn', 'position': [2, 5]}
                    ],
                    'player2': [
                        {'type': 'marshal', 'position': [4, 1]},
                        {'type': 'general', 'position': [3, 2]},
                        {'type': 'captain', 'position': [5, 3]},
                        {'type': 'pawn', 'position': [6, 3]}
                    ]
                },
                'currentPlayer': 1,
                'gamePhase': 'midgame',
                'moveCount': 25
            },
            # Endgame position
            {
                'pieces': {
                    'player1': [
                        {'type': 'marshal', 'position': [4, 8]},
                        {'type': 'general', 'position': [3, 7]}
                    ],
                    'player2': [
                        {'type': 'marshal', 'position': [4, 0]},
                        {'type': 'pawn', 'position': [5, 1]}
                    ]
                },
                'currentPlayer': 1,
                'gamePhase': 'endgame',
                'moveCount': 65
            }
        ]

    def create_test_moves(self, board_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate test moves for the given board state"""
        # Generate diverse move types for testing
        moves = []
        
        # Regular moves
        for i in range(5):
            moves.append({
                'from': [i, 3],
                'to': [i, 4],
                'piece': {'type': 'pawn', 'player': 1},
                'isCapture': False,
                'moveType': 'normal'
            })
        
        # Capture moves
        for i in range(3):
            moves.append({
                'from': [i + 2, 4],
                'to': [i + 2, 3],
                'piece': {'type': 'general', 'player': 1},
                'captured': {'type': 'pawn', 'player': 2},
                'isCapture': True,
                'moveType': 'capture'
            })
        
        # Special moves
        moves.append({
            'from': [4, 7],
            'to': [4, 5],
            'piece': {'type': 'marshal', 'player': 1},
            'isCapture': False,
            'moveType': 'special'
        })
        
        return moves

    def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive test suite for all AI agents"""
        print("🚀 Starting Comprehensive AI System Tests")
        print("=" * 60)
        
        if not IMPORTS_OK:
            print("❌ Cannot run tests due to import failures")
            return {'status': 'failed', 'reason': 'import_errors'}
        
        test_results = {}
        
        # Phase 1: Basic functionality tests
        print("\n📋 Phase 1: Basic Functionality Tests")
        test_results['basic_functionality'] = self._test_basic_functionality()
        
        # Phase 2: Performance tests
        print("\n⚡ Phase 2: Performance Tests")
        test_results['performance'] = self._test_performance()
        
        # Phase 3: Personality tests
        print("\n🎭 Phase 3: Personality Tests")
        test_results['personality'] = self._test_personalities()
        
        # Phase 4: Fraud detection tests
        print("\n🔒 Phase 4: Fraud Detection Tests")
        test_results['fraud_detection'] = self._test_fraud_detection()
        
        # Phase 5: Stress tests
        print("\n💪 Phase 5: Stress Tests")
        test_results['stress'] = self._test_stress_scenarios()
        
        # Phase 6: MagicBlock compliance
        print("\n⚡ Phase 6: MagicBlock Compliance Tests")
        test_results['magicblock'] = self._test_magicblock_compliance()
        
        # Generate final report
        final_report = self._generate_final_report(test_results)
        
        print("\n" + "=" * 60)
        print("🎯 Test Summary:")
        print(f"Total phases: {len(test_results)}")
        print(f"Passed phases: {sum(1 for result in test_results.values() if result.get('status') == 'passed')}")
        print(f"Failed phases: {sum(1 for result in test_results.values() if result.get('status') == 'failed')}")
        
        return final_report

    def _test_basic_functionality(self) -> Dict[str, Any]:
        """Test basic functionality of all AI agents"""
        results = {'status': 'passed', 'tests': {}}
        
        for difficulty in ['easy', 'medium', 'hard']:
            print(f"  Testing {difficulty} AI basic functionality...")
            
            try:
                # Create agent
                config = AIConfig(personality=AIPersonality.BALANCED)
                agent_class = self.test_configs[difficulty]['agent_class']
                agent = agent_class(config)
                
                # Test move generation
                board_state = self.test_board_states[0]
                valid_moves = self.create_test_moves(board_state)
                
                move = agent.get_move(board_state, valid_moves)
                
                # Validate move
                if move is None:
                    results['tests'][difficulty] = {'status': 'failed', 'reason': 'no_move_returned'}
                    results['status'] = 'failed'
                elif move not in valid_moves:
                    results['tests'][difficulty] = {'status': 'failed', 'reason': 'invalid_move'}
                    results['status'] = 'failed'
                else:
                    results['tests'][difficulty] = {'status': 'passed', 'move': str(move)}
                    print(f"    ✅ {difficulty} AI: Move generated successfully")
                
            except Exception as e:
                print(f"    ❌ {difficulty} AI: Error - {e}")
                results['tests'][difficulty] = {'status': 'failed', 'error': str(e)}
                results['status'] = 'failed'
        
        return results

    def _test_performance(self) -> Dict[str, Any]:
        """Test performance requirements for MagicBlock compliance"""
        results = {'status': 'passed', 'performance_data': {}}
        
        for difficulty in ['easy', 'medium', 'hard']:
            print(f"  Testing {difficulty} AI performance...")
            
            config = self.test_configs[difficulty]
            target_time = config['target_time_ms']
            max_time = config['max_time_ms']
            iterations = config['test_iterations']
            
            try:
                # Create agent
                agent_config = AIConfig(personality=AIPersonality.BALANCED)
                agent = config['agent_class'](agent_config)
                
                execution_times = []
                
                # Run performance tests
                for i in range(iterations):
                    board_state = self.test_board_states[i % len(self.test_board_states)]
                    valid_moves = self.create_test_moves(board_state)
                    
                    start_time = time.time()
                    move = agent.get_move(board_state, valid_moves)
                    execution_time = (time.time() - start_time) * 1000  # Convert to ms
                    
                    execution_times.append(execution_time)
                
                # Analyze performance
                avg_time = statistics.mean(execution_times)
                max_exec_time = max(execution_times)
                p95_time = statistics.quantiles(execution_times, n=20)[18] if len(execution_times) >= 20 else max_exec_time
                
                performance_data = {
                    'avg_time_ms': avg_time,
                    'max_time_ms': max_exec_time,
                    'p95_time_ms': p95_time,
                    'total_tests': iterations,
                    'target_time_ms': target_time,
                    'max_allowed_ms': max_time
                }
                
                results['performance_data'][difficulty] = performance_data
                
                # Validate performance requirements
                if avg_time <= target_time:
                    print(f"    ✅ {difficulty} AI: Avg time {avg_time:.2f}ms ≤ {target_time}ms target")
                else:
                    print(f"    ⚠️ {difficulty} AI: Avg time {avg_time:.2f}ms > {target_time}ms target")
                
                if max_exec_time <= max_time:
                    print(f"    ✅ {difficulty} AI: Max time {max_exec_time:.2f}ms ≤ {max_time}ms limit")
                else:
                    print(f"    ❌ {difficulty} AI: Max time {max_exec_time:.2f}ms > {max_time}ms limit")
                    results['status'] = 'failed'
                
            except Exception as e:
                print(f"    ❌ {difficulty} AI: Performance test failed - {e}")
                results['status'] = 'failed'
        
        return results

    def _test_personalities(self) -> Dict[str, Any]:
        """Test personality trait differentiation"""
        results = {'status': 'passed', 'personality_tests': {}}
        
        personalities = ['aggressive', 'defensive', 'balanced']
        
        for personality in personalities:
            print(f"  Testing {personality} personality...")
            
            try:
                # Create agents with different personalities
                config = AIConfig(personality=AIPersonality(personality))
                
                # Test with RandomAI for simplicity
                agent = RandomAI(config)
                
                # Test personality traits
                traits = agent.get_personality_traits()
                
                # Validate personality-specific traits
                if personality == 'aggressive':
                    if traits['aggression'] > 0.6:
                        print(f"    ✅ Aggressive personality: High aggression ({traits['aggression']:.2f})")
                        results['personality_tests'][personality] = {'status': 'passed', 'traits': traits}
                    else:
                        print(f"    ❌ Aggressive personality: Low aggression ({traits['aggression']:.2f})")
                        results['status'] = 'failed'
                
                elif personality == 'defensive':
                    if traits['aggression'] < 0.4:
                        print(f"    ✅ Defensive personality: Low aggression ({traits['aggression']:.2f})")
                        results['personality_tests'][personality] = {'status': 'passed', 'traits': traits}
                    else:
                        print(f"    ❌ Defensive personality: High aggression ({traits['aggression']:.2f})")
                        results['status'] = 'failed'
                
                else:  # balanced
                    if 0.4 <= traits['aggression'] <= 0.6:
                        print(f"    ✅ Balanced personality: Moderate aggression ({traits['aggression']:.2f})")
                        results['personality_tests'][personality] = {'status': 'passed', 'traits': traits}
                    else:
                        print(f"    ❌ Balanced personality: Unbalanced aggression ({traits['aggression']:.2f})")
                        results['status'] = 'failed'
                
            except Exception as e:
                print(f"    ❌ {personality} personality test failed: {e}")
                results['status'] = 'failed'
        
        return results

    def _test_fraud_detection(self) -> Dict[str, Any]:
        """Test fraud detection capabilities"""
        results = {'status': 'passed', 'fraud_tests': {}}
        
        print("  Testing fraud detection mechanisms...")
        
        try:
            # Create agent with fraud detection enabled
            config = AIConfig(enable_fraud_detection=True, min_thinking_time_ms=10.0)
            agent = RandomAI(config)
            
            # Test normal operation
            board_state = self.test_board_states[0]
            valid_moves = self.create_test_moves(board_state)
            
            # Normal move (should not trigger fraud detection)
            move = agent.get_move(board_state, valid_moves)
            initial_fraud_score = agent.get_fraud_score()
            
            if initial_fraud_score < 0.1:
                print(f"    ✅ Normal operation: Low fraud score ({initial_fraud_score:.3f})")
                results['fraud_tests']['normal_operation'] = {'status': 'passed', 'fraud_score': initial_fraud_score}
            else:
                print(f"    ❌ Normal operation: High fraud score ({initial_fraud_score:.3f})")
                results['status'] = 'failed'
            
            # Test suspiciously fast moves (simulation)
            # We'll manually trigger fraud detection by setting fast decision times
            for _ in range(3):
                agent.record_decision(move, 0.005, board_state)  # 5ms - suspicious
            
            fraud_score_after_fast = agent.get_fraud_score()
            
            if fraud_score_after_fast > initial_fraud_score:
                print(f"    ✅ Fast decisions detected: Fraud score increased to {fraud_score_after_fast:.3f}")
                results['fraud_tests']['fast_decisions'] = {'status': 'passed', 'fraud_score': fraud_score_after_fast}
            else:
                print(f"    ❌ Fast decisions not detected: Fraud score {fraud_score_after_fast:.3f}")
                results['status'] = 'failed'
            
        except Exception as e:
            print(f"    ❌ Fraud detection test failed: {e}")
            results['status'] = 'failed'
        
        return results

    def _test_stress_scenarios(self) -> Dict[str, Any]:
        """Test AI agents under stress conditions"""
        results = {'status': 'passed', 'stress_tests': {}}
        
        print("  Testing stress scenarios...")
        
        # Test concurrent execution
        print("    Testing concurrent agent execution...")
        
        try:
            def run_agent_concurrently(agent_id):
                config = AIConfig(personality=AIPersonality.BALANCED)
                agent = RandomAI(config)
                
                board_state = self.test_board_states[0]
                valid_moves = self.create_test_moves(board_state)
                
                moves = []
                times = []
                
                for _ in range(10):
                    start_time = time.time()
                    move = agent.get_move(board_state, valid_moves)
                    execution_time = (time.time() - start_time) * 1000
                    
                    moves.append(move)
                    times.append(execution_time)
                
                return {
                    'agent_id': agent_id,
                    'moves': len([m for m in moves if m is not None]),
                    'avg_time': statistics.mean(times),
                    'max_time': max(times)
                }
            
            # Run multiple agents concurrently
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(run_agent_concurrently, i) for i in range(5)]
                concurrent_results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            # Validate concurrent execution
            all_successful = all(result['moves'] == 10 for result in concurrent_results)
            max_concurrent_time = max(result['max_time'] for result in concurrent_results)
            
            if all_successful and max_concurrent_time < 100.0:
                print(f"    ✅ Concurrent execution: All agents successful, max time {max_concurrent_time:.2f}ms")
                results['stress_tests']['concurrent'] = {'status': 'passed', 'results': concurrent_results}
            else:
                print(f"    ❌ Concurrent execution failed: Success={all_successful}, Max time={max_concurrent_time:.2f}ms")
                results['status'] = 'failed'
            
        except Exception as e:
            print(f"    ❌ Stress test failed: {e}")
            results['status'] = 'failed'
        
        return results

    def _test_magicblock_compliance(self) -> Dict[str, Any]:
        """Test strict MagicBlock compliance requirements"""
        results = {'status': 'passed', 'magicblock_tests': {}}
        
        print("  Testing MagicBlock compliance (sub-100ms requirement)...")
        
        for difficulty in ['easy', 'medium', 'hard']:
            try:
                config = AIConfig(personality=AIPersonality.BALANCED)
                agent_class = self.test_configs[difficulty]['agent_class']
                agent = agent_class(config)
                
                execution_times = []
                
                # Test 50 moves for statistical validity
                for i in range(50):
                    board_state = self.test_board_states[i % len(self.test_board_states)]
                    valid_moves = self.create_test_moves(board_state)
                    
                    start_time = time.time()
                    move = agent.get_move(board_state, valid_moves)
                    execution_time = (time.time() - start_time) * 1000
                    
                    execution_times.append(execution_time)
                
                max_time = max(execution_times)
                avg_time = statistics.mean(execution_times)
                p99_time = statistics.quantiles(execution_times, n=100)[98] if len(execution_times) >= 100 else max_time
                
                # MagicBlock strict requirements
                magicblock_target = 100.0  # 100ms absolute maximum
                
                compliance_data = {
                    'max_time_ms': max_time,
                    'avg_time_ms': avg_time,
                    'p99_time_ms': p99_time,
                    'magicblock_target_ms': magicblock_target,
                    'compliant': max_time < magicblock_target
                }
                
                if max_time < magicblock_target:
                    print(f"    ✅ {difficulty} AI: MagicBlock compliant (max: {max_time:.2f}ms)")
                    results['magicblock_tests'][difficulty] = {'status': 'passed', **compliance_data}
                else:
                    print(f"    ❌ {difficulty} AI: MagicBlock non-compliant (max: {max_time:.2f}ms)")
                    results['magicblock_tests'][difficulty] = {'status': 'failed', **compliance_data}
                    results['status'] = 'failed'
                
            except Exception as e:
                print(f"    ❌ {difficulty} AI MagicBlock test failed: {e}")
                results['status'] = 'failed'
        
        return results

    def _test_capture_preference(self) -> Dict[str, Any]:
        """Test Easy AI's 70% capture preference requirement"""
        print("  Testing Easy AI capture preference (70% requirement)...")
        
        results = {'status': 'passed'}
        
        try:
            config = AIConfig(personality=AIPersonality.BALANCED)
            agent = RandomAI(config)
            
            # Create board state with both capture and non-capture moves
            board_state = self.test_board_states[1]  # Midgame position
            
            capture_moves = []
            non_capture_moves = []
            
            # Create mixed move set
            for i in range(5):
                capture_moves.append({
                    'from': [i, 4],
                    'to': [i, 3],
                    'piece': {'type': 'pawn', 'player': 1},
                    'captured': {'type': 'pawn', 'player': 2},
                    'isCapture': True
                })
                
                non_capture_moves.append({
                    'from': [i, 5],
                    'to': [i, 4],
                    'piece': {'type': 'pawn', 'player': 1},
                    'isCapture': False
                })
            
            all_moves = capture_moves + non_capture_moves
            
            # Test capture preference over many iterations
            capture_count = 0
            total_tests = 100
            
            for _ in range(total_tests):
                move = agent.get_move(board_state, all_moves)
                if move and move.get('isCapture', False):
                    capture_count += 1
            
            capture_rate = capture_count / total_tests
            target_rate = 0.7  # 70% preference
            tolerance = 0.1    # ±10% tolerance
            
            if abs(capture_rate - target_rate) <= tolerance:
                print(f"    ✅ Capture preference: {capture_rate:.1%} (target: {target_rate:.1%} ±{tolerance:.1%})")
                results['capture_preference'] = {
                    'status': 'passed',
                    'capture_rate': capture_rate,
                    'target_rate': target_rate,
                    'within_tolerance': True
                }
            else:
                print(f"    ❌ Capture preference: {capture_rate:.1%} (target: {target_rate:.1%} ±{tolerance:.1%})")
                results['capture_preference'] = {
                    'status': 'failed',
                    'capture_rate': capture_rate,
                    'target_rate': target_rate,
                    'within_tolerance': False
                }
                results['status'] = 'failed'
            
        except Exception as e:
            print(f"    ❌ Capture preference test failed: {e}")
            results['status'] = 'failed'
            
        return results

    def _generate_final_report(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive final test report"""
        total_tests = len(test_results)
        passed_tests = sum(1 for result in test_results.values() if result.get('status') == 'passed')
        
        # Calculate overall compliance
        overall_status = 'passed' if passed_tests == total_tests else 'failed'
        
        # Generate detailed report
        report = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': overall_status,
            'summary': {
                'total_test_phases': total_tests,
                'passed_phases': passed_tests,
                'failed_phases': total_tests - passed_tests,
                'success_rate': (passed_tests / total_tests) * 100 if total_tests > 0 else 0
            },
            'detailed_results': test_results,
            'recommendations': self._generate_recommendations(test_results),
            'compliance_status': {
                'gi_md_compliance': overall_status == 'passed',
                'magicblock_compliance': test_results.get('magicblock', {}).get('status') == 'passed',
                'performance_compliance': test_results.get('performance', {}).get('status') == 'passed',
                'fraud_detection_operational': test_results.get('fraud_detection', {}).get('status') == 'passed'
            }
        }
        
        return report

    def _generate_recommendations(self, test_results: Dict[str, Any]) -> List[str]:
        """Generate improvement recommendations based on test results"""
        recommendations = []
        
        # Performance recommendations
        if test_results.get('performance', {}).get('status') == 'failed':
            recommendations.append("Optimize AI agent performance to meet MagicBlock timing requirements")
        
        # Fraud detection recommendations
        if test_results.get('fraud_detection', {}).get('status') == 'failed':
            recommendations.append("Enhance fraud detection mechanisms for better security")
        
        # Stress test recommendations
        if test_results.get('stress', {}).get('status') == 'failed':
            recommendations.append("Improve concurrent execution stability and resource management")
        
        if not recommendations:
            recommendations.append("All tests passed - system ready for production deployment")
        
        return recommendations

def main():
    """Main test execution function"""
    print("🎯 Nen Platform POC AI System Comprehensive Test Suite")
    print("Following GI.md guidelines and POC AI System Testing Assignment")
    print("=" * 80)
    
    tester = ComprehensiveAITester()
    
    # Run capture preference test first (specific requirement)
    print("\n🎲 Special Test: Easy AI Capture Preference")
    capture_results = tester._test_capture_preference()
    
    # Run full test suite
    final_report = tester.run_all_tests()
    
    # Add capture preference to final report
    final_report['detailed_results']['capture_preference'] = capture_results
    
    # Save results to file
    results_file = Path(__file__).parent / "comprehensive_test_results.json"
    with open(results_file, 'w') as f:
        json.dump(final_report, f, indent=2, default=str)
    
    print(f"\n📊 Detailed results saved to: {results_file}")
    
    # Print final status
    if final_report['overall_status'] == 'passed':
        print("\n🎉 SUCCESS: All AI system tests passed!")
        print("✅ System ready for production deployment")
    else:
        print("\n⚠️  WARNING: Some tests failed")
        print("❌ System requires fixes before production deployment")
        
        if final_report['recommendations']:
            print("\n📋 Recommendations:")
            for rec in final_report['recommendations']:
                print(f"  • {rec}")
    
    return final_report['overall_status'] == 'passed'

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
