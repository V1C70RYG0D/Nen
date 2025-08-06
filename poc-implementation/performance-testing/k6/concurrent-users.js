import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');
export let wsConnectionTime = new Trend('ws_connection_time');
export let concurrentConnections = new Gauge('concurrent_connections');
export let gameCreationRate = new Rate('game_creation_success');
export let requestCounter = new Counter('requests_total');
export let activeGamesGauge = new Gauge('active_games');

// Get target user count from environment variable
const TARGET_USERS = parseInt(__ENV.TARGET_USERS || '10');
const TEST_DURATION = __ENV.TEST_DURATION || '5m';

export let options = {
  stages: [
    { duration: '30s', target: Math.ceil(TARGET_USERS * 0.1) }, // 10% ramp up
    { duration: '1m', target: Math.ceil(TARGET_USERS * 0.5) },  // 50% users
    { duration: '30s', target: TARGET_USERS },                   // Full load
    { duration: TEST_DURATION, target: TARGET_USERS },          // Sustained load
    { duration: '1m', target: Math.ceil(TARGET_USERS * 0.5) },  // Scale down to 50%
    { duration: '30s', target: 0 }                             // Complete ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    ws_connecting: ['avg<2000'],
    errors: ['rate<0.1'],
    response_time: ['avg<500', 'p(95)<1500'],
    game_creation_success: ['rate>0.95'],
    concurrent_connections: [`value<${TARGET_USERS + 10}`]
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';
const AI_URL = __ENV.AI_URL || 'http://localhost:5000';

export function setup() {
  console.log(`Starting concurrent users test with ${TARGET_USERS} target users`);
  
  // Health check before starting
  let healthResponse = http.get(`${BASE_URL}/api/health`);
  if (healthResponse.status !== 200) {
    throw new Error('Backend health check failed');
  }
  
  return { targetUsers: TARGET_USERS };
}

export default function (data) {
  let startTime = Date.now();
  let userId = `user_${__VU}_${__ITER}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Track active connections
  concurrentConnections.add(1);

  try {
    // 1. User registration/authentication
    let authPayload = JSON.stringify({
      username: userId,
      email: `${userId}@loadtest.com`,
      password: 'testpass123'
    });

    let authHeaders = {
      'Content-Type': 'application/json',
    };

    let authStart = Date.now();
    let authResponse = http.post(`${BASE_URL}/api/auth/register`, authPayload, { 
      headers: authHeaders,
      timeout: '30s'
    });
    
    responseTime.add(Date.now() - authStart);
    requestCounter.add(1);
    
    let isAuthSuccess = [201, 409].includes(authResponse.status);
    errorRate.add(!isAuthSuccess);
    
    check(authResponse, {
      'auth status is 201 or 409': (r) => isAuthSuccess,
      'auth response time < 1s': (r) => r.timings.duration < 1000,
    });

    let token;
    if (authResponse.status === 201) {
      token = JSON.parse(authResponse.body).token;
    } else if (authResponse.status === 409) {
      // User exists, try login
      let loginPayload = JSON.stringify({
        username: userId,
        password: 'testpass123'
      });
      
      let loginResponse = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { 
        headers: authHeaders,
        timeout: '30s'
      });
      
      requestCounter.add(1);
      responseTime.add(loginResponse.timings.duration);
      
      if (loginResponse.status === 200) {
        token = JSON.parse(loginResponse.body).token;
      }
    }

    if (!token) {
      console.log(`Authentication failed for ${userId}`);
      errorRate.add(1);
      return;
    }

    let authenticatedHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Create multiple game sessions to simulate real load
    let gameIds = [];
    for (let gameIndex = 0; gameIndex < Math.min(3, Math.ceil(TARGET_USERS / 50)); gameIndex++) {
      let gamePayload = JSON.stringify({
        gameType: 'gungi',
        timeControl: '10+5',
        isPublic: gameIndex % 2 === 0, // Mix of public and private games
        difficulty: ['easy', 'medium', 'hard'][gameIndex % 3]
      });

      let gameStart = Date.now();
      let gameResponse = http.post(`${BASE_URL}/api/games`, gamePayload, { 
        headers: authenticatedHeaders,
        timeout: '30s'
      });
      
      responseTime.add(Date.now() - gameStart);
      requestCounter.add(1);
      
      let isGameSuccess = gameResponse.status === 201;
      gameCreationRate.add(isGameSuccess);
      errorRate.add(!isGameSuccess);
      
      check(gameResponse, {
        [`game ${gameIndex} creation status is 201`]: (r) => r.status === 201,
        [`game ${gameIndex} creation response time < 1s`]: (r) => r.timings.duration < 1000,
      });

      if (isGameSuccess) {
        let gameId = JSON.parse(gameResponse.body).gameId;
        gameIds.push(gameId);
        activeGamesGauge.add(1);
      }

      sleep(0.1); // Small delay between game creations
    }

    if (gameIds.length === 0) {
      console.log(`No games created for ${userId}`);
      return;
    }

    // 3. WebSocket connections for real-time gameplay
    let wsPromises = [];
    gameIds.forEach((gameId, index) => {
      if (index < 2) { // Limit to 2 concurrent WS connections per user
        let wsConnectStart = Date.now();
        
        let wsResponse = ws.connect(`${WS_URL}/socket.io/?EIO=4&transport=websocket&gameId=${gameId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: '30s'
        }, function (socket) {
          wsConnectionTime.add(Date.now() - wsConnectStart);

          socket.on('open', () => {
            // Join game room
            socket.send(`42["join_game","${gameId}"]`);
            
            // Simulate active gameplay
            let moveCount = 0;
            let moveInterval = setInterval(() => {
              if (moveCount < 10) { // Limit moves per game
                let movePayload = {
                  gameId: gameId,
                  move: {
                    from: `${String.fromCharCode(97 + (moveCount % 8))}${(moveCount % 8) + 1}`,
                    to: `${String.fromCharCode(97 + ((moveCount + 2) % 8))}${((moveCount + 2) % 8) + 1}`,
                    piece: ['pawn', 'rook', 'knight', 'bishop'][moveCount % 4],
                    timestamp: Date.now()
                  }
                };
                
                socket.send(`42["make_move",${JSON.stringify(movePayload)}]`);
                requestCounter.add(1);
                moveCount++;
              } else {
                clearInterval(moveInterval);
              }
            }, 2000 + Math.random() * 3000); // Random interval between 2-5 seconds

          });

          socket.on('message', (data) => {
            if (data.includes('move_made')) {
              responseTime.add(Date.now() - startTime);
            }
            if (data.includes('error')) {
              errorRate.add(1);
            }
          });

          socket.on('error', (e) => {
            console.log(`WebSocket error for ${userId}:`, e);
            errorRate.add(1);
          });

          sleep(15 + Math.random() * 10); // Keep connection open for 15-25 seconds
        });

        check(wsResponse, {
          [`WebSocket ${index} connection successful`]: (r) => r && r.status === 101,
        });
      }
    });

    // 4. API stress testing - multiple simultaneous requests
    let apiPromises = [];
    
    // Game state requests
    gameIds.forEach((gameId, index) => {
      sleep(0.1 * index); // Stagger requests slightly
      
      let stateStart = Date.now();
      let stateResponse = http.get(`${BASE_URL}/api/games/${gameId}`, { 
        headers: authenticatedHeaders,
        timeout: '30s'
      });
      
      responseTime.add(Date.now() - stateStart);
      requestCounter.add(1);
      errorRate.add(stateResponse.status !== 200);
      
      check(stateResponse, {
        [`game ${index} state retrieval status is 200`]: (r) => r.status === 200,
        [`game ${index} state response time < 500ms`]: (r) => r.timings.duration < 500,
      });
    });

    // 5. AI service load testing
    if (Math.random() < 0.7) { // 70% of users request AI moves
      let aiGameId = gameIds[Math.floor(Math.random() * gameIds.length)];
      let aiPayload = JSON.stringify({
        gameState: {
          board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
          turn: Math.random() < 0.5 ? 'white' : 'black',
          gameId: aiGameId,
          moveHistory: [],
          difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)]
        }
      });

      let aiStart = Date.now();
      let aiResponse = http.post(`${AI_URL}/api/move`, aiPayload, { 
        headers: { 'Content-Type': 'application/json' },
        timeout: '10s'
      });
      
      let aiDuration = Date.now() - aiStart;
      requestCounter.add(1);
      errorRate.add(aiResponse.status !== 200);
      
      check(aiResponse, {
        'AI move generation status is 200': (r) => r.status === 200,
        'AI move generation response time < 5s': (r) => r.timings.duration < 5000,
        'AI move generation response time < 2s (optimal)': (r) => r.timings.duration < 2000,
      });
    }

    // 6. Database stress - leaderboard and analytics
    if (Math.random() < 0.3) { // 30% of users check leaderboards
      let leaderboardStart = Date.now();
      let leaderboardResponse = http.get(`${BASE_URL}/api/leaderboard?limit=50`, { 
        headers: authenticatedHeaders,
        timeout: '30s'
      });
      
      responseTime.add(Date.now() - leaderboardStart);
      requestCounter.add(1);
      errorRate.add(leaderboardResponse.status !== 200);
      
      check(leaderboardResponse, {
        'leaderboard status is 200': (r) => r.status === 200,
        'leaderboard response time < 1s': (r) => r.timings.duration < 1000,
      });
    }

    // 7. User profile updates (simulate active users)
    if (Math.random() < 0.2) { // 20% of users update profile
      let profilePayload = JSON.stringify({
        displayName: `LoadTest User ${__VU}`,
        preferences: {
          theme: Math.random() < 0.5 ? 'dark' : 'light',
          soundEnabled: Math.random() < 0.7
        }
      });

      let profileResponse = http.put(`${BASE_URL}/api/users/profile`, profilePayload, { 
        headers: authenticatedHeaders,
        timeout: '30s'
      });
      
      requestCounter.add(1);
      responseTime.add(profileResponse.timings.duration);
      errorRate.add(profileResponse.status !== 200);
    }

    // Random sleep to simulate realistic user behavior
    sleep(1 + Math.random() * 3);

  } catch (error) {
    console.log(`Error in test execution for ${userId}:`, error);
    errorRate.add(1);
  } finally {
    concurrentConnections.add(-1); // Track connection cleanup
  }
}

export function teardown(data) {
  console.log(`Concurrent users test completed with ${data.targetUsers} target users`);
  console.log('Performance metrics have been collected');
  
  // Final health check
  let finalHealth = http.get(`${BASE_URL}/api/health`);
  console.log(`Final health check status: ${finalHealth.status}`);
}
