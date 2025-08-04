/**
 * Marketplace API Integration Tests
 *
 * Test Scenarios:
 * - Agent listing retrieval
 * - Search functionality
 * - Purchase confirmations
 * - Inventory updates
 */

import request from 'supertest';
import NenPlatformServer from '../../main';
import { setupTestEnvironment, cleanupTestEnvironment } from '../../setup';
import { createTestUser, createTestAgent } from '../fixtures/testData';

describe('Marketplace API Integration Tests', () => {
  let server: NenPlatformServer;
  let app: any;
  let testUserId: string;
  let testAgentId: string;

  beforeAll(async () => {
    await setupTestEnvironment();
    server = new NenPlatformServer();
    app = server.getApp();

    // Create test data
    testUserId = await createTestUser({
      username: 'test_user_market_api',
      email: 'test.market@nen.platform'
    });

    testAgentId = await createTestAgent({
      name: 'Phantom Striker',
      type: 'agent',
      rarity: 'rare'
    });
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  describe('Agent Listing Retrieval', () => {
    test('should retrieve all agent listings successfully', async () => {
      const response = await request(app)
        .get('/api/v1/nft/marketplace')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        listings: expect.any(Array),
        total: expect.any(Number)
      });

      expect(response.body.listings.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    test('should search agents by rarity successfully', async () => {
      const response = await request(app)
        .get('/api/v1/nft/marketplace')
        .query({ rarity: 'rare' })
        .expect(200);

      response.body.listings.forEach((agent: any) => {
        expect(agent.rarity).toBe('rare');
      });
    });

    test('should search agents by category successfully', async () => {
      const response = await request(app)
        .get('/api/v1/nft/marketplace')
        .query({ category: 'agent' })
        .expect(200);

      response.body.listings.forEach((agent: any) => {
        expect(agent.type).toBe('agent');
      });
    });

    test('should return empty array for non-existent category', async () => {
      const response = await request(app)
        .get('/api/v1/nft/marketplace')
        .query({ category: 'nonexistent' })
        .expect(200);

      expect(response.body.listings).toEqual([]);
    });
  });

  describe('Purchase Confirmations', () => {
    test('should confirm agent purchase successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/nft/buy/${testAgentId}`)
        .send({ price: 10.0 })
        .set('Authorization', 'Bearer test_wallet_address')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        purchase: expect.any(Object)
      });

      // Verify inventory update
      const inventoryResponse = await request(app)
        .get(`/api/v1/nft/collection/${testUserId}`)
        .expect(200);

      expect(inventoryResponse.body.collection).toEqual(expect.arrayContaining([
        expect.objectContaining({
          tokenId: testAgentId
        })
      ]));
    });

    test('should handle insufficient funds error', async () => {
      const response = await request(app)
        .post(`/api/v1/nft/buy/${testAgentId}`)
        .send({ price: 1000000.0 })
        .set('Authorization', 'Bearer test_wallet_address')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Insufficient funds'
      });
    });
  });

  describe('Inventory Updates', () => {
    test('should update inventory when agent is listed for sale', async () => {
      await request(app)
        .post('/api/v1/nft/list')
        .send({
          tokenId: testAgentId,
          price: 10.0,
          duration: 24
        })
        .expect(200);

      const response = await request(app)
        .get(`/api/v1/nft/collection/${testUserId}`)
        .expect(200);

      expect(response.body.collection.some((nft: any) => nft.tokenId === testAgentId)).toBe(false);
    });
  });
});

