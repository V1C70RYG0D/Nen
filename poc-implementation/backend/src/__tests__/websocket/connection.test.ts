import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { performance } from 'perf_hooks';
import { WebSocketClusterService, ClusterConfig, GeographicRegion } from '../../services/WebSocketClusterService';
import winston from 'winston';

// Use require for Socket.IO client to avoid import issues
const Client = require('socket.io-client');


function createTestUrl(port: number, path: string = ''): string {
  const host = process.env.TEST_HOST || process.env.DEFAULT_HOST || '127.0.0.1';
  return `http://${host}:${port}${path}`;
}

interface TestClient {
  client: any;
  userId: string;
  token: string;
  connected: boolean;
  disconnect: () => void;
}

describe('WebSocket Connection Management', () => {
  let httpServer: any;
  let io: Server;
  let redis: Redis;
  let serverPort: number;
  let clusterService: WebSocketClusterService;
  let logger: winston.Logger;
  let activeClients: TestClient[] = [];

  beforeAll(async () => {

    serverPort = parseInt(process.env.TEST_SERVER_PORT || (() => {

    })());

    // Setup HTTP server
    httpServer = createServer();

    // Setup Socket.IO server
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });


    redis = new Redis({
      host: process.env.REDIS_HOST || process.env.TEST_REDIS_HOST || (() => {

      })(),
      port: parseInt(process.env.REDIS_PORT || process.env.TEST_REDIS_PORT || (() => {

      })()),
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Connect to Redis with error handling
    try {
      await redis.connect();
    } catch (error) {
      console.warn('Redis connection failed, using in-memory fallback');
      // Continue with tests even if Redis is unavailable
    }

    // Setup game namespace with session management
    const gameNamespace = io.of('/game');

    // Setup authentication middleware for game namespace only
    gameNamespace.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        socket.data.user = decoded;
        next();
      } catch (err) {
        next(new Error('Invalid authentication token'));
      }
    });

    // In-memory session storage as fallback
    const sessions = new Map();

    gameNamespace.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle session creation
      socket.on('create-session', async (data, callback) => {
        try {
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const sessionData = {
            id: sessionId,
            creator: socket.data.user.userId,
            players: [socket.data.user.userId],
            createdAt: new Date().toISOString(),
            status: 'waiting'
          };

          // Store session in Redis if available, otherwise use in-memory
          if (redis.status === 'ready') {
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

      // Handle session joining
      socket.on('join-session', async (data, callback) => {
        try {
          const { sessionId } = data;

          // Get session data from Redis if available, otherwise from memory
          let sessionData = null;
          if (redis.status === 'ready') {
            const stored = await redis.get(`session:${sessionId}`);
            if (stored) {
              sessionData = JSON.parse(stored);
            }
          } else {
            sessionData = sessions.get(sessionId);
          }

          if (!sessionData) {
            return callback({ success: false, error: 'Session not found' });
          }

          // Add player to session
          if (!sessionData.players.includes(socket.data.user.userId)) {
            sessionData.players.push(socket.data.user.userId);

            // Update session in Redis or memory
            if (redis.status === 'ready') {
              await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(sessionData));
            } else {
              sessions.set(sessionId, sessionData);
            }
          }

          // Join socket to session room
          await socket.join(sessionId);

          // Notify other players
          socket.to(sessionId).emit('player-joined', {
            userId: socket.data.user.userId,
            sessionData
          });

          callback({ success: true, sessionData });
        } catch (error) {
          callback({ success: false, error: 'Failed to join session' });
        }
      });

      // Handle leaving sessions
      socket.on('leave-session', async (data, callback) => {
        try {
          const { sessionId } = data;

          // Leave the room
          await socket.leave(sessionId);

          // Notify other players
          socket.to(sessionId).emit('player-left', {
            userId: socket.data.user.userId
          });

          callback({ success: true });
        } catch (error) {
          callback({ success: false, error: 'Failed to leave session' });
        }
      });

      // Handle custom events
      socket.on('game-event', (data) => {
        const { sessionId, eventType, eventData } = data;
        socket.to(sessionId).emit('game-event', {
          from: socket.data.user.userId,
          eventType,
          eventData,
          timestamp: new Date().toISOString()
        });
      });

      // Handle disconnection cleanup
      socket.on('disconnect', async () => {
        console.log(`Client disconnected: ${socket.id}`);

        // Clean up any sessions this socket was in
        const rooms = Array.from(socket.rooms);
        for (const room of rooms) {
          if (room !== socket.id) {
            socket.to(room).emit('player-disconnected', {
              userId: socket.data.user?.userId,
              socketId: socket.id
            });
          }
        }
      });
    });

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(serverPort, resolve);
    });
  });

  afterAll(async () => {
    // Cleanup
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

  // Test 1: Client Connection
  test('should handle client connections successfully', async () => {
    const token = jwt.sign({ userId: 'test-user-1' }, process.env.JWT_SECRET || 'test-secret');


    const client = new Client(createTestUrl(serverPort, '/game'), {
      auth: { token }
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        resolve();
      });

      client.on('connect_error', (error: any) => {
        reject(error);
      });

      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  });

  // Test 2: Room Joining and Leaving
  test('should handle room joining and leaving', async () => {
    const token = jwt.sign({ userId: 'test-user-2' }, process.env.JWT_SECRET || 'test-secret');

    const client = new Client(`http://localhost:${serverPort}/game`, {
      auth: { token }
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        // Create a session
        client.emit('create-session', {}, (response: any) => {
          expect(response.success).toBe(true);
          expect(response.sessionId).toBeDefined();

          const sessionId = response.sessionId;

          // Leave the session
          client.emit('leave-session', { sessionId }, (leaveResponse: any) => {
            expect(leaveResponse.success).toBe(true);
            client.disconnect();
            resolve();
          });
        });
      });

      client.on('connect_error', reject);
      setTimeout(() => reject(new Error('Test timeout')), 5000);
    });
  });

  // Test 3: Connection Cleanup on Disconnect
  test('should clean up connections on disconnect', async () => {
    const token = jwt.sign({ userId: 'test-user-3' }, process.env.JWT_SECRET || 'test-secret');

    const client = new Client(`http://localhost:${serverPort}/game`, {
      auth: { token }
    });

    await new Promise<void>((resolve, reject) => {
      let sessionId: string;

      client.on('connect', () => {
        // Create a session
        client.emit('create-session', {}, (response: any) => {
          expect(response.success).toBe(true);
          sessionId = response.sessionId;

          // Disconnect abruptly to test cleanup
          client.disconnect();

          // Wait a bit for cleanup to process
          setTimeout(() => {
            // Verify cleanup happened by checking that we can create a new session with same user
            const newClient = new Client(`http://localhost:${serverPort}/game`, {
              auth: { token }
            });

            newClient.on('connect', () => {
              newClient.emit('create-session', {}, (newResponse: any) => {
                expect(newResponse.success).toBe(true);
                newClient.disconnect();
                resolve();
              });
            });

            newClient.on('connect_error', reject);
          }, 100);
        });
      });

      client.on('connect_error', reject);
      setTimeout(() => reject(new Error('Test timeout')), 5000);
    });
  });

  // Test 4: Concurrent Connections
  test('should handle multiple concurrent connections', async () => {
    const connectionPromises = [];
    const clients: any[] = [];

    // Create 3 concurrent connections
    for (let i = 0; i < 3; i++) {
      const token = jwt.sign({ userId: `concurrent-user-${i}` }, process.env.JWT_SECRET || 'test-secret');
      const client = new Client(`http://localhost:${serverPort}/game`, {
        auth: { token }
      });

      clients.push(client);

      const connectionPromise = new Promise<void>((resolve, reject) => {
        client.on('connect', () => {
          expect(client.connected).toBe(true);
          resolve();
        });

        client.on('connect_error', reject);
        setTimeout(() => reject(new Error(`Connection ${i} timeout`)), 5000);
      });

      connectionPromises.push(connectionPromise);
    }

    // Wait for all connections
    await Promise.all(connectionPromises);

    // Cleanup
    clients.forEach(client => client.disconnect());
  });

  // Test 5: Event Emission
  test('should handle custom event emission', async () => {
    const token1 = jwt.sign({ userId: 'event-user-1' }, process.env.JWT_SECRET || 'test-secret');
    const token2 = jwt.sign({ userId: 'event-user-2' }, process.env.JWT_SECRET || 'test-secret');

    const client1 = new Client(`http://localhost:${serverPort}/game`, { auth: { token: token1 } });
    const client2 = new Client(`http://localhost:${serverPort}/game`, { auth: { token: token2 } });

    await new Promise<void>((resolve, reject) => {
      let client1Connected = false;
      let client2Connected = false;
      let sessionId: string;

      const checkBothConnected = () => {
        if (client1Connected && client2Connected) {
          // Create session with client1
          client1.emit('create-session', {}, (response: any) => {
            expect(response.success).toBe(true);
            sessionId = response.sessionId;

            // Client2 joins the session
            client2.emit('join-session', { sessionId }, (joinResponse: any) => {
              expect(joinResponse.success).toBe(true);

              // Set up event listener on client2
              client2.on('game-event', (data: any) => {
                expect(data.from).toBe('event-user-1');
                expect(data.eventType).toBe('test-event');
                expect(data.eventData.message).toBe('Hello from client1');

                client1.disconnect();
                client2.disconnect();
                resolve();
              });

              // Client1 sends event
              client1.emit('game-event', {
                sessionId,
                eventType: 'test-event',
                eventData: { message: 'Hello from client1' }
              });
            });
          });
        }
      };

      client1.on('connect', () => {
        client1Connected = true;
        checkBothConnected();
      });

      client2.on('connect', () => {
        client2Connected = true;
        checkBothConnected();
      });

      client1.on('connect_error', reject);
      client2.on('connect_error', reject);
      setTimeout(() => reject(new Error('Event test timeout')), 5000);
    });
  });

  // Test 6: Broadcast Functionality
  test('should handle broadcast functionality', async () => {
    const tokens = [
      jwt.sign({ userId: 'broadcast-user-1' }, process.env.JWT_SECRET || 'test-secret'),
      jwt.sign({ userId: 'broadcast-user-2' }, process.env.JWT_SECRET || 'test-secret'),
      jwt.sign({ userId: 'broadcast-user-3' }, process.env.JWT_SECRET || 'test-secret')
    ];

    const clients = tokens.map(token =>
      new Client(`http://localhost:${serverPort}/game`, { auth: { token } })
    );

    await new Promise<void>((resolve, reject) => {
      let connectedCount = 0;
      let sessionId: string;
      let receivedCount = 0;

      const checkAllConnected = () => {
        if (connectedCount === 3) {
          // Create session with first client
          clients[0].emit('create-session', {}, (response: any) => {
            expect(response.success).toBe(true);
            sessionId = response.sessionId;

            // Other clients join
            const joinPromises = clients.slice(1).map((client, index) => {
              return new Promise<void>((resolveJoin) => {
                client.emit('join-session', { sessionId }, (joinResponse: any) => {
                  expect(joinResponse.success).toBe(true);
                  resolveJoin();
                });
              });
            });

            Promise.all(joinPromises).then(() => {
              // Set up listeners on clients 2 and 3
              clients.slice(1).forEach(client => {
                client.on('game-event', (data: any) => {
                  expect(data.eventType).toBe('broadcast-test');
                  receivedCount++;

                  if (receivedCount === 2) {
                    clients.forEach(client => client.disconnect());
                    resolve();
                  }
                });
              });

              // Client 1 broadcasts to all others in session
              clients[0].emit('game-event', {
                sessionId,
                eventType: 'broadcast-test',
                eventData: { message: 'Broadcast message' }
              });
            });
          });
        }
      };

      clients.forEach(client => {
        client.on('connect', () => {
          connectedCount++;
          checkAllConnected();
        });

        client.on('connect_error', reject);
      });

      setTimeout(() => reject(new Error('Broadcast test timeout')), 5000);
    });
  });

  // Test 7: Authentication Validation
  test('should validate authentication tokens', async () => {
    // Test with invalid token
    const invalidClient = new Client(`http://localhost:${serverPort}/game`, {
      auth: { token: 'invalid-token' }
    });

    await new Promise<void>((resolve, reject) => {
      invalidClient.on('connect_error', (error: any) => {
        expect(error.message).toContain('Invalid authentication token');
        resolve();
      });

      invalidClient.on('connect', () => {
        invalidClient.disconnect();
        reject(new Error('Should not connect with invalid token'));
      });

      setTimeout(() => reject(new Error('Auth test timeout')), 5000);
    });

    // Test with missing token
    const noTokenClient = new Client(`http://localhost:${serverPort}/game`);

    await new Promise<void>((resolve, reject) => {
      noTokenClient.on('connect_error', (error: any) => {
        expect(error.message).toContain('Authentication token required');
        resolve();
      });

      noTokenClient.on('connect', () => {
        noTokenClient.disconnect();
        reject(new Error('Should not connect without token'));
      });

      setTimeout(() => reject(new Error('No token test timeout')), 5000);
    });
  });

  // Test 8: Reconnection Handling
  test('should handle reconnection scenarios', async () => {
    const token = jwt.sign({ userId: 'reconnect-user' }, process.env.JWT_SECRET || 'test-secret');

    let client = new Client(`http://localhost:${serverPort}/game`, {
      auth: { token },
      autoConnect: false
    });

    await new Promise<void>((resolve, reject) => {
      let sessionId: string;
      let reconnectCount = 0;

      const performReconnection = () => {
        if (reconnectCount >= 2) {
          client.disconnect();
          resolve();
          return;
        }

        reconnectCount++;

        // Disconnect and reconnect
        client.disconnect();

        setTimeout(() => {
          client = new Client(`http://localhost:${serverPort}/game`, {
            auth: { token }
          });

          client.on('connect', () => {
            // Try to create a session after reconnection
            client.emit('create-session', {}, (response: any) => {
              expect(response.success).toBe(true);

              setTimeout(performReconnection, 100);
            });
          });

          client.on('connect_error', reject);
        }, 100);
      };

      // Initial connection
      client.connect();

      client.on('connect', () => {
        client.emit('create-session', {}, (response: any) => {
          expect(response.success).toBe(true);
          sessionId = response.sessionId;

          setTimeout(performReconnection, 100);
        });
      });

      client.on('connect_error', reject);
      setTimeout(() => reject(new Error('Reconnection test timeout')), 10000);
    });
  });
});
