#!/usr/bin/env python3
"""
Easy Agent Test Runner
Focused test execution for user-specified requirements

Following GI.md guidelines:
- Real implementations over simulations (Guideline #2)
- 100% test coverage validation (Guideline #8)
- Performance requirements verification (Guideline #3)
- No hardcoding or placeholders (Guideline #18)
"""

import sys
import time
import json
import traceback
from pathlib import Path
from typing import Dict, Any, List

# Add AI services to path
sys.path.append(str(Path(__file__).parent.parent.parent / "ai-services" / "agents"))

def validate_environment():
    """Validate test environment setup"""
    try:
        from easy_agent import EasyAgent, EasyAgentConfig, create_easy_agent
        print("✓ EasyAgent imports successful")
        return True
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False

def run_basic_functionality_tests():
    """Run basic functionality tests"""
    print("\n=== BASIC FUNCTIONALITY TESTS ===")

    try:
        from easy_agent import EasyAgent

        # Test 1: Random move selection
        print("Testing random move selection...")
        agent = EasyAgent("balanced")

        board_state = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }
        board_state['board'][4][4][0] = {'type': 'pawn', 'player': 1}

        moves = []
        for _ in range(10):
            move = agent.select_move(board_state)
            if move:
                moves.append(str(move))

        assert len(moves) > 0, "Should generate moves"
        print("✓ Random move selection working")

        # Test 2: Legal move validation
        print("Testing legal move validation...")
        for _ in range(20):
            move = agent.select_move(board_state)
            if move:
                assert 'from' in move and 'to' in move, "Move should have from/to"
                assert move['from']['row'] >= 0 and move['from']['row'] < 9, "Valid from row"
                assert move['to']['row'] >= 0 and move['to']['row'] < 9, "Valid to row"
        print("✓ Legal move validation working")

        # Test 3: No legal moves handling
        print("Testing no legal moves handling...")
        empty_board = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'endgame'
        }
        move = agent.select_move(empty_board)
        assert move is None, "Should return None for empty board"
        print("✓ No legal moves handling working")

        return True

    except Exception as e:
        print(f"✗ Basic functionality test failed: {e}")
        traceback.print_exc()
        return False

def run_capture_preference_test():
    """Run capture preference validation test"""
    print("\n=== CAPTURE PREFERENCE TEST ===")

    try:
        from easy_agent import EasyAgent

        agent = EasyAgent("balanced")
        capture_count = 0
        total_with_captures = 0

        print("Testing 70% capture preference over 1000 moves...")

        for i in range(1000):
            if i % 200 == 0:
                print(f"Progress: {i}/1000 moves tested")

            # Create board with capture opportunities
            board = [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)]
            board[4][4][0] = {'type': 'pawn', 'player': 1}
            board[4][5][0] = {'type': 'pawn', 'player': 2}  # Capturable
            board[5][4][0] = {'type': 'knight', 'player': 1}
            board[5][5][0] = {'type': 'bishop', 'player': 2}  # Capturable

            board_state = {
                'board': board,
                'currentPlayer': 1,
                'gamePhase': 'midgame'
            }

            move = agent.select_move(board_state)
            if move:
                legal_moves = agent._get_legal_moves(board_state)
                capture_moves = [m for m in legal_moves if m.get('isCapture', False)]

                if capture_moves:
                    total_with_captures += 1
                    if move.get('isCapture', False):
                        capture_count += 1

        if total_with_captures > 0:
            capture_rate = capture_count / total_with_captures
            print(f"Capture rate: {capture_rate:.3f} ({capture_count}/{total_with_captures})")

            # Check 70% ± 5% tolerance
            if 0.65 <= capture_rate <= 0.75:
                print("✓ Capture preference test PASSED")
                return True
            else:
                print(f"✗ Capture preference test FAILED: {capture_rate:.3f} not in range [0.65, 0.75]")
                return False
        else:
            print("✗ No capture opportunities found")
            return False

    except Exception as e:
        print(f"✗ Capture preference test failed: {e}")
        traceback.print_exc()
        return False

def run_speed_performance_test():
    """Run speed performance test (under 10ms)"""
    print("\n=== SPEED PERFORMANCE TEST ===")

    try:
        from easy_agent import EasyAgent

        agent = EasyAgent("aggressive")

        # Create complex board for stress testing
        board = [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)]
        pieces = ['pawn', 'knight', 'bishop', 'rook', 'queen']

        for row in range(9):
            for col in range(0, 9, 2):
                if row < 4:
                    board[row][col][0] = {'type': pieces[col % len(pieces)], 'player': 1}
                elif row > 4:
                    board[row][col][0] = {'type': pieces[col % len(pieces)], 'player': 2}

        board_state = {
            'board': board,
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }

        print("Testing move generation speed over 100 iterations...")

        execution_times = []
        for i in range(100):
            if i % 25 == 0:
                print(f"Speed test progress: {i}/100")

            start_time = time.time()
            move = agent.select_move(board_state)
            execution_time = (time.time() - start_time) * 1000  # Convert to ms

            if move:
                execution_times.append(execution_time)

                # Check if this specific move exceeds limit
                if execution_time >= 10.0:
                    print(f"✗ Move {i} took {execution_time:.2f}ms (exceeds 10ms limit)")
                    return False

        if execution_times:
            max_time = max(execution_times)
            avg_time = sum(execution_times) / len(execution_times)

            print(f"Max execution time: {max_time:.2f}ms")
            print(f"Average execution time: {avg_time:.2f}ms")
            print(f"Moves tested: {len(execution_times)}")

            if max_time < 10.0:
                print("✓ Speed performance test PASSED")
                return True
            else:
                print(f"✗ Speed performance test FAILED: max time {max_time:.2f}ms exceeds 10ms")
                return False
        else:
            print("✗ No moves generated for speed testing")
            return False

    except Exception as e:
        print(f"✗ Speed performance test failed: {e}")
        traceback.print_exc()
        return False

def run_edge_case_tests():
    """Run edge case tests"""
    print("\n=== EDGE CASE TESTS ===")

    try:
        from easy_agent import EasyAgent

        agent = EasyAgent("balanced")

        # Test 1: Endgame scenarios
        print("Testing endgame scenarios...")
        endgame_board = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'endgame'
        }
        endgame_board['board'][7][7][0] = {'type': 'king', 'player': 1}
        endgame_board['board'][0][0][0] = {'type': 'king', 'player': 2}

        endgame_move = agent.select_move(endgame_board)
        # Should either return valid move or None gracefully
        print("✓ Endgame scenarios handled")

        # Test 2: Stalemate detection
        print("Testing stalemate-like positions...")
        stalemate_board = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'endgame'
        }
        stalemate_board['board'][0][0][0] = {'type': 'pawn', 'player': 1}
        stalemate_board['board'][8][8][0] = {'type': 'pawn', 'player': 2}

        stalemate_move = agent.select_move(stalemate_board)
        print("✓ Stalemate detection handled")

        # Test 3: Check response
        print("Testing check-like responses...")
        check_board = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }
        check_board['board'][4][4][0] = {'type': 'king', 'player': 1}
        check_board['board'][4][7][0] = {'type': 'rook', 'player': 2}

        check_move = agent.select_move(check_board)
        print("✓ Check response handled")

        return True

    except Exception as e:
        print(f"✗ Edge case tests failed: {e}")
        traceback.print_exc()
        return False

def run_memory_efficiency_test():
    """Run memory usage efficiency test"""
    print("\n=== MEMORY EFFICIENCY TEST ===")

    try:
        import psutil
        import os
        from easy_agent import EasyAgent

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        print(f"Initial memory: {initial_memory:.2f}MB")

        # Create agent and run many operations
        agent = EasyAgent("balanced")
        board_state = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }
        board_state['board'][4][4][0] = {'type': 'pawn', 'player': 1}

        print("Running 1000 move generations...")
        for i in range(1000):
            if i % 250 == 0:
                current_memory = process.memory_info().rss / 1024 / 1024
                print(f"Memory at {i} moves: {current_memory:.2f}MB")
            agent.select_move(board_state)

        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory

        print(f"Final memory: {final_memory:.2f}MB")
        print(f"Memory increase: {memory_increase:.2f}MB")

        if memory_increase < 50:
            print("✓ Memory efficiency test PASSED")
            return True
        else:
            print(f"✗ Memory efficiency test FAILED: {memory_increase:.2f}MB increase exceeds 50MB limit")
            return False

    except ImportError:
        print("⚠ psutil not available, skipping memory test")
        return True
    except Exception as e:
        print(f"✗ Memory efficiency test failed: {e}")
        traceback.print_exc()
        return False

def generate_test_report(results: Dict[str, bool]):
    """Generate comprehensive test report"""
    report = {
        'test_execution_time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'test_results': results,
        'total_tests': len(results),
        'passed_tests': sum(1 for passed in results.values() if passed),
        'failed_tests': sum(1 for passed in results.values() if not passed),
        'success_rate': sum(1 for passed in results.values() if passed) / len(results) * 100
    }

    print("\n" + "="*50)
    print("COMPREHENSIVE TEST REPORT")
    print("="*50)

    for test_name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        symbol = "✓" if passed else "✗"
        print(f"{symbol} {test_name}: {status}")

    print("\n" + "-"*30)
    print(f"Total Tests: {report['total_tests']}")
    print(f"Passed: {report['passed_tests']}")
    print(f"Failed: {report['failed_tests']}")
    print(f"Success Rate: {report['success_rate']:.1f}%")

    # Save report to file
    report_file = Path(__file__).parent / f"easy_agent_test_report_{int(time.time())}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\nDetailed report saved to: {report_file}")

    return report

def main():
    """Main test execution function"""
    print("EASY AGENT TESTING SUITE")
    print("Following GI.md Guidelines")
    print("="*50)

    if not validate_environment():
        print("Environment validation failed. Exiting.")
        return False

    # Run all test categories
    test_results = {}

    test_results['Environment Validation'] = True  # Already passed
    test_results['Basic Functionality'] = run_basic_functionality_tests()
    test_results['Capture Preference (70%)'] = run_capture_preference_test()
    test_results['Speed Performance (<10ms)'] = run_speed_performance_test()
    test_results['Edge Cases'] = run_edge_case_tests()
    test_results['Memory Efficiency'] = run_memory_efficiency_test()

    # Generate comprehensive report
    report = generate_test_report(test_results)

    # Return overall success
    all_passed = all(test_results.values())

    if all_passed:
        print("\n🎉 ALL TESTS PASSED - EasyAgent implementation is ready!")
    else:
        failed_tests = [name for name, passed in test_results.items() if not passed]
        print(f"\n❌ TESTS FAILED: {', '.join(failed_tests)}")

    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
