#!/usr/bin/env python3
"""
Simple functionality test for AI system
Tests basic imports and agent creation
"""

import sys
import os
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

def test_basic_imports():
    """Test that all basic imports work"""
    try:
        from agents.basic_ai_agents import (
            RandomAI, MinimaxAI, MCTSAI, AIConfig, AIPersonality, 
            AIAgentFactory, GungiBoardEvaluator
        )
        print("✅ Basic AI agents imported successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to import basic AI agents: {e}")
        return False

def test_ai_manager_import():
    """Test AI manager import"""
    try:
        from agents.ai_manager import AIManager
        print("✅ AI Manager imported successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to import AI Manager: {e}")
        return False

def test_hard_agent_import():
    """Test hard agent import"""
    try:
        from agents.hard_agent import HardAgent
        print("✅ Hard Agent imported successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to import Hard Agent: {e}")
        return False

def test_agent_creation():
    """Test creating basic AI agents"""
    try:
        from agents.basic_ai_agents import RandomAI, AIConfig, AIPersonality
        
        config = AIConfig(personality=AIPersonality.BALANCED, skill_level=5)
        agent = RandomAI(config)
        
        print("✅ RandomAI agent created successfully")
        print(f"   - Personality: {agent.config.personality.value}")
        print(f"   - Skill Level: {agent.config.skill_level}")
        print(f"   - Fraud Score: {agent.get_fraud_score()}")
        
        return True
    except Exception as e:
        print(f"❌ Failed to create AI agent: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_board_evaluator():
    """Test board evaluator functionality"""
    try:
        from agents.basic_ai_agents import GungiBoardEvaluator
        
        evaluator = GungiBoardEvaluator()
        
        # Test with sample board state
        board_state = {
            'currentPlayer': 1,
            'pieces': {
                'player1': [
                    {'type': 'marshal', 'position': [8, 4]},
                    {'type': 'pawn', 'position': [6, 4]}
                ],
                'player2': [
                    {'type': 'marshal', 'position': [0, 4]},
                    {'type': 'pawn', 'position': [2, 4]}
                ]
            }
        }
        
        score = evaluator.evaluate_position(board_state)
        
        print("✅ Board evaluator working")
        print(f"   - Position score: {score}")
        print(f"   - Piece values loaded: {len(evaluator.piece_values)} types")
        
        return True
    except Exception as e:
        print(f"❌ Board evaluator failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_move_generation():
    """Test basic move generation"""
    try:
        from agents.basic_ai_agents import RandomAI, AIConfig, AIPersonality
        
        config = AIConfig(personality=AIPersonality.BALANCED)
        agent = RandomAI(config)
        
        board_state = {
            'currentPlayer': 1,
            'pieces': {
                'player1': [{'type': 'marshal', 'position': [8, 4]}],
                'player2': [{'type': 'marshal', 'position': [0, 4]}]
            }
        }
        
        valid_moves = [
            {
                'from': [6, 4],
                'to': [5, 4],
                'piece': {'type': 'pawn'},
                'isCapture': False
            },
            {
                'from': [6, 3],
                'to': [5, 3],
                'piece': {'type': 'pawn'},
                'isCapture': True,
                'captured': {'type': 'pawn'}
            }
        ]
        
        start_time = time.time()
        move = agent.get_move(board_state, valid_moves)
        execution_time = (time.time() - start_time) * 1000
        
        print("✅ Move generation working")
        print(f"   - Selected move: {move}")
        print(f"   - Execution time: {execution_time:.2f}ms")
        print(f"   - Move in valid list: {move in valid_moves}")
        
        return True
    except Exception as e:
        print(f"❌ Move generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_performance_tracking():
    """Test performance tracking functionality"""
    try:
        from agents.basic_ai_agents import RandomAI, AIConfig
        
        agent = RandomAI(AIConfig())
        
        # Generate some moves to create performance data
        board_state = {'pieces': {'player1': [], 'player2': []}}
        moves = [{'from': [0, 0], 'to': [1, 1], 'isCapture': False}]
        
        for _ in range(3):
            agent.get_move(board_state, moves)
        
        metrics = agent.get_performance_metrics()
        
        print("✅ Performance tracking working")
        print(f"   - Total moves: {metrics.get('total_moves', 0)}")
        print(f"   - Avg time: {metrics.get('avg_execution_time_ms', 0):.2f}ms")
        print(f"   - Fraud score: {metrics.get('fraud_score', 0):.3f}")
        print(f"   - MagicBlock compliant: {metrics.get('magicblock_compliance', False)}")
        
        return True
    except Exception as e:
        print(f"❌ Performance tracking failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_ai_manager_basic():
    """Test basic AI manager functionality"""
    try:
        from agents.ai_manager import AIManager
        
        manager = AIManager()
        
        print("✅ AI Manager working")
        print(f"   - Total agents: {len(manager.agents)}")
        print(f"   - Agent pools: {len(manager.agent_pool)}")
        
        # Test getting an agent
        agent = manager.get_agent("easy", "balanced")
        if agent:
            print(f"   - Retrieved agent: {agent.__class__.__name__}")
        
        return True
    except Exception as e:
        print(f"❌ AI Manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all basic functionality tests"""
    print("🚀 Starting Basic AI System Functionality Tests")
    print("=" * 70)
    
    tests = [
        ("Basic Imports", test_basic_imports),
        ("AI Manager Import", test_ai_manager_import),
        ("Hard Agent Import", test_hard_agent_import),
        ("Agent Creation", test_agent_creation),
        ("Board Evaluator", test_board_evaluator),
        ("Move Generation", test_move_generation),
        ("Performance Tracking", test_performance_tracking),
        ("AI Manager Basic", test_ai_manager_basic),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 Testing {test_name}...")
        print("-" * 40)
        
        try:
            if test_func():
                passed += 1
            else:
                print(f"❌ {test_name} failed")
        except Exception as e:
            print(f"💥 {test_name} crashed: {e}")
    
    print("\n" + "=" * 70)
    print("📊 BASIC FUNCTIONALITY TEST SUMMARY")
    print("=" * 70)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 ALL BASIC TESTS PASSED!")
        print("✅ AI system core functionality is working correctly")
        return True
    else:
        print(f"\n⚠️ {total - passed} TESTS FAILED")
        print("❌ Some core functionality needs attention")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
