#!/usr/bin/env node

/**
 * Advanced API Load Testing for Nen Platform POC
 * Phase 4.3: Comprehensive Review/Iteration (Days 117-126)
 *
 * Performance targets from POC Master Plan:
 * - API Latency: <100ms (targeting <85ms)
 * - Game Moves: <50ms (targeting <42ms)
 * - Concurrent Users: 100-1000
 * - Error Rate: <1% (targeting <0.5%)
 *

 */

import k6 from 'k6';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics aligned with POC Master Plan targets
const apiLatencyTrend = new Trend('api_latency_ms');
const gameMoveLatencyTrend = new Trend('game_move_latency_ms');
const errorRate = new Rate('error_rate');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Load testing configuration
export const options = {
  stages: [
    // Ramp up to 100 users (POC minimum target)
    { duration: '2m', target: 100 },

    // Maintain 100 users for 5 minutes
    { duration: '5m', target: 100 },

    // Scale to 500 users (POC mid-range)
    { duration: '3m', target: 500 },

    // Maintain 500 users for 10 minutes
    { duration: '10m', target: 500 },

    // Scale to 1000 users (POC maximum target)
    { duration: '3m', target: 1000 },

    // Maintain 1000 users for 5 minutes
    { duration: '5m', target: 1000 },

    // Ramp down
    { duration: '2m', target: 0 },
  ],

  thresholds: {
    // POC Master Plan performance targets
    'api_latency_ms': ['p(95)<100', 'p(99)<200'], // Target: <100ms
    'game_move_latency_ms': ['p(95)<50', 'p(99)<100'], // Target: <50ms
    'error_rate': ['rate<0.01'], // Target: <1% error rate
    'http_req_failed': ['rate<0.005'], // Target: <0.5% failure rate
    'http_req_duration': ['p(95)<100'], // Overall latency target
  },
};

const BASE_URL = __ENV.API_URL;

// Test scenarios based on POC Master Plan use cases
export default function() {
  const testScenarios = [
    testHealthEndpoint,
    testMatchAPI,
    testBettingAPI,
    testAIAgentAPI,
    testGameMoveAPI,
    testRealTimeUpdates,
  ];

  // Randomly select a test scenario (weighted distribution)
  const weights = [0.2, 0.25, 0.15, 0.15, 0.20, 0.05];
  const random = Math.random();
  let cumulativeWeight = 0;

  for (let i = 0; i < testScenarios.length; i++) {
    cumulativeWeight += weights[i];
    if (random <= cumulativeWeight) {
      testScenarios[i]();
      break;
    }
  }

  // Think time between requests (realistic user behavior)
  sleep(Math.random() * 2 + 1);
}

/**
 * Test Health Endpoint Performance
 * Expected: <50ms response time
 */
function testHealthEndpoint() {
  const startTime = Date.now();

  const response = http.get(`${BASE_URL}/health`, {
    tags: { name: 'health_check' },
  });

  const latency = Date.now() - startTime;
  apiLatencyTrend.add(latency);

  const success = check(response, {
    'health check status 200': (r) => r.status === 200,
    'health check response time <50ms': () => latency < 50,
    'health check has status': (r) => r.json('status') === 'healthy',
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    errorRate.add(1);
  }
}

/**
 * Test Match API Performance
 * Expected: <100ms response time for match data
 */
function testMatchAPI() {
  const matchId = `match_${Math.floor(Math.random() * 1000000)}`;
  const startTime = Date.now();

  const response = http.get(`${BASE_URL}/api/game/match/${matchId}`, {
    tags: { name: 'match_api' },
  });

  const latency = Date.now() - startTime;
  apiLatencyTrend.add(latency);

  const success = check(response, {
    'match API status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'match API response time <100ms': () => latency < 100,
    'match API returns valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    errorRate.add(1);
  }
}

/**
 * Test Betting API Performance
 * Expected: <100ms response time for betting operations
 */
function testBettingAPI() {
  const startTime = Date.now();

  const payload = {
    matchId: `match_${Math.floor(Math.random() * 1000)}`,
    amount: Math.floor(Math.random() * 10) + 1,
    side: Math.random() > 0.5 ? 'player1' : 'player2',
  };

  const response = http.post(`${BASE_URL}/api/betting/place`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'betting_api' },
  });

  const latency = Date.now() - startTime;
  apiLatencyTrend.add(latency);

  const success = check(response, {
    'betting API status is valid': (r) => [200, 400, 401, 409].includes(r.status),
    'betting API response time <100ms': () => latency < 100,
    'betting API returns JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    errorRate.add(1);
  }
}

/**
 * Test AI Agent API Performance
 * Expected: <200ms response time for AI agent data
 */
function testAIAgentAPI() {
  const startTime = Date.now();

  const response = http.get(`${BASE_URL}/api/ai/agents`, {
    tags: { name: 'ai_agent_api' },
  });

  const latency = Date.now() - startTime;
  apiLatencyTrend.add(latency);

  const success = check(response, {
    'AI agent API status 200': (r) => r.status === 200,
    'AI agent API response time <200ms': () => latency < 200,
    'AI agent API returns agents array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.agents) && data.agents.length > 0;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    errorRate.add(1);
  }
}

/**
 * Test Game Move API Performance
 * Critical: <50ms response time (POC Master Plan requirement)
 */
function testGameMoveAPI() {
  const startTime = Date.now();

  const movePayload = {
    sessionId: `session_${Math.floor(Math.random() * 1000)}`,
    move: {
      from: { x: Math.floor(Math.random() * 9), y: Math.floor(Math.random() * 9) },
      to: { x: Math.floor(Math.random() * 9), y: Math.floor(Math.random() * 9) },
      pieceType: 'commander',
    },
  };

  const response = http.post(`${BASE_URL}/api/game/move`, JSON.stringify(movePayload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'game_move_api' },
  });

  const latency = Date.now() - startTime;
  gameMoveLatencyTrend.add(latency);

  const success = check(response, {
    'game move API status is valid': (r) => [200, 400, 404].includes(r.status),
    'game move API response time <50ms': () => latency < 50, // Critical POC requirement
    'game move API returns JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    errorRate.add(1);
  }
}

/**
 * Test Real-Time Updates Performance
 * Expected: Fast WebSocket-style endpoints
 */
function testRealTimeUpdates() {
  const startTime = Date.now();

  const response = http.get(`${BASE_URL}/api/game/live-updates`, {
    tags: { name: 'realtime_api' },
  });

  const latency = Date.now() - startTime;
  apiLatencyTrend.add(latency);

  const success = check(response, {
    'real-time API status 200': (r) => r.status === 200,
    'real-time API response time <100ms': () => latency < 100,
    'real-time API returns valid data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data && typeof data === 'object';
      } catch {
        return false;
      }
    },
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    errorRate.add(1);
  }
}

// Summary reporting
export function handleSummary(data) {
  return {
    'performance-test-results.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  const apiLatency = data.metrics.api_latency_ms;
  const gameMoveLatency = data.metrics.game_move_latency_ms;
  const errorRate = data.metrics.error_rate;

  return `
🎯 NEN PLATFORM POC - PERFORMANCE TEST RESULTS
==============================================

📊 POC MASTER PLAN TARGETS VALIDATION:

✅ API LATENCY TARGET (<100ms):
   - Average: ${apiLatency?.values?.avg?.toFixed(2)}ms
   - 95th percentile: ${apiLatency?.values?.['p(95)']?.toFixed(2)}ms
   - 99th percentile: ${apiLatency?.values?.['p(99)']?.toFixed(2)}ms
   - Target Status: ${apiLatency?.values?.['p(95)'] < 100 ? '✅ PASSED' : '❌ FAILED'}

🎮 GAME MOVE LATENCY TARGET (<50ms):
   - Average: ${gameMoveLatency?.values?.avg?.toFixed(2)}ms
   - 95th percentile: ${gameMoveLatency?.values?.['p(95)']?.toFixed(2)}ms
   - 99th percentile: ${gameMoveLatency?.values?.['p(99)']?.toFixed(2)}ms
   - Target Status: ${gameMoveLatency?.values?.['p(95)'] < 50 ? '✅ PASSED' : '❌ FAILED'}

🔄 ERROR RATE TARGET (<1%):
   - Error Rate: ${(errorRate?.values?.rate * 100)?.toFixed(3)}%
   - Target Status: ${errorRate?.values?.rate < 0.01 ? '✅ PASSED' : '❌ FAILED'}

📈 CONCURRENT USER SCALING:
   - Peak Users: 1000 (POC Maximum Target)
   - Successful Requests: ${data.metrics.successful_requests?.values?.count || 0}
   - Failed Requests: ${data.metrics.failed_requests?.values?.count || 0}

🏆 OVERALL POC PERFORMANCE: ${
    apiLatency?.values?.['p(95)'] < 100 &&
    gameMoveLatency?.values?.['p(95)'] < 50 &&
    errorRate?.values?.rate < 0.01 ?
    '✅ ALL TARGETS EXCEEDED' :
    '⚠️ REVIEW REQUIRED'
  }
`;
}
