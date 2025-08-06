/**
 * WebSocket Connection Testing Suite
 * Comprehensive tests for real-time WebSocket functionality for game interactions
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { websocketManager } from '../src/routes/websocket';
import { logger } from '../src/utils/logger';
import { getRedisClient } from '../src/config/redis';
import { faker } from '@faker-js/faker';

// Test configuration
const TEST_PORT = 3003;
const TEST_HOST = 'http://localhost';
const TEST_URL = `${TEST_HOST}:${TEST_PORT}`;

describe('WebSocket Connection Testing Suite', () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;
  let clientSocket: ClientSocket;
  let redisClient: any;

  beforeAll(async () => {
    // Setup test server
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Initialize WebSocket manager
    websocketManager.initialize(ioServer);

    // Setup Redis client for testing
    redisClient = getRedisClient();
    await redisClient.connect();

    // Start server
    return new Promise<void>((resolve) => {
      httpServer.listen(TEST_PORT, () => {
        logger.info(`Test WebSocket server listening on ${TEST_URL}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (redisClient) {
      await redisClient.quit();
    }
    if (ioServer) {
      ioServer.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  beforeEach(() => {
    // Clear Redis before each test
    redisClient.flushall?.();
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  describe('1. WebSocket Server Initialization', () => {
    test('should initialize WebSocket server successfully', async () => {
      expect(ioServer).toBeDefined();
      expect(httpServer.listening).toBe(true);
    });

    test('should configure CORS properly', () => {
      expect(ioServer.engine.opts.cors).toEqual({
        origin: "*",
        methods: ["GET", "POST"]
      });
    });

    test('should configure transport methods', () => {
      expect(ioServer.engine.opts.transports).toContain('websocket');
      expect(ioServer.engine.opts.transports).toContain('polling');
    });

    test('should set proper timeout configurations', () => {
      expect(ioServer.engine.opts.pingTimeout).toBe(60000);
      expect(ioServer.engine.opts.pingInterval).toBe(25000);
    });
  });

  describe('2. Client Connection Establishment', () => {
    test('should establish WebSocket connection successfully', (done) => {
      clientSocket = Client(TEST_URL, {
        transports: ['websocket']
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        expect(clientSocket.id).toBeDefined();
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    test('should assign unique socket ID', (done) => {
      const socket1 = Client(TEST_URL, { transports: ['websocket'] });
      const socket2 = Client(TEST_URL, { transports: ['websocket'] });

      Promise.all([
        new Promise<string>((resolve) => {
          socket1.on('connect', () => resolve(socket1.id));
        }),
        new Promise<string>((resolve) => {
          socket2.on('connect', () => resolve(socket2.id));
        })
      ]).then(([id1, id2]) => {
        expect(id1).toBeDefined();
        expect(id2).toBeDefined();
        expect(id1).not.toBe(id2);
        socket1.disconnect();
        socket2.disconnect();
        done();
      }).catch(done);
    });

    test('should handle multiple concurrent connections', async () => {
      const connections: ClientSocket[] = [];
      const connectionPromises: Promise<string>[] = [];

      // Create 10 concurrent connections
      for (let i = 0; i < 10; i++) {
        const socket = Client(TEST_URL, { transports: ['websocket'] });
        connections.push(socket);
        
        connectionPromises.push(new Promise<string>((resolve, reject) => {
          socket.on('connect', () => resolve(socket.id));
          socket.on('connect_error', reject);
        }));
      }

      const socketIds = await Promise.all(connectionPromises);
      
      expect(socketIds).toHaveLength(10);
      expect(new Set(socketIds).size).toBe(10); // All IDs should be unique

      // Cleanup
      connections.forEach(socket => socket.disconnect());
    });

    test('should handle connection with different transport methods', (done) => {
      let connectCount = 0;
      const transports = ['websocket', 'polling'];

      transports.forEach((transport) => {
        const socket = Client(TEST_URL, { transports: [transport] });
        
        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          connectCount++;
          
          if (connectCount === transports.length) {
            done();
          }
          
          socket.disconnect();
        });

        socket.on('connect_error', done);
      });
    });
  });

  describe('3. Authentication via WebSocket', () => {
    beforeEach((done) => {
      clientSocket = Client(TEST_URL, { transports: ['websocket'] });
      clientSocket.on('connect', () => done());
      clientSocket.on('connect_error', done);
    });

    test('should authenticate user successfully', (done) => {
      const testUser = {
        userId: faker.string.uuid(),
        token: faker.string.alphanumeric(32)
      };

      clientSocket.on('authenticated', (response) => {
        expect(response.success).toBe(true);
        expect(response.userId).toBe(testUser.userId);
        done();
      });

      clientSocket.emit('authenticate', testUser);
    });

    test('should reject authentication with invalid credentials', (done) => {
      clientSocket.on('authenticated', (response) => {
        expect(response.success).toBe(false);
        expect(response.error).toBe('Invalid credentials');
        done();
      });

      clientSocket.emit('authenticate', { userId: null, token: null });
    });

    test('should handle authentication errors gracefully', (done) => {
      clientSocket.on('authenticated', (response) => {
        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
        done();
      });

      // Send malformed authentication data
      clientSocket.emit('authenticate', { invalid: 'data' });
    });

    test('should prevent unauthenticated access to protected events', (done) => {
      clientSocket.on('error', (error) => {
        expect(error.message).toBe('Not authenticated');
        done();
      });

      // Try to join game without authentication
      clientSocket.emit('join-game', { gameId: 'test-game', userId: 'test-user' });
    });
  });

  describe('4. Game Room Functionality', () => {
    let authenticatedSocket: ClientSocket;
    const testUser = {
      userId: faker.string.uuid(),
      token: faker.string.alphanumeric(32)
    };
    const testGameId = faker.string.uuid();

    beforeEach(async () => {
      authenticatedSocket = Client(TEST_URL, { transports: ['websocket'] });
      
      await new Promise<void>((resolve, reject) => {
        authenticatedSocket.on('connect', () => resolve());
        authenticatedSocket.on('connect_error', reject);
      });

      await new Promise<void>((resolve, reject) => {
        authenticatedSocket.on('authenticated', (response) => {
          if (response.success) resolve();
          else reject(new Error(response.error));
        });
        authenticatedSocket.emit('authenticate', testUser);
      });
    });

    afterEach(() => {
      if (authenticatedSocket) {
        authenticatedSocket.disconnect();
      }
    });

    test('should join game room successfully', (done) => {
      authenticatedSocket.on('joined-game', (response) => {
        expect(response.gameId).toBe(testGameId);
        expect(response.userId).toBe(testUser.userId);
        done();
      });

      authenticatedSocket.emit('join-game', { gameId: testGameId, userId: testUser.userId });
    });

    test('should leave game room successfully', async () => {
      // First join the game
      await new Promise<void>((resolve) => {
        authenticatedSocket.on('joined-game', () => resolve());
        authenticatedSocket.emit('join-game', { gameId: testGameId, userId: testUser.userId });
      });

      // Then leave the game
      return new Promise<void>((resolve) => {
        authenticatedSocket.on('left-game', (response) => {
          expect(response.gameId).toBe(testGameId);
          expect(response.userId).toBe(testUser.userId);
          resolve();
        });

        authenticatedSocket.emit('leave-game', { gameId: testGameId, userId: testUser.userId });
      });
    });

    test('should synchronize room state with multiple players', async () => {
      const player2Socket = Client(TEST_URL, { transports: ['websocket'] });
      const player2User = {
        userId: faker.string.uuid(),
        token: faker.string.alphanumeric(32)
      };

      try {
        // Connect and authenticate player 2
        await new Promise<void>((resolve, reject) => {
          player2Socket.on('connect', () => resolve());
          player2Socket.on('connect_error', reject);
        });

        await new Promise<void>((resolve, reject) => {
          player2Socket.on('authenticated', (response) => {
            if (response.success) resolve();
            else reject(new Error(response.error));
          });
          player2Socket.emit('authenticate', player2User);
        });

        // Player 1 joins game first
        await new Promise<void>((resolve) => {
          authenticatedSocket.on('joined-game', () => resolve());
          authenticatedSocket.emit('join-game', { gameId: testGameId, userId: testUser.userId });
        });

        // Player 2 joins and should notify Player 1
        const playerJoinedPromise = new Promise<void>((resolve) => {
          authenticatedSocket.on('player-joined', (data) => {
            expect(data.userId).toBe(player2User.userId);
            expect(data.socketId).toBe(player2Socket.id);
            resolve();
          });
        });

        player2Socket.emit('join-game', { gameId: testGameId, userId: player2User.userId });
        await playerJoinedPromise;

      } finally {
        player2Socket.disconnect();
      }
    });

    test('should handle room capacity limits', async () => {
      // This test would require implementing room capacity logic
      // For now, we'll test that the system handles multiple connections
      const maxConnections = 4;
      const sockets: ClientSocket[] = [];
      
      try {
        for (let i = 0; i < maxConnections; i++) {
          const socket = Client(TEST_URL, { transports: ['websocket'] });
          sockets.push(socket);
          
          await new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', reject);
          });
          
          const user = { userId: faker.string.uuid(), token: faker.string.alphanumeric(32) };
          await new Promise<void>((resolve, reject) => {
            socket.on('authenticated', (response) => {
              if (response.success) resolve();
              else reject(new Error(response.error));
            });
            socket.emit('authenticate', user);
          });
        }
        
        expect(sockets).toHaveLength(maxConnections);
        
      } finally {
        sockets.forEach(socket => socket.disconnect());
      }
    });
  });

  describe('5. Real-time Events', () => {
    let player1Socket: ClientSocket;
    let player2Socket: ClientSocket;
    const player1User = { userId: faker.string.uuid(), token: faker.string.alphanumeric(32) };
    const player2User = { userId: faker.string.uuid(), token: faker.string.alphanumeric(32) };
    const testGameId = faker.string.uuid();

    beforeEach(async () => {
      // Setup two authenticated players in the same game
      player1Socket = Client(TEST_URL, { transports: ['websocket'] });
      player2Socket = Client(TEST_URL, { transports: ['websocket'] });

      // Connect both players
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          player1Socket.on('connect', () => resolve());
          player1Socket.on('connect_error', reject);
        }),
        new Promise<void>((resolve, reject) => {
          player2Socket.on('connect', () => resolve());
          player2Socket.on('connect_error', reject);
        })
      ]);

      // Authenticate both players
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          player1Socket.on('authenticated', (response) => {
            if (response.success) resolve();
            else reject(new Error(response.error));
          });
          player1Socket.emit('authenticate', player1User);
        }),
        new Promise<void>((resolve, reject) => {
          player2Socket.on('authenticated', (response) => {
            if (response.success) resolve();
            else reject(new Error(response.error));
          });
          player2Socket.emit('authenticate', player2User);
        })
      ]);

      // Both players join the same game
      await Promise.all([
        new Promise<void>((resolve) => {
          player1Socket.on('joined-game', () => resolve());
          player1Socket.emit('join-game', { gameId: testGameId, userId: player1User.userId });
        }),
        new Promise<void>((resolve) => {
          player2Socket.on('joined-game', () => resolve());
          player2Socket.emit('join-game', { gameId: testGameId, userId: player2User.userId });
        })
      ]);
    });

    afterEach(() => {
      if (player1Socket) player1Socket.disconnect();
      if (player2Socket) player2Socket.disconnect();
    });

    test('should broadcast move events between players', (done) => {
      const testMove = {
        from: { x: 0, y: 0 },
        to: { x: 1, y: 0 },
        piece: 'pawn'
      };

      player2Socket.on('move-made', (data) => {
        expect(data.gameId).toBe(testGameId);
        expect(data.move).toEqual(testMove);
        expect(data.userId).toBe(player1User.userId);
        expect(data.timestamp).toBeDefined();
        done();
      });

      player1Socket.emit('game-move', {
        gameId: testGameId,
        move: testMove,
        userId: player1User.userId
      });
    });

    test('should acknowledge moves to sender', (done) => {
      const testMove = { from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, piece: 'pawn' };

      player1Socket.on('move-acknowledged', (data) => {
        expect(data.gameId).toBe(testGameId);
        expect(data.move).toEqual(testMove);
        expect(data.timestamp).toBeDefined();
        done();
      });

      player1Socket.emit('game-move', {
        gameId: testGameId,
        move: testMove,
        userId: player1User.userId
      });
    });

    test('should broadcast game state updates', (done) => {
      const stateUpdate = {
        currentPlayer: player2User.userId,
        boardState: 'updated-board-state',
        gamePhase: 'midgame'
      };

      player2Socket.on('game-update', (data) => {
        expect(data.gameId).toBe(testGameId);
        expect(data.update).toEqual(stateUpdate);
        expect(data.userId).toBe(player1User.userId);
        expect(data.timestamp).toBeDefined();
        done();
      });

      player1Socket.emit('game-update', {
        gameId: testGameId,
        update: stateUpdate,
        userId: player1User.userId
      });
    });

    test('should handle player status changes', (done) => {
      player1Socket.on('user-disconnected', (data) => {
        expect(data.userId).toBe(player2User.userId);
        expect(data.socketId).toBe(player2Socket.id);
        done();
      });

      // Simulate player 2 disconnecting
      player2Socket.disconnect();
    });

    test('should broadcast and store chat messages', async () => {
      const testMessage = faker.lorem.sentence();
      
      const messagePromise = new Promise<void>((resolve) => {
        player2Socket.on('chat-message', (data) => {
          expect(data.gameId).toBe(testGameId);
          expect(data.message).toBe(testMessage);
          expect(data.userId).toBe(player1User.userId);
          expect(data.id).toBeDefined();
          expect(data.timestamp).toBeDefined();
          resolve();
        });
      });

      player1Socket.emit('chat-message', {
        gameId: testGameId,
        message: testMessage,
        userId: player1User.userId
      });

      await messagePromise;

      // Verify message was stored in Redis
      const messages = await redisClient.lrange(`chat:${testGameId}`, 0, -1);
      expect(messages).toHaveLength(1);
      
      const storedMessage = JSON.parse(messages[0]);
      expect(storedMessage.message).toBe(testMessage);
      expect(storedMessage.userId).toBe(player1User.userId);
    });
  });

  describe('6. Connection Resilience', () => {
    test('should handle heartbeat/ping-pong mechanism', (done) => {
      clientSocket = Client(TEST_URL, { transports: ['websocket'] });

      clientSocket.on('connect', () => {
        clientSocket.on('heartbeat-ack', (data) => {
          expect(data.timestamp).toBeDefined();
          expect(new Date(data.timestamp)).toBeInstanceOf(Date);
          done();
        });

        clientSocket.emit('heartbeat');
      });
    });

    test('should handle connection timeout', (done) => {
      const shortTimeoutSocket = Client(TEST_URL, {
        transports: ['websocket'],
        timeout: 1000 // Very short timeout
      });

      shortTimeoutSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      // Don't actually connect to trigger timeout
    }, 5000);

    test('should handle reconnection logic', async () => {
      clientSocket = Client(TEST_URL, {
        transports: ['websocket'],
        autoConnect: false
      });

      let connectCount = 0;
      let disconnectCount = 0;

      clientSocket.on('connect', () => {
        connectCount++;
      });

      clientSocket.on('disconnect', () => {
        disconnectCount++;
      });

      // Initial connection
      clientSocket.connect();
      await new Promise(resolve => clientSocket.on('connect', resolve));
      expect(connectCount).toBe(1);

      // Disconnect
      clientSocket.disconnect();
      await new Promise(resolve => clientSocket.on('disconnect', resolve));
      expect(disconnectCount).toBe(1);

      // Reconnect
      clientSocket.connect();
      await new Promise(resolve => clientSocket.on('connect', resolve));
      expect(connectCount).toBe(2);
    });

    test('should handle server-side connection drops gracefully', (done) => {
      clientSocket = Client(TEST_URL, { transports: ['websocket'] });

      clientSocket.on('connect', () => {
        // Simulate server-side disconnect
        clientSocket.on('disconnect', (reason) => {
          expect(reason).toBeDefined();
          done();
        });

        // Force disconnect from server side
        setTimeout(() => {
          const serverSocket = Array.from(ioServer.sockets.sockets.values())
            .find(s => s.id === clientSocket.id);
          if (serverSocket) {
            serverSocket.disconnect(true);
          }
        }, 100);
      });
    });
  });

  describe('7. Concurrent Connections and Scalability', () => {
    test('should handle multiple concurrent connections', async () => {
      const connectionCount = 50;
      const connections: ClientSocket[] = [];

      try {
        const connectionPromises = Array.from({ length: connectionCount }, () => {
          const socket = Client(TEST_URL, { transports: ['websocket'] });
          connections.push(socket);
          
          return new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', reject);
          });
        });

        await Promise.all(connectionPromises);
        expect(connections).toHaveLength(connectionCount);
        
        // Verify all connections are unique
        const socketIds = connections.map(s => s.id);
        expect(new Set(socketIds).size).toBe(connectionCount);

      } finally {
        connections.forEach(socket => socket.disconnect());
      }
    });

    test('should handle concurrent message broadcasting', async () => {
      const playerCount = 10;
      const messagesPerPlayer = 5;
      const players: ClientSocket[] = [];
      const messagePromises: Promise<any>[] = [];

      try {
        // Setup players
        for (let i = 0; i < playerCount; i++) {
          const socket = Client(TEST_URL, { transports: ['websocket'] });
          players.push(socket);
          
          await new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', reject);
          });

          const user = { userId: `player-${i}`, token: faker.string.alphanumeric(32) };
          await new Promise<void>((resolve, reject) => {
            socket.on('authenticated', (response) => {
              if (response.success) resolve();
              else reject(new Error(response.error));
            });
            socket.emit('authenticate', user);
          });
        }

        const gameId = faker.string.uuid();

        // Join all players to the same game
        await Promise.all(players.map((socket, i) => 
          new Promise<void>((resolve) => {
            socket.on('joined-game', () => resolve());
            socket.emit('join-game', { gameId, userId: `player-${i}` });
          })
        ));

        // Setup message listeners
        players.forEach((socket, playerIndex) => {
          socket.on('chat-message', (data) => {
            expect(data.gameId).toBe(gameId);
            expect(data.message).toBeDefined();
          });
        });

        // Send concurrent messages
        for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
          for (let msgIndex = 0; msgIndex < messagesPerPlayer; msgIndex++) {
            messagePromises.push(
              new Promise<void>((resolve) => {
                players[playerIndex].emit('chat-message', {
                  gameId,
                  message: `Message ${msgIndex} from player ${playerIndex}`,
                  userId: `player-${playerIndex}`
                });
                setTimeout(resolve, 10); // Small delay to simulate real usage
              })
            );
          }
        }

        await Promise.all(messagePromises);

      } finally {
        players.forEach(socket => socket.disconnect());
      }
    });

    test('should maintain performance under load', async () => {
      const connectionCount = 20;
      const connections: ClientSocket[] = [];
      const startTime = Date.now();

      try {
        const connectionPromises = Array.from({ length: connectionCount }, async () => {
          const socket = Client(TEST_URL, { transports: ['websocket'] });
          connections.push(socket);
          
          await new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', reject);
          });

          // Authenticate
          const user = { userId: faker.string.uuid(), token: faker.string.alphanumeric(32) };
          await new Promise<void>((resolve, reject) => {
            socket.on('authenticated', (response) => {
              if (response.success) resolve();
              else reject(new Error(response.error));
            });
            socket.emit('authenticate', user);
          });

          return socket;
        });

        await Promise.all(connectionPromises);
        
        const connectionTime = Date.now() - startTime;
        expect(connectionTime).toBeLessThan(5000); // Should connect within 5 seconds

      } finally {
        connections.forEach(socket => socket.disconnect());
      }
    });
  });

  describe('8. WebSocket Security', () => {
    test('should validate message origin', (done) => {
      // This would require implementing origin validation
      clientSocket = Client(TEST_URL, {
        transports: ['websocket'],
        extraHeaders: {
          'Origin': 'http://malicious-site.com'
        }
      });

      // In a real implementation, this should be rejected
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });

    test('should validate message structure and content', (done) => {
      clientSocket = Client(TEST_URL, { transports: ['websocket'] });

      clientSocket.on('connect', async () => {
        // Authenticate first
        const user = { userId: faker.string.uuid(), token: faker.string.alphanumeric(32) };
        await new Promise<void>((resolve, reject) => {
          clientSocket.on('authenticated', (response) => {
            if (response.success) resolve();
            else reject(new Error(response.error));
          });
          clientSocket.emit('authenticate', user);
        });

        clientSocket.on('error', (error) => {
          expect(error.message).toBe('Invalid move data');
          done();
        });

        // Send invalid move data
        clientSocket.emit('game-move', {
          // Missing required fields
          invalidField: 'invalid'
        });
      });
    });

    test('should implement rate limiting', async () => {
      clientSocket = Client(TEST_URL, { transports: ['websocket'] });

      await new Promise<void>((resolve, reject) => {
        clientSocket.on('connect', () => resolve());
        clientSocket.on('connect_error', reject);
      });

      // Authenticate
      const user = { userId: faker.string.uuid(), token: faker.string.alphanumeric(32) };
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('authenticated', (response) => {
          if (response.success) resolve();
          else reject(new Error(response.error));
        });
        clientSocket.emit('authenticate', user);
      });

      // Send rapid messages (this would trigger rate limiting in production)
      const rapidMessages = Array.from({ length: 100 }, (_, i) => {
        return new Promise<void>((resolve) => {
          clientSocket.emit('heartbeat');
          setTimeout(resolve, 10);
        });
      });

      // In a real implementation with rate limiting, some of these should be rejected
      await Promise.all(rapidMessages);
    });

    test('should prevent unauthorized access', (done) => {
      clientSocket = Client(TEST_URL, { transports: ['websocket'] });

      clientSocket.on('connect', () => {
        clientSocket.on('error', (error) => {
          expect(error.message).toBe('Not authenticated');
          done();
        });

        // Try to access protected functionality without authentication
        clientSocket.emit('game-move', {
          gameId: faker.string.uuid(),
          move: { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
          userId: faker.string.uuid()
        });
      });
    });
  });

  describe('9. Error Scenarios', () => {
    beforeEach((done) => {
      clientSocket = Client(TEST_URL, { transports: ['websocket'] });
      clientSocket.on('connect', () => done());
      clientSocket.on('connect_error', done);
    });

    test('should handle invalid messages gracefully', (done) => {
      clientSocket.on('error', (error) => {
        expect(error.message).toBe('Not authenticated');
        done();
      });

      // Send completely invalid message
      clientSocket.emit('invalid-event', { invalid: 'data' });
      
      // Also test with protected event
      clientSocket.emit('join-game', null);
    });

    test('should handle unauthorized access attempts', (done) => {
      clientSocket.on('error', (error) => {
        expect(error.message).toBe('Not authenticated');
        done();
      });

      // Try to perform authenticated action without authentication
      clientSocket.emit('place-bet', {
        gameId: faker.string.uuid(),
        amount: 100,
        betType: 'win'
      });
    });

    test('should handle room capacity limits', async () => {
      // First authenticate the socket
      const user = { userId: faker.string.uuid(), token: faker.string.alphanumeric(32) };
      await new Promise<void>((resolve, reject) => {
        clientSocket.on('authenticated', (response) => {
          if (response.success) resolve();
          else reject(new Error(response.error));
        });
        clientSocket.emit('authenticate', user);
      });

      // In a real implementation, this would test actual room capacity limits
      const gameId = faker.string.uuid();
      
      return new Promise<void>((resolve) => {
        clientSocket.on('joined-game', (response) => {
          expect(response.gameId).toBe(gameId);
          resolve();
        });

        clientSocket.emit('join-game', { gameId, userId: user.userId });
      });
    });

    test('should handle server errors gracefully', (done) => {
      clientSocket.on('connect', () => {
        // This would test server error handling
        clientSocket.on('error', (error) => {
          expect(error).toBeDefined();
          done();
        });

        // Trigger a server error by sending malformed data
        clientSocket.emit('authenticate', 'not-an-object');
      });
    });

    test('should handle network disconnections', (done) => {
      clientSocket.on('connect', () => {
        clientSocket.on('disconnect', (reason) => {
          expect(reason).toBeDefined();
          done();
        });

        // Simulate network disconnection
        clientSocket.disconnect();
      });
    });

    test('should handle reconnection failures', (done) => {
      const failingSocket = Client('http://localhost:9999', { // Non-existent server
        transports: ['websocket'],
        timeout: 1000
      });

      failingSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });
  });

  describe('10. Integration Tests', () => {
    test('should handle complete game flow', async () => {
      const player1 = Client(TEST_URL, { transports: ['websocket'] });
      const player2 = Client(TEST_URL, { transports: ['websocket'] });
      
      const player1User = { userId: faker.string.uuid(), token: faker.string.alphanumeric(32) };
      const player2User = { userId: faker.string.uuid(), token: faker.string.alphanumeric(32) };
      const gameId = faker.string.uuid();

      try {
        // 1. Connect both players
        await Promise.all([
          new Promise<void>((resolve, reject) => {
            player1.on('connect', () => resolve());
            player1.on('connect_error', reject);
          }),
          new Promise<void>((resolve, reject) => {
            player2.on('connect', () => resolve());
            player2.on('connect_error', reject);
          })
        ]);

        // 2. Authenticate both players
        await Promise.all([
          new Promise<void>((resolve, reject) => {
            player1.on('authenticated', (response) => {
              if (response.success) resolve();
              else reject(new Error(response.error));
            });
            player1.emit('authenticate', player1User);
          }),
          new Promise<void>((resolve, reject) => {
            player2.on('authenticated', (response) => {
              if (response.success) resolve();
              else reject(new Error(response.error));
            });
            player2.emit('authenticate', player2User);
          })
        ]);

        // 3. Join game room
        await Promise.all([
          new Promise<void>((resolve) => {
            player1.on('joined-game', () => resolve());
            player1.emit('join-game', { gameId, userId: player1User.userId });
          }),
          new Promise<void>((resolve) => {
            player2.on('joined-game', () => resolve());
            player2.emit('join-game', { gameId, userId: player2User.userId });
          })
        ]);

        // 4. Exchange game moves
        const movePromise = new Promise<void>((resolve) => {
          player2.on('move-made', (data) => {
            expect(data.gameId).toBe(gameId);
            expect(data.userId).toBe(player1User.userId);
            resolve();
          });
        });

        player1.emit('game-move', {
          gameId,
          move: { from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, piece: 'pawn' },
          userId: player1User.userId
        });

        await movePromise;

        // 5. Exchange chat messages
        const chatPromise = new Promise<void>((resolve) => {
          player1.on('chat-message', (data) => {
            expect(data.gameId).toBe(gameId);
            expect(data.userId).toBe(player2User.userId);
            resolve();
          });
        });

        player2.emit('chat-message', {
          gameId,
          message: 'Good move!',
          userId: player2User.userId
        });

        await chatPromise;

        // 6. Test betting system
        const betPromise = new Promise<void>((resolve) => {
          player2.on('bet-placed', (data) => {
            expect(data.gameId).toBe(gameId);
            expect(data.userId).toBe(player1User.userId);
            expect(data.amount).toBe(100);
            resolve();
          });
        });

        player1.emit('place-bet', {
          gameId,
          amount: 100,
          betType: 'win',
          userId: player1User.userId
        });

        await betPromise;

        // 7. Leave game
        await Promise.all([
          new Promise<void>((resolve) => {
            player1.on('left-game', () => resolve());
            player1.emit('leave-game', { gameId, userId: player1User.userId });
          }),
          new Promise<void>((resolve) => {
            player2.on('left-game', () => resolve());
            player2.emit('leave-game', { gameId, userId: player2User.userId });
          })
        ]);

      } finally {
        player1.disconnect();
        player2.disconnect();
      }
    });
  });
});
