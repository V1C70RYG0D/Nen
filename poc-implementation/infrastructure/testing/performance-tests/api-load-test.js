/**
 * Performance Tests for Nen Platform POC
 * Phase 4: Production Readiness & Advanced Demo
 *
 * Tests target performance metrics:
 * - <100ms API latency
 * - <50ms game moves via MagicBlock
 * - Geographic optimization
 * - Load testing with concurrent users
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiResponseTime = new Trend('api_response_time');
const gameMoveTime = new Trend('game_move_time');
const errorRate = new Rate('error_rate');

// Test configuration
export const options = {
  scenarios: {
    // API Load Test - Target <100ms
    api_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },   // Ramp up
        { duration: '5m', target: 50 },   // Stay at 50 VUs
        { duration: '2m', target: 100 },  // Ramp to 100 VUs
        { duration: '5m', target: 100 },  // Stay at 100 VUs
        { duration: '2m', target: 0 }    // Ramp down
      ]
    },

    // Game Move Test - Target <50ms
    game_moves: {
      executor: 'constant-vus',
      vus: 25,
      duration: '10m'
    }
  },

  thresholds: {
    // API performance targets
    'http_req_duration{scenario:api_load}': ['p(95)<100'], // 95% under 100ms
    'api_response_time': ['p(95)<100'],

    // Game move performance targets
    'http_req_duration{scenario:game_moves}': ['p(95)<50'], // 95% under 50ms
    'game_move_time': ['p(95)<50'],

    // Error rate targets
    'http_req_failed': ['rate<0.01'], // Less than 1% errors
    'error_rate': ['rate<0.01']
  }
};

const BASE_URL = __ENV.API_BASE_URL || __ENV.API_URL;
const WS_URL = __ENV.WS_URL;

// Test data
const testUsers = [
  { wallet: '4Zw1fXuYuJhWhu9KLEYMhiPEiqcpKd6akw3WRqzNkm4S' },
  { wallet: '7YfB5pWrCqYuPXGF9KLEYMhiPEiqcpKd6akw3WRqzNkm4T' },
  { wallet: '9XvD8qWtEuYjQXHK2MEYMhiPEiqcpKd6akw3WRqzNkm4U' }
];

export function setup() {
  console.log('🚀 Starting Nen Platform Performance Tests');
  console.log('📊 Target: API <100ms, Game Moves <50ms');
  console.log(`🌐 Base URL: ${BASE_URL}`);

  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'Health check passes': (r) => r.status === 200
  });

  return { baseUrl: BASE_URL };
}

export default function (data) {
  const scenario = __ENV.K6_SCENARIO;

  if (scenario === 'api_load' || !scenario) {
    testAPIPerformance(data);
  } else if (scenario === 'game_moves') {
    testGameMovePerformance(data);
  }
}

/**
 * Test API endpoint performance - Target <100ms
 */
function testAPIPerformance(data) {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  // Test user authentication
  const authStart = Date.now();
  const authRes = http.post(`${data.baseUrl}/api/auth/login`, {
    wallet_address: user.wallet
  });
  const authTime = Date.now() - authStart;

  const authSuccess = check(authRes, {
    'Auth API status 200': (r) => r.status === 200,
    'Auth API <100ms': (r) => r.timings.duration < 100
  });

  apiResponseTime.add(authTime);
  errorRate.add(!authSuccess);

  if (!authSuccess) {return;}

  // Test game session creation
  const sessionStart = Date.now();
  const sessionRes = http.post(`${data.baseUrl}/api/game/create-session`, {
    game_type: 'ai_vs_ai',
    betting_enabled: true
  }, {
    headers: {
      'Authorization': `Bearer ${authRes.json('token')}`,
      'Content-Type': 'application/json'
    }
  });
  const sessionTime = Date.now() - sessionStart;

  const sessionSuccess = check(sessionRes, {
    'Session API status 200': (r) => r.status === 200,
    'Session API <100ms': (r) => r.timings.duration < 100
  });

  apiResponseTime.add(sessionTime);
  errorRate.add(!sessionSuccess);

  // Test AI agent listing
  const agentsStart = Date.now();
  const agentsRes = http.get(`${data.baseUrl}/api/ai/agents`, {
    headers: {
      'Authorization': `Bearer ${authRes.json('token')}`
    }
  });
  const agentsTime = Date.now() - agentsStart;

  const agentsSuccess = check(agentsRes, {
    'Agents API status 200': (r) => r.status === 200,
    'Agents API <100ms': (r) => r.timings.duration < 100
  });

  apiResponseTime.add(agentsTime);
  errorRate.add(!agentsSuccess);

  // Test betting pool
  if (sessionSuccess) {
    const sessionId = sessionRes.json('session.id');

    const bettingStart = Date.now();
    const bettingRes = http.get(`${data.baseUrl}/api/betting/pool/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${authRes.json('token')}`
      }
    });
    const bettingTime = Date.now() - bettingStart;

    const bettingSuccess = check(bettingRes, {
      'Betting API status 200': (r) => r.status === 200,
      'Betting API <100ms': (r) => r.timings.duration < 100
    });

    apiResponseTime.add(bettingTime);
    errorRate.add(!bettingSuccess);
  }

  sleep(1);
}

/**
 * Test game move performance - Target <50ms
 */
function testGameMovePerformance(data) {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  // Authenticate first
  const authRes = http.post(`${data.baseUrl}/api/auth/login`, {
    wallet_address: user.wallet
  });

  if (!check(authRes, { 'Auth success': (r) => r.status === 200 })) {
    return;
  }

  // Create a test game session
  const sessionRes = http.post(`${data.baseUrl}/api/game/create-session`, {
    game_type: 'ai_vs_ai',
    magicblock_enabled: true
  }, {
    headers: {
      'Authorization': `Bearer ${authRes.json('token')}`,
      'Content-Type': 'application/json'
    }
  });

  if (!check(sessionRes, { 'Session created': (r) => r.status === 200 })) {
    return;
  }

  const sessionId = sessionRes.json('session.id');

  // Test AI move generation - should be <50ms with MagicBlock
  const moveStart = Date.now();
  const moveRes = http.post(`${data.baseUrl}/api/ai/generate-move`, {
    session_id: sessionId,
    board_state: {
      pieces: [],
      current_turn: 1,
      move_number: 1,
      game_status: 'active'
    },
    agent_config: {
      agent_id: 'test-agent',
      skill_level: 5,
      personality: 'balanced'
    }
  }, {
    headers: {
      'Authorization': `Bearer ${authRes.json('token')}`,
      'Content-Type': 'application/json'
    }
  });
  const moveTime = Date.now() - moveStart;

  const moveSuccess = check(moveRes, {
    'Move API status 200': (r) => r.status === 200,
    'Move API <50ms': (r) => r.timings.duration < 50,
    'Valid move returned': (r) => r.json('move') !== null
  });

  gameMoveTime.add(moveTime);
  errorRate.add(!moveSuccess);

  // Test move submission to MagicBlock
  if (moveSuccess) {
    const submitStart = Date.now();
    const submitRes = http.post(`${data.baseUrl}/api/game/submit-move`, {
      session_id: sessionId,
      move: moveRes.json('move')
    }, {
      headers: {
        'Authorization': `Bearer ${authRes.json('token')}`,
        'Content-Type': 'application/json'
      }
    });
    const submitTime = Date.now() - submitStart;

    const submitSuccess = check(submitRes, {
      'Submit status 200': (r) => r.status === 200,
      'Submit <50ms': (r) => r.timings.duration < 50
    });

    gameMoveTime.add(submitTime);
    errorRate.add(!submitSuccess);
  }

  sleep(0.5);
}

export function teardown(data) {
  console.log('🏁 Performance tests completed');
  console.log('📊 Check results for performance targets:');
  console.log('   - API endpoints: <100ms');
  console.log('   - Game moves: <50ms');
  console.log('   - Error rate: <1%');
}
