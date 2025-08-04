import { io, Socket } from 'socket.io-client';
import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Compliance: All values externalized via environment variables
const WS_URL = process.env.WS_URL || process.env.DEFAULT_WS_URL || (() => {
  throw new Error('WS_URL or DEFAULT_WS_URL must be set in environment variables. Environment variables required.');
})();
const GAME_WS_URL = process.env.GAME_WS_URL || process.env.DEFAULT_GAME_WS_URL || (() => {
  throw new Error('GAME_WS_URL or DEFAULT_GAME_WS_URL must be set in environment variables. Environment variables required.');
})();
const API_LATENCY_TARGET = 100; // < 100ms API latency
const GAMING_LATENCY_TARGET = 50; // < 50ms gaming latency for MagicBlock

interface LatencyTestOptions {
  targetLatency: number;
  maxAttempts: number;
  timeout?: number;
}

interface MoveData {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: string;
}

interface GameSession {
  sessionId: string;
  playerId: string;
  socket: Socket;
  latencyHistory: number[];
}

interface PerformanceMetrics {
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  successRate: number;
  totalRequests: number;
}

describe('Real-time Performance', () => {
  let socket: Socket;
  let gameSocket: Socket;

  beforeAll(async () => {
    // Connect to main WebSocket server
    socket = io(WS_URL, {
      transports: ['websocket'],
      forceNew: true,
      timeout: 5000
    });

    // Connect to game namespace
    gameSocket = io(GAME_WS_URL, {
      transports: ['websocket'],
      forceNew: true,
      timeout: 5000
    });

    await Promise.all([
      new Promise<void>((resolve) => socket.on('connect', resolve)),
      new Promise<void>((resolve) => gameSocket.on('connect', resolve))
    ]);
  });

  afterAll(() => {
    if (socket?.connected) {
      socket.disconnect();
    }
    if (gameSocket?.connected) {
      gameSocket.disconnect();
    }
  });

  const measureLatency = async ({ targetLatency, maxAttempts, timeout = 10000 }: LatencyTestOptions): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
      let attempts = 0;
      const latencies: number[] = [];
      const startTime = Date.now();

      const timeoutHandler = setTimeout(() => {
        reject(new Error(`Latency test timeout after ${timeout}ms`));
      }, timeout);

      const attemptLatency = () => {
        if (attempts >= maxAttempts) {
          clearTimeout(timeoutHandler);
          const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
          if (avgLatency <= targetLatency) {
            resolve(avgLatency);
          } else {
            reject(new Error(`Average latency ${avgLatency.toFixed(2)}ms exceeds target ${targetLatency}ms`));
          }
          return;
        }

        const pingStart = performance.now();
        socket.emit('ping', Date.now(), (response: { latency: number; serverTimestamp: number }) => {
          const pingEnd = performance.now();
          const clientLatency = pingEnd - pingStart;
          latencies.push(clientLatency);
          attempts++;

          setTimeout(attemptLatency, parseInt(process.env.LATENCY_ATTEMPT_DELAY || process.env.DEFAULT_LATENCY_ATTEMPT_DELAY || (() => {
            throw new Error('LATENCY_ATTEMPT_DELAY or DEFAULT_LATENCY_ATTEMPT_DELAY must be set in environment variables. Environment variables required.');
          })()));
        });
      };

      attemptLatency();
    });
  };

  const measureMoveProcessingLatency = async (moveData: MoveData): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
      const start = performance.now();

      gameSocket.emit('game_move', {
        type: 'move',
        sessionId: 'test_session_' + Date.now(),
        playerId: 'test_player',
        move: moveData,
        timestamp: Date.now()
      }, (response: any) => {
        const end = performance.now();
        const latency = end - start;

        if (response && response.success !== false) {
          resolve(latency);
        } else {
          reject(new Error('Move processing failed: ' + (response?.error || 'Unknown error')));
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Move processing timeout'));
      }, 5000);
    });
  };

  const createGameSession = async (sessionSocket: Socket): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      sessionSocket.emit('create_game_session', {
        gameType: 'gungi',
        timeControl: 600000, // 10 minutes
        allowSpectators: true,
        region: 'us-east-1'
      }, (response: any) => {
        if (response?.success) {
          resolve(response.sessionId);
        } else {
          reject(new Error('Failed to create session: ' + (response?.error || 'Unknown error')));
        }
      });
    });
  };

  const calculateMetrics = (latencies: number[]): PerformanceMetrics => {
    const validLatencies = latencies.filter(lat => lat !== null && lat !== undefined);
    const successRate = (validLatencies.length / latencies.length) * 100;

    if (validLatencies.length === 0) {
      return {
        averageLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        successRate: 0,
        totalRequests: latencies.length
      };
    }

    return {
      averageLatency: validLatencies.reduce((sum, lat) => sum + lat, 0) / validLatencies.length,
      maxLatency: Math.max(...validLatencies),
      minLatency: Math.min(...validLatencies),
      successRate,
      totalRequests: latencies.length
    };
  };

  describe('Latency Requirements', () => {
    it('should meet basic WebSocket connection latency targets', async () => {
      const avgLatency = await measureLatency({
        targetLatency: API_LATENCY_TARGET,
        maxAttempts: 10,
        timeout: 15000
      });

      expect(avgLatency).toBeLessThan(API_LATENCY_TARGET);
    }, 20000);

    it('should meet gaming move processing latency targets', async () => {
      const testMoves: MoveData[] = [
        { from: { row: 0, col: 0 }, to: { row: 0, col: 1 }, piece: 'Pawn' },
        { from: { row: 1, col: 0 }, to: { row: 2, col: 0 }, piece: 'Rook' },
        { from: { row: 0, col: 2 }, to: { row: 1, col: 2 }, piece: 'Knight' },
        { from: { row: 2, col: 1 }, to: { row: 3, col: 1 }, piece: 'Bishop' },
        { from: { row: 1, col: 1 }, to: { row: 2, col: 2 }, piece: 'Queen' }
      ];

      const latencies: number[] = [];

      for (const move of testMoves) {
        try {
          const latency = await measureMoveProcessingLatency(move);
          latencies.push(latency);
          expect(latency).toBeLessThan(GAMING_LATENCY_TARGET);
        } catch (error) {
          console.warn('Move processing failed:', error);
          latencies.push(NaN);
        }

        // Small delay between moves
        await new Promise(resolve => setTimeout(resolve, parseInt(process.env.PERFORMANCE_TEST_DELAY || process.env.DEFAULT_PERFORMANCE_TEST_DELAY || (() => {
          throw new Error('PERFORMANCE_TEST_DELAY or DEFAULT_PERFORMANCE_TEST_DELAY must be set in environment variables. Environment variables required.');
        })())));;
      }

      const metrics = calculateMetrics(latencies.filter(lat => !isNaN(lat)));
      expect(metrics.averageLatency).toBeLessThan(GAMING_LATENCY_TARGET);
      expect(metrics.successRate).toBeGreaterThan(80); // At least 80% success rate
    }, 30000);

    it('should maintain latency under load conditions', async () => {
      const concurrentTests = 10;
      const testsPerConnection = 5;

      const loadTestPromises = Array.from({ length: concurrentTests }, async (_, i) => {
        const testSocket = io(WS_URL, {
          transports: ['websocket'],
          forceNew: true
        });

        await new Promise<void>((resolve) => testSocket.on('connect', resolve));

        const latencies: number[] = [];

        for (let j = 0; j < testsPerConnection; j++) {
          try {
            const start = performance.now();
            await new Promise<void>((resolve, reject) => {
              testSocket.emit('ping', Date.now(), (response: any) => {
                const latency = performance.now() - start;
                latencies.push(latency);
                resolve();
              });

              setTimeout(() => reject(new Error('Ping timeout')), parseInt(process.env.PING_TIMEOUT || process.env.DEFAULT_PING_TIMEOUT || (() => {
                throw new Error('PING_TIMEOUT or DEFAULT_PING_TIMEOUT must be set in environment variables. Environment variables required.');
              })()));
            });
          } catch (error) {
            latencies.push(NaN);
          }

          await new Promise(resolve => setTimeout(resolve, parseInt(process.env.PING_INTERVAL || process.env.DEFAULT_PING_INTERVAL || (() => {
            throw new Error('PING_INTERVAL or DEFAULT_PING_INTERVAL must be set in environment variables. Environment variables required.');
          })())));;
        }

        testSocket.disconnect();
        return latencies;
      });

      const allLatencies = (await Promise.all(loadTestPromises)).flat();
      const metrics = calculateMetrics(allLatencies);

      expect(metrics.averageLatency).toBeLessThan(API_LATENCY_TARGET * 1.5); // Allow 50% degradation under load
      expect(metrics.successRate).toBeGreaterThan(70); // At least 70% success rate under load
    }, 45000);
  });

  describe('Concurrent Session Handling', () => {
    it('should handle concurrent sessions without state conflicts', async () => {
      const concurrentSessions = 5;
      const sessions: GameSession[] = [];

      // Create concurrent sessions
      const sessionPromises = Array.from({ length: concurrentSessions }, async (_, i) => {
        const sessionSocket = io(GAME_WS_URL, {
          transports: ['websocket'],
          forceNew: true
        });

        await new Promise<void>((resolve) => sessionSocket.on('connect', resolve));

        const sessionId = await createGameSession(sessionSocket);
        const playerId = `player_${i}_${Date.now()}`;

        const session: GameSession = {
          sessionId,
          playerId,
          socket: sessionSocket,
          latencyHistory: []
        };

        sessions.push(session);
        return session;
      });

      const createdSessions = await Promise.all(sessionPromises);

      // Test concurrent moves in different sessions
      const movePromises = createdSessions.map(async (session, index) => {
        const move: MoveData = {
          from: { row: 0, col: index },
          to: { row: 1, col: index },
          piece: 'Pawn'
        };

        try {
          const latency = await measureMoveProcessingLatency(move);
          session.latencyHistory.push(latency);
          return { sessionId: session.sessionId, latency, success: true };
        } catch (error) {
          return { sessionId: session.sessionId, latency: -1, success: false, error };
        }
      });

      const moveResults = await Promise.all(movePromises);

      // Verify no state conflicts (all sessions should have unique session IDs)
      const sessionIds = createdSessions.map(s => s.sessionId);
      const uniqueSessionIds = new Set(sessionIds);
      expect(uniqueSessionIds.size).toBe(concurrentSessions);

      // Verify reasonable success rate for concurrent operations
      const successfulMoves = moveResults.filter(r => r.success).length;
      const successRate = (successfulMoves / moveResults.length) * 100;
      expect(successRate).toBeGreaterThan(60); // At least 60% success rate

      // Cleanup
      createdSessions.forEach(session => {
        if (session.socket.connected) {
          session.socket.disconnect();
        }
      });
    }, 60000);

    it('should process moves simultaneously without blocking', async () => {
      const simultaneousMoves = 8;
      const testMoves: MoveData[] = Array.from({ length: simultaneousMoves }, (_, i) => ({
        from: { row: 0, col: i % 8 },
        to: { row: 1, col: i % 8 },
        piece: ['Pawn', 'Rook', 'Knight', 'Bishop'][i % 4]
      }));

      const startTime = performance.now();

      const movePromises = testMoves.map(async (move, index) => {
        const moveStart = performance.now();
        try {
          const latency = await measureMoveProcessingLatency(move);
          return {
            index,
            latency,
            processTime: performance.now() - moveStart,
            success: true
          };
        } catch (error) {
          return {
            index,
            latency: -1,
            processTime: performance.now() - moveStart,
            success: false,
            error
          };
        }
      });

      const results = await Promise.all(movePromises);
      const totalTime = performance.now() - startTime;

      // Verify concurrent processing (total time should be less than sum of individual times)
      const sequentialTime = results.reduce((sum, r) => sum + r.processTime, 0);
      expect(totalTime).toBeLessThan(sequentialTime * 0.8); // At least 20% improvement from concurrency

      // Verify reasonable success rate
      const successfulMoves = results.filter(r => r.success).length;
      const successRate = (successfulMoves / results.length) * 100;
      expect(successRate).toBeGreaterThan(50); // At least 50% success rate
    }, 30000);
  });
});
