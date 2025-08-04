import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for Nen Platform
const loginFailures = new Rate('login_failures');
const gameSessionDuration = new Trend('game_session_duration');
const webSocketConnections = new Counter('websocket_connections');
const blockchainTransactions = new Counter('blockchain_transactions');

// Environment configuration - externalized values for best practices
if (!__ENV.BASE_URL && !__ENV.DEFAULT_BASE_URL) {
  throw new Error('BASE_URL or DEFAULT_BASE_URL must be set in environment variables.');
}

// best practices - validate all required environment variables
const requiredEnvVars = ['API_VERSION', 'TEST_DURATION', 'MAX_VUS', 'RAMP_UP_DURATION'];
const missingVars = requiredEnvVars.filter(varName => !__ENV[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const BASE_URL = __ENV.BASE_URL || __ENV.DEFAULT_BASE_URL;
const API_VERSION = __ENV.API_VERSION;
const TEST_DURATION = __ENV.TEST_DURATION;
const MAX_VUS = parseInt(__ENV.MAX_VUS);
const RAMP_UP_DURATION = __ENV.RAMP_UP_DURATION;

export let options = {
  scenarios: {
    // Scenario 1: API Load Testing
    api_load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: RAMP_UP_DURATION, target: Math.floor(MAX_VUS * 0.3) }, // Ramp up to 30% of max VUs
        { duration: TEST_DURATION, target: Math.floor(MAX_VUS * 0.5) }, // Stay at 50% for main duration
        { duration: '1m', target: Math.floor(MAX_VUS * 0.8) }, // Peak load
        { duration: '30s', target: 0 }, // Ramp down
      ],
    },

    // Scenario 2: Gaming Session Simulation
    gaming_session_stress: {
      executor: 'constant-vus',
      vus: Math.floor(MAX_VUS * 0.2),
      duration: TEST_DURATION,
      tags: { scenario: 'gaming' },
    },

    // Scenario 3: Blockchain Integration Load
    blockchain_load: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: Math.floor(MAX_VUS * 0.1),
      maxVUs: Math.floor(MAX_VUS * 0.3),
      stages: [
        { duration: '2m', target: 10 },
        { duration: TEST_DURATION, target: 20 },
        { duration: '1m', target: 0 },
      ],
      tags: { scenario: 'blockchain' },
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<' + __ENV.HTTP_REQ_DURATION_P95, 'p(99)<' + __ENV.HTTP_REQ_DURATION_P99], //
    http_req_failed: ['rate<' + __ENV.HTTP_REQ_FAILED_RATE], //
    'http_req_duration{scenario:gaming}': ['p(95)<' + __ENV.GAMING_REQ_DURATION_P95], //
    'http_req_duration{scenario:blockchain}': ['p(95)<' + __ENV.BLOCKCHAIN_REQ_DURATION_P95], //
    login_failures: ['rate<' + __ENV.LOGIN_FAILURE_RATE], //
    game_session_duration: ['p(95)<' + __ENV.GAME_SESSION_DURATION_P95], //
  },
};

// Test data - externalized configuration
const testUsers = JSON.parse(__ENV.TEST_USERS || '[{"username":"user1","password":"pass1"},{"username":"user2","password":"pass2"},{"username":"user3","password":"pass3"}]');

// Helper functions
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function performLogin() {
  const user = getRandomUser();
  const loginPayload = {
    username: user.username,
    password: user.password,
  };

  const loginRes = http.post(\`\${BASE_URL}/api/auth/login\`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== null,
  });

  loginFailures.add(!loginSuccess);

  return loginSuccess ? loginRes.json('token') : null;
}

function testHealthEndpoint() {
  const res = http.get(\`\${BASE_URL}/api/health\`);
  check(res, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 500ms': (r) => r.timings.duration < 500,
  });
}

function testGameEndpoints(token) {
  if (!token) return;

  const headers = {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  };

  // Test game list endpoint
  const gamesRes = http.get(\`\${BASE_URL}/api/games\`, { headers });
  check(gamesRes, {
    'games list status is 200': (r) => r.status === 200,
    'games response has data': (r) => r.json('games') !== undefined,
  });

  // Test create game session
  const createGamePayload = {
    gameType: 'gungi',
    mode: 'ai',
    difficulty: 'medium',
  };

  const sessionStart = Date.now();
  const createGameRes = http.post(\`\${BASE_URL}/api/games/create\`, JSON.stringify(createGamePayload), { headers });
  const sessionEnd = Date.now();

  const sessionCreated = check(createGameRes, {
    'create game status is 201': (r) => r.status === 201,
    'create game has session id': (r) => r.json('sessionId') !== null,
  });

  if (sessionCreated) {
    gameSessionDuration.add(sessionEnd - sessionStart);
  }
}

function testBlockchainEndpoints(token) {
  if (!token) return;

  const headers = {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  };

  // Test wallet balance
  const balanceRes = http.get(\`\${BASE_URL}/api/blockchain/balance\`, { headers });
  check(balanceRes, {
    'balance status is 200': (r) => r.status === 200,
    'balance has amount': (r) => r.json('balance') !== undefined,
  });

  // Test transaction history
  const historyRes = http.get(\`\${BASE_URL}/api/blockchain/transactions\`, { headers });
  check(historyRes, {
    'transaction history status is 200': (r) => r.status === 200,
    'history is array': (r) => Array.isArray(r.json('transactions')),
  });

  blockchainTransactions.add(1);
}

function testMetricsEndpoint() {
  const res = http.get(\`\${BASE_URL}/api/metrics\`);
  check(res, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics response time < 1s': (r) => r.timings.duration < 1000,
  });
}

// Main test function
export default function () {
  // Always test health endpoint
  testHealthEndpoint();

  // Scenario-specific logic
  const scenario = __ITER % 3;

  switch (scenario) {
    case 0:
      // API-focused testing
      const token1 = performLogin();
      testGameEndpoints(token1);
      testMetricsEndpoint();
      break;

    case 1:
      // Gaming session simulation
      const token2 = performLogin();
      testGameEndpoints(token2);
      // Simulate longer gaming session
      sleep(Math.random() * 3 + 2); // 2-5 seconds
      break;

    case 2:
      // Blockchain-focused testing
      const token3 = performLogin();
      testBlockchainEndpoints(token3);
      break;
  }

  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Starting Nen Platform stress test...');
  console.log(\`Base URL: \${BASE_URL}\`);
  console.log(\`Max VUs: \${MAX_VUS}\`);
  console.log(\`Test Duration: \${TEST_DURATION}\`);

  // Test base connectivity
  const res = http.get(\`\${BASE_URL}/api/health\`);
  if (res.status !== 200) {
    throw new Error(\`API not available at \${BASE_URL}. Status: \${res.status}\`);
  }

  return { baseUrl: BASE_URL };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Nen Platform stress test completed.');
  console.log(\`Tested against: \${data.baseUrl}\`);
}
