#!/usr/bin/env python3
"""
Comprehensive POC AI System Validation Suite
Implements all requirements from poc_ai_system_testing_assignment.md
Following GI.md guidelines for production-ready validation
"""

import time
import sys
import json
import statistics
import threading
import concurrent.futures
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add AI services to path
sys.path.append(str(Path(__file__).parent / "backend/ai-services"))

try:
    from agents.basic_ai_agents import (
        RandomAI, MinimaxAI, MCTSAI, 
        AIConfig, AIPersonality, AIAgentFactory
    )
    from agents.ai_manager import AIManager
    IMPORTS_OK = True
except ImportError as e:
    print(f"❌ Import error: {e}")
    IMPORTS_OK = False

class POCAISystemValidator:
    """
    Comprehensive POC AI system validator implementing all requirements from:
    - poc_ai_system_plan.md
    - poc_ai_system_testing_assignment.md  
    - GI.md compliance guidelines
    """
    
    def __init__(self):
        self.test_results = {}
        self.performance_metrics = {}
        self.compliance_status = {}
        self.errors = []
        
        # Test configurations per POC plan
        self.performance_targets = {
            'easy': {'avg_ms': 10.0, 'max_ms': 25.0},
            'medium': {'avg_ms': 50.0, 'max_ms': 80.0}, 
            'hard': {'avg_ms': 90.0, 'max_ms': 100.0}  # MagicBlock strict
        }
        
        # Create comprehensive test positions
        self.test_positions = self._create_test_positions()

    def _create_test_positions(self) -> List[Dict[str, Any]]:
        """Create diverse test positions for thorough validation"""
        return [
            # Opening position
            {
                'pieces': {
                    'player1': [
                        {'type': 'marshal', 'position': [4, 8]},
                        {'type': 'general', 'position': [3, 8]},
                        {'type': 'captain', 'position': [2, 8]}
                    ] + [{'type': 'pawn', 'position': [i, 6]} for i in range(9)],
                    'player2': [
                        {'type': 'marshal', 'position': [4, 0]},
                        {'type': 'general', 'position': [3, 0]},
                        {'type': 'captain', 'position': [2, 0]}
                    ] + [{'type': 'pawn', 'position': [i, 2]} for i in range(9)]
                },
                'currentPlayer': 1,
                'moveNumber': 1
            },
            # Tactical position
            {
                'pieces': {
                    'player1': [
                        {'type': 'marshal', 'position': [4, 7]},
                        {'type': 'general', 'position': [5, 5]},
                        {'type': 'captain', 'position': [3, 4]}
                    ],
                    'player2': [
                        {'type': 'marshal', 'position': [4, 1]},
                        {'type': 'general', 'position': [3, 3]},
                        {'type': 'pawn', 'position': [4, 3]}
                    ]
                },
                'currentPlayer': 1,
                'moveNumber': 20
            },
            # Endgame position
            {
                'pieces': {
                    'player1': [
                        {'type': 'marshal', 'position': [7, 7]},
                        {'type': 'pawn', 'position': [6, 6]}
                    ],
                    'player2': [
                        {'type': 'marshal', 'position': [1, 1]},
                        {'type': 'general', 'position': [2, 2]}
                    ]
                },
                'currentPlayer': 2,
                'moveNumber': 50
            }
        ]

    def _create_test_moves(self, board_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate test moves with proper capture/non-capture ratio"""
        moves = []
        
        # Non-capture moves (30%)
        for i in range(7):
            moves.append({
                'from': [i, 4],
                'to': [i, 3],
                'piece': {'type': 'pawn', 'player': 1},
                'isCapture': False,
                'moveType': 'normal'
            })
        
        # Capture moves (70% - for Easy AI preference test)
        for i in range(16):
            moves.append({
                'from': [i % 9, 5],
                'to': [i % 9, 4],
                'piece': {'type': 'general', 'player': 1},
                'captured': {'type': 'pawn', 'player': 2},
                'isCapture': True,
                'moveType': 'capture'
            })
        
        return moves

    def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Execute complete POC AI system validation suite"""
        print("🎯 POC AI SYSTEM COMPREHENSIVE VALIDATION")
        print("Following poc_ai_system_testing_assignment.md")
        print("=" * 70)
        
        if not IMPORTS_OK:
            return self._create_failure_report("Import failures prevent testing")
        
        validation_results = {}
        
        # Phase 1: Unit Testing (per testing assignment section 1)
        print("\n📋 Phase 1: Unit Testing Framework")
        validation_results['unit_tests'] = self._run_unit_tests()
        
        # Phase 2: Performance Testing (per testing assignment section 3.1)
        print("\n⚡ Phase 2: Performance Testing (MagicBlock Compliance)")
        validation_results['performance'] = self._run_performance_tests()
        
        # Phase 3: Security Testing (per testing assignment section 4)
        print("\n🔒 Phase 3: Security Testing (Fraud Detection)")
        validation_results['security'] = self._run_security_tests()
        
        # Phase 4: Integration Testing (per testing assignment section 2)
        print("\n🔗 Phase 4: Integration Testing")
        validation_results['integration'] = self._run_integration_tests()
        
        # Phase 5: Stress Testing (per testing assignment section 3.2)
        print("\n💪 Phase 5: Stress Testing")
        validation_results['stress'] = self._run_stress_tests()
        
        # Phase 6: End-to-End Testing (per testing assignment section 6)
        print("\n🎮 Phase 6: End-to-End Testing")
        validation_results['e2e'] = self._run_e2e_tests()
        
        # Generate final compliance report
        final_report = self._generate_final_report(validation_results)
        
        return final_report

    def _run_unit_tests(self) -> Dict[str, Any]:
        """Phase 1: Unit Testing Framework (Section 1 of testing assignment)"""
        results = {'status': 'passed', 'tests': {}}
        
        # 1.1 Base Agent Testing
        print("  🧪 Testing BaseAIAgent functionality...")
        results['tests']['base_agent'] = self._test_base_agent()
        
        # 1.2 Easy Agent Testing  
        print("  🎲 Testing EasyAgent (RandomAI)...")
        results['tests']['easy_agent'] = self._test_easy_agent()
        
        # 1.3 Medium Agent Testing
        print("  🧠 Testing MediumAgent (MinimaxAI)...")
        results['tests']['medium_agent'] = self._test_medium_agent()
        
        # 1.4 Hard Agent Testing
        print("  🤖 Testing HardAgent (MCTSAI)...")
        results['tests']['hard_agent'] = self._test_hard_agent()
        
        # Overall unit test status
        failed_tests = [test for test, result in results['tests'].items() 
                       if result.get('status') == 'failed']
        
        if failed_tests:
            results['status'] = 'failed'
            results['failed_tests'] = failed_tests
        
        return results

    def _test_base_agent(self) -> Dict[str, Any]:
        """Test BaseAIAgent class (Section 1.1)"""
        try:
            config = AIConfig(
                personality=AIPersonality.BALANCED,
                enable_fraud_detection=True
            )
            
            # Test agent creation
            agent = RandomAI(config)  # Use concrete implementation
            
            # Test personality traits
            traits = agent.get_personality_traits()
            assert isinstance(traits, dict)
            assert 'aggression' in traits
            
            # Test fraud detection initialization
            assert agent.get_fraud_score() == 0.0
            
            # Test move recording
            test_move = {'from': [0, 0], 'to': [0, 1]}
            test_board = self.test_positions[0]
            agent.record_decision(test_move, 0.05, test_board)
            
            # Test performance metrics
            metrics = agent.get_performance_metrics()
            assert isinstance(metrics, dict)
            
            return {'status': 'passed', 'details': 'All base agent tests passed'}
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _test_easy_agent(self) -> Dict[str, Any]:
        """Test EasyAgent (Section 1.2)"""
        try:
            config = AIConfig(personality=AIPersonality.BALANCED)
            agent = RandomAI(config)
            
            # Test capture preference (70% requirement)
            capture_results = self._test_capture_preference(agent)
            
            # Test speed requirement (<10ms)
            speed_results = self._test_agent_speed(agent, 'easy')
            
            # Test move legality
            legality_results = self._test_move_legality(agent)
            
            all_passed = all([
                capture_results['status'] == 'passed',
                speed_results['status'] == 'passed', 
                legality_results['status'] == 'passed'
            ])
            
            return {
                'status': 'passed' if all_passed else 'failed',
                'capture_preference': capture_results,
                'speed': speed_results,
                'legality': legality_results
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _test_medium_agent(self) -> Dict[str, Any]:
        """Test MediumAgent (Section 1.3)"""
        try:
            config = AIConfig(personality=AIPersonality.BALANCED, search_depth=2)
            agent = MinimaxAI(config)
            
            # Test minimax functionality
            board_state = self.test_positions[1]
            valid_moves = self._create_test_moves(board_state)
            
            start_time = time.time()
            move = agent.get_move(board_state, valid_moves)
            execution_time = (time.time() - start_time) * 1000
            
            # Test performance (<50ms average)
            speed_ok = execution_time < 50.0
            
            # Test move quality (should not be random)
            moves = []
            for _ in range(5):
                moves.append(agent.get_move(board_state, valid_moves))
            
            # Should have some consistency in move selection
            move_consistency = len(set(str(m) for m in moves if m)) < len(moves)
            
            return {
                'status': 'passed' if speed_ok and move else 'failed',
                'execution_time_ms': execution_time,
                'move_generated': move is not None,
                'speed_compliant': speed_ok,
                'move_consistency': move_consistency
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _test_hard_agent(self) -> Dict[str, Any]:
        """Test HardAgent (Section 1.4)"""
        try:
            config = AIConfig(personality=AIPersonality.BALANCED, skill_level=7)
            agent = MCTSAI(config)
            
            # Test MCTS functionality
            board_state = self.test_positions[2]
            valid_moves = self._create_test_moves(board_state)
            
            start_time = time.time()
            move = agent.get_move(board_state, valid_moves)
            execution_time = (time.time() - start_time) * 1000
            
            # Test performance (<90ms for MagicBlock)
            speed_ok = execution_time < 90.0
            magicblock_ok = execution_time < 100.0
            
            return {
                'status': 'passed' if speed_ok and move else 'failed',
                'execution_time_ms': execution_time,
                'move_generated': move is not None,
                'speed_compliant': speed_ok,
                'magicblock_compliant': magicblock_ok
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _test_capture_preference(self, agent) -> Dict[str, Any]:
        """Test Easy AI 70% capture preference (POC requirement)"""
        try:
            board_state = self.test_positions[1]
            test_moves = self._create_test_moves(board_state)
            
            capture_count = 0
            total_tests = 100
            
            for _ in range(total_tests):
                move = agent.get_move(board_state, test_moves)
                if move and move.get('isCapture', False):
                    capture_count += 1
            
            capture_rate = capture_count / total_tests
            target_rate = 0.7
            tolerance = 0.1
            
            within_tolerance = abs(capture_rate - target_rate) <= tolerance
            
            return {
                'status': 'passed' if within_tolerance else 'failed',
                'capture_rate': capture_rate,
                'target_rate': target_rate,
                'tolerance': tolerance,
                'within_tolerance': within_tolerance
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _test_agent_speed(self, agent, difficulty: str) -> Dict[str, Any]:
        """Test agent speed against target"""
        try:
            target_ms = self.performance_targets[difficulty]['avg_ms']
            
            execution_times = []
            
            for i in range(20):
                board_state = self.test_positions[i % len(self.test_positions)]
                valid_moves = self._create_test_moves(board_state)
                
                start_time = time.time()
                move = agent.get_move(board_state, valid_moves)
                execution_time = (time.time() - start_time) * 1000
                
                execution_times.append(execution_time)
            
            avg_time = statistics.mean(execution_times)
            max_time = max(execution_times)
            
            speed_compliant = avg_time <= target_ms
            
            return {
                'status': 'passed' if speed_compliant else 'failed',
                'avg_time_ms': avg_time,
                'max_time_ms': max_time,
                'target_ms': target_ms,
                'speed_compliant': speed_compliant
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _test_move_legality(self, agent) -> Dict[str, Any]:
        """Test that agent only generates legal moves"""
        try:
            illegal_moves = 0
            total_tests = 50
            
            for i in range(total_tests):
                board_state = self.test_positions[i % len(self.test_positions)]
                valid_moves = self._create_test_moves(board_state)
                
                move = agent.get_move(board_state, valid_moves)
                
                if move and move not in valid_moves:
                    illegal_moves += 1
            
            legality_rate = (total_tests - illegal_moves) / total_tests
            
            return {
                'status': 'passed' if illegal_moves == 0 else 'failed',
                'illegal_moves': illegal_moves,
                'total_tests': total_tests,
                'legality_rate': legality_rate
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _run_performance_tests(self) -> Dict[str, Any]:
        """Phase 2: Performance Testing (Section 3.1)"""
        results = {'status': 'passed', 'performance_data': {}}
        
        print("  ⚡ Testing MagicBlock compliance (<100ms strict requirement)...")
        
        for difficulty in ['easy', 'medium', 'hard']:
            print(f"    Testing {difficulty} AI performance...")
            
            perf_data = self._comprehensive_performance_test(difficulty)
            results['performance_data'][difficulty] = perf_data
            
            if not perf_data.get('magicblock_compliant', False):
                results['status'] = 'failed'
        
        return results

    def _comprehensive_performance_test(self, difficulty: str) -> Dict[str, Any]:
        """Comprehensive performance test for specific difficulty"""
        try:
            config = AIConfig(personality=AIPersonality.BALANCED)
            
            if difficulty == 'easy':
                agent = RandomAI(config)
            elif difficulty == 'medium':
                agent = MinimaxAI(config)
            else:  # hard
                agent = MCTSAI(config)
            
            execution_times = []
            
            # Test 100 moves for statistical validity
            for i in range(100):
                board_state = self.test_positions[i % len(self.test_positions)]
                valid_moves = self._create_test_moves(board_state)
                
                start_time = time.time()
                move = agent.get_move(board_state, valid_moves)
                execution_time = (time.time() - start_time) * 1000
                
                execution_times.append(execution_time)
            
            # Calculate statistics
            avg_time = statistics.mean(execution_times)
            max_time = max(execution_times)
            min_time = min(execution_times)
            p95_time = statistics.quantiles(execution_times, n=20)[18] if len(execution_times) >= 20 else max_time
            p99_time = statistics.quantiles(execution_times, n=100)[98] if len(execution_times) >= 100 else max_time
            
            # Check compliance
            target_avg = self.performance_targets[difficulty]['avg_ms']
            target_max = self.performance_targets[difficulty]['max_ms']
            magicblock_limit = 100.0
            
            avg_compliant = avg_time <= target_avg
            max_compliant = max_time <= target_max
            magicblock_compliant = max_time < magicblock_limit
            
            return {
                'avg_time_ms': avg_time,
                'max_time_ms': max_time,
                'min_time_ms': min_time,
                'p95_time_ms': p95_time,
                'p99_time_ms': p99_time,
                'target_avg_ms': target_avg,
                'target_max_ms': target_max,
                'magicblock_limit_ms': magicblock_limit,
                'avg_compliant': avg_compliant,
                'max_compliant': max_compliant,
                'magicblock_compliant': magicblock_compliant,
                'total_tests': len(execution_times)
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _run_security_tests(self) -> Dict[str, Any]:
        """Phase 3: Security Testing (Section 4)"""
        results = {'status': 'passed', 'security_tests': {}}
        
        print("  🔒 Testing fraud detection mechanisms...")
        results['security_tests']['fraud_detection'] = self._test_fraud_detection()
        
        print("  🛡️ Testing move validation security...")
        results['security_tests']['move_validation'] = self._test_move_validation_security()
        
        # Overall security status
        failed_security = [test for test, result in results['security_tests'].items()
                          if result.get('status') == 'failed']
        
        if failed_security:
            results['status'] = 'failed'
            results['failed_security_tests'] = failed_security
        
        return results

    def _test_fraud_detection(self) -> Dict[str, Any]:
        """Test comprehensive fraud detection (Section 4.1)"""
        try:
            config = AIConfig(
                enable_fraud_detection=True,
                min_thinking_time_ms=10.0
            )
            agent = RandomAI(config)
            
            # Test 1: Normal operation should have low fraud score
            board_state = self.test_positions[0]
            valid_moves = self._create_test_moves(board_state)
            
            move = agent.get_move(board_state, valid_moves)
            normal_fraud_score = agent.get_fraud_score()
            
            # Test 2: Simulate rapid decisions (fraud attempt)
            for _ in range(5):
                agent.record_decision(move, 0.005, board_state)  # 5ms decisions
            
            rapid_fraud_score = agent.get_fraud_score()
            
            # Test 3: Check fraud detection triggered
            fraud_detected = rapid_fraud_score > normal_fraud_score
            
            # Test 4: Test fraud score decay
            time.sleep(0.1)
            agent.record_decision(move, 0.05, board_state)  # Normal decision
            decay_fraud_score = agent.get_fraud_score()
            
            return {
                'status': 'passed' if fraud_detected else 'failed',
                'normal_fraud_score': normal_fraud_score,
                'rapid_fraud_score': rapid_fraud_score,
                'decay_fraud_score': decay_fraud_score,
                'fraud_detected': fraud_detected,
                'fraud_decay_working': decay_fraud_score < rapid_fraud_score
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _test_move_validation_security(self) -> Dict[str, Any]:
        """Test move validation security (Section 4.2)"""
        try:
            config = AIConfig()
            agent = RandomAI(config)
            
            board_state = self.test_positions[0]
            valid_moves = self._create_test_moves(board_state)
            
            # Test that agent only returns valid moves
            illegal_count = 0
            total_tests = 50
            
            for _ in range(total_tests):
                move = agent.get_move(board_state, valid_moves)
                if move and move not in valid_moves:
                    illegal_count += 1
            
            validation_security = illegal_count == 0
            
            return {
                'status': 'passed' if validation_security else 'failed',
                'illegal_moves_generated': illegal_count,
                'total_tests': total_tests,
                'validation_security': validation_security
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _run_integration_tests(self) -> Dict[str, Any]:
        """Phase 4: Integration Testing (Section 2)"""
        results = {'status': 'passed', 'integration_tests': {}}
        
        print("  🔗 Testing AI Manager integration...")
        results['integration_tests']['ai_manager'] = self._test_ai_manager_integration()
        
        print("  🎮 Testing game flow integration...")
        results['integration_tests']['game_flow'] = self._test_game_flow_integration()
        
        # Overall integration status
        failed_integration = [test for test, result in results['integration_tests'].items()
                            if result.get('status') == 'failed']
        
        if failed_integration:
            results['status'] = 'failed'
            results['failed_integration_tests'] = failed_integration
        
        return results

    def _test_ai_manager_integration(self) -> Dict[str, Any]:
        """Test AI Manager integration (Section 2.1)"""
        try:
            with AIManager() as manager:
                # Test agent retrieval
                easy_agent = manager.get_agent("easy", "balanced")
                medium_agent = manager.get_agent("medium", "aggressive")
                
                if not easy_agent or not medium_agent:
                    return {'status': 'failed', 'error': 'Failed to retrieve agents'}
                
                # Test match creation
                match_id = manager.create_match(
                    {"difficulty": "easy", "personality": "balanced"},
                    {"difficulty": "medium", "personality": "aggressive"}
                )
                
                if not match_id:
                    return {'status': 'failed', 'error': 'Failed to create match'}
                
                # Test AI move generation
                board_state = self.test_positions[0]
                valid_moves = self._create_test_moves(board_state)
                
                ai_move = manager.get_ai_move(match_id, board_state, valid_moves)
                
                if not ai_move:
                    return {'status': 'failed', 'error': 'Failed to generate AI move'}
                
                # Test performance report
                performance_report = manager.get_performance_report()
                
                if not performance_report:
                    return {'status': 'failed', 'error': 'Failed to generate performance report'}
                
                # Clean up
                manager.end_match(match_id, {"winner": 1})
                
                return {
                    'status': 'passed',
                    'agents_retrieved': True,
                    'match_created': True,
                    'ai_move_generated': True,
                    'performance_report_generated': True
                }
                
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _test_game_flow_integration(self) -> Dict[str, Any]:
        """Test complete game flow integration (Section 2.2)"""
        try:
            # Simulate a complete game between AI agents
            with AIManager() as manager:
                match_id = manager.create_match(
                    {"difficulty": "easy", "personality": "aggressive"},
                    {"difficulty": "medium", "personality": "defensive"}
                )
                
                moves_generated = 0
                max_moves = 10  # Limited test
                
                for move_num in range(max_moves):
                    board_state = self.test_positions[move_num % len(self.test_positions)]
                    valid_moves = self._create_test_moves(board_state)
                    
                    ai_move = manager.get_ai_move(match_id, board_state, valid_moves)
                    
                    if ai_move:
                        moves_generated += 1
                    
                    # Switch current player
                    match_info = manager.active_games.get(match_id)
                    if match_info:
                        match_info['current_player'] = (match_info['current_player'] % 2) + 1
                
                manager.end_match(match_id, {"winner": 1, "reason": "test_completion"})
                
                game_flow_success = moves_generated == max_moves
                
                return {
                    'status': 'passed' if game_flow_success else 'failed',
                    'moves_generated': moves_generated,
                    'expected_moves': max_moves,
                    'game_flow_success': game_flow_success
                }
                
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _run_stress_tests(self) -> Dict[str, Any]:
        """Phase 5: Stress Testing (Section 3.2)"""
        results = {'status': 'passed', 'stress_tests': {}}
        
        print("  💪 Testing concurrent AI execution...")
        results['stress_tests']['concurrent_execution'] = self._test_concurrent_execution()
        
        print("  🔥 Testing high-load scenarios...")
        results['stress_tests']['high_load'] = self._test_high_load_scenarios()
        
        # Overall stress test status
        failed_stress = [test for test, result in results['stress_tests'].items()
                        if result.get('status') == 'failed']
        
        if failed_stress:
            results['status'] = 'failed'
            results['failed_stress_tests'] = failed_stress
        
        return results

    def _test_concurrent_execution(self) -> Dict[str, Any]:
        """Test concurrent AI execution (Stress test requirement)"""
        try:
            def run_concurrent_agent(agent_id: int) -> Dict[str, Any]:
                config = AIConfig(personality=AIPersonality.BALANCED)
                agent = RandomAI(config)
                
                execution_times = []
                successful_moves = 0
                
                for i in range(10):
                    board_state = self.test_positions[i % len(self.test_positions)]
                    valid_moves = self._create_test_moves(board_state)
                    
                    start_time = time.time()
                    move = agent.get_move(board_state, valid_moves)
                    execution_time = (time.time() - start_time) * 1000
                    
                    execution_times.append(execution_time)
                    
                    if move:
                        successful_moves += 1
                
                return {
                    'agent_id': agent_id,
                    'successful_moves': successful_moves,
                    'avg_time_ms': statistics.mean(execution_times),
                    'max_time_ms': max(execution_times)
                }
            
            # Run 10 agents concurrently
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(run_concurrent_agent, i) for i in range(10)]
                concurrent_results = [future.result(timeout=30) for future in concurrent.futures.as_completed(futures)]
            
            # Analyze results
            all_successful = all(result['successful_moves'] == 10 for result in concurrent_results)
            max_concurrent_time = max(result['max_time_ms'] for result in concurrent_results)
            avg_concurrent_time = statistics.mean([result['avg_time_ms'] for result in concurrent_results])
            
            concurrent_success = all_successful and max_concurrent_time < 100.0
            
            return {
                'status': 'passed' if concurrent_success else 'failed',
                'concurrent_agents': len(concurrent_results),
                'all_successful': all_successful,
                'max_time_ms': max_concurrent_time,
                'avg_time_ms': avg_concurrent_time,
                'concurrent_success': concurrent_success
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _test_high_load_scenarios(self) -> Dict[str, Any]:
        """Test high-load scenarios"""
        try:
            with AIManager() as manager:
                # Create multiple concurrent matches
                match_ids = []
                
                for i in range(5):
                    match_id = manager.create_match(
                        {"difficulty": "easy", "personality": "balanced"},
                        {"difficulty": "medium", "personality": "balanced"}
                    )
                    if match_id:
                        match_ids.append(match_id)
                
                # Generate moves for all matches simultaneously
                successful_operations = 0
                total_operations = len(match_ids) * 5  # 5 moves per match
                
                for move_num in range(5):
                    for match_id in match_ids:
                        try:
                            board_state = self.test_positions[move_num % len(self.test_positions)]
                            valid_moves = self._create_test_moves(board_state)
                            
                            ai_move = manager.get_ai_move(match_id, board_state, valid_moves)
                            
                            if ai_move:
                                successful_operations += 1
                                
                        except Exception:
                            pass  # Count as failed operation
                
                # Cleanup matches
                for match_id in match_ids:
                    try:
                        manager.end_match(match_id, {"winner": 1})
                    except Exception:
                        pass
                
                success_rate = successful_operations / total_operations
                high_load_success = success_rate >= 0.9  # 90% success rate
                
                return {
                    'status': 'passed' if high_load_success else 'failed',
                    'matches_created': len(match_ids),
                    'successful_operations': successful_operations,
                    'total_operations': total_operations,
                    'success_rate': success_rate,
                    'high_load_success': high_load_success
                }
                
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _run_e2e_tests(self) -> Dict[str, Any]:
        """Phase 6: End-to-End Testing (Section 6)"""
        results = {'status': 'passed', 'e2e_tests': {}}
        
        print("  🎮 Testing complete game scenarios...")
        results['e2e_tests']['complete_games'] = self._test_complete_game_scenarios()
        
        print("  🎭 Testing personality differentiation...")
        results['e2e_tests']['personality_diff'] = self._test_personality_differentiation()
        
        # Overall E2E status
        failed_e2e = [test for test, result in results['e2e_tests'].items()
                     if result.get('status') == 'failed']
        
        if failed_e2e:
            results['status'] = 'failed'
            results['failed_e2e_tests'] = failed_e2e
        
        return results

    def _test_complete_game_scenarios(self) -> Dict[str, Any]:
        """Test complete game scenarios (Section 6.1)"""
        try:
            with AIManager() as manager:
                # Test different AI vs AI scenarios
                scenarios = [
                    (("easy", "aggressive"), ("medium", "defensive")),
                    (("medium", "balanced"), ("hard", "balanced")),
                    (("easy", "defensive"), ("hard", "aggressive"))
                ]
                
                completed_games = 0
                
                for agent1_config, agent2_config in scenarios:
                    try:
                        match_id = manager.create_match(
                            {"difficulty": agent1_config[0], "personality": agent1_config[1]},
                            {"difficulty": agent2_config[0], "personality": agent2_config[1]}
                        )
                        
                        if match_id:
                            # Simulate game moves
                            for move_num in range(5):  # Limited moves for testing
                                board_state = self.test_positions[move_num % len(self.test_positions)]
                                valid_moves = self._create_test_moves(board_state)
                                
                                ai_move = manager.get_ai_move(match_id, board_state, valid_moves)
                                
                                if not ai_move:
                                    break
                                
                                # Switch players
                                match_info = manager.active_games.get(match_id)
                                if match_info:
                                    match_info['current_player'] = (match_info['current_player'] % 2) + 1
                            
                            manager.end_match(match_id, {"winner": 1})
                            completed_games += 1
                            
                    except Exception:
                        pass  # Count as failed game
                
                e2e_success = completed_games == len(scenarios)
                
                return {
                    'status': 'passed' if e2e_success else 'failed',
                    'scenarios_tested': len(scenarios),
                    'completed_games': completed_games,
                    'e2e_success': e2e_success
                }
                
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _test_personality_differentiation(self) -> Dict[str, Any]:
        """Test personality differentiation (POC requirement)"""
        try:
            personalities = ['aggressive', 'defensive', 'balanced']
            personality_results = {}
            
            for personality in personalities:
                config = AIConfig(personality=AIPersonality(personality))
                agent = RandomAI(config)
                
                traits = agent.get_personality_traits()
                personality_results[personality] = traits
            
            # Check that personalities are meaningfully different
            aggressive_traits = personality_results['aggressive']
            defensive_traits = personality_results['defensive']
            
            # Aggressive should have higher aggression than defensive
            aggression_diff = aggressive_traits['aggression'] - defensive_traits['aggression']
            
            personalities_distinct = aggression_diff > 0.3  # At least 30% difference
            
            return {
                'status': 'passed' if personalities_distinct else 'failed',
                'personality_results': personality_results,
                'aggression_difference': aggression_diff,
                'personalities_distinct': personalities_distinct
            }
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

    def _generate_final_report(self, validation_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive final validation report"""
        
        # Calculate overall compliance
        phase_statuses = [result.get('status') for result in validation_results.values()]
        passed_phases = sum(1 for status in phase_statuses if status == 'passed')
        total_phases = len(phase_statuses)
        
        overall_success = passed_phases == total_phases
        success_rate = (passed_phases / total_phases) * 100 if total_phases > 0 else 0
        
        # Check specific compliance areas
        compliance_status = {
            'gi_md_compliance': overall_success,
            'magicblock_compliance': self._check_magicblock_compliance(validation_results),
            'performance_compliance': validation_results.get('performance', {}).get('status') == 'passed',
            'fraud_detection_operational': validation_results.get('security', {}).get('status') == 'passed',
            'ai_manager_functional': validation_results.get('integration', {}).get('status') == 'passed',
            'stress_test_passed': validation_results.get('stress', {}).get('status') == 'passed',
            'e2e_tests_passed': validation_results.get('e2e', {}).get('status') == 'passed'
        }
        
        # Generate recommendations
        recommendations = self._generate_recommendations(validation_results, compliance_status)
        
        # Create final report
        final_report = {
            'timestamp': datetime.now().isoformat(),
            'validation_summary': {
                'overall_status': 'passed' if overall_success else 'failed',
                'total_phases': total_phases,
                'passed_phases': passed_phases,
                'failed_phases': total_phases - passed_phases,
                'success_rate': success_rate
            },
            'detailed_results': validation_results,
            'compliance_status': compliance_status,
            'recommendations': recommendations,
            'production_readiness': {
                'ready_for_deployment': overall_success and compliance_status['magicblock_compliance'],
                'critical_issues': self._identify_critical_issues(validation_results),
                'next_steps': self._generate_next_steps(overall_success, compliance_status)
            }
        }
        
        return final_report

    def _check_magicblock_compliance(self, validation_results: Dict[str, Any]) -> bool:
        """Check MagicBlock compliance across all tests"""
        try:
            performance_data = validation_results.get('performance', {}).get('performance_data', {})
            
            for difficulty, data in performance_data.items():
                if not data.get('magicblock_compliant', False):
                    return False
            
            return True
        except Exception:
            return False

    def _generate_recommendations(self, validation_results: Dict[str, Any], compliance_status: Dict[str, bool]) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        if not compliance_status['performance_compliance']:
            recommendations.append("Optimize AI agent performance to meet MagicBlock sub-100ms requirements")
        
        if not compliance_status['fraud_detection_operational']:
            recommendations.append("Enhance fraud detection mechanisms for production security")
        
        if not compliance_status['ai_manager_functional']:
            recommendations.append("Fix AI Manager integration issues for proper agent coordination")
        
        if not compliance_status['stress_test_passed']:
            recommendations.append("Improve system stability under high-load concurrent scenarios")
        
        if not compliance_status['e2e_tests_passed']:
            recommendations.append("Address end-to-end game flow and personality differentiation issues")
        
        if all(compliance_status.values()):
            recommendations.append("All validations passed - POC AI system ready for production deployment")
            recommendations.append("Consider implementing advanced features like neural network training")
            recommendations.append("Set up production monitoring and performance tracking")
        
        return recommendations

    def _identify_critical_issues(self, validation_results: Dict[str, Any]) -> List[str]:
        """Identify critical issues that block production deployment"""
        critical_issues = []
        
        # Check for MagicBlock violations
        performance_data = validation_results.get('performance', {}).get('performance_data', {})
        for difficulty, data in performance_data.items():
            if not data.get('magicblock_compliant', True):
                critical_issues.append(f"{difficulty} AI exceeds 100ms MagicBlock limit")
        
        # Check for security issues
        if validation_results.get('security', {}).get('status') == 'failed':
            critical_issues.append("Fraud detection system not operational")
        
        # Check for basic functionality issues
        if validation_results.get('unit_tests', {}).get('status') == 'failed':
            critical_issues.append("Basic AI functionality tests failing")
        
        return critical_issues

    def _generate_next_steps(self, overall_success: bool, compliance_status: Dict[str, bool]) -> List[str]:
        """Generate next steps based on validation results"""
        if overall_success and compliance_status['magicblock_compliance']:
            return [
                "Deploy POC AI system to production environment",
                "Set up production monitoring and alerting",
                "Begin end-user testing and feedback collection",
                "Implement advanced AI features and neural network training"
            ]
        else:
            return [
                "Address critical issues identified in validation",
                "Re-run comprehensive validation suite",
                "Optimize performance for MagicBlock compliance",
                "Fix failing tests before production deployment"
            ]

    def _create_failure_report(self, reason: str) -> Dict[str, Any]:
        """Create failure report for early termination"""
        return {
            'timestamp': datetime.now().isoformat(),
            'validation_summary': {
                'overall_status': 'failed',
                'failure_reason': reason
            },
            'recommendations': [f"Fix {reason} before running validation"],
            'production_readiness': {
                'ready_for_deployment': False,
                'critical_issues': [reason]
            }
        }


def main():
    """Main validation execution"""
    print("🎯 POC AI SYSTEM COMPREHENSIVE VALIDATION SUITE")
    print("Based on poc_ai_system_testing_assignment.md")
    print("Following GI.md compliance guidelines")
    print("=" * 80)
    
    validator = POCAISystemValidator()
    
    # Run comprehensive validation
    final_report = validator.run_comprehensive_validation()
    
    # Save detailed report
    report_file = Path("poc_ai_system_validation_report.json")
    with open(report_file, 'w') as f:
        json.dump(final_report, f, indent=2, default=str)
    
    # Print summary
    print("\n" + "=" * 80)
    print("🎯 VALIDATION SUMMARY")
    print("=" * 80)
    
    summary = final_report.get('validation_summary', {})
    overall_status = summary.get('overall_status', 'unknown')
    success_rate = summary.get('success_rate', 0)
    
    print(f"Overall Status: {overall_status.upper()}")
    print(f"Success Rate: {success_rate:.1f}%")
    print(f"Phases Passed: {summary.get('passed_phases', 0)}/{summary.get('total_phases', 0)}")
    
    # Compliance status
    compliance = final_report.get('compliance_status', {})
    print(f"\n🎯 COMPLIANCE STATUS:")
    print(f"  MagicBlock Compliance: {'✅' if compliance.get('magicblock_compliance') else '❌'}")
    print(f"  Performance Compliance: {'✅' if compliance.get('performance_compliance') else '❌'}")
    print(f"  Security Operational: {'✅' if compliance.get('fraud_detection_operational') else '❌'}")
    print(f"  AI Manager Functional: {'✅' if compliance.get('ai_manager_functional') else '❌'}")
    
    # Production readiness
    prod_ready = final_report.get('production_readiness', {})
    ready_for_deployment = prod_ready.get('ready_for_deployment', False)
    
    print(f"\n🚀 PRODUCTION READINESS")
    print("=" * 40)
    
    if ready_for_deployment:
        print("✅ SYSTEM READY FOR PRODUCTION DEPLOYMENT!")
        print("🎉 All POC requirements met")
        print("⚡ MagicBlock compliance verified")
        print("🔒 Security features operational")
        print("🎯 Performance targets achieved")
    else:
        print("❌ SYSTEM NOT READY FOR PRODUCTION")
        print("🔧 Critical issues need resolution")
        
        critical_issues = prod_ready.get('critical_issues', [])
        if critical_issues:
            print("\n🚨 CRITICAL ISSUES:")
            for issue in critical_issues:
                print(f"  • {issue}")
    
    # Recommendations
    recommendations = final_report.get('recommendations', [])
    if recommendations:
        print(f"\n📋 RECOMMENDATIONS:")
        for rec in recommendations:
            print(f"  • {rec}")
    
    print(f"\n📊 Detailed validation report: {report_file}")
    
    return ready_for_deployment

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
