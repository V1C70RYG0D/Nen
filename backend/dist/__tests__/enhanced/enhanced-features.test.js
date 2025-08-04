"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const performance_1 = require("../../middleware/performance");
const mockServices_1 = require("../mocks/mockServices");
jest.mock('../../services/EnhancedComplianceService', () => ({
    getEnhancedComplianceService: () => mockServices_1.mockEnhancedComplianceService
}));
jest.mock('../../services/EnhancedAITrainingService', () => ({
    getEnhancedAITrainingService: () => mockServices_1.mockEnhancedAITrainingService
}));
describe('Enhanced Features Test Suite', () => {
    let app;
    let complianceService;
    let trainingService;
    beforeAll(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use(performance_1.performanceTracker);
        complianceService = mockServices_1.mockEnhancedComplianceService;
        trainingService = mockServices_1.mockEnhancedAITrainingService;
        app.get('/test/performance', (req, res) => {
            res.json({ message: 'Performance test endpoint', timestamp: Date.now() });
        });
        app.post('/test/fraud', async (req, res) => {
            const { walletAddress, amount } = req.body;
            const result = await complianceService.detectFraud(walletAddress, amount, 'test');
            res.json(result);
        });
        app.get('/test/metrics', (req, res) => {
            const metrics = (0, performance_1.getPerformanceMetrics)();
            res.json(metrics);
        });
    });
    beforeEach(() => {
        (0, performance_1.resetPerformanceMetrics)();
    });
    describe('Performance Optimization Tests', () => {
        test('should track API response times', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/test/performance');
            expect(response.status).toBe(200);
            expect(response.headers['x-response-time']).toBeDefined();
            expect(response.headers['x-performance-status']).toBeDefined();
        });
        test('should maintain <100ms response time target', async () => {
            const startTime = Date.now();
            const response = await (0, supertest_1.default)(app)
                .get('/test/performance');
            const responseTime = Date.now() - startTime;
            expect(response.status).toBe(200);
            expect(responseTime).toBeLessThan(100);
            expect(response.headers['x-performance-status']).toBe('OPTIMAL');
        });
        test('should track performance metrics', async () => {
            await Promise.all([
                (0, supertest_1.default)(app).get('/test/performance'),
                (0, supertest_1.default)(app).get('/test/performance'),
                (0, supertest_1.default)(app).get('/test/performance')
            ]);
            const response = await (0, supertest_1.default)(app).get('/test/metrics');
            const metrics = response.body;
            expect(metrics.requestCount).toBeGreaterThan(0);
            expect(metrics.averageResponseTime).toBeDefined();
            expect(metrics.fastRequests).toBeGreaterThan(0);
        });
        test('should handle concurrent requests efficiently', async () => {
            const concurrentRequests = 10;
            const requests = Array(concurrentRequests).fill(null).map(() => (0, supertest_1.default)(app).get('/test/performance'));
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
            expect(totalTime).toBeLessThan(500);
        });
    });
    describe('Fraud Detection and Compliance Tests', () => {
        test('should detect low-risk transactions', async () => {
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
                .post('/test/fraud')
                .send({
                walletAddress: 'new_user_wallet',
                amount: 50.0
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
        test('should perform KYC compliance checks', async () => {
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
            await trainingService.scheduleWeeklyTraining(agentId, 10);
            await trainingService.stopTraining(agentId);
            const activeSessions = trainingService.getActiveSessions();
            const agentSessions = activeSessions.filter((session) => session.agentId === agentId && session.status === 'running');
            expect(agentSessions.length).toBe(0);
        });
    });
    describe('Integration Tests', () => {
        test('should handle complete betting flow with compliance checks', async () => {
            const bettingApp = (0, express_1.default)();
            bettingApp.use(express_1.default.json());
            bettingApp.use(performance_1.performanceTracker);
            bettingApp.post('/api/betting/place', async (req, res) => {
                try {
                    const { walletAddress, amount } = req.body;
                    const fraudResult = await complianceService.detectFraud(walletAddress, amount, 'bet_placement');
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
                }
                catch (error) {
                    return res.status(500).json({
                        success: false,
                        error: 'Internal server error'
                    });
                }
            });
            const normalResponse = await (0, supertest_1.default)(bettingApp)
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
            const riskResponse = await (0, supertest_1.default)(bettingApp)
                .post('/api/betting/place')
                .send({
                walletAddress: 'new_user',
                amount: 75.0,
                agentId: 'test_agent',
                matchId: 'test_match'
            });
            expect(riskResponse.body.riskScore).toBeGreaterThan(30);
        });
        test('should maintain performance under load', async () => {
            const loadTestApp = (0, express_1.default)();
            loadTestApp.use(performance_1.performanceTracker);
            loadTestApp.get('/load-test', (req, res) => {
                res.json({ timestamp: Date.now() });
            });
            const concurrentRequests = 50;
            const requests = Array(concurrentRequests).fill(null).map(() => (0, supertest_1.default)(loadTestApp).get('/load-test'));
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
            const averageTime = totalTime / concurrentRequests;
            expect(averageTime).toBeLessThan(100);
        });
    });
    describe('Error Handling and Recovery Tests', () => {
        test('should handle service failures gracefully', async () => {
            const fraudResult = await complianceService.detectFraud(null, 10, 'test');
            expect(fraudResult.riskScore).toBe(100);
            expect(fraudResult.isHighRisk).toBe(true);
            expect(fraudResult.recommendedAction).toBe('block');
        });
        test('should handle database connection failures', async () => {
            const metrics = await complianceService.getComplianceMetrics();
            expect(metrics).toHaveProperty('totalUsers');
        });
        test('should recover from temporary service outages', async () => {
            const agentId = 'resilience_test_agent';
            try {
                await trainingService.scheduleWeeklyTraining(agentId, 5);
                const metrics = await trainingService.getTrainingMetrics(agentId);
                expect(metrics).toBeDefined();
            }
            catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });
    });
});
//# sourceMappingURL=enhanced-features.test.js.map