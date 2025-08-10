#!/usr/bin/env python3
"""
Hard Agent Test Validation Script
Validates that the Hard Agent testing implementation works correctly
Following GI.md guidelines for comprehensive testing validation
"""

import sys
import time
import traceback
from pathlib import Path

# Add the test module to path
sys.path.insert(0, str(Path(__file__).parent))

def test_basic_functionality():
    """Test basic Hard Agent functionality"""
    print("🔸 Testing basic Hard Agent functionality...")

    try:
        from test_hard_agent import HardAgent, load_grandmaster_positions

        # Test agent creation
        agent = HardAgent("models/hard_balanced.pt", "balanced")
        print("  ✅ Agent creation successful")

        # Test basic board state
        basic_state = {
            'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveCount': 25
        }

        # Test move generation
        start_time = time.time()
        move = agent.select_move(basic_state)
        execution_time = (time.time() - start_time) * 1000

        assert move is not None, "Agent should generate a move"
        print(f"  ✅ Move generation successful: {execution_time:.2f}ms")

        # Test neural network functionality
        evaluation = agent._get_nn_evaluation(basic_state)
        assert isinstance(evaluation, (int, float)), "Neural network evaluation should return number"
        print(f"  ✅ Neural network evaluation: {evaluation:.3f}")

        return True

    except Exception as e:
        print(f"  ❌ Basic functionality test failed: {e}")
        traceback.print_exc()
        return False

def test_performance_requirements():
    """Test that Hard Agent meets performance requirements"""
    print("🔸 Testing performance requirements...")

    try:
        from test_hard_agent import HardAgent, TEST_CONFIG

        agent = HardAgent("models/hard_balanced.pt", "balanced")

        # Test timing compliance
        basic_state = {
            'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveCount': 25
        }

        execution_times = []
        for i in range(20):  # Test 20 iterations
            start_time = time.time()
            move = agent.select_move(basic_state)
            execution_time = (time.time() - start_time) * 1000
            execution_times.append(execution_time)

            assert move is not None, f"Move generation failed at iteration {i}"

        max_time = max(execution_times)
        avg_time = sum(execution_times) / len(execution_times)

        print(f"  📊 Performance Metrics:")
        print(f"     Max time: {max_time:.2f}ms")
        print(f"     Avg time: {avg_time:.2f}ms")
        print(f"     Target: <{TEST_CONFIG['MAGICBLOCK_TIMING_THRESHOLD_MS']}ms")

        # Check compliance
        if max_time < TEST_CONFIG['MAGICBLOCK_TIMING_THRESHOLD_MS']:
            print("  ✅ MagicBlock timing compliance achieved")
            return True
        else:
            print(f"  ⚠️  Performance needs optimization: {max_time:.2f}ms > {TEST_CONFIG['MAGICBLOCK_TIMING_THRESHOLD_MS']}ms")
            return False

    except Exception as e:
        print(f"  ❌ Performance test failed: {e}")
        traceback.print_exc()
        return False

def test_neural_network_integration():
    """Test neural network integration"""
    print("🔸 Testing neural network integration...")

    try:
        from test_hard_agent import HardAgent, MockNeuralNetwork

        # Test mock neural network
        nn = MockNeuralNetwork("test_model.pt")
        nn.load_model("test_model.pt")

        assert nn.loaded, "Neural network should load successfully"
        print("  ✅ Neural network loading successful")

        # Test move prediction
        basic_state = {
            'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }

        valid_moves = [
            {'from': {'x': 0, 'y': 0}, 'to': {'x': 1, 'y': 1}, 'piece': {'type': 'pawn'}},
            {'from': {'x': 1, 'y': 1}, 'to': {'x': 2, 'y': 2}, 'piece': {'type': 'general'}}
        ]

        predicted_move = nn.predict_move(basic_state, valid_moves)
        assert predicted_move in valid_moves, "Predicted move should be from valid moves"
        print("  ✅ Move prediction successful")

        # Test evaluation
        evaluation = nn.evaluate_position(basic_state)
        assert -2.0 <= evaluation <= 2.0, "Evaluation should be in reasonable range"
        print(f"  ✅ Position evaluation: {evaluation:.3f}")

        return True

    except Exception as e:
        print(f"  ❌ Neural network integration test failed: {e}")
        traceback.print_exc()
        return False

def test_hybrid_algorithm():
    """Test hybrid minimax + neural network algorithm"""
    print("🔸 Testing hybrid algorithm...")

    try:
        from test_hard_agent import HardAgent

        agent = HardAgent("models/hard_balanced.pt", "balanced")
        agent.enable_node_counting()

        complex_state = {
            'board': [
                [
                    [
                        {'type': 'marshal', 'player': 1} if i == 4 and j == 7 else
                        {'type': 'general', 'player': 2} if i == 4 and j == 1 else
                        None
                    ] + [None] * 2
                    for i in range(9)
                ]
                for j in range(9)
            ],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveCount': 35
        }

        move = agent.select_move(complex_state)
        node_count = agent.get_node_count()

        assert move is not None, "Hybrid algorithm should generate moves"
        assert node_count > 0, "Should evaluate some nodes"

        print(f"  ✅ Hybrid algorithm successful - evaluated {node_count} nodes")

        return True

    except Exception as e:
        print(f"  ❌ Hybrid algorithm test failed: {e}")
        traceback.print_exc()
        return False

def test_comprehensive_functionality():
    """Test comprehensive functionality"""
    print("🔸 Testing comprehensive functionality...")

    try:
        from test_hard_agent import (
            TestHardAgent, load_grandmaster_positions,
            load_annotated_games, PerformanceMetrics
        )

        # Test utility functions
        positions = load_grandmaster_positions(5)
        assert len(positions) == 5, "Should generate requested number of positions"
        print("  ✅ Grandmaster position generation successful")

        games = load_annotated_games(3)
        assert len(games) == 3, "Should generate requested number of games"
        print("  ✅ Annotated game generation successful")

        # Test performance metrics
        metrics = PerformanceMetrics(
            execution_times=[10.0, 20.0, 15.0],
            inference_times=[5.0, 8.0, 6.0],
            memory_usage=[100.0, 105.0, 102.0],
            node_counts=[50, 75, 60],
            accuracy_scores=[0.8, 0.85, 0.82],
            gpu_memory_usage=[200.0, 210.0, 205.0],
            search_depth_achieved=4,
            move_quality_scores=[0.9, 0.87, 0.92]
        )

        assert len(metrics.execution_times) == 3, "Metrics should store data correctly"
        print("  ✅ Performance metrics structure validated")

        return True

    except Exception as e:
        print(f"  ❌ Comprehensive functionality test failed: {e}")
        traceback.print_exc()
        return False

def run_all_tests():
    """Run all validation tests"""
    print("🧪 Hard Agent Test Validation Suite")
    print("=" * 50)

    tests = [
        ("Basic Functionality", test_basic_functionality),
        ("Performance Requirements", test_performance_requirements),
        ("Neural Network Integration", test_neural_network_integration),
        ("Hybrid Algorithm", test_hybrid_algorithm),
        ("Comprehensive Functionality", test_comprehensive_functionality)
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        if test_func():
            passed += 1

    print("\n" + "=" * 50)
    print(f"🏁 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Hard Agent implementation is ready.")
        return True
    else:
        print("⚠️  Some tests failed. Review implementation.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
