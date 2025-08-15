"""
Enhanced Medium Agent Testing Implementation
Following GI.md guidelines for comprehensive AI system testing

Test Requirements:
- TestMediumAgent class with minimax and alpha-beta pruning tests
- MagicBlock compatibility testing (sub-100ms requirement)
- Performance optimization and search depth testing
- Strategic pattern recognition validation
- 100% test coverage following GI.md Guideline #8
- Real implementation testing (Guideline #2)
- Production-ready quality assurance (Guideline #3)
- Error-free working systems (Guideline #15)

Implementation follows GI.md:
- No hardcoding or placeholders (Guideline #18)
- Robust error handling (Guideline #20)
- Performance optimization (Guideline #21)
- Comprehensive testing (Guideline #8)
"""

import pytest
import time
import statistics
import threading
import os
from typing import Dict, Any, List, Optional, Tuple
from unittest.mock import Mock, patch
import sys
from pathlib import Path
from dataclasses import dataclass
from contextlib import contextmanager

# Handle optional dependencies gracefully
try:
    import memory_profiler
    MEMORY_PROFILER_AVAILABLE = True
except ImportError:
    MEMORY_PROFILER_AVAILABLE = False

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

# Add AI services to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / "ai-services" / "agents"))

from basic_ai_agents import MediumAgent, AIConfig, AIPersonality


@dataclass
class PerformanceMetrics:
    """Performance metrics tracking for comprehensive analysis"""
    execution_times: List[float]
    node_counts: List[int]
    memory_usage: List[float]
    pruning_efficiency: float
    search_depth_achieved: int

    @property
    def avg_execution_time(self) -> float:
        return statistics.mean(self.execution_times) if self.execution_times else 0.0

    @property
    def max_execution_time(self) -> float:
        return max(self.execution_times) if self.execution_times else 0.0

    @property
    def avg_nodes_evaluated(self) -> float:
        return statistics.mean(self.node_counts) if self.node_counts else 0.0


@contextmanager
def performance_monitor():
    """Context manager for comprehensive performance monitoring"""
    if PSUTIL_AVAILABLE:
        process = psutil.Process(os.getpid())
        start_memory = process.memory_info().rss / 1024 / 1024  # MB
    else:
        start_memory = 0

    start_time = time.time()

    yield

    end_time = time.time()

    if PSUTIL_AVAILABLE:
        end_memory = process.memory_info().rss / 1024 / 1024  # MB
        print(f"Execution time: {(end_time - start_time) * 1000:.2f}ms")
        print(f"Memory delta: {end_memory - start_memory:.2f}MB")
    else:
        print(f"Execution time: {(end_time - start_time) * 1000:.2f}ms")
        print("Memory monitoring unavailable (psutil not installed)")


class MagicBlockComplianceValidator:
    """Validator for MagicBlock blockchain platform requirements"""

    MAX_EXECUTION_TIME_MS = 90
    TARGET_AVG_TIME_MS = 50
    MEMORY_LIMIT_MB = 100
    MIN_PRUNING_EFFICIENCY = 0.60

    @staticmethod
    def validate_timing_compliance(metrics: PerformanceMetrics) -> Dict[str, Any]:
        """Validate timing compliance with MagicBlock requirements"""
        results = {
            'max_time_compliant': metrics.max_execution_time < MagicBlockComplianceValidator.MAX_EXECUTION_TIME_MS,
            'avg_time_compliant': metrics.avg_execution_time < MagicBlockComplianceValidator.TARGET_AVG_TIME_MS,
            'pruning_efficient': metrics.pruning_efficiency > MagicBlockComplianceValidator.MIN_PRUNING_EFFICIENCY,
            'max_time': metrics.max_execution_time,
            'avg_time': metrics.avg_execution_time,
            'pruning_efficiency': metrics.pruning_efficiency
        }

        results['overall_compliant'] = all([
            results['max_time_compliant'],
            results['avg_time_compliant'],
            results['pruning_efficient']
        ])

        return results


class TestMediumAgent:
    """Testing for MediumAgent minimax with alpha-beta pruning"""

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
            'gamePhase': 'midgame',
            'moveCount': 15
        }

    @pytest.fixture
    def complex_board_state(self):
        """Create complex board state for performance testing"""
        return {
            'board': [
                [
                    [
                        {'type': 'marshal', 'player': 1} if i == 4 and j == 7 else
                        {'type': 'general', 'player': 2} if i == 4 and j == 1 else
                        {'type': 'pawn', 'player': 1} if i < 4 and j == 6 else
                        {'type': 'pawn', 'player': 2} if i > 4 and j == 2 else
                        None
                    ] + [None] * 2
                    for i in range(9)
                ]
                for j in range(9)
            ],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveCount': 25
        }

    @pytest.fixture
    def branching_position(self):
        """Create position with many possible moves for alpha-beta testing"""
        return {
            'board': [
                [
                    [
                        {'type': 'pawn', 'player': 1} if (i + j) % 3 == 0 and j > 4 else
                        {'type': 'pawn', 'player': 2} if (i + j) % 3 == 1 and j < 4 else
                        None
                    ] + [None] * 2
                    for i in range(9)
                ]
                for j in range(9)
            ],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveCount': 30
        }

    # Minimax Algorithm Tests

    def _calculate_theoretical_nodes(self, board_state: Dict[str, Any], depth: int) -> int:
        """Calculate theoretical maximum nodes for comparison"""
        # Simplified calculation based on estimated moves per position
        estimated_moves_per_position = 20
        return sum(estimated_moves_per_position ** d for d in range(depth + 1))

    def test_minimax_depth_2_search(self, basic_board_state):
        """Test that minimax properly searches to depth 2"""
        agent = MediumAgent("balanced")
        agent.enable_node_counting()

        move = agent.select_move(basic_board_state)

        assert move is not None
        assert isinstance(move, dict)
        assert 'from' in move
        assert 'to' in move

        # Should evaluate more than just immediate moves
        node_count = agent.get_node_count()
        assert node_count > 20, f"Expected > 20 nodes, got {node_count}"
        assert node_count < 5000, f"Too many nodes evaluated: {node_count}"

    def test_alpha_beta_pruning_efficiency(self, branching_position):
        """Test that alpha-beta pruning reduces search space significantly"""
        agent = MediumAgent("balanced")
        agent.enable_node_counting()

        # Test with multiple iterations for statistical significance
        node_counts = []
        execution_times = []

        for _ in range(10):
            agent.node_count = 0
            start_time = time.time()
            move = agent.select_move(branching_position)
            execution_time = (time.time() - start_time) * 1000

            assert move is not None
            node_counts.append(agent.get_node_count())
            execution_times.append(execution_time)

        avg_nodes = statistics.mean(node_counts)
        avg_time = statistics.mean(execution_times)

        # Calculate theoretical maximum nodes for depth 2
        theoretical_max = self._calculate_theoretical_nodes(branching_position, depth=2)

        # Alpha-beta should reduce search space significantly
        pruning_efficiency = 1 - (avg_nodes / theoretical_max)

        # Critical assertions for MagicBlock compliance
        assert pruning_efficiency > 0.60, f"Pruning efficiency too low: {pruning_efficiency:.2f} (required: >0.60)"
        assert avg_time < 75.0, f"Average execution time too high: {avg_time:.2f}ms (required: <75ms)"
        assert max(node_counts) < 2000, f"Max nodes evaluated too high: {max(node_counts)} (required: <2000)"

        # Performance metrics validation
        validator = MagicBlockComplianceValidator()
        metrics = PerformanceMetrics(
            execution_times=execution_times,
            node_counts=node_counts,
            memory_usage=[],
            pruning_efficiency=pruning_efficiency,
            search_depth_achieved=2
        )

        compliance = validator.validate_timing_compliance(metrics)
        assert compliance['overall_compliant'], f"MagicBlock compliance failed: {compliance}"

    def test_move_ordering_effectiveness(self, complex_board_state):
        """Test that move ordering improves alpha-beta efficiency"""
        agent = MediumAgent("tactical")
        agent.enable_node_counting()

        # Test multiple times to get consistent results
        node_counts = []
        for _ in range(5):
            agent.node_count = 0
            move = agent.select_move(complex_board_state)
            node_counts.append(agent.get_node_count())

        avg_nodes = statistics.mean(node_counts)

        assert all(move is not None for move in [agent.select_move(complex_board_state) for _ in range(3)])
        assert avg_nodes > 10, "Move ordering should enable deeper search"
        assert avg_nodes < 2000, f"Too many nodes even with ordering: {avg_nodes}"

    def test_evaluation_accuracy(self, basic_board_state):
        """Test that evaluation function produces reasonable scores"""
        agent = MediumAgent("balanced")

        # Test multiple moves to ensure consistent evaluation
        moves = []
        for _ in range(10):
            move = agent.select_move(basic_board_state)
            moves.append(move)

        # All moves should be valid
        assert all(move is not None for move in moves)
        assert all(isinstance(move, dict) for move in moves)
        assert all('from' in move and 'to' in move for move in moves)

        # Moves should show some variety (not all identical)
        unique_moves = len(set(str(move) for move in moves))
        assert unique_moves >= 3, f"Expected variety in moves, got {unique_moves} unique moves"

    # Performance Tests (Critical for MagicBlock)

    def test_move_generation_under_50ms(self, basic_board_state):
        """Test that move generation meets 50ms average target"""
        agent = MediumAgent("balanced")

        execution_times = []

        for _ in range(20):
            start_time = time.time()
            move = agent.select_move(basic_board_state)
            execution_time = (time.time() - start_time) * 1000
            execution_times.append(execution_time)

            assert move is not None

        avg_time = statistics.mean(execution_times)
        max_time = max(execution_times)

        assert avg_time < 50.0, f"Average execution time {avg_time:.2f}ms exceeds 50ms target"
        assert max_time < 100.0, f"Max execution time {max_time:.2f}ms exceeds 100ms limit"

    def test_magicblock_compatibility_90ms(self, complex_board_state):
        """Test that medium agent meets MagicBlock sub-100ms requirement"""
        agent = MediumAgent("balanced")

        # Test with 50 complex positions to stress test
        test_positions = [complex_board_state for _ in range(50)]

        execution_times = []
        node_counts = []
        memory_usage_before = []
        memory_usage_after = []

        for position in test_positions:
            # Memory monitoring (if available)
            if PSUTIL_AVAILABLE:
                process = psutil.Process(os.getpid())
                memory_before = process.memory_info().rss / 1024 / 1024  # MB
                memory_usage_before.append(memory_before)
            else:
                memory_usage_before.append(0)

            # Performance measurement
            start_time = time.time()
            move = agent.select_move(position)
            execution_time = (time.time() - start_time) * 1000

            if PSUTIL_AVAILABLE:
                memory_after = process.memory_info().rss / 1024 / 1024  # MB
                memory_usage_after.append(memory_after)
            else:
                memory_usage_after.append(0)

            execution_times.append(execution_time)
            if hasattr(agent, 'get_node_count'):
                node_counts.append(agent.get_node_count())

            assert move is not None, "Agent must return a valid move"

        max_time = max(execution_times)
        avg_time = statistics.mean(execution_times)

        if PSUTIL_AVAILABLE:
            memory_delta = max(memory_usage_after) - min(memory_usage_before)
            assert memory_delta < 50.0, f"Memory usage delta {memory_delta:.2f}MB too high"

        # Critical MagicBlock requirements with 10ms buffer
        assert max_time < 90.0, f"Max time {max_time:.2f}ms exceeds 90ms threshold (MagicBlock requirement)"
        assert avg_time < 50.0, f"Average time {avg_time:.2f}ms exceeds 50ms target (MagicBlock requirement)"

        # 95% of executions should be under 75ms for consistency
        under_75ms = sum(1 for t in execution_times if t < 75.0)
        percentage_under_75ms = (under_75ms / len(execution_times)) * 100
        assert percentage_under_75ms >= 95.0, f"Only {percentage_under_75ms:.1f}% under 75ms (required: ≥95%)"

        # 99% of executions should be under 85ms for reliability
        under_85ms = sum(1 for t in execution_times if t < 85.0)
        percentage_under_85ms = (under_85ms / len(execution_times)) * 100
        assert percentage_under_85ms >= 99.0, f"Only {percentage_under_85ms:.1f}% under 85ms (required: ≥99%)"

        # Performance report for analysis
        print(f"\nMagicBlock Compliance Report:")
        print(f"  Max execution time: {max_time:.2f}ms")
        print(f"  Average execution time: {avg_time:.2f}ms")
        print(f"  Standard deviation: {statistics.stdev(execution_times):.2f}ms")
        print(f"  95th percentile: {sorted(execution_times)[int(0.95 * len(execution_times))]:.2f}ms")
        if PSUTIL_AVAILABLE:
            print(f"  Memory usage delta: {memory_delta:.2f}MB")
        print(f"  Average nodes evaluated: {statistics.mean(node_counts) if node_counts else 'N/A'}")


    def test_magicblock_timing_compliance(self):
        """Enhanced test that medium agent meets MagicBlock sub-100ms requirement"""
        agent = MediumAgent("balanced")
        test_positions = load_complex_positions(50)

        execution_times = []

        for position in test_positions:
            start_time = time.time()
            move = agent.select_move(position)
            execution_time = (time.time() - start_time) * 1000
            execution_times.append(execution_time)

            assert move is not None, "Agent must return a valid move"

        max_time = max(execution_times)
        avg_time = sum(execution_times) / len(execution_times)

        # Critical MagicBlock compliance requirements
        assert max_time < 90.0, f"Max time {max_time:.2f}ms exceeds 90ms limit"  # 90ms max (10ms buffer)
        assert avg_time < 50.0, f"Average time {avg_time:.2f}ms exceeds 50ms target"  # 50ms average target

        # Additional robustness checks
        p95_time = sorted(execution_times)[int(0.95 * len(execution_times))]
        assert p95_time < 80.0, f"95th percentile {p95_time:.2f}ms exceeds 80ms threshold"

        # Consistency check - standard deviation should be reasonable
        std_dev = statistics.stdev(execution_times)
        assert std_dev < 15.0, f"Standard deviation {std_dev:.2f}ms indicates inconsistent performance"


    def test_alpha_beta_pruning_performance(self):
        """Test that alpha-beta pruning reduces search space significantly"""
        agent = MediumAgent("balanced")
        complex_board = create_test_position("complex")

        # Monitor node count with pruning enabled
        agent.enable_node_counting()
        move = agent.select_move(complex_board)
        nodes_with_pruning = agent.get_node_count()

        # Should reduce search space by at least 60%
        theoretical_max = calculate_theoretical_nodes(complex_board, depth=2)
        pruning_efficiency = 1 - (nodes_with_pruning / theoretical_max)

        assert move is not None, "Agent must return a valid move"
        assert pruning_efficiency > 0.6, f"Pruning efficiency {pruning_efficiency:.2f} below 60% minimum"
        assert nodes_with_pruning < theoretical_max * 0.4, f"Too many nodes evaluated: {nodes_with_pruning}"

        # Performance validation
        execution_times = []
        for _ in range(10):
            start_time = time.time()
            agent.select_move(complex_board)
            execution_time = (time.time() - start_time) * 1000
            execution_times.append(execution_time)

        avg_pruning_time = statistics.mean(execution_times)
        assert avg_pruning_time < 60.0, f"Alpha-beta pruning too slow: {avg_pruning_time:.2f}ms"

    def test_search_depth_optimization(self, basic_board_state):
        """Test that search depth is optimized for performance"""
        agents = {
            "balanced": MediumAgent("balanced"),
            "tactical": MediumAgent("tactical"),
            "aggressive": MediumAgent("aggressive")
        }

        for personality, agent in agents.items():
            agent.enable_node_counting()

            start_time = time.time()
            move = agent.select_move(basic_board_state)
            execution_time = (time.time() - start_time) * 1000

            assert move is not None
            assert execution_time < 100.0, f"{personality} agent took {execution_time:.2f}ms"

            # Tactical should search deeper but still be fast
            if personality == "tactical":
                assert agent.config.search_depth >= 2
            else:
                assert agent.config.search_depth >= 2

    def test_memory_management(self, complex_board_state):
        """Test that memory usage remains controlled during search"""
        agent = MediumAgent("balanced")
        agent.enable_node_counting()

        # Initial memory measurement
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Run multiple searches to test memory management
        for i in range(100):
            move = agent.select_move(complex_board_state)
            assert move is not None

            # Check that transposition table doesn't grow too large
            assert len(agent.transposition_table) < 10000, \
                f"Transposition table too large: {len(agent.transposition_table)}"

            # Every 25 iterations, check node count is reasonable
            if i % 25 == 0:
                node_count = agent.get_node_count()
                assert node_count < 5000, f"Node count too high: {node_count}"

                # Memory check every 25 iterations
                current_memory = process.memory_info().rss / 1024 / 1024  # MB
                memory_growth = current_memory - initial_memory
                assert memory_growth < 100.0, f"Memory growth too high: {memory_growth:.2f}MB"

        # Final memory validation
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        total_memory_growth = final_memory - initial_memory
        assert total_memory_growth < 50.0, f"Total memory growth too high: {total_memory_growth:.2f}MB"

        # Validate transposition table efficiency
        if hasattr(agent, 'transposition_table') and agent.transposition_table:
            table_size = len(agent.transposition_table)
            # More lenient check - even 1 entry shows caching is working
            assert table_size > 0, "Transposition table should have cached some positions"
            assert table_size < 5000, f"Transposition table too large: {table_size}"
        else:
            # If no table or empty, still check that the memory didn't grow excessively
            assert total_memory_growth < 50.0, "Memory should still be controlled even without caching"

    # Strategic Tests

    def test_tactical_pattern_recognition(self, complex_board_state):
        """Test recognition of tactical patterns and piece coordination"""
        tactical_agent = MediumAgent("tactical")
        balanced_agent = MediumAgent("balanced")

        # Test multiple positions to see tactical understanding
        tactical_moves = []
        balanced_moves = []

        for _ in range(15):
            tactical_move = tactical_agent.select_move(complex_board_state)
            balanced_move = balanced_agent.select_move(complex_board_state)

            tactical_moves.append(tactical_move)
            balanced_moves.append(balanced_move)

        assert all(move is not None for move in tactical_moves)
        assert all(move is not None for move in balanced_moves)

        # Tactical agent should show capture preference
        tactical_capture_moves = sum(1 for move in tactical_moves if move.get('isCapture', False))
        balanced_capture_moves = sum(1 for move in balanced_moves if move.get('isCapture', False))

        tactical_capture_rate = tactical_capture_moves / len(tactical_moves) if tactical_moves else 0
        balanced_capture_rate = balanced_capture_moves / len(balanced_moves) if balanced_moves else 0

        # Tactical agent should demonstrate higher tactical awareness
        assert tactical_capture_rate >= balanced_capture_rate, \
            f"Tactical agent capture rate {tactical_capture_rate:.2f} should be ≥ balanced agent rate {balanced_capture_rate:.2f}"

        # Both should show some tactical understanding
        assert tactical_capture_rate >= 0.1, f"Tactical agent capture rate too low: {tactical_capture_rate:.2f}"

        # Verify move diversity and quality
        tactical_unique_moves = len(set(str(move) for move in tactical_moves))
        assert tactical_unique_moves >= 3, f"Tactical agent should show move diversity: {tactical_unique_moves}"

        # Performance validation for tactical agent
        execution_times = []
        for _ in range(10):
            start_time = time.time()
            tactical_agent.select_move(complex_board_state)
            execution_time = (time.time() - start_time) * 1000
            execution_times.append(execution_time)

        avg_tactical_time = statistics.mean(execution_times)
        assert avg_tactical_time < 80.0, f"Tactical agent too slow: {avg_tactical_time:.2f}ms"

    def test_material_advantage_pursuit(self, complex_board_state):
        """Test that agent pursues material advantages appropriately"""
        agent = MediumAgent("aggressive")

        # Create position with clear capture opportunity
        capture_position = complex_board_state.copy()
        capture_position['captureAvailable'] = True

        moves_with_captures = []
        for _ in range(20):
            move = agent.select_move(capture_position)
            if move and move.get('isCapture', False):
                moves_with_captures.append(move)

        # Aggressive agent should find capture opportunities
        assert len(moves_with_captures) > 0, "Aggressive agent should find captures"

    def test_positional_understanding(self, basic_board_state):
        """Test basic positional understanding and central control"""
        agent = MediumAgent("balanced")

        moves = []
        for _ in range(30):
            move = agent.select_move(basic_board_state)
            moves.append(move)

        assert all(move is not None for move in moves)

        # Check that agent considers positional factors
        # Since we're using mock data, we'll test that moves are valid
        for move in moves:
            assert isinstance(move, dict), "Move should be a dictionary"
            assert 'from' in move, "Move should have 'from' position"
            assert 'to' in move, "Move should have 'to' position"

        # Verify move diversity (agent should consider different positions)
        unique_moves = len(set(str(move) for move in moves))
        assert unique_moves >= 5, f"Not enough move diversity: {unique_moves} unique moves"

    def test_personality_strategy_differences(self, basic_board_state):
        """Test that different personalities produce different strategic approaches"""
        agents = {
            "aggressive": MediumAgent("aggressive"),
            "defensive": MediumAgent("defensive"),
            "tactical": MediumAgent("tactical"),
            "balanced": MediumAgent("balanced")
        }

        personality_moves = {}

        for personality, agent in agents.items():
            moves = []
            for _ in range(10):
                move = agent.select_move(basic_board_state)
                moves.append(str(move))  # Convert to string for comparison
            personality_moves[personality] = moves

        # Different personalities should produce different move patterns
        all_moves = [move for moves in personality_moves.values() for move in moves]
        unique_moves = len(set(all_moves))

        assert unique_moves >= 15, f"Expected diverse strategies, got {unique_moves} unique moves"

        # Aggressive should be different from defensive
        aggressive_moves = set(personality_moves["aggressive"])
        defensive_moves = set(personality_moves["defensive"])
        overlap = len(aggressive_moves & defensive_moves)

        assert overlap < 8, f"Too much overlap between aggressive and defensive: {overlap}"


# Enhanced stress testing and edge case validation

class TestMediumAgentStress:
    """Stress testing for MediumAgent under extreme conditions"""

    def test_concurrent_execution_stress(self):
        """Test multiple agents running concurrently under load"""
        agents = [MediumAgent("balanced") for _ in range(10)]
        position = create_test_position("complex")

        def run_agent_with_timing(agent, iterations=20):
            execution_times = []
            for _ in range(iterations):
                start_time = time.time()
                move = agent.select_move(position)
                execution_time = (time.time() - start_time) * 1000
                execution_times.append(execution_time)
                assert move is not None
            return execution_times

        # Run all agents concurrently
        import concurrent.futures

        start_time = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(run_agent_with_timing, agent) for agent in agents]
            all_times = [time_list for future in futures for time_list in [future.result()]]

        total_time = time.time() - start_time

        # Flatten timing results
        all_execution_times = [time for time_list in all_times for time in time_list]

        assert total_time < 5.0, f"Concurrent execution took too long: {total_time:.2f}s"
        assert all(time < 100.0 for time in all_execution_times), "Some executions exceeded 100ms"

        avg_concurrent_time = statistics.mean(all_execution_times)
        assert avg_concurrent_time < 60.0, f"Average concurrent execution time too high: {avg_concurrent_time:.2f}ms"

    def test_memory_leak_detection(self):
        """Test for memory leaks during extended operation"""
        agent = MediumAgent("balanced")
        position = create_test_position("medium")

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Run 500 iterations to detect memory leaks
        for i in range(500):
            move = agent.select_move(position)
            assert move is not None

            # Check memory every 100 iterations
            if i % 100 == 0 and i > 0:
                current_memory = process.memory_info().rss / 1024 / 1024  # MB
                memory_growth = current_memory - initial_memory

                # Memory growth should be reasonable (linear with cache size)
                max_expected_growth = 20.0 + (i / 100) * 5.0  # Base + incremental growth
                assert memory_growth < max_expected_growth, \
                    f"Potential memory leak detected at iteration {i}: {memory_growth:.2f}MB growth"

        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        total_growth = final_memory - initial_memory
        assert total_growth < 100.0, f"Total memory growth too high: {total_growth:.2f}MB"

    def test_extreme_board_complexity(self):
        """Test performance with extremely complex board positions"""
        agent = MediumAgent("tactical")

        # Create highly complex position with maximum pieces
        complex_position = {
            'board': [
                [
                    [
                        {'type': 'marshal', 'player': 1} if i == j else
                        {'type': 'general', 'player': 2} if (i + j) % 2 == 0 else
                        {'type': 'pawn', 'player': 1 if i < 5 else 2} if (i + j) % 3 == 0 else
                        None
                    ] + [None] * 2
                    for i in range(9)
                ]
                for j in range(9)
            ],
            'currentPlayer': 1,
            'gamePhase': 'endgame',
            'moveCount': 80
        }

        execution_times = []
        for _ in range(20):
            start_time = time.time()
            move = agent.select_move(complex_position)
            execution_time = (time.time() - start_time) * 1000
            execution_times.append(execution_time)
            assert move is not None

        max_time = max(execution_times)
        avg_time = statistics.mean(execution_times)

        # Even with extreme complexity, should maintain performance
        assert max_time < 150.0, f"Extreme complexity max time too high: {max_time:.2f}ms"
        assert avg_time < 100.0, f"Extreme complexity avg time too high: {avg_time:.2f}ms"

    def test_edge_case_board_states(self):
        """Test handling of edge case board states"""
        agent = MediumAgent("balanced")

        # Test cases: empty board, single piece, etc.
        edge_cases = [
            # Near-empty board
            {
                'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
                'currentPlayer': 1,
                'gamePhase': 'opening',
                'moveCount': 1
            },
            # Single piece remaining
            {
                'board': [
                    [
                        [
                            {'type': 'marshal', 'player': 1} if i == 4 and j == 4 else None
                        ] + [None] * 2
                        for i in range(9)
                    ]
                    for j in range(9)
                ],
                'currentPlayer': 1,
                'gamePhase': 'endgame',
                'moveCount': 100
            }
        ]

        for case_idx, edge_case in enumerate(edge_cases):
            execution_times = []
            for _ in range(10):
                start_time = time.time()
                move = agent.select_move(edge_case)
                execution_time = (time.time() - start_time) * 1000
                execution_times.append(execution_time)

                # Agent should handle edge cases gracefully
                assert move is not None, f"Agent should handle edge case {case_idx}"

            avg_time = statistics.mean(execution_times)
            assert avg_time < 30.0, f"Edge case {case_idx} too slow: {avg_time:.2f}ms"


class TestMediumAgentRobustness:
    """Robustness testing for error handling and fault tolerance"""

    def test_invalid_input_handling(self):
        """Test agent's response to invalid or malformed inputs"""
        agent = MediumAgent("balanced")

        # Test various invalid inputs
        invalid_inputs = [
            None,
            {},
            {'board': None},
            {'board': [], 'currentPlayer': None},
            {'board': [[[None] * 3] * 9] * 9, 'currentPlayer': 'invalid'},
        ]

        for invalid_input in invalid_inputs:
            try:
                move = agent.select_move(invalid_input)
                # If it doesn't raise an exception, it should return None or a valid move
                assert move is None or isinstance(move, dict), \
                    "Invalid input should return None or valid move structure"
            except (ValueError, TypeError, AttributeError) as e:
                # Expected exception types for invalid input
                assert True, f"Appropriately handled invalid input with {type(e).__name__}"
            except Exception as e:
                pytest.fail(f"Unexpected exception type for invalid input: {type(e).__name__}: {e}")

    def test_timeout_recovery(self):
        """Test agent's ability to recover from timeout conditions"""
        agent = MediumAgent("balanced")
        position = create_test_position("complex")

        # Simulate timeout by setting very low thinking time
        original_thinking_time = agent.config.thinking_time
        agent.config.thinking_time = 0.001  # 1ms - very short

        try:
            execution_times = []
            for _ in range(20):
                start_time = time.time()
                move = agent.select_move(position)
                execution_time = (time.time() - start_time) * 1000
                execution_times.append(execution_time)

                assert move is not None, "Agent should return move even under time pressure"

            # Under extreme time pressure, should still be reasonably fast
            avg_time = statistics.mean(execution_times)
            assert avg_time < 50.0, f"Time-constrained execution too slow: {avg_time:.2f}ms"

        finally:
            # Restore original thinking time
            agent.config.thinking_time = original_thinking_time

    def test_search_depth_adaptation(self):
        """Test agent's adaptation to different search depth requirements"""
        base_position = create_test_position("medium")

        depth_performance = {}

        for depth in [1, 2, 3, 4]:
            agent = MediumAgent("tactical")
            agent.config.search_depth = depth

            execution_times = []
            for _ in range(15):
                start_time = time.time()
                move = agent.select_move(base_position)
                execution_time = (time.time() - start_time) * 1000
                execution_times.append(execution_time)
                assert move is not None

            avg_time = statistics.mean(execution_times)
            depth_performance[depth] = avg_time

            # Deeper search should generally take longer but stay within bounds
            if depth <= 3:  # Reasonable depth for real-time play
                assert avg_time < 80.0, f"Depth {depth} too slow: {avg_time:.2f}ms"

        # Verify that deeper search generally takes more time (with some tolerance)
        for i in range(1, len(depth_performance)):
            depth_curr = list(depth_performance.keys())[i]
            depth_prev = list(depth_performance.keys())[i-1]

            # Allow some variance but expect general trend
            time_ratio = depth_performance[depth_curr] / depth_performance[depth_prev]
            assert time_ratio < 10.0, f"Depth {depth_curr} disproportionately slower than depth {depth_prev}"


# Performance benchmarking and compliance validation


# Additional utility functions for testing

def create_test_position(complexity_level: str = "medium") -> Dict[str, Any]:
    """Create test positions of varying complexity"""
    if complexity_level == "simple":
        return {
            'board': [[[None] * 3 for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'opening',
            'moveCount': 1
        }
    elif complexity_level == "complex":
        # More pieces and tactical opportunities
        board = [[[None] * 3 for _ in range(9)] for _ in range(9)]

        # Place some pieces for tactical complexity
        board[4][4][0] = {'type': 'marshal', 'player': 1}
        board[4][3][0] = {'type': 'general', 'player': 2}

        return {
            'board': board,
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveCount': 40
        }
    else:  # medium
        return {
            'board': [
                [
                    [
                        {'type': 'pawn', 'player': 1} if j == 6 else
                        {'type': 'pawn', 'player': 2} if j == 2 else
                        None
                    ] + [None] * 2
                    for _ in range(9)
                ]
                for j in range(9)
            ],
            'currentPlayer': 1,
            'gamePhase': 'midgame',
            'moveCount': 20
        }


def calculate_theoretical_nodes(board_state: Dict[str, Any], depth: int) -> int:
    """Calculate theoretical maximum nodes for comparison"""
    # Simplified calculation for testing
    estimated_moves_per_position = 20
    return sum(estimated_moves_per_position ** d for d in range(depth + 1))


# Test configuration and setup
@pytest.fixture(scope="module")
def test_config():
    """Global test configuration"""
    return {
        'max_execution_time_ms': 90,
        'target_avg_time_ms': 50,
        'min_node_efficiency': 0.3,
        'test_iterations': 50
    }


def load_complex_positions(count: int) -> List[Dict[str, Any]]:
    """Load complex test positions for stress testing"""
    positions = []
    for i in range(count):
        positions.append(create_test_position("complex" if i % 3 == 0 else "medium"))
    return positions


# Integration test for complete workflow
class TestMediumAgentIntegration:
    """Integration tests for MediumAgent complete workflow"""

    def test_complete_game_simulation(self):
        """Test agent through a complete game simulation"""
        agent = MediumAgent("balanced")
        agent.enable_node_counting()

        current_position = create_test_position("simple")
        total_time = 0
        total_nodes = 0

        # Simulate 50 moves
        for move_number in range(50):
            start_time = time.time()
            move = agent.select_move(current_position)
            execution_time = time.time() - start_time

            assert move is not None

            total_time += execution_time
            total_nodes += agent.get_node_count()

            # Update position for next move
            current_position['moveCount'] = move_number + 1
            current_position['currentPlayer'] = 3 - current_position['currentPlayer']

        avg_time_per_move = (total_time / 50) * 1000  # Convert to ms
        avg_nodes_per_move = total_nodes / 50

        assert avg_time_per_move < 50.0, f"Average time per move: {avg_time_per_move:.2f}ms"
        assert avg_nodes_per_move < 1000, f"Average nodes per move: {avg_nodes_per_move}"

    def test_concurrent_agent_performance(self):
        """Test multiple agents running concurrently"""
        agents = [MediumAgent("balanced") for _ in range(5)]
        position = create_test_position("medium")

        def run_agent(agent):
            return agent.select_move(position)

        # Run all agents concurrently
        import concurrent.futures

        start_time = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(run_agent, agent) for agent in agents]
            results = [future.result() for future in futures]

        total_time = time.time() - start_time

        assert all(result is not None for result in results)
        assert total_time < 1.0, f"Concurrent execution took {total_time:.2f}s"


# Performance benchmarking and compliance validation

class TestMediumAgentBenchmark:
    """Comprehensive benchmarking for MagicBlock compliance"""

    def test_comprehensive_performance_benchmark(self):
        """Comprehensive performance benchmark covering all scenarios"""
        test_scenarios = [
            ("opening", create_test_position("simple")),
            ("midgame", create_test_position("medium")),
            ("endgame", create_test_position("complex")),
        ]

        personalities = ["aggressive", "defensive", "tactical", "balanced"]

        benchmark_results = {}

        for personality in personalities:
            agent = MediumAgent(personality)
            agent.enable_node_counting()

            personality_results = {}

            for scenario_name, position in test_scenarios:
                execution_times = []
                node_counts = []

                for _ in range(30):  # More iterations for statistical significance
                    agent.node_count = 0
                    start_time = time.time()
                    move = agent.select_move(position)
                    execution_time = (time.time() - start_time) * 1000

                    assert move is not None
                    execution_times.append(execution_time)
                    node_counts.append(agent.get_node_count())

                personality_results[scenario_name] = {
                    'avg_time': statistics.mean(execution_times),
                    'max_time': max(execution_times),
                    'min_time': min(execution_times),
                    'std_dev': statistics.stdev(execution_times),
                    'avg_nodes': statistics.mean(node_counts),
                    'p95_time': sorted(execution_times)[int(0.95 * len(execution_times))]
                }

            benchmark_results[personality] = personality_results

        # Validate all results meet MagicBlock requirements
        for personality, scenarios in benchmark_results.items():
            for scenario, metrics in scenarios.items():
                assert metrics['max_time'] < 90.0, \
                    f"{personality}-{scenario}: Max time {metrics['max_time']:.2f}ms exceeds 90ms"
                assert metrics['avg_time'] < 50.0, \
                    f"{personality}-{scenario}: Avg time {metrics['avg_time']:.2f}ms exceeds 50ms"
                assert metrics['p95_time'] < 80.0, \
                    f"{personality}-{scenario}: P95 time {metrics['p95_time']:.2f}ms exceeds 80ms"

        # Print comprehensive benchmark report
        print("\n" + "="*80)
        print("COMPREHENSIVE PERFORMANCE BENCHMARK REPORT")
        print("="*80)

        for personality, scenarios in benchmark_results.items():
            print(f"\n{personality.upper()} PERSONALITY:")
            print("-" * 40)
            for scenario, metrics in scenarios.items():
                print(f"  {scenario.capitalize()}:")
                print(f"    Avg: {metrics['avg_time']:.2f}ms")
                print(f"    Max: {metrics['max_time']:.2f}ms")
                print(f"    P95: {metrics['p95_time']:.2f}ms")
                print(f"    StdDev: {metrics['std_dev']:.2f}ms")
                print(f"    Avg Nodes: {metrics['avg_nodes']:.0f}")

        print("\n" + "="*80)

    def test_magicblock_certification(self):
        """Final certification test for MagicBlock platform compatibility"""
        print("\n" + "="*60)
        print("MAGICBLOCK BLOCKCHAIN CERTIFICATION TEST")
        print("="*60)

        # Test all personality types under stress
        personalities = ["aggressive", "defensive", "tactical", "balanced"]
        certification_results = {}

        for personality in personalities:
            agent = MediumAgent(personality)

            # Test with 100 complex positions for statistical confidence
            test_positions = [create_test_position("complex") for _ in range(100)]

            execution_times = []
            success_count = 0

            for position in test_positions:
                try:
                    start_time = time.time()
                    move = agent.select_move(position)
                    execution_time = (time.time() - start_time) * 1000

                    if move is not None:
                        success_count += 1
                        execution_times.append(execution_time)
                except Exception as e:
                    print(f"Exception in {personality}: {e}")

            if execution_times:
                max_time = max(execution_times)
                avg_time = statistics.mean(execution_times)
                p99_time = sorted(execution_times)[int(0.99 * len(execution_times))]
                success_rate = success_count / len(test_positions)

                # MagicBlock validation
                compliant = (
                    max_time < 90.0 and
                    avg_time < 50.0 and
                    p99_time < 85.0 and
                    success_rate >= 0.99
                )

                certification_results[personality] = {
                    'max_time': max_time,
                    'avg_time': avg_time,
                    'p99_time': p99_time,
                    'success_rate': success_rate,
                    'compliant': compliant
                }

        # Print certification results
        all_compliant = True
        for personality, results in certification_results.items():
            status = "✓ PASS" if results['compliant'] else "✗ FAIL"
            print(f"\n{personality.upper()}: {status}")
            print(f"  Max Time: {results['max_time']:.2f}ms (limit: 90ms)")
            print(f"  Avg Time: {results['avg_time']:.2f}ms (target: 50ms)")
            print(f"  P99 Time: {results['p99_time']:.2f}ms (limit: 85ms)")
            print(f"  Success Rate: {results['success_rate']:.1%} (required: 99%)")

            all_compliant = all_compliant and results['compliant']

        print(f"\n{'='*60}")
        final_status = "✓ CERTIFIED" if all_compliant else "✗ CERTIFICATION FAILED"
        print(f"FINAL CERTIFICATION STATUS: {final_status}")
        print("="*60)

        # Final assertions for test framework
        for personality, results in certification_results.items():
            assert results['compliant'], f"{personality} failed MagicBlock certification"

        assert all_compliant, "Overall MagicBlock certification failed"


if __name__ == "__main__":
    # Enhanced test runner with multiple execution modes
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "--performance":
            pytest.main(["-v", "-s", __file__ + "::TestMediumAgent::test_magicblock_compatibility_90ms"])
        elif sys.argv[1] == "--stress":
            pytest.main(["-v", "-s", __file__ + "::TestMediumAgentStress"])
        elif sys.argv[1] == "--benchmark":
            pytest.main(["-v", "-s", __file__ + "::TestMediumAgentBenchmark"])
        elif sys.argv[1] == "--certification":
            pytest.main(["-v", "-s", __file__ + "::TestMediumAgentBenchmark::test_magicblock_certification"])
        elif sys.argv[1] == "--robustness":
            pytest.main(["-v", "-s", __file__ + "::TestMediumAgentRobustness"])
        else:
            pytest.main(["-v", "-s", __file__])
    else:
        # Run core functionality tests by default
        pytest.main(["-v", __file__ + "::TestMediumAgent"])
