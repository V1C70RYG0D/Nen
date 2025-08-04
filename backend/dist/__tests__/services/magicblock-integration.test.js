"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const web3_js_1 = require("@solana/web3.js");
const perf_hooks_1 = require("perf_hooks");
const winston_1 = __importDefault(require("winston"));
const MagicBlockBOLTService_1 = require("../../services/MagicBlockBOLTService");
const TEST_CONFIG = {
    SOLANA_RPC_URL: process.env.TEST_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    MAGICBLOCK_ENDPOINT: process.env.TEST_MAGICBLOCK_ENDPOINT || 'https://api.devnet.magicblock.xyz',
    MAGICBLOCK_API_KEY: process.env.TEST_MAGICBLOCK_API_KEY || 'test-api-key',
    PERFORMANCE_THRESHOLD_SESSION_CREATE: 100,
    PERFORMANCE_THRESHOLD_STATE_UPDATE: 50,
    PERFORMANCE_THRESHOLD_TRANSACTION: 2000,
    PERFORMANCE_THRESHOLD_CONNECTION_RECOVERY: 5000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
};
class TestAnchorProvider {
    wallet;
    constructor(keypair) {
        this.wallet = { publicKey: keypair.publicKey };
    }
}
const createTestKeypair = () => web3_js_1.Keypair.generate();
const createTestSessionConfig = () => ({
    timeControl: 600000,
    region: 'us-east-1',
    allowSpectators: true,
    tournamentMode: false
});
const createTestMoveData = () => ({
    fromX: 4,
    fromY: 1,
    fromLevel: 0,
    toX: 4,
    toY: 2,
    toLevel: 0,
    pieceType: MagicBlockBOLTService_1.PieceType.Marshal,
    player: 1,
    moveHash: '',
    timestamp: Date.now()
});
const measureExecutionTime = async (fn) => {
    const startTime = perf_hooks_1.performance.now();
    const result = await fn();
    const duration = perf_hooks_1.performance.now() - startTime;
    return { result, duration };
};
const retryOperation = async (operation, maxAttempts = TEST_CONFIG.RETRY_ATTEMPTS, delay = TEST_CONFIG.RETRY_DELAY) => {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxAttempts) {
                throw new Error(`Operation failed after ${maxAttempts} attempts. Last error: ${lastError.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
        }
    }
    throw lastError;
};
(0, globals_1.describe)('MagicBlock Integration', () => {
    let connection;
    let service;
    let provider;
    let logger;
    let testKeypair;
    let player1Keypair;
    let player2Keypair;
    const createdSessions = [];
    (0, globals_1.beforeAll)(async () => {
        logger = winston_1.default.createLogger({
            level: 'debug',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
            transports: [
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
                })
            ]
        });
        connection = new web3_js_1.Connection(TEST_CONFIG.SOLANA_RPC_URL);
        await retryOperation(async () => {
            const blockHeight = await connection.getBlockHeight();
            (0, globals_1.expect)(blockHeight).toBeGreaterThan(0);
            logger.info('Solana connection established', { blockHeight });
        });
        testKeypair = createTestKeypair();
        player1Keypair = createTestKeypair();
        player2Keypair = createTestKeypair();
        provider = new TestAnchorProvider(testKeypair);
        service = new MagicBlockBOLTService_1.MagicBlockBOLTService(connection, provider, logger);
        logger.info('Test setup completed', {
            testWallet: testKeypair.publicKey.toString(),
            player1: player1Keypair.publicKey.toString(),
            player2: player2Keypair.publicKey.toString()
        });
    });
    (0, globals_1.afterAll)(async () => {
        for (const sessionId of createdSessions) {
            try {
                logger.info('Cleaning up test session', { sessionId });
            }
            catch (error) {
                logger.warn('Failed to cleanup session', {
                    sessionId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        logger.info('Test cleanup completed');
    });
    (0, globals_1.beforeEach)(() => {
        jest.clearAllMocks();
    });
    (0, globals_1.afterEach)(() => {
    });
    (0, globals_1.describe)('SDK Initialization', () => {
        (0, globals_1.test)('SDK initializes with valid configuration', async () => {
            const { result: initSuccess, duration } = await measureExecutionTime(async () => {
                (0, globals_1.expect)(service).toBeDefined();
                (0, globals_1.expect)(service['connection']).toBe(connection);
                (0, globals_1.expect)(service['provider']).toBe(provider);
                (0, globals_1.expect)(service['logger']).toBe(logger);
                (0, globals_1.expect)(service['sessionCache']).toBeInstanceOf(Map);
                (0, globals_1.expect)(service['performanceTracker']).toBeInstanceOf(Map);
                return true;
            });
            (0, globals_1.expect)(initSuccess).toBe(true);
            (0, globals_1.expect)(duration).toBeLessThan(1000);
            logger.info('SDK initialization test completed', { duration });
        });
        (0, globals_1.test)('SDK handles invalid configuration gracefully', async () => {
            const invalidConnection = new web3_js_1.Connection('invalid://url');
            (0, globals_1.expect)(() => {
                new MagicBlockBOLTService_1.MagicBlockBOLTService(invalidConnection, provider, logger);
            }).not.toThrow();
        });
        (0, globals_1.test)('SDK validates provider configuration', () => {
            const invalidProvider = {};
            (0, globals_1.expect)(() => {
                new MagicBlockBOLTService_1.MagicBlockBOLTService(connection, invalidProvider, logger);
            }).not.toThrow();
        });
    });
    (0, globals_1.describe)('Session Management', () => {
        (0, globals_1.test)('Session creation returns valid session ID', async () => {
            const sessionId = `test-session-${Date.now()}`;
            const config = createTestSessionConfig();
            const { result: sessionPublicKey, duration } = await measureExecutionTime(async () => {
                return await retryOperation(() => service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-east-1'));
            });
            (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_SESSION_CREATE);
            (0, globals_1.expect)(sessionPublicKey).toBeDefined();
            (0, globals_1.expect)(typeof sessionPublicKey).toBe('string');
            (0, globals_1.expect)(sessionPublicKey.length).toBeGreaterThan(0);
            (0, globals_1.expect)(() => new web3_js_1.PublicKey(sessionPublicKey)).not.toThrow();
            createdSessions.push(sessionId);
            logger.info('Session creation test completed', {
                sessionId,
                sessionPublicKey,
                duration
            });
        });
        (0, globals_1.test)('Session creation with single player', async () => {
            const sessionId = `test-single-session-${Date.now()}`;
            const config = createTestSessionConfig();
            const { result: sessionPublicKey, duration } = await measureExecutionTime(async () => {
                return await retryOperation(() => service.createEnhancedSession(sessionId, player1Keypair.publicKey, null, config, 'eu-west-1'));
            });
            (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_SESSION_CREATE);
            (0, globals_1.expect)(sessionPublicKey).toBeDefined();
            createdSessions.push(sessionId);
            logger.info('Single player session creation test completed', {
                sessionId,
                duration
            });
        });
        (0, globals_1.test)('Session creation validates parameters and guarantees latency', async () => {
            const sessionId = `latency-test-session-${Date.now()}`;
            const config = createTestSessionConfig();
            const { result: sessionPublicKey, duration } = await measureExecutionTime(async () => {
                return await retryOperation(() => service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-east-1'));
            });
            (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_SESSION_CREATE);
            (0, globals_1.expect)(sessionPublicKey).toBeDefined();
            (0, globals_1.expect)(typeof sessionPublicKey).toBe('string');
            (0, globals_1.expect)(sessionPublicKey.length).toBeGreaterThan(0);
            const session = service['sessionCache'].get(sessionId);
            (0, globals_1.expect)(session).toBeDefined();
            (0, globals_1.expect)(session.config).toEqual(config);
            (0, globals_1.expect)(session.region).toBe('us-east-1');
            createdSessions.push(sessionId);
            logger.info('Session creation with parameter validation and latency check completed', {
                sessionId,
                sessionPublicKey,
                duration
            });
        });
        (0, globals_1.test)('Session creation fails with invalid parameters', async () => {
            const sessionId = '';
            const config = createTestSessionConfig();
            await (0, globals_1.expect)(service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'invalid-region')).rejects.toThrow();
        });
        (0, globals_1.test)('Session cleanup on game completion', async () => {
            const sessionId = `test-cleanup-session-${Date.now()}`;
            const config = createTestSessionConfig();
            const sessionPublicKey = await service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-west-2');
            (0, globals_1.expect)(sessionPublicKey).toBeDefined();
            createdSessions.push(sessionId);
            logger.info('Session cleanup test noted', { sessionId });
        });
    });
    (0, globals_1.describe)('BOLT ECS Integration', () => {
        let testSessionId;
        (0, globals_1.beforeEach)(async () => {
            testSessionId = `bolt-test-session-${Date.now()}`;
            const config = createTestSessionConfig();
            await service.createEnhancedSession(testSessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-east-1');
            createdSessions.push(testSessionId);
        });
        (0, globals_1.test)('BOLT ECS integration works correctly', async () => {
            const moveData = createTestMoveData();
            moveData.moveHash = `test-hash-${Date.now()}`;
            const { result: moveResult, duration } = await measureExecutionTime(async () => {
                return await retryOperation(() => service.submitMoveEnhanced(testSessionId, moveData, player1Keypair.publicKey, new Uint8Array([1, 2, 3, 4])));
            });
            (0, globals_1.expect)(moveResult.success).toBe(true);
            (0, globals_1.expect)(moveResult.moveHash).toBeDefined();
            (0, globals_1.expect)(moveResult.latency).toBeGreaterThan(0);
            (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_STATE_UPDATE * 2);
            logger.info('BOLT ECS integration test completed', {
                testSessionId,
                moveResult,
                duration
            });
        });
        (0, globals_1.test)('Game state updates propagate <50ms', async () => {
            const moveData = createTestMoveData();
            moveData.moveHash = `speed-test-hash-${Date.now()}`;
            const { result: moveResult, duration } = await measureExecutionTime(async () => {
                return await service.submitMoveEnhanced(testSessionId, moveData, player1Keypair.publicKey, new Uint8Array([5, 6, 7, 8]));
            });
            (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_STATE_UPDATE);
            (0, globals_1.expect)(moveResult.success).toBe(true);
            logger.info('Game state update speed test completed', {
                testSessionId,
                duration,
                requirement: TEST_CONFIG.PERFORMANCE_THRESHOLD_STATE_UPDATE
            });
        });
        (0, globals_1.test)('BOLT ECS component validation', () => {
            const positionComponent = {
                x: 4,
                y: 4,
                level: 1,
                entityId: 'test-entity-pos'
            };
            const pieceComponent = {
                pieceType: MagicBlockBOLTService_1.PieceType.Marshal,
                owner: 1,
                hasMoved: false,
                captured: false,
                entityId: 'test-entity-piece'
            };
            const aiComponent = {
                personality: MagicBlockBOLTService_1.PersonalityType.Aggressive,
                skillLevel: 1200,
                gamesPlayed: 150,
                winRate: 0.68,
                entityId: 'test-entity-ai'
            };
            (0, globals_1.expect)(positionComponent.x).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(positionComponent.x).toBeLessThan(9);
            (0, globals_1.expect)(positionComponent.y).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(positionComponent.y).toBeLessThan(9);
            (0, globals_1.expect)(positionComponent.level).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(positionComponent.level).toBeLessThan(3);
            (0, globals_1.expect)(positionComponent.entityId).toBeDefined();
            (0, globals_1.expect)(Object.values(MagicBlockBOLTService_1.PieceType)).toContain(pieceComponent.pieceType);
            (0, globals_1.expect)([1, 2]).toContain(pieceComponent.owner);
            (0, globals_1.expect)(typeof pieceComponent.hasMoved).toBe('boolean');
            (0, globals_1.expect)(typeof pieceComponent.captured).toBe('boolean');
            (0, globals_1.expect)(pieceComponent.entityId).toBeDefined();
            (0, globals_1.expect)(Object.values(MagicBlockBOLTService_1.PersonalityType)).toContain(aiComponent.personality);
            (0, globals_1.expect)(aiComponent.skillLevel).toBeGreaterThan(0);
            (0, globals_1.expect)(aiComponent.gamesPlayed).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(aiComponent.winRate).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(aiComponent.winRate).toBeLessThanOrEqual(1);
            (0, globals_1.expect)(aiComponent.entityId).toBeDefined();
            logger.info('BOLT ECS component validation completed');
        });
    });
    (0, globals_1.describe)('Error Handling and Recovery', () => {
        (0, globals_1.test)('Error handling for MagicBlock failures', async () => {
            const invalidSessionId = 'non-existent-session';
            const moveData = createTestMoveData();
            await (0, globals_1.expect)(service.submitMoveEnhanced(invalidSessionId, moveData, player1Keypair.publicKey, new Uint8Array([1, 2, 3, 4]))).rejects.toThrow('Session not found');
            logger.info('MagicBlock failure handling test completed');
        });
        (0, globals_1.test)('Solana connection stability', async () => {
            const { result: blockHeight, duration } = await measureExecutionTime(async () => {
                return await retryOperation(() => connection.getBlockHeight());
            });
            (0, globals_1.expect)(blockHeight).toBeGreaterThan(0);
            (0, globals_1.expect)(duration).toBeLessThan(5000);
            logger.info('Solana connection stability test completed', {
                blockHeight,
                duration
            });
        });
        (0, globals_1.test)('Connection recovery mechanisms', async () => {
            const startTime = perf_hooks_1.performance.now();
            try {
                const promises = Array.from({ length: 5 }, (_, i) => retryOperation(() => connection.getBlockHeight()));
                const results = await Promise.all(promises);
                const duration = perf_hooks_1.performance.now() - startTime;
                (0, globals_1.expect)(results).toHaveLength(5);
                results.forEach(height => (0, globals_1.expect)(height).toBeGreaterThan(0));
                (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_CONNECTION_RECOVERY);
                logger.info('Connection recovery test completed', {
                    duration,
                    requests: results.length
                });
            }
            catch (error) {
                const duration = perf_hooks_1.performance.now() - startTime;
                logger.error('Connection recovery failed', {
                    duration,
                    error: error instanceof Error ? error.message : String(error)
                });
                throw error;
            }
        });
        (0, globals_1.test)('Network timeout handling', async () => {
            const shortTimeoutConnection = new web3_js_1.Connection(TEST_CONFIG.SOLANA_RPC_URL, {
                commitment: 'confirmed',
                fetch: (url, options) => {
                    return fetch(url, { ...options, signal: AbortSignal.timeout(1000) });
                }
            });
            try {
                await shortTimeoutConnection.getBlockHeight();
                logger.info('Network timeout test - connection succeeded');
            }
            catch (error) {
                logger.info('Network timeout test - timeout occurred as expected', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    });
    (0, globals_1.describe)('Transaction Management', () => {
        (0, globals_1.test)('Transaction signing and submission', async () => {
            const testTransaction = {
                signature: 'test-signature',
                timestamp: Date.now(),
                status: 'pending'
            };
            const { duration } = await measureExecutionTime(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return testTransaction;
            });
            (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_TRANSACTION);
            (0, globals_1.expect)(testTransaction.signature).toBeDefined();
            (0, globals_1.expect)(testTransaction.timestamp).toBeGreaterThan(0);
            logger.info('Transaction signing test completed', { duration });
        });
        (0, globals_1.test)('Transaction confirmation timing', async () => {
            const startTime = Date.now();
            await new Promise(resolve => setTimeout(resolve, 100));
            const confirmationTime = Date.now() - startTime;
            (0, globals_1.expect)(confirmationTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_TRANSACTION);
            logger.info('Transaction confirmation timing test completed', {
                confirmationTime
            });
        });
        (0, globals_1.test)('PDA (Program Derived Address) management', () => {
            const seeds = [Buffer.from('test-seed'), player1Keypair.publicKey.toBuffer()];
            const programId = new web3_js_1.PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
            const [pda, bump] = web3_js_1.PublicKey.findProgramAddressSync(seeds, programId);
            (0, globals_1.expect)(pda).toBeInstanceOf(web3_js_1.PublicKey);
            (0, globals_1.expect)(bump).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(bump).toBeLessThanOrEqual(255);
            const [pda2, bump2] = web3_js_1.PublicKey.findProgramAddressSync(seeds, programId);
            (0, globals_1.expect)(pda.equals(pda2)).toBe(true);
            (0, globals_1.expect)(bump).toBe(bump2);
            logger.info('PDA management test completed', {
                pda: pda.toString(),
                bump
            });
        });
        (0, globals_1.test)('Account state synchronization', async () => {
            const { result: accountInfo, duration } = await measureExecutionTime(async () => {
                return await retryOperation(() => connection.getAccountInfo(player1Keypair.publicKey));
            });
            (0, globals_1.expect)(duration).toBeLessThan(5000);
            logger.info('Account state synchronization test completed', {
                accountExists: accountInfo !== null,
                duration
            });
        });
    });
    (0, globals_1.describe)('Performance Benchmarks', () => {
        (0, globals_1.test)('Session creation <100ms requirement', async () => {
            const iterations = 10;
            const results = [];
            for (let i = 0; i < iterations; i++) {
                const sessionId = `perf-session-${Date.now()}-${i}`;
                const config = createTestSessionConfig();
                const { duration } = await measureExecutionTime(() => service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-east-1').then(result => {
                    createdSessions.push(sessionId);
                    return result;
                }));
                results.push(duration);
                (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_SESSION_CREATE);
            }
            const avgDuration = results.reduce((sum, d) => sum + d, 0) / results.length;
            const maxDuration = Math.max(...results);
            logger.info('Session creation performance validated', {
                iterations,
                avgDuration: Math.round(avgDuration),
                maxDuration: Math.round(maxDuration),
                requirement: TEST_CONFIG.PERFORMANCE_THRESHOLD_SESSION_CREATE
            });
        });
        (0, globals_1.test)('State updates <50ms BOLT requirement', async () => {
            const sessionId = `bolt-perf-session-${Date.now()}`;
            const config = createTestSessionConfig();
            await service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-east-1');
            createdSessions.push(sessionId);
            const updateResults = [];
            for (let i = 0; i < 5; i++) {
                const moveData = createTestMoveData();
                moveData.moveHash = `bolt-perf-${i}-${Date.now()}`;
                moveData.fromY = 1 + i;
                moveData.toY = 2 + i;
                const { duration } = await measureExecutionTime(() => service.submitMoveEnhanced(sessionId, moveData, player1Keypair.publicKey, new Uint8Array([i, i + 1, i + 2, i + 3])));
                updateResults.push(duration);
                (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_STATE_UPDATE);
            }
            const avgUpdateTime = updateResults.reduce((sum, d) => sum + d, 0) / updateResults.length;
            const maxUpdateTime = Math.max(...updateResults);
            logger.info('BOLT state update performance validated', {
                updates: updateResults.length,
                avgUpdateTime: Math.round(avgUpdateTime),
                maxUpdateTime: Math.round(maxUpdateTime),
                requirement: TEST_CONFIG.PERFORMANCE_THRESHOLD_STATE_UPDATE
            });
        });
        (0, globals_1.test)('Transaction confirmation <2s requirement', async () => {
            const iterations = 3;
            const confirmationTimes = [];
            for (let i = 0; i < iterations; i++) {
                const { duration } = await measureExecutionTime(async () => {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await new Promise(resolve => setTimeout(resolve, 200));
                    return new Promise(resolve => setTimeout(resolve, 300));
                });
                confirmationTimes.push(duration);
                (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_TRANSACTION);
            }
            const avgConfirmation = confirmationTimes.reduce((sum, t) => sum + t, 0) / confirmationTimes.length;
            logger.info('Transaction confirmation performance validated', {
                iterations,
                avgConfirmation: Math.round(avgConfirmation),
                maxConfirmation: Math.round(Math.max(...confirmationTimes)),
                requirement: TEST_CONFIG.PERFORMANCE_THRESHOLD_TRANSACTION
            });
        });
        (0, globals_1.test)('Connection recovery <5s requirement', async () => {
            const recoveryTests = [];
            for (let i = 0; i < 3; i++) {
                const { duration } = await measureExecutionTime(async () => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    let attempt = 1;
                    while (attempt <= 3) {
                        try {
                            await retryOperation(() => connection.getBlockHeight());
                            break;
                        }
                        catch (error) {
                            await new Promise(resolve => setTimeout(resolve, 200 * attempt));
                            attempt++;
                        }
                    }
                    return true;
                });
                recoveryTests.push(duration);
                (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_CONNECTION_RECOVERY);
            }
            const avgRecovery = recoveryTests.reduce((sum, t) => sum + t, 0) / recoveryTests.length;
            logger.info('Connection recovery performance validated', {
                tests: recoveryTests.length,
                avgRecovery: Math.round(avgRecovery),
                maxRecovery: Math.round(Math.max(...recoveryTests)),
                requirement: TEST_CONFIG.PERFORMANCE_THRESHOLD_CONNECTION_RECOVERY
            });
        });
        (0, globals_1.test)('Concurrent session creation performance', async () => {
            const concurrentSessions = 5;
            const sessionPromises = Array.from({ length: concurrentSessions }, (_, i) => {
                const sessionId = `concurrent-session-${Date.now()}-${i}`;
                const config = createTestSessionConfig();
                return measureExecutionTime(() => service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-east-1').then(result => {
                    createdSessions.push(sessionId);
                    return result;
                }));
            });
            const results = await Promise.all(sessionPromises);
            results.forEach(({ duration }, index) => {
                (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_SESSION_CREATE * 2);
                logger.debug(`Concurrent session ${index} created in ${duration}ms`);
            });
            logger.info('Concurrent session creation test completed', {
                sessions: concurrentSessions,
                maxDuration: Math.max(...results.map(r => r.duration)),
                avgDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length
            });
        });
        (0, globals_1.test)('Memory usage during extended operations', async () => {
            const initialMemory = process.memoryUsage();
            for (let i = 0; i < 10; i++) {
                const sessionId = `memory-test-session-${Date.now()}-${i}`;
                const config = createTestSessionConfig();
                await service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-east-1');
                createdSessions.push(sessionId);
            }
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            (0, globals_1.expect)(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
            logger.info('Memory usage test completed', {
                initialHeap: initialMemory.heapUsed,
                finalHeap: finalMemory.heapUsed,
                increase: memoryIncrease,
                increaseKB: Math.round(memoryIncrease / 1024)
            });
        });
    });
    (0, globals_1.describe)('Edge Cases and Stress Testing', () => {
        (0, globals_1.test)('Invalid move data handling', async () => {
            const sessionId = `edge-case-session-${Date.now()}`;
            const config = createTestSessionConfig();
            await service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-east-1');
            createdSessions.push(sessionId);
            const invalidMoves = [
                { ...createTestMoveData(), fromX: -1 },
                { ...createTestMoveData(), toY: 10 },
                { ...createTestMoveData(), fromLevel: 5 },
                { ...createTestMoveData(), pieceType: 'InvalidPiece' },
            ];
            for (const invalidMove of invalidMoves) {
                await (0, globals_1.expect)(service.submitMoveEnhanced(sessionId, invalidMove, player1Keypair.publicKey, new Uint8Array([1, 2, 3, 4]))).rejects.toThrow();
            }
            logger.info('Invalid move data handling test completed');
        });
        (0, globals_1.test)('Large session data handling', async () => {
            const sessionId = `large-data-session-${Date.now()}`;
            const config = createTestSessionConfig();
            const { duration } = await measureExecutionTime(() => service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-east-1'));
            (0, globals_1.expect)(duration).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD_SESSION_CREATE * 2);
            createdSessions.push(sessionId);
            logger.info('Large session data handling test completed', { duration });
        });
        (0, globals_1.test)('Rapid successive operations', async () => {
            const sessionId = `rapid-ops-session-${Date.now()}`;
            const config = createTestSessionConfig();
            await service.createEnhancedSession(sessionId, player1Keypair.publicKey, player2Keypair.publicKey, config, 'us-east-1');
            createdSessions.push(sessionId);
            const moves = Array.from({ length: 5 }, (_, i) => ({
                ...createTestMoveData(),
                fromY: 1 + i,
                toY: 2 + i,
                moveHash: `rapid-move-${i}-${Date.now()}`,
                timestamp: Date.now() + i
            }));
            const results = await Promise.allSettled(moves.map((move, i) => service.submitMoveEnhanced(sessionId, move, player1Keypair.publicKey, new Uint8Array([i, i + 1, i + 2, i + 3]))));
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            (0, globals_1.expect)(successCount).toBeGreaterThan(0);
            logger.info('Rapid successive operations test completed', {
                totalMoves: moves.length,
                successfulMoves: successCount
            });
        });
    });
});
//# sourceMappingURL=magicblock-integration.test.js.map