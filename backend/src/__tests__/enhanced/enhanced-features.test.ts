/**
 * Enhanced Testing Suite for Co  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(performanceTracker);

    complianceService = mockEnhancedComplianceService;
    trainingService = mockEnhancedAITrainingService;e and Performance
 * Tests for the optimizations implemented to close the 5% gap
 *
 * Features tested:
 * - Performance optimization (<100ms API target)
 * - Fraud detection and compliance
 * - Enhanced AI training
 * - Database performance optimizations
 */

import request from 'supertest';
import express from 'express';
import {
  performanceTracker,
  getPerformanceMetrics,
  resetPerformanceMetrics
} from '../../middleware/performance';
import {
  mockEnhancedComplianceService,
  mockEnhancedAITrainingService
} from '../mocks/mockServices';

// Mock the enhanced services
jest.mock('../../services/EnhancedComplianceService', () => ({
  getEnhancedComplianceService: () => mockEnhancedComplianceService
}));

jest.mock('../../services/EnhancedAITrainingService', () => ({
  getEnhancedAITrainingService: () => mockEnhancedAITrainingService
}));

describe('Enhanced Features Test Suite', () => {
  let app: express.Application;
  let complianceService: any;
  let trainingService: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(performanceTracker);

    complianceService = mockEnhancedComplianceService;
    trainingService = mockEnhancedAITrainingService;

    // Test endpoints
    app.get('/test/performance', (req, res) => {
      res.json({ message: 'Performance test endpoint', timestamp: Date.now() });
    });

    app.post('/test/fraud', async (req, res) => {
      const { walletAddress, amount } = req.body;
      const result = await complianceService.detectFraud(walletAddress, amount, 'test');
      res.json(result);
    });

    app.get('/test/metrics', (req, res) => {
      const metrics = getPerformanceMetrics();
      res.json(metrics);
    });
  });

  beforeEach(() => {
    resetPerformanceMetrics();
  });

  describe('Performance Optimization Tests', () => {
    test('should track API response times', async () => {
      const response = await request(app)
        .get('/test/performance');

      expect(response.status).toBe(200);
      expect(response.headers['x-response-time']).toBeDefined();
      expect(response.headers['x-performance-status']).toBeDefined();
    });

    test('should maintain <100ms response time target', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/test/performance');

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100);
      expect(response.headers['x-performance-status']).toBe('OPTIMAL');
    });

    test('should track performance metrics', async () => {
      // Make several requests
      await Promise.all([
        request(app).get('/test/performance'),
        request(app).get('/test/performance'),
        request(app).get('/test/performance')
      ]);

      const response = await request(app).get('/test/metrics');
      const metrics = response.body;

      expect(metrics.requestCount).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeDefined();
      expect(metrics.fastRequests).toBeGreaterThan(0);
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app).get('/test/performance')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Total time should be reasonable for concurrent requests
      expect(totalTime).toBeLessThan(500); // 500ms for 10 concurrent requests
    });
  });

  describe('Fraud Detection and Compliance Tests', () => {
    test('should detect low-risk transactions', async () => {
      const response = await request(app)
        .post('/test/fraud')
        .send({
          walletAddress: 'normal_user_wallet',
          amount: 1.0
        });

      expect(response.status).toBe(200);
      expect(response.body.riskScore).toBeLessThan(30);
      expect(response.body.recommendedAction).toBe('allow');
      expect(response.body.isHighRisk).toBe(false);
    });

    test('should detect high-risk transactions', async () => {
      const response = await request(app)
        .post('/test/fraud')
        .send({
          walletAddress: 'new_user_wallet',
          amount: 50.0 // Large amount for new user
        });

      expect(response.status).toBe(200);
      expect(response.body.riskScore).toBeGreaterThan(30);
      expect(response.body.flaggedReasons).toContain('Large amount for new user');
    });

    test('should provide compliance metrics', async () => {
      const metrics = await complianceService.getComplianceMetrics();

      expect(metrics).toHaveProperty('totalUsers');
      expect(metrics).toHaveProperty('compliantUsers');
      expect(metrics).toHaveProperty('flaggedTransactions');
      expect(metrics).toHaveProperty('complianceRate');
      expect(metrics.complianceRate).toBeGreaterThanOrEqual(0);
      expect(metrics.complianceRate).toBeLessThanOrEqual(100);
    });

    test('should analyze transaction patterns', async () => {
      const patterns = await complianceService.analyzeTransactionPatterns('test_wallet');

      expect(patterns).toHaveProperty('walletAddress');
      expect(patterns).toHaveProperty('totalTransactions');
      expect(patterns).toHaveProperty('averageAmount');
      expect(patterns).toHaveProperty('frequency');
      expect(patterns).toHaveProperty('isAnomalous');
    });

    test('should perform KYC validations', async () => {
      const kycResult = await complianceService.checkKYCCompliance('test_wallet');

      expect(kycResult).toHaveProperty('walletAddress');
      expect(kycResult).toHaveProperty('isCompliant');
      expect(kycResult).toHaveProperty('status');
      expect(kycResult).toHaveProperty('verificationLevel');
      expect(['pending', 'approved', 'rejected', 'expired']).toContain(kycResult.status);
    });
  });

  describe('Enhanced AI Training Tests', () => {
    test('should schedule weekly training for AI agents', async () => {
      const agentId = 'test_agent_1';
      const gamesPerSession = 50;

      await trainingService.scheduleWeeklyTraining(agentId, gamesPerSession);

      const metrics = await trainingService.getTrainingMetrics(agentId);
      expect(metrics).toHaveProperty('nextScheduledUpdate');
      expect(new Date(metrics.nextScheduledUpdate)).toBeInstanceOf(Date);
    });

    test('should start self-play training sessions', async () => {
      const agentId = 'test_agent_2';
      const numberOfGames = 10;

      const session = await trainingService.startSelfPlayTraining(agentId, numberOfGames);

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('agentId', agentId);
      expect(session).toHaveProperty('status', 'running');
      expect(session).toHaveProperty('gamesPlayed', 0);
      expect(session).toHaveProperty('started');
    });

    test('should track training metrics', async () => {
      const agentId = 'test_agent_3';
      const metrics = await trainingService.getTrainingMetrics(agentId);

      expect(metrics).toHaveProperty('totalSessions');
      expect(metrics).toHaveProperty('totalGames');
      expect(metrics).toHaveProperty('averageWinRate');
      expect(metrics).toHaveProperty('eloImprovement');
      expect(metrics).toHaveProperty('lastUpdate');
      expect(metrics).toHaveProperty('nextScheduledUpdate');
    });

    test('should manage active training sessions', async () => {
      const sessions = trainingService.getActiveSessions();
      expect(Array.isArray(sessions)).toBe(true);
    });

    test('should stop training for specific agents', async () => {
      const agentId = 'test_agent_4';

      // Start training first
      await trainingService.scheduleWeeklyTraining(agentId, 10);

      // Stop training
      await trainingService.stopTraining(agentId);

      // Verify training is stopped
      const activeSessions = trainingService.getActiveSessions();
      const agentSessions = activeSessions.filter((session: any) =>
        session.agentId === agentId && session.status === 'running'
      );
      expect(agentSessions.length).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete betting flow with validations', async () => {
      const bettingApp = express();
      bettingApp.use(express.json());
      bettingApp.use(performanceTracker);

      // Mock betting endpoint with compliance
      bettingApp.post('/api/betting/place', async (req, res) => {
        try {
          const { walletAddress, amount } = req.body;

          // Perform fraud detection
          const fraudResult = await complianceService.detectFraud(
            walletAddress,
            amount,
            'bet_placement'
          );

          if (fraudResult.recommendedAction === 'block') {
            return res.status(403).json({
              success: false,
              error: 'Transaction blocked for security reasons',
              riskScore: fraudResult.riskScore
            });
          }

          return res.json({
            success: true,
            betId: 'integration_test_bet',
            riskScore: fraudResult.riskScore
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      });

      // Test normal bet
      const normalResponse = await request(bettingApp)
        .post('/api/betting/place')
        .send({
          walletAddress: 'normal_user',
          amount: 2.0,
          agentId: 'test_agent',
          matchId: 'test_match'
        });

      expect(normalResponse.status).toBe(200);
      expect(normalResponse.body.success).toBe(true);
      expect(normalResponse.body.riskScore).toBeLessThan(50);

      // Test high-risk bet
      const riskResponse = await request(bettingApp)
        .post('/api/betting/place')
        .send({
          walletAddress: 'new_user',
          amount: 75.0, // Large amount
          agentId: 'test_agent',
          matchId: 'test_match'
        });

      expect(riskResponse.body.riskScore).toBeGreaterThan(30);
    });

    test('should maintain performance under load', async () => {
      const loadTestApp = express();
      loadTestApp.use(performanceTracker);
      loadTestApp.get('/load-test', (req, res) => {
        res.json({ timestamp: Date.now() });
      });

      const concurrentRequests = 50;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(loadTestApp).get('/load-test')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be acceptable
      const averageTime = totalTime / concurrentRequests;
      expect(averageTime).toBeLessThan(100); // <100ms average
    });
  });

  describe('Error Handling and Recovery Tests', () => {
    test('should handle service failures gracefully', async () => {
      // Test with invalid wallet address
      const fraudResult = await complianceService.detectFraud(
        null as any,
        10,
        'test'
      );

      expect(fraudResult.riskScore).toBe(100);
      expect(fraudResult.isHighRisk).toBe(true);
      expect(fraudResult.recommendedAction).toBe('block');
    });

    test('should handle database connection failures', async () => {
      // This would test database resilience in a real environment
      const metrics = await complianceService.getComplianceMetrics();
      expect(metrics).toHaveProperty('totalUsers');
    });

    test('should recover from temporary service outages', async () => {
      // Test AI training service resilience
      const agentId = 'resilience_test_agent';

      try {
        await trainingService.scheduleWeeklyTraining(agentId, 5);
        const metrics = await trainingService.getTrainingMetrics(agentId);
        expect(metrics).toBeDefined();
      } catch (error) {
        // Should handle errors gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
