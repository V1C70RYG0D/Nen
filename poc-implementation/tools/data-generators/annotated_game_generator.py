# Annotated Game Generator
# ========================
#
# This script generates complete annotated games using chess positions.
# Annotations include position evaluations and strategic patterns.
#
import os
import json
import pickle
import random
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
import chess
import chess.engine
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Path configuration
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "../training_data")
MODEL_PATH = os.getenv("MODEL_PATH", "../models/final_model.pth")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

@dataclass
class GameAnnotation:
    """Structured annotation for a game position"""
    move_number: int
    fen: str
    evaluation: float
    best_move: str
    strategic_pattern: str
    tactical_themes: List[str]
    complexity_score: float

@dataclass
class AnnotatedGame:
    """Complete annotated game structure"""
    game_id: str
    start_fen: str
    end_fen: str
    move_count: int
    game_result: str
    annotations: List[GameAnnotation]
    game_metrics: Dict[str, float]
    created_at: float

class MockAI:
    """Mock AI for generating moves when real AI is not available"""

    def __init__(self):
        self.evaluation_cache = {}

    def get_move(self, fen: str, legal_moves: List[chess.Move]) -> Optional[chess.Move]:
        """Get best move for position"""
        if not legal_moves:
            return None

        # Simple heuristic: prefer captures, then checks, then random
        board = chess.Board(fen)

        captures = [m for m in legal_moves if board.is_capture(m)]
        if captures:
            return random.choice(captures)

        checks = [m for m in legal_moves if board.gives_check(m)]
        if checks:
            return random.choice(checks)

        return random.choice(legal_moves)

    def evaluate_position(self, fen: str) -> float:
        """Evaluate position (simplified)"""
        if fen in self.evaluation_cache:
            return self.evaluation_cache[fen]

        board = chess.Board(fen)

        # Simple material evaluation
        piece_values = {
            chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
            chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0
        }

        white_material = sum(
            piece_values.get(piece.piece_type, 0)
            for piece in board.piece_map().values()
            if piece.color == chess.WHITE
        )

        black_material = sum(
            piece_values.get(piece.piece_type, 0)
            for piece in board.piece_map().values()
            if piece.color == chess.BLACK
        )

        evaluation = (white_material - black_material) / 10.0

        # Add positional factors
        if board.is_checkmate():
            evaluation = 10.0 if board.turn == chess.BLACK else -10.0
        elif board.is_check():
            evaluation += 0.5 if board.turn == chess.BLACK else -0.5

        self.evaluation_cache[fen] = evaluation
        return evaluation

# Initialize AI (with fallback to mock)
try:
    # Try to import real AI modules
    from neural_training import EnhancedNeuralAI
    from game_rules import GungiRules
    ai = EnhancedNeuralAI(config=None, model_path=MODEL_PATH)
    logger.info("Using real AI model")
except ImportError as e:
    logger.warning(f"Real AI not available, using mock AI: {e}")
    ai = MockAI()def generate_annotated_games(num_games: int = 500):
    logger.info(f"Starting game generation for {num_games} games")
    games = []

    for game_idx in range(num_games):
        logger.info(f"Generating game {game_idx + 1}")
        game = play_game_with_annotations()
        games.append(game)

    logger.info(f"Generated {len(games)} games")
    save_games(games)def play_game_with_annotations() -> Dict:
    board = Board()
    move_history = []
    game_annotations = []

    while not board.is_game_over() and len(move_history) < 200:
        valid_moves = list(board.legal_moves)
        best_move = ai.get_move(board.fen(), valid_moves)

        # Push move
        if best_move:
            board.push(best_move)
            move_history.append(board.fen())

        # Annotate
        position_value, strategic_pattern = annotate_position(board)
        game_annotations.append({
            'fen': board.fen(),
            'value': position_value,
            'pattern': strategic_pattern
        })

    return {
        'moves': move_history,
        'annotations': game_annotations
    }def annotate_position(board: Board) -> (float, str):
    # Use AI to evaluate the position
    board_tensor = torch.tensor([])  # Implement conversion to tensor
    _, value_estimate = ai.model.forward(board_tensor)
    position_value = value_estimate.item()

    # Determine strategic pattern
    if board.fullmove_number < 15:
        strategic_pattern = 'Opening'
    elif board.can_claim_draw():
        strategic_pattern = 'Endgame'
    else:
        strategic_pattern = 'Middlegame'

    return position_value, strategic_patterndef save_games(games: List[Dict]):
    file_path = Path(OUTPUT_DIR) / "annotated_games.pkl"
    with open(file_path, 'wb') as f:
        pickle.dump(games, f)
    logger.info(f"Games saved to {file_path}")if __name__ == "__main__":
    generate_annotated_games(500)

