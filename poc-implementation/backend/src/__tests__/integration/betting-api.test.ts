/**
 * Betting API Integration Tests
 *
 * Test Scenarios:
 * - Pool data synchronization
 * - Bet placement confirmation
 * - User bet history
 * - Payout calculations
 */

import request from 'supertest';
import NenPlatformServer from '../../main';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../setup';
import { createTestUser, createTestMatch } from '../fixtures/testData';

jest.setTimeout(10000);

describe('Betting API Integration Tests', () => {
  let server: NenPlatformServer;
  let app: any;
  let testMatchId: string;
  let testUserId: string;

  beforeAll(async () => {
    await setupTestEnvironment();
    server = new NenPlatformServer();
    app = server.getApp();

    // Create test data
    testUserId = await createTestUser({
      username: 'test_user_bet_api',
      email: 'test.bet@nen.platform'
    });

    testMatchId = await createTestMatch({
      matchType: 'ai_vs_ai',
      aiAgent1Id: 'royal_guard_alpha',
      aiAgent2Id: 'phantom_striker',
      status: 'active'
    });
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  describe('Pool Data Synchronization', () => {
    test('should retrieve pool data successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/betting/pools/${testMatchId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        pools: expect.objectContaining({
          gameId: testMatchId,
          totalPool: expect.any(Number),
          pools: expect.any(Array)
        })
      });
    });
  });

  describe('Bet Placement Confirmation', () => {
    test('should place a bet successfully', async () => {
      const response = await request(app)
        .post('/api/v1/betting/place')
        .send({
          matchId: testMatchId,
          agentId: 'royal_guard_alpha',
          amount: 1.0,
          odds: 2.5
        })
        .set('Authorization', 'Bearer test_wallet_address')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String)
      });

      // Retrieve fresh pool data to verify synchronization
      const poolResponse = await request(app)
        .get(`/api/v1/betting/pools/${testMatchId}`)
        .expect(200);

      expect(poolResponse.body.pools.pools.some((pool: any) => pool.agentId === 'royal_guard_alpha')).toBe(true);
    });

    test('should reject invalid bet amounts', async () => {
      const response = await request(app)
        .post('/api/v1/betting/place')
        .send({
          matchId: testMatchId,
          agentId: 'royal_guard_alpha',
          amount: -1.0,
          odds: 2.5
        })
        .set('Authorization', 'Bearer test_wallet_address')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Bet amount must be between 0.1 and 100 SOL'
      });
    });

    test('should handle compliance and fraud detection', async () => {
      const response = await request(app)
        .post('/api/v1/betting/place')
        .send({
          matchId: testMatchId,
          agentId: 'royal_guard_alpha',
          amount: 101.0,
          odds: 2.5
        })
        .set('Authorization', 'Bearer test_wallet_address')
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Transaction blocked for security reasons'
      });
    });
  });

  describe('User Bet History', () => {
    test('should retrieve user bet history', async () => {
      const response = await request(app)
        .get(`/api/v1/betting/user/${testUserId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        history: expect.any(Array)
      });
    });

    test('should return empty history for new user', async () => {
      const newUser = await createTestUser({
        username: 'new_user_bet_api',
        email: 'new.user.bet@nen.platform'
      });

      const response = await request(app)
        .get(`/api/v1/betting/user/${newUser}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        history: []
      });
    });
  });

  describe('Payout Calculations', () => {
    test('should calculate and confirm payouts', async () => {
      const response = await request(app)
        .post(`/api/v1/betting/settle/${testMatchId}`)
        .send({
          winnerId: 'royal_guard_alpha',
          finalScore: 1.0
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        settledBets: expect.any(Array),
        totalPayout: expect.any(Number)
      });
    });

    test('should handle invalid settle requests', async () => {
      const response = await request(app)
        .post(`/api/v1/betting/settle/${testMatchId}`)
        .send({
          finalScore: 1.0
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Missing required field: winnerId'
      });
    });
  });
});

