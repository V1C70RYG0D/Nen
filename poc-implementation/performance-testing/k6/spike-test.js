import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Spike test specific metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');
export let spikeRecoveryTime = new Trend('spike_recovery_time');
export let systemStability = new Rate('system_stability');
export let peakPerformance = new Gauge('peak_performance');
export let resourceExhaustion = new Rate('resource_exhaustion');

const BASELINE_USERS = parseInt(__ENV.BASELINE_USERS || '20');
const SPIKE_USERS = parseInt(__ENV.SPIKE_USERS || '500');
const SPIKE_DURATION = __ENV.SPIKE_DURATION || '2m';

export let options = {
  stages: [
    { duration: '2m', target: BASELINE_USERS },      // Baseline load
    { duration: '10s', target: SPIKE_USERS },        // Rapid spike
    { duration: SPIKE_DURATION, target: SPIKE_USERS }, // Hold spike
    { duration: '10s', target: BASELINE_USERS },     // Rapid drop
    { duration: '3m', target: BASELINE_USERS },      // Recovery period
    { duration: '30s', target: 0 }                  // Shutdown
  ],
  thresholds: {
    // More lenient thresholds for spike testing
    http_req_duration: ['p(95)<3000', 'p(99)<8000'],
    http_req_failed: ['rate<0.15'], // Allow higher error rate during spike
    errors: ['rate<0.2'],
    response_time: ['p(95)<5000'],
    system_stability: ['rate>0.7'], // System should be stable 70% of the time
    resource_exhaustion: ['rate<0.3'] // Resource exhaustion should be <30%
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';
const AI_URL = __ENV.AI_URL || 'http://localhost:5000';

export function setup() {
  console.log(`Starting spike test: ${BASELINE_USERS} → ${SPIKE_USERS} users`);
  
  // Pre-spike system baseline
  let baselineHealth = http.get(`${BASE_URL}/api/health`);
  console.log(`Pre-spike health: ${baselineHealth.status}`);
  
  return {
    baselineUsers: BASELINE_USERS,
    spikeUsers: SPIKE_USERS,
    testPhases: ['baseline', 'spike-up', 'spike-hold', 'spike-down', 'recovery']
  };
}

export default function (data) {
  let testStart = Date.now();
  let currentPhase = getCurrentPhase(__ENV.K6_STAGE_INDEX || 0);
  let userId = `spike_${currentPhase}_${__VU}_${__ITER}`;

  try {
    // Phase-specific behavior adjustments
    let phaseConfig = getPhaseConfig(currentPhase);
    
    // 1. Authentication with phase-appropriate timeout
    let authStart = Date.now();
    let authPayload = JSON.stringify({
      username: userId,
      email: `${userId}@spiketest.com`,
      priority: currentPhase === 'spike-hold' ? 'high' : 'normal'
    });

    let authResponse = http.post(`${BASE_URL}/api/auth/register`, authPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: phaseConfig.timeout
    });

    let authDuration = Date.now() - authStart;
    responseTime.add(authDuration);
    
    // Assess system stability based on auth performance
    let isSystemStable = assessSystemStability(authResponse, authDuration, currentPhase);
    systemStability.add(isSystemStable);
    
    if (!isSystemStable) {
      resourceExhaustion.add(1);
      console.log(`System instability detected in ${currentPhase} phase for ${userId}`);
    }

    errorRate.add(![201, 409, 429].includes(authResponse.status)); // 429 = rate limited, acceptable during spike

    let token;
    if (authResponse.status === 201) {
      token = JSON.parse(authResponse.body).token;
    } else if (authResponse.status === 409) {
      // Handle existing user
      let loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        username: userId,
        password: 'spikepass'
      }), {
        headers: { 'Content-Type': 'application/json' },
        timeout: phaseConfig.timeout
      });
      
      if (loginResponse.status === 200) {
        token = JSON.parse(loginResponse.body).token;
      }
    }

    if (!token) {
      if (currentPhase !== 'spike-hold') { // Expected failures during peak spike
        errorRate.add(1);
      }
      return;
    }

    let headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Core system stress based on phase
    let coreOperations = getCoreOperationsForPhase(currentPhase, headers, phaseConfig);
    
    coreOperations.forEach((operation, index) => {
      try {
        let opStart = Date.now();
        let result = operation();
        let opDuration = Date.now() - opStart;
        
        responseTime.add(opDuration);
        
        let isOperationStable = result.status < 500 && opDuration < phaseConfig.maxResponseTime;
        systemStability.add(isOperationStable);
        
        if (!isOperationStable) {
          resourceExhaustion.add(1);
        }
        
        errorRate.add(result.status >= 400 && result.status !== 429);
        
        check(result, {
          [`${currentPhase} operation ${index} not server error`]: (r) => r.status < 500,
          [`${currentPhase} operation ${index} completes`]: (r) => r.timings.duration < phaseConfig.maxResponseTime * 2
        });
        
      } catch (error) {
        console.log(`Operation ${index} failed in ${currentPhase}:`, error);
        errorRate.add(1);
        resourceExhaustion.add(1);
      }
    });

    // 3. WebSocket stress testing with phase-appropriate intensity
    if (shouldTestWebSocket(currentPhase)) {
      let wsStart = Date.now();
      
      try {
        ws.connect(`${WS_URL}/socket.io/?EIO=4&transport=websocket&phase=${currentPhase}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: phaseConfig.timeout
        }, function (socket) {
          let wsConnectTime = Date.now() - wsStart;
          responseTime.add(wsConnectTime);

          socket.on('open', () => {
            // Send spike-intensity messages
            let messageCount = 0;
            let maxMessages = phaseConfig.wsMessageCount;
            
            let messageInterval = setInterval(() => {
              if (messageCount < maxMessages) {
                socket.send(`42["spike_test_message",{"phase":"${currentPhase}","count":${messageCount},"timestamp":${Date.now()}}]`);
                messageCount++;
              } else {
                clearInterval(messageInterval);
              }
            }, phaseConfig.wsMessageInterval);
          });

          socket.on('message', (data) => {
            responseTime.add(Date.now() - testStart);
            systemStability.add(1);
          });

          socket.on('error', (e) => {
            console.log(`WebSocket error in ${currentPhase}:`, e);
            errorRate.add(1);
            resourceExhaustion.add(1);
          });

          sleep(phaseConfig.wsHoldTime);
        });
      } catch (wsError) {
        console.log(`WebSocket connection failed in ${currentPhase}:`, wsError);
        resourceExhaustion.add(1);
      }
    }

    // 4. AI service spike testing
    if (Math.random() < phaseConfig.aiUsageProbability) {
      let aiStart = Date.now();
      let aiPayload = JSON.stringify({
        gameState: {
          board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
          turn: 'white',
          phase: currentPhase,
          urgency: currentPhase === 'spike-hold' ? 'high' : 'normal'
        },
        difficulty: currentPhase === 'spike-hold' ? 'easy' : 'medium', // Easier during spike
        timeLimit: phaseConfig.aiTimeLimit
      });

      let aiResponse = http.post(`${AI_URL}/api/move`, aiPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: phaseConfig.aiTimeLimit + 'ms'
      });

      let aiDuration = Date.now() - aiStart;
      responseTime.add(aiDuration);
      
      let isAiStable = aiResponse.status === 200 && aiDuration < phaseConfig.aiTimeLimit;
      systemStability.add(isAiStable);
      
      if (!isAiStable) {
        resourceExhaustion.add(1);
      }
      
      errorRate.add(aiResponse.status >= 500);
    }

    // 5. Measure peak performance during spike
    if (currentPhase === 'spike-hold') {
      let peakMetrics = calculatePeakMetrics();
      peakPerformance.add(peakMetrics);
    }

    // 6. Recovery time measurement
    if (currentPhase === 'recovery') {
      let recoveryStart = Date.now();
      let recoveryResponse = http.get(`${BASE_URL}/api/health`, { timeout: '10s' });
      let recoveryTime = Date.now() - recoveryStart;
      
      spikeRecoveryTime.add(recoveryTime);
      systemStability.add(recoveryResponse.status === 200 && recoveryTime < 2000);
    }

    // Phase-appropriate sleep
    sleep(phaseConfig.sleepTime);

  } catch (error) {
    console.log(`Spike test error in ${currentPhase} for ${userId}:`, error);
    errorRate.add(1);
    resourceExhaustion.add(1);
  }
}

function getCurrentPhase(stageIndex) {
  const phases = ['baseline', 'spike-up', 'spike-hold', 'spike-down', 'recovery', 'shutdown'];
  return phases[Math.min(stageIndex, phases.length - 1)];
}

function getPhaseConfig(phase) {
  const configs = {
    baseline: {
      timeout: '30s',
      maxResponseTime: 1000,
      wsMessageCount: 5,
      wsMessageInterval: 2000,
      wsHoldTime: 10,
      aiUsageProbability: 0.3,
      aiTimeLimit: 3000,
      sleepTime: 2
    },
    'spike-up': {
      timeout: '45s',
      maxResponseTime: 3000,
      wsMessageCount: 10,
      wsMessageInterval: 1000,
      wsHoldTime: 5,
      aiUsageProbability: 0.5,
      aiTimeLimit: 5000,
      sleepTime: 1
    },
    'spike-hold': {
      timeout: '60s',
      maxResponseTime: 8000,
      wsMessageCount: 15,
      wsMessageInterval: 500,
      wsHoldTime: 3,
      aiUsageProbability: 0.7,
      aiTimeLimit: 8000,
      sleepTime: 0.5
    },
    'spike-down': {
      timeout: '45s',
      maxResponseTime: 5000,
      wsMessageCount: 8,
      wsMessageInterval: 1500,
      wsHoldTime: 7,
      aiUsageProbability: 0.4,
      aiTimeLimit: 4000,
      sleepTime: 1.5
    },
    recovery: {
      timeout: '30s',
      maxResponseTime: 2000,
      wsMessageCount: 3,
      wsMessageInterval: 3000,
      wsHoldTime: 15,
      aiUsageProbability: 0.2,
      aiTimeLimit: 3000,
      sleepTime: 3
    }
  };
  
  return configs[phase] || configs.baseline;
}

function assessSystemStability(response, duration, phase) {
  const thresholds = {
    baseline: { maxDuration: 1000, acceptableStatuses: [200, 201, 409] },
    'spike-up': { maxDuration: 3000, acceptableStatuses: [200, 201, 409, 429] },
    'spike-hold': { maxDuration: 8000, acceptableStatuses: [200, 201, 409, 429, 503] },
    'spike-down': { maxDuration: 5000, acceptableStatuses: [200, 201, 409, 429] },
    recovery: { maxDuration: 2000, acceptableStatuses: [200, 201, 409] }
  };
  
  let threshold = thresholds[phase] || thresholds.baseline;
  return threshold.acceptableStatuses.includes(response.status) && duration < threshold.maxDuration;
}

function getCoreOperationsForPhase(phase, headers, config) {
  let operations = [];
  
  // Always include basic health check
  operations.push(() => http.get(`${BASE_URL}/api/health`, { timeout: config.timeout }));
  
  if (phase !== 'spike-hold') {
    // Add more operations for non-peak phases
    operations.push(() => http.get(`${BASE_URL}/api/games/active`, { headers, timeout: config.timeout }));
    operations.push(() => http.post(`${BASE_URL}/api/games`, JSON.stringify({
      gameType: 'gungi',
      phase: phase
    }), { headers, timeout: config.timeout }));
  } else {
    // Minimal operations during peak spike
    operations.push(() => http.get(`${BASE_URL}/api/ping`, { timeout: config.timeout }));
  }
  
  return operations;
}

function shouldTestWebSocket(phase) {
  const wsPhases = ['baseline', 'spike-up', 'recovery'];
  return wsPhases.includes(phase) && Math.random() < 0.6;
}

function calculatePeakMetrics() {
  // Simplified peak performance calculation
  return Math.floor(Math.random() * 100) + 50; // Placeholder metric
}

export function teardown(data) {
  console.log('Spike test completed');
  console.log(`Phases tested: ${data.testPhases.join(', ')}`);
  
  // Post-spike health verification
  let postSpikeHealth = http.get(`${BASE_URL}/api/health`);
  console.log(`Post-spike system health: ${postSpikeHealth.status}`);
  
  if (postSpikeHealth.status === 200) {
    console.log('System successfully recovered from spike test');
  } else {
    console.log('WARNING: System may not have fully recovered from spike test');
  }
}
