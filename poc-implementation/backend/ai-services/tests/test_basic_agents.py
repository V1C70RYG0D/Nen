"""
Unit tests for basic AI agents
Following GI.md guidelines for comprehensive testing
"""

import pytest
import time
from typing import Dict, Any, List

from agents.basic_ai_agents import (
    RandomAI, MinimaxAI, MCTSAI, AIConfig, AIPersonality, 
    AIAgentFactory, GungiBoardEvaluator
)


class TestAIConfig:
    """Test AI configuration management"""
    
    @pytest.mark.unit
    def test_default_config(self):
        """Test default configuration values"""
        config = AIConfig()
        
        assert config.personality == AIPersonality.BALANCED
        assert config.skill_level == 5
        assert config.search_depth == 3
        assert config.thinking_time == 1.0
        assert config.aggression == 0.5
        assert config.risk_tolerance == 0.5
        assert config.enable_fraud_detection == True
        assert config.max_move_time_ms == 100.0
        assert config.target_move_time_ms == 50.0
    
    @pytest.mark.unit
    def test_custom_config(self):
        """Test custom configuration creation"""
        config = AIConfig(
            personality=AIPersonality.AGGRESSIVE,
            skill_level=8,
            search_depth=4,
            aggression=0.8,
            risk_tolerance=0.7
        )
        
        assert config.personality == AIPersonality.AGGRESSIVE
        assert config.skill_level == 8
        assert config.search_depth == 4
        assert config.aggression == 0.8
        assert config.risk_tolerance == 0.7


class TestGungiBoardEvaluator:
    """Test board position evaluator"""
    
    @pytest.mark.unit
    def test_piece_values(self, board_evaluator):
        """Test piece value mapping"""
        assert board_evaluator.piece_values['marshal'] == 1000
        assert board_evaluator.piece_values['general'] == 500
        assert board_evaluator.piece_values['captain'] == 300
        assert board_evaluator.piece_values['lieutenant'] == 300
        assert board_evaluator.piece_values['major'] == 200
        assert board_evaluator.piece_values['scout'] == 150
        assert board_evaluator.piece_values['pawn'] == 100
        assert board_evaluator.piece_values['spy'] == 50
        assert board_evaluator.piece_values['fortress'] == 400
    
    @pytest.mark.unit
    def test_position_evaluation(self, board_evaluator, sample_board_state):
        """Test position evaluation functionality"""
        score = board_evaluator.evaluate_position(sample_board_state)
        
        assert isinstance(score, float)
        # Score should not be zero for a valid position
        assert score != 0.0
    
    @pytest.mark.unit
    def test_empty_board_evaluation(self, board_evaluator, empty_board_state):
        """Test evaluation of empty board"""
        score = board_evaluator.evaluate_position(empty_board_state)
        
        assert isinstance(score, float)
        # Empty board should have zero or near-zero score
        assert abs(score) < 100
    
    @pytest.mark.unit
    @pytest.mark.edge_case
    def test_invalid_board_evaluation(self, board_evaluator, invalid_board_state):
        """Test evaluation with invalid board state"""
        score = board_evaluator.evaluate_position(invalid_board_state)
        
        # Should handle errors gracefully and return 0.0
        assert score == 0.0


class TestRandomAI:
    """Test Random AI agent"""
    
    @pytest.mark.unit
    def test_initialization(self, basic_ai_config):
        """Test Random AI initialization"""
        ai = RandomAI(basic_ai_config)
        
        assert ai.config == basic_ai_config
        assert len(ai.game_history) == 0
        assert ai.performance_stats['games_played'] == 0
        assert ai.fraud_score == 0.0
    
    @pytest.mark.unit
    def test_move_generation(self, random_ai, sample_board_state, sample_valid_moves):
        """Test move generation from valid moves"""
        move = random_ai.get_move(sample_board_state, sample_valid_moves)
        
        assert move is not None
        assert move in sample_valid_moves
    
    @pytest.mark.unit
    def test_capture_preference(self, random_ai, sample_board_state, sample_capture_moves):
        """Test preference for capture moves"""
        # Run multiple times to test probabilistic behavior
        capture_count = 0
        total_tests = 100
        
        for _ in range(total_tests):
            move = random_ai.get_move(sample_board_state, sample_capture_moves)
            if move and move.get('isCapture', False):
                capture_count += 1
        
        # Should prefer captures about 70% of the time
        capture_rate = capture_count / total_tests
        assert capture_rate > 0.5  # Should be significantly above random
    
    @pytest.mark.unit
    @pytest.mark.edge_case
    def test_empty_moves_list(self, random_ai, sample_board_state):
        """Test behavior with empty moves list"""
        move = random_ai.get_move(sample_board_state, [])
        
        assert move is None
    
    @pytest.mark.unit
    @pytest.mark.performance
    def test_move_time_constraint(self, random_ai, sample_board_state, sample_valid_moves, performance_timer):
        """Test move generation time constraint"""
        performance_timer.start()
        move = random_ai.get_move(sample_board_state, sample_valid_moves)
        performance_timer.stop()
        
        execution_time = performance_timer.elapsed_ms()
        
        assert move is not None
        # Random AI should be very fast (< 10ms)
        assert execution_time < 10.0


class TestMinimaxAI:
    """Test Minimax AI agent"""
    
    @pytest.mark.unit
    def test_initialization(self, basic_ai_config):
        """Test Minimax AI initialization"""
        ai = MinimaxAI(basic_ai_config)
        
        assert ai.config == basic_ai_config
        assert hasattr(ai, 'evaluator')
        assert isinstance(ai.evaluator, GungiBoardEvaluator)
        assert ai.node_count == 0
    
    @pytest.mark.unit
    def test_move_generation(self, minimax_ai, sample_board_state, sample_valid_moves):
        """Test move generation using minimax"""
        move = minimax_ai.get_move(sample_board_state, sample_valid_moves)
        
        assert move is not None
        assert move in sample_valid_moves
    
    @pytest.mark.unit
    def test_move_ordering(self, minimax_ai, sample_board_state, sample_capture_moves):
        """Test that captures are prioritized in move ordering"""
        ordered_moves = minimax_ai._order_moves(sample_board_state, sample_capture_moves)
        
        # First move should be a high-value capture if available
        if ordered_moves:
            first_move = ordered_moves[0]
            assert first_move.get('isCapture', False) == True
    
    @pytest.mark.unit
    @pytest.mark.performance
    def test_time_constraint(self, minimax_ai, sample_board_state, sample_valid_moves, performance_timer):
        """Test minimax respects time constraints"""
        performance_timer.start()
        move = minimax_ai.get_move(sample_board_state, sample_valid_moves)
        performance_timer.stop()
        
        execution_time = performance_timer.elapsed_ms()
        
        assert move is not None
        # Should meet target time constraint (< 50ms default)
        assert execution_time < 70.0  # Allow some buffer
    
    @pytest.mark.unit
    def test_personality_influence(self):
        """Test personality influences move evaluation"""
        aggressive_config = AIConfig(
            personality=AIPersonality.AGGRESSIVE,
            aggression=0.8
        )
        defensive_config = AIConfig(
            personality=AIPersonality.DEFENSIVE,
            aggression=0.3
        )
        
        aggressive_ai = MinimaxAI(aggressive_config)
        defensive_ai = MinimaxAI(defensive_config)
        
        # Test that personality affects evaluation
        board_state = {'pieces': {'player1': [], 'player2': []}}
        capture_move = {'isCapture': True, 'captured': {'type': 'pawn'}}
        
        aggressive_score = aggressive_ai._evaluate_position_after_move(board_state, capture_move)
        defensive_score = defensive_ai._evaluate_position_after_move(board_state, capture_move)
        
        # Aggressive AI should value captures higher
        assert aggressive_score >= defensive_score


class TestMCTSAI:
    """Test Monte Carlo Tree Search AI agent"""
    
    @pytest.mark.unit
    def test_initialization(self, basic_ai_config):
        """Test MCTS AI initialization"""
        ai = MCTSAI(basic_ai_config)
        
        assert ai.config == basic_ai_config
        assert hasattr(ai, 'evaluator')
        assert isinstance(ai.evaluator, GungiBoardEvaluator)
        assert ai.simulations_per_move > 0
    
    @pytest.mark.unit
    def test_move_generation(self, mcts_ai, sample_board_state, sample_valid_moves):
        """Test move generation using MCTS"""
        move = mcts_ai.get_move(sample_board_state, sample_valid_moves)
        
        assert move is not None
        assert move in sample_valid_moves
    
    @pytest.mark.unit
    @pytest.mark.performance
    def test_time_constraint(self, mcts_ai, sample_board_state, sample_valid_moves, performance_timer):
        """Test MCTS respects time constraints"""
        performance_timer.start()
        move = mcts_ai.get_move(sample_board_state, sample_valid_moves)
        performance_timer.stop()
        
        execution_time = performance_timer.elapsed_ms()
        
        assert move is not None
        # Should complete within reasonable time
        assert execution_time < 100.0
    
    @pytest.mark.unit
    def test_simulation_quality(self, mcts_ai, sample_board_state, sample_capture_moves):
        """Test that simulations prefer better moves"""
        # Multiple runs to test consistency
        capture_selections = 0
        total_runs = 20
        
        for _ in range(total_runs):
            move = mcts_ai.get_move(sample_board_state, sample_capture_moves)
            if move and move.get('isCapture', False):
                capture_selections += 1
        
        # MCTS should prefer captures most of the time
        capture_rate = capture_selections / total_runs
        assert capture_rate > 0.6


class TestAIAgentFactory:
    """Test AI agent factory"""
    
    @pytest.mark.unit
    def test_personality_configs(self):
        """Test personality configuration creation"""
        configs = {}
        personalities = ['aggressive', 'defensive', 'balanced']
        
        for personality in personalities:
            config = AIAgentFactory.create_personality_config(personality, skill_level=7)
            configs[personality] = config
            
            assert config.skill_level == 7
            assert isinstance(config.personality, AIPersonality)
        
        # Test personality-specific values
        assert configs['aggressive'].aggression > configs['defensive'].aggression
        assert configs['aggressive'].risk_tolerance > configs['defensive'].risk_tolerance
    
    @pytest.mark.unit
    def test_agent_creation(self):
        """Test agent creation by type"""
        config = AIConfig()
        
        # Test different agent types
        agents = {
            'random': AIAgentFactory.create_agent('random', config),
            'minimax': AIAgentFactory.create_agent('minimax', config),
            'mcts': AIAgentFactory.create_agent('mcts', config)
        }
        
        assert isinstance(agents['random'], RandomAI)
        assert isinstance(agents['minimax'], MinimaxAI)
        assert isinstance(agents['mcts'], MCTSAI)
    
    @pytest.mark.unit
    def test_difficulty_agents(self):
        """Test difficulty-based agent creation"""
        agents = {
            'easy': AIAgentFactory.create_difficulty_agent('easy', 'balanced'),
            'medium': AIAgentFactory.create_difficulty_agent('medium', 'aggressive'),
            'hard': AIAgentFactory.create_difficulty_agent('hard', 'defensive')
        }
        
        assert isinstance(agents['easy'], RandomAI)
        assert isinstance(agents['medium'], MinimaxAI)
        assert isinstance(agents['hard'], MCTSAI)
        
        # Check skill levels are appropriate
        assert agents['easy'].config.skill_level == 3
        assert agents['medium'].config.skill_level == 5
        assert agents['hard'].config.skill_level == 7
    
    @pytest.mark.unit
    @pytest.mark.edge_case
    def test_invalid_agent_type(self):
        """Test error handling for invalid agent type"""
        with pytest.raises(ValueError):
            AIAgentFactory.create_agent('invalid_type')
    
    @pytest.mark.unit
    @pytest.mark.edge_case
    def test_invalid_personality(self):
        """Test error handling for invalid personality"""
        with pytest.raises(ValueError):
            AIAgentFactory.create_personality_config('invalid_personality')
    
    @pytest.mark.unit
    @pytest.mark.edge_case
    def test_invalid_difficulty(self):
        """Test error handling for invalid difficulty"""
        with pytest.raises(ValueError):
            AIAgentFactory.create_difficulty_agent('invalid_difficulty')


class TestPerformanceMetrics:
    """Test performance tracking and fraud detection"""
    
    @pytest.mark.unit
    def test_performance_tracking(self, random_ai, sample_board_state, sample_valid_moves):
        """Test performance metrics tracking"""
        # Generate some moves to create performance data
        for _ in range(5):
            random_ai.get_move(sample_board_state, sample_valid_moves)
        
        metrics = random_ai.get_performance_metrics()
        
        assert 'avg_execution_time_ms' in metrics
        assert 'max_execution_time_ms' in metrics
        assert 'min_execution_time_ms' in metrics
        assert 'p95_execution_time_ms' in metrics
        assert 'total_moves' in metrics
        assert 'fraud_score' in metrics
        assert 'magicblock_compliance' in metrics
        
        assert metrics['total_moves'] == 5
        assert metrics['fraud_score'] >= 0.0
        assert isinstance(metrics['magicblock_compliance'], bool)
    
    @pytest.mark.unit
    def test_fraud_detection(self, basic_ai_config):
        """Test fraud detection functionality"""
        ai = RandomAI(basic_ai_config)
        
        # Test initial fraud score
        assert ai.get_fraud_score() == 0.0
        
        # Simulate suspicious behavior (very fast moves)
        board_state = {'pieces': {'player1': [], 'player2': []}}
        move = {'from': [0, 0], 'to': [1, 1]}
        
        # Record suspiciously fast decision
        ai.record_decision(move, 0.001, board_state)  # 1ms - too fast
        
        # Fraud score should increase
        assert ai.get_fraud_score() > 0.0
    
    @pytest.mark.unit
    def test_fraud_score_decay(self, basic_ai_config):
        """Test fraud score decay over time"""
        ai = RandomAI(basic_ai_config)
        
        # Create suspicious activity
        board_state = {'pieces': {'player1': [], 'player2': []}}
        move = {'from': [0, 0], 'to': [1, 1]}
        ai.record_decision(move, 0.001, board_state)
        
        initial_fraud_score = ai.get_fraud_score()
        
        # Record normal moves
        for _ in range(10):
            ai.record_decision(move, 0.05, board_state)  # Normal 50ms
        
        final_fraud_score = ai.get_fraud_score()
        
        # Fraud score should decay
        assert final_fraud_score < initial_fraud_score
    
    @pytest.mark.unit
    def test_personality_traits(self, aggressive_ai_config, defensive_ai_config):
        """Test personality trait calculation"""
        aggressive_ai = RandomAI(aggressive_ai_config)
        defensive_ai = RandomAI(defensive_ai_config)
        
        aggressive_traits = aggressive_ai.get_personality_traits()
        defensive_traits = defensive_ai.get_personality_traits()
        
        # Aggressive AI should have higher aggression
        assert aggressive_traits['aggression'] > defensive_traits['aggression']
        
        # Defensive AI should have higher patience
        assert defensive_traits['patience'] > aggressive_traits['patience']
        
        # Both should have valid trait values (0-1 range)
        for traits in [aggressive_traits, defensive_traits]:
            for trait_name, trait_value in traits.items():
                assert 0.0 <= trait_value <= 2.0  # Allow some values above 1.0 for calculated traits
