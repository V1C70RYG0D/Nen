/**
 * Match Data API Integration Tests
 *
 * Test Scenarios:
 * - Match listing retrieval
 * - Match detail fetching
 * - Real-time updates
 * - Error handling
 */

import request from 'supertest';
import NenPlatformServer from '../../main';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../setup';
import { createTestMatch, createTestUser } from '../fixtures/testData';
import { mockWebSocketClient } from '../mocks/websocketMock';

describe('Match Data API Integration Tests', () => {
  let server: NenPlatformServer;
  let app: any;
  let wsClient: any;
  let testMatchId: string;
  let testUserId: string;

  beforeAll(async () => {
    await setupTestEnvironment();
    server = new NenPlatformServer();
    app = server.getApp();

    // Create test data
    testUserId = await createTestUser({
      username: 'test_user_match_api',
      email: 'test.match@nen.platform'
    });

    testMatchId = await createTestMatch({
      matchType: 'ai_vs_ai',
      aiAgent1Id: 'royal_guard_alpha',
      aiAgent2Id: 'phantom_striker',
      status: 'active'
    });
  });

  afterAll(async () => {
    if (wsClient) {
      wsClient.disconnect();
    }
    await cleanupTestEnvironment();
  });

  describe('Match Listing Retrieval', () => {
    test('should retrieve all active matches successfully', async () => {
      const response = await request(app)
        .get('/api/v1/match')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number)
      });

      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify match structure
      const match = response.body.data[0];
      expect(match).toHaveProperty('id');
      expect(match).toHaveProperty('matchType');
      expect(match).toHaveProperty('status');
      expect(match).toHaveProperty('createdAt');

      // Verify betting pool enrichment
      if (match.bettingPool) {
        expect(match.bettingPool).toHaveProperty('totalPool');
        expect(match.bettingPool).toHaveProperty('pools');
      }
    });

    test('should handle pagination for match listings', async () => {
      const response = await request(app)
        .get('/api/v1/match')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body).toHaveProperty('count');
    });

    test('should filter matches by status', async () => {
      const response = await request(app)
        .get('/api/v1/match')
        .query({ status: 'active' })
        .expect(200);

      response.body.data.forEach((match: any) => {
        expect(match.status).toBe('active');
      });
    });

    test('should filter matches by match type', async () => {
      const response = await request(app)
        .get('/api/v1/match')
        .query({ matchType: 'ai_vs_ai' })
        .expect(200);

      response.body.data.forEach((match: any) => {
        expect(match.matchType).toBe('ai_vs_ai');
      });
    });

    test('should return empty array when no matches found', async () => {
      const response = await request(app)
        .get('/api/v1/match')
        .query({ status: 'nonexistent_status' })
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('Match Detail Fetching', () => {
    test('should retrieve specific match details successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/match/${testMatchId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testMatchId,
          matchType: expect.any(String),
          status: expect.any(String),
          createdAt: expect.any(String)
        })
      });

      // Verify detailed match information
      const match = response.body.data;
      expect(match).toHaveProperty('aiAgent1Id');
      expect(match).toHaveProperty('aiAgent2Id');
      expect(match).toHaveProperty('gameState');

      // Verify betting pool data is included
      if (match.bettingPool) {
        expect(match.bettingPool).toHaveProperty('totalPool');
        expect(match.bettingPool).toHaveProperty('pools');
      }
    });

    test('should return 404 for non-existent match', async () => {
      const response = await request(app)
        .get('/api/v1/match/non-existent-match-id')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Match not found'
      });
    });

    test('should handle invalid match ID format', async () => {
      const response = await request(app)
        .get('/api/v1/match/invalid-id-format!')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Match not found'
      });
    });

    test('should include move history for active matches', async () => {
      // First make a move in the test match
      await request(app)
        .post(`/api/v1/match/${testMatchId}/moves`)
        .send({
          from: { x: 0, y: 0 },
          to: { x: 1, y: 0 },
          piece: 'pawn',
          playerId: testUserId
        })
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/match/${testMatchId}`)
        .expect(200);

      const match = response.body.data;
      expect(match.gameState).toHaveProperty('moveHistory');
      expect(Array.isArray(match.gameState.moveHistory)).toBe(true);
    });

    test('should retrieve match history endpoint', async () => {
      const response = await request(app)
        .get(`/api/v1/match/${testMatchId}/history`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          matchId: testMatchId,
          moveHistory: expect.any(Array),
          status: expect.any(String)
        })
      });
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(async () => {
      wsClient = await mockWebSocketClient('http://localhost:3001');
    });

    afterEach(() => {
      if (wsClient) {
        wsClient.disconnect();
        wsClient = null;
      }
    });

    test('should receive real-time match updates via websocket', (done) => {
      wsClient.on('connect', () => {
        // Join match room for updates
        wsClient.emit('join', `match:${testMatchId}`);

        // Listen for match updates
        wsClient.on('match:update', (data: any) => {
          expect(data).toHaveProperty('matchId', testMatchId);
          expect(data).toHaveProperty('type');
          expect(data).toHaveProperty('timestamp');
          done();
        });

        // Trigger a match update by making a move
        setTimeout(async () => {
          await request(app)
            .post(`/api/v1/match/${testMatchId}/moves`)
            .send({
              from: { x: 1, y: 0 },
              to: { x: 2, y: 0 },
              piece: 'pawn',
              playerId: testUserId
            });
        }, 100);
      });
    }, 10000);

    test('should receive game state updates in real-time', (done) => {
      wsClient.on('connect', () => {
        wsClient.emit('join', `match:${testMatchId}`);

        wsClient.on('gameState:update', (data: any) => {
          expect(data).toHaveProperty('matchId', testMatchId);
          expect(data).toHaveProperty('gameState');
          expect(data.gameState).toHaveProperty('board');
          expect(data.gameState).toHaveProperty('currentPlayer');
          done();
        });

        // Trigger game state update
        setTimeout(async () => {
          await request(app)
            .post(`/api/v1/match/${testMatchId}/start`)
            .expect(200);
        }, 100);
      });
    }, 10000);

    test('should receive betting pool updates in real-time', (done) => {
      wsClient.on('connect', () => {
        wsClient.emit('join', `match:${testMatchId}`);

        wsClient.on('bettingPool:update', (data: any) => {
          expect(data).toHaveProperty('matchId', testMatchId);
          expect(data).toHaveProperty('bettingPool');
          expect(data.bettingPool).toHaveProperty('totalPool');
          done();
        });

        // Trigger betting pool update by placing a bet
        setTimeout(async () => {
          await request(app)
            .post('/api/v1/betting/place')
            .send({
              matchId: testMatchId,
              agentId: 'royal_guard_alpha',
              amount: 1.0,
              odds: 2.5
            })
            .set('Authorization', 'Bearer test_wallet_address');
        }, 100);
      });
    }, 10000);

    test('should handle websocket connection errors gracefully', (done) => {
      wsClient.on('connect_error', (error: any) => {
        expect(error).toBeDefined();
        done();
      });

      // Force connection error by connecting to wrong port
      const badClient = mockWebSocketClient('http://localhost:9999');
      badClient.connect();
    });

    test('should authenticate websocket connections', (done) => {
      const authenticatedClient = mockWebSocketClient('http://localhost:3001', {
        auth: { token: 'valid_test_token' }
      });

      authenticatedClient.on('connect', () => {
        // Successfully connected with authentication
        expect(true).toBe(true);
        authenticatedClient.disconnect();
        done();
      });

      authenticatedClient.on('connect_error', (error: any) => {
        // Should not reach here with valid token
        fail(`Authentication failed: ${error.message}`);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle server errors gracefully', async () => {
      // Mock a server error condition
      const response = await request(app)
        .get('/api/v1/match')
        .set('X-Force-Error', 'true')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String)
      });
    });

    test('should validate request parameters', async () => {
      const response = await request(app)
        .post('/api/v1/match')
        .send({
          matchType: 'invalid_type'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });

    test('should handle network timeouts', async () => {
      // Test with artificially long timeout
      const response = await request(app)
        .get('/api/v1/match')
        .timeout(1000)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle concurrent requests properly', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/v1/match')
          .expect(200)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/match')
        .type('json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should rate limit excessive requests', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array.from({ length: 105 }, () =>
        request(app)
          .get('/api/v1/match')
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should handle database connection errors', async () => {
      // Mock database connection failure
      process.env.DATABASE_CONNECTION_ERROR = 'true';

      const response = await request(app)
        .get('/api/v1/match')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('database')
      });

      // Cleanup
      delete process.env.DATABASE_CONNECTION_ERROR;
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high load efficiently', async () => {
      const startTime = Date.now();

      const requests = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/v1/match')
          .expect(200)
      );

      await Promise.all(requests);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 50 requests within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    test('should cache frequently accessed match data', async () => {
      // First request (should hit database)
      const response1 = await request(app)
        .get(`/api/v1/match/${testMatchId}`)
        .expect(200);

      const startTime = Date.now();

      // Second request (should hit cache)
      const response2 = await request(app)
        .get(`/api/v1/match/${testMatchId}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response1.body.data.id).toBe(response2.body.data.id);

      // Cached request should be faster (under 100ms)
      expect(duration).toBeLessThan(100);
    });

    test('should handle memory usage efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make multiple requests to test memory usage
      for (let i = 0; i < 20; i++) {
        await request(app)
          .get('/api/v1/match')
          .expect(200);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (under 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Security Testing', () => {
    test('should prevent SQL injection attacks', async () => {
      const maliciousInput = "'; DROP TABLE matches; --";

      const response = await request(app)
        .get(`/api/v1/match/${maliciousInput}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Match not found'
      });
    });

    test('should sanitize user input', async () => {
      const xssInput = '<script>alert("xss")</script>';

      const response = await request(app)
        .post('/api/v1/match')
        .send({
          matchType: 'ai_vs_ai',
          aiAgent1Id: xssInput,
          aiAgent2Id: 'phantom_striker'
        })
        .expect(400);

      expect(response.body.error).not.toContain('<script>');
    });

    test('should validate authentication tokens', async () => {
      const response = await request(app)
        .post('/api/v1/match')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          matchType: 'ai_vs_ai',
          aiAgent1Id: 'royal_guard_alpha',
          aiAgent2Id: 'phantom_striker'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should enforce CORS policies', async () => {
      const response = await request(app)
        .get('/api/v1/match')
        .set('Origin', 'https://malicious-site.com')
        .expect(200);

      // CORS headers should be properly set
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
