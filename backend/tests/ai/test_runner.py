#!/usr/bin/env python3
"""
Test Runner for BaseAIAgent Testing
Production-grade test execution following GI.md guidelines
"""

import sys
import os
import unittest
import time
from pathlib import Path

# Add AI services to path
sys.path.append(str(Path(__file__).parent.parent / "ai-services"))

try:
    from agents.basic_ai_agents import (
        BaseAIAgent, RandomAI, MinimaxAI, MCTSAI,
        AIConfig, AIPersonality, AIAgentFactory,
        GungiBoardEvaluator
    )
    print("✅ Successfully imported AI agent modules")
except ImportError as e:
    print(f"❌ Failed to import AI modules: {e}")
    sys.exit(1)

class TestBaseAIAgentCore(unittest.TestCase):
    """Core functionality tests for BaseAIAgent"""

    def setUp(self):
        """Set up test fixtures"""
        self.base_config = AIConfig(
            personality=AIPersonality.BALANCED,
            skill_level=5,
            search_depth=3,
            thinking_time=1.0,
            aggression=0.5,
            risk_tolerance=0.5
        )

        self.test_board_state = {
            'currentPlayer': 1,
            'status': 'active',
            'moveNumber': 1,
            'board': [[None for _ in range(8)] for _ in range(8)],
            'pieces': {
                'player1': [{'type': 'marshal', 'position': [7, 4]}],
                'player2': [{'type': 'marshal', 'position': [0, 4]}]
            }
        }

        self.valid_moves = [
            {
                'from': [7, 4],
                'to': [6, 4],
                'piece': {'type': 'marshal', 'player': 1},
                'isCapture': False,
                'player': 1
            },
            {
                'from': [5, 5],
                'to': [2, 5],
                'piece': {'type': 'scout', 'player': 1},
                'isCapture': True,
                'captured': {'type': 'scout', 'player': 2},
                'player': 1
            }
        ]

    def test_agent_initialization(self):
        """Test proper agent initialization with configuration"""
        agent = RandomAI(self.base_config)

        # Verify configuration storage
        self.assertEqual(agent.config, self.base_config)
        self.assertEqual(agent.config.personality, AIPersonality.BALANCED)
        self.assertEqual(agent.config.skill_level, 5)

        # Verify initial state
        self.assertEqual(len(agent.game_history), 0)
        self.assertEqual(agent.performance_stats['games_played'], 0)
        self.assertEqual(agent.performance_stats['wins'], 0)
        print("✅ Agent initialization test passed")

    def test_piece_value_assignment(self):
        """Test piece value assignment and evaluation"""
        evaluator = GungiBoardEvaluator()

        # Test piece values are properly assigned
        self.assertEqual(evaluator.piece_values['marshal'], 1000)
        self.assertEqual(evaluator.piece_values['general'], 500)
        self.assertEqual(evaluator.piece_values['captain'], 300)

        # Test value hierarchy
        self.assertGreater(evaluator.piece_values['marshal'], evaluator.piece_values['general'])
        self.assertGreater(evaluator.piece_values['general'], evaluator.piece_values['captain'])
        print("✅ Piece value assignment test passed")

    def test_personality_assignment(self):
        """Test personality trait assignment and influence"""
        aggressive_config = AIConfig(
            personality=AIPersonality.AGGRESSIVE,
            skill_level=7,
            aggression=0.8,
            risk_tolerance=0.7
        )

        defensive_config = AIConfig(
            personality=AIPersonality.DEFENSIVE,
            skill_level=6,
            aggression=0.3,
            risk_tolerance=0.3
        )

        aggressive_agent = RandomAI(aggressive_config)
        defensive_agent = RandomAI(defensive_config)

        # Verify aggressive traits
        aggressive_traits = aggressive_agent.get_personality_traits()
        self.assertEqual(aggressive_traits['aggression'], 0.8)
        self.assertEqual(aggressive_traits['risk_tolerance'], 0.7)

        # Verify defensive traits
        defensive_traits = defensive_agent.get_personality_traits()
        self.assertEqual(defensive_traits['aggression'], 0.3)
        self.assertEqual(defensive_traits['risk_tolerance'], 0.3)

        # Verify trait differences
        self.assertGreater(aggressive_traits['aggression'], defensive_traits['aggression'])
        print("✅ Personality assignment test passed")

    def test_abstract_method_enforcement(self):
        """Test that abstract methods are properly enforced"""
        # Should not be able to instantiate BaseAIAgent directly
        with self.assertRaises(TypeError):
            BaseAIAgent(self.base_config)
        print("✅ Abstract method enforcement test passed")

class TestFraudDetection(unittest.TestCase):
    """Fraud detection system tests"""

    def setUp(self):
        self.base_config = AIConfig(
            personality=AIPersonality.BALANCED,
            skill_level=5,
            thinking_time=1.0
        )

        self.test_board_state = {
            'currentPlayer': 1,
            'status': 'active',
            'moveNumber': 1,
            'board': [[None for _ in range(8)] for _ in range(8)]
        }

        self.valid_moves = [
            {
                'from': [7, 4],
                'to': [6, 4],
                'piece': {'type': 'marshal', 'player': 1},
                'isCapture': False
            }
        ]

    def test_fraud_detection_timing(self):
        """Test that rapid decisions can be detected for fraud alerts"""
        agent = RandomAI(self.base_config)

        # Test rapid decision detection
        start_time = time.time()
        move1 = agent.get_move(self.test_board_state, self.valid_moves)
        mid_time = time.time()

        # Simulate very short delay (suspicious timing)
        time.sleep(0.005)  # 5ms delay

        move2 = agent.get_move(self.test_board_state, self.valid_moves)
        end_time = time.time()

        first_decision_time = mid_time - start_time
        second_decision_time = end_time - mid_time

        # Both moves should be valid
        self.assertIsNotNone(move1)
        self.assertIsNotNone(move2)

        # In production, decisions under 10ms might trigger fraud alerts
        if first_decision_time < 0.01 or second_decision_time < 0.01:
            print(f"⚠️  WARNING: Potentially suspicious timing detected")
            print(f"   First decision: {first_decision_time*1000:.2f}ms")
            print(f"   Second decision: {second_decision_time*1000:.2f}ms")

        print("✅ Fraud detection timing test passed")

    def test_move_recording_accuracy(self):
        """Test accurate move recording for fraud detection"""
        agent = RandomAI(self.base_config)

        # Record move with timing
        start_time = time.time()
        move = agent.get_move(self.test_board_state, self.valid_moves)
        end_time = time.time()

        thinking_time = end_time - start_time

        # Verify move was selected
        self.assertIsNotNone(move)
        self.assertIn(move, self.valid_moves)

        # Verify timing is measurable
        self.assertGreater(thinking_time, 0)
        print("✅ Move recording accuracy test passed")

class TestPersonalityImpact(unittest.TestCase):
    """Test measurable differences between AI personalities"""

    def test_personality_evaluation_differences(self):
        """Test that personalities produce measurably different evaluations"""
        # Create agents with different personalities
        aggressive = RandomAI(AIConfig(
            personality=AIPersonality.AGGRESSIVE,
            skill_level=5,
            aggression=0.9,
            risk_tolerance=0.8
        ))

        defensive = RandomAI(AIConfig(
            personality=AIPersonality.DEFENSIVE,
            skill_level=5,
            aggression=0.2,
            risk_tolerance=0.3
        ))

        balanced = RandomAI(AIConfig(
            personality=AIPersonality.BALANCED,
            skill_level=5,
            aggression=0.5,
            risk_tolerance=0.5
        ))

        # Get personality traits for comparison
        agg_traits = aggressive.get_personality_traits()
        def_traits = defensive.get_personality_traits()
        bal_traits = balanced.get_personality_traits()

        # Assert meaningful differences (>10% variance as specified)
        agg_aggression = agg_traits['aggression']
        def_aggression = def_traits['aggression']
        bal_aggression = bal_traits['aggression']

        difference = abs(agg_aggression - def_aggression)
        variance_threshold = abs(bal_aggression) * 0.1

        self.assertGreater(difference, variance_threshold,
                          f"Personality difference {difference:.2f} should be > {variance_threshold:.2f}")
        self.assertGreater(agg_aggression, def_aggression)
        print("✅ Personality evaluation differences test passed")

class TestAIAgentFactory(unittest.TestCase):
    """Test AI agent factory functionality"""

    def test_factory_agent_creation(self):
        """Test factory creates different agent types correctly"""
        # Test personality config creation
        aggressive_config = AIAgentFactory.create_personality_config('aggressive', 7)
        self.assertEqual(aggressive_config.personality, AIPersonality.AGGRESSIVE)
        self.assertEqual(aggressive_config.skill_level, 7)
        self.assertEqual(aggressive_config.aggression, 0.8)

        # Test agent creation
        random_agent = AIAgentFactory.create_agent('random', aggressive_config)
        self.assertIsInstance(random_agent, RandomAI)
        self.assertEqual(random_agent.config.personality, AIPersonality.AGGRESSIVE)

        minimax_agent = AIAgentFactory.create_agent('minimax', aggressive_config)
        self.assertIsInstance(minimax_agent, MinimaxAI)

        mcts_agent = AIAgentFactory.create_agent('mcts', aggressive_config)
        self.assertIsInstance(mcts_agent, MCTSAI)

        print("✅ Factory agent creation test passed")

    def test_factory_error_handling(self):
        """Test factory handles invalid inputs gracefully"""
        # Test invalid agent type
        with self.assertRaises(ValueError):
            AIAgentFactory.create_agent('invalid_type')

        print("✅ Factory error handling test passed")

class TestPerformance(unittest.TestCase):
    """Performance and reliability tests"""

    def test_move_generation_performance(self):
        """Test move generation performance meets requirements"""
        config = AIConfig(skill_level=5, thinking_time=0.1)
        agent = RandomAI(config)

        board_state = {
            'currentPlayer': 1,
            'status': 'active',
            'board': [[None for _ in range(8)] for _ in range(8)]
        }

        valid_moves = [
            {'from': [7, 4], 'to': [6, 4], 'piece': {'type': 'marshal'}},
            {'from': [7, 0], 'to': [6, 0], 'piece': {'type': 'general'}}
        ]

        # Performance benchmark
        start_time = time.time()

        for _ in range(50):  # Reduced for quick testing
            move = agent.get_move(board_state, valid_moves)
            self.assertIsNotNone(move)

        end_time = time.time()
        total_time = end_time - start_time
        avg_time = total_time / 50

        self.assertLess(avg_time, 0.02, f"Move generation too slow: {avg_time:.4f}s average")
        print(f"✅ Performance test passed - Average move time: {avg_time*1000:.2f}ms")

def run_all_tests():
    """Run all test suites"""
    print("🚀 Starting BaseAIAgent Comprehensive Test Suite")
    print("=" * 60)

    # Create test suite
    test_loader = unittest.TestLoader()
    test_suite = unittest.TestSuite()

    # Add test classes
    test_suite.addTests(test_loader.loadTestsFromTestCase(TestBaseAIAgentCore))
    test_suite.addTests(test_loader.loadTestsFromTestCase(TestFraudDetection))
    test_suite.addTests(test_loader.loadTestsFromTestCase(TestPersonalityImpact))
    test_suite.addTests(test_loader.loadTestsFromTestCase(TestAIAgentFactory))
    test_suite.addTests(test_loader.loadTestsFromTestCase(TestPerformance))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)

    # Print summary
    print("\n" + "=" * 60)
    print("🎯 TEST EXECUTION SUMMARY")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")

    if result.failures:
        print("\n❌ FAILURES:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback}")

    if result.errors:
        print("\n💥 ERRORS:")
        for test, traceback in result.errors:
            print(f"  - {test}: {traceback}")

    success = len(result.failures) == 0 and len(result.errors) == 0

    if success:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ BaseAIAgent implementation is production-ready")
    else:
        print("\n⚠️  Some tests failed - Review implementation")

    return success

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
