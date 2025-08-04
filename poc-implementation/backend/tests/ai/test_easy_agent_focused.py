"""
Focused EasyAgent Testing Implementation
Following GI.md guidelines for AI system testing

Test Requirements per user specification:
- TestEasyAgent class with specific test methods
- Capture preference validation (70% ± 5% tolerance)
- Speed performance testing (under 10ms)
- Comprehensive edge case coverage
- 100% test coverage following GI.md Guideline #8
"""

import pytest
import time
import random
import statistics
import threading
from typing import Dict, Any, List, Optional
from unittest.mock import Mock, patch
import sys
from pathlib import Path

# Add AI services to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / "ai-services" / "agents"))

from easy_agent import EasyAgent, EasyAgentConfig, create_easy_agent


class TestEasyAgent:
    """Testing for EasyAgent random move selection with capture preference"""

    @pytest.fixture
    def basic_board_state(self):
        """Create basic board state for testing"""
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
            'gamePhase': 'midgame'
        }

    @pytest.fixture
    def board_with_captures(self):
        """Create board state with capture opportunities"""
        board = [[[ None for _ in range(3)] for _ in range(9)] for _ in range(9)]

        # Place pieces to create capture opportunities
        board[4][4][0] = {'type': 'pawn', 'player': 1}
        board[4][5][0] = {'type': 'pawn', 'player': 2}  # Can be captured
        board[3][4][0] = {'type': 'knight', 'player': 2}  # Can capture
        board[5][4][0] = {'type': 'rook', 'player': 1}

        return {
            'board': board,
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }

    @pytest.fixture
    def complex_board_state(self):
        """Create complex board state for performance testing"""
        board = [[[ None for _ in range(3)] for _ in range(9)] for _ in range(9)]

        # Populate with many pieces to stress test
        pieces = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']
        for row in range(9):
            for col in range(0, 9, 2):  # Every other column
                if row < 4:
                    board[row][col][0] = {
                        'type': random.choice(pieces),
                        'player': 1
                    }
                elif row > 4:
                    board[row][col][0] = {
                        'type': random.choice(pieces),
                        'player': 2
                    }

        return {
            'board': board,
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }

    # ==========================================
    # BASIC FUNCTIONALITY TESTS
    # ==========================================

    def test_random_move_selection(self, basic_board_state):
        """Test that agent selects random moves from legal moves"""
        agent = EasyAgent("balanced")

        # Generate multiple moves to verify randomness
        moves = []
        for _ in range(50):
            move = agent.select_move(basic_board_state)
            if move:
                moves.append(f"{move['from']['row']}-{move['from']['col']}-{move['to']['row']}-{move['to']['col']}")

        # Verify moves are generated
        assert len(moves) > 0, "Agent should generate moves"

        # Verify some degree of randomness (not all identical)
        unique_moves = set(moves)
        assert len(unique_moves) > 1, "Agent should generate varied moves"

        # Verify moves are valid format
        for move_str in moves[:5]:  # Check first 5 moves
            parts = move_str.split('-')
            assert len(parts) == 4, "Move format should be from_row-from_col-to_row-to_col"
            for part in parts:
                assert part.isdigit(), "Move coordinates should be numeric"

    def test_capture_preference_70_percent(self, board_with_captures):
        """Test 70% capture preference over multiple moves"""
        agent = EasyAgent("balanced")
        capture_count = 0
        total_moves_with_captures = 0
        iterations = 1000

        for _ in range(iterations):
            move = agent.select_move(board_with_captures)
            if move:
                # Check if captures were available
                legal_moves = agent._get_legal_moves(board_with_captures)
                capture_moves = [m for m in legal_moves if m.get('isCapture', False)]

                if capture_moves:  # Only count when captures are available
                    total_moves_with_captures += 1
                    if move.get('isCapture', False):
                        capture_count += 1

        # Calculate capture preference rate
        if total_moves_with_captures > 0:
            capture_rate = capture_count / total_moves_with_captures

            # Verify 70% ± 5% tolerance as specified
            assert 0.65 <= capture_rate <= 0.75, (
                f"Capture preference rate {capture_rate:.3f} should be 70% ± 5% "
                f"(between 0.65 and 0.75)"
            )
        else:
            pytest.skip("No capture opportunities found in test scenario")

    def test_legal_move_validation(self, basic_board_state):
        """Test that agent only selects legal moves"""
        agent = EasyAgent("balanced")

        for _ in range(100):
            move = agent.select_move(basic_board_state)
            if move:
                # Verify move structure
                assert 'from' in move, "Move should have 'from' field"
                assert 'to' in move, "Move should have 'to' field"
                assert 'piece' in move, "Move should have 'piece' field"

                # Verify coordinates are within bounds
                for pos_key in ['from', 'to']:
                    pos = move[pos_key]
                    assert 0 <= pos['row'] < 9, f"Row {pos['row']} should be 0-8"
                    assert 0 <= pos['col'] < 9, f"Col {pos['col']} should be 0-8"
                    assert 0 <= pos['tier'] < 3, f"Tier {pos['tier']} should be 0-2"

                # Verify piece belongs to current player
                piece = move['piece']
                assert piece['player'] == basic_board_state['currentPlayer'], (
                    "Move should be for current player's piece"
                )

    def test_no_legal_moves_handling(self):
        """Test agent behavior when no legal moves are available"""
        agent = EasyAgent("balanced")

        # Create empty board state
        empty_board = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'endgame'
        }

        move = agent.select_move(empty_board)
        assert move is None, "Agent should return None when no legal moves available"

    # ==========================================
    # PERFORMANCE REQUIREMENTS TESTS
    # ==========================================

    def test_move_generation_speed_under_10ms(self, complex_board_state):
        """Test that move generation is under 10ms as required"""
        agent = EasyAgent("balanced")

        # Test multiple moves for consistency
        execution_times = []
        for _ in range(100):
            start_time = time.time()
            move = agent.select_move(complex_board_state)
            execution_time = (time.time() - start_time) * 1000  # Convert to ms

            if move:  # Only count successful moves
                execution_times.append(execution_time)

        # Verify all moves are under 10ms
        max_time = max(execution_times) if execution_times else 0
        avg_time = statistics.mean(execution_times) if execution_times else 0

        assert max_time < 10.0, f"Maximum execution time {max_time:.2f}ms exceeds 10ms limit"
        assert avg_time < 5.0, f"Average execution time {avg_time:.2f}ms should be well under limit"

        # Verify performance consistency
        slow_moves = [t for t in execution_times if t > 10.0]
        assert len(slow_moves) == 0, f"Found {len(slow_moves)} moves exceeding 10ms limit"

    def test_memory_usage_efficiency(self):
        """Test that agent doesn't leak memory or use excessive resources"""
        import psutil
        import os

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Create agent and run many operations
        agent = EasyAgent("balanced")
        board_state = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }

        # Add some pieces
        board_state['board'][4][4][0] = {'type': 'pawn', 'player': 1}
        board_state['board'][5][5][0] = {'type': 'knight', 'player': 2}

        # Run many moves
        for _ in range(1000):
            agent.select_move(board_state)

        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory

        # Should not use more than 50MB additional memory
        assert memory_increase < 50, (
            f"Memory usage increased by {memory_increase:.2f}MB, should be under 50MB"
        )

    def test_concurrent_instance_stability(self, basic_board_state):
        """Test that multiple agent instances work concurrently without interference"""
        def run_agent(agent_id: int, results: List):
            """Run agent moves and collect results"""
            agent = EasyAgent("balanced")
            agent_results = []

            for _ in range(50):
                move = agent.select_move(basic_board_state)
                if move:
                    agent_results.append({
                        'agent_id': agent_id,
                        'move': move,
                        'timestamp': time.time()
                    })

            results.extend(agent_results)

        # Run multiple agents concurrently
        results = []
        threads = []
        num_agents = 5

        for i in range(num_agents):
            thread = threading.Thread(target=run_agent, args=(i, results))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Verify results
        assert len(results) > 0, "Should have collected results from concurrent agents"

        # Verify each agent contributed
        agent_ids = set(result['agent_id'] for result in results)
        assert len(agent_ids) == num_agents, f"Expected {num_agents} agents, got {len(agent_ids)}"

        # Verify no corrupted moves
        for result in results:
            move = result['move']
            assert isinstance(move, dict), "Move should be dictionary"
            assert 'from' in move and 'to' in move, "Move should have from/to fields"

    # ==========================================
    # EDGE CASES TESTS
    # ==========================================

    def test_endgame_scenarios(self):
        """Test agent behavior in endgame scenarios"""
        agent = EasyAgent("balanced")

        # Create endgame board with few pieces
        endgame_board = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'endgame'
        }

        # Place minimal pieces
        endgame_board['board'][7][7][0] = {'type': 'king', 'player': 1}
        endgame_board['board'][0][0][0] = {'type': 'king', 'player': 2}
        endgame_board['board'][6][6][0] = {'type': 'pawn', 'player': 1}

        # Agent should still function
        for _ in range(20):
            move = agent.select_move(endgame_board)
            if move:
                assert move['piece']['player'] == 1, "Should move player 1's pieces"
                break
        else:
            pytest.fail("Agent should be able to generate moves in endgame")

    def test_stalemate_detection(self):
        """Test agent handling of stalemate-like positions"""
        agent = EasyAgent("balanced")

        # Create position with very limited moves
        stalemate_board = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'endgame'
        }

        # Place pieces in corners (limited mobility)
        stalemate_board['board'][0][0][0] = {'type': 'pawn', 'player': 1}
        stalemate_board['board'][8][8][0] = {'type': 'pawn', 'player': 2}

        # Agent should handle gracefully
        move = agent.select_move(stalemate_board)
        # May return None or a valid move, both acceptable
        if move:
            assert isinstance(move, dict), "If move returned, should be valid"

    def test_check_response(self):
        """Test agent response when in check-like situations"""
        agent = EasyAgent("balanced")

        # Create threatening position
        check_board = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }

        # Place pieces in threatening positions
        check_board['board'][4][4][0] = {'type': 'king', 'player': 1}
        check_board['board'][4][7][0] = {'type': 'rook', 'player': 2}  # Threatens king
        check_board['board'][3][4][0] = {'type': 'pawn', 'player': 1}  # Can block

        # Agent should generate valid response
        for _ in range(50):
            move = agent.select_move(check_board)
            if move:
                # Move should be structurally valid
                assert 'from' in move and 'to' in move, "Move should have proper structure"
                break
        else:
            # No moves found - acceptable in some check scenarios
            pass


# ==========================================
# CRITICAL TEST CASES (Per User Specification)
# ==========================================

class TestEasyAgentCriticalCases:
    """Critical test cases as specified in user requirements"""

    def create_board_with_captures(self):
        """Create board state with guaranteed capture opportunities"""
        board = [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)]

        # Create multiple capture scenarios
        board[4][4][0] = {'type': 'pawn', 'player': 1}
        board[4][5][0] = {'type': 'pawn', 'player': 2}  # Capturable
        board[5][4][0] = {'type': 'knight', 'player': 1}
        board[5][5][0] = {'type': 'bishop', 'player': 2}  # Capturable
        board[3][3][0] = {'type': 'rook', 'player': 1}
        board[3][4][0] = {'type': 'queen', 'player': 2}  # Capturable

        return {
            'board': board,
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }

    def create_complex_board(self):
        """Create complex board for performance testing"""
        board = [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)]

        # Fill board with complex piece arrangement
        pieces = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']
        for row in range(9):
            for col in range(9):
                if (row + col) % 3 == 0:  # Distribute pieces
                    player = 1 if row < 4 else 2
                    board[row][col][0] = {
                        'type': random.choice(pieces),
                        'player': player
                    }

        return {
            'board': board,
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }

    def test_capture_preference_statistics(self):
        """Test 70% capture preference over 1000 moves"""
        agent = EasyAgent("balanced")
        capture_count = 0
        total_moves = 1000

        for _ in range(total_moves):
            board = self.create_board_with_captures()
            move = agent.select_move(board)
            if move and move.get('isCapture', False):
                capture_count += 1

        capture_rate = capture_count / total_moves
        assert 0.65 <= capture_rate <= 0.75, (
            f"Capture rate {capture_rate:.3f} should be 70% ± 5% tolerance (0.65-0.75)"
        )

    def test_easy_agent_speed_requirement(self):
        """Test that easy agent generates moves under 10ms"""
        agent = EasyAgent("aggressive")
        board = self.create_complex_board()

        # Test multiple iterations for consistency
        for _ in range(100):
            start_time = time.time()
            move = agent.select_move(board)
            execution_time = (time.time() - start_time) * 1000

            assert execution_time < 10.0, (
                f"Execution time {execution_time:.2f}ms exceeds 10ms limit"
            )

            if move:
                # Verify move is in legal moves
                legal_moves = agent._get_legal_moves(board)
                assert move in legal_moves or any(
                    m['from'] == move['from'] and m['to'] == move['to']
                    for m in legal_moves
                ), "Selected move should be legal"


# ==========================================
# PERFORMANCE BENCHMARKING
# ==========================================

class TestEasyAgentBenchmarks:
    """Comprehensive performance benchmarks"""

    def test_throughput_benchmark(self):
        """Benchmark agent throughput (moves per second)"""
        agent = EasyAgent("balanced")
        board = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }

        # Add pieces for realistic scenario
        board['board'][4][4][0] = {'type': 'pawn', 'player': 1}
        board['board'][5][5][0] = {'type': 'knight', 'player': 2}

        num_moves = 1000
        start_time = time.time()

        successful_moves = 0
        for _ in range(num_moves):
            move = agent.select_move(board)
            if move:
                successful_moves += 1

        total_time = time.time() - start_time
        moves_per_second = successful_moves / total_time

        # Should achieve high throughput
        assert moves_per_second > 100, (
            f"Throughput {moves_per_second:.1f} moves/sec should exceed 100 moves/sec"
        )

    def test_personality_performance_consistency(self):
        """Test that all personalities meet performance requirements"""
        personalities = ["balanced", "aggressive", "defensive", "tactical"]
        board = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }
        board['board'][4][4][0] = {'type': 'pawn', 'player': 1}

        for personality in personalities:
            agent = EasyAgent(personality)

            # Test speed for each personality
            times = []
            for _ in range(50):
                start_time = time.time()
                move = agent.select_move(board)
                execution_time = (time.time() - start_time) * 1000
                if move:
                    times.append(execution_time)

            if times:
                max_time = max(times)
                avg_time = statistics.mean(times)

                assert max_time < 10.0, (
                    f"Personality {personality} max time {max_time:.2f}ms exceeds 10ms"
                )
                assert avg_time < 5.0, (
                    f"Personality {personality} avg time {avg_time:.2f}ms too high"
                )


# ==========================================
# TEST RUNNER AND UTILITIES
# ==========================================

def run_comprehensive_tests():
    """Run all tests and generate comprehensive report"""
    import subprocess
    import json

    # Run pytest with coverage
    result = subprocess.run([
        'python', '-m', 'pytest',
        __file__,
        '-v',
        '--tb=short',
        '--maxfail=5'
    ], capture_output=True, text=True)

    print("=== Easy Agent Test Results ===")
    print(result.stdout)
    if result.stderr:
        print("=== Errors ===")
        print(result.stderr)

    return result.returncode == 0


if __name__ == "__main__":
    # Direct execution for debugging
    success = run_comprehensive_tests()
    exit(0 if success else 1)
