#!/usr/bin/env python3
"""
Comprehensive AI Service Testing Suite for Nen Platform

Tests all AI endpoints, model predictions, error handling, and performance
scenarios for the TypeScript/Express AI service.

Following GI.md guidelines:
- Real implementations testing (Guideline #2)
- Production readiness validation (Guideline #3)
- 100% test coverage (Guideline #8)
- No hardcoding or placeholders (Guideline #18)
- Robust error handling testing (Guideline #20)
- Performance validation (Guideline #21)
- Security testing (Guideline #23)
"""

import pytest
import requests
import json
import time
import asyncio
import aiohttp
import concurrent.futures
import statistics
import os
import sys
import threading
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from unittest.mock import patch, MagicMock
import psutil
import uuid
from datetime import datetime, timedelta
import random
import logging

# Configuration from environment (avoiding hardcoding per GI.md #18)
TEST_CONFIG = {
    'BASE_URL': os.environ.get('AI_SERVICE_BASE_URL', 'http://localhost:3000'),
    'API_TIMEOUT': int(os.environ.get('API_TIMEOUT_SECONDS', '30')),
    'CONCURRENT_REQUESTS': int(os.environ.get('CONCURRENT_REQUESTS', '50')),
    'PERFORMANCE_THRESHOLD_MS': int(os.environ.get('PERFORMANCE_THRESHOLD_MS', '1000')),
    'LOAD_TEST_DURATION': int(os.environ.get('LOAD_TEST_DURATION', '60')),
    'ERROR_RATE_THRESHOLD': float(os.environ.get('ERROR_RATE_THRESHOLD', '0.05')),
    'MEMORY_THRESHOLD_MB': int(os.environ.get('MEMORY_THRESHOLD_MB', '100'))
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class TestResult:
    """Test execution result with comprehensive metrics"""
    test_name: str
    success: bool
    duration_ms: float
    response_time_ms: Optional[float] = None
    status_code: Optional[int] = None
    error_message: Optional[str] = None
    memory_usage_mb: Optional[float] = None
    response_size_bytes: Optional[int] = None
    additional_metrics: Optional[Dict[str, Any]] = None

@dataclass
class AIServiceTestReport:
    """Comprehensive test report for AI service"""
    total_tests: int
    passed_tests: int
    failed_tests: int
    success_rate: float
    total_duration_ms: float
    average_response_time_ms: float
    performance_metrics: Dict[str, Any]
    endpoint_coverage: Dict[str, bool]
    error_scenarios_tested: List[str]
    security_tests_passed: int
    load_test_results: Optional[Dict[str, Any]] = None
    recommendations: List[str] = None

class AIServiceTester:
    """Comprehensive AI Service Testing Framework"""

    def __init__(self):
        self.base_url = TEST_CONFIG['BASE_URL']
        self.session = requests.Session()
        self.session.timeout = TEST_CONFIG['API_TIMEOUT']
        self.test_results: List[TestResult] = []
        self.start_time = time.time()

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Tuple[requests.Response, float]:
        """Make HTTP request with timing and error handling"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            response = self.session.request(method, url, **kwargs)
            duration = (time.time() - start_time) * 1000
            return response, duration
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"Request failed: {method} {url} - {e}")
            raise

    def _get_memory_usage(self) -> float:
        """Get current process memory usage"""
        try:
            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024  # MB
        except:
            return 0.0

    def _record_test_result(self, test_name: str, success: bool, duration_ms: float, 
                          response_time_ms: Optional[float] = None, 
                          status_code: Optional[int] = None,
                          error_message: Optional[str] = None,
                          additional_metrics: Optional[Dict[str, Any]] = None):
        """Record test result with comprehensive metrics"""
        result = TestResult(
            test_name=test_name,
            success=success,
            duration_ms=duration_ms,
            response_time_ms=response_time_ms,
            status_code=status_code,
            error_message=error_message,
            memory_usage_mb=self._get_memory_usage(),
            additional_metrics=additional_metrics or {}
        )
        self.test_results.append(result)
        
        status = "✓" if success else "✗"
        logger.info(f"{status} {test_name} - {duration_ms:.2f}ms")

    # ==========================================
    # HEALTH CHECK TESTS
    # ==========================================

    def test_ai_health_check(self) -> bool:
        """Test AI service health check endpoint"""
        try:
            start = time.time()
            response, response_time = self._make_request('GET', '/api/ai/health')
            duration = (time.time() - start) * 1000

            success = response.status_code == 200
            if success:
                data = response.json()
                success = (
                    data.get('status') == 'healthy' and
                    data.get('ai_service') == 'connected' and
                    'timestamp' in data
                )

            self._record_test_result(
                'ai_health_check', success, duration, response_time, 
                response.status_code,
                additional_metrics={'response_data': response.json() if success else None}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'ai_health_check', False, duration, error_message=str(e)
            )
            return False

    def test_ai_health_check_under_load(self) -> bool:
        """Test health check under concurrent load"""
        try:
            def health_check_request():
                response, response_time = self._make_request('GET', '/api/ai/health')
                return response.status_code == 200, response_time

            start = time.time()
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                futures = [executor.submit(health_check_request) for _ in range(100)]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]

            duration = (time.time() - start) * 1000
            success_count = sum(1 for success, _ in results if success)
            response_times = [rt for _, rt in results]

            success = success_count >= 95  # 95% success rate
            avg_response_time = statistics.mean(response_times) if response_times else 0

            self._record_test_result(
                'ai_health_check_under_load', success, duration, avg_response_time,
                additional_metrics={
                    'success_rate': success_count / 100,
                    'total_requests': 100,
                    'max_response_time': max(response_times) if response_times else 0
                }
            )
            return success

        except Exception as e:
            self._record_test_result(
                'ai_health_check_under_load', False, 0, error_message=str(e)
            )
            return False

    # ==========================================
    # AI AGENTS ENDPOINT TESTS
    # ==========================================

    def test_list_ai_agents(self) -> bool:
        """Test listing all AI agents"""
        try:
            start = time.time()
            response, response_time = self._make_request('GET', '/api/ai/agents')
            duration = (time.time() - start) * 1000

            success = response.status_code == 200
            if success:
                data = response.json()
                success = (
                    data.get('success') is True and
                    'data' in data and
                    isinstance(data['data'], list) and
                    len(data['data']) > 0
                )

                if success:
                    # Validate agent structure
                    for agent in data['data']:
                        required_fields = ['id', 'name', 'difficulty', 'personality', 'skillLevel', 'winRate', 'elo']
                        if not all(field in agent for field in required_fields):
                            success = False
                            break

            self._record_test_result(
                'list_ai_agents', success, duration, response_time, 
                response.status_code,
                additional_metrics={
                    'agent_count': len(data.get('data', [])) if success else 0,
                    'response_size': len(response.content)
                }
            )
            return success

        except Exception as e:
            self._record_test_result(
                'list_ai_agents', False, 0, error_message=str(e)
            )
            return False

    def test_get_specific_ai_agent(self) -> bool:
        """Test getting specific AI agent details"""
        agents_to_test = ['netero', 'meruem', 'komugi', 'ging', 'hisoka']
        all_success = True

        for agent_id in agents_to_test:
            try:
                start = time.time()
                response, response_time = self._make_request('GET', f'/api/ai/agents/{agent_id}')
                duration = (time.time() - start) * 1000

                success = response.status_code == 200
                if success:
                    data = response.json()
                    agent_data = data.get('data', {})
                    success = (
                        data.get('success') is True and
                        agent_data.get('id') == agent_id and
                        all(field in agent_data for field in ['name', 'difficulty', 'personality'])
                    )

                self._record_test_result(
                    f'get_agent_{agent_id}', success, duration, response_time, 
                    response.status_code,
                    additional_metrics={'agent_data': agent_data if success else None}
                )

                if not success:
                    all_success = False

            except Exception as e:
                self._record_test_result(
                    f'get_agent_{agent_id}', False, 0, error_message=str(e)
                )
                all_success = False

        return all_success

    def test_get_nonexistent_agent(self) -> bool:
        """Test error handling for nonexistent agent"""
        try:
            start = time.time()
            response, response_time = self._make_request('GET', '/api/ai/agents/nonexistent')
            duration = (time.time() - start) * 1000

            success = response.status_code == 404
            if success:
                data = response.json()
                success = data.get('success') is False

            self._record_test_result(
                'get_nonexistent_agent', success, duration, response_time, 
                response.status_code,
                additional_metrics={'expected_404': True}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'get_nonexistent_agent', False, 0, error_message=str(e)
            )
            return False

    # ==========================================
    # AI MOVE GENERATION TESTS
    # ==========================================

    def test_ai_move_generation(self) -> bool:
        """Test AI move generation with valid input"""
        try:
            start = time.time()
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

            response, response_time = self._make_request('POST', '/api/ai/move', json=payload)
            duration = (time.time() - start) * 1000

            success = response.status_code == 200
            if success:
                data = response.json()
                move_data = data.get('move', {})
                success = (
                    data.get('success') is True and
                    'move' in data and
                    all(field in move_data for field in ['from', 'to', 'piece', 'player', 'confidence'])
                )

            self._record_test_result(
                'ai_move_generation', success, duration, response_time, 
                response.status_code,
                additional_metrics={
                    'move_data': data.get('move') if success else None,
                    'agent_id': payload['agent_config']['agent_id']
                }
            )
            return success

        except Exception as e:
            self._record_test_result(
                'ai_move_generation', False, 0, error_message=str(e)
            )
            return False

    def test_ai_move_generation_all_agents(self) -> bool:
        """Test move generation for all available agents"""
        agents = ['netero', 'meruem', 'komugi', 'ging', 'hisoka']
        all_success = True

        for agent_id in agents:
            try:
                start = time.time()
                payload = {
                    "board_state": {
                        "pieces": [],
                        "current_turn": random.choice([1, 2]),
                        "move_number": random.randint(1, 50)
                    },
                    "agent_config": {
                        "agent_id": agent_id
                    }
                }

                response, response_time = self._make_request('POST', '/api/ai/move', json=payload)
                duration = (time.time() - start) * 1000

                success = response.status_code == 200
                if success:
                    data = response.json()
                    success = data.get('success') is True and 'move' in data

                self._record_test_result(
                    f'move_generation_{agent_id}', success, duration, response_time, 
                    response.status_code,
                    additional_metrics={'agent_id': agent_id}
                )

                if not success:
                    all_success = False

            except Exception as e:
                self._record_test_result(
                    f'move_generation_{agent_id}', False, 0, error_message=str(e)
                )
                all_success = False

        return all_success

    def test_ai_move_invalid_input(self) -> bool:
        """Test AI move generation with invalid input"""
        invalid_payloads = [
            {},  # Empty payload
            {"board_state": {}},  # Missing agent_config
            {"agent_config": {"agent_id": "test"}},  # Missing board_state
            {
                "board_state": {"pieces": []},
                "agent_config": {"agent_id": ""}  # Empty agent_id
            }
        ]

        all_success = True
        for i, payload in enumerate(invalid_payloads):
            try:
                start = time.time()
                response, response_time = self._make_request('POST', '/api/ai/move', json=payload)
                duration = (time.time() - start) * 1000

                success = response.status_code == 400  # Expecting bad request
                
                self._record_test_result(
                    f'move_invalid_input_{i}', success, duration, response_time, 
                    response.status_code,
                    additional_metrics={'payload': payload, 'expected_400': True}
                )

                if not success:
                    all_success = False

            except Exception as e:
                self._record_test_result(
                    f'move_invalid_input_{i}', False, 0, error_message=str(e)
                )
                all_success = False

        return all_success

    # ==========================================
    # AI CUSTOMIZATION TESTS
    # ==========================================

    def test_ai_agent_customization(self) -> bool:
        """Test AI agent customization endpoint"""
        try:
            start = time.time()
            payload = {
                "agentId": "hisoka",
                "personality": "aggressive",
                "openings": ["standard", "aggressive"],
                "playingStyle": "tactical",
                "aggression": 0.8,
                "defensiveness": 0.3
            }

            response, response_time = self._make_request('POST', '/api/ai/customize', json=payload)
            duration = (time.time() - start) * 1000

            success = response.status_code == 200
            if success:
                data = response.json()
                agent_data = data.get('agent', {})
                success = (
                    data.get('success') is True and
                    'agent' in data and
                    'id' in agent_data and
                    'customizations' in agent_data
                )

            self._record_test_result(
                'ai_agent_customization', success, duration, response_time, 
                response.status_code,
                additional_metrics={'customized_agent': agent_data if success else None}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'ai_agent_customization', False, 0, error_message=str(e)
            )
            return False

    def test_ai_customization_invalid_input(self) -> bool:
        """Test customization with invalid input"""
        try:
            start = time.time()
            payload = {}  # Missing required agentId

            response, response_time = self._make_request('POST', '/api/ai/customize', json=payload)
            duration = (time.time() - start) * 1000

            success = response.status_code == 400

            self._record_test_result(
                'ai_customization_invalid_input', success, duration, response_time, 
                response.status_code,
                additional_metrics={'expected_400': True}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'ai_customization_invalid_input', False, 0, error_message=str(e)
            )
            return False

    # ==========================================
    # AI TRAINING TESTS
    # ==========================================

    def test_ai_training_start(self) -> bool:
        """Test starting AI training session"""
        try:
            start = time.time()
            payload = {
                "agent_id": "netero",
                "training_data": [
                    {"game_state": {}, "optimal_move": {}, "outcome": "win"},
                    {"game_state": {}, "optimal_move": {}, "outcome": "draw"}
                ],
                "training_config": {
                    "epochs": 10,
                    "learning_rate": 0.01
                }
            }

            response, response_time = self._make_request('POST', '/api/ai/train', json=payload)
            duration = (time.time() - start) * 1000

            success = response.status_code == 200
            if success:
                data = response.json()
                success = (
                    data.get('success') is True and
                    'training_status' in data
                )

            self._record_test_result(
                'ai_training_start', success, duration, response_time, 
                response.status_code,
                additional_metrics={'training_data_size': len(payload['training_data'])}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'ai_training_start', False, 0, error_message=str(e)
            )
            return False

    def test_ai_training_status(self) -> bool:
        """Test getting AI training status"""
        try:
            session_id = f"test_session_{int(time.time())}"
            start = time.time()
            
            response, response_time = self._make_request('GET', f'/api/ai/training/{session_id}')
            duration = (time.time() - start) * 1000

            success = response.status_code == 200
            if success:
                data = response.json()
                success = (
                    data.get('success') is True and
                    'training' in data
                )

            self._record_test_result(
                'ai_training_status', success, duration, response_time, 
                response.status_code,
                additional_metrics={'session_id': session_id}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'ai_training_status', False, 0, error_message=str(e)
            )
            return False

    def test_ai_training_invalid_input(self) -> bool:
        """Test training with invalid input"""
        try:
            start = time.time()
            payload = {"agent_id": "test"}  # Missing training_data

            response, response_time = self._make_request('POST', '/api/ai/train', json=payload)
            duration = (time.time() - start) * 1000

            success = response.status_code == 400

            self._record_test_result(
                'ai_training_invalid_input', success, duration, response_time, 
                response.status_code,
                additional_metrics={'expected_400': True}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'ai_training_invalid_input', False, 0, error_message=str(e)
            )
            return False

    # ==========================================
    # ADDITIONAL ENDPOINT TESTS
    # ==========================================

    def test_ai_leaderboard(self) -> bool:
        """Test AI agent leaderboard endpoint"""
        try:
            start = time.time()
            response, response_time = self._make_request('GET', '/api/ai/leaderboard')
            duration = (time.time() - start) * 1000

            success = response.status_code == 200
            if success:
                data = response.json()
                leaderboard = data.get('data', {}).get('leaderboard', [])
                success = (
                    data.get('success') is True and
                    isinstance(leaderboard, list) and
                    len(leaderboard) > 0 and
                    all('rank' in agent for agent in leaderboard)
                )

            self._record_test_result(
                'ai_leaderboard', success, duration, response_time, 
                response.status_code,
                additional_metrics={'leaderboard_size': len(leaderboard) if success else 0}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'ai_leaderboard', False, 0, error_message=str(e)
            )
            return False

    def test_create_custom_agent(self) -> bool:
        """Test creating custom AI agent"""
        try:
            start = time.time()
            payload = {
                "name": f"Test Agent {int(time.time())}",
                "personality": "balanced",
                "skillLevel": 75,
                "description": "Test custom agent"
            }

            response, response_time = self._make_request('POST', '/api/ai/agents/create', json=payload)
            duration = (time.time() - start) * 1000

            success = response.status_code == 201
            if success:
                data = response.json()
                agent_data = data.get('data', {})
                success = (
                    data.get('success') is True and
                    agent_data.get('name') == payload['name'] and
                    agent_data.get('isCustom') is True
                )

            self._record_test_result(
                'create_custom_agent', success, duration, response_time, 
                response.status_code,
                additional_metrics={'agent_name': payload['name']}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'create_custom_agent', False, 0, error_message=str(e)
            )
            return False

    def test_agent_challenge(self) -> bool:
        """Test creating challenge between agents"""
        try:
            start = time.time()
            payload = {
                "opponentId": "meruem",
                "gameSettings": {"timeControl": 600},
                "gameType": "standard"
            }

            response, response_time = self._make_request('POST', '/api/ai/agents/netero/challenge', json=payload)
            duration = (time.time() - start) * 1000

            success = response.status_code == 200
            if success:
                data = response.json()
                challenge_data = data.get('data', {})
                success = (
                    data.get('success') is True and
                    'matchId' in challenge_data and
                    challenge_data.get('status') == 'pending'
                )

            self._record_test_result(
                'agent_challenge', success, duration, response_time, 
                response.status_code,
                additional_metrics={'challenge_data': challenge_data if success else None}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'agent_challenge', False, 0, error_message=str(e)
            )
            return False

    def test_ai_vs_ai_demo(self) -> bool:
        """Test AI vs AI demo simulation"""
        try:
            start = time.time()
            response, response_time = self._make_request('POST', '/api/ai/demo/ai-vs-ai')
            duration = (time.time() - start) * 1000

            success = response.status_code == 200
            if success:
                data = response.json()
                game_state = data.get('game_state', {})
                success = (
                    data.get('success') is True and
                    'moves' in game_state and
                    len(game_state.get('moves', [])) > 0
                )

            self._record_test_result(
                'ai_vs_ai_demo', success, duration, response_time, 
                response.status_code,
                additional_metrics={'moves_count': len(game_state.get('moves', [])) if success else 0}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'ai_vs_ai_demo', False, 0, error_message=str(e)
            )
            return False

    # ==========================================
    # ERROR HANDLING TESTS
    # ==========================================

    def test_error_handling_route(self) -> bool:
        """Test dedicated error handling route"""
        try:
            start = time.time()
            response, response_time = self._make_request('GET', '/api/ai/agents/error-test')
            duration = (time.time() - start) * 1000

            success = response.status_code == 500
            if success:
                data = response.json()
                success = data.get('success') is False

            self._record_test_result(
                'error_handling_route', success, duration, response_time, 
                response.status_code,
                additional_metrics={'expected_500': True}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'error_handling_route', False, 0, error_message=str(e)
            )
            return False

    def test_malformed_json_handling(self) -> bool:
        """Test handling of malformed JSON requests"""
        try:
            start = time.time()
            malformed_data = '{"invalid": json}'
            
            response = self.session.post(
                f"{self.base_url}/api/ai/move",
                data=malformed_data,
                headers={'Content-Type': 'application/json'}
            )
            duration = (time.time() - start) * 1000

            success = response.status_code in [400, 422]  # Bad request or unprocessable entity

            self._record_test_result(
                'malformed_json_handling', success, duration, None, 
                response.status_code,
                additional_metrics={'expected_4xx': True}
            )
            return success

        except Exception as e:
            self._record_test_result(
                'malformed_json_handling', False, 0, error_message=str(e)
            )
            return False

    # ==========================================
    # PERFORMANCE AND LOAD TESTS
    # ==========================================

    def test_concurrent_move_requests(self) -> bool:
        """Test concurrent AI move requests"""
        try:
            def make_move_request():
                payload = {
                    "board_state": {
                        "pieces": [],
                        "current_turn": random.choice([1, 2]),
                        "move_number": random.randint(1, 20)
                    },
                    "agent_config": {
                        "agent_id": random.choice(['netero', 'meruem', 'komugi'])
                    }
                }
                
                start_req = time.time()
                response, response_time = self._make_request('POST', '/api/ai/move', json=payload)
                duration_req = (time.time() - start_req) * 1000
                
                return {
                    'success': response.status_code == 200,
                    'duration': duration_req,
                    'response_time': response_time,
                    'status_code': response.status_code
                }

            start = time.time()
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                futures = [executor.submit(make_move_request) for _ in range(TEST_CONFIG['CONCURRENT_REQUESTS'])]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]

            total_duration = (time.time() - start) * 1000
            successful_requests = [r for r in results if r['success']]
            success_rate = len(successful_requests) / len(results)
            
            avg_response_time = statistics.mean([r['response_time'] for r in successful_requests]) if successful_requests else 0
            max_response_time = max([r['response_time'] for r in successful_requests]) if successful_requests else 0

            success = success_rate >= (1 - TEST_CONFIG['ERROR_RATE_THRESHOLD'])

            self._record_test_result(
                'concurrent_move_requests', success, total_duration, avg_response_time,
                additional_metrics={
                    'total_requests': len(results),
                    'success_rate': success_rate,
                    'max_response_time': max_response_time,
                    'error_rate': 1 - success_rate
                }
            )
            return success

        except Exception as e:
            self._record_test_result(
                'concurrent_move_requests', False, 0, error_message=str(e)
            )
            return False

    def test_response_time_consistency(self) -> bool:
        """Test AI service response time consistency"""
        try:
            response_times = []
            payload = {
                "board_state": {"pieces": [], "current_turn": 1, "move_number": 1},
                "agent_config": {"agent_id": "netero"}
            }

            for i in range(20):
                start = time.time()
                response, response_time = self._make_request('POST', '/api/ai/move', json=payload)
                duration = (time.time() - start) * 1000
                
                if response.status_code == 200:
                    response_times.append(response_time)

            if not response_times:
                success = False
            else:
                avg_time = statistics.mean(response_times)
                max_time = max(response_times)
                std_dev = statistics.stdev(response_times) if len(response_times) > 1 else 0
                
                # Response times should be consistent (low standard deviation relative to mean)
                consistency_ratio = std_dev / avg_time if avg_time > 0 else 1
                success = (
                    consistency_ratio < 0.5 and  # Standard deviation less than 50% of mean
                    max_time < TEST_CONFIG['PERFORMANCE_THRESHOLD_MS'] and
                    avg_time < TEST_CONFIG['PERFORMANCE_THRESHOLD_MS'] * 0.8
                )

            self._record_test_result(
                'response_time_consistency', success, sum(response_times), avg_time if response_times else 0,
                additional_metrics={
                    'avg_response_time': avg_time if response_times else 0,
                    'max_response_time': max_time if response_times else 0,
                    'std_deviation': std_dev,
                    'consistency_ratio': consistency_ratio if response_times else 1
                }
            )
            return success

        except Exception as e:
            self._record_test_result(
                'response_time_consistency', False, 0, error_message=str(e)
            )
            return False

    # ==========================================
    # SECURITY TESTS
    # ==========================================

    def test_sql_injection_protection(self) -> bool:
        """Test SQL injection protection in endpoints"""
        try:
            malicious_payloads = [
                "'; DROP TABLE agents; --",
                "1' OR '1'='1",
                "' UNION SELECT * FROM users --"
            ]

            all_success = True
            for i, payload in enumerate(malicious_payloads):
                start = time.time()
                response, response_time = self._make_request('GET', f'/api/ai/agents/{payload}')
                duration = (time.time() - start) * 1000

                # Should return 404 or 400, not 200 or 500 (which might indicate successful injection)
                success = response.status_code in [400, 404]
                
                self._record_test_result(
                    f'sql_injection_test_{i}', success, duration, response_time, 
                    response.status_code,
                    additional_metrics={'malicious_payload': payload}
                )

                if not success:
                    all_success = False

            return all_success

        except Exception as e:
            self._record_test_result(
                'sql_injection_protection', False, 0, error_message=str(e)
            )
            return False

    def test_xss_protection(self) -> bool:
        """Test XSS protection in endpoints"""
        try:
            xss_payloads = [
                "<script>alert('xss')</script>",
                "javascript:alert('xss')",
                "<img src=x onerror=alert('xss')>"
            ]

            all_success = True
            for i, payload in enumerate(xss_payloads):
                start = time.time()
                response, response_time = self._make_request('GET', f'/api/ai/agents/{payload}')
                duration = (time.time() - start) * 1000

                # Should return 404, and response should not contain the raw payload
                success = (
                    response.status_code == 404 and
                    payload not in response.text
                )
                
                self._record_test_result(
                    f'xss_protection_test_{i}', success, duration, response_time, 
                    response.status_code,
                    additional_metrics={'xss_payload': payload}
                )

                if not success:
                    all_success = False

            return all_success

        except Exception as e:
            self._record_test_result(
                'xss_protection', False, 0, error_message=str(e)
            )
            return False

    def test_rate_limiting(self) -> bool:
        """Test rate limiting protection"""
        try:
            # Make rapid requests to trigger rate limiting
            responses = []
            for i in range(100):
                try:
                    response, _ = self._make_request('GET', '/api/ai/health')
                    responses.append(response.status_code)
                except:
                    responses.append(500)  # Connection error due to rate limiting

            # Should see some 429 (Too Many Requests) or connection errors
            rate_limited_responses = sum(1 for code in responses if code in [429, 500])
            success = rate_limited_responses > 0  # Some rate limiting should occur

            self._record_test_result(
                'rate_limiting', success, 0, None,
                additional_metrics={
                    'total_requests': len(responses),
                    'rate_limited_count': rate_limited_responses,
                    'status_codes': responses[:10]  # First 10 for analysis
                }
            )
            return success

        except Exception as e:
            self._record_test_result(
                'rate_limiting', False, 0, error_message=str(e)
            )
            return False

    # ==========================================
    # COMPREHENSIVE TEST EXECUTION
    # ==========================================

    def run_all_tests(self) -> AIServiceTestReport:
        """Execute all AI service tests and generate comprehensive report"""
        logger.info("Starting comprehensive AI service testing...")
        
        test_methods = [
            # Health checks
            self.test_ai_health_check,
            self.test_ai_health_check_under_load,
            
            # Agent endpoints
            self.test_list_ai_agents,
            self.test_get_specific_ai_agent,
            self.test_get_nonexistent_agent,
            
            # Move generation
            self.test_ai_move_generation,
            self.test_ai_move_generation_all_agents,
            self.test_ai_move_invalid_input,
            
            # Customization
            self.test_ai_agent_customization,
            self.test_ai_customization_invalid_input,
            
            # Training
            self.test_ai_training_start,
            self.test_ai_training_status,
            self.test_ai_training_invalid_input,
            
            # Additional endpoints
            self.test_ai_leaderboard,
            self.test_create_custom_agent,
            self.test_agent_challenge,
            self.test_ai_vs_ai_demo,
            
            # Error handling
            self.test_error_handling_route,
            self.test_malformed_json_handling,
            
            # Performance tests
            self.test_concurrent_move_requests,
            self.test_response_time_consistency,
            
            # Security tests
            self.test_sql_injection_protection,
            self.test_xss_protection,
            self.test_rate_limiting
        ]

        for test_method in test_methods:
            try:
                logger.info(f"Running {test_method.__name__}...")
                test_method()
            except Exception as e:
                logger.error(f"Test {test_method.__name__} failed with exception: {e}")

        # Generate comprehensive report
        return self.generate_report()

    def generate_report(self) -> AIServiceTestReport:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result.success)
        failed_tests = total_tests - passed_tests
        success_rate = passed_tests / total_tests if total_tests > 0 else 0

        total_duration = (time.time() - self.start_time) * 1000
        
        successful_results = [r for r in self.test_results if r.success and r.response_time_ms]
        avg_response_time = statistics.mean([r.response_time_ms for r in successful_results]) if successful_results else 0

        # Performance metrics
        performance_metrics = {
            'fastest_response': min([r.response_time_ms for r in successful_results]) if successful_results else 0,
            'slowest_response': max([r.response_time_ms for r in successful_results]) if successful_results else 0,
            'avg_response_time': avg_response_time,
            'total_requests_made': sum(r.additional_metrics.get('total_requests', 1) for r in self.test_results),
            'memory_usage_peak': max([r.memory_usage_mb for r in self.test_results if r.memory_usage_mb]) if self.test_results else 0
        }

        # Endpoint coverage
        endpoints_tested = {
            '/api/ai/health': any('health' in r.test_name for r in self.test_results),
            '/api/ai/agents': any('agents' in r.test_name for r in self.test_results),
            '/api/ai/move': any('move' in r.test_name for r in self.test_results),
            '/api/ai/customize': any('customiz' in r.test_name for r in self.test_results),
            '/api/ai/train': any('train' in r.test_name for r in self.test_results),
            '/api/ai/leaderboard': any('leaderboard' in r.test_name for r in self.test_results),
            '/api/ai/demo': any('demo' in r.test_name for r in self.test_results)
        }

        # Error scenarios tested
        error_scenarios = [
            r.test_name for r in self.test_results 
            if any(keyword in r.test_name for keyword in ['invalid', 'error', 'malformed', 'nonexistent'])
        ]

        # Security tests
        security_tests = [r for r in self.test_results if any(keyword in r.test_name for keyword in ['security', 'injection', 'xss', 'rate'])]
        security_passed = sum(1 for r in security_tests if r.success)

        # Recommendations
        recommendations = []
        if success_rate < 0.95:
            recommendations.append("Improve overall service reliability - success rate below 95%")
        if avg_response_time > TEST_CONFIG['PERFORMANCE_THRESHOLD_MS']:
            recommendations.append(f"Optimize response times - average {avg_response_time:.2f}ms exceeds {TEST_CONFIG['PERFORMANCE_THRESHOLD_MS']}ms threshold")
        if security_passed < len(security_tests):
            recommendations.append("Address security vulnerabilities found in testing")
        if performance_metrics['memory_usage_peak'] > TEST_CONFIG['MEMORY_THRESHOLD_MB']:
            recommendations.append("Optimize memory usage - peak usage exceeds threshold")

        return AIServiceTestReport(
            total_tests=total_tests,
            passed_tests=passed_tests,
            failed_tests=failed_tests,
            success_rate=success_rate,
            total_duration_ms=total_duration,
            average_response_time_ms=avg_response_time,
            performance_metrics=performance_metrics,
            endpoint_coverage=endpoints_tested,
            error_scenarios_tested=error_scenarios,
            security_tests_passed=security_passed,
            recommendations=recommendations
        )

def main():
    """Main execution function"""
    logger.info("=== AI Service Comprehensive Testing Suite ===")
    logger.info(f"Target URL: {TEST_CONFIG['BASE_URL']}")
    logger.info(f"Test Configuration: {TEST_CONFIG}")
    
    tester = AIServiceTester()
    
    try:
        # Run all tests
        report = tester.run_all_tests()
        
        # Print comprehensive report
        logger.info("\n" + "="*80)
        logger.info("COMPREHENSIVE AI SERVICE TEST REPORT")
        logger.info("="*80)
        logger.info(f"Total Tests: {report.total_tests}")
        logger.info(f"Passed: {report.passed_tests}")
        logger.info(f"Failed: {report.failed_tests}")
        logger.info(f"Success Rate: {report.success_rate:.1%}")
        logger.info(f"Total Duration: {report.total_duration_ms:.2f}ms")
        logger.info(f"Average Response Time: {report.average_response_time_ms:.2f}ms")
        
        logger.info("\nPerformance Metrics:")
        for metric, value in report.performance_metrics.items():
            logger.info(f"  {metric}: {value}")
        
        logger.info("\nEndpoint Coverage:")
        for endpoint, tested in report.endpoint_coverage.items():
            status = "✓" if tested else "✗"
            logger.info(f"  {status} {endpoint}")
        
        logger.info(f"\nError Scenarios Tested: {len(report.error_scenarios_tested)}")
        logger.info(f"Security Tests Passed: {report.security_tests_passed}")
        
        if report.recommendations:
            logger.info("\nRecommendations:")
            for recommendation in report.recommendations:
                logger.info(f"  • {recommendation}")
        
        # Save detailed report
        report_file = f"ai_service_test_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump(asdict(report), f, indent=2)
        logger.info(f"\nDetailed report saved to: {report_file}")
        
        # Exit with appropriate code
        if report.success_rate >= 0.9:
            logger.info("\n✅ AI Service testing completed successfully!")
            return 0
        else:
            logger.error(f"\n❌ AI Service testing failed - success rate {report.success_rate:.1%} below 90%")
            return 1
            
    except Exception as e:
        logger.error(f"\nTesting failed with error: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
