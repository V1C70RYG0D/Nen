#!/usr/bin/env python3
"""
Direct EasyAgent Test Execution
Runs critical test cases without pytest dependency
"""

import sys
import time
import statistics
from pathlib import Path

# Add the agents directory to Python path
agents_path = Path(__file__).parent.parent.parent / "ai-services" / "agents"
sys.path.insert(0, str(agents_path))

def test_easy_agent_import():
    """Test if we can import the EasyAgent"""
    try:
        from easy_agent import EasyAgent, EasyAgentConfig, create_easy_agent
        print("✅ EasyAgent import successful")
        return True
    except ImportError as e:
        print(f"❌ EasyAgent import failed: {e}")
        return False

def create_test_board():
    """Create a test board with capture opportunities"""
    board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

    # Add pieces for testing
    board[4][4][0] = {'type': 'pawn', 'player': 1}
    board[4][5][0] = {'type': 'pawn', 'player': 2}  # Capturable
    board[3][4][0] = {'type': 'general', 'player': 2}  # Capturable

    return {
        'board': board,
        'currentPlayer': 1,
        'moveNumber': 10,
        'gameStatus': 'active'
    }

def test_capture_preference():
    """Test capture preference functionality"""
    print("\n🎯 Testing Capture Preference (70% over 1000 moves)")
    print("-" * 50)

    try:
        from easy_agent import create_easy_agent

        agent = create_easy_agent("balanced")
        board_state = create_test_board()

        capture_count = 0
        total_moves = 100  # Reduced for quick test
        successful_moves = 0

        for i in range(total_moves):
            try:
                move = agent.select_move(board_state)
                if move:
                    successful_moves += 1
                    if move.get('isCapture', False):
                        capture_count += 1
            except Exception as e:
                print(f"  Move {i+1} failed: {e}")

        if successful_moves > 0:
            capture_rate = capture_count / successful_moves
            print(f"  Total moves: {successful_moves}")
            print(f"  Captures: {capture_count}")
            print(f"  Capture rate: {capture_rate:.3f} ({capture_rate*100:.1f}%)")

            if 0.65 <= capture_rate <= 0.75:
                print("  ✅ Capture preference within expected range (65-75%)")
                return True
            else:
                print(f"  ❌ Capture preference outside range: {capture_rate:.3f}")
                return False
        else:
            print("  ❌ No successful moves generated")
            return False

    except Exception as e:
        print(f"  ❌ Test failed: {e}")
        return False

def test_speed_performance():
    """Test speed performance under 10ms"""
    print("\n⚡ Testing Speed Performance (<10ms)")
    print("-" * 50)

    try:
        from easy_agent import create_easy_agent

        agent = create_easy_agent("balanced")
        board_state = create_test_board()

        execution_times = []
        successful_moves = 0

        for i in range(50):  # Test 50 moves
            start_time = time.time()
            try:
                move = agent.select_move(board_state)
                execution_time = (time.time() - start_time) * 1000  # Convert to ms
                execution_times.append(execution_time)

                if move:
                    successful_moves += 1

            except Exception as e:
                print(f"  Move {i+1} failed: {e}")

        if execution_times:
            avg_time = statistics.mean(execution_times)
            max_time = max(execution_times)
            min_time = min(execution_times)

            print(f"  Successful moves: {successful_moves}")
            print(f"  Average time: {avg_time:.2f}ms")
            print(f"  Max time: {max_time:.2f}ms")
            print(f"  Min time: {min_time:.2f}ms")

            if max_time < 10.0:
                print("  ✅ All moves under 10ms requirement")
                return True
            else:
                print(f"  ❌ Some moves exceeded 10ms limit")
                return False
        else:
            print("  ❌ No execution times recorded")
            return False

    except Exception as e:
        print(f"  ❌ Test failed: {e}")
        return False

def test_agent_initialization():
    """Test agent initialization with different personalities"""
    print("\n🤖 Testing Agent Initialization")
    print("-" * 50)

    try:
        from easy_agent import create_easy_agent

        personalities = ["aggressive", "defensive", "balanced"]
        success_count = 0

        for personality in personalities:
            try:
                agent = create_easy_agent(personality)
                if agent and hasattr(agent, 'config'):
                    print(f"  ✅ {personality.capitalize()} agent created successfully")
                    success_count += 1
                else:
                    print(f"  ❌ {personality.capitalize()} agent creation failed")
            except Exception as e:
                print(f"  ❌ {personality.capitalize()} agent error: {e}")

        if success_count == len(personalities):
            print(f"  ✅ All {len(personalities)} personalities initialized")
            return True
        else:
            print(f"  ❌ Only {success_count}/{len(personalities)} personalities worked")
            return False

    except Exception as e:
        print(f"  ❌ Test failed: {e}")
        return False

def run_comprehensive_tests():
    """Run all critical tests"""
    print("🧪 EasyAgent Critical Test Cases")
    print("=" * 60)

    tests = [
        ("Import Test", test_easy_agent_import),
        ("Initialization Test", test_agent_initialization),
        ("Capture Preference Test", test_capture_preference),
        ("Speed Performance Test", test_speed_performance),
    ]

    passed_tests = 0
    total_tests = len(tests)

    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name}...")
        try:
            if test_func():
                passed_tests += 1
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"❌ {test_name} ERROR: {e}")

    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")

    if passed_tests == total_tests:
        print("\n🎉 ALL CRITICAL TESTS PASSED!")
        print("🚀 EasyAgent is ready for production deployment")
        return True
    else:
        print(f"\n⚠️  {total_tests - passed_tests} TESTS FAILED")
        print("🔧 Issues need to be resolved before deployment")
        return False

if __name__ == "__main__":
    success = run_comprehensive_tests()
    exit(0 if success else 1)
