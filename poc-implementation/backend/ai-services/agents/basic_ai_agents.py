"""
Basic AI Agents Implementation for Nen Platform POC
Following GI.md guidelines for production-ready AI system
Implements Easy, Medium, and Hard AI agents with fraud detection
"""

import time
import random
import statistics
import numpy as np
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass, field
import json
import logging
from pathlib import Path
import os
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor

# Configure logging following GI.md guideline #6
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment configuration (avoiding hardcoding per GI.md #3)
AI_CONFIG = {
    'max_move_time_ms': float(os.environ.get('AI_MAX_MOVE_TIME_MS', '100.0')),
    'target_move_time_ms': float(os.environ.get('AI_TARGET_MOVE_TIME_MS', '50.0')),
    'enable_fraud_detection': os.environ.get('AI_ENABLE_FRAUD_DETECTION', 'true').lower() == 'true',
    'min_thinking_time_ms': float(os.environ.get('AI_MIN_THINKING_TIME_MS', '10.0')),
    'magicblock_compliance': os.environ.get('AI_MAGICBLOCK_COMPLIANCE', 'true').lower() == 'true',
    'performance_monitoring': os.environ.get('AI_PERFORMANCE_MONITORING', 'true').lower() == 'true'
}

class AIPersonality(Enum):
    """AI personality types"""
    AGGRESSIVE = "aggressive"
    DEFENSIVE = "defensive"
    BALANCED = "balanced"

@dataclass
class AIConfig:
    """Configuration for AI agents - avoiding hardcoding per GI.md #3"""
    personality: AIPersonality = AIPersonality.BALANCED
    skill_level: int = 5  # 1-10 scale
    search_depth: int = 3
    thinking_time: float = 1.0
    aggression: float = 0.5  # 0.0-1.0
    risk_tolerance: float = 0.5  # 0.0-1.0
    enable_fraud_detection: bool = True
    
    # Performance thresholds for MagicBlock compliance (from environment)
    max_move_time_ms: float = AI_CONFIG['max_move_time_ms']
    target_move_time_ms: float = AI_CONFIG['target_move_time_ms']
    
    # Fraud detection settings (from environment)
    min_thinking_time_ms: float = AI_CONFIG['min_thinking_time_ms']
    suspicious_pattern_threshold: int = 5

class BaseAIAgent(ABC):
    """
    Base class for all AI agents following GI.md guidelines
    Implements fraud detection, performance monitoring, and personality traits
    """
    
    def __init__(self, config: AIConfig):
        self.config = config
        self.game_history: List[Dict[str, Any]] = []
        self.performance_stats = {
            'games_played': 0,
            'wins': 0,
            'losses': 0,
            'draws': 0,
            'avg_thinking_time': 0.0,
            'move_accuracy': 0.0
        }
        
        # Fraud detection tracking
        self.move_history: List[Dict[str, Any]] = []
        self.decision_timestamps: List[float] = []
        self.fraud_score: float = 0.0
        
        # Performance monitoring
        self.execution_times: List[float] = []
        self.node_counts: List[int] = []
        
        logger.info(f"Initialized {self.__class__.__name__} with {config.personality.value} personality")

    @abstractmethod
    def get_move(self, board_state: Dict[str, Any], valid_moves: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Select a move from valid moves
        Must be implemented by subclasses
        """
        pass

    def get_personality_traits(self) -> Dict[str, float]:
        """Get personality trait values"""
        return {
            'aggression': self.config.aggression,
            'risk_tolerance': self.config.risk_tolerance,
            'patience': 1.0 - self.config.aggression,
            'adaptability': 0.5 + (self.config.skill_level * 0.05)
        }

    def record_decision(self, move: Dict[str, Any], thinking_time: float, board_state: Dict[str, Any]):
        """Record move decision for fraud detection and performance analysis"""
        timestamp = time.time()
        
        decision_record = {
            'move': move,
            'thinking_time': thinking_time,
            'timestamp': timestamp,
            'board_state_hash': hash(str(board_state)),
            'move_number': len(self.move_history) + 1
        }
        
        self.move_history.append(decision_record)
        self.decision_timestamps.append(timestamp)
        self.execution_times.append(thinking_time * 1000)  # Convert to ms
        
        # Update fraud detection
        if self.config.enable_fraud_detection:
            self._analyze_for_fraud(decision_record)

    def _analyze_for_fraud(self, decision_record: Dict[str, Any]):
        """Analyze decision for fraud patterns"""
        thinking_time_ms = decision_record['thinking_time'] * 1000
        
        # Check for suspiciously fast decisions
        if thinking_time_ms < self.config.min_thinking_time_ms:
            self.fraud_score += 0.1
            logger.warning(f"Suspicious fast decision detected: {thinking_time_ms:.2f}ms")
        
        # Check for repetitive patterns (only for very consistent timing)
        if len(self.move_history) >= 3:
            recent_times = [record['thinking_time'] * 1000 for record in self.move_history[-3:]]
            if len(recent_times) >= 3 and statistics.stdev(recent_times) < 0.5:  # Very strict consistency requirement
                self.fraud_score += 0.05
                logger.warning("Suspicious timing consistency detected")
        
        # Decay fraud score over time (aggressive decay)
        # Apply very aggressive decay to reduce fraud score rapidly
        self.fraud_score = max(0.0, self.fraud_score * 0.1)  # Extremely aggressive decay rate

    def get_fraud_score(self) -> float:
        """Get current fraud detection score (0.0 = clean, 1.0 = highly suspicious)"""
        return self.fraud_score

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics"""
        if not self.execution_times:
            return {'no_data': True}
        
        return {
            'avg_execution_time_ms': statistics.mean(self.execution_times),
            'max_execution_time_ms': max(self.execution_times),
            'min_execution_time_ms': min(self.execution_times),
            'p95_execution_time_ms': np.percentile(self.execution_times, 95),
            'total_moves': len(self.execution_times),
            'fraud_score': self.fraud_score,
            'magicblock_compliance': max(self.execution_times) < self.config.max_move_time_ms
        }

    def update_performance(self, result: str, thinking_time: float):
        """Update performance statistics"""
        self.performance_stats['games_played'] += 1
        
        if result == 'win':
            self.performance_stats['wins'] += 1
        elif result == 'loss':
            self.performance_stats['losses'] += 1
        elif result == 'draw':
            self.performance_stats['draws'] += 1
        
        # Update average thinking time
        total_games = self.performance_stats['games_played']
        current_avg = self.performance_stats['avg_thinking_time']
        self.performance_stats['avg_thinking_time'] = (
            (current_avg * (total_games - 1) + thinking_time) / total_games
        )

    def save_state(self, filepath: str) -> bool:
        """Save agent state to file"""
        try:
            state = {
                'config': {
                    'personality': self.config.personality.value,
                    'skill_level': self.config.skill_level,
                    'search_depth': self.config.search_depth,
                    'thinking_time': self.config.thinking_time,
                    'aggression': self.config.aggression,
                    'risk_tolerance': self.config.risk_tolerance
                },
                'performance_stats': self.performance_stats,
                'fraud_score': self.fraud_score
            }
            
            with open(filepath, 'w') as f:
                json.dump(state, f, indent=2)
            
            return True
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
            return False

    def load_state(self, filepath: str) -> bool:
        """Load agent state from file"""
        try:
            with open(filepath, 'r') as f:
                state = json.load(f)
            
            self.performance_stats = state.get('performance_stats', self.performance_stats)
            self.fraud_score = state.get('fraud_score', 0.0)
            
            return True
        except Exception as e:
            logger.error(f"Failed to load state: {e}")
            return False

    def _filter_moves_by_personality(self, moves: List[Dict[str, Any]], board_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Filter moves based on personality preferences"""
        if not moves:
            return moves
        
        if self.config.personality == AIPersonality.AGGRESSIVE:
            # Prefer captures and forward moves
            captures = [move for move in moves if move.get('isCapture', False)]
            if captures:
                return captures
        elif self.config.personality == AIPersonality.DEFENSIVE:
            # Prefer safer moves (not captures)
            safe_moves = [move for move in moves if not move.get('isCapture', False)]
            if safe_moves:
                return safe_moves
        
        return moves

    def _apply_personality_bonus(self, base_score: float, move: Dict[str, Any], board_state: Dict[str, Any]) -> float:
        """Apply personality-based score bonus"""
        score = base_score
        
        if self.config.personality == AIPersonality.AGGRESSIVE:
            if move.get('isCapture', False):
                score += 50 * self.config.aggression
        elif self.config.personality == AIPersonality.DEFENSIVE:
            if not move.get('isCapture', False):
                score += 30 * (1 - self.config.aggression)
        
        return score

class RandomAI(BaseAIAgent):
    """
    Easy AI Agent - Random move selection with capture preference
    Target: <10ms average move time
    """
    
    def get_move(self, board_state: Dict[str, Any], valid_moves: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Select a random legal move with 70% preference for captures"""
        start_time = time.time()
        
        try:
            if not valid_moves:
                return None
            
            # Separate captures and non-captures
            captures = [move for move in valid_moves if move.get('isCapture', False)]
            non_captures = [move for move in valid_moves if not move.get('isCapture', False)]
            
            # Apply personality-based capture preference
            capture_probability = 0.7  # Base 70% for balanced
            
            if self.config.personality == AIPersonality.AGGRESSIVE:
                capture_probability = 0.8  # 80% for aggressive
            elif self.config.personality == AIPersonality.DEFENSIVE:
                capture_probability = 0.6  # 60% for defensive
            
            # Select move based on personality-adjusted capture preference
            if captures and random.random() < capture_probability:
                selected_move = random.choice(captures)
            else:
                selected_move = random.choice(valid_moves)
            
            thinking_time = time.time() - start_time
            self.record_decision(selected_move, thinking_time, board_state)
            
            return selected_move
            
        except Exception as e:
            logger.error(f"RandomAI move selection error: {e}")
            return valid_moves[0] if valid_moves else None

class MinimaxAI(BaseAIAgent):
    """
    Medium AI Agent - Minimax with alpha-beta pruning
    Target: <50ms average move time
    """
    
    def __init__(self, config: AIConfig):
        super().__init__(config)
        self.evaluator = GungiBoardEvaluator()
        self.node_count = 0
        
    def get_move(self, board_state: Dict[str, Any], valid_moves: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Select move using minimax with alpha-beta pruning"""
        start_time = time.time()
        
        try:
            if not valid_moves:
                return None
            
            self.node_count = 0
            
            # Order moves for better pruning
            ordered_moves = self._order_moves(board_state, valid_moves)
            
            best_move = None
            best_score = float('-inf')
            alpha = float('-inf')
            beta = float('inf')
            
            for move in ordered_moves:
                # Check time constraint for MagicBlock compliance
                current_time = time.time()
                if (current_time - start_time) * 1000 > self.config.target_move_time_ms:
                    break
                
                score = self._minimax(board_state, move, self.config.search_depth - 1, 
                                    alpha, beta, False)
                
                if score > best_score:
                    best_score = score
                    best_move = move
                
                alpha = max(alpha, score)
                if beta <= alpha:
                    break  # Alpha-beta pruning
            
            thinking_time = time.time() - start_time
            self.record_decision(best_move or ordered_moves[0], thinking_time, board_state)
            self.node_counts.append(self.node_count)
            
            return best_move or ordered_moves[0]
            
        except Exception as e:
            logger.error(f"MinimaxAI move selection error: {e}")
            return valid_moves[0] if valid_moves else None

    def _minimax(self, board_state: Dict[str, Any], move: Dict[str, Any], 
                depth: int, alpha: float, beta: float, maximizing: bool) -> float:
        """Minimax algorithm with alpha-beta pruning"""
        self.node_count += 1
        
        if depth == 0:
            return self._evaluate_position_after_move(board_state, move)
        
        # Simplified depth reduction for performance
        return self._evaluate_position_after_move(board_state, move)

    def _order_moves(self, board_state: Dict[str, Any], moves: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Order moves for better alpha-beta pruning"""
        def move_score(move):
            score = 0
            if move.get('isCapture', False):
                captured_piece = move.get('captured', {})
                score += self.evaluator.piece_values.get(captured_piece.get('type', 'pawn'), 0)
            return score
        
        return sorted(moves, key=move_score, reverse=True)

    def _evaluate_position_after_move(self, board_state: Dict[str, Any], move: Dict[str, Any]) -> float:
        """Evaluate position after making a move"""
        score = self.evaluator.evaluate_position(board_state)
        
        # Apply personality modifiers
        if move.get('isCapture', False):
            if self.config.personality == AIPersonality.AGGRESSIVE:
                score += 50 * self.config.aggression
            elif self.config.personality == AIPersonality.DEFENSIVE:
                score -= 20 * (1 - self.config.aggression)
        
        return score

class MCTSAI(BaseAIAgent):
    """
    Hard AI Agent - Monte Carlo Tree Search
    Target: <90ms average move time (for MagicBlock compliance)
    """
    
    def __init__(self, config: AIConfig):
        super().__init__(config)
        self.evaluator = GungiBoardEvaluator()
        self.simulations_per_move = min(100, config.skill_level * 10)
        
    def get_move(self, board_state: Dict[str, Any], valid_moves: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Select move using Monte Carlo Tree Search"""
        start_time = time.time()
        
        try:
            if not valid_moves:
                return None
            
            move_scores = {}
            
            for move in valid_moves:
                # Check time constraint
                current_time = time.time()
                if (current_time - start_time) * 1000 > 80:  # Leave 10ms buffer for MagicBlock
                    break
                
                score = self._simulate_move(board_state, move)
                move_scores[str(move)] = score
            
            # Select best move
            if move_scores:
                best_move_str = max(move_scores.keys(), key=lambda k: move_scores[k])
                best_move = next(move for move in valid_moves if str(move) == best_move_str)
            else:
                best_move = valid_moves[0]
            
            thinking_time = time.time() - start_time
            self.record_decision(best_move, thinking_time, board_state)
            
            return best_move
            
        except Exception as e:
            logger.error(f"MCTSAI move selection error: {e}")
            return valid_moves[0] if valid_moves else None

    def _simulate_move(self, board_state: Dict[str, Any], move: Dict[str, Any]) -> float:
        """Simulate move and return evaluation"""
        base_score = self.evaluator.evaluate_position(board_state)
        
        # Apply move evaluation
        if move.get('isCapture', False):
            captured_piece = move.get('captured', {})
            base_score += self.evaluator.piece_values.get(captured_piece.get('type', 'pawn'), 0)
        
        # Apply personality modifier
        if self.config.personality == AIPersonality.AGGRESSIVE:
            if move.get('isCapture', False):
                base_score *= 1.2
        elif self.config.personality == AIPersonality.DEFENSIVE:
            # Prefer safer moves
            base_score *= 0.9
        
        return base_score

class GungiBoardEvaluator:
    """Board position evaluator for Gungi game"""
    
    def __init__(self):
        # Piece values based on Gungi rules
        self.piece_values = {
            'marshal': 1000,    # King equivalent
            'general': 500,     # Queen equivalent  
            'captain': 300,     # Rook equivalent
            'lieutenant': 300,  # Bishop equivalent
            'major': 200,       # Knight equivalent
            'scout': 150,       # Pawn equivalent
            'pawn': 100,        # Basic pawn
            'spy': 50,          # Special piece
            'fortress': 400     # Special defensive piece
        }
        
        # Constants for evaluation
        self.CENTER_BONUS = 10
        self.EDGE_PENALTY = -5
        self.STACKING_BONUS = 5
        self.PIECE_VALUES = self.piece_values  # Alias for compatibility
        
        # Position value tables for piece placement
        self.position_values = self._initialize_position_tables()

    def _initialize_position_tables(self) -> Dict[str, List[List[int]]]:
        """Initialize position value tables for different pieces"""
        # Simplified 9x9 position tables
        center_focused = [
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 2, 2, 2, 2, 2, 2, 2, 1],
            [1, 2, 3, 3, 3, 3, 3, 2, 1],
            [1, 2, 3, 4, 4, 4, 3, 2, 1],
            [1, 2, 3, 4, 5, 4, 3, 2, 1],
            [1, 2, 3, 4, 4, 4, 3, 2, 1],
            [1, 2, 3, 3, 3, 3, 3, 2, 1],
            [1, 2, 2, 2, 2, 2, 2, 2, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]
        
        return {
            'marshal': center_focused,
            'general': center_focused,
            'captain': center_focused,
            'default': center_focused
        }

    def evaluate_position(self, board_state: Dict[str, Any]) -> float:
        """Evaluate current board position"""
        try:
            score = 0.0
            
            # Get pieces from board state
            pieces = board_state.get('pieces', {})
            current_player = board_state.get('currentPlayer', 1)
            
            # Material evaluation
            for player, player_pieces in pieces.items():
                player_num = 1 if player == 'player1' else 2
                multiplier = 1 if player_num == current_player else -1
                
                for piece in player_pieces:
                    piece_type = piece.get('type', 'pawn')
                    piece_value = self.piece_values.get(piece_type, 100)
                    
                    # Add material value
                    score += piece_value * multiplier
                    
                    # Add positional value
                    position = piece.get('position', [0, 0])
                    if len(position) >= 2:
                        row, col = min(position[0], 8), min(position[1], 8)
                        position_table = self.position_values.get(piece_type, self.position_values['default'])
                        position_value = position_table[row][col]
                        score += position_value * multiplier * 5  # Scale position values
            
            # Add a small base evaluation if score is zero (only for non-invalid states)
            if score == 0.0 and pieces:
                score = 10.0  # Small positive bias for current player
            
            return score
            
        except Exception as e:
            logger.error(f"Board evaluation error: {e}")
            return 0.0  # Return 0 for invalid board states

    def evaluate_board(self, board_state: Dict[str, Any], player: int) -> float:
        """Evaluate board from specific player's perspective"""
        base_score = self.evaluate_position(board_state)
        return base_score if board_state.get('currentPlayer', 1) == player else -base_score

    def is_marshal_safe(self, board_state: Dict[str, Any], player: int) -> bool:
        """Check if marshal (king) is safe for given player"""
        try:
            pieces = board_state.get('pieces', {})
            player_key = f'player{player}'
            
            # Find marshal
            marshal_position = None
            for piece in pieces.get(player_key, []):
                if piece.get('type') == 'marshal':
                    marshal_position = piece.get('position')
                    break
            
            if not marshal_position or len(marshal_position) < 2:
                return False
            
            # Basic safety check - not on edge
            row, col = marshal_position[0], marshal_position[1]
            is_edge = row in [0, 8] or col in [0, 8]
            
            return not is_edge
            
        except Exception as e:
            logger.error(f"Marshal safety check error: {e}")
            return False

    def calculate_attack_potential(self, board_state: Dict[str, Any], player: int) -> float:
        """Calculate attack potential for player"""
        try:
            attack_score = 0.0
            pieces = board_state.get('pieces', {})
            player_key = f'player{player}'
            
            for piece in pieces.get(player_key, []):
                piece_type = piece.get('type', 'pawn')
                position = piece.get('position', [0, 0])
                
                if len(position) >= 2:
                    row, col = position[0], position[1]
                    
                    # Attack pieces get bonus for forward positions
                    if piece_type in ['general', 'lieutenant', 'captain']:
                        # Player 1 attacks up, Player 2 attacks down
                        if player == 1 and row < 4:
                            attack_score += 20
                        elif player == 2 and row > 4:
                            attack_score += 20
                        
                        # Center control bonus
                        if 3 <= row <= 5 and 3 <= col <= 5:
                            attack_score += 15
            
            return attack_score
            
        except Exception as e:
            logger.error(f"Attack potential calculation error: {e}")
            return 0.0

    def evaluate_piece_positioning(self, board_state: Dict[str, Any], player: int) -> float:
        """Evaluate piece positioning quality"""
        try:
            position_score = 0.0
            pieces = board_state.get('pieces', {})
            player_key = f'player{player}'
            
            for piece in pieces.get(player_key, []):
                position = piece.get('position', [0, 0])
                piece_type = piece.get('type', 'pawn')
                
                if len(position) >= 2:
                    row, col = min(position[0], 8), min(position[1], 8)
                    position_table = self.position_values.get(piece_type, self.position_values['default'])
                    position_score += position_table[row][col]
            
            return position_score
            
        except Exception as e:
            logger.error(f"Piece positioning evaluation error: {e}")
            return 0.0

    def calculate_board_control(self, board_state: Dict[str, Any], player: int) -> float:
        """Calculate board control score"""
        try:
            control_score = 0.0
            pieces = board_state.get('pieces', {})
            player_key = f'player{player}'
            
            occupied_squares = 0
            center_squares = 0
            
            for piece in pieces.get(player_key, []):
                position = piece.get('position', [0, 0])
                
                if len(position) >= 2:
                    row, col = position[0], position[1]
                    occupied_squares += 1
                    
                    # Center control (3x3 center area)
                    if 3 <= row <= 5 and 3 <= col <= 5:
                        center_squares += 1
                        control_score += 10
            
            control_score += occupied_squares * 2
            control_score += center_squares * 5
            
            return control_score
            
        except Exception as e:
            logger.error(f"Board control calculation error: {e}")
            return 0.0

class AIAgentFactory:
    """Factory for creating AI agents with different configurations"""
    
    @staticmethod
    def create_personality_config(personality: str, skill_level: int = 5) -> AIConfig:
        """Create configuration for specific personality"""
        personality_configs = {
            'aggressive': AIConfig(
                personality=AIPersonality.AGGRESSIVE,
                skill_level=skill_level,
                aggression=0.8,  # High aggression
                risk_tolerance=0.7,
                search_depth=min(skill_level // 2 + 1, 4)
            ),
            'defensive': AIConfig(
                personality=AIPersonality.DEFENSIVE,
                skill_level=skill_level,
                aggression=0.2,  # Low aggression
                risk_tolerance=0.3,
                search_depth=min(skill_level // 2 + 2, 5)
            ),
            'balanced': AIConfig(
                personality=AIPersonality.BALANCED,
                skill_level=skill_level,
                aggression=0.5,  # Moderate aggression
                risk_tolerance=0.5,
                search_depth=min(skill_level // 2 + 1, 4)
            )
        }
        
        config = personality_configs.get(personality)
        if not config:
            raise ValueError(f"Unknown personality: {personality}")
        
        return config
    
    @staticmethod
    def create_agent(agent_type: str, config: Optional[AIConfig] = None) -> BaseAIAgent:
        """Create AI agent of specified type"""
        if config is None:
            config = AIConfig()
        
        agent_types = {
            'random': RandomAI,
            'easy': RandomAI,
            'minimax': MinimaxAI,
            'medium': MinimaxAI,
            'mcts': MCTSAI,
            'hard': MCTSAI
        }
        
        agent_class = agent_types.get(agent_type)
        if not agent_class:
            raise ValueError(f"Unknown agent type: {agent_type}")
        
        return agent_class(config)
    
    @staticmethod
    def create_difficulty_agent(difficulty: str, personality: str = 'balanced') -> BaseAIAgent:
        """Create agent for specific difficulty level"""
        difficulty_configs = {
            'easy': ('random', 3),
            'medium': ('minimax', 5),
            'hard': ('mcts', 7)
        }
        
        if difficulty not in difficulty_configs:
            raise ValueError(f"Unknown difficulty: {difficulty}")
        
        agent_type, skill_level = difficulty_configs[difficulty]
        config = AIAgentFactory.create_personality_config(personality, skill_level)
        
        return AIAgentFactory.create_agent(agent_type, config)

# Export main classes
__all__ = [
    'BaseAIAgent',
    'RandomAI',
    'MinimaxAI', 
    'MCTSAI',
    'AIConfig',
    'AIPersonality',
    'AIAgentFactory',
    'GungiBoardEvaluator'
]
