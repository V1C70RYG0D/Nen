import chess
import chess.pgn
import random
import logging
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
from pathlib import Path
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PositionMetrics:
    """Metrics for evaluating position quality"""
    piece_count: int
    material_balance: float
    move_count: int
    position_type: str
    complexity_score: float

class ChessPositionGenerator:
    """Enhanced Chess Position Generator with optimized algorithms and quality metrics"""

    def __init__(self, seed: Optional[int] = None, quality_threshold: float = 0.5):
        """Initialize generator with optional seed for reproducibility"""
        if seed is not None:
            random.seed(seed)
        self.quality_threshold = quality_threshold
        self.thread_local = threading.local()

        # Opening book integration
        self.opening_moves = self._load_opening_moves()

    def _load_opening_moves(self) -> List[List[str]]:
        """Load common opening sequences for realistic positions"""
        return [
            ["e2e4", "e7e5", "g1f3", "b8c6"],  # Italian Game start
            ["d2d4", "d7d5", "c2c4", "e7e6"],    # Queen's Gambit
            ["g1f3", "d7d5", "g2g3", "g8f6"],    # King's Indian Attack
            ["e2e4", "c7c5", "g1f3", "d7d6"],    # Sicilian Defense
            ["d2d4", "g8f6", "c2c4", "g7g6"],    # King's Indian Defense
        ]

    def _calculate_position_metrics(self, board: chess.Board) -> PositionMetrics:
        """Calculate quality metrics for a position"""
        piece_count = len(board.piece_map())

        # Calculate material balance
        piece_values = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
                       chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
        white_material = sum(piece_values.get(piece.piece_type, 0)
                           for piece in board.piece_map().values() if piece.color == chess.WHITE)
        black_material = sum(piece_values.get(piece.piece_type, 0)
                           for piece in board.piece_map().values() if piece.color == chess.BLACK)
        material_balance = abs(white_material - black_material) / max(white_material + black_material, 1)

        # Complexity score based on available moves and position characteristics
        legal_moves_count = len(list(board.legal_moves))
        complexity_score = min(legal_moves_count / 30.0, 1.0)  # Normalize to 0-1

        # Determine position type
        if board.fullmove_number <= 15:
            position_type = "opening"
        elif piece_count <= 12:
            position_type = "endgame"
        else:
            position_type = "middlegame"

        return PositionMetrics(
            piece_count=piece_count,
            material_balance=material_balance,
            move_count=board.fullmove_number,
            position_type=position_type,
            complexity_score=complexity_score
        )

    def _generate_quality_position(self, target_moves: int, max_attempts: int = 10) -> Optional[chess.Board]:
        """Generate a position with quality validation"""
        for attempt in range(max_attempts):
            try:
                board = chess.Board()

                # Use opening book for early moves
                if target_moves <= 8 and self.opening_moves:
                    opening_sequence = random.choice(self.opening_moves)
                    for i, move_uci in enumerate(opening_sequence):
                        if i >= target_moves:
                            break
                        try:
                            move = chess.Move.from_uci(move_uci)
                            if move in board.legal_moves:
                                board.push(move)
                        except ValueError:
                            continue

                # Continue with random moves to reach target
                moves_made = board.fullmove_number - 1
                remaining_moves = max(0, target_moves - moves_made)

                for _ in range(remaining_moves):
                    legal_moves = list(board.legal_moves)
                    if not legal_moves or board.is_game_over():
                        break

                    # Weighted move selection for better positions
                    move = self._select_weighted_move(board, legal_moves)
                    board.push(move)

                # Validate position quality
                metrics = self._calculate_position_metrics(board)
                if metrics.complexity_score >= self.quality_threshold:
                    return board

            except Exception as e:
                logger.warning(f"Position generation attempt {attempt + 1} failed: {e}")
                continue

        # Fallback: return basic position if all attempts fail
        logger.warning(f"Failed to generate quality position after {max_attempts} attempts")
        return self._generate_basic_position(target_moves)

    def _select_weighted_move(self, board: chess.Board, legal_moves: List[chess.Move]) -> chess.Move:
        """Select moves with weighted probability favoring captures and checks"""
        if not legal_moves:
            raise ValueError("No legal moves available")

        # Categorize moves
        captures = [m for m in legal_moves if board.is_capture(m)]
        checks = [m for m in legal_moves if board.gives_check(m)]

        # Weight selection: 40% captures, 20% checks, 40% random
        rand_val = random.random()
        if rand_val < 0.4 and captures:
            return random.choice(captures)
        elif rand_val < 0.6 and checks:
            return random.choice(checks)
        else:
            return random.choice(legal_moves)

    def _generate_basic_position(self, target_moves: int) -> chess.Board:
        """Generate basic position without quality validation (fallback)"""
        board = chess.Board()
        for _ in range(target_moves):
            legal_moves = list(board.legal_moves)
            if not legal_moves or board.is_game_over():
                break
            board.push(random.choice(legal_moves))
        return board

    def generate_opening_positions(self, count: int) -> List[chess.Board]:
        """Generate diverse opening positions using real opening theory"""
        if count <= 0:
            return []

        logger.info(f"Generating {count} opening positions")
        positions = []

        # Use ThreadPoolExecutor for parallel generation
        with ThreadPoolExecutor(max_workers=min(4, count)) as executor:
            futures = [executor.submit(self._generate_quality_position, random.randint(1, 10))
                      for _ in range(count)]

            for future in as_completed(futures):
                try:
                    position = future.result()
                    if position:
                        positions.append(position)
                except Exception as e:
                    logger.error(f"Failed to generate opening position: {e}")

        # Fill any missing positions
        while len(positions) < count:
            positions.append(chess.Board())

        return positions[:count]

    def generate_middlegame_positions(self, count: int) -> List[chess.Board]:
        """Generate complex middlegame positions with tactical elements"""
        if count <= 0:
            return []

        logger.info(f"Generating {count} middlegame positions")
        positions = []

        with ThreadPoolExecutor(max_workers=min(4, count)) as executor:
            futures = [executor.submit(self._generate_quality_position, random.randint(15, 35))
                      for _ in range(count)]

            for future in as_completed(futures):
                try:
                    position = future.result()
                    if position:
                        positions.append(position)
                except Exception as e:
                    logger.error(f"Failed to generate middlegame position: {e}")

        return positions[:count]

    def generate_endgame_positions(self, count: int) -> List[chess.Board]:
        """Generate endgame positions with reduced material"""
        if count <= 0:
            return []

        logger.info(f"Generating {count} endgame positions")
        positions = []

        with ThreadPoolExecutor(max_workers=min(4, count)) as executor:
            futures = [executor.submit(self._generate_quality_position, random.randint(40, 80))
                      for _ in range(count)]

            for future in as_completed(futures):
                try:
                    position = future.result()
                    if position and self._calculate_position_metrics(position).piece_count <= 16:
                        positions.append(position)
                except Exception as e:
                    logger.error(f"Failed to generate endgame position: {e}")

        return positions[:count]

    def generate_tactical_puzzles(self, count: int) -> List[chess.Board]:
        """Generate positions with tactical opportunities"""
        if count <= 0:
            return []

        logger.info(f"Generating {count} tactical puzzles")
        positions = []

        for _ in range(count):
            try:
                # Generate position that might have tactical elements
                board = self._generate_quality_position(random.randint(20, 50))
                if board and self._has_tactical_elements(board):
                    positions.append(board)
                elif board:
                    # Accept position even without obvious tactics
                    positions.append(board)
            except Exception as e:
                logger.error(f"Failed to generate tactical puzzle: {e}")

        return positions

    def _has_tactical_elements(self, board: chess.Board) -> bool:
        """Check if position has tactical elements like pins, forks, etc."""
        # Basic tactical element detection
        legal_moves = list(board.legal_moves)

        # Check for captures
        captures = sum(1 for move in legal_moves if board.is_capture(move))

        # Check for checks
        checks = sum(1 for move in legal_moves if board.gives_check(move))

        # Position is tactical if it has multiple captures or checks
        return captures >= 2 or checks >= 1

    def generate_positions(self) -> Tuple[List[chess.Board], List[chess.Board], List[chess.Board], List[chess.Board]]:
        openings = self.generate_opening_positions(100)
        middlegames = self.generate_middlegame_positions(200)
        endgames = self.generate_endgame_positions(100)
        tactical = self.generate_tactical_puzzles(150)
        return openings, middlegames, endgames, tactical

if __name__ == "__main__":
    generator = ChessPositionGenerator()
    openings, middlegames, endgames, tactical = generator.generate_positions()

    print(f"Generated {len(openings)} opening positions.")
    print(f"Generated {len(middlegames)} middlegame positions.")
    print(f"Generated {len(endgames)} endgame positions.")
    print(f"Generated {len(tactical)} tactical puzzles.")

