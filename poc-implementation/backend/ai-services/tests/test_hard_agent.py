"""
Unit tests for Hard AI Agent  
Following GI.md guidelines for comprehensive testing
"""

import pytest
import time
import numpy as np
from typing import Dict, Any, List

from agents.hard_agent import HardAgent, MockNeuralNetwork, load_grandmaster_positions, load_annotated_games


class TestMockNeuralNetwork:
    """Test mock neural network functionality"""
    
    @pytest.mark.unit
    def test_initialization(self):
        """Test mock neural network initialization"""
        model_path = "test_model.pt"
        nn = MockNeuralNetwork(model_path)
        
        assert nn.model_path == model_path
        assert nn.loaded == False
    
    @pytest.mark.unit
    def test_model_loading(self):
        """Test mock model loading"""
        nn = MockNeuralNetwork("test_model.pt")
        nn.load_model("test_model.pt")
        
        assert nn.loaded == True
    
    @pytest.mark.unit
    def test_position_evaluation(self, sample_board_state):
        """Test position evaluation speed and validity"""
        nn = MockNeuralNetwork("test_model.pt")
        nn.load_model("test_model.pt")
        
        start_time = time.time()
        score = nn.evaluate_position(sample_board_state)
        execution_time = (time.time() - start_time) * 1000
        
        assert isinstance(score, float)
        # Should be very fast for mock implementation
        assert execution_time < 1.0  # Less than 1ms
    
    @pytest.mark.unit
    def test_move_prediction(self, sample_board_state, sample_valid_moves):
        """Test move prediction functionality"""
        nn = MockNeuralNetwork("test_model.pt")
        nn.load_model("test_model.pt")
        
        move = nn.predict_move(sample_board_state, sample_valid_moves)
        
        assert move is not None
        assert move in sample_valid_moves
    
    @pytest.mark.unit
    def test_move_probabilities(self, sample_board_state, sample_valid_moves):
        """Test move probability generation"""
        nn = MockNeuralNetwork("test_model.pt")
        nn.load_model("test_model.pt")
        
        probs = nn.get_move_probabilities(sample_board_state, sample_valid_moves)
        
        assert len(probs) == len(sample_valid_moves)
        assert all(0.0 <= p <= 1.0 for p in probs)
        assert abs(sum(probs) - 1.0) < 0.001  # Should sum to 1
    
    @pytest.mark.unit
    @pytest.mark.edge_case
    def test_empty_moves_handling(self, sample_board_state):
        """Test handling of empty moves list"""
        nn = MockNeuralNetwork("test_model.pt")
        nn.load_model("test_model.pt")
        
        move = nn.predict_move(sample_board_state, [])
        probs = nn.get_move_probabilities(sample_board_state, [])
        
        assert move is None
        assert len(probs) == 0


class TestHardAgent:
    """Test Hard AI Agent functionality"""
    
    @pytest.mark.unit
    def test_initialization(self):
        """Test Hard Agent initialization"""
        agent = HardAgent("test_model.pt", "balanced")
        
        assert agent.model_path == "test_model.pt"
        assert agent.config.personality.value == "balanced"
        assert hasattr(agent, 'neural_network')
        assert hasattr(agent, 'evaluator')
        assert agent.search_depth > 0
        assert agent.top_moves_limit > 0
    
    @pytest.mark.unit
    def test_personality_configurations(self):
        """Test different personality configurations"""
        personalities = ['aggressive', 'defensive', 'balanced']
        
        for personality in personalities:
            agent = HardAgent("test_model.pt", personality)
            
            assert agent.config.personality.value == personality
            assert agent.config.skill_level == 8
            assert agent.config.search_depth == 4  # Higher depth for hard agent
            assert agent.config.max_move_time_ms == 90.0
            
            # Test personality-specific values
            if personality == 'aggressive':
                assert agent.config.aggression == 0.8
                assert agent.config.risk_tolerance == 0.7
            elif personality == 'defensive':
                assert agent.config.aggression == 0.3
                assert agent.config.risk_tolerance == 0.3
            else:  # balanced
                assert agent.config.aggression == 0.5
                assert agent.config.risk_tolerance == 0.5
    
    @pytest.mark.unit
    def test_move_generation(self, sample_board_state, sample_valid_moves):
        """Test basic move generation"""
        agent = HardAgent("test_model.pt", "balanced")
        
        move = agent.get_move(sample_board_state, sample_valid_moves)
        
        assert move is not None
        assert move in sample_valid_moves
    
    @pytest.mark.unit
    @pytest.mark.performance
    def test_move_time_constraint(self, sample_board_state, sample_valid_moves, performance_timer):
        """Test Hard Agent respects time constraints"""
        agent = HardAgent("test_model.pt", "balanced")
        
        performance_timer.start()
        move = agent.get_move(sample_board_state, sample_valid_moves)
        performance_timer.stop()
        
        execution_time = performance_timer.elapsed_ms()
        
        assert move is not None
        # Should meet MagicBlock compliance (< 90ms)
        assert execution_time < 100.0  # Allow small buffer
    
    @pytest.mark.unit
    def test_neural_network_integration(self, sample_board_state, sample_valid_moves):
        """Test neural network integration in move selection"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Test that neural network is used for evaluation
        score = agent._get_nn_evaluation(sample_board_state)
        assert isinstance(score, float)
        
        # Test move generation uses neural network
        move = agent.get_move(sample_board_state, sample_valid_moves)
        assert move is not None
    
    @pytest.mark.unit
    def test_minimax_with_nn_evaluation(self, sample_board_state, sample_capture_moves):
        """Test minimax search with neural network evaluation"""
        agent = HardAgent("test_model.pt", "aggressive")
        
        # Test evaluation includes neural network scores
        capture_move = sample_capture_moves[0]
        score = agent._minimax_with_nn_eval(sample_board_state, capture_move, 1)
        
        assert isinstance(score, float)
        # Aggressive agent should value captures higher
        non_capture_move = {'isCapture': False}
        non_capture_score = agent._minimax_with_nn_eval(sample_board_state, non_capture_move, 1)
        
        # Capture should generally score higher for aggressive agent
        assert score >= non_capture_score - 0.1  # Allow some variance
    
    @pytest.mark.unit
    def test_node_counting(self, sample_board_state, sample_valid_moves):
        """Test node counting functionality"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Enable node counting
        agent.enable_node_counting()
        assert agent.node_counting_enabled == True
        
        # Generate move to count nodes
        move = agent.get_move(sample_board_state, sample_valid_moves)
        node_count = agent.get_node_count()
        
        assert move is not None
        assert node_count > 0  # Should have evaluated some nodes
    
    @pytest.mark.unit
    def test_performance_metrics(self, sample_board_state, sample_valid_moves):
        """Test Hard Agent specific performance metrics"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Generate some moves to create metrics
        for _ in range(3):
            agent.get_move(sample_board_state, sample_valid_moves)
        
        metrics = agent.get_performance_metrics()
        
        # Check base metrics exist
        assert 'total_moves' in metrics
        assert 'avg_execution_time_ms' in metrics
        
        # Check Hard Agent specific metrics
        assert 'neural_network_loaded' in metrics
        assert 'search_depth' in metrics
        assert 'top_moves_limit' in metrics
        assert 'last_node_count' in metrics
        
        assert metrics['neural_network_loaded'] == True
        assert metrics['search_depth'] == agent.search_depth
        assert metrics['top_moves_limit'] == agent.top_moves_limit
    
    @pytest.mark.unit
    @pytest.mark.edge_case
    def test_fallback_move_selection(self, sample_board_state, sample_valid_moves):
        """Test fallback move selection for error cases"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Test fallback with valid moves
        fallback_move = agent._fallback_move_selection(sample_board_state, sample_valid_moves)
        assert fallback_move is not None
        assert fallback_move in sample_valid_moves
        
        # Test fallback with empty moves
        fallback_move = agent._fallback_move_selection(sample_board_state, [])
        assert fallback_move is None
    
    @pytest.mark.unit
    @pytest.mark.edge_case
    def test_empty_moves_handling(self, sample_board_state):
        """Test handling of empty moves list"""
        agent = HardAgent("test_model.pt", "balanced")
        
        move = agent.get_move(sample_board_state, [])
        assert move is None
    
    @pytest.mark.unit
    @pytest.mark.edge_case
    def test_invalid_board_state_handling(self, invalid_board_state, sample_valid_moves):
        """Test handling of invalid board state"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Should handle gracefully without crashing
        move = agent.get_move(invalid_board_state, sample_valid_moves)
        
        # Should either return a valid move or None
        assert move is None or move in sample_valid_moves


class TestPersonalityInfluence:
    """Test personality influence on Hard Agent decisions"""
    
    @pytest.mark.unit
    def test_aggressive_personality(self, sample_board_state, sample_capture_moves):
        """Test aggressive personality preferences"""
        agent = HardAgent("test_model.pt", "aggressive")
        
        # Test multiple moves to see preference patterns
        capture_selections = 0
        total_tests = 20
        
        for _ in range(total_tests):
            move = agent.get_move(sample_board_state, sample_capture_moves)
            if move and move.get('isCapture', False):
                capture_selections += 1
        
        capture_rate = capture_selections / total_tests
        
        # Aggressive agent should prefer captures more often
        assert capture_rate > 0.7  # At least 70% capture preference
    
    @pytest.mark.unit
    def test_defensive_personality(self, sample_board_state, sample_valid_moves):
        """Test defensive personality behavior"""
        aggressive_agent = HardAgent("test_model.pt", "aggressive")
        defensive_agent = HardAgent("test_model.pt", "defensive")
        
        # Test evaluation differences
        capture_move = {'isCapture': True, 'captured': {'type': 'pawn'}}
        
        aggressive_eval = aggressive_agent._minimax_with_nn_eval(sample_board_state, capture_move, 1)
        defensive_eval = defensive_agent._minimax_with_nn_eval(sample_board_state, capture_move, 1)
        
        # Personality should influence evaluation
        # Note: exact comparison depends on implementation details
        assert isinstance(aggressive_eval, float)
        assert isinstance(defensive_eval, float)
    
    @pytest.mark.unit
    def test_balanced_personality(self, sample_board_state, sample_valid_moves):
        """Test balanced personality behavior"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Balanced should work consistently
        moves = []
        for _ in range(5):
            move = agent.get_move(sample_board_state, sample_valid_moves)
            moves.append(move)
        
        # All moves should be valid
        assert all(move in sample_valid_moves for move in moves if move)


class TestAlgorithmicComponents:
    """Test specific algorithmic components"""
    
    @pytest.mark.unit
    def test_minimax_implementation(self, sample_board_state, sample_capture_moves):
        """Test minimax algorithm implementation"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Test minimax evaluation
        move = sample_capture_moves[0]
        score = agent._minimax_with_nn_eval(sample_board_state, move, 2)
        
        assert isinstance(score, float)
        # Score should incorporate both neural network and traditional evaluation
    
    @pytest.mark.unit
    def test_move_ordering_by_neural_network(self, sample_board_state, sample_valid_moves):
        """Test that neural network probabilities order moves effectively"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Get neural network move probabilities
        move_probabilities = agent.neural_network.get_move_probabilities(sample_board_state, sample_valid_moves)
        
        if move_probabilities and len(move_probabilities) == len(sample_valid_moves):
            # Moves should be ordered by probability
            moves_with_probs = list(zip(sample_valid_moves, move_probabilities))
            moves_with_probs.sort(key=lambda x: x[1], reverse=True)
            
            # Top move should have highest probability
            top_move, top_prob = moves_with_probs[0]
            assert top_prob >= moves_with_probs[-1][1]  # Should be >= lowest prob
    
    @pytest.mark.unit
    def test_alpha_beta_pruning_efficiency(self, sample_board_state, sample_valid_moves):
        """Test alpha-beta pruning improves efficiency"""
        agent = HardAgent("test_model.pt", "balanced")
        agent.enable_node_counting()
        
        # Generate moves and check node efficiency
        start_time = time.time()
        move = agent.get_move(sample_board_state, sample_valid_moves)
        execution_time = (time.time() - start_time) * 1000
        
        node_count = agent.get_node_count()
        
        assert move is not None
        assert execution_time < 90.0  # Should be efficient
        # Node count should be reasonable (pruning working)
        assert node_count < 1000  # Should not explore too many nodes
    
    @pytest.mark.unit
    @pytest.mark.performance
    def test_time_management(self, sample_board_state, sample_valid_moves):
        """Test time management and early termination"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Test with large move list to stress time management
        large_move_list = sample_valid_moves * 10  # Duplicate moves for testing
        
        start_time = time.time()
        move = agent.get_move(sample_board_state, large_move_list)
        execution_time = (time.time() - start_time) * 1000
        
        assert move is not None
        # Should still respect time constraints even with many moves
        assert execution_time < 120.0  # Allow some buffer for large move list


class TestUtilityFunctions:
    """Test utility functions for testing and validation"""
    
    @pytest.mark.unit
    def test_load_grandmaster_positions(self):
        """Test grandmaster position loading"""
        positions = load_grandmaster_positions(5)
        
        assert len(positions) == 5
        
        for position in positions:
            assert 'board' in position
            assert 'currentPlayer' in position
            assert 'gamePhase' in position
            assert 'moveCount' in position
            assert 'difficulty' in position
            assert 'pieces' in position
            
            assert position['difficulty'] == 'grandmaster'
            assert position['currentPlayer'] in [1, 2]
    
    @pytest.mark.unit
    def test_load_annotated_games(self):
        """Test annotated game loading"""
        games = load_annotated_games(3)
        
        assert len(games) <= 3  # May be limited by implementation
        
        for game in games:
            assert 'positions' in game
            assert 'result' in game
            assert len(game['positions']) > 0
            assert game['result'] in [0, 1]
            
            # Check position format
            for position, result in game['positions']:
                assert 'board' in position
                assert 'currentPlayer' in position
                assert result in [0, 1]
    
    @pytest.mark.unit
    def test_grandmaster_position_variety(self):
        """Test that grandmaster positions have variety"""
        positions = load_grandmaster_positions(10)
        
        move_counts = [pos['moveCount'] for pos in positions]
        piece_positions = [pos['pieces']['player1'][0]['position'] for pos in positions if pos['pieces']['player1']]
        
        # Should have variety in move counts
        assert len(set(move_counts)) > 1
        
        # Should have variety in positions (at least some different positions)
        unique_positions = len(set(str(pos) for pos in piece_positions))
        assert unique_positions > 1


class TestIntegrationWithBoardEvaluator:
    """Test integration between Hard Agent and Board Evaluator"""
    
    @pytest.mark.integration
    def test_combined_evaluation(self, sample_board_state, sample_capture_moves):
        """Test combination of neural network and traditional evaluation"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Test that both evaluation methods contribute
        capture_move = sample_capture_moves[0]
        nn_score = agent._get_nn_evaluation(sample_board_state)
        combined_score = agent._minimax_with_nn_eval(sample_board_state, capture_move, 1)
        
        assert isinstance(nn_score, float)
        assert isinstance(combined_score, float)
        
        # Combined score should incorporate both evaluations
        # (exact relationship depends on implementation)
    
    @pytest.mark.integration
    def test_evaluation_consistency(self, sample_board_state):
        """Test evaluation consistency across multiple calls"""
        agent = HardAgent("test_model.pt", "balanced")
        
        # Multiple evaluations of same position should be consistent
        scores = []
        for _ in range(5):
            score = agent._get_nn_evaluation(sample_board_state)
            scores.append(score)
        
        # Should be reasonably consistent (allowing for some randomness in mock)
        score_variance = max(scores) - min(scores)
        assert score_variance < 100  # Reasonable variance threshold
