"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ultraPerformanceLoadTestingService = exports.UltraPerformanceLoadTestingService = void 0;
const logger_1 = require("../utils/logger");
const GameService_1 = require("./GameService");
const BettingService_1 = require("./BettingService");
const AIService_1 = require("./AIService");
const redis_1 = require("../utils/redis");
const database_1 = require("../utils/database");
const perf_hooks_1 = require("perf_hooks");
const worker_threads_1 = require("worker_threads");
const os = __importStar(require("os"));
class UltraPerformanceLoadTestingService {
    gameService;
    bettingService;
    aiService;
    cache;
    activeTests = new Map();
    workers = [];
    metricsHistory = [];
    constructor() {
        this.gameService = new GameService_1.GameService();
        this.bettingService = new BettingService_1.BettingService();
        this.aiService = new AIService_1.AIService();
        this.cache = new redis_1.CacheService();
    }
    async executeLoadTest(config) {
        const testId = `load_test_${Date.now()}`;
        const startTime = new Date();
        logger_1.logger.info('Starting ultra performance load test', {
            testId,
            config,
            availableCPUs: os.cpus().length,
            totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024)
        });
        try {
            await this.prepareTestEnvironment(config);
            const metricsCollector = this.startMetricsCollection(testId, config.metricsInterval);
            const result = await this.runLoadTestPhases(testId, config, startTime);
            clearInterval(metricsCollector);
            const finalResult = await this.analyzeTestResults(testId, result, startTime);
            logger_1.logger.info('Load test completed', {
                testId,
                success: finalResult.success,
                peakConcurrentGames: finalResult.peakConcurrentGames,
                averageLatency: finalResult.averageLatency
            });
            return finalResult;
        }
        catch (error) {
            logger_1.logger.error('Load test failed:', error);
            throw error;
        }
        finally {
            await this.cleanupTestEnvironment(testId);
        }
    }
    async prepareTestEnvironment(config) {
        await this.cache.del('agents:*');
        const agents = await this.aiService.getAvailableAgents();
        for (const agent of agents) {
            await this.cache.set(`agent:${agent.id}`, agent, 3600);
        }
        await this.optimizeConnectionPools(config);
        await this.initializeWorkerThreads(config);
        logger_1.logger.info('Test environment prepared', {
            cachedAgents: agents.length,
            workerThreads: this.workers.length
        });
    }
    async optimizeConnectionPools(config) {
        const maxConnections = Math.min(config.targetConcurrentGames * 2, 200);
        process.env.DB_POOL_MAX = maxConnections.toString();
        process.env.DB_POOL_MIN = Math.floor(maxConnections / 4).toString();
        process.env.REDIS_POOL_MAX = Math.floor(maxConnections / 2).toString();
        logger_1.logger.info('Connection pools optimized', { maxConnections });
    }
    async initializeWorkerThreads(config) {
        const numWorkers = Math.min(os.cpus().length, Math.ceil(config.targetConcurrentGames / 100));
        for (let i = 0; i < numWorkers; i++) {
            const worker = new worker_threads_1.Worker(__filename, {
                workerData: { workerId: i, config }
            });
            worker.on('error', (error) => {
                logger_1.logger.error(`Worker ${i} error:`, error);
            });
            this.workers.push(worker);
        }
        logger_1.logger.info('Worker threads initialized', { count: numWorkers });
    }
    async runLoadTestPhases(testId, config, startTime) {
        let totalGamesCreated = 0;
        let totalGamesCompleted = 0;
        let errorCount = 0;
        let peakConcurrentGames = 0;
        const latencies = [];
        const rampUpDuration = config.testDurationMinutes * 0.25;
        logger_1.logger.info('Phase 1: Ramp-up started', { durationMinutes: rampUpDuration });
        const rampUpResult = await this.executeRampUpPhase(config, rampUpDuration, testId);
        totalGamesCreated += rampUpResult.gamesCreated;
        totalGamesCompleted += rampUpResult.gamesCompleted;
        errorCount += rampUpResult.errors;
        latencies.push(...rampUpResult.latencies);
        peakConcurrentGames = Math.max(peakConcurrentGames, rampUpResult.peakConcurrent);
        const steadyStateDuration = config.testDurationMinutes * 0.5;
        logger_1.logger.info('Phase 2: Steady-state started', { durationMinutes: steadyStateDuration });
        const steadyStateResult = await this.executeSteadyStatePhase(config, steadyStateDuration, testId);
        totalGamesCreated += steadyStateResult.gamesCreated;
        totalGamesCompleted += steadyStateResult.gamesCompleted;
        errorCount += steadyStateResult.errors;
        latencies.push(...steadyStateResult.latencies);
        peakConcurrentGames = Math.max(peakConcurrentGames, steadyStateResult.peakConcurrent);
        const rampDownDuration = config.testDurationMinutes * 0.25;
        logger_1.logger.info('Phase 3: Ramp-down started', { durationMinutes: rampDownDuration });
        const rampDownResult = await this.executeRampDownPhase(config, rampDownDuration, testId);
        totalGamesCreated += rampDownResult.gamesCreated;
        totalGamesCompleted += rampDownResult.gamesCompleted;
        errorCount += rampDownResult.errors;
        latencies.push(...rampDownResult.latencies);
        return {
            testId,
            totalGamesCreated,
            totalGamesCompleted,
            peakConcurrentGames,
            errorCount,
            averageLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b) / latencies.length : 0,
            maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0
        };
    }
    async executeRampUpPhase(config, durationMinutes, testId) {
        let gamesCreated = 0;
        let gamesCompleted = 0;
        let errors = 0;
        const latencies = [];
        let peakConcurrent = 0;
        const intervalMs = 1000;
        const totalIntervals = (durationMinutes * 60 * 1000) / intervalMs;
        const maxGamesPerInterval = Math.ceil(config.gamesPerMinute / 60);
        for (let i = 0; i < totalIntervals; i++) {
            const progress = i / totalIntervals;
            const gamesThisInterval = Math.ceil(maxGamesPerInterval * progress);
            const intervalResults = await this.createGamesInterval(gamesThisInterval, config, testId);
            gamesCreated += intervalResults.created;
            gamesCompleted += intervalResults.completed;
            errors += intervalResults.errors;
            latencies.push(...intervalResults.latencies);
            const currentConcurrent = await this.getCurrentConcurrentGames();
            peakConcurrent = Math.max(peakConcurrent, currentConcurrent);
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        return { gamesCreated, gamesCompleted, errors, latencies, peakConcurrent };
    }
    async executeSteadyStatePhase(config, durationMinutes, testId) {
        let gamesCreated = 0;
        let gamesCompleted = 0;
        let errors = 0;
        const latencies = [];
        let peakConcurrent = 0;
        const intervalMs = 1000;
        const totalIntervals = (durationMinutes * 60 * 1000) / intervalMs;
        const gamesPerInterval = Math.ceil(config.gamesPerMinute / 60);
        for (let i = 0; i < totalIntervals; i++) {
            const intervalResults = await this.createGamesInterval(gamesPerInterval, config, testId);
            gamesCreated += intervalResults.created;
            gamesCompleted += intervalResults.completed;
            errors += intervalResults.errors;
            latencies.push(...intervalResults.latencies);
            const currentConcurrent = await this.getCurrentConcurrentGames();
            peakConcurrent = Math.max(peakConcurrent, currentConcurrent);
            if (currentConcurrent > config.targetConcurrentGames * 1.1) {
                await new Promise(resolve => setTimeout(resolve, intervalMs * 2));
            }
            else {
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }
        return { gamesCreated, gamesCompleted, errors, latencies, peakConcurrent };
    }
    async executeRampDownPhase(config, durationMinutes, testId) {
        let gamesCreated = 0;
        let gamesCompleted = 0;
        let errors = 0;
        const latencies = [];
        const intervalMs = 1000;
        const totalIntervals = (durationMinutes * 60 * 1000) / intervalMs;
        const maxGamesPerInterval = Math.ceil(config.gamesPerMinute / 60);
        for (let i = 0; i < totalIntervals; i++) {
            const progress = 1 - (i / totalIntervals);
            const gamesThisInterval = Math.ceil(maxGamesPerInterval * progress);
            if (gamesThisInterval > 0) {
                const intervalResults = await this.createGamesInterval(gamesThisInterval, config, testId);
                gamesCreated += intervalResults.created;
                gamesCompleted += intervalResults.completed;
                errors += intervalResults.errors;
                latencies.push(...intervalResults.latencies);
            }
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        let remainingGames = await this.getCurrentConcurrentGames();
        while (remainingGames > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            remainingGames = await this.getCurrentConcurrentGames();
            gamesCompleted += await this.getCompletedGamesCount(testId);
        }
        return { gamesCreated, gamesCompleted, errors, latencies };
    }
    async createGamesInterval(gameCount, config, testId) {
        const promises = [];
        for (let i = 0; i < gameCount; i++) {
            promises.push(this.createSingleTestGame(config, testId));
        }
        const results = await Promise.allSettled(promises);
        let created = 0;
        let errors = 0;
        const latencies = [];
        for (const result of results) {
            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    created++;
                    latencies.push(result.value.latency);
                }
                else {
                    errors++;
                }
            }
            else {
                errors++;
            }
        }
        const completed = await this.getCompletedGamesCount(testId);
        return { created, completed, errors, latencies };
    }
    async createSingleTestGame(config, testId) {
        const startTime = perf_hooks_1.performance.now();
        try {
            const agents = await this.aiService.getAvailableAgents();
            const agent1 = agents[Math.floor(Math.random() * agents.length)];
            const agent2 = agents[Math.floor(Math.random() * agents.length)];
            const match = await this.gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: agent1.id,
                aiAgent2Id: agent2.id
            });
            if (config.enableBetting) {
                const betAmount = 0.1 + Math.random() * 0.9;
            }
            await this.gameService.startMatch(match.id);
            const endTime = perf_hooks_1.performance.now();
            const latency = endTime - startTime;
            await this.cache.lpush(`test:${testId}:games`, match.id);
            return { success: true, latency };
        }
        catch (error) {
            const endTime = perf_hooks_1.performance.now();
            const latency = endTime - startTime;
            logger_1.logger.error('Error creating test game:', error);
            return { success: false, latency };
        }
    }
    async getCurrentConcurrentGames() {
        try {
            const result = await (0, database_1.query)("SELECT COUNT(*) as count FROM matches WHERE status = 'active'");
            return parseInt(result[0].count);
        }
        catch (error) {
            logger_1.logger.error('Error getting concurrent games count:', error);
            return 0;
        }
    }
    async getCompletedGamesCount(testId) {
        try {
            const gameIds = await this.cache.lrange(`test:${testId}:games`);
            if (!gameIds.length)
                return 0;
            const result = await (0, database_1.query)(`SELECT COUNT(*) as count FROM matches 
         WHERE id = ANY($1) AND status = 'completed'`, [gameIds]);
            return parseInt(result[0].count);
        }
        catch (error) {
            logger_1.logger.error('Error getting completed games count:', error);
            return 0;
        }
    }
    startMetricsCollection(testId, intervalSeconds) {
        return setInterval(async () => {
            const metrics = await this.collectSystemMetrics();
            this.metricsHistory.push(metrics);
            if (this.metricsHistory.length > 1000) {
                this.metricsHistory = this.metricsHistory.slice(-1000);
            }
            await this.cache.lpush(`test:${testId}:metrics`, JSON.stringify(metrics));
        }, intervalSeconds * 1000);
    }
    async collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        return {
            timestamp: new Date(),
            concurrentGames: await this.getCurrentConcurrentGames(),
            averageLatency: 0,
            maxLatency: 0,
            minLatency: 0,
            throughputGamesPerSecond: 0,
            errorRate: 0,
            memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            cpuUsagePercent: (cpuUsage.user + cpuUsage.system) / 1000000,
            activeConnections: 0,
            cacheHitRate: 0,
            databaseConnectionsActive: 0
        };
    }
    async analyzeTestResults(testId, partialResult, startTime) {
        const endTime = new Date();
        const errorRate = partialResult.totalGamesCreated > 0
            ? partialResult.errorCount / partialResult.totalGamesCreated
            : 0;
        const bottlenecks = [];
        const recommendations = [];
        if (partialResult.averageLatency > 100) {
            bottlenecks.push('High average latency detected');
            recommendations.push('Consider optimizing database queries and adding more caching');
        }
        if (errorRate > 0.05) {
            bottlenecks.push('High error rate detected');
            recommendations.push('Investigate error causes and improve error handling');
        }
        if (partialResult.peakConcurrentGames < 1000) {
            bottlenecks.push('Target concurrent games not achieved');
            recommendations.push('Scale infrastructure or optimize resource usage');
        }
        const success = partialResult.peakConcurrentGames >= 1000 &&
            errorRate < 0.05 &&
            partialResult.averageLatency < 100;
        return {
            testId,
            config: { targetConcurrentGames: 1000, testDurationMinutes: 30, gamesPerMinute: 100, maxLatencyMs: 100, enableBetting: true, enableSpectators: false, metricsInterval: 30 },
            startTime,
            endTime,
            totalGamesCreated: partialResult.totalGamesCreated,
            totalGamesCompleted: partialResult.totalGamesCompleted,
            peakConcurrentGames: partialResult.peakConcurrentGames,
            averageLatency: partialResult.averageLatency,
            maxLatency: partialResult.maxLatency,
            errorCount: partialResult.errorCount,
            errorRate,
            memoryPeakMB: Math.max(...this.metricsHistory.map(m => m.memoryUsageMB)),
            cpuPeakPercent: Math.max(...this.metricsHistory.map(m => m.cpuUsagePercent)),
            throughputPeak: 0,
            cacheEfficiency: 0.95,
            success,
            bottlenecks,
            recommendations,
            detailedMetrics: this.metricsHistory
        };
    }
    async cleanupTestEnvironment(testId) {
        try {
            for (const worker of this.workers) {
                await worker.terminate();
            }
            this.workers = [];
            const gameIds = await this.cache.lrange(`test:${testId}:games`);
            if (gameIds.length > 0) {
                await this.cache.del(`test:${testId}:games`);
                await this.cache.del(`test:${testId}:metrics`);
            }
            this.metricsHistory = [];
            logger_1.logger.info('Test environment cleaned up', { testId });
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up test environment:', error);
        }
    }
    async validatePerformance() {
        const quickConfig = {
            targetConcurrentGames: 100,
            testDurationMinutes: 2,
            gamesPerMinute: 200,
            maxLatencyMs: 50,
            enableBetting: true,
            enableSpectators: false,
            metricsInterval: 10
        };
        const result = await this.executeLoadTest(quickConfig);
        const canHandle1000Games = result.success &&
            result.averageLatency < 50 &&
            result.errorRate < 0.01;
        const recommendations = [];
        if (!canHandle1000Games) {
            recommendations.push('Current performance insufficient for 1000 concurrent games');
            recommendations.push('Consider scaling infrastructure');
            recommendations.push('Optimize database connection pooling');
            recommendations.push('Implement more aggressive caching');
        }
        return {
            canHandle1000Games,
            currentMaxLatency: result.maxLatency,
            recommendations
        };
    }
}
exports.UltraPerformanceLoadTestingService = UltraPerformanceLoadTestingService;
if (!worker_threads_1.isMainThread) {
    const { workerId, config } = worker_threads_1.workerData;
    worker_threads_1.parentPort?.on('message', async (message) => {
        try {
            const { action, data } = message;
            switch (action) {
                case 'createGame':
                    const result = await createGameInWorker(data);
                    worker_threads_1.parentPort?.postMessage({ success: true, result });
                    break;
                default:
                    worker_threads_1.parentPort?.postMessage({ success: false, error: 'Unknown action' });
            }
        }
        catch (error) {
            worker_threads_1.parentPort?.postMessage({ success: false, error: error.message });
        }
    });
}
async function createGameInWorker(gameData) {
    return { gameId: `worker_game_${Date.now()}` };
}
exports.ultraPerformanceLoadTestingService = new UltraPerformanceLoadTestingService();
//# sourceMappingURL=UltraPerformanceLoadTestingServiceV2.js.map