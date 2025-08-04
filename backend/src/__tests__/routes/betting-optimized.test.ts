/**
 * Optimized Betting Routes Tests - Final 5% Gap Closure
 * Fixed test suite that properly validates the optimized betting service
 * Following GI.md guidelines for 100% test coverage
 */

import request from 'supertest';
import express from 'express';
import bettingRoutes, { setOptimizedBettingService } from '../../routes/betting-optimized';
import OptimizedBettingService from '../../services/OptimizedBettingService';

describe('Optimized Betting Routes', () => {
    let app: express.Application;
    let mockBettingService: any;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        // Use optimized betting routes
        app.use('/api/betting', bettingRoutes);

        // Add error handling middleware (must be AFTER routes)
        app.use((err: any, req: any, res: any, next: any) => {
            res.status(err.status || err.statusCode || 500).json({
                error: err.message || 'Internal server error',
                timestamp: new Date().toISOString()
            });
        });

        // Create mock betting service with all required methods
        mockBettingService = {
            placeBet: jest.fn(),
            calculateOdds: jest.fn(),
            settleMatch: jest.fn(),
            getUserBets: jest.fn(),
            getHealthStatus: jest.fn()
        };

        // Inject the mock service
        setOptimizedBettingService(mockBettingService);
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
                betId: 'bet-789',
                message: 'Bet placed successfully'
            });

            expect(mockBettingService.placeBet).toHaveBeenCalledWith(
                'demo_wallet_address',
                'match-123',
                1.5,
                'agent-456',
                'ai_agent'
            );
        });

        test('should support gameId instead of matchId', async () => {
            const betData = {
                gameId: 'game-123', // Using gameId instead of matchId
                agentId: 'agent-456',
                amount: 1.5
            };

            mockBettingService.placeBet.mockResolvedValue({
                success: true,
                betId: 'bet-789'
            });

            const response = await request(app)
                .post('/api/betting/place')
                .send(betData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockBettingService.placeBet).toHaveBeenCalledWith(
                'demo_wallet_address',
                'game-123', // Should use gameId when matchId is not provided
                1.5,
                'agent-456',
                'ai_agent'
            );
        });

        test('should reject bet with insufficient funds', async () => {
            const betData = {
                matchId: 'match-123',
                agentId: 'agent-456',
                amount: 50,
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
                matchId: 'match-123'
                // Missing agentId and amount
            };

            const response = await request(app)
                .post('/api/betting/place')
                .send(incompleteBetData)
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Missing required field: agentId'
            });
        });

        test('should validate amount limits', async () => {
            const betData = {
                matchId: 'match-123',
                agentId: 'agent-456',
                amount: 0.05 // Below minimum
            };

            const response = await request(app)
                .post('/api/betting/place')
                .send(betData)
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Bet amount must be between 0.1 and 100 SOL'
            });
        });

        test('should validate amount type', async () => {
            const betData = {
                matchId: 'match-123',
                agentId: 'agent-456',
                amount: 'invalid' // Invalid type
            };

            const response = await request(app)
                .post('/api/betting/place')
                .send(betData)
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                error: 'Missing or invalid required field: amount'
            });
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

            expect(response.body).toMatchObject({
                matchId,
                odds: mockOdds
            });
            expect(response.body.timestamp).toBeDefined();
            expect(mockBettingService.calculateOdds).toHaveBeenCalledWith(matchId);
        });

        test('should handle non-existent match', async () => {
            const matchId = 'non-existent-match';

            mockBettingService.calculateOdds.mockResolvedValue(null);

            const response = await request(app)
                .get(`/api/betting/odds/${matchId}`)
                .expect(404);

            expect(response.body).toMatchObject({
                error: 'Match not found or no betting data available'
            });
        });

        test('should validate matchId parameter', async () => {
            // Test with empty matchId
            const response = await request(app)
                .get('/api/betting/odds/')
                .expect(404); // Express will return 404 for missing route parameter
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
                    status: 'active'
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

            expect(response.body).toMatchObject({
                userId,
                bets: mockBets,
                count: 2,
                limit: 50
            });
            expect(response.body.timestamp).toBeDefined();
            expect(mockBettingService.getUserBets).toHaveBeenCalledWith(userId, 50);
        });

        test('should handle custom limit parameter', async () => {
            const userId = 'user-123';
            const limit = 10;

            mockBettingService.getUserBets.mockResolvedValue([]);

            await request(app)
                .get(`/api/betting/user/${userId}?limit=${limit}`)
                .expect(200);

            expect(mockBettingService.getUserBets).toHaveBeenCalledWith(userId, limit);
        });

        test('should handle empty betting history', async () => {
            const userId = 'user-no-bets';

            mockBettingService.getUserBets.mockResolvedValue([]);

            const response = await request(app)
                .get(`/api/betting/user/${userId}`)
                .expect(200);

            expect(response.body).toMatchObject({
                userId,
                bets: [],
                count: 0
            });
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
                totalPayout: 12.5,
                matchId
            });
            expect(response.body.settledAt).toBeDefined();
            expect(mockBettingService.settleMatch).toHaveBeenCalledWith(
                matchId,
                'agent-456',
                { agent1: 0, agent2: 1 }
            );
        });

        test('should validate required winnerId', async () => {
            const matchId = 'match-123';
            const settlementData = {
                finalScore: { agent1: 0, agent2: 1 }
                // Missing winnerId
            };

            const response = await request(app)
                .post(`/api/betting/settle/${matchId}`)
                .send(settlementData)
                .expect(400);

            expect(response.body).toMatchObject({
                error: 'Missing required field: winnerId'
            });
        });

        test('should handle settlement failures', async () => {
            const matchId = 'match-123';
            const settlementData = {
                winnerId: 'agent-456'
            };

            mockBettingService.settleMatch.mockResolvedValue({
                success: false,
                settledBets: 0,
                totalPayout: 0,
                error: 'Match not found'
            });

            const response = await request(app)
                .post(`/api/betting/settle/${matchId}`)
                .send(settlementData)
                .expect(200); // Service returns error in body, not HTTP error

            expect(response.body).toMatchObject({
                success: false,
                error: 'Match not found'
            });
        });
    });

    describe('Backward Compatibility Routes', () => {
        test('GET /api/betting/pools/:gameId should return betting pools', async () => {
            const gameId = 'game-123';

            const response = await request(app)
                .get(`/api/betting/pools/${gameId}`)
                .expect(200);

            expect(response.body).toMatchObject({
                gameId,
                totalPool: 5.75,
                pools: expect.arrayContaining([
                    expect.objectContaining({
                        agentId: 'royal_guard_alpha'
                    })
                ])
            });
        });

        test('GET /api/betting/history/:gameId should return betting history', async () => {
            const gameId = 'game-123';

            const response = await request(app)
                .get(`/api/betting/history/${gameId}`)
                .expect(200);

            expect(response.body).toMatchObject({
                gameId,
                bets: expect.any(Array),
                totalBets: expect.any(Number),
                totalVolume: expect.any(Number)
            });
        });
    });

    describe('Service Health Check', () => {
        test('GET /api/betting/status should return service status', async () => {
            mockBettingService.getHealthStatus.mockReturnValue({
                status: 'healthy',
                activePools: 3,
                totalBets: 15
            });

            const response = await request(app)
                .get('/api/betting/status')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'healthy',
                activePools: 3,
                totalBets: 15,
                version: '1.0.0'
            });
            expect(response.body.timestamp).toBeDefined();
        });

        test('should handle service errors gracefully', async () => {
            // Mock service to throw error
            mockBettingService.getHealthStatus.mockImplementation(() => {
                throw new Error('Service unavailable');
            });

            const response = await request(app)
                .get('/api/betting/status')
                .expect(500);

            expect(response.body).toMatchObject({
                status: 'error',
                error: 'Service unavailable'
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle service errors gracefully', async () => {
            mockBettingService.placeBet.mockRejectedValue(new Error('Database connection failed'));

            const betData = {
                matchId: 'match-123',
                agentId: 'agent-456',
                amount: 1.0
            };

            const response = await request(app)
                .post('/api/betting/place')
                .send(betData)
                .expect(500);

            expect(response.body).toHaveProperty('error');
            expect(response.body.timestamp).toBeDefined();
        });

        test('should handle invalid JSON gracefully', async () => {
            const response = await request(app)
                .post('/api/betting/place')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });
});

// Integration test with real OptimizedBettingService
describe('Optimized Betting Service Integration', () => {
    let realService: OptimizedBettingService;

    beforeAll(() => {
        realService = new OptimizedBettingService();
    });

    test('should place and retrieve bets with real service', async () => {
        const result = await realService.placeBet(
            'test-wallet',
            'test-match',
            1.0,
            'test-agent',
            'ai_agent'
        );

        expect(result.success).toBe(true);
        expect(result.betId).toBeDefined();

        // Retrieve user bets
        const history = await realService.getUserBets('test-wallet');
        expect(history.length).toBeGreaterThan(0);
        expect(history[0].id).toBe(result.betId);
    });

    test('should calculate odds for active matches', async () => {
        // First place some bets to create pools
        await realService.placeBet('user1', 'match-odds-test', 2.0, 'agent1', 'ai_agent');
        await realService.placeBet('user2', 'match-odds-test', 3.0, 'agent2', 'ai_agent');

        const odds = await realService.calculateOdds('match-odds-test');
        expect(odds).not.toBeNull();
        expect(odds?.agent1).toBeDefined();
        expect(odds?.agent2).toBeDefined();
        expect(odds?.agent1?.odds).toBeGreaterThan(1);
        expect(odds?.agent2?.odds).toBeGreaterThan(1);
    });

    test('should settle matches correctly', async () => {
        // Place bets
        await realService.placeBet('user1', 'match-settle-test', 1.0, 'winner-agent', 'ai_agent');
        await realService.placeBet('user2', 'match-settle-test', 1.0, 'loser-agent', 'ai_agent');

        // Settle match
        const result = await realService.settleMatch('match-settle-test', 'winner-agent');

        expect(result.success).toBe(true);
        expect(result.settledBets).toBe(2);
        expect(result.totalPayout).toBeGreaterThan(0);
    });

    test('should provide health status', async () => {
        const status = realService.getHealthStatus();

        expect(status.status).toBe('healthy');
        expect(status.activePools).toBeGreaterThanOrEqual(0);
        expect(status.totalBets).toBeGreaterThanOrEqual(0);
    });
});

export default describe;
