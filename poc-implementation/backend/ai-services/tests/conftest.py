"""
Configuration and fixtures for AI service testing
Following GI.md guidelines for comprehensive testing
"""

import pytest
import sys
import os
from typing import Dict, Any, List
import time

# Add the parent directory to the Python path so we can import the agents
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from agents.basic_ai_agents import (
    RandomAI, MinimaxAI, MCTSAI, AIConfig, AIPersonality, 
    AIAgentFactory, GungiBoardEvaluator
)
from agents.hard_agent import HardAgent
from agents.ai_manager import AIManager


# Test data fixtures

@pytest.fixture
def sample_board_state() -> Dict[str, Any]:
    """Sample board state for testing"""
    return {
        'currentPlayer': 1,
        'moveNumber': 1,
        'pieces': {
            'player1': [
                {'type': 'marshal', 'position': [8, 4]},
                {'type': 'general', 'position': [7, 4]},
                {'type': 'pawn', 'position': [6, 4]}
            ],
            'player2': [
                {'type': 'marshal', 'position': [0, 4]},
                {'type': 'general', 'position': [1, 4]},
                {'type': 'pawn', 'position': [2, 4]}
            ]
        },
        'gamePhase': 'opening'
    }


@pytest.fixture
def sample_valid_moves() -> List[Dict[str, Any]]:
    """Sample valid moves for testing"""
    return [
        {
            'from': [6, 4],
            'to': [5, 4],
            'piece': {'type': 'pawn'},
            'isCapture': False
        },
        {
            'from': [7, 4],
            'to': [6, 4],
            'piece': {'type': 'general'},
            'isCapture': False
        },
        {
            'from': [6, 4],
            'to': [5, 3],
            'piece': {'type': 'pawn'},
            'isCapture': False
        }
    ]


@pytest.fixture
def sample_capture_moves() -> List[Dict[str, Any]]:
    """Sample moves with captures for testing"""
    return [
        {
            'from': [6, 4],
            'to': [5, 4],
            'piece': {'type': 'pawn'},
            'isCapture': True,
            'captured': {'type': 'pawn'}
        },
        {
            'from': [7, 4],
            'to': [6, 5],
            'piece': {'type': 'general'},
            'isCapture': True,
            'captured': {'type': 'scout'}
        }
    ]


# AI Configuration fixtures

@pytest.fixture
def basic_ai_config() -> AIConfig:
    """Basic AI configuration for testing"""
    return AIConfig(
        personality=AIPersonality.BALANCED,
        skill_level=5,
        search_depth=2,
        thinking_time=0.1,
        max_move_time_ms=50.0
    )


@pytest.fixture
def aggressive_ai_config() -> AIConfig:
    """Aggressive AI configuration"""
    return AIConfig(
        personality=AIPersonality.AGGRESSIVE,
        skill_level=7,
        search_depth=3,
        aggression=0.8,
        risk_tolerance=0.7
    )


@pytest.fixture
def defensive_ai_config() -> AIConfig:
    """Defensive AI configuration"""
    return AIConfig(
        personality=AIPersonality.DEFENSIVE,
        skill_level=6,
        search_depth=3,
        aggression=0.3,
        risk_tolerance=0.3
    )


# AI Agent fixtures

@pytest.fixture
def random_ai(basic_ai_config) -> RandomAI:
    """Random AI agent for testing"""
    return RandomAI(basic_ai_config)


@pytest.fixture
def minimax_ai(basic_ai_config) -> MinimaxAI:
    """Minimax AI agent for testing"""
    return MinimaxAI(basic_ai_config)


@pytest.fixture
def mcts_ai(basic_ai_config) -> MCTSAI:
    """MCTS AI agent for testing"""
    return MCTSAI(basic_ai_config)


@pytest.fixture
def hard_ai() -> HardAgent:
    """Hard AI agent for testing"""
    return HardAgent("models/test_model.pt", "balanced")


@pytest.fixture
def board_evaluator() -> GungiBoardEvaluator:
    """Board evaluator for testing"""
    return GungiBoardEvaluator()


@pytest.fixture
def ai_manager() -> AIManager:
    """AI Manager for testing"""
    return AIManager()


# Edge case fixtures

@pytest.fixture
def empty_board_state() -> Dict[str, Any]:
    """Empty board state for edge case testing"""
    return {
        'currentPlayer': 1,
        'moveNumber': 1,
        'pieces': {
            'player1': [],
            'player2': []
        }
    }


@pytest.fixture
def endgame_board_state() -> Dict[str, Any]:
    """Endgame board state for testing"""
    return {
        'currentPlayer': 1,
        'moveNumber': 50,
        'pieces': {
            'player1': [
                {'type': 'marshal', 'position': [8, 4]}
            ],
            'player2': [
                {'type': 'marshal', 'position': [0, 4]}
            ]
        },
        'gamePhase': 'endgame'
    }


@pytest.fixture
def invalid_board_state() -> Dict[str, Any]:
    """Invalid board state for error testing"""
    return {
        'currentPlayer': 3,  # Invalid player
        'moveNumber': -1,    # Invalid move number
        'pieces': "invalid"  # Invalid pieces structure
    }


# Performance testing utilities

@pytest.fixture
def performance_timer():
    """Timer utility for performance testing"""
    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
        
        def elapsed_ms(self) -> float:
            if self.start_time and self.end_time:
                return (self.end_time - self.start_time) * 1000
            return 0.0
    
    return Timer()


# Test utilities

def create_test_board_states(count: int = 10) -> List[Dict[str, Any]]:
    """Create multiple test board states"""
    states = []
    for i in range(count):
        state = {
            'currentPlayer': (i % 2) + 1,
            'moveNumber': i + 1,
            'pieces': {
                'player1': [
                    {'type': 'marshal', 'position': [8, 4]},
                    {'type': 'pawn', 'position': [6 + (i % 3), 4]}
                ],
                'player2': [
                    {'type': 'marshal', 'position': [0, 4]},
                    {'type': 'pawn', 'position': [2 - (i % 3), 4]}
                ]
            },
            'gamePhase': 'midgame'
        }
        states.append(state)
    return states


def create_test_moves(count: int = 5) -> List[Dict[str, Any]]:
    """Create multiple test moves"""
    moves = []
    for i in range(count):
        move = {
            'from': [6, 4 + (i % 3)],
            'to': [5, 4 + (i % 3)],
            'piece': {'type': 'pawn'},
            'isCapture': i % 2 == 0
        }
        if move['isCapture']:
            move['captured'] = {'type': 'pawn'}
        moves.append(move)
    return moves


# Markers for organizing tests

def pytest_configure(config):
    """Configure custom markers"""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests") 
    config.addinivalue_line("markers", "performance: Performance tests")
    config.addinivalue_line("markers", "api: API endpoint tests")
    config.addinivalue_line("markers", "edge_case: Edge case tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
