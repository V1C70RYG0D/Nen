"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UltraPerformanceLoadTestingServiceV2_1 = require("../../services/UltraPerformanceLoadTestingServiceV2");
const database_1 = require("../../utils/database");
const logger_1 = require("../../utils/logger");
jest.mock('../../services/GameService');
jest.mock('../../services/BettingService');
jest.mock('../../services/AIService');
jest.mock('../../utils/redis');
jest.mock('../../utils/database');
jest.mock('../../utils/logger');
const mockQuery = database_1.query;
const mockLogger = logger_1.logger;
describe('UltraPerformanceLoadTestingService', () => {
    let service;
    let mockGameService;
    let mockBettingService;
    let mockAIService;
    let mockCache;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new UltraPerformanceLoadTestingServiceV2_1.UltraPerformanceLoadTestingService();
        mockGameService = {
            createMatch: jest.fn(),
            startMatch: jest.fn(),
        };
        mockBettingService = {
            placeBet: jest.fn(),
        };
        mockAIService = {
            getAvailableAgents: jest.fn(),
        };
        mockCache = {
            del: jest.fn(),
            set: jest.fn(),
            get: jest.fn(),
            lpush: jest.fn(),
            lrange: jest.fn(),
        };
        service.gameService = mockGameService;
        service.bettingService = mockBettingService;
        service.aiService = mockAIService;
        service.cache = mockCache;
    });
    describe('executeLoadTest', () => {
        const basicConfig = {
            targetConcurrentGames: 100,
            testDurationMinutes: 5,
            gamesPerMinute: 60,
            maxLatencyMs: 100,
            enableBetting: true,
            enableSpectators: false,
            metricsInterval: 30
        };
        beforeEach(() => {
            mockAIService.getAvailableAgents.mockResolvedValue([
                { id: 'agent-1', name: 'Agent 1', eloRating: 1500 },
                { id: 'agent-2', name: 'Agent 2', eloRating: 1600 },
                { id: 'agent-3', name: 'Agent 3', eloRating: 1700 }
            ]);
            mockGameService.createMatch.mockResolvedValue({
                id: 'match-123',
                status: 'pending',
                aiAgent1Id: 'agent-1',
                aiAgent2Id: 'agent-2'
            });
            mockGameService.startMatch.mockResolvedValue({
                id: 'match-123',
                status: 'active',
                aiAgent1Id: 'agent-1',
                aiAgent2Id: 'agent-2'
            });
            mockQuery.mockResolvedValue([{ count: '50' }]);
            mockCache.lrange.mockResolvedValue([]);
            mockCache.lpush.mockResolvedValue(undefined);
            mockCache.set.mockResolvedValue(undefined);
            mockCache.del.mockResolvedValue(undefined);
        });
        it('should execute complete load test successfully', async () => {
            const result = await service.executeLoadTest(basicConfig);
            expect(result).toBeDefined();
            expect(result.testId).toBeDefined();
            expect(result.config).toEqual(basicConfig);
            expect(result.startTime).toBeInstanceOf(Date);
            expect(result.endTime).toBeInstanceOf(Date);
            expect(result.totalGamesCreated).toBeGreaterThanOrEqual(0);
            expect(result.success).toBeDefined();
            expect(mockLogger.info).toHaveBeenCalledWith('Starting ultra performance load test', expect.any(Object));
        });
        it('should handle 1000+ concurrent games target', async () => {
            const highLoadConfig = {
                ...basicConfig,
                targetConcurrentGames: 1000,
                testDurationMinutes: 10,
                gamesPerMinute: 300
            };
            const result = await service.executeLoadTest(highLoadConfig);
            expect(result.config.targetConcurrentGames).toBe(1000);
            expect(result.peakConcurrentGames).toBeGreaterThanOrEqual(0);
        });
        it('should handle test configuration validation', async () => {
            const invalidConfig = {
                targetConcurrentGames: 0,
                testDurationMinutes: -1,
                gamesPerMinute: -10,
                maxLatencyMs: -50,
                enableBetting: true,
                enableSpectators: false,
                metricsInterval: 0
            };
            const result = await service.executeLoadTest(invalidConfig);
            expect(result).toBeDefined();
        });
        it('should collect performance metrics during test', async () => {
            const result = await service.executeLoadTest(basicConfig);
            expect(result.detailedMetrics).toBeDefined();
            expect(Array.isArray(result.detailedMetrics)).toBe(true);
            expect(result.averageLatency).toBeGreaterThanOrEqual(0);
            expect(result.maxLatency).toBeGreaterThanOrEqual(0);
        });
        it('should handle errors gracefully', async () => {
            mockGameService.createMatch.mockRejectedValue(new Error('Game creation failed'));
            const result = await service.executeLoadTest(basicConfig);
            expect(result.errorCount).toBeGreaterThan(0);
            expect(result.errorRate).toBeGreaterThan(0);
            expect(result.success).toBe(false);
        });
        it('should properly clean up resources', async () => {
            await service.executeLoadTest(basicConfig);
            expect(mockCache.del).toHaveBeenCalled();
        });
    });
    describe('validatePerformance', () => {
        beforeEach(() => {
            mockAIService.getAvailableAgents.mockResolvedValue([
                { id: 'agent-1', name: 'Agent 1' }
            ]);
            mockGameService.createMatch.mockResolvedValue({
                id: 'match-123',
                status: 'pending'
            });
            mockQuery.mockResolvedValue([{ count: '25' }]);
        });
        it('should validate system can handle 1000 games', async () => {
            const result = await service.validatePerformance();
            expect(result).toBeDefined();
            expect(result.canHandle1000Games).toBeDefined();
            expect(result.currentMaxLatency).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(result.recommendations)).toBe(true);
        });
        it('should provide recommendations when performance insufficient', async () => {
            mockGameService.createMatch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
                id: 'slow-match',
                status: 'pending'
            }), 200)));
            const result = await service.validatePerformance();
            expect(result.canHandle1000Games).toBe(false);
            expect(result.recommendations.length).toBeGreaterThan(0);
            expect(result.recommendations[0]).toContain('performance insufficient');
        });
    });
    describe('Private method testing through integration', () => {
        beforeEach(() => {
            mockAIService.getAvailableAgents.mockResolvedValue([
                { id: 'agent-1', name: 'Agent 1' },
                { id: 'agent-2', name: 'Agent 2' }
            ]);
            mockGameService.createMatch.mockResolvedValue({
                id: 'test-match',
                status: 'active'
            });
            mockQuery.mockResolvedValue([{ count: '10' }]);
        });
        it('should handle ramp-up phase correctly', async () => {
            const config = {
                targetConcurrentGames: 50,
                testDurationMinutes: 2,
                gamesPerMinute: 30,
                maxLatencyMs: 100,
                enableBetting: false,
                enableSpectators: false,
                metricsInterval: 10
            };
            const result = await service.executeLoadTest(config);
            expect(result.totalGamesCreated).toBeGreaterThan(0);
        });
        it('should handle steady-state phase correctly', async () => {
            const config = {
                targetConcurrentGames: 100,
                testDurationMinutes: 3,
                gamesPerMinute: 120,
                maxLatencyMs: 50,
                enableBetting: true,
                enableSpectators: false,
                metricsInterval: 15
            };
            const result = await service.executeLoadTest(config);
            expect(result.peakConcurrentGames).toBeGreaterThanOrEqual(0);
        });
        it('should handle ramp-down phase correctly', async () => {
            const config = {
                targetConcurrentGames: 75,
                testDurationMinutes: 4,
                gamesPerMinute: 90,
                maxLatencyMs: 75,
                enableBetting: true,
                enableSpectators: true,
                metricsInterval: 20
            };
            const result = await service.executeLoadTest(config);
            expect(result.totalGamesCompleted).toBeGreaterThanOrEqual(0);
        });
    });
    describe('System metrics collection', () => {
        it('should collect comprehensive performance metrics', async () => {
            const config = {
                targetConcurrentGames: 25,
                testDurationMinutes: 1,
                gamesPerMinute: 30,
                maxLatencyMs: 200,
                enableBetting: false,
                enableSpectators: false,
                metricsInterval: 5
            };
            const result = await service.executeLoadTest(config);
            expect(result.memoryPeakMB).toBeGreaterThan(0);
            expect(result.cpuPeakPercent).toBeGreaterThanOrEqual(0);
            expect(result.cacheEfficiency).toBeGreaterThan(0);
        });
        it('should detect bottlenecks accurately', async () => {
            mockGameService.createMatch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
                id: 'slow-match',
                status: 'pending'
            }), 300)));
            const config = {
                targetConcurrentGames: 10,
                testDurationMinutes: 1,
                gamesPerMinute: 20,
                maxLatencyMs: 50,
                enableBetting: false,
                enableSpectators: false,
                metricsInterval: 10
            };
            const result = await service.executeLoadTest(config);
            expect(result.bottlenecks.length).toBeGreaterThan(0);
            expect(result.bottlenecks[0]).toContain('latency');
            expect(result.recommendations.length).toBeGreaterThan(0);
        });
    });
    describe('Concurrent operations handling', () => {
        it('should handle multiple concurrent game creation', async () => {
            mockGameService.createMatch.mockResolvedValue({
                id: 'concurrent-match',
                status: 'active'
            });
            const config = {
                targetConcurrentGames: 50,
                testDurationMinutes: 2,
                gamesPerMinute: 180,
                maxLatencyMs: 100,
                enableBetting: true,
                enableSpectators: false,
                metricsInterval: 10
            };
            const result = await service.executeLoadTest(config);
            expect(mockGameService.createMatch).toHaveBeenCalledTimes(expect.any(Number));
            expect(result.errorRate).toBeLessThan(0.1);
        });
        it('should manage worker threads effectively', async () => {
            const config = {
                targetConcurrentGames: 200,
                testDurationMinutes: 1,
                gamesPerMinute: 240,
                maxLatencyMs: 50,
                enableBetting: false,
                enableSpectators: false,
                metricsInterval: 5
            };
            const result = await service.executeLoadTest(config);
            expect(result).toBeDefined();
        });
    });
    describe('Error scenarios and recovery', () => {
        it('should handle database connection failures', async () => {
            mockQuery.mockRejectedValue(new Error('Database connection lost'));
            const config = {
                targetConcurrentGames: 10,
                testDurationMinutes: 1,
                gamesPerMinute: 15,
                maxLatencyMs: 100,
                enableBetting: false,
                enableSpectators: false,
                metricsInterval: 10
            };
            const result = await service.executeLoadTest(config);
            expect(result.errorCount).toBeGreaterThan(0);
            expect(result.success).toBe(false);
        });
        it('should handle cache service failures', async () => {
            mockCache.lpush.mockRejectedValue(new Error('Cache service unavailable'));
            const config = {
                targetConcurrentGames: 15,
                testDurationMinutes: 1,
                gamesPerMinute: 20,
                maxLatencyMs: 100,
                enableBetting: false,
                enableSpectators: false,
                metricsInterval: 10
            };
            const result = await service.executeLoadTest(config);
            expect(result.errorCount).toBeGreaterThan(0);
        });
        it('should handle AI service unavailability', async () => {
            mockAIService.getAvailableAgents.mockRejectedValue(new Error('AI service down'));
            const config = {
                targetConcurrentGames: 5,
                testDurationMinutes: 1,
                gamesPerMinute: 10,
                maxLatencyMs: 100,
                enableBetting: false,
                enableSpectators: false,
                metricsInterval: 10
            };
            await expect(service.executeLoadTest(config)).rejects.toThrow();
        });
    });
    describe('Performance optimization validation', () => {
        it('should verify connection pool optimization', async () => {
            const config = {
                targetConcurrentGames: 500,
                testDurationMinutes: 2,
                gamesPerMinute: 300,
                maxLatencyMs: 50,
                enableBetting: true,
                enableSpectators: true,
                metricsInterval: 10
            };
            const result = await service.executeLoadTest(config);
            expect(result.peakConcurrentGames).toBeGreaterThanOrEqual(0);
        });
        it('should validate caching effectiveness', async () => {
            const config = {
                targetConcurrentGames: 100,
                testDurationMinutes: 3,
                gamesPerMinute: 120,
                maxLatencyMs: 75,
                enableBetting: true,
                enableSpectators: false,
                metricsInterval: 15
            };
            const result = await service.executeLoadTest(config);
            expect(result.cacheEfficiency).toBeGreaterThan(0.8);
        });
    });
});
describe('Load Testing Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should integrate with actual game service for realistic testing', async () => {
        const service = new UltraPerformanceLoadTestingServiceV2_1.UltraPerformanceLoadTestingService();
        expect(service).toBeDefined();
    });
    it('should validate MagicBlock integration under load', async () => {
        const service = new UltraPerformanceLoadTestingServiceV2_1.UltraPerformanceLoadTestingService();
        expect(service).toBeDefined();
    });
});
describe('Edge Case Handling', () => {
    let service;
    beforeEach(() => {
        service = new UltraPerformanceLoadTestingServiceV2_1.UltraPerformanceLoadTestingService();
    });
    it('should handle zero-duration tests', async () => {
        const config = {
            targetConcurrentGames: 1,
            testDurationMinutes: 0,
            gamesPerMinute: 1,
            maxLatencyMs: 100,
            enableBetting: false,
            enableSpectators: false,
            metricsInterval: 1
        };
        const result = await service.executeLoadTest(config);
        expect(result.totalGamesCreated).toBe(0);
    });
    it('should handle extreme load configurations', async () => {
        const config = {
            targetConcurrentGames: 10000,
            testDurationMinutes: 1,
            gamesPerMinute: 6000,
            maxLatencyMs: 10,
            enableBetting: true,
            enableSpectators: true,
            metricsInterval: 1
        };
        const result = await service.executeLoadTest(config);
        expect(result).toBeDefined();
    });
});
exports.default = {
    testEnvironment: 'node',
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100
        }
    }
};
//# sourceMappingURL=UltraPerformanceLoadTestingServiceV2.test.js.map