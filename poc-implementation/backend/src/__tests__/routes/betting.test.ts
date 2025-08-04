import request from 'supertest';
import express from 'express';
import bettingRoutes, { setBettingService } from '../../routes/betting';
import { getTestRedisClient, getTestSolanaConnection, cleanupTestEnvironment } from '../setup';

// Mock the services
jest.mock('../../services/EnhancedBettingService', () => ({
  EnhancedBettingService: jest.fn().mockImplementation(() => ({
    placeBet: jest.fn(),
    calculateOdds: jest.fn(),
    settleMatch: jest.fn(),
    getUserBets: jest.fn()
  }))
}));

describe('Betting Routes', () => {
  let app: express.Application;
  let mockBettingService: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    app.use('/api/betting', bettingRoutes);

    // Add error handling middleware for tests (must be AFTER routes)
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.status || err.statusCode || 500).json({ error: err.message });
    });

    // Mock the betting service methods
    const { EnhancedBettingService } = require('../../services/EnhancedBettingService');
    mockBettingService = new EnhancedBettingService();

    // Inject the mock service into the routes
    setBettingService(mockBettingService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/betting/place', () => {
    test('should place a bet successfully', async () => {
      const betData = {
        matchId: 'match-123',
        agentId: 'agent-456',
        amount: 1.5,
        odds: 2.0
      };

      mockBettingService.placeBet.mockResolvedValue({
        success: true,
        betId: 'bet-789',
        message: 'Bet placed successfully'
      });

      const response = await request(app)
        .post('/api/betting/place')
        .send(betData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        betId: 'bet-789'
      });
    });

    test('should reject bet with insufficient funds', async () => {
      const betData = {
        matchId: 'match-123',
        agentId: 'agent-456',
        amount: 50, // Valid amount but service will reject due to insufficient funds
        odds: 2.0
      };

      mockBettingService.placeBet.mockResolvedValue({
        success: false,
        error: 'Insufficient funds'
      });

      const response = await request(app)
        .post('/api/betting/place')
        .send(betData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Insufficient funds'
      });
    });

    test('should validate required fields', async () => {
      const incompleteBetData = {
        matchId: 'match-123',
        // Missing agentId, amount, and odds
      };

      await request(app)
        .post('/api/betting/place')
        .send(incompleteBetData)
        .expect(400);
    });
  });

  describe('GET /api/betting/odds/:matchId', () => {
    test('should return current odds for a match', async () => {
      const matchId = 'match-123';
      const mockOdds = {
        agent1: { odds: 1.8, pool: 10.5 },
        agent2: { odds: 2.2, pool: 8.3 }
      };

      mockBettingService.calculateOdds.mockResolvedValue(mockOdds);

      const response = await request(app)
        .get(`/api/betting/odds/${matchId}`)
        .expect(200);

      expect(response.body).toMatchObject(mockOdds);
      expect(mockBettingService.calculateOdds).toHaveBeenCalledWith(matchId);
    });

    test('should handle non-existent match', async () => {
      const matchId = 'non-existent-match';

      mockBettingService.calculateOdds.mockResolvedValue(null);

      await request(app)
        .get(`/api/betting/odds/${matchId}`)
        .expect(404);
    });
  });

  describe('GET /api/betting/user/:userId', () => {
    test('should return user betting history', async () => {
      const userId = 'user-123';
      const mockBets = [
        {
          id: 'bet-1',
          matchId: 'match-1',
          amount: 1.0,
          odds: 2.0,
          status: 'pending'
        },
        {
          id: 'bet-2',
          matchId: 'match-2',
          amount: 0.5,
          odds: 1.8,
          status: 'won'
        }
      ];

      mockBettingService.getUserBets.mockResolvedValue(mockBets);

      const response = await request(app)
        .get(`/api/betting/user/${userId}`)
        .expect(200);

      expect(response.body).toEqual(mockBets);
      expect(mockBettingService.getUserBets).toHaveBeenCalledWith(userId);
    });
  });

  describe('POST /api/betting/settle/:matchId', () => {
    test('should settle match bets successfully', async () => {
      const matchId = 'match-123';
      const settlementData = {
        winnerId: 'agent-456',
        finalScore: { agent1: 0, agent2: 1 }
      };

      mockBettingService.settleMatch.mockResolvedValue({
        success: true,
        settledBets: 5,
        totalPayout: 12.5
      });

      const response = await request(app)
        .post(`/api/betting/settle/${matchId}`)
        .send(settlementData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        settledBets: 5,
        totalPayout: 12.5
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      mockBettingService.placeBet.mockRejectedValue(new Error('Database connection failed'));

      const betData = {
        matchId: 'match-123',
        agentId: 'agent-456',
        amount: 1.0,
        odds: 2.0
      };

      const response = await request(app)
        .post('/api/betting/place')
        .send(betData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('should validate SOL amount limits', async () => {
      const betData = {
        matchId: 'match-123',
        agentId: 'agent-456',
        amount: 0.05, // Below minimum
        odds: 2.0
      };

      await request(app)
        .post('/api/betting/place')
        .send(betData)
        .expect(400);
    });
  });
});
