const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Geographic regions for testing
const REGIONS = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'ap-southeast-1',
  'ap-northeast-1'
];

// JWT secret for testing (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-websocket-testing';

/**
 * Generate JWT token for authentication
 */
function generateJWT(userContext, events, done) {
  const payload = {
    userId: uuidv4(),
    username: `test_user_${Math.floor(Math.random() * 10000)}`,
    region: selectRandomRegion(),
    role: 'player',
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
    iat: Math.floor(Date.now() / 1000),
    iss: 'artillery-test-suite'
  };

  const token = jwt.sign(payload, JWT_SECRET);
  userContext.vars.jwt_token = token;
  userContext.vars.user_id = payload.userId;
  userContext.vars.username = payload.username;

  return done();
}

/**
 * Select random geographic region
 */
function selectRegion(userContext, events, done) {
  const region = selectRandomRegion();
  userContext.vars.selected_region = region;
  return done();
}

/**
 * Helper function to select random region
 */
function selectRandomRegion() {
  return REGIONS[Math.floor(Math.random() * REGIONS.length)];
}

/**
 * Track connection metrics for geographic optimization
 */
function trackConnectionMetrics(userContext, events, done) {
  const connectionStart = Date.now();
  userContext.vars.connection_start = connectionStart;
  userContext.vars.metrics = {
    region: userContext.vars.selected_region || selectRandomRegion(),
    connectionAttempts: 0,
    failures: 0,
    latencyMeasurements: []
  };

  return done();
}

/**
 * Validate failover response
 */
function validateFailover(userContext, events, done) {
  const response = userContext.vars.last_response;

  if (response && response.failedOver) {
    userContext.vars.failover_success = true;
    userContext.vars.new_region = response.newRegion;

    // Track failover time
    const failoverTime = Date.now() - userContext.vars.failover_start;
    userContext.vars.failover_duration = failoverTime;

    console.log(`Failover completed in ${failoverTime}ms to region ${response.newRegion}`);
  } else {
    userContext.vars.failover_success = false;
    console.error('Failover validation failed');
  }

  return done();
}

/**
 * Measure latency for geographic optimization
 */
function measureLatency(userContext, events, done) {
  const now = Date.now();
  const sentTimestamp = userContext.vars.last_sent_timestamp;

  if (sentTimestamp) {
    const latency = now - sentTimestamp;

    if (!userContext.vars.latency_measurements) {
      userContext.vars.latency_measurements = [];
    }

    userContext.vars.latency_measurements.push({
      timestamp: now,
      latency,
      region: userContext.vars.selected_region
    });

    // Calculate average latency
    const measurements = userContext.vars.latency_measurements;
    const avgLatency = measurements.reduce((sum, m) => sum + m.latency, 0) / measurements.length;
    userContext.vars.average_latency = avgLatency;

    // Log significant latency increases
    if (latency > 200) {
      console.warn(`High latency detected: ${latency}ms in region ${userContext.vars.selected_region}`);
    }
  }

  return done();
}

/**
 * Simulate connection instability for testing
 */
function simulateConnectionIssues(userContext, events, done) {
  const instabilityChance = parseFloat(process.env.CONNECTION_INSTABILITY_RATE || '0.05'); // 5% default

  if (Math.random() < instabilityChance) {
    userContext.vars.simulate_disconnect = true;
    console.log('Simulating connection instability');
  }

  return done();
}

/**
 * Track clustering efficiency
 */
function trackClusteringMetrics(userContext, events, done) {
  if (!userContext.vars.cluster_metrics) {
    userContext.vars.cluster_metrics = {
      joins: 0,
      leaves: 0,
      heartbeats: 0,
      regions: new Set()
    };
  }

  const metrics = userContext.vars.cluster_metrics;
  const eventType = userContext.vars.last_event_type;

  switch (eventType) {
    case 'join_cluster':
      metrics.joins++;
      metrics.regions.add(userContext.vars.selected_region);
      break;
    case 'leave_cluster':
      metrics.leaves++;
      break;
    case 'cluster_heartbeat':
      metrics.heartbeats++;
      break;
  }

  return done();
}

/**
 * Generate comprehensive test report
 */
function generateTestReport(userContext, events, done) {
  const report = {
    userId: userContext.vars.user_id,
    testDuration: Date.now() - userContext.vars.test_start,
    connectionMetrics: userContext.vars.metrics,
    latencyMetrics: {
      measurements: userContext.vars.latency_measurements || [],
      average: userContext.vars.average_latency || 0,
      max: Math.max(...(userContext.vars.latency_measurements || []).map(m => m.latency)) || 0,
      min: Math.min(...(userContext.vars.latency_measurements || []).map(m => m.latency)) || 0
    },
    failoverMetrics: {
      attempted: userContext.vars.failover_start ? true : false,
      successful: userContext.vars.failover_success || false,
      duration: userContext.vars.failover_duration || 0,
      newRegion: userContext.vars.new_region
    },
    clusterMetrics: userContext.vars.cluster_metrics || {},
    regions: Array.from(userContext.vars.cluster_metrics?.regions || [])
  };

  // Log summary for this test session
  console.log('Test Summary:', JSON.stringify(report, null, 2));

  return done();
}

/**
 * Validate geographic routing
 */
function validateGeographicRouting(userContext, events, done) {
  const preferredRegion = userContext.vars.selected_region;
  const assignedRegion = userContext.vars.last_response?.region;

  if (assignedRegion) {
    userContext.vars.region_match = assignedRegion === preferredRegion;

    if (!userContext.vars.region_match) {
      console.log(`Region mismatch: preferred ${preferredRegion}, assigned ${assignedRegion}`);
    }
  }

  return done();
}

/**
 * Test connection recovery after network issues
 */
function testConnectionRecovery(userContext, events, done) {
  if (userContext.vars.simulate_disconnect) {
    // Simulate reconnection logic
    userContext.vars.reconnection_start = Date.now();
    userContext.vars.reconnection_attempts = (userContext.vars.reconnection_attempts || 0) + 1;

    // Reset simulation flag
    userContext.vars.simulate_disconnect = false;

    console.log(`Attempting reconnection #${userContext.vars.reconnection_attempts}`);
  }

  return done();
}

/**
 * Stress test connection pooling
 */
function stressTestConnectionPool(userContext, events, done) {
  const maxConnections = parseInt(process.env.MAX_TEST_CONNECTIONS || '1000');
  const currentConnections = userContext.vars.active_connections || 0;

  if (currentConnections >= maxConnections) {
    userContext.vars.connection_pool_stressed = true;
    console.warn(`Connection pool stress limit reached: ${currentConnections}/${maxConnections}`);
  }

  userContext.vars.active_connections = currentConnections + 1;

  return done();
}

module.exports = {
  generateJWT,
  selectRegion,
  trackConnectionMetrics,
  validateFailover,
  measureLatency,
  simulateConnectionIssues,
  trackClusteringMetrics,
  generateTestReport,
  validateGeographicRouting,
  testConnectionRecovery,
  stressTestConnectionPool
};
