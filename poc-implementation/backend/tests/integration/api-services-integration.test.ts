/**
 * API and Services Integration Tests
 * Tests interactions between API endpoints and backend services
 */

import request from 'supertest';
import { Keypair } from '@solana/web3.js';
import {
  setupIntegrationEnvironment,
  teardownIntegrationEnvironment,
  getTestEnvironment,
  createTestData,
  makeAuthenticatedRequest,
  waitForServiceReady,
  testDatabaseConnection,
  testRedisConnection,
  testSolanaConnection,
  NetworkConditionSimulator,
  IntegrationTestConfig
} from '../setup/integration-setup';

describe('API and Services Integration Tests', () => {
  let testEnv: IntegrationTestConfig;
  let testData: any;
  let networkSimulator: NetworkConditionSimulator;

  beforeAll(async () => {
    testEnv = await setupIntegrationEnvironment();
    testData = await createTestData();
    networkSimulator = new NetworkConditionSimulator();
    
    // Ensure all services are ready
    await waitForServiceReady('Backend API', '/health');
  }, 60000);

  afterAll(async () => {
    networkSimulator.restore();
    await teardownIntegrationEnvironment();
  }, 30000);

  beforeEach(() => {
    networkSimulator.restore();
  });

  describe('Infrastructure Connectivity', () => {
    test('should verify database connection and operations', async () => {
      const isConnected = await testDatabaseConnection();
      expect(isConnected).toBe(true);

      // Test basic database operations
      const user = await testEnv.database.client.user.findFirst({
        where: { id: testData.users[0].id }
      });
      expect(user).toBeTruthy();
      expect(user?.id).toBe(testData.users[0].id);
    });

    test('should verify Redis connection and caching operations', async () => {
      if (!testEnv.redis.isConnected) {
        console.log('Redis not available, skipping test');
        return;
      }

      const isConnected = await testRedisConnection();
      expect(isConnected).toBe(true);

      // Test cache operations
      const testKey = 'integration-test-key';
      const testValue = { data: 'test-value', timestamp: Date.now() };

      await testEnv.redis.client.setex(testKey, 60, JSON.stringify(testValue));
      const cachedValue = await testEnv.redis.client.get(testKey);
      expect(JSON.parse(cachedValue!)).toEqual(testValue);

      await testEnv.redis.client.del(testKey);
    });

    test('should verify Solana blockchain connection', async () => {
      const isConnected = await testSolanaConnection();
      expect(isConnected).toBe(true);

      // Test account info retrieval
      const accountInfo = await testEnv.solana.connection.getAccountInfo(
        testEnv.solana.testKeypairs.user1.publicKey
      );
      // Account might not exist, but connection should work
      expect(accountInfo).toBeDefined(); // null is valid for non-existent account
    });
  });

  describe('Authentication and Authorization Flow', () => {
    test('should authenticate with valid wallet credentials', async () => {
      const testKeypair = Keypair.generate();
      const message = `Login request at ${Date.now()}`;
      
      const response = await request(testEnv.server.app)
        .post('/api/auth/wallet')
        .send({
          publicKey: testKeypair.publicKey.toBase58(),
          signature: 'test-signature-placeholder-64chars-long-enough-for-validation',
          message
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.publicKey).toBe(testKeypair.publicKey.toBase58());
    });

    test('should reject invalid authentication credentials', async () => {
      const response = await request(testEnv.server.app)
        .post('/api/auth/wallet')
        .send({
          publicKey: 'invalid-public-key',
          signature: 'invalid-signature',
          message: 'invalid-message'
        })
        .expect(401);

      expect(response.body.success).toBeFalsy();
    });

    test('should handle token verification', async () => {
      const token = testEnv.services.auth.testTokens.validUser;
      
      const response = await request(testEnv.server.app)
        .post('/api/auth/verify')
        .send({ token })
        .expect(200);

      expect(response.body.valid).toBe(true);
    });

    test('should reject expired tokens', async () => {
      const expiredToken = testEnv.services.auth.testTokens.expired;
      
      const response = await request(testEnv.server.app)
        .post('/api/auth/verify')
        .send({ token: expiredToken })
        .expect(200); // API returns 200 but with valid: false

      expect(response.body.valid).toBe(false);
    });
  });

  describe('User Management API Integration', () => {
    test('should retrieve user profile for authenticated user', async () => {
      const token = testEnv.services.auth.testTokens.validUser;
      
      const response = await makeAuthenticatedRequest(token)
        .get('/api/users/profile')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('publicKey');
    });

    test('should update user profile with valid data', async () => {
      const token = testEnv.services.auth.testTokens.validUser;
      const updatedProfile = {
        username: 'updated-test-user',
        email: 'updated@test.com'
      };

      const response = await makeAuthenticatedRequest(token)
        .put('/api/users/profile')
        .send(updatedProfile)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle user statistics retrieval', async () => {
      const token = testEnv.services.auth.testTokens.validUser;
      
      const response = await makeAuthenticatedRequest(token)
        .get('/api/users/stats')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('gamesPlayed');
    });
  });

  describe('Game Management API Integration', () => {
    test('should retrieve active matches', async () => {
      const response = await request(testEnv.server.app)
        .get('/api/matches')
        .expect(200);

      expect(response.body).toHaveProperty('matches');
      expect(Array.isArray(response.body.matches)).toBe(true);
    });

    test('should create a new match with valid parameters', async () => {
      const token = testEnv.services.auth.testTokens.validUser;
      const matchData = {
        gameType: 'vs_ai',
        aiDifficulty: 'medium',
        betAmount: 0.1
      };

      const response = await makeAuthenticatedRequest(token)
        .post('/api/matches')
        .send(matchData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.match).toHaveProperty('id');
    });

    test('should retrieve specific match details', async () => {
      const response = await request(testEnv.server.app)
        .get(`/api/matches/${testData.games[0].id}`)
        .expect(200);

      expect(response.body.match).toHaveProperty('id');
      expect(response.body.match.id).toBe(testData.games[0].id);
    });

    test('should handle match history retrieval', async () => {
      const token = testEnv.services.auth.testTokens.validUser;
      
      const response = await makeAuthenticatedRequest(token)
        .get('/api/matches/history')
        .expect(200);

      expect(response.body).toHaveProperty('matches');
      expect(Array.isArray(response.body.matches)).toBe(true);
    });
  });

  describe('Betting Service Integration', () => {
    test('should retrieve betting pools for active matches', async () => {
      const response = await request(testEnv.server.app)
        .get('/api/betting/pools')
        .expect(200);

      expect(response.body).toHaveProperty('pools');
      expect(Array.isArray(response.body.pools)).toBe(true);
    });

    test('should place bet with valid parameters', async () => {
      const token = testEnv.services.auth.testTokens.validUser;
      const betData = {
        matchId: testData.games[0].id,
        amount: 0.1,
        prediction: 'player1'
      };

      const response = await makeAuthenticatedRequest(token)
        .post('/api/betting/bets')
        .send(betData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.bet).toHaveProperty('id');
    });

    test('should retrieve user betting history', async () => {
      const token = testEnv.services.auth.testTokens.validUser;
      
      const response = await makeAuthenticatedRequest(token)
        .get('/api/betting/history')
        .expect(200);

      expect(response.body).toHaveProperty('bets');
      expect(Array.isArray(response.body.bets)).toBe(true);
    });
  });

  describe('Analytics Service Integration', () => {
    test('should retrieve platform analytics', async () => {
      const response = await request(testEnv.server.app)
        .get('/api/analytics/platform')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalUsers');
    });

    test('should retrieve match statistics', async () => {
      const response = await request(testEnv.server.app)
        .get('/api/analytics/matches')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalMatches');
    });

    test('should handle user-specific analytics for authenticated users', async () => {
      const token = testEnv.services.auth.testTokens.validUser;
      
      const response = await makeAuthenticatedRequest(token)
        .get('/api/analytics/user')
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
    });
  });

  describe('External Service Integration', () => {
    test('should handle AI service communication', async () => {
      if (!testEnv.services.ai.isHealthy) {
        console.log('AI service not available, skipping test');
        return;
      }

      // Test AI service health check through backend
      const response = await request(testEnv.server.app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    test('should handle AI move generation requests', async () => {
      if (!testEnv.services.ai.isHealthy) {
        console.log('AI service not available, skipping test');
        return;
      }

      const token = testEnv.services.auth.testTokens.validUser;
      const moveRequest = {
        matchId: testData.games[0].id,
        gameState: {
          board: [],
          currentPlayer: 'ai'
        },
        difficulty: 'medium'
      };

      const response = await makeAuthenticatedRequest(token)
        .post('/api/matches/ai-move')
        .send(moveRequest)
        .expect(200);

      expect(response.body).toHaveProperty('move');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database connection failures gracefully', async () => {
      // Simulate database disconnection (test with non-existent query)
      try {
        await testEnv.database.client.$executeRaw`SELECT * FROM non_existent_table`;
      } catch (error) {
        expect(error).toBeTruthy();
      }

      // API should still respond with appropriate error
      const response = await request(testEnv.server.app)
        .get('/api/matches')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle network timeouts appropriately', async () => {
      networkSimulator.simulateTimeouts(100); // 100ms timeout
      
      // This should timeout but the API should handle it gracefully
      const response = await request(testEnv.server.app)
        .get('/health')
        .timeout(5000);

      // The response might succeed or fail, but should not crash
      expect([200, 500, 503]).toContain(response.status);
    });

    test('should handle intermittent service failures', async () => {
      networkSimulator.simulateIntermittentFailures(0.3); // 30% failure rate
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < 10; i++) {
        try {
          const response = await request(testEnv.server.app)
            .get('/health')
            .timeout(2000);
          
          if (response.status === 200) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      // Should have some successes and some failures
      expect(successCount).toBeGreaterThan(0);
      expect(errorCount).toBeGreaterThan(0);
    });

    test('should handle high latency conditions', async () => {
      networkSimulator.simulateLatency(500); // 500ms latency
      
      const startTime = Date.now();
      const response = await request(testEnv.server.app)
        .get('/health')
        .timeout(10000);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeGreaterThan(400); // Should take at least 400ms
    });
  });

  describe('Data Consistency and Transactions', () => {
    test('should maintain data consistency during concurrent operations', async () => {
      const token = testEnv.services.auth.testTokens.validUser;
      
      // Create multiple concurrent betting requests
      const concurrentBets = Array.from({ length: 5 }, (_, i) => 
        makeAuthenticatedRequest(token)
          .post('/api/betting/bets')
          .send({
            matchId: testData.games[0].id,
            amount: 0.01,
            prediction: 'player1'
          })
      );

      const results = await Promise.allSettled(concurrentBets);
      
      // At least some should succeed, and database should remain consistent
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(0);

      // Verify database consistency
      const totalBets = await testEnv.database.client.bet.count({
        where: {
          gameId: testData.games[0].id
        }
      });
      expect(totalBets).toBeGreaterThanOrEqual(successful);
    });

    test('should rollback transactions on failure', async () => {
      const initialUserCount = await testEnv.database.client.user.count();
      
      // Attempt to create user with invalid data that should trigger rollback
      try {
        await testEnv.database.client.$transaction(async (tx) => {
          await tx.user.create({
            data: {
              id: 'test-transaction-user',
              username: 'test-user',
              email: 'test@test.com',
              publicKey: 'valid-public-key',
              address: 'valid-address',
              isActive: true,
              level: 1,
              experience: 0
            }
          });
          
          // Force transaction failure
          throw new Error('Forced transaction failure');
        });
      } catch (error) {
        expect(error.message).toBe('Forced transaction failure');
      }
      
      // User count should remain the same
      const finalUserCount = await testEnv.database.client.user.count();
      expect(finalUserCount).toBe(initialUserCount);
    });
  });

  describe('Performance and Load Handling', () => {
    test('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();
      
      const requests = Array.from({ length: concurrentRequests }, () => 
        request(testEnv.server.app)
          .get('/health')
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should complete in reasonable time (under 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should maintain response times under load', async () => {
      const numberOfRequests = 10;
      const responseTimes: number[] = [];
      
      for (let i = 0; i < numberOfRequests; i++) {
        const startTime = Date.now();
        const response = await request(testEnv.server.app)
          .get('/api/matches')
          .timeout(5000);
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        responseTimes.push(endTime - startTime);
      }
      
      const averageResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      // Average response time should be under 1 second
      expect(averageResponseTime).toBeLessThan(1000);
      // Maximum response time should be under 2 seconds
      expect(maxResponseTime).toBeLessThan(2000);
    });
  });

  describe('CORS and Security Headers', () => {
    test('should include appropriate CORS headers', async () => {
      const response = await request(testEnv.server.app)
        .options('/api/matches')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });

    test('should include security headers', async () => {
      const response = await request(testEnv.server.app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should enforce rate limiting', async () => {
      // Make rapid requests to trigger rate limiting
      const rapidRequests = Array.from({ length: 100 }, () => 
        request(testEnv.server.app)
          .get('/api/matches')
      );

      const responses = await Promise.allSettled(rapidRequests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && 
                 (result as any).value.status === 429
      );
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);
  });
});
