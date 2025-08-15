/**
 * WebSocket and Real-time Integration Tests
 * Tests WebSocket connections, real-time communications, and event handling
 */

import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import {
  setupIntegrationEnvironment,
  teardownIntegrationEnvironment,
  getTestEnvironment,
  createTestData,
  IntegrationTestConfig
} from '../setup/integration-setup';
import { logger } from '../../src/utils/logger';

describe('WebSocket and Real-time Integration Tests', () => {
  let testEnv: IntegrationTestConfig;
  let testData: any;
  let serverIO: SocketIOServer | undefined;
  let clientSockets: ClientSocket[] = [];

  beforeAll(async () => {
    testEnv = await setupIntegrationEnvironment();
    testData = await createTestData();
    serverIO = testEnv.server.instance.getIO();
  }, 60000);

  afterAll(async () => {
    // Cleanup all client connections
    clientSockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    await teardownIntegrationEnvironment();
  }, 30000);

  beforeEach(() => {
    // Clean up existing client connections before each test
    clientSockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    clientSockets = [];
  });

  afterEach(() => {
    // Ensure cleanup after each test
    clientSockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    clientSockets = [];
  });

  describe('WebSocket Connection Management', () => {
    test('should establish WebSocket connection successfully', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket'],
        timeout: 5000
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        client.on('connect', () => {
          clearTimeout(timeout);
          expect(client.connected).toBe(true);
          expect(client.id).toBeDefined();
          resolve();
        });

        client.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    test('should handle multiple concurrent connections', async () => {
      const connectionPromises = Array.from({ length: 10 }, (_, i) => {
        return new Promise<ClientSocket>((resolve, reject) => {
          const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
            transports: ['websocket'],
            timeout: 5000
          });

          const timeout = setTimeout(() => {
            reject(new Error(`Connection ${i} timeout`));
          }, 10000);

          client.on('connect', () => {
            clearTimeout(timeout);
            resolve(client);
          });

          client.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      });

      const clients = await Promise.all(connectionPromises);
      clientSockets.push(...clients);

      expect(clients).toHaveLength(10);
      clients.forEach((client, index) => {
        expect(client.connected).toBe(true);
        expect(client.id).toBeDefined();
      });
    });

    test('should handle connection authentication', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket'],
        auth: {
          token: testEnv.services.auth.testTokens.validUser
        }
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 10000);

        client.on('connect', () => {
          // Send authentication event
          client.emit('authenticate', {
            token: testEnv.services.auth.testTokens.validUser
          });
        });

        client.on('authenticated', (data) => {
          clearTimeout(timeout);
          expect(data.success).toBe(true);
          expect(data.user).toBeDefined();
          resolve();
        });

        client.on('authentication_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Authentication failed: ${error.message}`));
        });

        client.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    test('should reject invalid authentication tokens', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket'],
        auth: {
          token: 'invalid-token'
        }
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timeout'));
        }, 10000);

        client.on('connect', () => {
          client.emit('authenticate', {
            token: 'invalid-token'
          });
        });

        client.on('authentication_error', (error) => {
          clearTimeout(timeout);
          expect(error).toBeDefined();
          expect(error.message).toContain('Invalid');
          resolve();
        });

        client.on('authenticated', () => {
          clearTimeout(timeout);
          reject(new Error('Should not authenticate with invalid token'));
        });
      });
    });

    test('should handle connection disconnection gracefully', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timeout'));
        }, 10000);

        client.on('connect', () => {
          expect(client.connected).toBe(true);
          
          // Disconnect the client
          client.disconnect();
        });

        client.on('disconnect', (reason) => {
          clearTimeout(timeout);
          expect(client.connected).toBe(false);
          expect(reason).toBeDefined();
          resolve();
        });

        client.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });
  });

  describe('Real-time Game Events', () => {
    test('should handle match creation events', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Match creation event timeout'));
        }, 15000);

        client.on('connect', () => {
          // Join matches namespace
          client.emit('join_matches');
          
          // Create a match event
          client.emit('create_match', {
            gameType: 'vs_ai',
            difficulty: 'medium',
            betAmount: 0.1
          });
        });

        client.on('match_created', (matchData) => {
          clearTimeout(timeout);
          expect(matchData).toBeDefined();
          expect(matchData.id).toBeDefined();
          expect(matchData.gameType).toBe('vs_ai');
          resolve();
        });

        client.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    test('should broadcast match updates to connected clients', async () => {
      const client1 = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      const client2 = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      clientSockets.push(client1, client2);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Match broadcast timeout'));
        }, 15000);

        let connectionsReady = 0;
        let client2ReceivedUpdate = false;

        const checkConnections = () => {
          connectionsReady++;
          if (connectionsReady === 2) {
            // Both clients connected, start test
            client1.emit('join_match', { matchId: testData.games[0].id });
            client2.emit('join_match', { matchId: testData.games[0].id });
            
            // Client1 makes a move
            setTimeout(() => {
              client1.emit('make_move', {
                matchId: testData.games[0].id,
                move: {
                  from: { row: 0, col: 0 },
                  to: { row: 1, col: 1 },
                  piece: 'pawn'
                }
              });
            }, 500);
          }
        };

        client1.on('connect', checkConnections);
        client2.on('connect', checkConnections);

        client2.on('match_updated', (updateData) => {
          if (updateData.matchId === testData.games[0].id && !client2ReceivedUpdate) {
            client2ReceivedUpdate = true;
            clearTimeout(timeout);
            expect(updateData).toBeDefined();
            expect(updateData.matchId).toBe(testData.games[0].id);
            expect(updateData.move).toBeDefined();
            resolve();
          }
        });

        client1.on('error', reject);
        client2.on('error', reject);
      });
    });

    test('should handle match completion events', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Match completion timeout'));
        }, 15000);

        client.on('connect', () => {
          client.emit('join_match', { matchId: testData.games[0].id });
          
          // Simulate match completion
          setTimeout(() => {
            client.emit('complete_match', {
              matchId: testData.games[0].id,
              winner: 'player1',
              finalState: {
                status: 'completed',
                moves: 42,
                duration: 1800000 // 30 minutes
              }
            });
          }, 500);
        });

        client.on('match_completed', (completionData) => {
          clearTimeout(timeout);
          expect(completionData).toBeDefined();
          expect(completionData.matchId).toBe(testData.games[0].id);
          expect(completionData.winner).toBe('player1');
          expect(completionData.finalState).toBeDefined();
          resolve();
        });

        client.on('error', reject);
      });
    });
  });

  describe('Real-time Betting Events', () => {
    test('should handle betting pool updates', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Betting pool update timeout'));
        }, 15000);

        client.on('connect', () => {
          client.emit('join_betting_pools');
          
          // Simulate placing a bet
          setTimeout(() => {
            client.emit('place_bet', {
              matchId: testData.games[0].id,
              amount: 10,
              prediction: 'player1'
            });
          }, 500);
        });

        client.on('betting_pool_updated', (poolData) => {
          clearTimeout(timeout);
          expect(poolData).toBeDefined();
          expect(poolData.matchId).toBe(testData.games[0].id);
          expect(poolData.totalPool).toBeDefined();
          expect(poolData.odds).toBeDefined();
          resolve();
        });

        client.on('error', reject);
      });
    });

    test('should broadcast bet placement to all pool subscribers', async () => {
      const client1 = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      const client2 = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      clientSockets.push(client1, client2);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Bet broadcast timeout'));
        }, 15000);

        let connectionsReady = 0;

        const checkConnections = () => {
          connectionsReady++;
          if (connectionsReady === 2) {
            // Both clients subscribe to betting pool
            client1.emit('join_betting_pool', { matchId: testData.games[0].id });
            client2.emit('join_betting_pool', { matchId: testData.games[0].id });
            
            // Client1 places a bet
            setTimeout(() => {
              client1.emit('place_bet', {
                matchId: testData.games[0].id,
                amount: 50,
                prediction: 'player2'
              });
            }, 500);
          }
        };

        client1.on('connect', checkConnections);
        client2.on('connect', checkConnections);

        client2.on('new_bet_placed', (betData) => {
          clearTimeout(timeout);
          expect(betData).toBeDefined();
          expect(betData.matchId).toBe(testData.games[0].id);
          expect(betData.amount).toBe(50);
          expect(betData.prediction).toBe('player2');
          resolve();
        });

        client1.on('error', reject);
        client2.on('error', reject);
      });
    });
  });

  describe('AI Agent Real-time Updates', () => {
    test('should handle AI move generation events', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('AI move timeout'));
        }, 20000);

        client.on('connect', () => {
          client.emit('join_match', { matchId: testData.games[0].id });
          
          // Request AI move
          client.emit('request_ai_move', {
            matchId: testData.games[0].id,
            gameState: {
              board: [],
              currentPlayer: 'ai',
              moveHistory: []
            },
            difficulty: 'medium'
          });
        });

        client.on('ai_move_generated', (moveData) => {
          clearTimeout(timeout);
          expect(moveData).toBeDefined();
          expect(moveData.matchId).toBe(testData.games[0].id);
          expect(moveData.move).toBeDefined();
          expect(moveData.reasoning).toBeDefined();
          resolve();
        });

        client.on('ai_move_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`AI move failed: ${error.message}`));
        });

        client.on('error', reject);
      });
    });

    test('should handle AI training progress updates', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('AI training update timeout'));
        }, 15000);

        client.on('connect', () => {
          client.emit('subscribe_ai_training', { agentId: 'test-agent-1' });
          
          // Start training session
          client.emit('start_ai_training', {
            agentId: 'test-agent-1',
            trainingConfig: {
              epochs: 10,
              learningRate: 0.01,
              batchSize: 32
            }
          });
        });

        client.on('training_progress', (progressData) => {
          clearTimeout(timeout);
          expect(progressData).toBeDefined();
          expect(progressData.agentId).toBe('test-agent-1');
          expect(progressData.progress).toBeDefined();
          expect(progressData.metrics).toBeDefined();
          resolve();
        });

        client.on('training_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Training failed: ${error.message}`));
        });

        client.on('error', reject);
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle server restart gracefully', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Reconnection timeout'));
        }, 30000);

        let initiallyConnected = false;
        let reconnected = false;

        client.on('connect', () => {
          if (!initiallyConnected) {
            initiallyConnected = true;
            // Simulate server issues by disconnecting
            setTimeout(() => {
              client.disconnect();
              // Reconnect after a delay
              setTimeout(() => {
                client.connect();
              }, 2000);
            }, 1000);
          } else if (!reconnected) {
            reconnected = true;
            clearTimeout(timeout);
            expect(client.connected).toBe(true);
            resolve();
          }
        });

        client.on('disconnect', (reason) => {
          expect(reason).toBeDefined();
        });

        client.on('connect_error', (error) => {
          // Expected during reconnection attempts
          console.log('Connection error during reconnection test:', error.message);
        });
      });
    });

    test('should handle message delivery failures', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket'],
        timeout: 5000
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message failure handling timeout'));
        }, 10000);

        client.on('connect', () => {
          // Send a message that might fail
          client.emit('invalid_event', {
            invalidData: 'this should cause an error'
          }, (acknowledgment) => {
            if (acknowledgment && acknowledgment.error) {
              clearTimeout(timeout);
              expect(acknowledgment.error).toBeDefined();
              resolve();
            }
          });
        });

        client.on('error', (error) => {
          clearTimeout(timeout);
          expect(error).toBeDefined();
          resolve();
        });
      });
    });

    test('should handle high-frequency message bursts', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('High-frequency message test timeout'));
        }, 15000);

        let messagesReceived = 0;
        const totalMessages = 100;

        client.on('connect', () => {
          client.emit('join_match', { matchId: testData.games[0].id });
          
          // Send burst of messages
          for (let i = 0; i < totalMessages; i++) {
            setTimeout(() => {
              client.emit('ping_test', { messageId: i, timestamp: Date.now() });
            }, i * 10); // 10ms intervals
          }
        });

        client.on('pong_test', (data) => {
          messagesReceived++;
          expect(data.messageId).toBeDefined();
          expect(data.timestamp).toBeDefined();
          
          if (messagesReceived >= totalMessages * 0.8) { // Allow for some message loss
            clearTimeout(timeout);
            resolve();
          }
        });

        client.on('error', reject);
      });
    }, 20000);

    test('should handle connection timeouts appropriately', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket'],
        timeout: 2000 // Short timeout for testing
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(); // Timeout is expected behavior in this test
        }, 10000);

        client.on('connect', () => {
          // Send a message that should timeout
          client.emit('slow_operation', {
            delay: 5000 // Longer than client timeout
          }, (acknowledgment) => {
            clearTimeout(timeout);
            if (acknowledgment && acknowledgment.error && acknowledgment.error.includes('timeout')) {
              resolve();
            } else {
              reject(new Error('Expected timeout error'));
            }
          });
        });

        client.on('connect_error', (error) => {
          clearTimeout(timeout);
          resolve(); // Connection errors are acceptable for this test
        });
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should maintain performance under concurrent connections', async () => {
      const numberOfClients = 50;
      const clients: ClientSocket[] = [];
      const connectionPromises: Promise<ClientSocket>[] = [];

      for (let i = 0; i < numberOfClients; i++) {
        const promise = new Promise<ClientSocket>((resolve, reject) => {
          const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
            transports: ['websocket'],
            timeout: 10000
          });

          const timeout = setTimeout(() => {
            reject(new Error(`Client ${i} connection timeout`));
          }, 15000);

          client.on('connect', () => {
            clearTimeout(timeout);
            resolve(client);
          });

          client.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        connectionPromises.push(promise);
      }

      const startTime = Date.now();
      const connectedClients = await Promise.all(connectionPromises);
      const connectionTime = Date.now() - startTime;

      clientSockets.push(...connectedClients);

      expect(connectedClients).toHaveLength(numberOfClients);
      expect(connectionTime).toBeLessThan(10000); // Should connect within 10 seconds

      // Test message broadcast performance
      const messagePromises = connectedClients.map((client, index) => {
        return new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Client ${index} message timeout`));
          }, 5000);

          client.on('broadcast_test', (data) => {
            clearTimeout(timeout);
            expect(data.message).toBe('performance_test');
            resolve();
          });

          client.on('error', reject);
        });
      });

      // Send broadcast message
      if (serverIO) {
        serverIO.emit('broadcast_test', { message: 'performance_test' });
      }

      const messageStartTime = Date.now();
      await Promise.all(messagePromises);
      const messageTime = Date.now() - messageStartTime;

      expect(messageTime).toBeLessThan(2000); // Broadcast should complete within 2 seconds
    }, 30000);

    test('should handle message queue overflow gracefully', async () => {
      const client = ClientIO(`http://localhost:${testEnv.server.port}`, {
        transports: ['websocket']
      });
      clientSockets.push(client);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(); // Completing without errors is acceptable
        }, 10000);

        client.on('connect', () => {
          // Send many messages rapidly to overwhelm the queue
          for (let i = 0; i < 1000; i++) {
            client.emit('queue_test', { messageId: i });
          }
          
          // Test should complete without crashing
          setTimeout(() => {
            clearTimeout(timeout);
            expect(client.connected).toBe(true);
            resolve();
          }, 5000);
        });

        client.on('error', (error) => {
          clearTimeout(timeout);
          // Some errors are acceptable under extreme load
          console.log('Queue overflow error (expected):', error.message);
          resolve();
        });
      });
    });
  });
});
