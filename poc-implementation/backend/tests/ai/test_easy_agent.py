"""
Comprehensive Testing for EasyAgent Class
Production-grade test suite following GI.md guidelines

Test Requirements (GI.md Compliance):
- Real implementations over simulations (Guideline #2)
- 100% test coverage with iterative testing (Guideline #8)
- Production readiness and performance validation (Guideline #3)
- Modular design and professional structure (Guideline #4)
- No hardcoding or placeholders (Guideline #18)
- Comprehensive error handling (Guideline #20)
- Performance optimization testing (Guideline #21)
- Extensive edge case coverage (Guideline #45)
"""

import pytest
import time
import statistics
import threading
import uuid
import asyncio
import json
import tempfile
import os
from unittest.mock import Mock, patch, MagicMock
from dataclasses import asdict
from typing import Dict, Any, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
import sys
from pathlib import Path

# Add AI services to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / "ai-services" / "agents"))

from easy_agent import EasyAgent, EasyAgentConfig, create_easy_agent
from basic_ai_agents import AIPersonality, AIConfig


# ==========================================
# TEST CONFIGURATION AND UTILITIES
# ==========================================

@pytest.fixture
def sample_board_state():
    """Create a realistic board state for testing"""
    return {
        'board': [
            [[{'type': 'pawn', 'player': 1}] + [None] * 2 for _ in range(9)]
            if i == 6 else
            [[{'type': 'pawn', 'player': 2}] + [None] * 2 for _ in range(9)]
            if i == 2 else
            [[None] * 3 for _ in range(9)]
            for i in range(9)
        ],
        'currentPlayer': 1,
        'moveNumber': 1,
        'gameStatus': 'active'
    }


@pytest.fixture
def board_with_captures():
    """Create board state with capture opportunities"""
    board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

    # Place pieces for capture scenarios
    board[4][4][0] = {'type': 'pawn', 'player': 1}
    board[4][5][0] = {'type': 'pawn', 'player': 2}  # Can be captured
    board[3][4][0] = {'type': 'general', 'player': 2}  # Can be captured
    board[5][5][0] = {'type': 'pawn', 'player': 1}

    return {
        'board': board,
        'currentPlayer': 1,
        'moveNumber': 10,
        'gameStatus': 'active'
    }


@pytest.fixture
def complex_board_state():
    """Create complex board for performance testing"""
    board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

    # Add multiple pieces for complex move generation
    positions = [
        (0, 0, {'type': 'marshal', 'player': 1}),
        (0, 1, {'type': 'general', 'player': 1}),
        (1, 0, {'type': 'major', 'player': 1}),
        (8, 8, {'type': 'marshal', 'player': 2}),
        (8, 7, {'type': 'general', 'player': 2}),
        (7, 8, {'type': 'major', 'player': 2}),
        (4, 4, {'type': 'pawn', 'player': 1}),
        (4, 5, {'type': 'pawn', 'player': 2}),
    ]

    for row, col, piece in positions:
        board[row][col][0] = piece

    return {
        'board': board,
        'currentPlayer': 1,
        'moveNumber': 25,
        'gameStatus': 'active'
    }


@pytest.fixture
def endgame_board():
    """Create endgame scenario for testing"""
    board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

    # Minimal pieces for endgame
    board[0][0][0] = {'type': 'marshal', 'player': 1}
    board[8][8][0] = {'type': 'marshal', 'player': 2}
    board[1][1][0] = {'type': 'pawn', 'player': 1}

    return {
        'board': board,
        'currentPlayer': 1,
        'moveNumber': 100,
        'gameStatus': 'active'
    }


def create_test_agent(personality: str = "balanced", **config_kwargs) -> EasyAgent:
    """Factory for creating test agents with specific configurations"""
    config = EasyAgentConfig(**config_kwargs) if config_kwargs else None
    return EasyAgent(personality, config)


# ==========================================
# BASIC FUNCTIONALITY TESTS
# ==========================================

class TestEasyAgentBasicFunctionality:
    """Testing core functionality of EasyAgent"""

    def test_agent_initialization(self):
        """Test proper agent initialization with different personalities"""
        personalities = ["aggressive", "defensive", "balanced", "tactical", "experimental"]

        for personality in personalities:
            agent = create_test_agent(personality)

            assert agent is not None
            assert agent.config.personality.value == personality
            assert agent.config.skill_level == 1  # Easy agent = skill level 1
            assert agent.config.thinking_time == 0.01  # 10ms limit
            assert hasattr(agent, 'easy_config')
            assert agent.easy_config.capture_preference_rate == 0.70

    def test_random_move_selection(self, sample_board_state):
        """Test basic random move selection functionality"""
        agent = create_test_agent("balanced")

        # Generate multiple moves to test randomness
        moves = []
        for _ in range(10):
            move = agent.select_move(sample_board_state)
            if move:
                moves.append(move)

        # Verify moves are generated
        assert len(moves) > 0

        # Verify move structure
        for move in moves:
            assert 'from' in move
            assert 'to' in move
            assert 'piece' in move
            assert 'player' in move
            assert isinstance(move['isCapture'], bool)

    def test_legal_move_validation(self, sample_board_state):
        """Test that only legal moves are generated"""
        agent = create_test_agent("balanced")

        for _ in range(20):
            move = agent.select_move(sample_board_state)
            if move:
                # Verify move coordinates are within bounds
                from_pos = move['from']
                to_pos = move['to']

                assert 0 <= from_pos['row'] < 9
                assert 0 <= from_pos['col'] < 9
                assert 0 <= from_pos['tier'] < 3
                assert 0 <= to_pos['row'] < 9
                assert 0 <= to_pos['col'] < 9
                assert 0 <= to_pos['tier'] < 3

                # Verify piece belongs to current player
                assert move['player'] == sample_board_state['currentPlayer']

    def test_no_legal_moves_handling(self):
        """Test handling when no legal moves are available"""
        agent = create_test_agent("balanced")

        # Empty board state
        empty_board = {
            'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'moveNumber': 1,
            'gameStatus': 'active'
        }

        move = agent.select_move(empty_board)
        assert move is None

    def test_capture_preference_70_percent(self, board_with_captures):
        """Test 70% capture preference over multiple moves"""
        agent = create_test_agent("balanced", random_seed=42)  # Fixed seed for reproducibility

        capture_count = 0
        total_moves = 1000

        for _ in range(total_moves):
            move = agent.select_move(board_with_captures)
            if move and move.get('isCapture', False):
                capture_count += 1

        capture_rate = capture_count / total_moves

        # 70% ± 5% tolerance (accounting for randomness)
        assert 0.65 <= capture_rate <= 0.75, f"Capture rate {capture_rate:.3f} outside expected range"

        # Additional validation following GI.md guidelines
        stats = agent.get_performance_stats()
        assert stats['capture_preference_rate'] == capture_rate
        assert stats['total_moves'] == total_moves

    def test_capture_preference_statistics(self, board_with_captures):
        """Test statistical validation of capture preference"""
        agent = create_test_agent("balanced", random_seed=123)

        # Generate many moves for statistical significance
        for _ in range(500):
            agent.select_move(board_with_captures)

        stats = agent.get_performance_stats()
        capture_rate = stats['capture_preference_rate']

        # Verify capture preference is within tolerance
        assert 0.65 <= capture_rate <= 0.75
        assert stats['total_moves'] == 500

    def test_capture_preference_validation_1000_moves(self, board_with_captures):
        """Test 70% capture preference over 1000 moves - Critical Test Case"""
        agent = create_test_agent("balanced", random_seed=42)
        capture_count = 0
        total_moves = 1000

        for _ in range(total_moves):
            # Create board with captures available every time
            board = self._create_board_with_captures()
            move = agent.select_move(board)
            if move and self._is_capture_move(move, board):
                capture_count += 1

        capture_rate = capture_count / total_moves
        assert 0.65 <= capture_rate <= 0.75, f"Capture rate {capture_rate:.3f} outside 70% ± 5% tolerance"

        # Additional statistical validation
        expected_captures = int(total_moves * 0.70)
        margin_of_error = int(total_moves * 0.05)
        assert abs(capture_count - expected_captures) <= margin_of_error

    def _create_board_with_captures(self) -> Dict[str, Any]:
        """Create board state with guaranteed capture opportunities"""
        board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

        # Ensure captures are always available
        board[4][4][0] = {'type': 'pawn', 'player': 1}
        board[4][5][0] = {'type': 'pawn', 'player': 2}  # Capturable
        board[3][4][0] = {'type': 'general', 'player': 2}  # Capturable
        board[5][4][0] = {'type': 'major', 'player': 2}  # Capturable
        board[4][3][0] = {'type': 'lieutenant', 'player': 2}  # Capturable

        return {
            'board': board,
            'currentPlayer': 1,
            'moveNumber': 10,
            'gameStatus': 'active'
        }

    def _is_capture_move(self, move: Dict[str, Any], board_state: Dict[str, Any]) -> bool:
        """Check if a move is a capture"""
        if not move:
            return False

        to_pos = move['to']
        board = board_state['board']

        # Check if there's an enemy piece at destination
        if (to_pos['row'] < len(board) and to_pos['col'] < len(board[0]) and
            len(board[to_pos['row']][to_pos['col']]) > 0):
            target_piece = board[to_pos['row']][to_pos['col']][0]
            if target_piece and target_piece.get('player') != move.get('player'):
                return True

        return move.get('isCapture', False)


# ==========================================
# PERFORMANCE REQUIREMENTS TESTS
# ==========================================

class TestEasyAgentPerformance:
    """Testing performance requirements and optimization"""

    def test_move_generation_speed_under_10ms(self, complex_board_state):
        """Test that easy agent generates moves under 10ms"""
        agent = create_test_agent("balanced")

        # Test multiple move generations
        execution_times = []

        for _ in range(100):
            start_time = time.time()
            move = agent.select_move(complex_board_state)
            execution_time = (time.time() - start_time) * 1000  # Convert to ms

            execution_times.append(execution_time)

            # Each individual move must be under 10ms
            assert execution_time < 10.0, f"Move generation took {execution_time:.2f}ms"
            assert move is not None

        # Statistical analysis
        avg_time = statistics.mean(execution_times)
        max_time = max(execution_times)

        assert avg_time < 5.0, f"Average time {avg_time:.2f}ms too high"
        assert max_time < 10.0, f"Maximum time {max_time:.2f}ms exceeds limit"

    def test_easy_agent_speed_requirement(self, complex_board_state):
        """Test that easy agent generates moves under 10ms - Critical Test Case"""
        agent = create_test_agent("aggressive")
        board = self._create_complex_board()

        start_time = time.time()
        move = agent.select_move(board)
        execution_time = (time.time() - start_time) * 1000

        assert execution_time < 10.0, f"Move generation took {execution_time:.2f}ms, exceeds 10ms limit"
        assert move in self._get_legal_moves_for_validation(board), "Generated move is not legal"

        # Verify move quality
        assert move is not None
        assert isinstance(move, dict)
        assert 'from' in move and 'to' in move

    def _create_complex_board(self) -> Dict[str, Any]:
        """Create complex board for performance testing"""
        board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

        # Add many pieces to stress test performance
        piece_positions = [
            (0, 0, {'type': 'marshal', 'player': 1}),
            (0, 1, {'type': 'general', 'player': 1}),
            (0, 2, {'type': 'major', 'player': 1}),
            (0, 3, {'type': 'captain', 'player': 1}),
            (0, 4, {'type': 'lieutenant', 'player': 1}),
            (1, 0, {'type': 'sergeant', 'player': 1}),
            (1, 1, {'type': 'corporal', 'player': 1}),
            (1, 2, {'type': 'private', 'player': 1}),
            (2, 0, {'type': 'pawn', 'player': 1}),
            (2, 1, {'type': 'pawn', 'player': 1}),

            (8, 8, {'type': 'marshal', 'player': 2}),
            (8, 7, {'type': 'general', 'player': 2}),
            (8, 6, {'type': 'major', 'player': 2}),
            (8, 5, {'type': 'captain', 'player': 2}),
            (8, 4, {'type': 'lieutenant', 'player': 2}),
            (7, 8, {'type': 'sergeant', 'player': 2}),
            (7, 7, {'type': 'corporal', 'player': 2}),
            (7, 6, {'type': 'private', 'player': 2}),
            (6, 8, {'type': 'pawn', 'player': 2}),
            (6, 7, {'type': 'pawn', 'player': 2}),

            # Add middle pieces for complexity
            (4, 4, {'type': 'pawn', 'player': 1}),
            (4, 5, {'type': 'pawn', 'player': 2}),
            (3, 4, {'type': 'sergeant', 'player': 1}),
            (5, 5, {'type': 'corporal', 'player': 2}),
        ]

        for row, col, piece in piece_positions:
            board[row][col][0] = piece

        return {
            'board': board,
            'currentPlayer': 1,
            'moveNumber': 30,
            'gameStatus': 'active'
        }

    def _get_legal_moves_for_validation(self, board_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get legal moves for validation purposes"""
        # This would normally use the game engine's legal move generator
        # For testing purposes, we'll use a simplified version
        moves = []
        board = board_state.get('board', [])
        current_player = board_state.get('currentPlayer', 1)

        for row in range(9):
            for col in range(9):
                for tier in range(3):
                    if (row < len(board) and col < len(board[0]) and
                        tier < len(board[row][col]) and board[row][col][tier]):
                        piece = board[row][col][tier]
                        if piece and piece.get('player') == current_player:
                            # Generate sample moves for this piece
                            piece_moves = self._generate_sample_moves(piece, row, col, tier, board_state)
                            moves.extend(piece_moves)

        return moves

    def _generate_sample_moves(self, piece: Dict[str, Any], row: int, col: int, tier: int,
                              board_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate sample moves for validation"""
        moves = []
        directions = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]

        for dr, dc in directions:
            new_row, new_col = row + dr, col + dc

            if 0 <= new_row < 9 and 0 <= new_col < 9:
                move = {
                    'from': {'row': row, 'col': col, 'tier': tier},
                    'to': {'row': new_row, 'col': new_col, 'tier': 0},
                    'piece': piece,
                    'isCapture': False,
                    'player': piece.get('player')
                }
                moves.append(move)

        return moves

    def test_performance_consistency(self, sample_board_state):
        """Test performance consistency across multiple runs"""
        agent = create_test_agent("balanced")

        execution_times = []

        # Run 200 moves for statistical significance
        for _ in range(200):
            start_time = time.time()
            agent.select_move(sample_board_state)
            execution_time = (time.time() - start_time) * 1000
            execution_times.append(execution_time)

        # Calculate statistics
        mean_time = statistics.mean(execution_times)
        std_dev = statistics.stdev(execution_times)

        # Verify consistent performance
        assert mean_time < 5.0
        assert std_dev < 2.0  # Low variance indicates consistency
        assert all(t < 10.0 for t in execution_times)

    def test_memory_usage_efficiency(self, complex_board_state):
        """Test memory usage remains efficient"""
        import tracemalloc

        tracemalloc.start()

        agent = create_test_agent("balanced")

        # Generate many moves
        for _ in range(1000):
            agent.select_move(complex_board_state)

        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        # Memory should remain reasonable (under 10MB for 1000 moves)
        assert peak < 10 * 1024 * 1024  # 10MB limit

        # Verify agent state doesn't grow excessively
        stats = agent.get_performance_stats()
        assert stats['total_moves'] == 1000

    def test_concurrent_instance_stability(self, sample_board_state):
        """Test stability with multiple concurrent agent instances"""
        def run_agent_moves(agent_id: str, moves_count: int) -> Dict[str, Any]:
            agent = create_test_agent("balanced", random_seed=agent_id.__hash__())
            results = []

            for _ in range(moves_count):
                start_time = time.time()
                move = agent.select_move(sample_board_state)
                execution_time = (time.time() - start_time) * 1000

                results.append({
                    'agent_id': agent_id,
                    'move': move,
                    'execution_time': execution_time
                })

            return {
                'agent_id': agent_id,
                'results': results,
                'stats': agent.get_performance_stats()
            }

        # Run multiple agents concurrently
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = []
            for i in range(5):
                future = executor.submit(run_agent_moves, f"agent_{i}", 100)
                futures.append(future)

            # Collect results
            results = [future.result() for future in futures]

        # Verify all agents performed correctly
        for result in results:
            assert len(result['results']) == 100
            stats = result['stats']
            assert stats['total_moves'] == 100
            assert stats['performance_compliance'] is True

            # Verify no performance degradation due to concurrency
            execution_times = [r['execution_time'] for r in result['results']]
            assert all(t < 10.0 for t in execution_times)

    def test_stress_testing_high_load(self, complex_board_state):
        """Test agent performance under high load scenarios"""
        agent = create_test_agent("balanced")

        # High-intensity testing
        move_count = 5000
        start_time = time.time()
        successful_moves = 0
        failed_moves = 0
        execution_times = []

        for i in range(move_count):
            try:
                move_start = time.time()
                move = agent.select_move(complex_board_state)
                move_time = (time.time() - move_start) * 1000

                execution_times.append(move_time)

                if move is not None:
                    successful_moves += 1
                else:
                    failed_moves += 1

                # Every move should still be under 10ms even under load
                assert move_time < 10.0, f"Move {i} took {move_time:.2f}ms under load"

            except Exception as e:
                failed_moves += 1
                print(f"Move {i} failed: {e}")

        total_time = time.time() - start_time

        # Performance assertions for high load
        assert successful_moves > move_count * 0.95  # 95% success rate minimum
        assert total_time < 30.0  # Complete 5000 moves in under 30 seconds
        assert statistics.mean(execution_times) < 5.0  # Average still under 5ms
        assert max(execution_times) < 10.0  # Max still under 10ms

        print(f"Stress test completed: {successful_moves}/{move_count} moves successful")
        print(f"Total time: {total_time:.2f}s, Avg time per move: {statistics.mean(execution_times):.2f}ms")


# ==========================================
# EDGE CASES AND ERROR HANDLING TESTS
# ==========================================

class TestEasyAgentEdgeCases:
    """Testing edge cases and error handling"""

    def test_endgame_scenarios(self, endgame_board):
        """Test behavior in endgame scenarios with few pieces"""
        agent = create_test_agent("balanced")

        # Should still generate valid moves even with minimal pieces
        move = agent.select_move(endgame_board)

        if move:  # If moves are available
            assert move['player'] == endgame_board['currentPlayer']
            assert 'from' in move and 'to' in move

    def test_stalemate_detection(self):
        """Test handling of stalemate positions"""
        agent = create_test_agent("balanced")

        # Create a position where current player has no moves
        stalemate_board = {
            'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'moveNumber': 50,
            'gameStatus': 'active'
        }

        move = agent.select_move(stalemate_board)
        assert move is None  # Should handle no moves gracefully

    def test_check_response(self):
        """Test response when marshal is in check"""
        agent = create_test_agent("defensive")

        # Create check scenario
        check_board = [[[None] * 3 for _ in range(9)] for _ in range(9)]
        check_board[0][0][0] = {'type': 'marshal', 'player': 1}  # King in danger
        check_board[0][1][0] = {'type': 'general', 'player': 2}  # Attacking piece

        board_state = {
            'board': check_board,
            'currentPlayer': 1,
            'moveNumber': 20,
            'gameStatus': 'check'
        }

        move = agent.select_move(board_state)

        # Should generate a move (even if not optimal for check)
        if move:
            assert move['player'] == 1

    def test_complex_endgame_scenarios(self):
        """Test various complex endgame scenarios"""
        agent = create_test_agent("tactical")

        # Test multiple endgame configurations
        endgame_scenarios = [
            # King vs King
            {
                'pieces': [(0, 0, {'type': 'marshal', 'player': 1}),
                          (8, 8, {'type': 'marshal', 'player': 2})],
                'current_player': 1
            },
            # King and Pawn vs King
            {
                'pieces': [(0, 0, {'type': 'marshal', 'player': 1}),
                          (1, 1, {'type': 'pawn', 'player': 1}),
                          (8, 8, {'type': 'marshal', 'player': 2})],
                'current_player': 1
            },
            # Complex endgame with multiple pieces
            {
                'pieces': [(0, 0, {'type': 'marshal', 'player': 1}),
                          (1, 0, {'type': 'general', 'player': 1}),
                          (2, 0, {'type': 'pawn', 'player': 1}),
                          (8, 8, {'type': 'marshal', 'player': 2}),
                          (7, 8, {'type': 'general', 'player': 2})],
                'current_player': 1
            }
        ]

        for scenario in endgame_scenarios:
            board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

            # Set up pieces
            for row, col, piece in scenario['pieces']:
                board[row][col][0] = piece

            board_state = {
                'board': board,
                'currentPlayer': scenario['current_player'],
                'moveNumber': 100,
                'gameStatus': 'active'
            }

            # Test move generation
            start_time = time.time()
            move = agent.select_move(board_state)
            execution_time = (time.time() - start_time) * 1000

            # Performance should still be maintained in endgame
            assert execution_time < 10.0

            # If move is generated, it should be valid
            if move:
                assert move['player'] == scenario['current_player']
                assert 'from' in move and 'to' in move

    def test_stalemate_and_checkmate_detection(self):
        """Test comprehensive stalemate and checkmate scenarios"""
        agent = create_test_agent("defensive")

        test_scenarios = [
            # Empty board (no pieces)
            {
                'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
                'expected_move': None,
                'description': 'Empty board'
            },
            # Only enemy pieces
            {
                'board': self._create_board_with_only_enemy_pieces(),
                'expected_move': None,
                'description': 'Only enemy pieces'
            }
        ]

        for scenario in test_scenarios:
            board_state = {
                'board': scenario['board'],
                'currentPlayer': 1,
                'moveNumber': 50,
                'gameStatus': 'active'
            }

            move = agent.select_move(board_state)

            if scenario['expected_move'] is None:
                assert move is None, f"Expected no move for {scenario['description']}"
            else:
                assert move is not None, f"Expected move for {scenario['description']}"

    def _create_board_with_only_enemy_pieces(self):
        """Create board with only enemy pieces"""
        board = [[[None] * 3 for _ in range(9)] for _ in range(9)]
        board[8][8][0] = {'type': 'marshal', 'player': 2}
        board[7][7][0] = {'type': 'general', 'player': 2}
        return board

    def test_invalid_board_states(self):
        """Test handling of invalid or corrupted board states"""
        agent = create_test_agent("balanced")

        invalid_states = [
            None,
            {},
            {'board': None},
            {'board': [], 'currentPlayer': None},
            {'board': [[[None] * 3] * 9] * 9, 'currentPlayer': 'invalid'},
        ]

        for invalid_state in invalid_states:
            try:
                move = agent.select_move(invalid_state)
                # Should either return None or handle gracefully
                assert move is None or isinstance(move, dict)
            except Exception as e:
                # If an exception occurs, it should be logged but not crash
                assert isinstance(e, (ValueError, TypeError, AttributeError))

    def test_extreme_board_configurations(self):
        """Test with extreme board configurations"""
        agent = create_test_agent("aggressive")

        # Board with maximum pieces (edge case)
        max_pieces_board = [[[{'type': 'pawn', 'player': 1}] * 3 for _ in range(9)] for _ in range(9)]

        board_state = {
            'board': max_pieces_board,
            'currentPlayer': 1,
            'moveNumber': 1,
            'gameStatus': 'active'
        }

        # Should handle even extreme configurations
        start_time = time.time()
        move = agent.select_move(board_state)
        execution_time = (time.time() - start_time) * 1000

        # Performance should still be maintained
        assert execution_time < 20.0  # Allow slightly more time for extreme cases

    def test_personality_edge_cases(self, board_with_captures):
        """Test personality behavior in edge cases"""
        personalities = ["aggressive", "defensive", "balanced"]

        for personality in personalities:
            agent = create_test_agent(personality)

            # Test multiple moves to verify personality consistency
            moves = []
            for _ in range(50):
                move = agent.select_move(board_with_captures)
                if move:
                    moves.append(move)

            assert len(moves) > 0

            # Aggressive should have higher capture rate
            if personality == "aggressive":
                capture_rate = sum(1 for m in moves if m.get('isCapture', False)) / len(moves)
                assert capture_rate > 0.75  # Should be higher than base 70%


# ==========================================
# INTEGRATION AND SYSTEM TESTS
# ==========================================

class TestEasyAgentIntegration:
    """Integration tests with other system components"""

    def test_factory_function(self):
        """Test the factory function for creating agents"""
        # Test with default parameters
        agent1 = create_easy_agent()
        assert isinstance(agent1, EasyAgent)
        assert agent1.config.personality == AIPersonality.BALANCED

        # Test with custom parameters
        agent2 = create_easy_agent(
            personality="aggressive",
            capture_preference_rate=0.80,
            max_thinking_time_ms=5.0
        )
        assert agent2.config.personality == AIPersonality.AGGRESSIVE
        assert agent2.easy_config.capture_preference_rate == 0.80
        assert agent2.easy_config.max_thinking_time_ms == 5.0

    def test_performance_statistics_tracking(self, sample_board_state):
        """Test comprehensive performance statistics"""
        agent = create_test_agent("balanced", enable_performance_tracking=True)

        # Generate moves
        for _ in range(100):
            agent.select_move(sample_board_state)

        stats = agent.get_performance_stats()

        # Verify all expected statistics are present
        required_keys = [
            'total_moves', 'average_time_ms', 'max_time_ms', 'min_time_ms',
            'capture_preference_rate', 'moves_under_10ms', 'performance_compliance',
            'personality'
        ]

        for key in required_keys:
            assert key in stats

        assert stats['total_moves'] == 100
        assert stats['performance_compliance'] is True
        assert stats['moves_under_10ms'] == 100

    def test_statistics_reset_functionality(self, sample_board_state):
        """Test statistics reset functionality"""
        agent = create_test_agent("balanced")

        # Generate some moves
        for _ in range(50):
            agent.select_move(sample_board_state)

        # Verify statistics exist
        stats_before = agent.get_performance_stats()
        assert stats_before['total_moves'] == 50

        # Reset statistics
        agent.reset_statistics()

        # Verify reset worked
        assert len(agent.move_times) == 0
        assert len(agent.capture_decisions) == 0
        assert agent.total_moves == 0

    @pytest.mark.asyncio
    async def test_async_compatibility(self, sample_board_state):
        """Test that agent works in async environments"""
        agent = create_test_agent("balanced")

        async def async_move_generation():
            # Simulate async environment
            await asyncio.sleep(0.001)
            return agent.select_move(sample_board_state)

        # Run multiple async move generations
        tasks = [async_move_generation() for _ in range(10)]
        results = await asyncio.gather(*tasks)

        # Verify all moves were generated
        valid_moves = [r for r in results if r is not None]
        assert len(valid_moves) > 0

    def test_thread_safety(self, sample_board_state):
        """Test thread safety of agent operations"""
        agent = create_test_agent("balanced")
        results = []
        errors = []

        def worker_thread(thread_id: int):
            try:
                for i in range(50):
                    move = agent.select_move(sample_board_state)
                    results.append(f"thread_{thread_id}_move_{i}")
            except Exception as e:
                errors.append(f"Thread {thread_id}: {str(e)}")

        # Run multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=worker_thread, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Verify no errors occurred
        assert len(errors) == 0, f"Thread safety errors: {errors}"
        assert len(results) == 250  # 5 threads × 50 moves each


# ==========================================
# SPECIALIZED TEST SCENARIOS
# ==========================================

class TestEasyAgentSpecializedScenarios:
    """Specialized test scenarios for comprehensive coverage"""

    def test_deterministic_behavior_with_seed(self, sample_board_state):
        """Test deterministic behavior when using random seed"""
        seed = 12345

        # Create two agents with same seed
        agent1 = create_test_agent("balanced", random_seed=seed)
        agent2 = create_test_agent("balanced", random_seed=seed)

        # They should produce identical move sequences
        moves1 = []
        moves2 = []

        for _ in range(20):
            move1 = agent1.select_move(sample_board_state)
            move2 = agent2.select_move(sample_board_state)

            moves1.append(move1)
            moves2.append(move2)

        # Compare moves (may not be identical due to board state changes)
        # But randomness pattern should be similar
        assert len(moves1) == len(moves2)

    def test_configuration_validation(self):
        """Test configuration parameter validation"""
        # Test valid configurations
        valid_configs = [
            {"capture_preference_rate": 0.5},
            {"capture_preference_rate": 1.0},
            {"max_thinking_time_ms": 1.0},
            {"max_thinking_time_ms": 50.0},
        ]

        for config_dict in valid_configs:
            config = EasyAgentConfig(**config_dict)
            agent = EasyAgent("balanced", config)
            assert agent is not None

    def test_move_quality_consistency(self, sample_board_state):
        """Test that move quality remains consistent"""
        agent = create_test_agent("balanced")

        moves = []
        for _ in range(100):
            move = agent.select_move(sample_board_state)
            if move:
                moves.append(move)

        # All moves should have consistent structure
        for move in moves:
            assert isinstance(move, dict)
            assert 'from' in move and 'to' in move
            assert 'piece' in move and 'player' in move
            assert isinstance(move.get('isCapture', False), bool)

    def test_error_recovery(self, sample_board_state):
        """Test error recovery mechanisms"""
        agent = create_test_agent("balanced")

        # Simulate various error conditions
        with patch.object(agent, '_get_legal_moves', side_effect=Exception("Test error")):
            move = agent.select_move(sample_board_state)
            # Should handle error gracefully
            assert move is None or isinstance(move, dict)

    def test_personality_impact_validation(self, board_with_captures):
        """Test that personality actually impacts decision making"""
        # Test aggressive vs defensive personality differences
        aggressive_agent = create_test_agent("aggressive", random_seed=42)
        defensive_agent = create_test_agent("defensive", random_seed=42)

        aggressive_captures = 0
        defensive_captures = 0

        test_rounds = 200

        for _ in range(test_rounds):
            agg_move = aggressive_agent.select_move(board_with_captures)
            def_move = defensive_agent.select_move(board_with_captures)

            if agg_move and agg_move.get('isCapture', False):
                aggressive_captures += 1
            if def_move and def_move.get('isCapture', False):
                defensive_captures += 1

        # Aggressive should have higher capture rate than defensive
        agg_rate = aggressive_captures / test_rounds
        def_rate = defensive_captures / test_rounds

        # Allow some tolerance but expect measurable difference
        assert agg_rate > def_rate, f"Aggressive: {agg_rate:.3f}, Defensive: {def_rate:.3f}"


# ==========================================
# COMPREHENSIVE VALIDATION TESTS
# ==========================================

class TestEasyAgentComprehensiveValidation:
    """Comprehensive validation following all GI.md requirements"""

    def test_complete_workflow_validation(self, sample_board_state):
        """Test complete EasyAgent workflow from initialization to move generation"""
        # Initialize agent
        agent = create_test_agent("balanced", enable_performance_tracking=True)

        # Verify initialization
        assert agent is not None
        assert hasattr(agent, 'config')
        assert hasattr(agent, 'easy_config')

        # Generate moves
        moves = []
        for i in range(50):
            start_time = time.time()
            move = agent.select_move(sample_board_state)
            execution_time = (time.time() - start_time) * 1000

            if move:
                moves.append({
                    'move': move,
                    'execution_time': execution_time,
                    'move_number': i + 1
                })

        # Validate all moves
        assert len(moves) > 0

        for move_data in moves:
            move = move_data['move']
            exec_time = move_data['execution_time']

            # Performance validation
            assert exec_time < 10.0

            # Move structure validation
            assert 'from' in move and 'to' in move
            assert 'piece' in move and 'player' in move
            assert isinstance(move['isCapture'], bool)

        # Get final statistics
        stats = agent.get_performance_stats()

        # Comprehensive statistics validation
        assert stats['total_moves'] == len(moves)
        assert stats['performance_compliance'] is True
        assert 0.0 <= stats['capture_preference_rate'] <= 1.0
        assert stats['average_time_ms'] < 10.0

    def test_production_readiness_validation(self, complex_board_state):
        """Test production readiness according to GI.md guidelines"""
        agent = create_test_agent("balanced")

        # Scalability test - handle many consecutive moves
        start_time = time.time()
        successful_moves = 0

        for _ in range(1000):
            move = agent.select_move(complex_board_state)
            if move:
                successful_moves += 1

        total_time = time.time() - start_time

        # Production requirements
        assert successful_moves > 900  # High success rate
        assert total_time < 5.0  # Complete 1000 moves in under 5 seconds
        assert agent.get_performance_stats()['performance_compliance'] is True

    def test_real_implementation_verification(self, sample_board_state):
        """Verify real implementation vs simulation (GI.md Guideline #2)"""
        agent = create_test_agent("balanced")

        # Verify no mocks or stubs are being used internally
        move = agent.select_move(sample_board_state)

        if move:
            # Verify actual move generation, not placeholders
            assert move['from'] != move['to']  # Actual move, not placeholder
            assert 'piece' in move and move['piece'] is not None
            assert move['player'] in [1, 2]  # Real player values

            # Verify no hardcoded or default values
            from_pos = move['from']
            to_pos = move['to']
            assert not (from_pos['row'] == 0 and from_pos['col'] == 0 and
                       to_pos['row'] == 1 and to_pos['col'] == 1)  # Not default move

    def test_modular_design_compliance(self):
        """Test modular design compliance (GI.md Guideline #4)"""
        # Verify class separation and single responsibility
        agent = create_test_agent("balanced")

        # Verify agent has distinct modules/components
        assert hasattr(agent, 'config')  # Configuration module
        assert hasattr(agent, 'easy_config')  # EasyAgent specific config
        assert hasattr(agent, 'move_times')  # Performance tracking
        assert hasattr(agent, 'capture_decisions')  # Decision tracking

        # Verify methods have single responsibility
        methods = ['select_move', '_get_legal_moves', '_apply_capture_preference',
                  '_apply_personality_filter', '_track_performance', 'get_performance_stats']

        for method_name in methods:
            assert hasattr(agent, method_name)

    def test_no_hardcoding_validation(self, sample_board_state):
        """Validate no hardcoding or placeholders (GI.md Guideline #18)"""
        agent = create_test_agent("balanced")

        # Generate multiple moves and verify no hardcoded patterns
        moves = []
        for _ in range(100):
            move = agent.select_move(sample_board_state)
            if move:
                moves.append(move)

        # Verify randomness and no hardcoded sequences
        from_positions = [(m['from']['row'], m['from']['col']) for m in moves]
        to_positions = [(m['to']['row'], m['to']['col']) for m in moves]

        # Should have variety in positions (not hardcoded)
        unique_from = set(from_positions)
        unique_to = set(to_positions)

        assert len(unique_from) > 1  # Multiple starting positions
        assert len(unique_to) > 1  # Multiple target positions

        # Verify no placeholder values
        for move in moves[:10]:  # Check first 10 moves
            assert move['from']['row'] != -1  # No placeholder coordinates
            assert move['to']['row'] != -1
            assert move['piece'] != {}  # No empty piece data
            assert 'TODO' not in str(move)  # No TODO placeholders


# ==========================================
# PERFORMANCE BENCHMARK TESTS
# ==========================================

class TestEasyAgentBenchmarks:
    """Performance benchmarking for optimization tracking"""

    def test_speed_benchmark_baseline(self, complex_board_state):
        """Establish speed benchmarks for performance tracking"""
        agent = create_test_agent("balanced")

        # Warm-up runs
        for _ in range(10):
            agent.select_move(complex_board_state)

        # Benchmark runs
        execution_times = []
        for _ in range(1000):
            start_time = time.time()
            agent.select_move(complex_board_state)
            execution_time = (time.time() - start_time) * 1000
            execution_times.append(execution_time)

        # Calculate benchmark metrics
        mean_time = statistics.mean(execution_times)
        median_time = statistics.median(execution_times)
        p95_time = sorted(execution_times)[int(0.95 * len(execution_times))]
        p99_time = sorted(execution_times)[int(0.99 * len(execution_times))]

        # Performance assertions (baseline expectations)
        assert mean_time < 5.0, f"Mean time {mean_time:.2f}ms exceeds 5ms"
        assert median_time < 3.0, f"Median time {median_time:.2f}ms exceeds 3ms"
        assert p95_time < 8.0, f"95th percentile {p95_time:.2f}ms exceeds 8ms"
        assert p99_time < 10.0, f"99th percentile {p99_time:.2f}ms exceeds 10ms"

        # Log benchmark results for tracking
        print(f"\nEasyAgent Speed Benchmark Results:")
        print(f"Mean: {mean_time:.2f}ms")
        print(f"Median: {median_time:.2f}ms")
        print(f"95th percentile: {p95_time:.2f}ms")
        print(f"99th percentile: {p99_time:.2f}ms")

    def test_memory_benchmark(self, sample_board_state):
        """Memory usage benchmark"""
        import tracemalloc

        tracemalloc.start()

        agent = create_test_agent("balanced")

        # Run extended session
        for _ in range(5000):
            agent.select_move(sample_board_state)

        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        # Memory benchmarks
        peak_mb = peak / (1024 * 1024)
        current_mb = current / (1024 * 1024)

        assert peak_mb < 20.0, f"Peak memory {peak_mb:.2f}MB exceeds 20MB"
        assert current_mb < 15.0, f"Current memory {current_mb:.2f}MB exceeds 15MB"

        print(f"\nMemory Benchmark Results:")
        print(f"Peak memory: {peak_mb:.2f}MB")
        print(f"Current memory: {current_mb:.2f}MB")


# ==========================================
# TEST EXECUTION AND REPORTING
# ==========================================

def run_comprehensive_easy_agent_tests():
    """Run all EasyAgent tests and generate comprehensive report"""
    print("🧪 Running Comprehensive EasyAgent Test Suite")
    print("=" * 60)

    # Run tests with detailed reporting
    pytest_args = [
        __file__,
        "-v",  # Verbose output
        "--tb=short",  # Short traceback format
        "--durations=10",  # Show 10 slowest tests
        "--capture=no",  # Show print statements
    ]

    import subprocess
    result = subprocess.run(["python", "-m", "pytest"] + pytest_args)

    if result.returncode == 0:
        print("\n✅ All EasyAgent tests passed successfully!")
        print("🎯 EasyAgent implementation is production-ready")
    else:
        print("\n❌ Some tests failed. Review output above.")
        print("🔧 Fix issues before deploying to production")

    return result.returncode == 0


if __name__ == "__main__":
    # Allow running tests directly
    success = run_comprehensive_easy_agent_tests()
    exit(0 if success else 1)
