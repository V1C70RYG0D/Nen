import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');
export let wsConnectionTime = new Trend('ws_connection_time');
export let moveGenerationTime = new Trend('move_generation_time');
export let requestCounter = new Counter('requests_total');

// Test configuration
export let options = {
  stages: [
    { duration: '30s', target: 1 }, // Single user for 30 seconds
    { duration: '1m', target: 1 },  // Steady state for 1 minute
    { duration: '30s', target: 0 }  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    ws_connecting: ['avg<1000'],
    errors: ['rate<0.05'],
    response_time: ['avg<200', 'p(95)<500'],
    move_generation_time: ['avg<1000', 'p(95)<2000']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';
const AI_URL = __ENV.AI_URL || 'http://localhost:5000';

export default function () {
  let startTime = Date.now();
  
  // 1. Health check
  let healthCheck = http.get(`${BASE_URL}/api/health`);
  check(healthCheck, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });
  requestCounter.add(1);
  errorRate.add(healthCheck.status !== 200);
  responseTime.add(healthCheck.timings.duration);

  // 2. User authentication
  let authPayload = JSON.stringify({
    username: `testuser_${__VU}_${__ITER}`,
    email: `test${__VU}_${__ITER}@example.com`
  });

  let authHeaders = {
    'Content-Type': 'application/json',
  };

  let authResponse = http.post(`${BASE_URL}/api/auth/register`, authPayload, { headers: authHeaders });
  check(authResponse, {
    'auth status is 201 or 409': (r) => [201, 409].includes(r.status),
    'auth response time < 500ms': (r) => r.timings.duration < 500,
  });
  requestCounter.add(1);
  errorRate.add(![201, 409].includes(authResponse.status));
  responseTime.add(authResponse.timings.duration);

  let token;
  if (authResponse.status === 201) {
    token = JSON.parse(authResponse.body).token;
  } else {
    // Try login if user already exists
    let loginResponse = http.post(`${BASE_URL}/api/auth/login`, authPayload, { headers: authHeaders });
    if (loginResponse.status === 200) {
      token = JSON.parse(loginResponse.body).token;
    }
  }

  if (!token) {
    console.log('Authentication failed, skipping rest of test');
    return;
  }

  let authenticatedHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 3. Create game session
  let gamePayload = JSON.stringify({
    gameType: 'gungi',
    timeControl: '10+5'
  });

  let gameResponse = http.post(`${BASE_URL}/api/games`, gamePayload, { headers: authenticatedHeaders });
  check(gameResponse, {
    'game creation status is 201': (r) => r.status === 201,
    'game creation response time < 300ms': (r) => r.timings.duration < 300,
  });
  requestCounter.add(1);
  errorRate.add(gameResponse.status !== 201);
  responseTime.add(gameResponse.timings.duration);

  if (gameResponse.status !== 201) {
    console.log('Game creation failed, skipping WebSocket test');
    return;
  }

  let gameId = JSON.parse(gameResponse.body).gameId;

  // 4. WebSocket connection and gameplay
  let wsConnectStart = Date.now();
  let wsResponse = ws.connect(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }, function (socket) {
    wsConnectionTime.add(Date.now() - wsConnectStart);

    socket.on('open', () => {
      // Join game room
      socket.send(`42["join_game","${gameId}"]`);
      
      // Simulate gameplay moves
      for (let i = 0; i < 5; i++) {
        sleep(1);
        
        // Make a move
        let movePayload = {
          gameId: gameId,
          move: {
            from: `${String.fromCharCode(97 + (i % 8))}${(i % 8) + 1}`,
            to: `${String.fromCharCode(97 + ((i + 1) % 8))}${((i + 1) % 8) + 1}`,
            piece: 'pawn'
          }
        };
        
        socket.send(`42["make_move",${JSON.stringify(movePayload)}]`);
        requestCounter.add(1);
      }
    });

    socket.on('message', (data) => {
      if (data.includes('move_made')) {
        // Measure move processing time
        responseTime.add(Date.now() - startTime);
      }
    });

    socket.on('error', (e) => {
      console.log('WebSocket error:', e);
      errorRate.add(1);
    });

    sleep(10); // Keep connection open for 10 seconds
  });

  check(wsResponse, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });

  // 5. Test AI move generation
  let aiMoveStart = Date.now();
  let aiPayload = JSON.stringify({
    gameState: {
      board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
      turn: 'white',
      gameId: gameId
    },
    difficulty: 'medium'
  });

  let aiResponse = http.post(`${AI_URL}/api/move`, aiPayload, { headers: { 'Content-Type': 'application/json' } });
  check(aiResponse, {
    'AI move generation status is 200': (r) => r.status === 200,
    'AI move generation response time < 2s': (r) => r.timings.duration < 2000,
  });
  requestCounter.add(1);
  errorRate.add(aiResponse.status !== 200);
  moveGenerationTime.add(Date.now() - aiMoveStart);

  // 6. Get game state
  let stateResponse = http.get(`${BASE_URL}/api/games/${gameId}`, { headers: authenticatedHeaders });
  check(stateResponse, {
    'game state retrieval status is 200': (r) => r.status === 200,
    'game state response time < 200ms': (r) => r.timings.duration < 200,
  });
  requestCounter.add(1);
  errorRate.add(stateResponse.status !== 200);
  responseTime.add(stateResponse.timings.duration);

  // 7. Analytics endpoint
  let analyticsResponse = http.get(`${BASE_URL}/api/analytics/games/${gameId}`, { headers: authenticatedHeaders });
  check(analyticsResponse, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response time < 300ms': (r) => r.timings.duration < 300,
  });
  requestCounter.add(1);
  errorRate.add(analyticsResponse.status !== 200);
  responseTime.add(analyticsResponse.timings.duration);

  sleep(1);
}

export function teardown(data) {
  console.log('Single user gameplay test completed');
  console.log('Summary metrics will be generated in the reports directory');
}
