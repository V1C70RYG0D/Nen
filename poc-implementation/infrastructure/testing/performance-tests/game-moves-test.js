/**
 * Game Moves Performance Test for Nen Platform POC
 * Phase 4: Production Readiness & Advanced Demo
 *
 * Focuses specifically on game move latency with MagicBlock integration
 * Target: <50ms for real-time gameplay experience
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for game performance
const gameMoveLatency = new Trend('game_move_latency');
const magicblockLatency = new Trend('magicblock_latency');
const wsConnectionTime = new Trend('ws_connection_time');
const moveValidationTime = new Trend('move_validation_time');
const errorRate = new Rate('game_error_rate');
const movesProcessed = new Counter('moves_processed');

export const options = {
  scenarios: {
    // Real-time game move simulation
    realtime_moves: {
      executor: 'constant-vus',
      vus: 50,
      duration: '3m'
    },

    // Stress test for concurrent games
    concurrent_games: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 25 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 }
      ]
    }
  },

  thresholds: {
    // Strict latency requirements for real-time gaming
    'game_move_latency': [
      'p(90)<50',   // 90% under 50ms
      'p(95)<75',   // 95% under 75ms
      'p(99)<100'  // 99% under 100ms
    ],
    'magicblock_latency': ['p(95)<50'],
    'move_validation_time': ['p(95)<25'],
    'game_error_rate': ['rate<0.005'], // Less than 0.5% errors
    'http_req_duration': ['p(95)<50']
  }
};

const BASE_URL = __ENV.API_BASE_URL || `http://${__ENV.API_HOST || 'localhost'}:${__ENV.PORT || '5001'}`;
const WS_URL = __ENV.WS_URL || `ws://${__ENV.API_HOST || 'localhost'}:${__ENV.PORT || '5001'}`;

// Gungi game positions for testing
const testMoves = [
  {
    from_pos: { x: 0, y: 6, level: 0 },
    to_pos: { x: 0, y: 5, level: 0 },
    piece_type: 'pawn',
    player: 1
  },
  {
    from_pos: { x: 1, y: 6, level: 0 },
    to_pos: { x: 1, y: 5, level: 0 },
    piece_type: 'pawn',
    player: 1
  },
  {
    from_pos: { x: 2, y: 6, level: 0 },
    to_pos: { x: 2, y: 4, level: 0 },
    piece_type: 'pawn',
    player: 1
  },
  {
    from_pos: { x: 4, y: 7, level: 0 },
    to_pos: { x: 4, y: 5, level: 0 },
    piece_type: 'general',
    player: 1
  }
];

const aiAgents = [
  {
    agent_id: 'aggressive-ai',
    skill_level: 7,
    personality: 'aggressive'
  },
  {
    agent_id: 'defensive-ai',
    skill_level: 6,
    personality: 'defensive'
  },
  {
    agent_id: 'balanced-ai',
    skill_level: 8,
    personality: 'balanced'
  }
];

export function setup() {
  console.log('🎮 Starting Game Move Performance Tests');
  console.log('🎯 Target: <50ms move latency with MagicBlock');

  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'Service healthy': (r) => r.status === 200
  });

  return {
    baseUrl: BASE_URL,
    wsUrl: WS_URL
  };
}

export default function (data) {
  const scenario = __ENV.K6_SCENARIO;

  if (scenario === 'realtime_moves' || !scenario) {
    testRealtimeGameMoves(data);
  } else if (scenario === 'concurrent_games') {
    testConcurrentGames(data);
  }
}

/**
 * Test real-time game move performance
 */
function testRealtimeGameMoves(data) {
  // Create authenticated session
  const authRes = http.post(`${data.baseUrl}/api/auth/login`, {
    wallet_address: generateTestWallet()
  });

  if (!check(authRes, { 'Auth success': (r) => r.status === 200 })) {
    errorRate.add(1);
    return;
  }

  const token = authRes.json('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Create game session with MagicBlock
  const sessionStart = Date.now();
  const sessionRes = http.post(`${data.baseUrl}/api/game/create-session`, {
    game_type: 'ai_vs_ai',
    magicblock_enabled: true,
    agents: {
      agent1: aiAgents[0],
      agent2: aiAgents[1]
    }
  }, { headers });

  if (!check(sessionRes, { 'Session created': (r) => r.status === 200 })) {
    errorRate.add(1);
    return;
  }

  const sessionId = sessionRes.json('session.id');

  // Test WebSocket connection for real-time updates
  const wsStart = Date.now();
  const wsUrl = `${data.wsUrl}/socket.io/?session_id=${sessionId}&token=${token}`;

  const wsRes = ws.connect(wsUrl, null, function (socket) {
    const wsConnectTime = Date.now() - wsStart;
    wsConnectionTime.add(wsConnectTime);

    socket.on('open', function () {
      console.log('🔌 WebSocket connected');
    });

    socket.on('game_move', function (message) {
      const moveData = JSON.parse(message);
      console.log('📨 Received move:', moveData.move);
    });

    // Simulate multiple game moves
    for (let i = 0; i < 5; i++) {
      testSingleMove(data.baseUrl, sessionId, headers, i);
      sleep(0.1); // Small delay between moves
    }

    socket.close();
  });

  check(wsRes, { 'WebSocket connection success': (r) => r && r.status === 101 });
}

/**
 * Test a single game move performance
 */
function testSingleMove(baseUrl, sessionId, headers, moveIndex) {
  const move = testMoves[moveIndex % testMoves.length];

  // Generate AI move
  const aiMoveStart = Date.now();
  const aiMoveRes = http.post(`${baseUrl}/api/ai/generate-move`, {
    session_id: sessionId,
    board_state: generateTestBoardState(moveIndex),
    agent_config: aiAgents[moveIndex % aiAgents.length],
    magicblock_session: true
  }, { headers });
  const aiMoveTime = Date.now() - aiMoveStart;

  const aiMoveSuccess = check(aiMoveRes, {
    'AI move generated': (r) => r.status === 200,
    'AI move <50ms': (r) => r.timings.duration < 50,
    'Valid move': (r) => r.json('move') !== null
  });

  gameMoveLatency.add(aiMoveTime);

  if (!aiMoveSuccess) {
    errorRate.add(1);
    return;
  }

  // Submit move to MagicBlock
  const magicblockStart = Date.now();
  const submitRes = http.post(`${baseUrl}/api/game/submit-move`, {
    session_id: sessionId,
    move: aiMoveRes.json('move'),
    magicblock_optimized: true
  }, { headers });
  const magicblockTime = Date.now() - magicblockStart;

  const submitSuccess = check(submitRes, {
    'Move submitted': (r) => r.status === 200,
    'MagicBlock <50ms': (r) => r.timings.duration < 50,
    'Move confirmed': (r) => r.json('confirmed') === true
  });

  magicblockLatency.add(magicblockTime);

  if (submitSuccess) {
    movesProcessed.add(1);
  } else {
    errorRate.add(1);
  }

  // Test move validation
  const validationStart = Date.now();
  const validationRes = http.get(`${baseUrl}/api/game/validate-move/${sessionId}`, {
    headers
  });
  const validationTime = Date.now() - validationStart;

  const validationSuccess = check(validationRes, {
    'Validation success': (r) => r.status === 200,
    'Validation <25ms': (r) => r.timings.duration < 25
  });

  moveValidationTime.add(validationTime);

  if (!validationSuccess) {
    errorRate.add(1);
  }
}

/**
 * Test concurrent games for scalability
 */
function testConcurrentGames(data) {
  // Simulate multiple concurrent games
  const gameCount = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < gameCount; i++) {
    setTimeout(() => {
      testRealtimeGameMoves(data);
    }, Math.random() * 1000); // Stagger game starts
  }
}

/**
 * Helper functions
 */
function generateTestWallet() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateTestBoardState(moveNumber) {
  return {
    pieces: [
      {
        id: `piece_${moveNumber}`,
        type: 'pawn',
        player: 1,
        position: { x: 0, y: 6, level: 0 }
      }
      // Add more pieces for realistic board state
    ],
    current_turn: (moveNumber % 2) + 1,
    move_number: moveNumber,
    game_status: 'active'
  };
}

export function teardown(data) {
  console.log('🏁 Game move performance tests completed');
  console.log('📊 Performance Targets:');
  console.log('   ✅ Game moves: <50ms (p95)');
  console.log('   ✅ MagicBlock integration: <50ms');
  console.log('   ✅ Move validation: <25ms');
  console.log('   ✅ Error rate: <0.5%');
}
