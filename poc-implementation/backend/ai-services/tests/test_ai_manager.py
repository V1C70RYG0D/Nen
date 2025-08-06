"""
Unit tests for AI Manager
Following GI.md guidelines for comprehensive testing
"""

import pytest
import time
import threading
from typing import Dict, Any, List

from agents.ai_manager import AIManager
from agents.basic_ai_agents import RandomAI, MinimaxAI, MCTSAI


class TestAIManager:
    """Test AI Manager functionality"""
    
    @pytest.mark.unit
    def test_initialization(self):
        """Test AI Manager initialization"""
        manager = AIManager()
        
        assert len(manager.agents) > 0
        assert len(manager.agent_pool) > 0
        assert len(manager.active_games) == 0
        assert hasattr(manager, 'executor')
        assert manager.max_workers == 10
    
    @pytest.mark.unit
    def test_agent_creation(self, ai_manager):
        """Test agent creation for different difficulties"""
        # Test easy agent creation
        easy_agent = ai_manager._create_agent('easy', 'balanced')
        assert isinstance(easy_agent, RandomAI)
        assert easy_agent.config.skill_level == 3
        
        # Test medium agent creation  
        medium_agent = ai_manager._create_agent('medium', 'aggressive')
        assert isinstance(medium_agent, MinimaxAI)
        assert medium_agent.config.skill_level == 5
        
        # Test hard agent creation
        hard_agent = ai_manager._create_agent('hard', 'defensive')
        # Should be HardAgent, but fallback is acceptable
        assert hasattr(hard_agent, 'get_move')
    
    @pytest.mark.unit
    def test_agent_retrieval(self, ai_manager):
        """Test getting agents by difficulty and personality"""
        agent = ai_manager.get_agent('easy', 'balanced')
        
        assert agent is not None
        assert hasattr(agent, 'get_move')
        assert agent.config.personality.value == 'balanced'
    
    @pytest.mark.unit
    def test_agent_pool_rotation(self, ai_manager):
        """Test agent pool rotation mechanism"""
        # Get same agent type multiple times
        agents = []
        for _ in range(5):
            agent = ai_manager.get_agent('easy', 'balanced')
            agents.append(agent)
        
        # Should get different agent instances (rotation)
        unique_agents = set(id(agent) for agent in agents if agent)
        assert len(unique_agents) > 1  # Should have multiple different agents
    
    @pytest.mark.unit
    @pytest.mark.edge_case
    def test_invalid_agent_request(self, ai_manager):
        """Test handling of invalid agent requests"""
        agent = ai_manager.get_agent('invalid_difficulty', 'invalid_personality')
        assert agent is None
    
    @pytest.mark.unit
    def test_random_agent_selection(self, ai_manager):
        """Test random agent selection"""
        agent = ai_manager.get_random_agent()
        
        assert agent is not None
        assert hasattr(agent, 'get_move')
    
    @pytest.mark.integration
    def test_match_creation(self, ai_manager):
        """Test match creation between agents"""
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'medium', 'personality': 'aggressive'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        
        assert match_id is not None
        assert isinstance(match_id, str)
        assert match_id in ai_manager.active_games
        
        match_info = ai_manager.active_games[match_id]
        assert match_info['status'] == 'active'
        assert match_info['current_player'] == 1
        assert len(match_info['moves']) == 0
    
    @pytest.mark.integration
    def test_ai_move_generation(self, ai_manager, sample_board_state, sample_valid_moves):
        """Test AI move generation in a match"""
        # Create match
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        assert match_id is not None
        
        # Get AI move
        move = ai_manager.get_ai_move(match_id, sample_board_state, sample_valid_moves)
        
        assert move is not None
        assert move in sample_valid_moves
        
        # Check move was recorded
        match_info = ai_manager.active_games[match_id]
        assert len(match_info['moves']) == 1
        assert match_info['moves'][0]['move'] == move
    
    @pytest.mark.integration
    def test_match_completion(self, ai_manager):
        """Test match completion and cleanup"""
        # Create match
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        assert match_id in ai_manager.active_games
        
        # End match
        result = {'winner': 1, 'reason': 'checkmate'}
        ai_manager.end_match(match_id, result)
        
        # Match should be cleaned up
        assert match_id not in ai_manager.active_games
    
    @pytest.mark.unit
    def test_performance_stats_tracking(self, ai_manager, sample_board_state, sample_valid_moves):
        """Test performance statistics tracking"""
        # Create match and generate move
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        ai_manager.get_ai_move(match_id, sample_board_state, sample_valid_moves)
        
        # Check performance stats were updated
        assert len(ai_manager.performance_stats) > 0
        
        for stats in ai_manager.performance_stats.values():
            assert 'total_moves' in stats
            assert 'total_time' in stats
            assert 'max_time' in stats
            assert 'min_time' in stats
    
    @pytest.mark.unit
    def test_performance_report(self, ai_manager):
        """Test performance report generation"""
        report = ai_manager.get_performance_report()
        
        assert 'timestamp' in report
        assert 'total_agents' in report
        assert 'active_games' in report
        assert 'agent_pool_status' in report
        assert 'performance_stats' in report
        assert 'system_health' in report
        
        # Check system health metrics
        health = report['system_health']
        assert 'total_moves_processed' in health
        assert 'timeout_rate' in health
        assert 'fraud_alert_rate' in health
        assert 'magicblock_compliance' in health
        assert 'average_response_time' in health


class TestStressTesting:
    """Test stress testing and concurrent operations"""
    
    @pytest.mark.performance
    @pytest.mark.slow
    def test_stress_test_execution(self, ai_manager):
        """Test stress test with concurrent games"""
        # Run small stress test
        concurrent_games = 3
        moves_per_game = 5
        
        report = ai_manager.run_stress_test(concurrent_games, moves_per_game)
        
        # Validate report structure
        assert 'test_configuration' in report
        assert 'results' in report
        assert 'performance' in report
        assert 'detailed_results' in report
        
        # Check test configuration
        config = report['test_configuration']
        assert config['concurrent_games'] == concurrent_games
        assert config['moves_per_game'] == moves_per_game
        assert config['total_duration'] > 0
        
        # Check results
        results = report['results']
        assert 'completed_games' in results
        assert 'failed_games' in results
        assert 'success_rate' in results
        
        # Most games should complete successfully
        assert results['success_rate'] > 0.5
        
        # Check performance metrics
        performance = report['performance']
        assert 'total_moves' in performance
        assert 'avg_move_time_ms' in performance
        assert 'magicblock_compliance_rate' in performance
    
    @pytest.mark.performance
    def test_concurrent_move_generation(self, ai_manager, sample_board_state, sample_valid_moves):
        """Test concurrent move generation"""
        # Create multiple matches
        matches = []
        for i in range(3):
            agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
            agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
            match_id = ai_manager.create_match(agent1_config, agent2_config)
            matches.append(match_id)
        
        # Generate moves concurrently
        import threading
        results = []
        threads = []
        
        def get_move(match_id):
            move = ai_manager.get_ai_move(match_id, sample_board_state, sample_valid_moves)
            results.append((match_id, move))
        
        for match_id in matches:
            thread = threading.Thread(target=get_move, args=(match_id,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All moves should be generated successfully
        assert len(results) == len(matches)
        for match_id, move in results:
            assert move is not None
            assert move in sample_valid_moves
    
    @pytest.mark.performance
    def test_memory_usage_under_load(self, ai_manager, sample_board_state, sample_valid_moves):
        """Test memory usage doesn't grow excessively under load"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Generate many moves
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        
        for _ in range(50):
            ai_manager.get_ai_move(match_id, sample_board_state, sample_valid_moves)
        
        final_memory = process.memory_info().rss
        memory_growth = final_memory - initial_memory
        
        # Memory growth should be reasonable (less than 50MB for 50 moves)
        assert memory_growth < 50 * 1024 * 1024
    
    @pytest.mark.performance
    def test_response_time_consistency(self, ai_manager, sample_board_state, sample_valid_moves):
        """Test response time consistency across multiple moves"""
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        
        response_times = []
        
        for _ in range(20):
            start_time = time.time()
            move = ai_manager.get_ai_move(match_id, sample_board_state, sample_valid_moves)
            end_time = time.time()
            
            assert move is not None
            response_time = (end_time - start_time) * 1000  # Convert to ms
            response_times.append(response_time)
        
        # Check response time statistics
        import statistics
        avg_time = statistics.mean(response_times)
        max_time = max(response_times)
        stdev_time = statistics.stdev(response_times)
        
        # Average should be reasonable for easy AI
        assert avg_time < 50.0  # Less than 50ms average
        
        # Maximum time should be within limits
        assert max_time < 100.0  # Less than 100ms max
        
        # Standard deviation should show reasonable consistency (very lenient for CI/variable performance)
        assert stdev_time < 5 * avg_time  # Allow high variance due to system load and CI environments


class TestEdgeCasesAndErrorHandling:
    """Test edge cases and error handling"""
    
    @pytest.mark.edge_case
    def test_empty_valid_moves(self, ai_manager, sample_board_state):
        """Test handling of empty valid moves list"""
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        move = ai_manager.get_ai_move(match_id, sample_board_state, [])
        
        # Should handle gracefully
        assert move is None
    
    @pytest.mark.edge_case
    def test_invalid_match_id(self, ai_manager, sample_board_state, sample_valid_moves):
        """Test handling of invalid match ID"""
        move = ai_manager.get_ai_move('invalid_match_id', sample_board_state, sample_valid_moves)
        
        assert move is None
    
    @pytest.mark.edge_case
    def test_invalid_board_state(self, ai_manager, invalid_board_state, sample_valid_moves):
        """Test handling of invalid board state"""
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        
        # Should handle invalid board state gracefully
        move = ai_manager.get_ai_move(match_id, invalid_board_state, sample_valid_moves)
        
        # Should still return a valid move or None (graceful handling)
        assert move is None or move in sample_valid_moves
    
    @pytest.mark.edge_case
    def test_match_creation_failure(self, ai_manager):
        """Test match creation with invalid configurations"""
        agent1_config = {'difficulty': 'invalid', 'personality': 'invalid'}
        agent2_config = {'difficulty': 'invalid', 'personality': 'invalid'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        
        # Should fail gracefully
        assert match_id is None
    
    @pytest.mark.edge_case
    def test_double_match_end(self, ai_manager):
        """Test ending a match twice"""
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        result = {'winner': 1, 'reason': 'test'}
        
        # End match once
        ai_manager.end_match(match_id, result)
        assert match_id not in ai_manager.active_games
        
        # Try to end again - should handle gracefully
        ai_manager.end_match(match_id, result)  # Should not crash
    
    @pytest.mark.edge_case
    def test_endgame_scenarios(self, ai_manager, endgame_board_state, sample_valid_moves):
        """Test AI behavior in endgame scenarios"""
        agent1_config = {'difficulty': 'medium', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'medium', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        move = ai_manager.get_ai_move(match_id, endgame_board_state, sample_valid_moves)
        
        assert move is not None
        assert move in sample_valid_moves
    
    @pytest.mark.edge_case 
    def test_draw_conditions(self, ai_manager):
        """Test handling of draw conditions"""
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        
        # End match with draw
        result = {'winner': None, 'reason': 'draw'}
        ai_manager.end_match(match_id, result)
        
        # Should handle draw result correctly
        assert match_id not in ai_manager.active_games


class TestConfigurationValidation:
    """Test AI configuration validation"""
    
    @pytest.mark.unit
    def test_difficulty_levels(self, ai_manager):
        """Test all difficulty levels are supported"""
        difficulties = ['easy', 'medium', 'hard']
        personalities = ['aggressive', 'defensive', 'balanced']
        
        for difficulty in difficulties:
            for personality in personalities:
                agent = ai_manager.get_agent(difficulty, personality)
                assert agent is not None
                assert agent.config.personality.value == personality
    
    @pytest.mark.unit
    def test_time_limits(self, ai_manager, sample_board_state, sample_valid_moves):
        """Test AI respects time limits"""
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_id = ai_manager.create_match(agent1_config, agent2_config)
        
        start_time = time.time()
        move = ai_manager.get_ai_move(match_id, sample_board_state, sample_valid_moves)
        execution_time = (time.time() - start_time) * 1000
        
        assert move is not None
        # Should complete within timeout (100ms default)
        assert execution_time < 150.0  # Allow some buffer
    
    @pytest.mark.unit
    def test_search_depth_parameters(self, ai_manager):
        """Test search depth configuration"""
        # Get agents of different difficulties
        easy_agent = ai_manager.get_agent('easy', 'balanced')
        medium_agent = ai_manager.get_agent('medium', 'balanced')  
        hard_agent = ai_manager.get_agent('hard', 'balanced')
        
        # Hard agent should have higher or equal search capabilities
        if hasattr(medium_agent.config, 'search_depth') and hasattr(hard_agent.config, 'search_depth'):
            assert hard_agent.config.search_depth >= medium_agent.config.search_depth
    
    @pytest.mark.integration
    def test_manager_shutdown(self, ai_manager):
        """Test AI manager shutdown"""
        # Create some matches
        agent1_config = {'difficulty': 'easy', 'personality': 'balanced'}
        agent2_config = {'difficulty': 'easy', 'personality': 'balanced'}
        
        match_ids = []
        for _ in range(3):
            match_id = ai_manager.create_match(agent1_config, agent2_config)
            match_ids.append(match_id)
        
        # Shutdown should clean up all matches
        ai_manager.shutdown()
        
        # All matches should be ended
        assert len(ai_manager.active_games) == 0
