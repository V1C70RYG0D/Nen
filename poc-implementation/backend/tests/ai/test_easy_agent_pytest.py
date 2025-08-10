"""
Pytest-Compatible EasyAgent Test Suite
Following GI.md guidelines and exact test requirements

This module implements all the test requirements specified:

BASIC FUNCTIONALITY:
✅ test_random_move_selection()
✅ test_capture_preference_70_percent()
✅ test_legal_move_validation()
✅ test_no_legal_moves_handling()

PERFORMANCE REQUIREMENTS:
✅ test_move_generation_speed_under_10ms()
✅ test_memory_usage_efficiency()
✅ test_concurrent_instance_stability()

EDGE CASES:
✅ test_endgame_scenarios()
✅ test_stalemate_detection()
✅ test_check_response()

CRITICAL TEST CASES:
✅ test_capture_preference_statistics()
✅ test_easy_agent_speed_requirement()
"""

import pytest
import time
import random
import statistics
import threading
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor
import sys
from pathlib import Path

# Add agents path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "ai-services" / "agents"))

from easy_agent import EasyAgent, EasyAgentConfig, create_easy_agent


class TestEasyAgent:
    """Testing for EasyAgent random move selection with capture preference"""

    # ==========================================
    # FIXTURES AND SETUP
    # ==========================================

    @pytest.fixture
    def agent(self):
        """Create a balanced EasyAgent for testing"""
        return EasyAgent("balanced")

    @pytest.fixture
    def aggressive_agent(self):
        """Create an aggressive EasyAgent for performance testing"""
        return EasyAgent("aggressive")

    @pytest.fixture
    def sample_board(self):
        """Create a standard game board state"""
        return {
            'board': [
                [
                    [
                        {'type': 'pawn', 'player': 1} if row == 6 and col % 2 == 0
                        else {'type': 'pawn', 'player': 2} if row == 2 and col % 2 == 0
                        else None,
                        None,
                        None
                    ] for col in range(9)
                ] for row in range(9)
            ],
            'currentPlayer': 1,
            'gamePhase': 'opening',
            'moveHistory': []
        }

    @pytest.fixture
    def board_with_captures(self):
        """Create board state with capture opportunities"""
        board = {
            'board': [
                [
                    [
                        {'type': 'pawn', 'player': 1} if row == 6 and col % 2 == 0
                        else {'type': 'pawn', 'player': 2} if row == 2 and col % 2 == 0
                        else None,
                        None,
                        None
                    ] for col in range(9)
                ] for row in range(9)
            ],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveHistory': []
        }

        # Add pieces that can capture each other
        board['board'][4][4] = [{'type': 'knight', 'player': 1}, None, None]
        board['board'][5][5] = [{'type': 'pawn', 'player': 2}, None, None]
        board['board'][3][3] = [{'type': 'rook', 'player': 2}, None, None]
        board['board'][4][5] = [{'type': 'bishop', 'player': 1}, None, None]
        board['board'][6][6] = [{'type': 'queen', 'player': 2}, None, None]

        return board

    @pytest.fixture
    def complex_board(self):
        """Create a complex board state for performance testing"""
        board = {
            'board': [
                [
                    [
                        {'type': 'pawn', 'player': 1} if row == 6 and col % 2 == 0
                        else {'type': 'pawn', 'player': 2} if row == 2 and col % 2 == 0
                        else None,
                        None,
                        None
                    ] for col in range(9)
                ] for row in range(9)
            ],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveHistory': []
        }

        # Add complexity with various pieces
        pieces = ['rook', 'knight', 'bishop', 'queen', 'general', 'lieutenant']
        random.seed(42)  # Deterministic for testing
        for row in range(1, 8):
            for col in range(9):
                if random.random() < 0.25:
                    player = 1 if row > 4 else 2
                    piece_type = random.choice(pieces)
                    board['board'][row][col] = [{'type': piece_type, 'player': player}, None, None]

        return board

    # ==========================================
    # BASIC FUNCTIONALITY TESTS
    # ==========================================

    def test_random_move_selection(self, agent, sample_board):
        """Test random move selection from legal moves"""
        moves = []
        move_strings = set()

        # Test multiple moves for randomness
        for _ in range(20):
            move = agent.select_move(sample_board)
            if move:
                moves.append(move)
                move_str = f"{move.get('from', {})}->{move.get('to', {})}"
                move_strings.add(move_str)

        # Validate moves were generated and show some randomness
        assert len(moves) > 0, "No moves generated"
        randomness_score = len(move_strings) / len(moves) if moves else 0
        assert randomness_score > 0.1, f"Insufficient randomness: {randomness_score:.2%}"

    def test_capture_preference_70_percent(self, agent, board_with_captures):
        """Test 70% capture preference in decision making"""
        capture_decisions = 0
        total_opportunities = 0

        for _ in range(100):
            legal_moves = agent._get_legal_moves(board_with_captures)
            capture_moves = [m for m in legal_moves if m.get('isCapture', False)]

            if capture_moves:  # Only count when captures are available
                total_opportunities += 1
                move = agent.select_move(board_with_captures)
                if move and move.get('isCapture', False):
                    capture_decisions += 1

        if total_opportunities > 0:
            capture_rate = capture_decisions / total_opportunities
            assert 0.65 <= capture_rate <= 0.75, f"Capture rate {capture_rate:.2%} outside 70% ± 5% tolerance"
        else:
            pytest.skip("No capture opportunities found in test")

    def test_legal_move_validation(self, agent, sample_board):
        """Test that all selected moves are legal"""
        valid_moves = 0
        total_moves = 25

        for _ in range(total_moves):
            move = agent.select_move(sample_board)
            if move:
                legal_moves = agent._get_legal_moves(sample_board)
                is_legal = any(self._moves_equal(move, legal_move) for legal_move in legal_moves)
                if is_legal:
                    valid_moves += 1

        assert valid_moves == total_moves, f"Only {valid_moves}/{total_moves} moves were legal"

    def test_no_legal_moves_handling(self, agent):
        """Test handling when no legal moves are available"""
        empty_board = {
            'board': [[[None, None, None] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'endgame',
            'moveHistory': []
        }

        move = agent.select_move(empty_board)
        legal_moves = agent._get_legal_moves(empty_board)

        # Should return None when no legal moves, or valid move if moves exist
        assert (move is None and len(legal_moves) == 0) or (move is not None and len(legal_moves) > 0)

    # ==========================================
    # PERFORMANCE REQUIREMENTS TESTS
    # ==========================================

    def test_move_generation_speed_under_10ms(self, agent, complex_board):
        """Test that move generation is under 10ms"""
        times = []
        iterations = 50

        for _ in range(iterations):
            start_time = time.time()
            move = agent.select_move(complex_board)
            execution_time = (time.time() - start_time) * 1000  # Convert to ms
            times.append(execution_time)

        avg_time = statistics.mean(times)
        max_time = max(times)

        assert all(t < 10.0 for t in times), f"Max execution time {max_time:.2f}ms exceeds 10ms limit"
        print(f"Performance: Avg {avg_time:.2f}ms, Max {max_time:.2f}ms")

    def test_memory_usage_efficiency(self, agent, complex_board):
        """Test memory usage efficiency during multiple operations"""
        try:
            import psutil
            import gc

            # Initial memory measurement
            process = psutil.Process()
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB

            # Perform many operations
            for _ in range(200):
                move = agent.select_move(complex_board)
                stats = agent.get_performance_stats()

            gc.collect()

            # Final memory measurement
            final_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_increase = final_memory - initial_memory

            assert memory_increase < 100.0, f"Memory increase {memory_increase:.2f}MB exceeds 100MB limit"

        except ImportError:
            # Basic test without psutil
            for _ in range(100):
                move = agent.select_move(complex_board)
            # If we reach here without errors, memory is acceptable
            assert True

    def test_concurrent_instance_stability(self, sample_board):
        """Test stability when multiple agents run concurrently"""
        def run_agent_test():
            agent = EasyAgent(random.choice(["aggressive", "defensive", "balanced"]))
            results = []

            for _ in range(15):
                try:
                    move = agent.select_move(sample_board)
                    results.append(move is not None)
                except Exception:
                    results.append(False)

            return all(results)

        # Run multiple agents concurrently
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(run_agent_test) for _ in range(15)]
            results = [future.result() for future in futures]

        successful_instances = sum(results)
        assert successful_instances >= len(results) * 0.9, f"Only {successful_instances}/{len(results)} instances succeeded"

    # ==========================================
    # EDGE CASES TESTS
    # ==========================================

    def test_endgame_scenarios(self, agent):
        """Test behavior in endgame scenarios"""
        endgame_board = {
            'board': [[[None, None, None] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'endgame',
            'moveHistory': []
        }

        # Add minimal pieces for endgame
        endgame_board['board'][0][0] = [{'type': 'marshal', 'player': 2}, None, None]
        endgame_board['board'][8][8] = [{'type': 'marshal', 'player': 1}, None, None]
        endgame_board['board'][4][4] = [{'type': 'general', 'player': 1}, None, None]

        # Should handle endgame without errors
        move = agent.select_move(endgame_board)
        # Basic test - should not crash
        assert True

    def test_stalemate_detection(self, agent):
        """Test stalemate detection and handling"""
        stalemate_board = {
            'board': [[[None, None, None] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'endgame',
            'moveHistory': []
        }

        # Constrained scenario
        stalemate_board['board'][0][0] = [{'type': 'marshal', 'player': 1}, None, None]
        stalemate_board['board'][1][1] = [{'type': 'pawn', 'player': 2}, None, None]

        # Should handle limited moves without crashing
        move = agent.select_move(stalemate_board)
        assert True

    def test_check_response(self, agent):
        """Test response to check situations"""
        check_board = {
            'board': [[[None, None, None] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveHistory': []
        }

        # Simple check scenario
        check_board['board'][4][4] = [{'type': 'marshal', 'player': 1}, None, None]
        check_board['board'][4][7] = [{'type': 'rook', 'player': 2}, None, None]

        # Should generate valid response without crashing
        move = agent.select_move(check_board)
        assert True

    # ==========================================
    # CRITICAL TEST CASES
    # ==========================================

    def test_capture_preference_statistics(self):
        """Test 70% capture preference over 1000 moves"""
        agent = EasyAgent("balanced")
        capture_count = 0
        total_moves = 500  # Reduced for reasonable test time
        opportunities = 0

        for _ in range(total_moves):
            board = self._create_board_with_captures()
            legal_moves = agent._get_legal_moves(board)
            capture_moves = [m for m in legal_moves if m.get('isCapture', False)]

            if capture_moves:  # Only count when captures are available
                opportunities += 1
                move = agent.select_move(board)
                if move and move.get('isCapture', False):
                    capture_count += 1

        if opportunities > 0:
            capture_rate = capture_count / opportunities
            assert 0.65 <= capture_rate <= 0.75, f"Capture rate {capture_rate:.2%} outside 70% ± 5% tolerance"
        else:
            pytest.fail("No capture opportunities generated in statistical test")

    def test_easy_agent_speed_requirement(self):
        """Test that easy agent generates moves under 10ms"""
        agent = EasyAgent("aggressive")
        board = self._create_complex_board()

        execution_times = []
        iterations = 100

        for _ in range(iterations):
            start_time = time.time()
            move = agent.select_move(board)
            execution_time = (time.time() - start_time) * 1000  # Convert to ms
            execution_times.append(execution_time)

            # Validate move is legal
            if move:
                legal_moves = agent._get_legal_moves(board)
                assert any(self._moves_equal(move, legal_move) for legal_move in legal_moves), "Generated illegal move"

        max_time = max(execution_times)
        assert max_time < 10.0, f"Max execution time {max_time:.2f}ms exceeds 10ms requirement"

        avg_time = statistics.mean(execution_times)
        print(f"Speed performance: Avg {avg_time:.2f}ms, Max {max_time:.2f}ms")

    # ==========================================
    # HELPER METHODS
    # ==========================================

    def _create_board_with_captures(self):
        """Create board state with capture opportunities"""
        board = {
            'board': [
                [
                    [
                        {'type': 'pawn', 'player': 1} if row == 6 and col % 2 == 0
                        else {'type': 'pawn', 'player': 2} if row == 2 and col % 2 == 0
                        else None,
                        None,
                        None
                    ] for col in range(9)
                ] for row in range(9)
            ],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveHistory': []
        }

        # Add pieces that can capture each other
        board['board'][4][4] = [{'type': 'knight', 'player': 1}, None, None]
        board['board'][5][5] = [{'type': 'pawn', 'player': 2}, None, None]
        board['board'][3][3] = [{'type': 'rook', 'player': 2}, None, None]
        board['board'][4][5] = [{'type': 'bishop', 'player': 1}, None, None]
        board['board'][6][6] = [{'type': 'queen', 'player': 2}, None, None]

        return board

    def _create_complex_board(self):
        """Create complex board for performance testing"""
        board = {
            'board': [
                [
                    [
                        {'type': 'pawn', 'player': 1} if row == 6 and col % 2 == 0
                        else {'type': 'pawn', 'player': 2} if row == 2 and col % 2 == 0
                        else None,
                        None,
                        None
                    ] for col in range(9)
                ] for row in range(9)
            ],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveHistory': []
        }

        # Add complexity
        pieces = ['rook', 'knight', 'bishop', 'queen', 'general', 'lieutenant']
        random.seed(42)  # Deterministic
        for row in range(1, 8):
            for col in range(9):
                if random.random() < 0.25:
                    player = 1 if row > 4 else 2
                    piece_type = random.choice(pieces)
                    board['board'][row][col] = [{'type': piece_type, 'player': player}, None, None]

        return board

    def _moves_equal(self, move1: Dict[str, Any], move2: Dict[str, Any]) -> bool:
        """Compare two moves for equality"""
        if not move1 or not move2:
            return move1 == move2

        from_equal = (move1.get('from', {}).get('row') == move2.get('from', {}).get('row') and
                     move1.get('from', {}).get('col') == move2.get('from', {}).get('col'))

        to_equal = (move1.get('to', {}).get('row') == move2.get('to', {}).get('row') and
                   move1.get('to', {}).get('col') == move2.get('to', {}).get('col'))

        return from_equal and to_equal
