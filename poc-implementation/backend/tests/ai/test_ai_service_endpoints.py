#!/usr/bin/env python3
"""
Pytest-compatible AI Service Testing Suite

Tests all AI endpoints, model predictions, error handling, and performance
scenarios using pytest framework for better integration with CI/CD.
"""

import pytest
import requests
import time
import json
import os
import statistics
from typing import Dict, Any, List
import concurrent.futures
import random

# Test configuration
BASE_URL = os.environ.get('AI_SERVICE_BASE_URL', 'http://localhost:3000')
TIMEOUT = int(os.environ.get('API_TIMEOUT_SECONDS', '10'))

# Test session setup
@pytest.fixture(scope="session")
def api_session():
    """Create requests session for API testing"""
    session = requests.Session()
    session.timeout = TIMEOUT
    return session

@pytest.fixture(scope="session")
def check_server(api_session):
    """Ensure AI service is running"""
    try:
        response = api_session.get(f"{BASE_URL}/api/ai/health")
        assert response.status_code == 200, "AI service is not running"
        data = response.json()
        assert data.get('status') == 'healthy', "AI service is not healthy"
    except Exception as e:
        pytest.skip(f"AI service not available: {e}")

class TestAIHealthEndpoints:
    """Test AI service health and status endpoints"""

    def test_health_check_basic(self, api_session, check_server):
        """Test basic health check endpoint"""
        response = api_session.get(f"{BASE_URL}/api/ai/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
        assert data['ai_service'] == 'connected'
        assert 'timestamp' in data

    def test_health_check_response_time(self, api_session, check_server):
        """Test health check response time"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/ai/health")
        duration = (time.time() - start) * 1000
        
        assert response.status_code == 200
        assert duration < 1000, f"Health check too slow: {duration:.2f}ms"

    def test_health_check_concurrent(self, api_session, check_server):
        """Test health check under concurrent load"""
        def health_request():
            return api_session.get(f"{BASE_URL}/api/ai/health").status_code == 200
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(health_request) for _ in range(20)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.9, f"Health check success rate too low: {success_rate:.1%}"

class TestAIAgentsEndpoints:
    """Test AI agents listing and retrieval endpoints"""

    def test_list_agents(self, api_session, check_server):
        """Test listing all AI agents"""
        response = api_session.get(f"{BASE_URL}/api/ai/agents")
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'data' in data
        assert isinstance(data['data'], list)
        assert len(data['data']) > 0

    def test_agent_structure_validation(self, api_session, check_server):
        """Test that agents have required fields"""
        response = api_session.get(f"{BASE_URL}/api/ai/agents")
        data = response.json()
        agents = data['data']
        
        required_fields = ['id', 'name', 'difficulty', 'personality', 'skillLevel', 'winRate', 'elo']
        for agent in agents:
            for field in required_fields:
                assert field in agent, f"Agent {agent.get('id', 'unknown')} missing field: {field}"
            
            # Validate data types and ranges
            assert isinstance(agent['skillLevel'], (int, float))
            assert 0 <= agent['skillLevel'] <= 100
            assert isinstance(agent['winRate'], (int, float))
            assert 0 <= agent['winRate'] <= 1
            assert isinstance(agent['elo'], int)
            assert agent['elo'] > 0

    @pytest.mark.parametrize("agent_id", ["netero", "meruem", "komugi", "ging", "hisoka"])
    def test_get_specific_agent(self, api_session, check_server, agent_id):
        """Test getting specific agent details"""
        response = api_session.get(f"{BASE_URL}/api/ai/agents/{agent_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['data']['id'] == agent_id

    def test_get_nonexistent_agent(self, api_session, check_server):
        """Test error handling for nonexistent agent"""
        response = api_session.get(f"{BASE_URL}/api/ai/agents/nonexistent")
        
        assert response.status_code == 404
        data = response.json()
        assert data['success'] is False

class TestAIMoveGeneration:
    """Test AI move generation functionality"""

    def test_basic_move_generation(self, api_session, check_server):
        """Test basic AI move generation"""
        payload = {
            "board_state": {
                "pieces": [],
                "current_turn": 1,
                "move_number": 1
            },
            "agent_config": {
                "agent_id": "netero"
            },
            "time_limit": 5000
        }
        
        response = api_session.post(f"{BASE_URL}/api/ai/move", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'move' in data
        
        move = data['move']
        required_move_fields = ['from', 'to', 'piece', 'player', 'confidence']
        for field in required_move_fields:
            assert field in move, f"Move missing field: {field}"
        
        assert 0 <= move['confidence'] <= 1

    @pytest.mark.parametrize("agent_id", ["netero", "meruem", "komugi", "ging", "hisoka"])
    def test_move_generation_all_agents(self, api_session, check_server, agent_id):
        """Test move generation works for all agents"""
        payload = {
            "board_state": {
                "pieces": [],
                "current_turn": random.choice([1, 2]),
                "move_number": random.randint(1, 20)
            },
            "agent_config": {
                "agent_id": agent_id
            }
        }
        
        response = api_session.post(f"{BASE_URL}/api/ai/move", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['agent_id'] == agent_id

    def test_move_generation_performance(self, api_session, check_server):
        """Test move generation performance"""
        payload = {
            "board_state": {"pieces": [], "current_turn": 1, "move_number": 1},
            "agent_config": {"agent_id": "netero"}
        }
        
        response_times = []
        for _ in range(5):
            start = time.time()
            response = api_session.post(f"{BASE_URL}/api/ai/move", json=payload)
            duration = (time.time() - start) * 1000
            
            assert response.status_code == 200
            response_times.append(duration)
        
        avg_time = statistics.mean(response_times)
        max_time = max(response_times)
        
        assert avg_time < 2000, f"Average response time too high: {avg_time:.2f}ms"
        assert max_time < 5000, f"Maximum response time too high: {max_time:.2f}ms"

    @pytest.mark.parametrize("invalid_payload", [
        {},  # Empty
        {"board_state": {}},  # Missing agent_config
        {"agent_config": {"agent_id": "test"}},  # Missing board_state
        {"board_state": {"pieces": []}, "agent_config": {"agent_id": ""}}  # Empty agent_id
    ])
    def test_move_invalid_input(self, api_session, check_server, invalid_payload):
        """Test move generation with invalid input"""
        response = api_session.post(f"{BASE_URL}/api/ai/move", json=invalid_payload)
        assert response.status_code == 400

class TestAICustomization:
    """Test AI agent customization functionality"""

    def test_agent_customization(self, api_session, check_server):
        """Test AI agent customization"""
        payload = {
            "agentId": "hisoka",
            "personality": "aggressive",
            "openings": ["standard", "aggressive"],
            "playingStyle": "tactical",
            "aggression": 0.8,
            "defensiveness": 0.3
        }
        
        response = api_session.post(f"{BASE_URL}/api/ai/customize", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'agent' in data
        assert 'customizations' in data['agent']

    def test_customization_invalid_input(self, api_session, check_server):
        """Test customization with missing required fields"""
        payload = {}  # Missing agentId
        
        response = api_session.post(f"{BASE_URL}/api/ai/customize", json=payload)
        assert response.status_code == 400

class TestAITraining:
    """Test AI training functionality"""

    def test_start_training(self, api_session, check_server):
        """Test starting AI training session"""
        payload = {
            "agent_id": "netero",
            "training_data": [
                {"game_state": {}, "optimal_move": {}, "outcome": "win"},
                {"game_state": {}, "optimal_move": {}, "outcome": "draw"}
            ],
            "training_config": {"epochs": 10, "learning_rate": 0.01}
        }
        
        response = api_session.post(f"{BASE_URL}/api/ai/train", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'training_status' in data

    def test_training_status(self, api_session, check_server):
        """Test getting training status"""
        session_id = f"test_session_{int(time.time())}"
        
        response = api_session.get(f"{BASE_URL}/api/ai/training/{session_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'training' in data

    def test_training_invalid_input(self, api_session, check_server):
        """Test training with invalid input"""
        payload = {"agent_id": "test"}  # Missing training_data
        
        response = api_session.post(f"{BASE_URL}/api/ai/train", json=payload)
        assert response.status_code == 400

class TestAdditionalEndpoints:
    """Test additional AI service endpoints"""

    def test_leaderboard(self, api_session, check_server):
        """Test AI leaderboard endpoint"""
        response = api_session.get(f"{BASE_URL}/api/ai/leaderboard")
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        
        leaderboard = data['data']['leaderboard']
        assert isinstance(leaderboard, list)
        assert len(leaderboard) > 0
        
        # Verify leaderboard is sorted by rank
        for i, agent in enumerate(leaderboard):
            assert agent['rank'] == i + 1
            assert 'elo' in agent
            assert 'winRate' in agent

    def test_create_custom_agent(self, api_session, check_server):
        """Test creating custom AI agent"""
        payload = {
            "name": f"Test Agent {int(time.time())}",
            "personality": "balanced",
            "skillLevel": 75,
            "description": "Test custom agent"
        }
        
        response = api_session.post(f"{BASE_URL}/api/ai/agents/create", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data['success'] is True
        assert data['data']['name'] == payload['name']
        assert data['data']['isCustom'] is True

    def test_agent_challenge(self, api_session, check_server):
        """Test creating challenge between agents"""
        payload = {
            "opponentId": "meruem",
            "gameSettings": {"timeControl": 600},
            "gameType": "standard"
        }
        
        response = api_session.post(f"{BASE_URL}/api/ai/agents/netero/challenge", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'matchId' in data['data']
        assert data['data']['status'] == 'pending'

    def test_ai_vs_ai_demo(self, api_session, check_server):
        """Test AI vs AI demo simulation"""
        response = api_session.post(f"{BASE_URL}/api/ai/demo/ai-vs-ai")
        
        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert 'game_state' in data
        assert len(data['game_state']['moves']) > 0

class TestErrorHandling:
    """Test error handling and edge cases"""

    def test_error_route(self, api_session, check_server):
        """Test dedicated error handling route"""
        response = api_session.get(f"{BASE_URL}/api/ai/agents/error-test")
        
        assert response.status_code == 500
        data = response.json()
        assert data['success'] is False

    def test_malformed_json(self, api_session, check_server):
        """Test handling of malformed JSON"""
        response = api_session.post(
            f"{BASE_URL}/api/ai/move",
            data='{"invalid": json}',
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code in [400, 422]

class TestSecurity:
    """Test security-related functionality"""

    @pytest.mark.parametrize("malicious_input", [
        "'; DROP TABLE agents; --",
        "1' OR '1'='1",
        "<script>alert('xss')</script>"
    ])
    def test_injection_protection(self, api_session, check_server, malicious_input):
        """Test protection against injection attacks"""
        response = api_session.get(f"{BASE_URL}/api/ai/agents/{malicious_input}")
        
        # Should return 404, not 200 or 500 (which might indicate successful injection)
        assert response.status_code in [400, 404]
        
        # Response should not contain the malicious input
        assert malicious_input not in response.text

class TestPerformance:
    """Test performance characteristics"""

    def test_concurrent_requests(self, api_session, check_server):
        """Test service under concurrent load"""
        def make_request():
            payload = {
                "board_state": {"pieces": [], "current_turn": 1, "move_number": 1},
                "agent_config": {"agent_id": "netero"}
            }
            return api_session.post(f"{BASE_URL}/api/ai/move", json=payload).status_code == 200
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(25)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.8, f"Concurrent request success rate too low: {success_rate:.1%}"

    def test_response_time_consistency(self, api_session, check_server):
        """Test response time consistency"""
        payload = {
            "board_state": {"pieces": [], "current_turn": 1, "move_number": 1},
            "agent_config": {"agent_id": "netero"}
        }
        
        response_times = []
        for _ in range(10):
            start = time.time()
            response = api_session.post(f"{BASE_URL}/api/ai/move", json=payload)
            duration = (time.time() - start) * 1000
            
            if response.status_code == 200:
                response_times.append(duration)
        
        assert len(response_times) >= 8, "Too many failed requests"
        
        avg_time = statistics.mean(response_times)
        std_dev = statistics.stdev(response_times) if len(response_times) > 1 else 0
        
        # Response times should be reasonably consistent
        consistency_ratio = std_dev / avg_time if avg_time > 0 else 1
        assert consistency_ratio < 0.5, f"Response times too inconsistent: {consistency_ratio:.2f}"

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
