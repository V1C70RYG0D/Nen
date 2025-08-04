/**
 * Simple Real-Time Update Propagation Tests
 *
 * Basic tests for message delivery, event broadcasting, and session management.
 * Simplified version to ensure WebSocket functionality works correctly.
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import { performance } from 'perf_hooks';

// Socket.IO client
const Client = require('socket.io-client');

// Set timeout for all tests in this suite
jest.setTimeout(30000);

describe('Simple Real-Time Update Tests', () => {
  let httpServer: any;
  let io: Server;
  let serverPort: number;
  let testClients: any[] = [];

  beforeAll(async () => {
    // Setup HTTP server
    httpServer = createServer();

    // Setup Socket.IO server with basic config
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Start server and get port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address()?.port || 0;
        console.log(`Test server started on port ${serverPort}`);
        resolve();
      });
    });

    // Basic connection handler
    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Echo test handler
      socket.on('test-message', (data, callback) => {
        const startTime = performance.now();

        // Echo back immediately
        if (callback) {
          callback({
            success: true,
            receivedData: data,
            serverTimestamp: Date.now(),
            processingTime: performance.now() - startTime
          });
        }
      });

      // Broadcast handler
      socket.on('broadcast-event', (data) => {
        socket.broadcast.emit('broadcast-event', {
          ...data,
          from: socket.id,
          serverTimestamp: Date.now()
        });
      });

      // Ping handler
      socket.on('ping', (timestamp, callback) => {
        if (callback) {
          callback({
            latency: Date.now() - timestamp,
            serverTimestamp: Date.now()
          });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  });

  afterAll(async () => {
    // Cleanup all test clients
    testClients.forEach(client => {
      if (client && client.connected) {
        client.disconnect();
      }
    });
    testClients = [];

    // Close server
    if (io) {
      io.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  afterEach(() => {
    // Cleanup test clients after each test
    testClients.forEach(client => {
      if (client && client.connected) {
        client.disconnect();
      }
    });
    testClients = [];
  });

  // Helper function to create test client
  const createTestClient = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const client = new Client(`http://localhost:${serverPort}`, {
timeout: 30000,
        forceNew: true,
        transports: ['websocket', 'polling']
      });

      client.on('connect', () => {
        console.log(`Test client connected`);
        resolve(client);
      });

      client.on('connect_error', (error: any) => {
        console.error(`Test client connection failed:`, error);
        reject(error);
      });

      testClients.push(client);
    });
  };

  // Test 1: Basic Connection
  test('should establish basic WebSocket connection', async () => {
    const client = await createTestClient();
    expect(client.connected).toBe(true);
  });

  // Test 2: Message Delivery with Latency Check
  test('should deliver messages within acceptable time', async () => {
    const client = await createTestClient();

    const messagePromise = new Promise<number>((resolve) => {
      const startTime = performance.now();

      client.emit('test-message', { message: 'latency-test' }, (response: any) => {
        const latency = performance.now() - startTime;
        expect(response.success).toBe(true);
        expect(response.receivedData.message).toBe('latency-test');
        resolve(latency);
      });
    });

    const latency = await messagePromise;
    expect(latency).toBeLessThan(500); // More generous timeout
    console.log(`Message delivery latency: ${latency.toFixed(2)}ms`);
  });

  // Test 3: Ping-Pong Latency Test
  test('should measure ping-pong latency accurately', async () => {
    const client = await createTestClient();

    const pingPromise = new Promise<number>((resolve) => {
      const startTime = Date.now();

      client.emit('ping', startTime, (response: any) => {
        const latency = response.latency;
        expect(latency).toBeGreaterThan(0);
        expect(latency).toBeLessThan(200); // 200ms should be reasonable
        resolve(latency);
      });
    });

    const latency = await pingPromise;
    console.log(`Ping latency: ${latency}ms`);
  });

  // Test 4: Simple Broadcast
  test('should broadcast events to multiple clients', async () => {
    const numClients = 2;
    const clients = await Promise.all(
      Array.from({ length: numClients }, () => createTestClient())
    );

    expect(clients).toHaveLength(numClients);
    clients.forEach(client => expect(client.connected).toBe(true));

    let receivedCount = 0;
    const broadcastPromise = new Promise<void>((resolve) => {
      clients[1].on('broadcast-event', (data: any) => {
        expect(data.message).toBe('broadcast-test');
        expect(data.from).toBe(clients[0].id);
        receivedCount++;
        resolve();
      });
    });

    // Send broadcast from first client
    clients[0].emit('broadcast-event', { message: 'broadcast-test' });

    await broadcastPromise;
    expect(receivedCount).toBe(1);
  });

  // Test 5: Multiple Concurrent Connections
  test('should handle multiple concurrent connections', async () => {
    const numClients = 3;
    const clients = await Promise.all(
      Array.from({ length: numClients }, (_, i) => createTestClient())
    );

    // Verify all clients are connected
    clients.forEach(client => {
      expect(client.connected).toBe(true);
    });

    // Test concurrent ping operations
    const pingPromises = clients.map(client => {
      return new Promise<number>((resolve) => {
        const startTime = Date.now();
        client.emit('ping', startTime, (response: any) => {
          resolve(response.latency);
        });
      });
    });

    const latencies = await Promise.all(pingPromises);

    // Verify all latencies are reasonable
    latencies.forEach(latency => {
      expect(latency).toBeGreaterThan(0);
      expect(latency).toBeLessThan(200);
    });

    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    console.log(`Average connection latency: ${avgLatency.toFixed(2)}ms`);
  });
});
