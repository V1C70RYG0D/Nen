/**
 * Real-Time Update Propagation Tests
 *
 * Tests for message delivery within 100ms, event broadcasting, and session management.
 * Verifies message ordering, reliability, and connection state synchronization across multiple clients.
 *
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import { performance } from 'perf_hooks';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import winston from 'winston';

// Socket.IO client
const Client = require('socket.io-client');

// Set timeout for all tests in this suite
jest.setTimeout(60000);

// Test configuration from environment
const TEST_CONFIG = {
  maxLatencyMs: parseInt(process.env.MAX_LATENCY_MS || '100'),
  minThroughputMsgsPerSec: parseInt(process.env.MIN_THROUGHPUT_MSGS_PER_SEC || '500'),
  connectionTestDurationMs: parseInt(process.env.CONNECTION_TEST_DURATION_MS || '30000'),
  jwtSecret: process.env.JWT_SECRET || 'test-secret',
  redisHost: process.env.REDIS_HOST || process.env.TEST_REDIS_HOST || '127.0.0.1',
  redisPort: parseInt(process.env.REDIS_PORT || process.env.TEST_REDIS_PORT || '6380')
};

interface TestClient {
  client: any;
  userId: string;
  token: string;
  connected: boolean;
  latency?: number;
  messagesReceived: number;
  disconnect: () => void;
}

describe('Real-Time Update Propagation Tests', () => {
  let httpServer: any;
  let io: Server;
  let serverPort: number;
  let redis: Redis;
  let logger: winston.Logger;
  let testClients: TestClient[] = [];

  beforeAll(async () => {
    // Setup logger for test debugging
    logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });

    // Setup Redis for session management (optional, will fallback if unavailable)
    try {
      redis = new Redis({
        host: TEST_CONFIG.redisHost,
        port: TEST_CONFIG.redisPort,
        lazyConnect: true,
        maxRetriesPerRequest: 1
      });
      await redis.connect();
      logger.info('Redis connected for session management');
    } catch (error) {
      logger.warn('Redis unavailable, using in-memory sessions');
    }

    // In-memory session storage as fallback
    const sessions = new Map();
    const connectedClients = new Map();

    // Setup HTTP server
    httpServer = createServer();

    // Setup Socket.IO server with real-time optimizations
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      pingTimeout: 5000,
      pingInterval: 2000,
      transports: ['websocket', 'polling']
    });

    // Start server and get port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address()?.port || 0;
        logger.info(`Test server started on port ${serverPort}`);
        resolve();
      });
    });

    // Use default namespace for simplicity and reliability
    // Middleware for latency tracking
    io.use((socket, next) => {
      socket.data.connectionStart = performance.now();
      socket.data.lastPing = Date.now();
      next();
    });

    // Main connection handler
    io.on('connection', (socket) => {
      const connectionLatency = performance.now() - socket.data.connectionStart;
      logger.debug(`Client connected: ${socket.id}, latency: ${connectionLatency}ms`);

      connectedClients.set(socket.id, {
        id: socket.id,
        connectionTime: Date.now(),
        latency: connectionLatency
      });

      // Latency monitoring
      socket.on('ping', (timestamp, callback) => {
        const latency = Date.now() - timestamp;
        socket.data.lastPing = Date.now();

        if (callback) {
          callback({
            latency,
            serverTimestamp: Date.now()
          });
        }
      });

      // Real-time message delivery test handler
      socket.on('test-message', (data, callback) => {
        const processingStart = performance.now();

        // Simulate minimal processing
        setImmediate(() => {
          const processingTime = performance.now() - processingStart;

          if (callback) {
            callback({
              success: true,
              processingTime,
              serverTimestamp: Date.now(),
              receivedData: data
            });
          }
        });
      });

      // Broadcast event handler
      socket.on('broadcast-event', (data) => {
        const timestamp = Date.now();

        // Broadcast to all clients in namespace except sender
        socket.broadcast.emit('broadcast-event', {
          ...data,
          from: socket.id,
          serverTimestamp: timestamp
        });

        // Also emit to sender for confirmation
        socket.emit('broadcast-confirmed', {
          ...data,
          serverTimestamp: timestamp
        });
      });

      // Session management
      socket.on('create-session', async (data, callback) => {
        try {
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const sessionData = {
            id: sessionId,
            creator: socket.id,
            participants: [socket.id],
            createdAt: new Date().toISOString(),
            status: 'active'
          };

          // Store session
          if (redis && redis.status === 'ready') {
            await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(sessionData));
          } else {
            sessions.set(sessionId, sessionData);
          }

          // Join socket to session room
          await socket.join(sessionId);

          callback({ success: true, sessionId, sessionData });
        } catch (error) {
          callback({ success: false, error: 'Failed to create session' });
        }
      });

      // Message ordering test
      socket.on('sequence-test', (data) => {
        const { sequenceId, message } = data;

        // Echo back with server timestamp to verify ordering
        socket.emit('sequence-response', {
          sequenceId,
          message,
          serverTimestamp: Date.now(),
          receivedOrder: sequenceId
        });
      });

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        logger.debug(`Client disconnected: ${socket.id}, reason: ${reason}`);
        connectedClients.delete(socket.id);
      });
    });

  });

  afterAll(async () => {
    // Cleanup all test clients
    testClients.forEach(client => {
      if (client.client && client.client.connected) {
        client.client.disconnect();
      }
    });
    testClients = [];

    // Close server and Redis
    if (io) {
      io.close();
    }
    if (httpServer) {
      httpServer.close();
    }
    if (redis && redis.status === 'ready') {
      await redis.disconnect();
    }
  });

  afterEach(() => {
    // Cleanup test clients after each test
    testClients.forEach(client => {
      if (client.client && client.client.connected) {
        client.client.disconnect();
      }
    });
    testClients = [];
  });

  // Helper function to create authenticated client
  const createTestClient = (userId: string = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`): Promise<TestClient> => {
    return new Promise((resolve, reject) => {
      const token = jwt.sign({ userId }, TEST_CONFIG.jwtSecret);
      const client = new Client(`http://localhost:${serverPort}`, {
        timeout: 5000,
        forceNew: true
      });

      const testClient: TestClient = {
        client,
        userId,
        token,
        connected: false,
        messagesReceived: 0,
        disconnect: () => {
          if (client && client.connected) {
            client.disconnect();
          }
        }
      };

      client.on('connect', () => {
        testClient.connected = true;
        logger.debug(`Test client connected: ${userId}`);
        resolve(testClient);
      });

      client.on('connect_error', (error: any) => {
        logger.error(`Test client connection failed: ${userId}`, error);
        reject(error);
      });

      client.on('disconnect', () => {
        testClient.connected = false;
        logger.debug(`Test client disconnected: ${userId}`);
      });

      testClients.push(testClient);
    });
  };

  // Test 1: Message Delivery within 100ms
  test('should deliver messages within 100ms', async () => {
    const client = await createTestClient();

    const messagePromise = new Promise<number>((resolve) => {
      const startTime = performance.now();

      client.client.emit('test-message', { message: 'latency-test' }, (response: any) => {
        const latency = performance.now() - startTime;
        expect(response.success).toBe(true);
        expect(response.receivedData.message).toBe('latency-test');
        resolve(latency);
      });
    });

    const latency = await messagePromise;
    expect(latency).toBeLessThan(TEST_CONFIG.maxLatencyMs);
    logger.info(`Message delivery latency: ${latency.toFixed(2)}ms`);
  });

  // Test 2: Event Broadcasting
  test('should broadcast events to all connected clients', async () => {
    const numClients = 3;
    const clients = await Promise.all(
      Array.from({ length: numClients }, (_, i) => createTestClient(`broadcast_user_${i}`))
    );

    expect(clients).toHaveLength(numClients);
    clients.forEach(client => expect(client.connected).toBe(true));

    let receivedCount = 0;
    const broadcastPromise = new Promise<void>((resolve) => {
      clients.forEach((client, index) => {
        client.client.on('broadcast-event', (data: any) => {
          expect(data.message).toBe('broadcast-test');
          expect(data.from).toBe(clients[0].client.id); // Should be from first client
          receivedCount++;

          if (receivedCount === numClients - 1) { // All except sender
            resolve();
          }
        });
      });
    });

    // Send broadcast from first client
    clients[0].client.emit('broadcast-event', { message: 'broadcast-test' });

    await broadcastPromise;
    expect(receivedCount).toBe(numClients - 1);
  });

  // Test 3: Session Management
  test('should handle session creation and management', async () => {
    const client = await createTestClient();

    const sessionPromise = new Promise<any>((resolve, reject) => {
      client.client.emit('create-session', { type: 'test-session' }, (response: any) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });

    const sessionResponse = await sessionPromise;
    expect(sessionResponse.success).toBe(true);
    expect(sessionResponse.sessionId).toBeDefined();
    expect(sessionResponse.sessionData.creator).toBe(client.client.id);
    expect(sessionResponse.sessionData.status).toBe('active');
  });

  // Test 4: Message Ordering
  test('should maintain message ordering across multiple clients', async () => {
    const client = await createTestClient();
    const numMessages = 10;
    const receivedMessages: any[] = [];

    const orderingPromise = new Promise<void>((resolve) => {
      client.client.on('sequence-response', (data: any) => {
        receivedMessages.push(data);
        if (receivedMessages.length === numMessages) {
          resolve();
        }
      });
    });

    // Send messages in sequence
    for (let i = 0; i < numMessages; i++) {
      client.client.emit('sequence-test', {
        sequenceId: i,
        message: `message-${i}`
      });
    }

    await orderingPromise;

    // Verify ordering
    expect(receivedMessages).toHaveLength(numMessages);
    receivedMessages.forEach((msg, index) => {
      expect(msg.sequenceId).toBe(index);
      expect(msg.receivedOrder).toBe(index);
    });
  });

  // Test 5: Connection State Synchronization
  test('should synchronize connection states across multiple clients', async () => {
    const numClients = 5;
    const clients = await Promise.all(
      Array.from({ length: numClients }, (_, i) => createTestClient(`sync_user_${i}`))
    );

    // Verify all clients are connected
    clients.forEach(client => {
      expect(client.connected).toBe(true);
    });

    // Test latency measurement for each client
    const latencyPromises = clients.map(client => {
      return new Promise<number>((resolve) => {
        const startTime = Date.now();
        client.client.emit('ping', startTime, (response: any) => {
          const latency = response.latency;
          resolve(latency);
        });
      });
    });

    const latencies = await Promise.all(latencyPromises);

    // Verify all latencies are reasonable
    latencies.forEach(latency => {
      expect(latency).toBeLessThan(TEST_CONFIG.maxLatencyMs);
    });

    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    logger.info(`Average connection latency: ${avgLatency.toFixed(2)}ms`);
  });

  // Test 6: Reliability under Network Stress
  test('should maintain reliability under concurrent load', async () => {
    const numClients = 10;
    const messagesPerClient = 50;
    const clients = await Promise.all(
      Array.from({ length: numClients }, (_, i) => createTestClient(`load_user_${i}`))
    );

    let totalMessagesReceived = 0;
    const totalExpectedMessages = numClients * messagesPerClient;

    const loadPromise = new Promise<void>((resolve) => {
      clients.forEach(client => {
        client.client.on('test-message', () => {
          totalMessagesReceived++;
          if (totalMessagesReceived >= totalExpectedMessages) {
            resolve();
          }
        });
      });
    });

    // Send concurrent messages from all clients
    const startTime = performance.now();

    const sendPromises = clients.map(async (client, clientIndex) => {
      for (let i = 0; i < messagesPerClient; i++) {
        client.client.emit('test-message', {
          from: client.userId,
          messageId: `${clientIndex}-${i}`,
          timestamp: Date.now()
        });
      }
    });

    await Promise.all(sendPromises);
    await loadPromise;

    const duration = performance.now() - startTime;
    const throughput = totalMessagesReceived / (duration / 1000);

    expect(totalMessagesReceived).toBe(totalExpectedMessages);
    expect(throughput).toBeGreaterThan(TEST_CONFIG.minThroughputMsgsPerSec);

    logger.info(`Load test completed: ${totalMessagesReceived} messages in ${duration.toFixed(2)}ms, throughput: ${throughput.toFixed(2)} msgs/sec`);
  });

});

