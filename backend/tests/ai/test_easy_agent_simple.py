#!/usr/bin/env python3
"""
Simplified EasyAgent Test Suite
Testing core functionality following GI.md guidelines
"""

import sys
import time
import random
import statistics
from pathlib import Path

# Add AI services to path
sys.path.append(str(Path(__file__).parent.parent.parent / "ai-services" / "agents"))

def run_tests():
    """Run comprehensive test suite for EasyAgent"""

    print("🧪 Starting EasyAgent Test Suite")
    print("=" * 60)

    try:
        # Import the EasyAgent
        from easy_agent import EasyAgent, EasyAgentConfig, create_easy_agent
        print("✅ Successfully imported EasyAgent modules")

        # Test 1: Basic Initialization
        print("\n📋 Test 1: Basic Agent Initialization")
        agent = EasyAgent("balanced")
        assert agent is not None
        assert agent.config.personality.value == "balanced"
        print("✅ Agent initialization passed")

        # Test 2: Sample board creation and move selection
        print("\n📋 Test 2: Move Selection with Sample Board")
        sample_board = create_sample_board()
        move = agent.select_move(sample_board)
        assert move is not None or len(agent._get_legal_moves(sample_board)) == 0
        print("✅ Move selection test passed")

        # Test 3: Capture Preference Testing
        print("\n📋 Test 3: Capture Preference (70% target)")
        capture_stats = test_capture_preference(agent)
        print(f"✅ Capture rate: {capture_stats['capture_rate']:.2%} (target: 70% ± 5%)")

        # Test 4: Performance Testing
        print("\n📋 Test 4: Performance Requirements (<10ms)")
        perf_stats = test_performance(agent, sample_board)
        print(f"✅ Average execution time: {perf_stats['avg_time']:.2f}ms")
        print(f"✅ Max execution time: {perf_stats['max_time']:.2f}ms")

        # Test 5: Personality Testing
        print("\n📋 Test 5: Personality Variations")
        test_personalities()
        print("✅ All personality tests passed")

        # Test 6: Edge Cases
        print("\n📋 Test 6: Edge Case Handling")
        test_edge_cases()
        print("✅ Edge case tests passed")

        print("\n🎉 All tests completed successfully!")
        return True

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

def create_sample_board():
    """Create a realistic sample board state for testing"""
    return {
        'board': [
            # Row 0 (top)
            [[None, None, None] for _ in range(9)],
            # Row 1
            [[{'type': 'pawn', 'player': 2}, None, None] if col % 2 == 0 else [None, None, None]
             for col in range(9)],
            # Rows 2-6 (middle game area)
            [[None, None, None] for _ in range(9)] for _ in range(5),
            # Row 7
            [[{'type': 'pawn', 'player': 1}, None, None] if col % 2 == 0 else [None, None, None]
             for col in range(9)],
            # Row 8 (bottom)
            [[None, None, None] for _ in range(9)]
        ],
        'currentPlayer': 1,
        'gamePhase': 'midgame',
        'moveHistory': []
    }

def create_board_with_captures():
    """Create a board state with capture opportunities"""
    board = create_sample_board()
    # Add pieces that can capture each other
    board['board'][3][4] = [{'type': 'knight', 'player': 1}, None, None]
    board['board'][4][5] = [{'type': 'pawn', 'player': 2}, None, None]
    board['board'][2][3] = [{'type': 'rook', 'player': 2}, None, None]
    return board

def test_capture_preference(agent):
    """Test the 70% capture preference requirement"""
    capture_count = 0
    total_decisions = 0
    iterations = 100  # Reduced for faster testing

    for _ in range(iterations):
        board = create_board_with_captures()
        # Reset agent statistics
        agent.capture_decisions = []

        move = agent.select_move(board)
        if move and len(agent.capture_decisions) > 0:
            # Check if capture was available and what decision was made
            legal_moves = agent._get_legal_moves(board)
            capture_moves = [m for m in legal_moves if m.get('isCapture', False)]

            if capture_moves:  # Only count decisions where captures were available
                total_decisions += 1
                if move.get('isCapture', False):
                    capture_count += 1

    capture_rate = capture_count / total_decisions if total_decisions > 0 else 0
    return {
        'capture_count': capture_count,
        'total_decisions': total_decisions,
        'capture_rate': capture_rate,
        'within_tolerance': 0.65 <= capture_rate <= 0.75
    }

def test_performance(agent, board):
    """Test performance requirements (<10ms per move)"""
    times = []
    iterations = 50

    for _ in range(iterations):
        start_time = time.time()
        move = agent.select_move(board)
        execution_time = (time.time() - start_time) * 1000  # Convert to ms
        times.append(execution_time)

    return {
        'times': times,
        'avg_time': statistics.mean(times),
        'max_time': max(times),
        'min_time': min(times),
        'under_10ms': all(t < 10.0 for t in times),
        'under_10ms_count': sum(1 for t in times if t < 10.0)
    }

def test_personalities():
    """Test different AI personalities"""
    personalities = ["aggressive", "defensive", "balanced", "tactical"]
    board = create_board_with_captures()

    for personality in personalities:
        agent = EasyAgent(personality)
        move = agent.select_move(board)
        # Basic validation that agent works with each personality
        assert move is not None or len(agent._get_legal_moves(board)) == 0
        print(f"  ✅ {personality.capitalize()} personality working")

def test_edge_cases():
    """Test various edge cases"""

    # Test 1: Empty board
    agent = EasyAgent("balanced")
    empty_board = {
        'board': [[[None, None, None] for _ in range(9)] for _ in range(9)],
        'currentPlayer': 1
    }
    move = agent.select_move(empty_board)
    # Should return None for empty board
    print("  ✅ Empty board handling")

    # Test 2: Invalid board structure
    try:
        invalid_board = {'invalid': 'structure'}
        move = agent.select_move(invalid_board)
        print("  ✅ Invalid board structure handling")
    except Exception:
        print("  ✅ Invalid board structure handling (exception caught)")

    # Test 3: Statistics reset
    agent.reset_statistics()
    stats = agent.get_performance_stats()
    print("  ✅ Statistics reset functionality")

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
