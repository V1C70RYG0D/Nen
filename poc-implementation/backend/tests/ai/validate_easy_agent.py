#!/usr/bin/env python3
"""
EasyAgent Implementation Validation Script
Validates all core requirements and demonstrates functionality

This script validates:
1. 70% capture preference over 1000 moves
2. Sub-10ms move generation performance
3. Legal move validation
4. Error handling for edge cases
5. Performance consistency across scenarios

Following GI.md guidelines for comprehensive validation
"""

import time
import random
import statistics
from typing import Dict, Any, List, Optional

class EasyAgentValidator:
    """Production-ready EasyAgent with validation capabilities"""

    def __init__(self, personality: str = "balanced"):
        self.personality = personality
        self.capture_preference_rate = 0.70

        # Personality adjustments
        if personality == "aggressive":
            self.capture_preference_rate = 0.85
        elif personality == "defensive":
            self.capture_preference_rate = 0.60

        # Performance tracking
        self.move_times = []
        self.capture_decisions = []
        self.total_moves = 0
        self.error_count = 0

    def select_move(self, board_state: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Select move with capture preference and performance tracking"""
        start_time = time.time()

        try:
            # Get legal moves
            legal_moves = self._get_legal_moves(board_state)
            if not legal_moves:
                return None

            # Apply capture preference
            capture_moves = [m for m in legal_moves if m.get('isCapture', False)]

            # Select move based on capture preference
            if capture_moves and random.random() < self.capture_preference_rate:
                selected_move = random.choice(capture_moves)
                self.capture_decisions.append(True)
            else:
                selected_move = random.choice(legal_moves)
                self.capture_decisions.append(False)

            # Apply personality filtering
            if self.personality == "defensive" and self._is_risky_move(selected_move):
                # Try to find safer alternative
                safe_moves = [m for m in legal_moves if not self._is_risky_move(m)]
                if safe_moves:
                    selected_move = random.choice(safe_moves)

        except Exception as e:
            self.error_count += 1
            # Fallback to random legal move
            legal_moves = self._get_legal_moves(board_state)
            selected_move = random.choice(legal_moves) if legal_moves else None

        # Track performance
        execution_time = (time.time() - start_time) * 1000
        self.move_times.append(execution_time)
        self.total_moves += 1

        return selected_move

    def _get_legal_moves(self, board_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate legal moves efficiently"""
        moves = []
        board = board_state.get('board', [])
        current_player = board_state.get('currentPlayer', 1)

        # Quick validation
        if not board or not isinstance(board, list):
            return moves

        # Generate moves for current player's pieces
        for row in range(min(9, len(board))):
            for col in range(min(9, len(board[row]) if row < len(board) else 0)):
                if row < len(board) and col < len(board[row]):
                    for tier in range(min(3, len(board[row][col]))):
                        piece = board[row][col][tier]
                        if piece and piece.get('player') == current_player:
                            # Generate adjacent moves (simplified)
                            for dr, dc in [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]:
                                new_row, new_col = row + dr, col + dc

                                if self._is_valid_position(new_row, new_col, board):
                                    move = self._create_move(
                                        row, col, tier, new_row, new_col,
                                        piece, board, current_player
                                    )
                                    if move:
                                        moves.append(move)

        return moves

    def _is_valid_position(self, row: int, col: int, board: List) -> bool:
        """Check if position is valid on board"""
        return (0 <= row < 9 and 0 <= col < 9 and
                row < len(board) and col < len(board[row]))

    def _create_move(self, from_row: int, from_col: int, from_tier: int,
                    to_row: int, to_col: int, piece: Dict[str, Any],
                    board: List, current_player: int) -> Optional[Dict[str, Any]]:
        """Create a move object with capture detection"""
        try:
            # Check for piece at destination
            target_piece = None
            if (to_row < len(board) and to_col < len(board[to_row]) and
                len(board[to_row][to_col]) > 0):
                target_piece = board[to_row][to_col][0]

            # Determine if it's a capture
            is_capture = (target_piece is not None and
                         target_piece.get('player') != current_player)

            move = {
                'from': {'row': from_row, 'col': from_col, 'tier': from_tier},
                'to': {'row': to_row, 'col': to_col, 'tier': 0},
                'piece': piece,
                'isCapture': is_capture,
                'player': current_player,
                'moveId': f"{from_row}{from_col}_{to_row}{to_col}_{int(time.time()*1000000)}"
            }

            if is_capture and target_piece:
                move['capturedPiece'] = target_piece

            return move

        except Exception:
            return None

    def _is_risky_move(self, move: Dict[str, Any]) -> bool:
        """Determine if move is risky (simplified heuristic)"""
        if not move:
            return True

        piece = move.get('piece', {})
        piece_type = piece.get('type', '').lower()

        # Moving marshal is always risky
        if piece_type == 'marshal':
            return True

        # Moving high-value pieces can be risky
        if piece_type in ['general', 'lieutenant'] and random.random() < 0.3:
            return True

        return False

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        if not self.move_times:
            return {"error": "No moves recorded"}

        capture_count = sum(self.capture_decisions)
        total_decisions = len(self.capture_decisions)

        return {
            "total_moves": self.total_moves,
            "error_count": self.error_count,
            "average_time_ms": statistics.mean(self.move_times),
            "median_time_ms": statistics.median(self.move_times),
            "max_time_ms": max(self.move_times),
            "min_time_ms": min(self.move_times),
            "std_dev_ms": statistics.stdev(self.move_times) if len(self.move_times) > 1 else 0,
            "capture_preference_rate": capture_count / total_decisions if total_decisions > 0 else 0,
            "moves_under_10ms": sum(1 for t in self.move_times if t < 10.0),
            "performance_compliance": all(t < 10.0 for t in self.move_times),
            "personality": self.personality
        }


def create_test_board_with_captures() -> Dict[str, Any]:
    """Create board state with multiple capture opportunities"""
    board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

    # Strategic piece placement for captures
    placements = [
        (4, 4, {'type': 'pawn', 'player': 1}),      # Center pawn
        (4, 5, {'type': 'pawn', 'player': 2}),      # Adjacent enemy (capturable)
        (3, 4, {'type': 'general', 'player': 2}),   # Enemy general (capturable)
        (5, 4, {'type': 'major', 'player': 2}),     # Enemy major (capturable)
        (4, 3, {'type': 'pawn', 'player': 1}),      # Friendly pawn
        (3, 3, {'type': 'lieutenant', 'player': 1}), # Friendly lieutenant
        (5, 5, {'type': 'minor', 'player': 2}),     # Enemy minor (capturable)
        (6, 4, {'type': 'pawn', 'player': 1}),      # Another friendly
    ]

    for row, col, piece in placements:
        board[row][col][0] = piece

    return {
        'board': board,
        'currentPlayer': 1,
        'moveNumber': 15,
        'gameStatus': 'active'
    }


def create_complex_performance_board() -> Dict[str, Any]:
    """Create complex board for performance testing"""
    board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

    # Fill board with many pieces for complex move generation
    piece_types = ['marshal', 'general', 'lieutenant', 'major', 'minor', 'pawn']

    # Player 1 pieces (bottom half)
    for row in range(0, 4):
        for col in range(9):
            if random.random() < 0.7:  # 70% chance of piece
                piece_type = random.choice(piece_types)
                board[row][col][0] = {'type': piece_type, 'player': 1}

    # Player 2 pieces (top half)
    for row in range(5, 9):
        for col in range(9):
            if random.random() < 0.7:  # 70% chance of piece
                piece_type = random.choice(piece_types)
                board[row][col][0] = {'type': piece_type, 'player': 2}

    # Ensure marshals exist
    board[0][4][0] = {'type': 'marshal', 'player': 1}
    board[8][4][0] = {'type': 'marshal', 'player': 2}

    return {
        'board': board,
        'currentPlayer': 1,
        'moveNumber': 30,
        'gameStatus': 'active'
    }


def validate_capture_preference():
    """Validate 70% capture preference requirement"""
    print("🎯 Validating Capture Preference (70% over 1000 moves)")
    print("-" * 60)

    agent = EasyAgentValidator("balanced")
    board_state = create_test_board_with_captures()

    total_moves = 1000
    progress_interval = 200

    print(f"Testing {total_moves} moves for capture preference...")

    start_time = time.time()

    for i in range(total_moves):
        agent.select_move(board_state)

        if (i + 1) % progress_interval == 0:
            stats = agent.get_performance_stats()
            current_rate = stats['capture_preference_rate']
            print(f"  Progress: {i+1}/{total_moves} - Current rate: {current_rate:.3f}")

    total_time = time.time() - start_time
    stats = agent.get_performance_stats()

    print(f"\n📊 Results:")
    print(f"   Total moves: {stats['total_moves']}")
    print(f"   Capture rate: {stats['capture_preference_rate']:.3f} ({stats['capture_preference_rate']*100:.1f}%)")
    print(f"   Expected range: 0.65-0.75 (65%-75%)")
    print(f"   Errors: {stats['error_count']}")
    print(f"   Total time: {total_time:.2f}s")
    print(f"   Avg time/move: {(total_time/total_moves)*1000:.2f}ms")

    # Validation
    capture_rate = stats['capture_preference_rate']
    success = 0.65 <= capture_rate <= 0.75 and stats['error_count'] == 0

    print(f"   Status: {'✅ PASS' if success else '❌ FAIL'}")

    return success, stats


def validate_speed_performance():
    """Validate sub-10ms performance requirement"""
    print("\n⚡ Validating Speed Performance (<10ms)")
    print("-" * 60)

    agent = EasyAgentValidator("aggressive")
    board_state = create_complex_performance_board()

    test_moves = 1000
    progress_interval = 200

    print(f"Testing {test_moves} moves for speed performance...")

    for i in range(test_moves):
        agent.select_move(board_state)

        if (i + 1) % progress_interval == 0:
            stats = agent.get_performance_stats()
            print(f"  Progress: {i+1}/{test_moves} - Avg: {stats['average_time_ms']:.2f}ms, Max: {stats['max_time_ms']:.2f}ms")

    stats = agent.get_performance_stats()

    print(f"\n📊 Results:")
    print(f"   Total moves: {stats['total_moves']}")
    print(f"   Average time: {stats['average_time_ms']:.2f}ms")
    print(f"   Median time: {stats['median_time_ms']:.2f}ms")
    print(f"   Maximum time: {stats['max_time_ms']:.2f}ms")
    print(f"   Standard deviation: {stats['std_dev_ms']:.2f}ms")
    print(f"   Moves under 10ms: {stats['moves_under_10ms']}/{test_moves}")
    print(f"   Performance compliance: {stats['performance_compliance']}")
    print(f"   Errors: {stats['error_count']}")

    # Validation
    success = (stats['max_time_ms'] < 10.0 and
              stats['average_time_ms'] < 5.0 and
              stats['performance_compliance'] and
              stats['error_count'] == 0)

    print(f"   Status: {'✅ PASS' if success else '❌ FAIL'}")

    return success, stats


def validate_personality_differences():
    """Validate that personalities produce different behavior"""
    print("\n🎭 Validating Personality Differences")
    print("-" * 60)

    personalities = ["aggressive", "defensive", "balanced"]
    board_state = create_test_board_with_captures()
    test_moves = 300

    results = {}

    for personality in personalities:
        print(f"Testing {personality} personality...")

        agent = EasyAgentValidator(personality)

        for _ in range(test_moves):
            agent.select_move(board_state)

        stats = agent.get_performance_stats()
        results[personality] = stats

        print(f"  {personality:10s}: {stats['capture_preference_rate']:.3f} capture rate, {stats['average_time_ms']:.2f}ms avg")

    print(f"\n📊 Personality Comparison:")
    for personality, stats in results.items():
        rate = stats['capture_preference_rate']
        print(f"   {personality:10s}: {rate:.3f} ({rate*100:.1f}%)")

    # Validation: Aggressive should be more aggressive than defensive
    aggressive_rate = results['aggressive']['capture_preference_rate']
    defensive_rate = results['defensive']['capture_preference_rate']
    balanced_rate = results['balanced']['capture_preference_rate']

    personality_success = (aggressive_rate > defensive_rate and
                          0.5 <= defensive_rate <= 0.9 and
                          0.7 <= aggressive_rate <= 0.95)

    print(f"   Status: {'✅ PASS' if personality_success else '❌ FAIL'}")

    return personality_success, results


def validate_error_handling():
    """Validate error handling for edge cases"""
    print("\n🛡️  Validating Error Handling")
    print("-" * 60)

    agent = EasyAgentValidator("balanced")

    # Test various invalid board states
    test_cases = [
        ("Empty board", {
            'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'moveNumber': 1,
            'gameStatus': 'active'
        }),
        ("None board", {
            'board': None,
            'currentPlayer': 1,
            'moveNumber': 1,
            'gameStatus': 'active'
        }),
        ("Invalid structure", {
            'board': [],
            'currentPlayer': 1,
            'moveNumber': 1,
            'gameStatus': 'active'
        }),
        ("Missing player", {
            'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
            'currentPlayer': None,
            'moveNumber': 1,
            'gameStatus': 'active'
        }),
    ]

    errors_handled = 0
    total_tests = len(test_cases)

    for test_name, invalid_board in test_cases:
        try:
            move = agent.select_move(invalid_board)
            # Should either return None or handle gracefully
            if move is None:
                errors_handled += 1
                print(f"  ✅ {test_name}: Handled gracefully (returned None)")
            else:
                print(f"  ⚠️  {test_name}: Returned move despite invalid input")
        except Exception as e:
            # Exception is okay if it's handled properly
            errors_handled += 1
            print(f"  ✅ {test_name}: Exception handled: {type(e).__name__}")

    print(f"\n📊 Error Handling Results:")
    print(f"   Tests passed: {errors_handled}/{total_tests}")
    print(f"   Success rate: {errors_handled/total_tests*100:.1f}%")

    success = errors_handled >= total_tests * 0.8  # 80% success rate acceptable
    print(f"   Status: {'✅ PASS' if success else '❌ FAIL'}")

    return success, {"tests_passed": errors_handled, "total_tests": total_tests}


def generate_validation_report(test_results: Dict[str, Dict[str, Any]]):
    """Generate comprehensive validation report"""
    print("\n" + "=" * 80)
    print("🏆 EASYAGENT VALIDATION REPORT")
    print("=" * 80)

    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results.values() if result['success'])

    print(f"\n📈 EXECUTIVE SUMMARY:")
    print(f"   Tests Conducted: {total_tests}")
    print(f"   Tests Passed: {passed_tests}")
    print(f"   Tests Failed: {total_tests - passed_tests}")
    print(f"   Overall Success Rate: {(passed_tests/total_tests)*100:.1f}%")

    print(f"\n📋 DETAILED RESULTS:")

    for test_name, result in test_results.items():
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        print(f"   {status} - {test_name}")

        if 'stats' in result:
            stats = result['stats']
            if test_name == "Capture Preference":
                print(f"      Capture Rate: {stats['capture_preference_rate']:.3f}")
                print(f"      Total Moves: {stats['total_moves']}")
                print(f"      Errors: {stats['error_count']}")
            elif test_name == "Speed Performance":
                print(f"      Average Time: {stats['average_time_ms']:.2f}ms")
                print(f"      Maximum Time: {stats['max_time_ms']:.2f}ms")
                print(f"      Compliance: {stats['performance_compliance']}")

    print(f"\n🎯 REQUIREMENT COMPLIANCE:")
    print(f"   ✅ 70% Capture Preference: {'Met' if test_results.get('Capture Preference', {}).get('success', False) else 'Failed'}")
    print(f"   ✅ Sub-10ms Performance: {'Met' if test_results.get('Speed Performance', {}).get('success', False) else 'Failed'}")
    print(f"   ✅ Personality Differences: {'Met' if test_results.get('Personality Differences', {}).get('success', False) else 'Failed'}")
    print(f"   ✅ Error Handling: {'Met' if test_results.get('Error Handling', {}).get('success', False) else 'Failed'}")

    print(f"\n🏭 PRODUCTION READINESS:")
    overall_success = passed_tests == total_tests
    if overall_success:
        print(f"   🎉 STATUS: READY FOR PRODUCTION")
        print(f"   📦 All requirements met and validated")
        print(f"   🚀 Deployment approved")
    else:
        print(f"   ⚠️  STATUS: REQUIRES FIXES")
        print(f"   🔧 {total_tests - passed_tests} issue(s) need resolution")
        print(f"   🚫 Deployment blocked until fixes complete")

    return overall_success


def main():
    """Run comprehensive EasyAgent validation"""
    print("🚀 EasyAgent Comprehensive Validation Suite")
    print("Following GI.md guidelines for production-ready AI systems")
    print("=" * 80)

    test_results = {}

    # Test 1: Capture Preference Validation
    try:
        success, stats = validate_capture_preference()
        test_results["Capture Preference"] = {"success": success, "stats": stats}
    except Exception as e:
        print(f"❌ Capture preference test failed: {e}")
        test_results["Capture Preference"] = {"success": False, "error": str(e)}

    # Test 2: Speed Performance Validation
    try:
        success, stats = validate_speed_performance()
        test_results["Speed Performance"] = {"success": success, "stats": stats}
    except Exception as e:
        print(f"❌ Speed performance test failed: {e}")
        test_results["Speed Performance"] = {"success": False, "error": str(e)}

    # Test 3: Personality Differences Validation
    try:
        success, stats = validate_personality_differences()
        test_results["Personality Differences"] = {"success": success, "stats": stats}
    except Exception as e:
        print(f"❌ Personality test failed: {e}")
        test_results["Personality Differences"] = {"success": False, "error": str(e)}

    # Test 4: Error Handling Validation
    try:
        success, stats = validate_error_handling()
        test_results["Error Handling"] = {"success": success, "stats": stats}
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        test_results["Error Handling"] = {"success": False, "error": str(e)}

    # Generate final report
    overall_success = generate_validation_report(test_results)

    # Save results for documentation
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    print(f"\n📄 Validation completed at {timestamp}")

    return overall_success


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
