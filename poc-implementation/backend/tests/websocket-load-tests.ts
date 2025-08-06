/**
 * WebSocket Load Testing and Performance Benchmarks
 * Tests WebSocket performance under various load conditions
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { websocketManager } from '../src/routes/websocket';
import { logger } from '../src/utils/logger';
import { faker } from '@faker-js/faker';

const LOAD_TEST_PORT = 3004;
const LOAD_TEST_URL = `http://localhost:${LOAD_TEST_PORT}`;

describe('WebSocket Load Testing Suite', () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;

  beforeAll(async () => {
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] },
      transports: ['websocket'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    websocketManager.initialize(ioServer);

    return new Promise<void>((resolve) => {
      httpServer.listen(LOAD_TEST_PORT, () => {
        logger.info(`Load test server listening on ${LOAD_TEST_URL}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (ioServer) ioServer.close();
    if (httpServer) httpServer.close();
  });

  describe('Connection Load Tests', () => {
    test('should handle 100 concurrent connections', async () => {
      const connectionCount = 100;
      const connections: ClientSocket[] = [];
      const startTime = Date.now();

      try {
        const connectionPromises = Array.from({ length: connectionCount }, () => {
          const socket = Client(LOAD_TEST_URL, { transports: ['websocket'] });
          connections.push(socket);
          
          return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Connection timeout'));
            }, 10000);

            socket.on('connect', () => {
              clearTimeout(timeout);
              resolve();
            });

            socket.on('connect_error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });
        });

        await Promise.all(connectionPromises);
        
        const connectionTime = Date.now() - startTime;
        
        expect(connections).toHaveLength(connectionCount);
        expect(connectionTime).toBeLessThan(15000); // Should complete within 15 seconds
        
        // Verify all connections are active
        const activeConnections = connections.filter(socket => socket.connected);
        expect(activeConnections).toHaveLength(connectionCount);

      } finally {
        connections.forEach(socket => socket.disconnect());
      }
    }, 30000);

    test('should handle rapid connection/disconnection cycles', async () => {
      const cycles = 50;
      const connectionTimes: number[] = [];
      
      for (let i = 0; i < cycles; i++) {
        const startTime = Date.now();
        
        const socket = Client(LOAD_TEST_URL, { transports: ['websocket'] });
        
        await new Promise<void>((resolve, reject) => {
          socket.on('connect', () => {
            connectionTimes.push(Date.now() - startTime);
            socket.disconnect();
            resolve();
          });
          socket.on('connect_error', reject);
        });
        
        await new Promise<void>((resolve) => {
          socket.on('disconnect', () => resolve());
        });
      }
      
      const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      expect(avgConnectionTime).toBeLessThan(1000); // Average connection time should be under 1 second
    }, 60000);

    test('should maintain connection stability under load', async () => {
      const connectionCount = 25;
      const connections: ClientSocket[] = [];
      const testDuration = 10000; // 10 seconds

      try {
        // Establish connections
        const connectionPromises = Array.from({ length: connectionCount }, () => {
          const socket = Client(LOAD_TEST_URL, { transports: ['websocket'] });
          connections.push(socket);
          
          return new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', reject);
          });
        });

        await Promise.all(connectionPromises);

        // Monitor connections for stability
        const disconnections: string[] = [];
        connections.forEach(socket => {
          socket.on('disconnect', () => {
            disconnections.push(socket.id);
          });
        });

        // Wait for test duration
        await new Promise(resolve => setTimeout(resolve, testDuration));

        // Check that most connections remained stable
        const remainingConnections = connections.filter(socket => socket.connected);
        expect(remainingConnections.length / connectionCount).toBeGreaterThan(0.9); // 90% should remain connected

      } finally {
        connections.forEach(socket => socket.disconnect());
      }
    }, 15000);
  });

  describe('Message Broadcasting Load Tests', () => {
    test('should handle high-frequency message broadcasting', async () => {
      const playerCount = 20;
      const messagesPerPlayer = 25;
      const players: ClientSocket[] = [];
      let messagesReceived = 0;
      
      try {
        // Setup players
        for (let i = 0; i < playerCount; i++) {
          const socket = Client(LOAD_TEST_URL, { transports: ['websocket'] });
          players.push(socket);
          
          await new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', reject);
          });

          // Authenticate player
          const user = { userId: `load-test-player-${i}`, token: faker.string.alphanumeric(32) };
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
            socket.emit('join-game', { gameId, userId: `load-test-player-${i}` });
          })
        ));

        // Setup message listeners
        players.forEach(socket => {
          socket.on('chat-message', () => {
            messagesReceived++;
          });
        });

        const startTime = Date.now();

        // Send messages rapidly from all players
        const messagePromises: Promise<void>[] = [];
        
        for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
          for (let msgIndex = 0; msgIndex < messagesPerPlayer; msgIndex++) {
            messagePromises.push(
              new Promise<void>((resolve) => {
                players[playerIndex].emit('chat-message', {
                  gameId,
                  message: `Load test message ${msgIndex} from player ${playerIndex}`,
                  userId: `load-test-player-${playerIndex}`
                });
                // Small delay to prevent overwhelming the server
                setTimeout(resolve, Math.random() * 50);
              })
            );
          }
        }

        await Promise.all(messagePromises);
        
        // Wait for message propagation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const totalTime = Date.now() - startTime;
        const expectedMessages = playerCount * messagesPerPlayer * (playerCount - 1); // Each message received by all other players
        
        expect(messagesReceived).toBeGreaterThan(expectedMessages * 0.8); // At least 80% of messages should be delivered
        expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds

      } finally {
        players.forEach(socket => socket.disconnect());
      }
    }, 45000);

    test('should handle simultaneous room operations', async () => {
      const roomCount = 10;
      const playersPerRoom = 5;
      const allPlayers: ClientSocket[] = [];
      
      try {
        // Create players for multiple rooms
        for (let roomIndex = 0; roomIndex < roomCount; roomIndex++) {
          for (let playerIndex = 0; playerIndex < playersPerRoom; playerIndex++) {
            const socket = Client(LOAD_TEST_URL, { transports: ['websocket'] });
            allPlayers.push(socket);
            
            await new Promise<void>((resolve, reject) => {
              socket.on('connect', () => resolve());
              socket.on('connect_error', reject);
            });

            const user = { 
              userId: `room-${roomIndex}-player-${playerIndex}`, 
              token: faker.string.alphanumeric(32) 
            };
            
            await new Promise<void>((resolve, reject) => {
              socket.on('authenticated', (response) => {
                if (response.success) resolve();
                else reject(new Error(response.error));
              });
              socket.emit('authenticate', user);
            });
          }
        }

        // Join players to their respective rooms simultaneously
        const joinPromises: Promise<void>[] = [];
        
        for (let roomIndex = 0; roomIndex < roomCount; roomIndex++) {
          const gameId = `load-test-game-${roomIndex}`;
          
          for (let playerIndex = 0; playerIndex < playersPerRoom; playerIndex++) {
            const socketIndex = roomIndex * playersPerRoom + playerIndex;
            const socket = allPlayers[socketIndex];
            
            joinPromises.push(
              new Promise<void>((resolve) => {
                socket.on('joined-game', () => resolve());
                socket.emit('join-game', { 
                  gameId, 
                  userId: `room-${roomIndex}-player-${playerIndex}` 
                });
              })
            );
          }
        }

        const startTime = Date.now();
        await Promise.all(joinPromises);
        const joinTime = Date.now() - startTime;
        
        expect(joinTime).toBeLessThan(10000); // Should complete within 10 seconds

        // Test message broadcasting within rooms
        let messagesReceived = 0;
        allPlayers.forEach(socket => {
          socket.on('chat-message', () => messagesReceived++);
        });

        // Send one message from first player in each room
        for (let roomIndex = 0; roomIndex < roomCount; roomIndex++) {
          const socketIndex = roomIndex * playersPerRoom;
          const socket = allPlayers[socketIndex];
          
          socket.emit('chat-message', {
            gameId: `load-test-game-${roomIndex}`,
            message: `Message from room ${roomIndex}`,
            userId: `room-${roomIndex}-player-0`
          });
        }

        // Wait for message propagation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Each room should receive one message, seen by all other players in that room
        const expectedMessages = roomCount * (playersPerRoom - 1);
        expect(messagesReceived).toBeGreaterThan(expectedMessages * 0.8);

      } finally {
        allPlayers.forEach(socket => socket.disconnect());
      }
    }, 30000);
  });

  describe('Memory and Resource Usage Tests', () => {
    test('should not leak memory with many short-lived connections', async () => {
      const iterations = 50;
      const connectionsPerIteration = 10;
      
      const initialMemory = process.memoryUsage();
      
      for (let iteration = 0; iteration < iterations; iteration++) {
        const connections: ClientSocket[] = [];
        
        // Create connections
        const connectionPromises = Array.from({ length: connectionsPerIteration }, () => {
          const socket = Client(LOAD_TEST_URL, { transports: ['websocket'] });
          connections.push(socket);
          
          return new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', reject);
          });
        });

        await Promise.all(connectionPromises);
        
        // Immediately disconnect all connections
        connections.forEach(socket => socket.disconnect());
        
        await Promise.all(connections.map(socket => 
          new Promise<void>((resolve) => {
            socket.on('disconnect', () => resolve());
          })
        ));
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory usage should not increase dramatically (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
    }, 60000);

    test('should handle connection cleanup properly', async () => {
      const connectionCount = 30;
      const connections: ClientSocket[] = [];
      
      try {
        // Create connections
        for (let i = 0; i < connectionCount; i++) {
          const socket = Client(LOAD_TEST_URL, { transports: ['websocket'] });
          connections.push(socket);
          
          await new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', reject);
          });
        }

        // Verify all connections are tracked
        expect(websocketManager.getConnectionCount()).toBeGreaterThanOrEqual(connectionCount);

        // Disconnect half the connections
        const toDisconnect = connections.slice(0, Math.floor(connectionCount / 2));
        toDisconnect.forEach(socket => socket.disconnect());

        // Wait for disconnections to be processed
        await Promise.all(toDisconnect.map(socket => 
          new Promise<void>((resolve) => {
            socket.on('disconnect', () => resolve());
          })
        ));

        // Wait a bit for server-side cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check that connection count was updated
        expect(websocketManager.getConnectionCount()).toBeLessThan(connectionCount);

      } finally {
        connections.forEach(socket => socket.disconnect());
      }
    }, 15000);
  });

  describe('Performance Benchmarks', () => {
    test('should measure message latency under load', async () => {
      const playerCount = 10;
      const players: ClientSocket[] = [];
      const latencies: number[] = [];
      
      try {
        // Setup players
        for (let i = 0; i < playerCount; i++) {
          const socket = Client(LOAD_TEST_URL, { transports: ['websocket'] });
          players.push(socket);
          
          await new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', reject);
          });

          const user = { userId: `perf-player-${i}`, token: faker.string.alphanumeric(32) };
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
            socket.emit('join-game', { gameId, userId: `perf-player-${i}` });
          })
        ));

        // Measure message round-trip latency
        const messageCount = 100;
        const sender = players[0];
        const receiver = players[1];

        receiver.on('chat-message', (data) => {
          if (data.message.startsWith('latency-test-')) {
            const sentTime = parseInt(data.message.split('-')[2]);
            const latency = Date.now() - sentTime;
            latencies.push(latency);
          }
        });

        // Send messages and measure latency
        for (let i = 0; i < messageCount; i++) {
          const timestamp = Date.now();
          sender.emit('chat-message', {
            gameId,
            message: `latency-test-${timestamp}`,
            userId: 'perf-player-0'
          });
          
          // Small delay between messages
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Wait for all messages to be received
        await new Promise(resolve => setTimeout(resolve, 2000));

        expect(latencies.length).toBeGreaterThan(messageCount * 0.8); // At least 80% of messages should be received

        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const maxLatency = Math.max(...latencies);
        const minLatency = Math.min(...latencies);

        expect(avgLatency).toBeLessThan(100); // Average latency should be under 100ms
        expect(maxLatency).toBeLessThan(1000); // Max latency should be under 1 second

        logger.info('Latency benchmarks:', {
          avgLatency,
          maxLatency,
          minLatency,
          messageCount: latencies.length
        });

      } finally {
        players.forEach(socket => socket.disconnect());
      }
    }, 30000);

    test('should measure throughput under sustained load', async () => {
      const duration = 10000; // 10 seconds
      const playerCount = 8;
      const players: ClientSocket[] = [];
      let messagesSent = 0;
      let messagesReceived = 0;
      
      try {
        // Setup players
        for (let i = 0; i < playerCount; i++) {
          const socket = Client(LOAD_TEST_URL, { transports: ['websocket'] });
          players.push(socket);
          
          await new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', reject);
          });

          const user = { userId: `throughput-player-${i}`, token: faker.string.alphanumeric(32) };
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
            socket.emit('join-game', { gameId, userId: `throughput-player-${i}` });
          })
        ));

        // Setup message listeners
        players.forEach(socket => {
          socket.on('chat-message', () => messagesReceived++);
        });

        // Send messages continuously for the duration
        const startTime = Date.now();
        const sendMessages = async () => {
          while (Date.now() - startTime < duration) {
            const randomPlayer = players[Math.floor(Math.random() * players.length)];
            const playerIndex = players.indexOf(randomPlayer);
            
            randomPlayer.emit('chat-message', {
              gameId,
              message: `Throughput test message ${messagesSent}`,
              userId: `throughput-player-${playerIndex}`
            });
            
            messagesSent++;
            await new Promise(resolve => setTimeout(resolve, 50)); // 20 messages per second per player
          }
        };

        await sendMessages();

        // Wait for remaining messages to be received
        await new Promise(resolve => setTimeout(resolve, 2000));

        const actualDuration = Date.now() - startTime;
        const messagesPerSecond = messagesSent / (actualDuration / 1000);
        const throughput = messagesReceived / (actualDuration / 1000);

        expect(messagesPerSecond).toBeGreaterThan(10); // Should send at least 10 messages per second
        expect(throughput).toBeGreaterThan(50); // Should receive at least 50 messages per second

        logger.info('Throughput benchmarks:', {
          messagesSent,
          messagesReceived,
          messagesPerSecond,
          throughput,
          duration: actualDuration
        });

      } finally {
        players.forEach(socket => socket.disconnect());
      }
    }, 20000);
  });

  describe('Stress Tests', () => {
    test('should handle burst traffic', async () => {
      const burstSize = 50;
      const connections: ClientSocket[] = [];
      
      try {
        // Create burst of connections as quickly as possible
        const connectionPromises = Array.from({ length: burstSize }, () => {
          const socket = Client(LOAD_TEST_URL, { 
            transports: ['websocket'],
            timeout: 5000
          });
          connections.push(socket);
          
          return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Connection timeout'));
            }, 5000);

            socket.on('connect', () => {
              clearTimeout(timeout);
              resolve();
            });

            socket.on('connect_error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });
        });

        const startTime = Date.now();
        await Promise.all(connectionPromises);
        const connectionTime = Date.now() - startTime;

        // All connections should succeed
        expect(connections).toHaveLength(burstSize);
        expect(connections.filter(s => s.connected)).toHaveLength(burstSize);
        
        // Should handle burst reasonably quickly
        expect(connectionTime).toBeLessThan(10000);

        // Test immediate message sending after connection
        let messagesReceived = 0;
        connections.forEach(socket => {
          socket.on('heartbeat-ack', () => messagesReceived++);
        });

        // Send heartbeat from all connections immediately
        connections.forEach(socket => {
          socket.emit('heartbeat');
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        expect(messagesReceived).toBeGreaterThan(burstSize * 0.8);

      } finally {
        connections.forEach(socket => socket.disconnect());
      }
    }, 15000);

    test('should recover from server overload', async () => {
      const overloadSize = 100;
      const connections: ClientSocket[] = [];
      let successfulConnections = 0;
      let failedConnections = 0;
      
      try {
        // Attempt to create many connections simultaneously
        const connectionPromises = Array.from({ length: overloadSize }, () => {
          const socket = Client(LOAD_TEST_URL, { 
            transports: ['websocket'],
            timeout: 3000
          });
          connections.push(socket);
          
          return new Promise<void>((resolve) => {
            socket.on('connect', () => {
              successfulConnections++;
              resolve();
            });

            socket.on('connect_error', () => {
              failedConnections++;
              resolve();
            });

            // Force timeout
            setTimeout(() => {
              if (!socket.connected) {
                failedConnections++;
                resolve();
              }
            }, 3000);
          });
        });

        await Promise.all(connectionPromises);

        // Some connections might fail under extreme load, but most should succeed
        expect(successfulConnections + failedConnections).toBe(overloadSize);
        expect(successfulConnections).toBeGreaterThan(overloadSize * 0.5); // At least 50% should succeed

        logger.info('Overload test results:', {
          attempted: overloadSize,
          successful: successfulConnections,
          failed: failedConnections,
          successRate: (successfulConnections / overloadSize) * 100
        });

      } finally {
        connections.forEach(socket => socket.disconnect());
      }
    }, 20000);
  });
});
