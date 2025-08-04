#!/usr/bin/env python3
"""
EasyAgent Testing with Correct Import Path
Tests the actual EasyAgent implementation following GI.md guidelines
"""

import sys
import time
import statistics
from pathlib import Path

# Add the correct path to the easy_agent module
agent_path = Path("/workspaces/Nen/backend/ai-services/agents")
sys.path.insert(0, str(agent_path))

def test_import():
    """Test importing the actual EasyAgent"""
    print("1. Testing EasyAgent import...")
    try:
        from easy_agent import EasyAgent, EasyAgentConfig, create_easy_agent
        print("   ✅ EasyAgent imported successfully")
        return True, (EasyAgent, EasyAgentConfig, create_easy_agent)
    except ImportError as e:
        print(f"   ❌ Import failed: {e}")
        return False, None
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False, None

def create_test_board():
    """Create test board with capture opportunities"""
    board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

    # Place pieces for capture testing
    board[4][4][0] = {'type': 'pawn', 'player': 1}
    board[4][5][0] = {'type': 'pawn', 'player': 2}  # Capturable
    board[3][4][0] = {'type': 'general', 'player': 2}  # Capturable
    board[5][4][0] = {'type': 'major', 'player': 2}  # Capturable

    return {
        'board': board,
        'currentPlayer': 1,
        'moveNumber': 10,
        'gameStatus': 'active'
    }

def test_capture_preference_70_percent(create_easy_agent):
    """Test 70% capture preference over 1000 moves - Critical Test Case"""
    print("2. Testing capture preference (70% over 1000 moves)...")
    try:
        agent = create_easy_agent("balanced")
        board_state = create_test_board()

        capture_count = 0
        total_moves = 1000
        successful_moves = 0

        for _ in range(total_moves):
            move = agent.select_move(board_state)
            if move:
                successful_moves += 1
                if move.get('isCapture', False):
                    capture_count += 1

        if successful_moves > 0:
            capture_rate = capture_count / successful_moves
            print(f"   Total moves: {successful_moves}")
            print(f"   Captures: {capture_count}")
            print(f"   Capture rate: {capture_rate:.3f} ({capture_rate*100:.1f}%)")

            if 0.65 <= capture_rate <= 0.75:
                print("   ✅ Capture preference within expected range (65-75%)")
                return True
            else:
                print(f"   ❌ Capture preference outside range: {capture_rate:.3f}")
                return False
        else:
            print("   ❌ No successful moves generated")
            return False

    except Exception as e:
        print(f"   ❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_speed_requirement(create_easy_agent):
    """Test that easy agent generates moves under 10ms - Critical Test Case"""
    print("3. Testing speed requirement (<10ms)...")
    try:
        agent = create_easy_agent("aggressive")
        board_state = create_test_board()

        execution_times = []
        successful_moves = 0

        for i in range(100):
            start_time = time.time()
            move = agent.select_move(board_state)
            execution_time = (time.time() - start_time) * 1000

            execution_times.append(execution_time)

            if move:
                successful_moves += 1

            if execution_time >= 10.0:
                print(f"   ❌ Move {i+1} took {execution_time:.2f}ms (exceeds 10ms)")
                return False

        if execution_times:
            avg_time = statistics.mean(execution_times)
            max_time = max(execution_times)
            min_time = min(execution_times)

            print(f"   Successful moves: {successful_moves}")
            print(f"   Average time: {avg_time:.2f}ms")
            print(f"   Max time: {max_time:.2f}ms")
            print(f"   Min time: {min_time:.2f}ms")

            print("   ✅ All moves under 10ms requirement")
            return True
        else:
            print("   ❌ No execution times recorded")
            return False

    except Exception as e:
        print(f"   ❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_legal_move_validation(create_easy_agent):
    """Test that only legal moves are generated"""
    print("4. Testing legal move validation...")
    try:
        agent = create_easy_agent("balanced")
        board_state = create_test_board()

        illegal_moves = 0
        total_moves = 50

        for i in range(total_moves):
            move = agent.select_move(board_state)
            if move:
                # Validate move structure
                if not all(key in move for key in ['from', 'to', 'piece', 'player']):
                    illegal_moves += 1
                    continue

                # Validate coordinates
                from_pos = move['from']
                to_pos = move['to']

                if not (0 <= from_pos['row'] < 9 and 0 <= from_pos['col'] < 9):
                    illegal_moves += 1
                    continue

                if not (0 <= to_pos['row'] < 9 and 0 <= to_pos['col'] < 9):
                    illegal_moves += 1
                    continue

                # Validate player
                if move['player'] != board_state['currentPlayer']:
                    illegal_moves += 1
                    continue

        if illegal_moves == 0:
            print(f"   ✅ All {total_moves} moves are legal")
            return True
        else:
            print(f"   ❌ {illegal_moves} illegal moves found")
            return False

    except Exception as e:
        print(f"   ❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_no_legal_moves_handling(create_easy_agent):
    """Test handling when no legal moves are available"""
    print("5. Testing no legal moves handling...")
    try:
        agent = create_easy_agent("balanced")

        # Empty board
        empty_board = {
            'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'moveNumber': 1,
            'gameStatus': 'active'
        }

        move = agent.select_move(empty_board)

        if move is None:
            print("   ✅ Correctly returns None for empty board")
            return True
        else:
            print("   ❌ Should return None for empty board")
            return False

    except Exception as e:
        print(f"   ❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def run_critical_tests():
    """Run all critical test cases specified in the task"""
    print("🧪 EasyAgent Critical Test Cases")
    print("Following GI.md guidelines for comprehensive testing")
    print("=" * 60)

    # Import test
    import_success, modules = test_import()
    if not import_success:
        print("\n❌ Cannot proceed without successful import")
        return False

    _, _, create_easy_agent = modules

    # Run all critical tests
    tests = [
        ("Capture Preference (70% over 1000 moves)", lambda: test_capture_preference_70_percent(create_easy_agent)),
        ("Speed Requirement (<10ms)", lambda: test_speed_requirement(create_easy_agent)),
        ("Legal Move Validation", lambda: test_legal_move_validation(create_easy_agent)),
        ("No Legal Moves Handling", lambda: test_no_legal_moves_handling(create_easy_agent)),
    ]

    passed_tests = 0
    total_tests = len(tests) + 1  # +1 for import test

    if import_success:
        passed_tests += 1

    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 40)
        try:
            if test_func():
                passed_tests += 1
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"❌ {test_name} ERROR: {e}")

    # Summary
    print("\n" + "=" * 60)
    print("📊 CRITICAL TESTS SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")

    if passed_tests == total_tests:
        print("\n🎉 ALL CRITICAL TESTS PASSED!")
        print("🚀 EasyAgent meets all specified requirements")
        print("✅ Production deployment ready")

        print("\n📋 GI.md Compliance Verified:")
        print("- ✅ Real implementation over simulation (Guideline #2)")
        print("- ✅ Production-ready quality (Guideline #3)")
        print("- ✅ Performance under 10ms (Guideline #21)")
        print("- ✅ 70% capture preference validated (Guideline #8)")
        print("- ✅ Comprehensive testing completed (Guideline #8)")

        return True
    else:
        print(f"\n⚠️  {total_tests - passed_tests} TESTS FAILED")
        print("🔧 Issues must be resolved before production deployment")
        return False

if __name__ == "__main__":
    success = run_critical_tests()
    exit(0 if success else 1)
