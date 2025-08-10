"""
AI Manager for Nen Platform POC Implementation
Manages all AI agents, matchmaking, and performance monitoring
Following GI.md guidelines for production-ready systems
"""

import random
import time
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

from .basic_ai_agents import (
    BaseAIAgent, RandomAI, MinimaxAI, MCTSAI, 
    AIConfig, AIPersonality, AIAgentFactory
)
from .hard_agent import HardAgent

logger = logging.getLogger(__name__)

# Environment configuration (GI compliance - no hardcoding)
MANAGER_CONFIG = {
    'max_workers': int(os.environ.get('AI_MANAGER_MAX_WORKERS', '10')),
    'max_concurrent_games': int(os.environ.get('AI_MAX_CONCURRENT_GAMES', '100')),
    'agent_pool_size': int(os.environ.get('AI_AGENT_POOL_SIZE', '3')),
    'performance_monitoring': os.environ.get('AI_PERFORMANCE_MONITORING', 'true').lower() == 'true',
    'stress_test_timeout': int(os.environ.get('AI_STRESS_TEST_TIMEOUT', '300')),
}

class AIManager:
    """
    AI Manager for coordinating all AI agents in the Nen Platform
    Handles agent creation, matchmaking, and performance monitoring
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.agents: Dict[str, BaseAIAgent] = {}
        self.agent_pool: Dict[str, List[BaseAIAgent]] = {}
        self.active_games: Dict[str, Dict[str, Any]] = {}
        self.performance_stats: Dict[str, Dict[str, Any]] = {}
        
        # Thread pool for concurrent games (GI compliance - resource management)
        self.max_workers = MANAGER_CONFIG['max_workers']
        self.executor = ThreadPoolExecutor(max_workers=self.max_workers)
        self._shutdown_lock = threading.Lock()
        self._is_shutdown = False
        
        # Load configuration
        self.config = self._load_config(config_path)
        
        # Initialize agents
        self._initialize_all_agents()
        
        logger.info(f"AIManager initialized with {len(self.agents)} agents, max_workers: {self.max_workers}")

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit with proper cleanup"""
        self.shutdown()

    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load AI manager configuration from environment and file"""
        default_config = {
            "difficulties": ["easy", "medium", "hard"],
            "personalities": ["aggressive", "defensive", "balanced"],
            "move_timeout": 0.1,  # 100ms for MagicBlock compatibility
            "fraud_detection": True,
            "max_concurrent_games": MANAGER_CONFIG['max_concurrent_games'],
            "model_update_frequency": "weekly",
            "magicblock_integration": True,
            "performance_monitoring": MANAGER_CONFIG['performance_monitoring'],
            "agent_pool_size": MANAGER_CONFIG['agent_pool_size']
        }
        
        if config_path and Path(config_path).exists():
            try:
                with open(config_path, 'r') as f:
                    user_config = json.load(f)
                default_config.update(user_config)
            except Exception as e:
                logger.error(f"Failed to load config from {config_path}: {e}")
        
        return default_config

    def _initialize_all_agents(self):
        """Initialize all AI agents according to POC specification"""
        difficulties = self.config["difficulties"]
        personalities = self.config["personalities"]
        
        for difficulty in difficulties:
            for personality in personalities:
                agent_key = f"{difficulty}_{personality}"
                
                # Create agent pool for this configuration
                self.agent_pool[agent_key] = []
                
                for i in range(self.config["agent_pool_size"]):
                    try:
                        agent = self._create_agent(difficulty, personality)
                        self.agent_pool[agent_key].append(agent)
                        
                        # Also add to main agents dict with unique ID
                        unique_key = f"{agent_key}_{i}"
                        self.agents[unique_key] = agent
                        
                    except Exception as e:
                        logger.error(f"Failed to create {difficulty} {personality} agent {i}: {e}")
        
        logger.info(f"Initialized {len(self.agents)} AI agents across {len(self.agent_pool)} configurations")

    def _create_agent(self, difficulty: str, personality: str) -> BaseAIAgent:
        """Create an AI agent for specified difficulty and personality"""
        if difficulty == "easy":
            config = AIAgentFactory.create_personality_config(personality, skill_level=3)
            return RandomAI(config)
        elif difficulty == "medium":
            config = AIAgentFactory.create_personality_config(personality, skill_level=5)
            return MinimaxAI(config)
        elif difficulty == "hard":
            return HardAgent(f"models/hard_{personality}.pt", personality)
        else:
            raise ValueError(f"Unknown difficulty: {difficulty}")

    def get_agent(self, difficulty: str, personality: str) -> Optional[BaseAIAgent]:
        """Get AI agent by difficulty and personality"""
        agent_key = f"{difficulty}_{personality}"
        
        if agent_key in self.agent_pool and self.agent_pool[agent_key]:
            # Get least recently used agent from pool
            agent = self.agent_pool[agent_key][0]
            # Rotate the pool
            self.agent_pool[agent_key] = self.agent_pool[agent_key][1:] + [agent]
            return agent
        
        logger.warning(f"No available agent for {difficulty} {personality}")
        return None

    def get_random_agent(self) -> Optional[BaseAIAgent]:
        """Get random AI agent for variety"""
        if not self.agents:
            return None
        
        agent_key = random.choice(list(self.agents.keys()))
        return self.agents[agent_key]

    def create_match(self, agent1_config: Dict[str, str], agent2_config: Dict[str, str]) -> Optional[str]:
        """Set up a match between two AI agents"""
        try:
            agent1 = self.get_agent(agent1_config["difficulty"], agent1_config["personality"])
            agent2 = self.get_agent(agent2_config["difficulty"], agent2_config["personality"])
            
            if not agent1 or not agent2:
                logger.error("Failed to get agents for match")
                return None
            
            match_id = f"match_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
            
            match_info = {
                'match_id': match_id,
                'agent1': agent1,
                'agent2': agent2,
                'agent1_config': agent1_config,
                'agent2_config': agent2_config,
                'start_time': time.time(),
                'status': 'active',
                'moves': [],
                'current_player': 1
            }
            
            self.active_games[match_id] = match_info
            logger.info(f"Created match {match_id}")
            
            return match_id
            
        except Exception as e:
            logger.error(f"Failed to create match: {e}")
            return None

    def get_ai_move(self, match_id: str, board_state: Dict[str, Any], valid_moves: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Get AI move for a specific match"""
        if match_id not in self.active_games:
            logger.error(f"Match {match_id} not found")
            return None
        
        match_info = self.active_games[match_id]
        current_player = match_info['current_player']
        
        # Get the appropriate agent
        agent = match_info['agent1'] if current_player == 1 else match_info['agent2']
        
        try:
            start_time = time.time()
            move = agent.get_move(board_state, valid_moves)
            execution_time = time.time() - start_time
            
            # Record move in match
            move_record = {
                'player': current_player,
                'move': move,
                'execution_time': execution_time,
                'timestamp': time.time(),
                'board_state_hash': hash(str(board_state))
            }
            match_info['moves'].append(move_record)
            
            # Update performance stats
            self._update_performance_stats(agent, execution_time)
            
            # Check for MagicBlock compliance
            execution_time_ms = execution_time * 1000
            if execution_time_ms > self.config["move_timeout"] * 1000:
                logger.warning(f"AI move exceeded timeout: {execution_time_ms:.2f}ms")
            
            return move
            
        except Exception as e:
            logger.error(f"Failed to get AI move for match {match_id}: {e}")
            return None

    def end_match(self, match_id: str, result: Dict[str, Any]):
        """End a match and update statistics"""
        if match_id not in self.active_games:
            logger.warning(f"Attempt to end unknown match {match_id}")
            return
        
        match_info = self.active_games[match_id]
        match_info['status'] = 'completed'
        match_info['end_time'] = time.time()
        match_info['result'] = result
        match_info['duration'] = match_info['end_time'] - match_info['start_time']
        
        # Update agent performance stats
        self._update_match_results(match_info)
        
        # Clean up
        del self.active_games[match_id]
        
        logger.info(f"Match {match_id} completed in {match_info['duration']:.2f}s")

    def _update_performance_stats(self, agent: BaseAIAgent, execution_time: float):
        """Update performance statistics for an agent"""
        agent_type = agent.__class__.__name__
        agent_personality = agent.config.personality.value
        
        stats_key = f"{agent_type}_{agent_personality}"
        
        if stats_key not in self.performance_stats:
            self.performance_stats[stats_key] = {
                'total_moves': 0,
                'total_time': 0.0,
                'max_time': 0.0,
                'min_time': float('inf'),
                'timeouts': 0,
                'fraud_alerts': 0
            }
        
        stats = self.performance_stats[stats_key]
        stats['total_moves'] += 1
        stats['total_time'] += execution_time
        stats['max_time'] = max(stats['max_time'], execution_time)
        stats['min_time'] = min(stats['min_time'], execution_time)
        
        # Check for timeout
        if execution_time > self.config["move_timeout"]:
            stats['timeouts'] += 1
        
        # Check fraud score
        if hasattr(agent, 'get_fraud_score') and agent.get_fraud_score() > 0.5:
            stats['fraud_alerts'] += 1

    def _update_match_results(self, match_info: Dict[str, Any]):
        """Update match results for agents"""
        result = match_info.get('result', {})
        winner = result.get('winner')
        
        agent1 = match_info['agent1']
        agent2 = match_info['agent2']
        
        # Update performance stats
        if winner == 1:
            agent1.performance_stats['wins'] += 1
            agent2.performance_stats['losses'] += 1
        elif winner == 2:
            agent1.performance_stats['losses'] += 1
            agent2.performance_stats['wins'] += 1
        else:
            agent1.performance_stats['draws'] += 1
            agent2.performance_stats['draws'] += 1
        
        agent1.performance_stats['games_played'] += 1
        agent2.performance_stats['games_played'] += 1

    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        report = {
            'timestamp': time.time(),
            'total_agents': len(self.agents),
            'active_games': len(self.active_games),
            'agent_pool_status': {},
            'performance_stats': self.performance_stats.copy(),
            'system_health': {}
        }
        
        # Agent pool status
        for pool_key, agents in self.agent_pool.items():
            if agents:
                avg_fraud_score = sum(agent.get_fraud_score() for agent in agents) / len(agents)
                report['agent_pool_status'][pool_key] = {
                    'agents_available': len(agents),
                    'avg_fraud_score': avg_fraud_score
                }
        
        # Calculate system health metrics
        total_moves = sum(stats.get('total_moves', 0) for stats in self.performance_stats.values())
        total_timeouts = sum(stats.get('timeouts', 0) for stats in self.performance_stats.values())
        total_fraud_alerts = sum(stats.get('fraud_alerts', 0) for stats in self.performance_stats.values())
        
        report['system_health'] = {
            'total_moves_processed': total_moves,
            'timeout_rate': total_timeouts / max(total_moves, 1),
            'fraud_alert_rate': total_fraud_alerts / max(total_moves, 1),
            'magicblock_compliance': (total_moves - total_timeouts) / max(total_moves, 1),
            'average_response_time': self._calculate_average_response_time()
        }
        
        return report

    def _calculate_average_response_time(self) -> float:
        """Calculate average response time across all agents"""
        total_time = 0.0
        total_moves = 0
        
        for stats in self.performance_stats.values():
            total_time += stats.get('total_time', 0.0)
            total_moves += stats.get('total_moves', 0)
        
        return (total_time / max(total_moves, 1)) * 1000  # Convert to ms

    def run_stress_test(self, concurrent_games: int = 10, moves_per_game: int = 20) -> Dict[str, Any]:
        """Run stress test with concurrent AI games"""
        logger.info(f"Starting stress test: {concurrent_games} concurrent games, {moves_per_game} moves each")
        
        start_time = time.time()
        completed_games = 0
        failed_games = 0
        
        def run_test_game(game_id: int) -> Dict[str, Any]:
            """Run a single test game"""
            try:
                # Create random match
                difficulties = ["easy", "medium", "hard"]
                personalities = ["aggressive", "defensive", "balanced"]
                
                agent1_config = {
                    "difficulty": random.choice(difficulties),
                    "personality": random.choice(personalities)
                }
                agent2_config = {
                    "difficulty": random.choice(difficulties),
                    "personality": random.choice(personalities)
                }
                
                match_id = self.create_match(agent1_config, agent2_config)
                if not match_id:
                    return {"success": False, "error": "Failed to create match"}
                
                # Simulate game moves
                execution_times = []
                
                for move_num in range(moves_per_game):
                    # Create mock board state
                    board_state = {
                        'currentPlayer': (move_num % 2) + 1,
                        'moveNumber': move_num + 1,
                        'pieces': {
                            'player1': [{'type': 'marshal', 'position': [8, 4]}],
                            'player2': [{'type': 'marshal', 'position': [0, 4]}]
                        }
                    }
                    
                    valid_moves = [
                        {'from': [7, 4], 'to': [6, 4], 'piece': {'type': 'pawn'}, 'isCapture': False},
                        {'from': [1, 4], 'to': [2, 4], 'piece': {'type': 'pawn'}, 'isCapture': False}
                    ]
                    
                    move_start = time.time()
                    move = self.get_ai_move(match_id, board_state, valid_moves)
                    move_time = time.time() - move_start
                    
                    execution_times.append(move_time * 1000)  # Convert to ms
                    
                    if not move:
                        self.end_match(match_id, {"winner": None, "reason": "AI error"})
                        return {"success": False, "error": "AI failed to generate move"}
                    
                    # Update current player
                    match_info = self.active_games.get(match_id)
                    if match_info:
                        match_info['current_player'] = (match_info['current_player'] % 2) + 1
                
                # End game
                self.end_match(match_id, {"winner": 1, "reason": "test_completion"})
                
                return {
                    "success": True,
                    "game_id": game_id,
                    "execution_times": execution_times,
                    "avg_time": sum(execution_times) / len(execution_times),
                    "max_time": max(execution_times),
                    "moves_completed": len(execution_times)
                }
                
            except Exception as e:
                return {"success": False, "error": str(e), "game_id": game_id}
        
        # Run concurrent games
        futures = []
        for game_id in range(concurrent_games):
            future = self.executor.submit(run_test_game, game_id)
            futures.append(future)
        
        # Collect results with timeout handling
        results = []
        timeout_seconds = MANAGER_CONFIG['stress_test_timeout']
        
        for future in as_completed(futures, timeout=timeout_seconds):
            try:
                result = future.result(timeout=10)  # Individual result timeout
                results.append(result)
                if result["success"]:
                    completed_games += 1
                else:
                    failed_games += 1
            except Exception as e:
                failed_games += 1
                results.append({"success": False, "error": str(e)})
        
        end_time = time.time()
        total_duration = end_time - start_time
        
        # Calculate aggregate statistics
        successful_results = [r for r in results if r.get("success")]
        all_execution_times = []
        for result in successful_results:
            all_execution_times.extend(result.get("execution_times", []))
        
        stress_test_report = {
            "test_configuration": {
                "concurrent_games": concurrent_games,
                "moves_per_game": moves_per_game,
                "total_duration": total_duration
            },
            "results": {
                "completed_games": completed_games,
                "failed_games": failed_games,
                "success_rate": completed_games / concurrent_games,
                "games_per_second": completed_games / total_duration
            },
            "performance": {
                "total_moves": len(all_execution_times),
                "avg_move_time_ms": sum(all_execution_times) / max(len(all_execution_times), 1),
                "max_move_time_ms": max(all_execution_times) if all_execution_times else 0,
                "min_move_time_ms": min(all_execution_times) if all_execution_times else 0,
                "moves_under_100ms": sum(1 for t in all_execution_times if t < 100),
                "magicblock_compliance_rate": sum(1 for t in all_execution_times if t < 100) / max(len(all_execution_times), 1)
            },
            "detailed_results": results
        }
        
        logger.info(f"Stress test completed: {completed_games}/{concurrent_games} games successful")
        logger.info(f"Average move time: {stress_test_report['performance']['avg_move_time_ms']:.2f}ms")
        logger.info(f"MagicBlock compliance: {stress_test_report['performance']['magicblock_compliance_rate']:.1%}")
        
        return stress_test_report

    def shutdown(self):
        """Shutdown AI manager and clean up resources (GI compliance)"""
        with self._shutdown_lock:
            if self._is_shutdown:
                return
            
            logger.info("Shutting down AI Manager")
            self._is_shutdown = True
            
            try:
                # End all active games
                active_game_ids = list(self.active_games.keys())
                for match_id in active_game_ids:
                    try:
                        self.end_match(match_id, {"winner": None, "reason": "shutdown"})
                    except Exception as e:
                        logger.error(f"Error ending match {match_id} during shutdown: {e}")
                
                # Shutdown thread pool gracefully
                self.executor.shutdown(wait=True)
                
                # Clean up agent resources
                for agent in self.agents.values():
                    try:
                        if hasattr(agent, 'cleanup'):
                            agent.cleanup()
                    except Exception as e:
                        logger.error(f"Error cleaning up agent: {e}")
                
                logger.info("AI Manager shutdown complete")
                
            except Exception as e:
                logger.error(f"Error during AI Manager shutdown: {e}")
                raise ValueError(f"Shutdown failed: {e}")

__all__ = ['AIManager']
