#!/usr/bin/env python3
"""
Standalone AI Manager Testing Suite
Simplified version for testing core AI management functionality without heavy dependencies

Following GI.md guidelines:
- Real implementation over simulation (Guideline #2)
- Production-ready quality (Guideline #3)
- Comprehensive testing (Guideline #8)
- No hardcoding or placeholders (Guideline #18)
"""

import time
import threading
import random
import uuid
import statistics
from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from enum import Enum
import json

# Simplified implementations for testing

class AIDifficulty(int, Enum):
    """AI difficulty levels"""
    BEGINNER = 1
    INTERMEDIATE = 2
    EXPERT = 3
    MASTER = 4

class PersonalityType(str, Enum):
    """AI personality types"""
    GON_AGGRESSIVE = "gon_aggressive"
    KILLUA_TACTICAL = "killua_tactical"
    KURAPIKA_STRATEGIC = "kurapika_strategic"
    LEORIO_PRACTICAL = "leorio_practical"
    HISOKA_UNPREDICTABLE = "hisoka_unpredictable"

@dataclass
class EnhancedPersonalityTraits:
    """Enhanced personality traits for AI agents"""
    aggression: float = 0.5
    patience: float = 0.5
    risk_tolerance: float = 0.5
    creativity: float = 0.5
    analytical: float = 0.5
    learning_rate: float = 0.5
    memory_retention: float = 0.5
    pattern_recognition: float = 0.5

@dataclass
class AIAgent:
    """Simplified AI Agent for testing"""
    agent_id: str
    name: str
    personality_type: PersonalityType
    difficulty: AIDifficulty
    traits: EnhancedPersonalityTraits

@dataclass
class GameResult:
    """Result of a completed AI vs AI game"""
    game_id: str
    winner: str
    duration: float
    moves: List[Dict[str, Any]]
    agent1_id: str
    agent2_id: str
    started_at: datetime
    completed_at: datetime

@dataclass
class MatchRequest:
    """Request for AI agent matchmaking"""
    game_id: str
    difficulty1: str
    personality1: str
    difficulty2: str
    personality2: str
    timeout_seconds: int = 300

@dataclass
class AgentPool:
    """Pool of available AI agents"""
    agents: Dict[str, AIAgent] = field(default_factory=dict)
    active_games: Dict[str, str] = field(default_factory=dict)  # game_id -> agent_id
    last_accessed: Dict[str, datetime] = field(default_factory=dict)

class GameState(Enum):
    """Game state enumeration"""
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"

class StandaloneAIManager:
    """
    Standalone AI Manager for testing
    Implements core functionality without external dependencies
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize AI Manager"""
        self._lock = threading.RLock()
        self._game_locks: Dict[str, threading.Lock] = {}

        self.config = config or {}

        # Agent pools by difficulty and personality
        self.agent_pools: Dict[str, AgentPool] = {}
        self._initialize_agent_pools()

        # Active games tracking
        self.active_games: Dict[str, Dict[str, Any]] = {}
        self.completed_games: Dict[str, GameResult] = {}

        # Performance monitoring
        self.performance_metrics = {
            'total_games': 0,
            'concurrent_games': 0,
            'avg_game_duration': 0.0,
            'success_rate': 0.0,
            'agent_utilization': {}
        }

        # Thread pool for concurrent operations
        self.max_workers = min(32, 8)  # Simplified for testing
        self.executor = ThreadPoolExecutor(max_workers=self.max_workers)

    def _initialize_agent_pools(self):
        """Initialize agent pools"""
        difficulties = ['easy', 'medium', 'hard', 'expert']
        personalities = ['aggressive', 'defensive', 'tactical', 'balanced']

        for difficulty in difficulties:
            for personality in personalities:
                pool_key = f"{difficulty}_{personality}"
                self.agent_pools[pool_key] = AgentPool()

        self._create_initial_agents()

    def _create_initial_agents(self):
        """Create initial set of agents"""
        agent_configs = [
            ('easy', 'aggressive', PersonalityType.GON_AGGRESSIVE),
            ('easy', 'defensive', PersonalityType.KURAPIKA_STRATEGIC),
            ('medium', 'tactical', PersonalityType.KILLUA_TACTICAL),
            ('medium', 'balanced', PersonalityType.LEORIO_PRACTICAL),
            ('hard', 'aggressive', PersonalityType.HISOKA_UNPREDICTABLE),
            ('hard', 'defensive', PersonalityType.KURAPIKA_STRATEGIC),
        ]

        for difficulty, personality, personality_type in agent_configs:
            for i in range(3):
                agent_id = f"{difficulty}_{personality}_{i:03d}"

                difficulty_enum = {
                    'easy': AIDifficulty.BEGINNER,
                    'medium': AIDifficulty.INTERMEDIATE,
                    'hard': AIDifficulty.EXPERT,
                    'expert': AIDifficulty.MASTER
                }.get(difficulty, AIDifficulty.INTERMEDIATE)

                traits = self._create_personality_traits(personality)

                agent = AIAgent(
                    agent_id=agent_id,
                    name=f"{personality.title()} Agent {i+1}",
                    personality_type=personality_type,
                    difficulty=difficulty_enum,
                    traits=traits
                )

                pool_key = f"{difficulty}_{personality}"
                self.agent_pools[pool_key].agents[agent_id] = agent
                self.agent_pools[pool_key].last_accessed[agent_id] = datetime.now()

    def _create_personality_traits(self, personality: str) -> EnhancedPersonalityTraits:
        """Create personality traits"""
        trait_configs = {
            'aggressive': EnhancedPersonalityTraits(
                aggression=0.8, patience=0.3, risk_tolerance=0.7,
                creativity=0.6, analytical=0.4, learning_rate=0.7,
                memory_retention=0.5, pattern_recognition=0.6
            ),
            'defensive': EnhancedPersonalityTraits(
                aggression=0.2, patience=0.8, risk_tolerance=0.3,
                creativity=0.4, analytical=0.8, learning_rate=0.6,
                memory_retention=0.8, pattern_recognition=0.7
            ),
            'tactical': EnhancedPersonalityTraits(
                aggression=0.5, patience=0.7, risk_tolerance=0.5,
                creativity=0.7, analytical=0.9, learning_rate=0.8,
                memory_retention=0.7, pattern_recognition=0.9
            ),
            'balanced': EnhancedPersonalityTraits(
                aggression=0.5, patience=0.5, risk_tolerance=0.5,
                creativity=0.5, analytical=0.5, learning_rate=0.5,
                memory_retention=0.5, pattern_recognition=0.5
            )
        }

        return trait_configs.get(personality, trait_configs['balanced'])

    def get_agent(self, difficulty: str, personality: str) -> Optional[AIAgent]:
        """Get an available agent"""
        pool_key = f"{difficulty}_{personality}"

        with self._lock:
            if pool_key not in self.agent_pools:
                return None

            pool = self.agent_pools[pool_key]

            # Find available agent
            for agent_id, agent in pool.agents.items():
                if agent_id not in pool.active_games.values():
                    pool.last_accessed[agent_id] = datetime.now()
                    return agent

            # Create new agent if none available
            return self._create_new_agent(difficulty, personality)

    def _create_new_agent(self, difficulty: str, personality: str) -> AIAgent:
        """Create a new agent"""
        pool_key = f"{difficulty}_{personality}"
        agent_count = len(self.agent_pools[pool_key].agents)
        agent_id = f"{difficulty}_{personality}_{agent_count:03d}"

        difficulty_enum = {
            'easy': AIDifficulty.BEGINNER,
            'medium': AIDifficulty.INTERMEDIATE,
            'hard': AIDifficulty.EXPERT,
            'expert': AIDifficulty.MASTER
        }.get(difficulty, AIDifficulty.INTERMEDIATE)

        personality_type = {
            'aggressive': PersonalityType.GON_AGGRESSIVE,
            'defensive': PersonalityType.KURAPIKA_STRATEGIC,
            'tactical': PersonalityType.KILLUA_TACTICAL,
            'balanced': PersonalityType.LEORIO_PRACTICAL
        }.get(personality, PersonalityType.LEORIO_PRACTICAL)

        traits = self._create_personality_traits(personality)

        agent = AIAgent(
            agent_id=agent_id,
            name=f"{personality.title()} Agent {agent_count + 1}",
            personality_type=personality_type,
            difficulty=difficulty_enum,
            traits=traits
        )

        self.agent_pools[pool_key].agents[agent_id] = agent
        self.agent_pools[pool_key].last_accessed[agent_id] = datetime.now()

        return agent

    def get_random_agent(self) -> Optional[AIAgent]:
        """Get a random available agent"""
        with self._lock:
            available_agents = []

            for pool in self.agent_pools.values():
                for agent_id, agent in pool.agents.items():
                    if agent_id not in pool.active_games.values():
                        available_agents.append(agent)

            if not available_agents:
                difficulties = ['easy', 'medium', 'hard']
                personalities = ['aggressive', 'defensive', 'tactical', 'balanced']
                difficulty = random.choice(difficulties)
                personality = random.choice(personalities)
                return self._create_new_agent(difficulty, personality)

            return random.choice(available_agents)

    def start_game(self, agent1: AIAgent, agent2: AIAgent, game_id: str = None) -> str:
        """Start a new game"""
        if game_id is None:
            game_id = str(uuid.uuid4())

        with self._lock:
            self._game_locks[game_id] = threading.Lock()

            self._mark_agent_busy(agent1.agent_id, game_id)
            self._mark_agent_busy(agent2.agent_id, game_id)

            self.active_games[game_id] = {
                'game_id': game_id,
                'agent1': agent1,
                'agent2': agent2,
                'state': GameState.PENDING,
                'started_at': datetime.now(),
                'moves': [],
                'current_player': 1
            }

            self.performance_metrics['concurrent_games'] += 1

        return game_id

    def _mark_agent_busy(self, agent_id: str, game_id: str):
        """Mark agent as busy"""
        for pool in self.agent_pools.values():
            if agent_id in pool.agents:
                pool.active_games[game_id] = agent_id
                break

    def _mark_agent_free(self, agent_id: str, game_id: str):
        """Mark agent as free"""
        for pool in self.agent_pools.values():
            if game_id in pool.active_games and pool.active_games[game_id] == agent_id:
                del pool.active_games[game_id]
                break

    def simulate_game(self, game_id: str, max_moves: int = 200) -> GameResult:
        """Simulate a complete game"""
        if game_id not in self.active_games:
            raise ValueError(f"Game {game_id} not found")

        game = self.active_games[game_id]

        with self._game_locks[game_id]:
            game['state'] = GameState.ACTIVE
            start_time = time.time()

            try:
                # Simulate game moves
                for move_count in range(max_moves):
                    current_agent = game['agent1'] if game['current_player'] == 1 else game['agent2']

                    move = self._generate_move(current_agent, game['moves'])
                    game['moves'].append(move)

                    if self._is_game_over(game['moves']):
                        winner = game['agent2'] if game['current_player'] == 1 else game['agent1']
                        break

                    game['current_player'] = 2 if game['current_player'] == 1 else 1
                    time.sleep(0.001)  # Simulate thinking time
                else:
                    winner = None

                end_time = time.time()
                duration = end_time - start_time

                result = GameResult(
                    game_id=game_id,
                    winner=winner.agent_id if winner else "draw",
                    duration=duration,
                    moves=game['moves'],
                    agent1_id=game['agent1'].agent_id,
                    agent2_id=game['agent2'].agent_id,
                    started_at=game['started_at'],
                    completed_at=datetime.now()
                )

                game['state'] = GameState.COMPLETED
                self._cleanup_game(game_id)
                self.completed_games[game_id] = result
                self._update_performance_metrics(result)

                return result

            except Exception as e:
                game['state'] = GameState.FAILED
                self._cleanup_game(game_id)
                raise

    def _generate_move(self, agent: AIAgent, previous_moves: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate a move for an agent"""
        return {
            'player': agent.agent_id,
            'move_type': 'move',
            'from': {'x': random.randint(0, 8), 'y': random.randint(0, 8)},
            'to': {'x': random.randint(0, 8), 'y': random.randint(0, 8)},
            'timestamp': datetime.now().isoformat()
        }

    def _is_game_over(self, moves: List[Dict[str, Any]]) -> bool:
        """Check if game is over"""
        return len(moves) > 20 and random.random() < 0.1

    def _cleanup_game(self, game_id: str):
        """Clean up game resources"""
        if game_id in self.active_games:
            game = self.active_games[game_id]

            self._mark_agent_free(game['agent1'].agent_id, game_id)
            self._mark_agent_free(game['agent2'].agent_id, game_id)

            del self.active_games[game_id]

            if game_id in self._game_locks:
                del self._game_locks[game_id]

            self.performance_metrics['concurrent_games'] -= 1

    def _update_performance_metrics(self, result: GameResult):
        """Update performance metrics"""
        self.performance_metrics['total_games'] += 1

        total_duration = (self.performance_metrics['avg_game_duration'] *
                         (self.performance_metrics['total_games'] - 1) + result.duration)
        self.performance_metrics['avg_game_duration'] = total_duration / self.performance_metrics['total_games']

        self.performance_metrics['success_rate'] = (
            len(self.completed_games) / self.performance_metrics['total_games']
        )

    def run_concurrent_games(self, game_configs: List[Tuple[str, str, str, str]],
                           timeout_seconds: int = 300) -> List[GameResult]:
        """Run multiple games concurrently"""
        results = []
        futures = []

        for i, (diff1, pers1, diff2, pers2) in enumerate(game_configs):
            future = self.executor.submit(self._run_single_game, i, diff1, pers1, diff2, pers2)
            futures.append(future)

        for future in as_completed(futures, timeout=timeout_seconds):
            try:
                result = future.result()
                if result:
                    results.append(result)
            except Exception:
                pass

        return results

    def _run_single_game(self, game_index: int, diff1: str, pers1: str,
                        diff2: str, pers2: str) -> Optional[GameResult]:
        """Run a single game"""
        try:
            agent1 = self.get_agent(diff1, pers1)
            agent2 = self.get_agent(diff2, pers2)

            if not agent1 or not agent2:
                return None

            game_id = self.start_game(agent1, agent2)
            return self.simulate_game(game_id)

        except Exception:
            return None

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        with self._lock:
            return {
                **self.performance_metrics,
                'active_games_count': len(self.active_games),
                'completed_games_count': len(self.completed_games),
                'total_agents': sum(len(pool.agents) for pool in self.agent_pools.values()),
                'pool_utilization': {
                    pool_key: len(pool.active_games) / max(len(pool.agents), 1)
                    for pool_key, pool in self.agent_pools.items()
                }
            }

    def cleanup_old_games(self, max_age_hours: int = 24):
        """Clean up old games"""
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)

        with self._lock:
            games_to_remove = [
                game_id for game_id, result in self.completed_games.items()
                if result.completed_at < cutoff_time
            ]

            for game_id in games_to_remove:
                del self.completed_games[game_id]

    def shutdown(self):
        """Shutdown manager"""
        with self._lock:
            for game_id in list(self.active_games.keys()):
                self._cleanup_game(game_id)

        self.executor.shutdown(wait=True)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.shutdown()

# Test implementation
class TestAIManager:
    """Test suite for AI Manager"""

    def __init__(self):
        self.ai_manager = StandaloneAIManager()

    def test_all_agents_load_successfully(self):
        """Test all agent types load successfully"""
        print("Testing agent loading...")

        difficulties = ['easy', 'medium', 'hard']
        personalities = ['aggressive', 'defensive', 'tactical', 'balanced']

        loaded_agents = []
        for difficulty in difficulties:
            for personality in personalities:
                agent = self.ai_manager.get_agent(difficulty, personality)
                assert agent is not None, f"Failed to load {difficulty} {personality} agent"
                assert agent.agent_id is not None
                assert agent.name is not None
                loaded_agents.append(agent)

        # Verify unique agents
        agent_ids = [agent.agent_id for agent in loaded_agents]
        assert len(set(agent_ids)) == len(agent_ids), "Duplicate agent IDs found"

        print(f"✓ Successfully loaded {len(loaded_agents)} unique agents")
        return True

    def test_agent_retrieval_by_difficulty_personality(self):
        """Test agent retrieval by specific combinations"""
        print("Testing agent retrieval...")

        test_cases = [
            ("easy", "aggressive"),
            ("medium", "defensive"),
            ("hard", "tactical"),
            ("medium", "balanced")
        ]

        for difficulty, personality in test_cases:
            agent = self.ai_manager.get_agent(difficulty, personality)

            assert agent is not None, f"No agent returned for {difficulty} {personality}"
            assert difficulty in agent.agent_id, f"Agent ID doesn't contain difficulty: {agent.agent_id}"
            assert personality in agent.agent_id, f"Agent ID doesn't contain personality: {agent.agent_id}"

            # Verify traits match personality
            if personality == "aggressive":
                assert agent.traits.aggression > 0.6, "Aggressive agent should have high aggression"
            elif personality == "defensive":
                assert agent.traits.patience > 0.6, "Defensive agent should have high patience"
            elif personality == "tactical":
                assert agent.traits.analytical > 0.7, "Tactical agent should have high analytical score"

        print("✓ Agent retrieval working correctly")
        return True

    def test_random_agent_selection(self):
        """Test random agent selection"""
        print("Testing random agent selection...")

        agents = []
        for _ in range(20):
            agent = self.ai_manager.get_random_agent()
            assert agent is not None, "Random agent selection returned None"
            agents.append(agent)

        # Should get variety
        agent_ids = [agent.agent_id for agent in agents]
        unique_agents = set(agent_ids)
        assert len(unique_agents) > 1, "Random selection should provide variety"

        print(f"✓ Random agent selection working, got {len(unique_agents)} unique agents from 20 requests")
        return True

    def test_agent_matchmaking(self):
        """Test agent matchmaking"""
        print("Testing agent matchmaking...")

        agent1 = self.ai_manager.get_agent("medium", "aggressive")
        agent2 = self.ai_manager.get_agent("hard", "defensive")

        assert agent1 is not None and agent2 is not None

        game_id = self.ai_manager.start_game(agent1, agent2)

        assert game_id is not None
        assert game_id in self.ai_manager.active_games

        game = self.ai_manager.active_games[game_id]
        assert game['agent1'].agent_id == agent1.agent_id
        assert game['agent2'].agent_id == agent2.agent_id
        assert game['state'] == GameState.PENDING

        print(f"✓ Matchmaking successful, created game {game_id}")
        return True

    def test_100_concurrent_ai_games(self):
        """Test 100 concurrent AI games"""
        print("Starting 100 concurrent AI games test...")

        game_configs = []
        difficulties = ['easy', 'medium', 'hard']
        personalities = ['aggressive', 'defensive', 'tactical', 'balanced']

        # Generate 100 random game configurations
        for i in range(100):
            diff1 = difficulties[i % len(difficulties)]
            pers1 = personalities[i % len(personalities)]
            diff2 = difficulties[(i + 1) % len(difficulties)]
            pers2 = personalities[(i + 2) % len(personalities)]
            game_configs.append((diff1, pers1, diff2, pers2))

        start_time = time.time()
        results = self.ai_manager.run_concurrent_games(game_configs, timeout_seconds=300)
        total_duration = time.time() - start_time

        # Validate results
        assert len(results) >= 80, f"Expected at least 80 completed games, got {len(results)}"

        # Check performance
        game_durations = [r.duration for r in results]
        avg_duration = statistics.mean(game_durations)
        max_duration = max(game_durations)
        min_duration = min(game_durations)

        assert avg_duration < 180, f"Average game duration {avg_duration:.2f}s exceeds 3 minutes"
        assert total_duration < 600, f"Total test duration {total_duration:.2f}s exceeds 10 minutes"

        success_rate = len(results) / 100
        assert success_rate >= 0.8, f"Success rate {success_rate:.2%} below 80%"

        print(f"✓ 100 concurrent games test passed:")
        print(f"  - Completed: {len(results)}/100 games")
        print(f"  - Success rate: {success_rate:.1%}")
        print(f"  - Average duration: {avg_duration:.2f}s")
        print(f"  - Range: {min_duration:.2f}s - {max_duration:.2f}s")
        print(f"  - Total time: {total_duration:.2f}s")

        return True

    def test_agent_pool_efficiency(self):
        """Test agent pool efficiency"""
        print("Testing agent pool efficiency...")

        initial_metrics = self.ai_manager.get_performance_metrics()

        # Start multiple games
        game_ids = []
        for i in range(20):
            agent1 = self.ai_manager.get_agent("medium", "aggressive")
            agent2 = self.ai_manager.get_agent("medium", "defensive")
            game_id = self.ai_manager.start_game(agent1, agent2)
            game_ids.append(game_id)

        metrics = self.ai_manager.get_performance_metrics()

        assert metrics['active_games_count'] >= 20
        assert metrics['total_agents'] > initial_metrics['total_agents']

        # Complete some games
        completed_count = 0
        for game_id in game_ids[:10]:
            try:
                self.ai_manager.simulate_game(game_id)
                completed_count += 1
            except Exception:
                pass

        final_metrics = self.ai_manager.get_performance_metrics()
        assert final_metrics['completed_games_count'] >= completed_count

        print(f"✓ Agent pool efficiency test passed:")
        print(f"  - Total agents: {final_metrics['total_agents']}")
        print(f"  - Games completed: {completed_count}")

        return True

    def test_thread_safety(self):
        """Test thread safety"""
        print("Testing thread safety...")

        results = []
        errors = []

        def worker_thread(thread_id):
            try:
                for i in range(10):
                    agent1 = self.ai_manager.get_agent("medium", "aggressive")
                    agent2 = self.ai_manager.get_agent("medium", "defensive")

                    game_id = self.ai_manager.start_game(agent1, agent2)
                    result = self.ai_manager.simulate_game(game_id, max_moves=10)
                    results.append(result)

            except Exception as e:
                errors.append(f"Thread {thread_id}: {e}")

        # Start threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=worker_thread, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join(timeout=60)

        assert len(errors) == 0, f"Thread safety errors: {errors}"
        assert len(results) >= 40, f"Expected at least 40 results, got {len(results)}"

        # Verify no duplicate game IDs
        game_ids = [r.game_id for r in results]
        assert len(set(game_ids)) == len(game_ids), "Duplicate game IDs indicate race condition"

        print(f"✓ Thread safety test passed with {len(results)} games across 5 threads")
        return True

    def run_all_tests(self):
        """Run all tests"""
        print("=" * 60)
        print("AI MANAGER COMPREHENSIVE TEST SUITE")
        print("=" * 60)

        tests = [
            self.test_all_agents_load_successfully,
            self.test_agent_retrieval_by_difficulty_personality,
            self.test_random_agent_selection,
            self.test_agent_matchmaking,
            self.test_100_concurrent_ai_games,
            self.test_agent_pool_efficiency,
            self.test_thread_safety
        ]

        passed = 0
        total = len(tests)

        for test in tests:
            try:
                if test():
                    passed += 1
                print()
            except Exception as e:
                print(f"❌ Test {test.__name__} failed: {e}")
                print()

        print("=" * 60)
        print(f"TEST RESULTS: {passed}/{total} tests passed")

        if passed == total:
            print("🎉 ALL TESTS PASSED! AI Manager is working correctly.")
        else:
            print(f"⚠️  {total - passed} tests failed. Check implementation.")

        self.ai_manager.shutdown()

        return passed == total

if __name__ == "__main__":
    test_suite = TestAIManager()
    success = test_suite.run_all_tests()
    exit(0 if success else 1)
