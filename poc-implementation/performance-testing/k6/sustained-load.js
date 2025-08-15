import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics for sustained load testing
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');
export let throughput = new Counter('throughput');
export let memoryUsage = new Gauge('memory_usage_estimate');
export let connectionPoolHealth = new Rate('connection_pool_health');
export let databaseResponseTime = new Trend('database_response_time');

const SUSTAINED_USERS = parseInt(__ENV.SUSTAINED_USERS || '50');
const SUSTAINED_DURATION = __ENV.SUSTAINED_DURATION || '30m';

export let options = {
  stages: [
    { duration: '2m', target: SUSTAINED_USERS },     // Ramp up
    { duration: SUSTAINED_DURATION, target: SUSTAINED_USERS }, // Sustained load
    { duration: '2m', target: 0 }                   // Ramp down
  ],
  thresholds: {
    // Stricter thresholds for sustained load
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.05'],
    response_time: ['avg<300', 'p(95)<1000'],
    connection_pool_health: ['rate>0.98'],
    database_response_time: ['avg<200', 'p(95)<500']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';
const AI_URL = __ENV.AI_URL || 'http://localhost:5000';

export function setup() {
  console.log(`Starting sustained load test for ${SUSTAINED_DURATION} with ${SUSTAINED_USERS} users`);
  
  // Pre-test health checks
  let services = [
    { name: 'Backend', url: `${BASE_URL}/api/health` },
    { name: 'AI Service', url: `${AI_URL}/health` }
  ];
  
  services.forEach(service => {
    try {
      let response = http.get(service.url, { timeout: '10s' });
      console.log(`${service.name} health: ${response.status}`);
    } catch (e) {
      console.log(`${service.name} health check failed: ${e}`);
    }
  });
  
  return { 
    sustainedUsers: SUSTAINED_USERS,
    testStart: Date.now()
  };
}

export default function (data) {
  let iterationStart = Date.now();
  let sessionId = `sustained_${__VU}_${__ITER}`;
  
  try {
    // 1. Authentication (with connection pooling consideration)
    let authPayload = JSON.stringify({
      username: `sustain_user_${__VU}_${Date.now()}`,
      email: `sustain${__VU}@loadtest.com`
    });

    let authResponse = http.post(`${BASE_URL}/api/auth/register`, authPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s'
    });

    throughput.add(1);
    let isAuthHealthy = [201, 409].includes(authResponse.status) && authResponse.timings.duration < 1000;
    connectionPoolHealth.add(isAuthHealthy);
    errorRate.add(!isAuthHealthy);

    if (!isAuthHealthy) {
      console.log(`Auth unhealthy for ${sessionId}: status=${authResponse.status}, duration=${authResponse.timings.duration}ms`);
      return;
    }

    let token;
    if (authResponse.status === 201) {
      token = JSON.parse(authResponse.body).token;
    } else {
      // Handle existing user
      let loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        username: `sustain_user_${__VU}_${Date.now()}`,
        password: 'defaultpass'
      }), {
        headers: { 'Content-Type': 'application/json' },
        timeout: '30s'
      });
      
      if (loginResponse.status === 200) {
        token = JSON.parse(loginResponse.body).token;
      }
    }

    if (!token) return;

    let headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Database stress testing - multiple operations
    let dbOperations = [
      // Game creation
      () => {
        let dbStart = Date.now();
        let gameResponse = http.post(`${BASE_URL}/api/games`, JSON.stringify({
          gameType: 'gungi',
          timeControl: '15+10',
          metadata: {
            testSession: sessionId,
            iteration: __ITER
          }
        }), { headers, timeout: '30s' });
        
        databaseResponseTime.add(Date.now() - dbStart);
        throughput.add(1);
        return gameResponse;
      },
      
      // User statistics
      () => {
        let dbStart = Date.now();
        let statsResponse = http.get(`${BASE_URL}/api/users/stats`, { headers, timeout: '30s' });
        databaseResponseTime.add(Date.now() - dbStart);
        throughput.add(1);
        return statsResponse;
      },
      
      // Leaderboard query (complex DB operation)
      () => {
        let dbStart = Date.now();
        let leaderResponse = http.get(`${BASE_URL}/api/leaderboard?limit=100&timeframe=week`, { 
          headers, 
          timeout: '30s' 
        });
        databaseResponseTime.add(Date.now() - dbStart);
        throughput.add(1);
        return leaderResponse;
      }
    ];

    // Execute database operations
    let gameId;
    dbOperations.forEach((operation, index) => {
      let result = operation();
      let isHealthy = result.status < 400 && result.timings.duration < 2000;
      connectionPoolHealth.add(isHealthy);
      errorRate.add(!isHealthy);
      
      if (index === 0 && result.status === 201) {
        gameId = JSON.parse(result.body).gameId;
      }
      
      check(result, {
        [`DB operation ${index} status < 400`]: (r) => r.status < 400,
        [`DB operation ${index} duration < 2s`]: (r) => r.timings.duration < 2000,
      });
    });

    // 3. Sustained WebSocket connection
    if (gameId && Math.random() < 0.6) { // 60% establish WS connections
      let wsStart = Date.now();
      
      ws.connect(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }, function (socket) {
        let wsConnectionTime = Date.now() - wsStart;
        responseTime.add(wsConnectionTime);

        socket.on('open', () => {
          socket.send(`42["join_game","${gameId}"]`);
          
          // Sustained activity simulation
          let activityCount = 0;
          let sustainedActivity = setInterval(() => {
            if (activityCount < 20) { // 20 activities per connection
              let activities = [
                `42["heartbeat",{"timestamp":${Date.now()}}]`,
                `42["game_state_request","${gameId}"]`,
                `42["spectator_join","${gameId}"]`
              ];
              
              socket.send(activities[activityCount % activities.length]);
              throughput.add(1);
              activityCount++;
            } else {
              clearInterval(sustainedActivity);
            }
          }, 5000); // Every 5 seconds
        });

        socket.on('message', (data) => {
          responseTime.add(Date.now() - iterationStart);
          throughput.add(1);
        });

        socket.on('error', (e) => {
          errorRate.add(1);
          console.log(`Sustained WS error for ${sessionId}:`, e);
        });

        sleep(30); // Keep connection for 30 seconds
      });
    }

    // 4. AI Service sustained load
    if (Math.random() < 0.4) { // 40% use AI service
      let aiStart = Date.now();
      let aiPayload = JSON.stringify({
        gameState: {
          board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
          turn: 'white',
          gameId: gameId || 'test-game',
          sessionId: sessionId
        },
        difficulty: 'medium',
        timeLimit: 5000 // 5 second time limit
      });

      let aiResponse = http.post(`${AI_URL}/api/move`, aiPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: '10s'
      });

      let aiDuration = Date.now() - aiStart;
      responseTime.add(aiDuration);
      throughput.add(1);
      
      let isAiHealthy = aiResponse.status === 200 && aiDuration < 8000;
      connectionPoolHealth.add(isAiHealthy);
      errorRate.add(!isAiHealthy);

      check(aiResponse, {
        'AI service responds successfully': (r) => r.status === 200,
        'AI service responds within time limit': (r) => r.timings.duration < 8000,
        'AI service response is valid': (r) => {
          try {
            let body = JSON.parse(r.body);
            return body.move !== undefined;
          } catch (e) {
            return false;
          }
        }
      });
    }

    // 5. Memory usage estimation based on response patterns
    let estimatedMemoryUsage = Math.floor(
      (throughput.count / 1000) * // Requests per second impact
      (1 + (errorRate.count / Math.max(throughput.count, 1))) * // Error rate impact
      100 // Base memory estimate in MB
    );
    memoryUsage.add(estimatedMemoryUsage);

    // 6. Regular API endpoint cycling (simulate normal usage patterns)
    let endpoints = [
      `${BASE_URL}/api/games/active`,
      `${BASE_URL}/api/users/profile`,
      `${BASE_URL}/api/tournaments/upcoming`,
      `${BASE_URL}/api/analytics/summary`
    ];

    let randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    let endpointStart = Date.now();
    let endpointResponse = http.get(randomEndpoint, { headers, timeout: '30s' });
    
    responseTime.add(Date.now() - endpointStart);
    throughput.add(1);
    
    let isEndpointHealthy = endpointResponse.status < 500 && endpointResponse.timings.duration < 3000;
    connectionPoolHealth.add(isEndpointHealthy);
    errorRate.add(!isEndpointHealthy);

    // Realistic user behavior simulation
    sleep(2 + Math.random() * 4); // 2-6 second intervals

  } catch (error) {
    console.log(`Sustained load error for ${sessionId}:`, error);
    errorRate.add(1);
  }
}

export function teardown(data) {
  let testDuration = (Date.now() - data.testStart) / 1000;
  console.log(`Sustained load test completed after ${testDuration} seconds`);
  console.log(`Total throughput: ${throughput.count} requests`);
  console.log(`Average RPS: ${(throughput.count / testDuration).toFixed(2)}`);
  
  // Final health verification
  try {
    let finalHealth = http.get(`${BASE_URL}/api/health`);
    console.log(`System health post-test: ${finalHealth.status}`);
    
    if (finalHealth.status === 200) {
      let healthData = JSON.parse(finalHealth.body);
      console.log('Post-test system metrics:', healthData);
    }
  } catch (e) {
    console.log('Post-test health check failed:', e);
  }
}
