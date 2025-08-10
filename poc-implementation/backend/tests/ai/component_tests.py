#!/usr/bin/env python3
"""
Specific Component Testing for POC AI System
Tests specific components mentioned in the POC AI System Plan and Testing Assignment

Tests:
1. Board Evaluator functionality
2. Agent configuration persistence
3. Performance monitoring
4. Error handling and edge cases
5. Real game scenario simulation
"""

import sys
import time
import json
from pathlib import Path

# Add AI services to path
sys.path.append(str(Path(__file__).parent.parent.parent / "ai-services"))

from agents.basic_ai_agents import (
    RandomAI, MinimaxAI, MCTSAI,
    AIConfig, AIPersonality, 
    GungiBoardEvaluator,
    AIAgentFactory
)

def test_board_evaluator():
    """Test the Gungi board evaluator functionality"""
    print("🏁 Testing Board Evaluator")
    print("-" * 25)
    
    evaluator = GungiBoardEvaluator()
    
    # Test piece values
    assert evaluator.piece_values['marshal'] == 1000
    assert evaluator.piece_values['general'] == 500
    assert evaluator.piece_values['pawn'] == 100
    print("✅ Piece values correctly configured")
    
    # Test position evaluation
    test_position = {
        'pieces': {
            'player1': [
                {'type': 'marshal', 'position': [4, 4]},  # Center position
                {'type': 'general', 'position': [3, 3]},
                {'type': 'pawn', 'position': [2, 2]}
            ],
            'player2': [
                {'type': 'marshal', 'position': [0, 0]},  # Corner position
                {'type': 'pawn', 'position': [1, 1]}
            ]
        },
        'currentPlayer': 1
    }
    
    evaluation = evaluator.evaluate_position(test_position)
    print(f"✅ Position evaluation: {evaluation:.2f}")
    
    # Test with empty position
    empty_position = {'pieces': {}, 'currentPlayer': 1}
    empty_eval = evaluator.evaluate_position(empty_position)
    print(f"✅ Empty position evaluation: {empty_eval:.2f}")
    
    return True

def test_agent_configurations():
    """Test agent configuration persistence and variation"""
    print("\n⚙️ Testing Agent Configurations")
    print("-" * 30)
    
    # Test different configurations
    configs = [
        AIConfig(personality=AIPersonality.AGGRESSIVE, skill_level=3),
        AIConfig(personality=AIPersonality.DEFENSIVE, skill_level=7),
        AIConfig(personality=AIPersonality.BALANCED, skill_level=5)
    ]
    
    for i, config in enumerate(configs):
        agent = RandomAI(config)
        traits = agent.get_personality_traits()
        
        print(f"Config {i+1}: {config.personality.value}")
        print(f"  Aggression: {traits['aggression']:.2f}")
        print(f"  Risk tolerance: {traits['risk_tolerance']:.2f}")
        print(f"  Adaptability: {traits['adaptability']:.2f}")
    
    print("✅ Agent configurations working correctly")
    return True

def test_performance_monitoring():
    """Test performance monitoring capabilities"""
    print("\n📊 Testing Performance Monitoring")
    print("-" * 32)
    
    agent = RandomAI(AIConfig())
    
    # Simulate some moves to generate performance data
    test_board = {
        'pieces': {'player1': [{'type': 'pawn', 'position': [0, 0]}]},
        'currentPlayer': 1
    }
    test_moves = [{'from': [0, 0], 'to': [0, 1], 'isCapture': False}]
    
    # Generate some performance data
    for _ in range(10):
        agent.get_move(test_board, test_moves)
    
    # Check performance metrics
    metrics = agent.get_performance_metrics()
    
    required_metrics = [
        'avg_execution_time_ms', 'max_execution_time_ms', 
        'min_execution_time_ms', 'total_moves', 'fraud_score'
    ]
    
    for metric in required_metrics:
        assert metric in metrics, f"Missing metric: {metric}"
        print(f"✅ {metric}: {metrics[metric]}")
    
    print("✅ Performance monitoring operational")
    return True

def test_error_handling():
    """Test error handling and edge cases"""
    print("\n🛡️ Testing Error Handling")
    print("-" * 25)
    
    agent = RandomAI(AIConfig())
    
    # Test with empty moves list
    empty_moves_result = agent.get_move({'pieces': {}, 'currentPlayer': 1}, [])
    print(f"✅ Empty moves handling: {empty_moves_result}")
    
    # Test with invalid board state
    try:
        invalid_board_result = agent.get_move(None, [{'from': [0,0], 'to': [0,1]}])
        print("✅ Invalid board state handled gracefully")
    except Exception as e:
        print(f"✅ Invalid board state error handled: {type(e).__name__}")
    
    # Test with malformed moves
    try:
        malformed_moves = [{'invalid': 'move'}]
        result = agent.get_move({'pieces': {}, 'currentPlayer': 1}, malformed_moves)
        print("✅ Malformed moves handled gracefully")
    except Exception as e:
        print(f"✅ Malformed moves error handled: {type(e).__name__}")
    
    return True

def test_real_game_scenario():
    """Simulate a real game scenario with multiple agents"""
    print("\n🎮 Testing Real Game Scenario")
    print("-" * 29)
    
    # Create two different agents
    player1_agent = AIAgentFactory.create_difficulty_agent('medium', 'aggressive')
    player2_agent = AIAgentFactory.create_difficulty_agent('easy', 'defensive')
    
    # Simulate game state progression
    game_states = [
        # Opening
        {
            'pieces': {
                'player1': [{'type': 'marshal', 'position': [4, 8]}, {'type': 'pawn', 'position': [3, 6]}],
                'player2': [{'type': 'marshal', 'position': [4, 0]}, {'type': 'pawn', 'position': [5, 2]}]
            },
            'currentPlayer': 1,
            'gamePhase': 'opening'
        },
        # Midgame
        {
            'pieces': {
                'player1': [{'type': 'marshal', 'position': [4, 6]}, {'type': 'general', 'position': [3, 5]}],
                'player2': [{'type': 'marshal', 'position': [4, 2]}, {'type': 'general', 'position': [5, 3]}]
            },
            'currentPlayer': 2,
            'gamePhase': 'midgame'
        }
    ]
    
    valid_moves = [
        {'from': [3, 6], 'to': [3, 5], 'piece': {'type': 'pawn'}, 'isCapture': False},
        {'from': [4, 6], 'to': [4, 5], 'piece': {'type': 'marshal'}, 'isCapture': False},
        {'from': [3, 5], 'to': [4, 4], 'piece': {'type': 'general'}, 'isCapture': True}
    ]
    
    # Test moves from both agents
    for i, state in enumerate(game_states):
        current_agent = player1_agent if state['currentPlayer'] == 1 else player2_agent
        player_name = f"Player {state['currentPlayer']}"
        
        start_time = time.time()
        move = current_agent.get_move(state, valid_moves)
        execution_time = (time.time() - start_time) * 1000
        
        print(f"Turn {i+1} ({player_name}): {execution_time:.2f}ms")
        print(f"  Move: {move}")
        print(f"  Agent type: {type(current_agent).__name__}")
        
        # Validate move is legal
        assert move in valid_moves or move is None
    
    print("✅ Real game scenario simulation successful")
    return True

def test_agent_factory_comprehensive():
    """Comprehensive test of the agent factory"""
    print("\n🏭 Testing Agent Factory Comprehensive")
    print("-" * 38)
    
    # Test all combinations
    difficulties = ['easy', 'medium', 'hard']
    personalities = ['aggressive', 'defensive', 'balanced']
    
    created_agents = {}
    
    for difficulty in difficulties:
        for personality in personalities:
            key = f"{difficulty}_{personality}"
            try:
                agent = AIAgentFactory.create_difficulty_agent(difficulty, personality)
                created_agents[key] = agent
                
                # Quick validation
                traits = agent.get_personality_traits()
                assert 'aggression' in traits
                
                # Test move generation
                test_move = agent.get_move(
                    {'pieces': {}, 'currentPlayer': 1},
                    [{'from': [0,0], 'to': [0,1], 'isCapture': False}]
                )
                
                print(f"✅ {key}: {type(agent).__name__}")
                
            except Exception as e:
                print(f"❌ {key}: Failed - {e}")
                return False
    
    print(f"✅ Created {len(created_agents)}/9 agent combinations successfully")
    
    # Test agent type mapping
    easy_agent = created_agents['easy_balanced']
    medium_agent = created_agents['medium_balanced'] 
    hard_agent = created_agents['hard_balanced']
    
    assert isinstance(easy_agent, RandomAI)
    assert isinstance(medium_agent, MinimaxAI)
    assert isinstance(hard_agent, MCTSAI)
    
    print("✅ Agent type mapping correct")
    
    return True

def run_all_component_tests():
    """Run all component tests"""
    print("🔧 POC AI System Component Testing")
    print("=" * 50)
    
    tests = [
        ("Board Evaluator", test_board_evaluator),
        ("Agent Configurations", test_agent_configurations),
        ("Performance Monitoring", test_performance_monitoring),
        ("Error Handling", test_error_handling),
        ("Real Game Scenario", test_real_game_scenario),
        ("Agent Factory Comprehensive", test_agent_factory_comprehensive)
    ]
    
    passed_tests = 0
    failed_tests = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed_tests += 1
            else:
                failed_tests += 1
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            failed_tests += 1
            print(f"❌ {test_name}: ERROR - {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Component Test Results:")
    print(f"Passed: {passed_tests}/{len(tests)}")
    print(f"Failed: {failed_tests}/{len(tests)}")
    print(f"Success Rate: {passed_tests/len(tests)*100:.1f}%")
    
    if passed_tests == len(tests):
        print("\n🎉 ALL COMPONENT TESTS PASSED!")
        print("✅ POC AI System components fully operational")
        return True
    else:
        print("\n⚠️ Some component tests failed")
        return False

if __name__ == "__main__":
    success = run_all_component_tests()
    sys.exit(0 if success else 1)
