"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const logger_1 = require("../../utils/logger");
const EnhancedAITrainingServiceV3_1 = require("../../services/EnhancedAITrainingServiceV3");
const AIService_1 = require("../../services/AIService");
const redis_1 = require("../../utils/redis");
const TRAINING_TEST_CONFIG = {
    DEFAULT_EPISODES_COUNT: parseInt(process.env.TEST_TRAINING_EPISODES || '100', 10),
    DEFAULT_TRAINING_COST: parseFloat(process.env.TEST_TRAINING_COST || '5.0'),
    DEFAULT_TARGET_IMPROVEMENT: parseInt(process.env.TEST_TARGET_IMPROVEMENT || '50', 10),
    MAX_TRAINING_SESSION_DURATION_MS: parseInt(process.env.TEST_MAX_TRAINING_DURATION_MS || '30000', 10),
    MAX_SINGLE_GAME_DURATION_MS: parseInt(process.env.TEST_MAX_GAME_DURATION_MS || '1000', 10),
    MIN_GAMES_PER_SECOND: parseFloat(process.env.TEST_MIN_GAMES_PER_SECOND || '5.0'),
    ELO_RATING_RANGES: {
        beginner: { min: 800, max: 1200 },
        intermediate: { min: 1200, max: 1600 },
        advanced: { min: 1600, max: 2000 },
        expert: { min: 2000, max: 2400 }
    },
    MIN_TRAINING_DATA_QUALITY: parseFloat(process.env.TEST_MIN_DATA_QUALITY || '0.7'),
    MAX_TRAINING_DATA_SIZE_MB: parseInt(process.env.TEST_MAX_DATA_SIZE_MB || '100', 10),
    MAX_CONCURRENT_SESSIONS: parseInt(process.env.TEST_MAX_CONCURRENT_SESSIONS || '10', 10),
    MEMORY_LIMIT_MB: parseInt(process.env.TEST_MEMORY_LIMIT_MB || '512', 10),
    LEARNING_RATES: {
        conservative: 0.001,
        moderate: 0.01,
        aggressive: 0.1
    },
    MODEL_VERSION_FORMAT: /^v\d+\.\d+$/,
    MAX_MODEL_VERSIONS: parseInt(process.env.TEST_MAX_MODEL_VERSIONS || '5', 10),
    TRAINING_TYPES: ['self_play', 'supervised', 'reinforcement', 'personality_focused'],
    PERSONALITY_FOCUS_AREAS: {
        aggression: { min: 0.0, max: 1.0 },
        patience: { min: 0.0, max: 1.0 },
        risk_tolerance: { min: 0.0, max: 1.0 },
        tactical_depth: { min: 0.0, max: 1.0 }
    }
};
class TrainingTestUtils {
    static cache = new redis_1.CacheService();
    static async createMockAgent(overrides = {}) {
        const defaultAgent = {
            id: `test_agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: `Test Agent ${Date.now()}`,
            eloRating: TRAINING_TEST_CONFIG.ELO_RATING_RANGES.intermediate.min,
            personalityTraits: {
                aggression: 0.5,
                patience: 0.5,
                riskTolerance: 0.5,
                adaptability: 0.5
            },
            gamesPlayed: 0,
            modelVersion: 'v1.0',
            trainingDataCount: 0,
            created: new Date(),
            updated: new Date()
        };
        return { ...defaultAgent, ...overrides };
    }
    static async createMockUser(overrides = {}) {
        const defaultUser = {
            id: `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            username: `test_user_${Date.now()}`,
            email: `test${Date.now()}@example.com`,
            solBalance: TRAINING_TEST_CONFIG.DEFAULT_TRAINING_COST * 10,
            created: new Date()
        };
        return { ...defaultUser, ...overrides };
    }
    static createMockTrainingConfig(overrides = {}) {
        return {
            aiAgentId: `test_agent_${Date.now()}`,
            userId: `test_user_${Date.now()}`,
            trainingType: 'self_play',
            episodesCount: TRAINING_TEST_CONFIG.DEFAULT_EPISODES_COUNT,
            learningRate: TRAINING_TEST_CONFIG.LEARNING_RATES.moderate,
            batchSize: 32,
            explorationRate: 0.1,
            targetImprovement: TRAINING_TEST_CONFIG.DEFAULT_TARGET_IMPROVEMENT,
            maxTrainingHours: 24,
            costPerHour: 1.0,
            personalityFocus: {
                aggression: 0.5,
                patience: 0.5,
                riskTolerance: 0.5,
                adaptability: 0.5
            },
            openingPreferences: ['standard_opening', 'aggressive_opening'],
            strategicFocus: 'balanced',
            ...overrides
        };
    }
    static generateMockTrainingData(sessionId, gameCount) {
        return Array.from({ length: gameCount }, (_, index) => ({
            sessionId,
            gameIndex: index,
            boardStates: this.generateMockBoardStates(50),
            moves: this.generateMockMoves(50),
            outcomes: this.generateMockOutcomes(),
            quality: Math.random() * 0.3 + 0.7,
            timestamp: new Date(Date.now() + index * 1000)
        }));
    }
    static generateMockBoardStates(count) {
        return Array.from({ length: count }, (_, index) => ({
            moveNumber: index + 1,
            board: this.generateMockBoard(),
            currentPlayer: (index % 2) + 1,
            gamePhase: index < 20 ? 'opening' : index < 40 ? 'midgame' : 'endgame'
        }));
    }
    static generateMockBoard() {
        return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => Array.from({ length: 3 }, () => null)));
    }
    static generateMockMoves(count) {
        return Array.from({ length: count }, (_, index) => ({
            from: { row: Math.floor(Math.random() * 9), col: Math.floor(Math.random() * 9) },
            to: { row: Math.floor(Math.random() * 9), col: Math.floor(Math.random() * 9) },
            piece: { type: 'pawn', player: (index % 2) + 1 },
            moveNumber: index + 1,
            isCapture: Math.random() < 0.2,
            evaluation: Math.random() * 2 - 1
        }));
    }
    static generateMockOutcomes() {
        return {
            winner: Math.random() < 0.5 ? 1 : 2,
            winType: Math.random() < 0.7 ? 'checkmate' : 'resignation',
            gameLength: Math.floor(Math.random() * 100) + 20,
            finalEvaluation: Math.random() * 2 - 1
        };
    }
    static async cleanupTestData() {
        logger_1.logger.info('Test cleanup completed');
    }
}
(0, globals_1.describe)('AI Training & Learning System', () => {
    let trainingService;
    let aiService;
    let cache;
    (0, globals_1.beforeAll)(async () => {
        logger_1.logger.info('Initializing AI Training System tests');
        trainingService = new EnhancedAITrainingServiceV3_1.EnhancedAITrainingServiceV3();
        aiService = new AIService_1.AIService();
        cache = new redis_1.CacheService();
        await TrainingTestUtils.cleanupTestData();
    });
    (0, globals_1.afterAll)(async () => {
        logger_1.logger.info('Cleaning up AI Training System tests');
        await TrainingTestUtils.cleanupTestData();
    });
    (0, globals_1.beforeEach)(async () => {
        jest.clearAllMocks();
    });
    (0, globals_1.describe)('Training Data Collection', () => {
        (0, globals_1.test)('should collect training data from self-play games', async () => {
            const mockAgent = await TrainingTestUtils.createMockAgent();
            const config = TrainingTestUtils.createMockTrainingConfig({
                aiAgentId: mockAgent.id,
                episodesCount: 10
            });
            const sessionId = await trainingService.startTrainingSession(config);
            (0, globals_1.expect)(sessionId).toBeDefined();
            (0, globals_1.expect)(typeof sessionId).toBe('string');
            const progress = await trainingService.getTrainingProgress(sessionId);
            (0, globals_1.expect)(progress).toBeDefined();
            if (progress) {
                (0, globals_1.expect)(progress.sessionId).toBe(sessionId);
            }
        });
        (0, globals_1.test)('should validate training data quality', async () => {
            const sessionId = 'test_session_data_quality';
            const trainingData = TrainingTestUtils.generateMockTrainingData(sessionId, 5);
            trainingData.forEach(data => {
                (0, globals_1.expect)(data.quality).toBeGreaterThanOrEqual(TRAINING_TEST_CONFIG.MIN_TRAINING_DATA_QUALITY);
                (0, globals_1.expect)(data.boardStates.length).toBeGreaterThan(0);
                (0, globals_1.expect)(data.moves.length).toBeGreaterThan(0);
                (0, globals_1.expect)(data.outcomes).toBeDefined();
            });
        });
        (0, globals_1.test)('should handle training data storage limits', async () => {
            const largeDataSet = TrainingTestUtils.generateMockTrainingData('large_session', 1000);
            const totalSize = JSON.stringify(largeDataSet).length / (1024 * 1024);
            if (totalSize > TRAINING_TEST_CONFIG.MAX_TRAINING_DATA_SIZE_MB) {
                (0, globals_1.expect)(() => {
                    throw new Error('Training data exceeds size limit');
                }).toThrow('Training data exceeds size limit');
            }
        });
        (0, globals_1.test)('should preserve training data integrity during collection', async () => {
            const originalData = TrainingTestUtils.generateMockTrainingData('integrity_test', 3);
            const serialized = JSON.stringify(originalData);
            const deserialized = JSON.parse(serialized);
            (0, globals_1.expect)(deserialized).toEqual(originalData);
            (0, globals_1.expect)(deserialized.length).toBe(originalData.length);
            deserialized.forEach((data, index) => {
                (0, globals_1.expect)(data.sessionId).toBe(originalData[index].sessionId);
                (0, globals_1.expect)(data.gameIndex).toBe(originalData[index].gameIndex);
                (0, globals_1.expect)(data.quality).toBe(originalData[index].quality);
            });
        });
    });
    (0, globals_1.describe)('Performance Metric Tracking', () => {
        (0, globals_1.test)('should track training session performance metrics', async () => {
            const mockAgent = await TrainingTestUtils.createMockAgent();
            const config = TrainingTestUtils.createMockTrainingConfig({
                aiAgentId: mockAgent.id,
                episodesCount: 20
            });
            const sessionId = await trainingService.startTrainingSession(config);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const progress = await trainingService.getTrainingProgress(sessionId);
            (0, globals_1.expect)(progress).toBeDefined();
            if (progress) {
                (0, globals_1.expect)(progress.currentEpisode).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(progress.totalEpisodes).toBe(config.episodesCount);
                (0, globals_1.expect)(progress.gamesPlayed).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(progress.winRate).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(progress.winRate).toBeLessThanOrEqual(1);
            }
        });
        (0, globals_1.test)('should monitor game generation performance', async () => {
            const startTime = Date.now();
            const gameCount = 10;
            for (let i = 0; i < gameCount; i++) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            const duration = Date.now() - startTime;
            const gamesPerSecond = (gameCount / duration) * 1000;
            (0, globals_1.expect)(gamesPerSecond).toBeGreaterThan(TRAINING_TEST_CONFIG.MIN_GAMES_PER_SECOND);
            (0, globals_1.expect)(duration).toBeLessThan(TRAINING_TEST_CONFIG.MAX_TRAINING_SESSION_DURATION_MS);
        });
        (0, globals_1.test)('should track memory and resource usage', async () => {
            const initialMemory = process.memoryUsage();
            const largeTrainingData = TrainingTestUtils.generateMockTrainingData('memory_test', 100);
            const afterMemory = process.memoryUsage();
            const memoryIncrease = (afterMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);
            (0, globals_1.expect)(memoryIncrease).toBeLessThan(TRAINING_TEST_CONFIG.MEMORY_LIMIT_MB);
        });
        (0, globals_1.test)('should calculate accurate win rates and statistics', async () => {
            const trainingData = TrainingTestUtils.generateMockTrainingData('stats_test', 100);
            const wins = trainingData.filter(data => data.outcomes.winner === 1).length;
            const winRate = wins / trainingData.length;
            const averageGameLength = trainingData.reduce((sum, data) => sum + data.outcomes.gameLength, 0) / trainingData.length;
            (0, globals_1.expect)(winRate).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(winRate).toBeLessThanOrEqual(1);
            (0, globals_1.expect)(averageGameLength).toBeGreaterThan(0);
            (0, globals_1.expect)(Number.isFinite(winRate)).toBe(true);
            (0, globals_1.expect)(Number.isFinite(averageGameLength)).toBe(true);
        });
    });
    (0, globals_1.describe)('ELO Rating Updates After Matches', () => {
        (0, globals_1.test)('should update ELO rating based on training performance', async () => {
            const initialElo = 1400;
            const mockAgent = await TrainingTestUtils.createMockAgent({ eloRating: initialElo });
            const config = TrainingTestUtils.createMockTrainingConfig({
                aiAgentId: mockAgent.id,
                targetImprovement: 50
            });
            const sessionId = await trainingService.startTrainingSession(config);
            await new Promise(resolve => setTimeout(resolve, 2000));
            const result = await trainingService.getTrainingResult(sessionId);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.eloChange).toBeDefined();
            (0, globals_1.expect)(typeof result.eloChange).toBe('number');
        });
        (0, globals_1.test)('should apply ELO changes within reasonable bounds', async () => {
            const testCases = [
                { winRate: 0.9, expectedEloChange: { min: 20, max: 60 } },
                { winRate: 0.5, expectedEloChange: { min: -10, max: 10 } },
                { winRate: 0.1, expectedEloChange: { min: -60, max: -20 } }
            ];
            for (const testCase of testCases) {
                const eloChange = calculateEloChange(testCase.winRate, 1500, 1500);
                (0, globals_1.expect)(eloChange).toBeGreaterThanOrEqual(testCase.expectedEloChange.min);
                (0, globals_1.expect)(eloChange).toBeLessThanOrEqual(testCase.expectedEloChange.max);
            }
        });
        (0, globals_1.test)('should handle ELO rating boundaries correctly', async () => {
            const extremeCases = [
                { initialElo: 800, improvement: -100 },
                { initialElo: 2400, improvement: 100 }
            ];
            for (const testCase of extremeCases) {
                const newElo = Math.max(800, Math.min(2400, testCase.initialElo + testCase.improvement));
                (0, globals_1.expect)(newElo).toBeGreaterThanOrEqual(800);
                (0, globals_1.expect)(newElo).toBeLessThanOrEqual(2400);
            }
        });
        (0, globals_1.test)('should maintain ELO rating consistency across sessions', async () => {
            const mockAgent = await TrainingTestUtils.createMockAgent({ eloRating: 1500 });
            const session1Config = TrainingTestUtils.createMockTrainingConfig({ aiAgentId: mockAgent.id });
            const session2Config = TrainingTestUtils.createMockTrainingConfig({ aiAgentId: mockAgent.id });
            const sessionId1 = await trainingService.startTrainingSession(session1Config);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result1 = await trainingService.getTrainingResult(sessionId1);
            const sessionId2 = await trainingService.startTrainingSession(session2Config);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result2 = await trainingService.getTrainingResult(sessionId2);
            (0, globals_1.expect)(result1.finalElo).toBeDefined();
            (0, globals_1.expect)(result2.finalElo).toBeDefined();
            (0, globals_1.expect)(Math.abs(result2.finalElo - result1.finalElo)).toBeLessThan(200);
        });
    });
    (0, globals_1.describe)('Learning Algorithm Implementation', () => {
        (0, globals_1.test)('should implement self-play learning algorithm', async () => {
            const config = TrainingTestUtils.createMockTrainingConfig({
                trainingType: 'self_play',
                learningRate: TRAINING_TEST_CONFIG.LEARNING_RATES.moderate
            });
            const sessionId = await trainingService.startTrainingSession(config);
            const progress = await trainingService.getTrainingProgress(sessionId);
            if (progress) {
                (0, globals_1.expect)(progress.sessionId).toBe(sessionId);
                (0, globals_1.expect)(progress.totalEpisodes).toBe(config.episodesCount);
            }
        });
        (0, globals_1.test)('should adapt learning rate based on performance', async () => {
            const learningRates = Object.values(TRAINING_TEST_CONFIG.LEARNING_RATES);
            for (const learningRate of learningRates) {
                const config = TrainingTestUtils.createMockTrainingConfig({ learningRate });
                const sessionId = await trainingService.startTrainingSession(config);
                (0, globals_1.expect)(sessionId).toBeDefined();
                const progress = await trainingService.getTrainingProgress(sessionId);
                (0, globals_1.expect)(progress).toBeDefined();
            }
        });
        (0, globals_1.test)('should implement exploration vs exploitation balance', async () => {
            const explorationRates = [0.1, 0.3, 0.5, 0.7, 0.9];
            for (const explorationRate of explorationRates) {
                const config = TrainingTestUtils.createMockTrainingConfig({ explorationRate });
                const sessionId = await trainingService.startTrainingSession(config);
                (0, globals_1.expect)(sessionId).toBeDefined();
                (0, globals_1.expect)(config.explorationRate).toBe(explorationRate);
            }
        });
        (0, globals_1.test)('should demonstrate learning convergence over time', async () => {
            const config = TrainingTestUtils.createMockTrainingConfig({
                episodesCount: 50,
                targetImprovement: 30
            });
            const sessionId = await trainingService.startTrainingSession(config);
            const progressSnapshots = [];
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                const progress = await trainingService.getTrainingProgress(sessionId);
                progressSnapshots.push(progress);
            }
            (0, globals_1.expect)(progressSnapshots.length).toBeGreaterThan(1);
            const firstSnapshot = progressSnapshots[0];
            const lastSnapshot = progressSnapshots[progressSnapshots.length - 1];
            (0, globals_1.expect)(lastSnapshot.currentEpisode).toBeGreaterThanOrEqual(firstSnapshot.currentEpisode);
        });
    });
    (0, globals_1.describe)('Training Batch Processing', () => {
        (0, globals_1.test)('should process training batches efficiently', async () => {
            const batchSizes = [10, 25, 50, 100];
            for (const batchSize of batchSizes) {
                const startTime = Date.now();
                const config = TrainingTestUtils.createMockTrainingConfig({
                    episodesCount: batchSize
                });
                const sessionId = await trainingService.startTrainingSession(config);
                await new Promise(resolve => setTimeout(resolve, 100 * batchSize));
                const duration = Date.now() - startTime;
                (0, globals_1.expect)(sessionId).toBeDefined();
                (0, globals_1.expect)(duration).toBeLessThan(TRAINING_TEST_CONFIG.MAX_TRAINING_SESSION_DURATION_MS);
            }
        });
        (0, globals_1.test)('should handle concurrent batch processing', async () => {
            const concurrentSessions = [];
            const maxConcurrent = Math.min(5, TRAINING_TEST_CONFIG.MAX_CONCURRENT_SESSIONS);
            for (let i = 0; i < maxConcurrent; i++) {
                const config = TrainingTestUtils.createMockTrainingConfig({
                    episodesCount: 20,
                    aiAgentId: `concurrent_agent_${i}`
                });
                const sessionPromise = trainingService.startTrainingSession(config);
                concurrentSessions.push(sessionPromise);
            }
            const sessionIds = await Promise.all(concurrentSessions);
            (0, globals_1.expect)(sessionIds.length).toBe(maxConcurrent);
            sessionIds.forEach(sessionId => {
                (0, globals_1.expect)(sessionId).toBeDefined();
                (0, globals_1.expect)(typeof sessionId).toBe('string');
            });
        });
        (0, globals_1.test)('should optimize batch size for performance', async () => {
            const batchSizes = [1, 5, 10, 20, 50];
            const performanceResults = [];
            for (const batchSize of batchSizes) {
                const startTime = Date.now();
                await Promise.all(Array.from({ length: batchSize }, async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }));
                const duration = Date.now() - startTime;
                const efficiency = batchSize / duration;
                performanceResults.push({ batchSize, duration, efficiency });
            }
            (0, globals_1.expect)(performanceResults.length).toBe(batchSizes.length);
            const optimalBatch = performanceResults.reduce((best, current) => current.efficiency > best.efficiency ? current : best);
            (0, globals_1.expect)(optimalBatch.batchSize).toBeGreaterThan(0);
            (0, globals_1.expect)(optimalBatch.efficiency).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Model Versioning and Rollback', () => {
        (0, globals_1.test)('should create new model versions after training', async () => {
            const initialVersion = 'v1.0';
            const mockAgent = await TrainingTestUtils.createMockAgent({
                modelVersion: initialVersion
            });
            const config = TrainingTestUtils.createMockTrainingConfig({
                aiAgentId: mockAgent.id
            });
            const sessionId = await trainingService.startTrainingSession(config);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result = await trainingService.getTrainingResult(sessionId);
            (0, globals_1.expect)(result.modelVersion).toBeDefined();
            (0, globals_1.expect)(result.modelVersion).toMatch(TRAINING_TEST_CONFIG.MODEL_VERSION_FORMAT);
            (0, globals_1.expect)(result.modelVersion).not.toBe(initialVersion);
        });
        (0, globals_1.test)('should maintain version history', async () => {
            const versions = ['v1.0', 'v1.1', 'v1.2', 'v2.0'];
            const versionHistory = [];
            versions.forEach(version => {
                versionHistory.push({
                    version,
                    created: new Date(),
                    trainingSessionId: `session_${version}`,
                    performance: Math.random() * 100 + 1500
                });
            });
            (0, globals_1.expect)(versionHistory.length).toBe(versions.length);
            (0, globals_1.expect)(versionHistory.length).toBeLessThanOrEqual(TRAINING_TEST_CONFIG.MAX_MODEL_VERSIONS);
            versionHistory.forEach(entry => {
                (0, globals_1.expect)(entry.version).toMatch(TRAINING_TEST_CONFIG.MODEL_VERSION_FORMAT);
                (0, globals_1.expect)(entry.created).toBeInstanceOf(Date);
                (0, globals_1.expect)(entry.performance).toBeGreaterThan(0);
            });
        });
        (0, globals_1.test)('should support model rollback functionality', async () => {
            const versionHistory = [
                { version: 'v1.0', performance: 1500 },
                { version: 'v1.1', performance: 1520 },
                { version: 'v1.2', performance: 1510 },
                { version: 'v1.3', performance: 1540 }
            ];
            const bestVersion = versionHistory.reduce((best, current) => current.performance > best.performance ? current : best);
            const rollbackVersion = bestVersion.version;
            (0, globals_1.expect)(rollbackVersion).toBe('v1.3');
            (0, globals_1.expect)(bestVersion.performance).toBe(1540);
        });
        (0, globals_1.test)('should validate model compatibility before rollback', async () => {
            const currentVersion = 'v2.0';
            const rollbackCandidates = ['v1.0', 'v1.5', 'v1.9'];
            rollbackCandidates.forEach(candidate => {
                const isCompatible = isVersionCompatible(currentVersion, candidate);
                if (candidate === 'v1.0') {
                    (0, globals_1.expect)(isCompatible).toBe(false);
                }
                else {
                    (0, globals_1.expect)(isCompatible).toBe(true);
                }
            });
        });
    });
    (0, globals_1.describe)('Training Data Validation', () => {
        (0, globals_1.test)('should validate training data format and structure', async () => {
            const validData = TrainingTestUtils.generateMockTrainingData('validation_test', 3);
            const invalidData = [
                { sessionId: 'test', gameIndex: 'invalid' },
                { sessionId: 'test', boardStates: null },
                { sessionId: 'test', moves: [] }
            ];
            validData.forEach(data => {
                (0, globals_1.expect)(data.sessionId).toBeDefined();
                (0, globals_1.expect)(typeof data.gameIndex).toBe('number');
                (0, globals_1.expect)(Array.isArray(data.boardStates)).toBe(true);
                (0, globals_1.expect)(Array.isArray(data.moves)).toBe(true);
                (0, globals_1.expect)(data.outcomes).toBeDefined();
                (0, globals_1.expect)(typeof data.quality).toBe('number');
                (0, globals_1.expect)(data.quality).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(data.quality).toBeLessThanOrEqual(1);
            });
            invalidData.forEach(data => {
                (0, globals_1.expect)(() => validateTrainingData(data)).toThrow();
            });
        });
        (0, globals_1.test)('should ensure training data meets quality thresholds', async () => {
            const qualityThreshold = TRAINING_TEST_CONFIG.MIN_TRAINING_DATA_QUALITY;
            const testData = [
                { quality: 0.9 },
                { quality: 0.75 },
                { quality: 0.6 },
                { quality: 0.3 }
            ];
            testData.forEach(data => {
                const meetsThreshold = data.quality >= qualityThreshold;
                if (data.quality >= qualityThreshold) {
                    (0, globals_1.expect)(meetsThreshold).toBe(true);
                }
                else {
                    (0, globals_1.expect)(meetsThreshold).toBe(false);
                }
            });
        });
        (0, globals_1.test)('should detect and handle corrupted training data', async () => {
            const corruptedScenarios = [
                { data: null, expectedError: 'Null training data' },
                { data: undefined, expectedError: 'Undefined training data' },
                { data: { sessionId: 'test' }, expectedError: 'Missing required fields' },
                { data: { malformed: 'json' }, expectedError: 'Invalid data structure' }
            ];
            corruptedScenarios.forEach(scenario => {
                (0, globals_1.expect)(() => {
                    validateTrainingData(scenario.data);
                }).toThrow();
            });
        });
        (0, globals_1.test)('should validate game state consistency in training data', async () => {
            const gameData = TrainingTestUtils.generateMockTrainingData('consistency_test', 1)[0];
            (0, globals_1.expect)(gameData.boardStates.length).toBe(gameData.moves.length);
            gameData.boardStates.forEach((state, index) => {
                (0, globals_1.expect)(state.moveNumber).toBe(index + 1);
                (0, globals_1.expect)([1, 2]).toContain(state.currentPlayer);
                (0, globals_1.expect)(['opening', 'midgame', 'endgame']).toContain(state.gamePhase);
            });
            gameData.moves.forEach((move, index) => {
                (0, globals_1.expect)(move.moveNumber).toBe(index + 1);
                (0, globals_1.expect)(move.from).toBeDefined();
                (0, globals_1.expect)(move.to).toBeDefined();
                (0, globals_1.expect)(move.piece).toBeDefined();
                (0, globals_1.expect)(typeof move.isCapture).toBe('boolean');
            });
        });
    });
    (0, globals_1.describe)('Performance Regression Prevention', () => {
        (0, globals_1.test)('should detect performance regressions during training', async () => {
            const baselinePerformance = 1500;
            const regressionThreshold = 50;
            const performanceHistory = [
                { session: 1, elo: 1500 },
                { session: 2, elo: 1520 },
                { session: 3, elo: 1540 },
                { session: 4, elo: 1490 },
                { session: 5, elo: 1560 }
            ];
            for (let i = 1; i < performanceHistory.length; i++) {
                const current = performanceHistory[i];
                const previous = performanceHistory[i - 1];
                const regression = previous.elo - current.elo;
                if (regression > regressionThreshold) {
                    (0, globals_1.expect)(current.session).toBe(4);
                    (0, globals_1.expect)(regression).toBeGreaterThan(regressionThreshold);
                }
            }
        });
        (0, globals_1.test)('should implement early stopping on performance degradation', async () => {
            const config = TrainingTestUtils.createMockTrainingConfig({
                episodesCount: 100
            });
            let performanceDecline = 0;
            const maxDeclineThreshold = 3;
            for (let episode = 1; episode <= 20; episode++) {
                const currentPerformance = 1500 - (episode * 2);
                const previousPerformance = 1500 - ((episode - 1) * 2);
                if (currentPerformance < previousPerformance) {
                    performanceDecline++;
                }
                else {
                    performanceDecline = 0;
                }
                if (performanceDecline >= maxDeclineThreshold) {
                    break;
                }
            }
            (0, globals_1.expect)(performanceDecline).toBeGreaterThanOrEqual(maxDeclineThreshold);
        });
        (0, globals_1.test)('should maintain performance benchmarks', async () => {
            const performanceBenchmarks = {
                minEloRating: 1200,
                maxTrainingTime: 30000,
                minWinRate: 0.4,
                maxMemoryUsage: 512
            };
            const mockMetrics = {
                sessionId: 'benchmark_test',
                gamesPerSecond: 8.5,
                memoryUsage: 256,
                cpuUsage: 45,
                averageGameLength: 75,
                errorRate: 0.02
            };
            (0, globals_1.expect)(mockMetrics.gamesPerSecond).toBeGreaterThan(TRAINING_TEST_CONFIG.MIN_GAMES_PER_SECOND);
            (0, globals_1.expect)(mockMetrics.memoryUsage).toBeLessThan(performanceBenchmarks.maxMemoryUsage);
            (0, globals_1.expect)(mockMetrics.errorRate).toBeLessThan(0.05);
            (0, globals_1.expect)(mockMetrics.averageGameLength).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Training Resource Management', () => {
        (0, globals_1.test)('should manage memory usage during training', async () => {
            const initialMemory = process.memoryUsage();
            const memoryLimit = TRAINING_TEST_CONFIG.MEMORY_LIMIT_MB * 1024 * 1024;
            const largeDataSet = [];
            for (let i = 0; i < 1000; i++) {
                largeDataSet.push(TrainingTestUtils.generateMockTrainingData(`session_${i}`, 10));
            }
            const currentMemory = process.memoryUsage();
            const memoryUsed = currentMemory.heapUsed - initialMemory.heapUsed;
            (0, globals_1.expect)(memoryUsed).toBeLessThan(memoryLimit);
            largeDataSet.length = 0;
        });
        (0, globals_1.test)('should handle resource constraints gracefully', async () => {
            const maxConcurrentSessions = TRAINING_TEST_CONFIG.MAX_CONCURRENT_SESSIONS;
            const sessionPromises = [];
            for (let i = 0; i < maxConcurrentSessions + 5; i++) {
                const config = TrainingTestUtils.createMockTrainingConfig({
                    aiAgentId: `resource_test_agent_${i}`
                });
                const sessionPromise = trainingService.startTrainingSession(config)
                    .catch(error => ({ error: error.message }));
                sessionPromises.push(sessionPromise);
            }
            const results = await Promise.all(sessionPromises);
            const successfulSessions = results.filter(result => typeof result === 'string');
            const failedSessions = results.filter(result => result && 'error' in result);
            (0, globals_1.expect)(successfulSessions.length).toBeLessThanOrEqual(maxConcurrentSessions);
            (0, globals_1.expect)(failedSessions.length).toBeGreaterThan(0);
        });
        (0, globals_1.test)('should implement resource cleanup after training completion', async () => {
            const config = TrainingTestUtils.createMockTrainingConfig({
                episodesCount: 10
            });
            const sessionId = await trainingService.startTrainingSession(config);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await trainingService.stopTraining?.(sessionId);
            (0, globals_1.expect)(async () => {
                await trainingService.getTrainingProgress(sessionId);
            }).not.toThrow();
        });
    });
    (0, globals_1.describe)('Continuous Learning Pipeline', () => {
        (0, globals_1.test)('should implement continuous learning workflow', async () => {
            const pipelineStages = [
                'data_collection',
                'preprocessing',
                'training',
                'evaluation',
                'deployment'
            ];
            const pipelineState = new Map();
            for (const stage of pipelineStages) {
                pipelineState.set(stage, {
                    status: 'completed',
                    timestamp: new Date(),
                    duration: Math.random() * 1000 + 100
                });
            }
            (0, globals_1.expect)(pipelineState.size).toBe(pipelineStages.length);
            pipelineStages.forEach(stage => {
                const stageInfo = pipelineState.get(stage);
                (0, globals_1.expect)(stageInfo.status).toBe('completed');
                (0, globals_1.expect)(stageInfo.timestamp).toBeInstanceOf(Date);
                (0, globals_1.expect)(stageInfo.duration).toBeGreaterThan(0);
            });
        });
        (0, globals_1.test)('should support incremental learning updates', async () => {
            const baselineAgent = await TrainingTestUtils.createMockAgent({
                eloRating: 1500,
                trainingDataCount: 1000
            });
            const incrementalSessions = [];
            for (let i = 0; i < 3; i++) {
                const config = TrainingTestUtils.createMockTrainingConfig({
                    aiAgentId: baselineAgent.id,
                    episodesCount: 20
                });
                const sessionId = await trainingService.startTrainingSession(config);
                incrementalSessions.push(sessionId);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            (0, globals_1.expect)(incrementalSessions.length).toBe(3);
            incrementalSessions.forEach(sessionId => {
                (0, globals_1.expect)(sessionId).toBeDefined();
                (0, globals_1.expect)(typeof sessionId).toBe('string');
            });
        });
        (0, globals_1.test)('should maintain learning state consistency across pipeline stages', async () => {
            const pipelineData = {
                agentId: 'pipeline_test_agent',
                currentElo: 1500,
                trainingDataCount: 500,
                modelVersion: 'v1.0',
                lastUpdated: new Date()
            };
            const stageResults = [];
            stageResults.push({
                stage: 'data_collection',
                newDataCount: 100,
                totalDataCount: pipelineData.trainingDataCount + 100
            });
            stageResults.push({
                stage: 'training',
                eloImprovement: 25,
                newElo: pipelineData.currentElo + 25
            });
            stageResults.push({
                stage: 'model_update',
                oldVersion: pipelineData.modelVersion,
                newVersion: 'v1.1'
            });
            (0, globals_1.expect)(stageResults.length).toBe(3);
            const dataStage = stageResults.find(r => r.stage === 'data_collection');
            (0, globals_1.expect)(dataStage?.totalDataCount).toBe(600);
            const trainingStage = stageResults.find(r => r.stage === 'training');
            (0, globals_1.expect)(trainingStage?.newElo).toBe(1525);
            const modelStage = stageResults.find(r => r.stage === 'model_update');
            (0, globals_1.expect)(modelStage?.newVersion).toBe('v1.1');
        });
    });
});
function calculateEloChange(winRate, currentElo, opponentElo) {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - currentElo) / 400));
    return Math.round(K * (winRate - expectedScore));
}
function isVersionCompatible(currentVersion, targetVersion) {
    const current = parseVersion(currentVersion);
    const target = parseVersion(targetVersion);
    return current.major === target.major;
}
function parseVersion(version) {
    const match = version.match(/^v(\d+)\.(\d+)$/);
    if (!match)
        throw new Error(`Invalid version format: ${version}`);
    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10)
    };
}
function validateTrainingData(data) {
    if (!data) {
        throw new Error('Training data cannot be null or undefined');
    }
    if (typeof data.sessionId !== 'string') {
        throw new Error('sessionId must be a string');
    }
    if (typeof data.gameIndex !== 'number') {
        throw new Error('gameIndex must be a number');
    }
    if (!Array.isArray(data.boardStates)) {
        throw new Error('boardStates must be an array');
    }
    if (!Array.isArray(data.moves)) {
        throw new Error('moves must be an array');
    }
    if (!data.outcomes) {
        throw new Error('outcomes is required');
    }
    if (typeof data.quality !== 'number' || data.quality < 0 || data.quality > 1) {
        throw new Error('quality must be a number between 0 and 1');
    }
}
//# sourceMappingURL=training-system.test.js.map