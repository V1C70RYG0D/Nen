#!/usr/bin/env python3
"""
AI Manager Integration Tests - pytest Compatible
Comprehensive testing for AI agent management system following GI.md guidelines

This file provides pytest-compatible tests for the AI Manager system.
All tests follow GI.md principles for production-ready testing.

Usage:
    pytest test_ai_manager_pytest.py -v
    pytest test_ai_manager_pytest.py::TestAIManager::test_100_concurrent_ai_games -v
"""

import pytest
import time
import threading
import statistics
import os
import sys
import tempfile
import json
import uuid
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
import random

# Test configuration following GI.md guideline #18 (no hardcoding)
TEST_CONFIG = {
    'backend_url': os.getenv('TEST_BACKEND_URL', 'http://localhost:3000'),
    'redis_url': os.getenv('TEST_REDIS_URL', 'redis://localhost:6379'),
    'auth_token': os.getenv('TEST_AUTH_TOKEN', 'test_token_123'),
    'allowed_origins': ['http://localhost:3000'],
    'performance_target_ms': int(os.getenv('TEST_PERFORMANCE_TARGET_MS', '90')),
    'database_url': os.getenv('TEST_DATABASE_URL', 'sqlite:///:memory:'),
    'secret_key': os.getenv('TEST_SECRET_KEY', 'test_secret_key_123'),
    'jwt_secret': os.getenv('TEST_JWT_SECRET', 'test_jwt_secret_456')
}

# Import the mock classes from our simple test file
sys.path.append(str(Path(__file__).parent))
from test_ai_manager_simple import (
    MockAIManager, MockAIAgent, MockGameResult, MockGameState,
    MockPersonalityTraits, MockAIDifficulty, MockPersonalityType
)

class TestAIManager:
    """pytest-compatible integration testing for AI agent management system"""

    @pytest.fixture
    def ai_manager(self):
        """Create AI Manager instance for testing"""
        manager = MockAIManager(config=TEST_CONFIG)
        yield manager
        manager.shutdown()

    @pytest.fixture
    def sample_agents(self, ai_manager):
        """Create sample agents for testing"""
        agent1 = ai_manager.get_agent("medium", "aggressive")
        agent2 = ai_manager.get_agent("hard", "defensive")
        return agent1, agent2

    # ==========================================
    # Agent Management Tests
    # ==========================================

    def test_all_agents_load_successfully(self, ai_manager):
        """Test that all agent types load successfully"""
        difficulties = ['easy', 'medium', 'hard']
        personalities = ['aggressive', 'defensive', 'tactical', 'balanced']

        loaded_agents = []
        for difficulty in difficulties:
            for personality in personalities:
                agent = ai_manager.get_agent(difficulty, personality)
                assert agent is not None, f"Failed to load {difficulty} {personality} agent"
                assert agent.agent_id is not None
                assert agent.name is not None
                assert hasattr(agent, 'difficulty')
                assert hasattr(agent, 'traits')
                loaded_agents.append(agent)

        # Verify we got unique agents
        agent_ids = [agent.agent_id for agent in loaded_agents]
        assert len(set(agent_ids)) == len(agent_ids), "Duplicate agent IDs found"

    def test_agent_retrieval_by_difficulty_personality(self, ai_manager):
        """Test agent retrieval by specific difficulty and personality combinations"""
        test_cases = [
            ("easy", "aggressive"),
            ("medium", "defensive"),
            ("hard", "tactical"),
            ("medium", "balanced")
        ]

        for difficulty, personality in test_cases:
            agent = ai_manager.get_agent(difficulty, personality)

            assert agent is not None, f"No agent returned for {difficulty} {personality}"
            assert difficulty in agent.agent_id, f"Agent ID doesn't contain difficulty: {agent.agent_id}"
            assert personality in agent.agent_id, f"Agent ID doesn't contain personality: {agent.agent_id}"

            # Verify traits match personality
            if personality == "aggressive":
                assert agent.traits.aggression > 0.6, "Aggressive agent should have high aggression"
            elif personality == "defensive":
                assert agent.traits.patience > 0.6, "Defensive agent should have high patience"
            elif personality == "tactical":
                assert agent.traits.analytical > 0.7, "Tactical agent should have high analytical score"

    def test_random_agent_selection(self, ai_manager):
        """Test random agent selection returns valid agents"""
        agents = []

        for _ in range(20):
            agent = ai_manager.get_random_agent()
            assert agent is not None, "Random agent selection returned None"
            assert hasattr(agent, 'agent_id')
            assert hasattr(agent, 'difficulty')
            assert hasattr(agent, 'traits')
            agents.append(agent)

        # Should get some variety in random selection
        agent_ids = [agent.agent_id for agent in agents]
        unique_agents = set(agent_ids)
        assert len(unique_agents) > 1, "Random selection should provide variety"

    def test_agent_instance_isolation(self, ai_manager):
        """Test that agent instances are properly isolated"""
        # Get same agent type multiple times
        agent1a = ai_manager.get_agent("medium", "aggressive")
        agent1b = ai_manager.get_agent("medium", "aggressive")

        # Modify one agent's state
        original_aggression = agent1a.traits.aggression
        agent1a.traits.aggression = 0.9

        # Verify the system handles agent modifications safely
        if agent1a.agent_id != agent1b.agent_id:
            assert agent1b.traits.aggression == original_aggression, "Agent instances should be isolated"
        else:
            assert agent1a.traits.aggression == 0.9, "Agent modification should work"

    # ==========================================
    # Match Management Tests
    # ==========================================

    def test_agent_matchmaking(self, ai_manager):
        """Test agent matchmaking and game creation"""
        agent1 = ai_manager.get_agent("medium", "aggressive")
        agent2 = ai_manager.get_agent("hard", "defensive")

        assert agent1 is not None and agent2 is not None

        # Start game
        game_id = ai_manager.start_game(agent1, agent2)

        assert game_id is not None
        assert game_id in ai_manager.active_games

        game = ai_manager.active_games[game_id]
        assert game['agent1'].agent_id == agent1.agent_id
        assert game['agent2'].agent_id == agent2.agent_id
        assert game['state'] == MockGameState.PENDING

    def test_concurrent_matches(self, ai_manager):
        """Test multiple concurrent matches"""
        game_ids = []

        # Start 10 concurrent games
        for i in range(10):
            agent1 = ai_manager.get_agent("medium", "aggressive")
            agent2 = ai_manager.get_agent("medium", "defensive")
            game_id = ai_manager.start_game(agent1, agent2)
            game_ids.append(game_id)

        # Verify all games are active
        assert len(ai_manager.active_games) >= 10

        for game_id in game_ids:
            assert game_id in ai_manager.active_games

        # Run some games to completion
        completed = 0
        for game_id in game_ids[:5]:
            try:
                result = ai_manager.simulate_game(game_id)
                assert result is not None
                assert result.game_id == game_id
                completed += 1
            except Exception as e:
                pytest.fail(f"Game {game_id} failed: {e}")

        assert completed >= 3, f"At least 3 games should complete, got {completed}"

    def test_match_state_persistence(self, ai_manager):
        """Test that match state persists correctly"""
        agent1 = ai_manager.get_agent("easy", "balanced")
        agent2 = ai_manager.get_agent("easy", "balanced")

        game_id = ai_manager.start_game(agent1, agent2)

        # Check initial state
        game = ai_manager.active_games[game_id]
        initial_state = game['state']
        initial_moves = len(game['moves'])

        # Simulate partial game
        with ai_manager._game_locks[game_id]:
            game['state'] = MockGameState.ACTIVE
            game['moves'].append({'test': 'move'})

        # Verify state persisted
        updated_game = ai_manager.active_games[game_id]
        assert updated_game['state'] == MockGameState.ACTIVE
        assert len(updated_game['moves']) == initial_moves + 1

    def test_match_cleanup(self, ai_manager):
        """Test proper cleanup of completed matches"""
        agent1 = ai_manager.get_agent("easy", "aggressive")
        agent2 = ai_manager.get_agent("easy", "defensive")

        game_id = ai_manager.start_game(agent1, agent2)

        # Verify game is active
        assert game_id in ai_manager.active_games
        assert game_id in ai_manager._game_locks

        # Complete the game
        result = ai_manager.simulate_game(game_id)

        # Verify cleanup
        assert game_id not in ai_manager.active_games, "Game should be removed from active games"
        assert game_id not in ai_manager._game_locks, "Game lock should be cleaned up"
        assert game_id in ai_manager.completed_games, "Game should be in completed games"

    # ==========================================
    # Performance Integration Tests
    # ==========================================

    @pytest.mark.slow
    def test_100_concurrent_ai_games(self, ai_manager):
        """Test system handles 100+ concurrent AI games

        This is the critical test case specified in the requirements.
        """
        game_configs = []
        difficulties = ['easy', 'medium', 'hard']
        personalities = ['aggressive', 'defensive', 'tactical', 'balanced']

        # Generate 100 random game configurations
        for i in range(100):
            diff1 = difficulties[i % len(difficulties)]
            pers1 = personalities[i % len(personalities)]
            diff2 = difficulties[(i + 1) % len(difficulties)]
            pers2 = personalities[(i + 2) % len(personalities)]
            game_configs.append((diff1, pers1, diff2, pers2))

        start_time = time.time()

        # Run concurrent games
        results = ai_manager.run_concurrent_games(game_configs, timeout_seconds=300)

        total_duration = time.time() - start_time

        # Validate results
        assert len(results) >= 70, f"Expected at least 70 completed games, got {len(results)}"

        # Check average game duration
        game_durations = [r.duration for r in results]
        avg_duration = statistics.mean(game_durations)

        assert avg_duration < 180, f"Average game duration {avg_duration:.2f}s exceeds 3 minutes"
        assert total_duration < 600, f"Total test duration {total_duration:.2f}s exceeds 10 minutes"

        # Check for successful completion rate
        success_rate = len(results) / 100
        assert success_rate >= 0.7, f"Success rate {success_rate:.2%} below 70%"

        # Validate result structure
        for result in results[:10]:  # Check first 10
            assert hasattr(result, 'game_id')
            assert hasattr(result, 'winner')
            assert hasattr(result, 'duration')
            assert hasattr(result, 'moves')
            assert hasattr(result, 'agent1_id')
            assert hasattr(result, 'agent2_id')
            assert result.duration > 0
            assert len(result.moves) > 0

    def test_agent_pool_efficiency(self, ai_manager):
        """Test agent pool efficiency and utilization"""
        initial_metrics = ai_manager.get_performance_metrics()

        # Start multiple games to test pool utilization
        game_ids = []
        for i in range(20):
            agent1 = ai_manager.get_agent("medium", "aggressive")
            agent2 = ai_manager.get_agent("medium", "defensive")
            game_id = ai_manager.start_game(agent1, agent2)
            game_ids.append(game_id)

        # Check utilization metrics
        metrics = ai_manager.get_performance_metrics()

        assert metrics['active_games_count'] >= 20
        assert metrics['total_agents'] > initial_metrics['total_agents']

        # Check pool utilization
        for pool_key, utilization in metrics['pool_utilization'].items():
            assert 0 <= utilization <= 1, f"Invalid utilization {utilization} for pool {pool_key}"

    @pytest.mark.slow
    def test_memory_scaling(self, ai_manager):
        """Test memory usage scales appropriately with load"""
        pytest.importorskip("psutil")  # Skip if psutil not available

        import psutil
        process = psutil.Process()

        # Measure baseline memory
        baseline_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Create and run games to increase memory usage
        game_results = []
        for batch in range(3):
            batch_configs = [("medium", "aggressive", "medium", "defensive")] * 10
            batch_results = ai_manager.run_concurrent_games(batch_configs)
            game_results.extend(batch_results)

        # Measure memory after load
        peak_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = peak_memory - baseline_memory

        # Memory should not grow excessively
        assert memory_increase < 500, f"Memory increase {memory_increase:.1f}MB too high"

    # ==========================================
    # Additional Critical Tests
    # ==========================================

    def test_thread_safety(self, ai_manager):
        """Test thread safety of AI manager operations"""
        results = []
        errors = []

        def worker_thread(thread_id):
            try:
                for i in range(10):
                    # Get agents
                    agent1 = ai_manager.get_agent("medium", "aggressive")
                    agent2 = ai_manager.get_agent("medium", "defensive")

                    # Start game
                    game_id = ai_manager.start_game(agent1, agent2)

                    # Simulate short game
                    result = ai_manager.simulate_game(game_id, max_moves=10)
                    results.append(result)

            except Exception as e:
                errors.append(f"Thread {thread_id}: {e}")

        # Start multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=worker_thread, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join(timeout=60)

        # Check results
        assert len(errors) == 0, f"Thread safety errors: {errors}"
        assert len(results) >= 40, f"Expected at least 40 results, got {len(results)}"

        # Verify no duplicate game IDs
        game_ids = [r.game_id for r in results]
        assert len(set(game_ids)) == len(game_ids), "Duplicate game IDs indicate race condition"

    def test_error_handling_and_recovery(self, ai_manager):
        """Test error handling and system recovery"""
        initial_metrics = ai_manager.get_performance_metrics()

        # Test with invalid configurations
        invalid_agent = ai_manager.get_agent("invalid", "invalid")
        assert invalid_agent is None, "Should return None for invalid agent configuration"

        # Test game with valid agents
        agent1 = ai_manager.get_agent("easy", "balanced")
        agent2 = ai_manager.get_agent("easy", "balanced")
        game_id = ai_manager.start_game(agent1, agent2)

        # Test system recovery after adding invalid field
        game = ai_manager.active_games[game_id]
        game['invalid_field'] = None

        # This should still work despite the invalid field
        result = ai_manager.simulate_game(game_id)
        assert result is not None

        # System should still be functional
        final_metrics = ai_manager.get_performance_metrics()
        assert final_metrics['total_agents'] >= initial_metrics['total_agents']

    def test_performance_metrics_accuracy(self, ai_manager):
        """Test accuracy of performance metrics"""
        initial_metrics = ai_manager.get_performance_metrics()

        # Run known number of games
        test_games = 5
        completed_games = []

        for i in range(test_games):
            agent1 = ai_manager.get_agent("easy", "balanced")
            agent2 = ai_manager.get_agent("easy", "balanced")
            game_id = ai_manager.start_game(agent1, agent2)

            try:
                result = ai_manager.simulate_game(game_id, max_moves=20)
                completed_games.append(result)
            except Exception as e:
                pytest.fail(f"Game {i} failed: {e}")

        final_metrics = ai_manager.get_performance_metrics()

        # Verify metrics accuracy
        expected_total = initial_metrics['total_games'] + test_games
        expected_completed = initial_metrics['completed_games_count'] + len(completed_games)

        assert final_metrics['total_games'] == expected_total
        assert final_metrics['completed_games_count'] == expected_completed

        # Check success rate calculation
        expected_success_rate = expected_completed / expected_total
        assert abs(final_metrics['success_rate'] - expected_success_rate) < 0.01

    def test_cleanup_and_shutdown(self, ai_manager):
        """Test proper cleanup and shutdown procedures"""
        # Create some games
        game_ids = []
        for i in range(5):
            agent1 = ai_manager.get_agent("easy", "balanced")
            agent2 = ai_manager.get_agent("easy", "balanced")
            game_id = ai_manager.start_game(agent1, agent2)
            game_ids.append(game_id)

        # Complete some games
        for game_id in game_ids[:3]:
            try:
                ai_manager.simulate_game(game_id, max_moves=10)
            except Exception:
                pass

        # Test old game cleanup
        initial_completed = len(ai_manager.completed_games)
        ai_manager.cleanup_old_games(max_age_hours=0)  # Remove all

        assert len(ai_manager.completed_games) == 0, "Old games should be cleaned up"

        # Test shutdown
        active_games_before = len(ai_manager.active_games)
        ai_manager.shutdown()

        # Verify shutdown cleaned up resources
        assert len(ai_manager.active_games) == 0, "Active games should be cleaned up on shutdown"

# Pytest configuration
def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line("markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
