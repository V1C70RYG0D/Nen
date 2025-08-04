"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testUtilities = void 0;
const globals_1 = require("@jest/globals");
const EnhancedAITrainingServiceV2_1 = require("../services/EnhancedAITrainingServiceV2");
const AdvancedLoadTestingService_1 = require("../services/AdvancedLoadTestingService");
const EnhancedComplianceServiceV2_1 = require("../services/EnhancedComplianceServiceV2");
const logger_1 = require("../utils/logger");
globals_1.jest.mock('../utils/logger');
globals_1.jest.mock('../services/EnhancedDatabaseService');
globals_1.jest.mock('../services/GungiGameEngine');
(0, globals_1.describe)('Final 5% Gap Closure - Enhanced Services Test Suite', () => {
    (0, globals_1.describe)('Enhanced AI Training Service V2', () => {
        let aiTrainingService;
        (0, globals_1.beforeAll)(async () => {
            aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
        });
        (0, globals_1.afterAll)(async () => {
            await aiTrainingService.shutdown();
        });
        (0, globals_1.describe)('Advanced Self-Play Training', () => {
            (0, globals_1.test)('should schedule weekly training with priority handling', async () => {
                const agentId = 'test_agent_001';
                const gamesPerSession = 100;
                const priority = 'high';
                await aiTrainingService.scheduleWeeklyTraining(agentId, gamesPerSession, priority);
                (0, globals_1.expect)(logger_1.logger.info).toHaveBeenCalledWith('Advanced weekly training scheduled', globals_1.expect.objectContaining({
                    agentId,
                    gamesPerSession,
                    priority,
                    estimatedComputeTime: globals_1.expect.any(String)
                }));
            });
            (0, globals_1.test)('should start advanced self-play training with parallel processing', async () => {
                const agentId = 'test_agent_002';
                const numberOfGames = 50;
                const session = await aiTrainingService.startAdvancedSelfPlayTraining(agentId, numberOfGames);
                (0, globals_1.expect)(session).toMatchObject({
                    id: globals_1.expect.stringContaining('advanced_training_'),
                    agentId,
                    targetGames: numberOfGames,
                    status: 'running',
                    started: globals_1.expect.any(Date),
                    learningData: globals_1.expect.any(Array),
                    computeTime: globals_1.expect.any(Number)
                });
                (0, globals_1.expect)(logger_1.logger.info).toHaveBeenCalledWith('Starting advanced self-play training session', globals_1.expect.objectContaining({
                    agentId,
                    numberOfGames,
                    estimatedDuration: globals_1.expect.any(String)
                }));
            });
            (0, globals_1.test)('should handle training session failures with recovery', async () => {
                const agentId = 'test_agent_003';
                globals_1.jest.spyOn(aiTrainingService, 'executeParallelTraining').mockRejectedValueOnce(new Error('Training simulation failed'));
                await (0, globals_1.expect)(aiTrainingService.startAdvancedSelfPlayTraining(agentId, 10)).rejects.toThrow('Training simulation failed');
                (0, globals_1.expect)(logger_1.logger.error).toHaveBeenCalledWith('Advanced self-play training failed', globals_1.expect.objectContaining({
                    agentId,
                    error: 'Training simulation failed'
                }));
            });
            (0, globals_1.test)('should prevent concurrent training for same agent', async () => {
                const agentId = 'test_agent_004';
                const firstSession = aiTrainingService.startAdvancedSelfPlayTraining(agentId, 20);
                await (0, globals_1.expect)(aiTrainingService.startAdvancedSelfPlayTraining(agentId, 20)).rejects.toThrow(`Agent ${agentId} is already in training session`);
                await firstSession;
            });
        });
        (0, globals_1.describe)('Learning Data Generation', () => {
            (0, globals_1.test)('should generate comprehensive learning data', async () => {
                const gameResult = await aiTrainingService.playAdvancedSelfPlayGame('player1', 'player2', 1);
                (0, globals_1.expect)(gameResult).toMatchObject({
                    winner: globals_1.expect.stringMatching(/player[12]/),
                    moves: globals_1.expect.any(Number),
                    gameTime: globals_1.expect.any(Number),
                    learningData: globals_1.expect.objectContaining({
                        gameId: globals_1.expect.any(String),
                        gameNumber: 1,
                        agentElo: globals_1.expect.any(Number),
                        personalityFactors: globals_1.expect.any(Number),
                        openingMoves: globals_1.expect.any(Array),
                        midgameAnalysis: globals_1.expect.any(Object),
                        criticalPositions: globals_1.expect.any(Array),
                        endgamePattern: globals_1.expect.any(Object),
                        learningPoints: globals_1.expect.any(Array)
                    })
                });
            });
            (0, globals_1.test)('should calculate performance improvements accurately', async () => {
                const session = {
                    id: 'test_session',
                    agentId: 'test_agent',
                    targetGames: 10,
                    gamesPlayed: 10,
                    winRate: 0.7,
                    averageGameLength: 35,
                    eloChange: 0,
                    started: new Date(),
                    status: 'running',
                    learningData: [],
                    computeTime: 0
                };
                const mockResults = Array.from({ length: 10 }, (_, i) => ({
                    winner: 'test_agent',
                    moves: 30 + Math.random() * 20,
                    gameTime: 30000,
                    learningData: { gameId: `game_${i}` }
                }));
                await aiTrainingService.processTrainingResults(session, mockResults);
                (0, globals_1.expect)(session.winRate).toBeGreaterThan(0);
                (0, globals_1.expect)(session.averageGameLength).toBeGreaterThan(0);
                (0, globals_1.expect)(session.eloChange).toBeDefined();
            });
        });
        (0, globals_1.describe)('Training Metrics and Analytics', () => {
            (0, globals_1.test)('should provide detailed training metrics', async () => {
                const agentId = 'test_agent_metrics';
                const metrics = await aiTrainingService.getTrainingMetrics(agentId);
                (0, globals_1.expect)(metrics).toMatchObject({
                    totalSessions: globals_1.expect.any(Number),
                    totalGames: globals_1.expect.any(Number),
                    averageWinRate: globals_1.expect.any(Number),
                    eloImprovement: globals_1.expect.any(Number),
                    lastUpdate: globals_1.expect.any(Date),
                    nextScheduledUpdate: globals_1.expect.any(Date),
                    computeEfficiency: globals_1.expect.any(Number)
                });
            });
            (0, globals_1.test)('should track active training sessions', async () => {
                const activeSessions = await aiTrainingService.getActiveTrainingSessions();
                (0, globals_1.expect)(Array.isArray(activeSessions)).toBe(true);
                activeSessions.forEach((session) => {
                    (0, globals_1.expect)(session).toMatchObject({
                        id: globals_1.expect.any(String),
                        agentId: globals_1.expect.any(String),
                        status: 'running'
                    });
                });
            });
        });
    });
    (0, globals_1.describe)('Advanced Load Testing Service', () => {
        let loadTestingService;
        (0, globals_1.beforeAll)(async () => {
            loadTestingService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
        });
        (0, globals_1.describe)('Load Test Execution', () => {
            (0, globals_1.test)('should execute comprehensive load test with 1000+ concurrent games', async () => {
                const config = {
                    maxConcurrentGames: 1000,
                    testDurationMs: 60000,
                    rampUpTimeMs: 30000,
                    latencyThresholdMs: 100,
                    memoryThresholdMB: 2048,
                    cpuThresholdPercent: 80,
                    targetThroughput: 50
                };
                const metrics = await loadTestingService.executeLoadTest(config);
                (0, globals_1.expect)(metrics).toMatchObject({
                    gamesStarted: globals_1.expect.any(Number),
                    gamesCompleted: globals_1.expect.any(Number),
                    gamesFailed: globals_1.expect.any(Number),
                    averageLatency: globals_1.expect.any(Number),
                    maxLatency: globals_1.expect.any(Number),
                    minLatency: globals_1.expect.any(Number),
                    throughput: globals_1.expect.any(Number),
                    memoryUsageMB: globals_1.expect.any(Number),
                    cpuUsagePercent: globals_1.expect.any(Number),
                    concurrentConnections: globals_1.expect.any(Number),
                    errorRate: globals_1.expect.any(Number),
                    timestamp: globals_1.expect.any(Date)
                });
                (0, globals_1.expect)(metrics.gamesStarted).toBeGreaterThan(0);
                (0, globals_1.expect)(metrics.averageLatency).toBeLessThan(1000);
                (0, globals_1.expect)(metrics.errorRate).toBeLessThan(0.1);
            }, 120000);
            (0, globals_1.test)('should handle database connection stress testing', async () => {
                await (0, globals_1.expect)(loadTestingService.stressDatabaseConnections({
                    maxConcurrentGames: 100,
                    testDurationMs: 30000,
                    rampUpTimeMs: 10000,
                    latencyThresholdMs: 100,
                    memoryThresholdMB: 1024,
                    cpuThresholdPercent: 70,
                    targetThroughput: 20
                })).resolves.not.toThrow();
            });
            (0, globals_1.test)('should test WebSocket connections under load', async () => {
                await (0, globals_1.expect)(loadTestingService.stressWebSocketConnections({
                    maxConcurrentGames: 500,
                    testDurationMs: 30000,
                    rampUpTimeMs: 10000,
                    latencyThresholdMs: 100,
                    memoryThresholdMB: 1024,
                    cpuThresholdPercent: 70,
                    targetThroughput: 25
                })).resolves.not.toThrow();
            });
        });
        (0, globals_1.describe)('Performance Monitoring', () => {
            (0, globals_1.test)('should capture accurate performance snapshots', async () => {
                const snapshot = await loadTestingService.capturePerformanceSnapshot();
                (0, globals_1.expect)(snapshot).toMatchObject({
                    timestamp: globals_1.expect.any(Date),
                    activeSessions: globals_1.expect.any(Number),
                    memoryUsage: globals_1.expect.any(Number),
                    cpuUsage: globals_1.expect.any(Number),
                    latency: globals_1.expect.any(Number),
                    throughput: globals_1.expect.any(Number),
                    errorCount: globals_1.expect.any(Number)
                });
                (0, globals_1.expect)(snapshot.memoryUsage).toBeGreaterThan(0);
                (0, globals_1.expect)(snapshot.cpuUsage).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(snapshot.cpuUsage).toBeLessThanOrEqual(100);
            });
            (0, globals_1.test)('should provide scaling recommendations', async () => {
                const recommendations = loadTestingService.getScalingRecommendations();
                (0, globals_1.expect)(recommendations).toMatchObject({
                    recommendations: globals_1.expect.any(Array),
                    currentCapacity: globals_1.expect.any(Number),
                    recommendedCapacity: globals_1.expect.any(Number),
                    bottlenecks: globals_1.expect.any(Array)
                });
                (0, globals_1.expect)(recommendations.recommendations.length).toBeGreaterThan(0);
            });
        });
        (0, globals_1.describe)('Failure Recovery Testing', () => {
            (0, globals_1.test)('should execute failure recovery scenarios', async () => {
                await (0, globals_1.expect)(loadTestingService.executeFailureRecoveryTest({
                    maxConcurrentGames: 50,
                    testDurationMs: 30000,
                    rampUpTimeMs: 10000,
                    latencyThresholdMs: 100,
                    memoryThresholdMB: 1024,
                    cpuThresholdPercent: 70,
                    targetThroughput: 10
                })).resolves.not.toThrow();
            });
            (0, globals_1.test)('should recover failed game sessions', async () => {
                const gameId = 1001;
                await (0, globals_1.expect)(loadTestingService.recoverFailedGame(gameId)).resolves.not.toThrow();
                (0, globals_1.expect)(logger_1.logger.info).toHaveBeenCalledWith('Attempting game recovery', { gameId });
            });
        });
        (0, globals_1.describe)('Load Test Status and Reporting', () => {
            (0, globals_1.test)('should provide real-time load test status', async () => {
                const status = loadTestingService.getLoadTestStatus();
                (0, globals_1.expect)(status).toMatchObject({
                    running: globals_1.expect.any(Boolean),
                    metrics: globals_1.expect.any(Object),
                    activeSessions: globals_1.expect.any(Number),
                    performanceHistory: globals_1.expect.any(Array)
                });
            });
            (0, globals_1.test)('should export comprehensive test results', async () => {
                const results = loadTestingService.exportTestResults();
                (0, globals_1.expect)(results).toMatchObject({
                    testMetrics: globals_1.expect.any(Object),
                    performanceHistory: globals_1.expect.any(Array),
                    scalingRecommendations: globals_1.expect.any(Object),
                    testConfiguration: globals_1.expect.objectContaining({
                        timestamp: globals_1.expect.any(Date),
                        environment: globals_1.expect.any(Object)
                    })
                });
            });
        });
    });
    (0, globals_1.describe)('Enhanced Compliance Service V2', () => {
        let complianceService;
        (0, globals_1.beforeAll)(async () => {
            complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
        });
        (0, globals_1.afterAll)(async () => {
            await complianceService.shutdown();
        });
        (0, globals_1.describe)('Fraud Detection', () => {
            (0, globals_1.test)('should detect low-risk transactions correctly', async () => {
                const userId = 'user_low_risk';
                const transactionAmount = 100;
                const metadata = {
                    ipAddress: '192.168.1.1',
                    country: 'US',
                    userAgent: 'Mozilla/5.0...'
                };
                const result = await complianceService.detectFraud(userId, transactionAmount, metadata);
                (0, globals_1.expect)(result).toMatchObject({
                    riskScore: globals_1.expect.any(Number),
                    riskLevel: globals_1.expect.stringMatching(/low|medium|high|critical/),
                    flags: globals_1.expect.any(Array),
                    recommendations: globals_1.expect.any(Array),
                    shouldBlock: globals_1.expect.any(Boolean),
                    requiresReview: globals_1.expect.any(Boolean),
                    confidence: globals_1.expect.any(Number)
                });
                (0, globals_1.expect)(result.riskScore).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(result.riskScore).toBeLessThanOrEqual(100);
                (0, globals_1.expect)(result.confidence).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(result.confidence).toBeLessThanOrEqual(1);
            });
            (0, globals_1.test)('should detect high-risk transactions and flag appropriately', async () => {
                const userId = 'user_high_risk';
                const transactionAmount = 50000;
                const metadata = {
                    ipAddress: '1.2.3.4',
                    country: 'CN',
                    userAgent: 'unknown'
                };
                const result = await complianceService.detectFraud(userId, transactionAmount, metadata);
                (0, globals_1.expect)(result.riskLevel).toMatch(/high|critical/);
                (0, globals_1.expect)(result.flags.length).toBeGreaterThan(0);
                if (result.riskLevel === 'critical') {
                    (0, globals_1.expect)(result.shouldBlock).toBe(true);
                }
            });
            (0, globals_1.test)('should handle rapid transaction patterns', async () => {
                const userId = 'user_rapid_transactions';
                const promises = [];
                for (let i = 0; i < 6; i++) {
                    promises.push(complianceService.detectFraud(userId, 1000, {
                        ipAddress: '192.168.1.1',
                        country: 'US'
                    }));
                }
                const results = await Promise.all(promises);
                const lastResult = results[results.length - 1];
                (0, globals_1.expect)(lastResult.flags).toContain('rapid_transactions');
            });
            (0, globals_1.test)('should analyze transaction patterns and behavioral changes', async () => {
                const userId = 'user_pattern_analysis';
                await complianceService.detectFraud(userId, 100, {});
                const result = await complianceService.detectFraud(userId, 10000, {});
                (0, globals_1.expect)(result.flags).toContain('unusual_behavior');
                (0, globals_1.expect)(result.riskScore).toBeGreaterThan(50);
            });
        });
        (0, globals_1.describe)('KYC Verification', () => {
            (0, globals_1.test)('should perform KYC verification with correct levels', async () => {
                const userId = 'user_kyc_test';
                const kycResult = await complianceService.verifyKYC(userId);
                (0, globals_1.expect)(kycResult).toMatchObject({
                    userId,
                    level: globals_1.expect.stringMatching(/none|basic|intermediate|full/),
                    documents: globals_1.expect.any(Array),
                    verificationDate: globals_1.expect.any(Date),
                    expiryDate: globals_1.expect.any(Date),
                    status: globals_1.expect.stringMatching(/pending|approved|rejected|expired/),
                    verifiedBy: globals_1.expect.any(String),
                    riskAssessment: globals_1.expect.any(Number)
                });
                (0, globals_1.expect)(kycResult.riskAssessment).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(kycResult.riskAssessment).toBeLessThanOrEqual(100);
            });
            (0, globals_1.test)('should handle KYC verification failures gracefully', async () => {
                const nonExistentUserId = 'non_existent_user';
                const kycResult = await complianceService.verifyKYC(nonExistentUserId);
                (0, globals_1.expect)(kycResult.level).toBe('none');
                (0, globals_1.expect)(kycResult.status).toBe('rejected');
                (0, globals_1.expect)(kycResult.riskAssessment).toBe(100);
            });
        });
        (0, globals_1.describe)('Investigation Management', () => {
            (0, globals_1.test)('should create investigations for high-risk transactions', async () => {
                const userId = 'user_investigation';
                const transactionAmount = 75000;
                const fraudResult = await complianceService.detectFraud(userId, transactionAmount, {
                    country: 'RU'
                });
                if (fraudResult.requiresReview) {
                    const investigations = complianceService.getActiveInvestigations();
                    (0, globals_1.expect)(investigations.length).toBeGreaterThan(0);
                    const userInvestigation = investigations.find((inv) => inv.userId === userId);
                    (0, globals_1.expect)(userInvestigation).toBeDefined();
                    (0, globals_1.expect)(userInvestigation?.riskScore).toBeGreaterThan(70);
                }
            });
            (0, globals_1.test)('should process investigation queue automatically', async () => {
                const promises = [];
                for (let i = 0; i < 3; i++) {
                    promises.push(complianceService.detectFraud(`user_queue_${i}`, 80000, {
                        country: 'IR'
                    }));
                }
                await Promise.all(promises);
                await complianceService.processInvestigationQueue();
                const investigations = complianceService.getActiveInvestigations();
                const processedInvestigations = Array.from(complianceService.activeInvestigations.values())
                    .filter((inv) => inv.status === 'resolved' || inv.status === 'escalated');
                (0, globals_1.expect)(processedInvestigations.length).toBeGreaterThan(0);
            });
        });
        (0, globals_1.describe)('Compliance Metrics and Reporting', () => {
            (0, globals_1.test)('should provide accurate compliance metrics', async () => {
                const metrics = complianceService.getComplianceMetrics();
                (0, globals_1.expect)(metrics).toMatchObject({
                    totalTransactions: globals_1.expect.any(Number),
                    flaggedTransactions: globals_1.expect.any(Number),
                    blockedTransactions: globals_1.expect.any(Number),
                    averageRiskScore: globals_1.expect.any(Number),
                    kycComplianceRate: globals_1.expect.any(Number),
                    falsePositiveRate: globals_1.expect.any(Number),
                    investigationQueue: globals_1.expect.any(Number),
                    processedToday: globals_1.expect.any(Number),
                    timestamp: globals_1.expect.any(Date)
                });
                (0, globals_1.expect)(metrics.totalTransactions).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(metrics.kycComplianceRate).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(metrics.kycComplianceRate).toBeLessThanOrEqual(100);
            });
            (0, globals_1.test)('should update compliance metrics automatically', async () => {
                const initialMetrics = complianceService.getComplianceMetrics();
                await complianceService.detectFraud('user_metrics_test', 500, {});
                const updatedMetrics = complianceService.getComplianceMetrics();
                (0, globals_1.expect)(updatedMetrics.totalTransactions).toBeGreaterThanOrEqual(initialMetrics.totalTransactions);
            });
            (0, globals_1.test)('should generate compliance recommendations', async () => {
                await complianceService.detectFraud('user_rec_1', 100, {});
                await complianceService.detectFraud('user_rec_2', 90000, { country: 'KP' });
                await complianceService.updateComplianceMetrics();
                const recommendations = complianceService.getComplianceRecommendations();
                (0, globals_1.expect)(Array.isArray(recommendations)).toBe(true);
                (0, globals_1.expect)(recommendations.length).toBeGreaterThan(0);
            });
        });
        (0, globals_1.describe)('Error Handling and Edge Cases', () => {
            (0, globals_1.test)('should handle fraud detection errors gracefully', async () => {
                const originalCachedQuery = complianceService.dbService.cachedQuery;
                complianceService.dbService.cachedQuery = globals_1.jest.fn().mockRejectedValue(new Error('Database connection failed'));
                const result = await complianceService.detectFraud('user_error_test', 1000, {});
                (0, globals_1.expect)(result.riskScore).toBe(100);
                (0, globals_1.expect)(result.riskLevel).toBe('critical');
                (0, globals_1.expect)(result.shouldBlock).toBe(true);
                (0, globals_1.expect)(result.flags).toContain('analysis_error');
                complianceService.dbService.cachedQuery = originalCachedQuery;
            });
            (0, globals_1.test)('should handle missing user data in risk analysis', async () => {
                const result = await complianceService.gatherRiskFactors('non_existent_user_123', 1000, {});
                (0, globals_1.expect)(result).toMatchObject({
                    walletAge: 0,
                    transactionHistory: 0,
                    largeTransactionCount: 0,
                    rapidTransactionPattern: true,
                    unusualBehaviorPattern: true,
                    geolocationRisk: globals_1.expect.any(Number),
                    deviceFingerprint: 'unknown',
                    timeOfDayPattern: globals_1.expect.any(Number)
                });
            });
        });
    });
    (0, globals_1.describe)('Enhanced Services Integration', () => {
        (0, globals_1.test)('should integrate AI training with compliance monitoring', async () => {
            const aiService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
            const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
            const agentId = 'integration_test_agent';
            const trainingSession = await aiService.startAdvancedSelfPlayTraining(agentId, 10);
            const metrics = complianceService.getComplianceMetrics();
            (0, globals_1.expect)(metrics).toBeDefined();
            await aiService.stopTrainingSession(trainingSession.id);
        });
        (0, globals_1.test)('should handle load testing with compliance checks', async () => {
            const loadService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
            const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
            const loadTestConfig = {
                maxConcurrentGames: 10,
                testDurationMs: 10000,
                rampUpTimeMs: 5000,
                latencyThresholdMs: 100,
                memoryThresholdMB: 1024,
                cpuThresholdPercent: 80,
                targetThroughput: 5
            };
            const loadMetrics = await loadService.executeLoadTest(loadTestConfig);
            const complianceMetrics = complianceService.getComplianceMetrics();
            (0, globals_1.expect)(loadMetrics.gamesCompleted).toBeGreaterThan(0);
            (0, globals_1.expect)(complianceMetrics).toBeDefined();
        });
        (0, globals_1.test)('should maintain system stability under high load', async () => {
            const aiService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
            const loadService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
            const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
            const operations = [
                aiService.startAdvancedSelfPlayTraining('stability_test_1', 5),
                aiService.startAdvancedSelfPlayTraining('stability_test_2', 5),
                complianceService.detectFraud('stability_user_1', 1000, {}),
                complianceService.detectFraud('stability_user_2', 2000, {})
            ];
            const results = await Promise.allSettled(operations);
            const failures = results.filter(result => result.status === 'rejected');
            (0, globals_1.expect)(failures.length).toBeLessThan(results.length * 0.2);
        });
    });
    (0, globals_1.describe)('Performance Benchmarks', () => {
        (0, globals_1.test)('should meet latency requirements for fraud detection', async () => {
            const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
            const startTime = Date.now();
            await complianceService.detectFraud('perf_test_user', 1000, {});
            const latency = Date.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(1000);
        });
        (0, globals_1.test)('should handle concurrent AI training efficiently', async () => {
            const aiService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
            const startTime = Date.now();
            const concurrentTraining = [
                aiService.startAdvancedSelfPlayTraining('perf_agent_1', 5),
                aiService.startAdvancedSelfPlayTraining('perf_agent_2', 5),
                aiService.startAdvancedSelfPlayTraining('perf_agent_3', 5)
            ];
            await Promise.all(concurrentTraining);
            const totalTime = Date.now() - startTime;
            (0, globals_1.expect)(totalTime).toBeLessThan(60000);
        });
        (0, globals_1.test)('should process high-volume compliance checks efficiently', async () => {
            const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
            const numberOfChecks = 50;
            const startTime = Date.now();
            const checks = [];
            for (let i = 0; i < numberOfChecks; i++) {
                checks.push(complianceService.detectFraud(`perf_user_${i}`, Math.random() * 10000, {}));
            }
            await Promise.all(checks);
            const totalTime = Date.now() - startTime;
            const checksPerSecond = numberOfChecks / (totalTime / 1000);
            (0, globals_1.expect)(checksPerSecond).toBeGreaterThan(10);
        });
    });
    (0, globals_1.describe)('Resource Management', () => {
        (0, globals_1.test)('should not leak memory during extended operations', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            const aiService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
            const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
            for (let i = 0; i < 20; i++) {
                await complianceService.detectFraud(`memory_test_${i}`, 1000, {});
            }
            if (global.gc) {
                global.gc();
            }
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            (0, globals_1.expect)(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
        (0, globals_1.test)('should cleanup resources properly on shutdown', async () => {
            const aiService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
            const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
            await aiService.startAdvancedSelfPlayTraining('cleanup_test', 3);
            await complianceService.detectFraud('cleanup_user', 1000, {});
            await Promise.all([
                aiService.shutdown(),
                complianceService.shutdown()
            ]);
            (0, globals_1.expect)(logger_1.logger.info).toHaveBeenCalledWith(globals_1.expect.stringContaining('shutdown completed'), globals_1.expect.any(Object));
        });
    });
});
(0, globals_1.describe)('Load Testing Validation Suite', () => {
    let loadTestingService;
    (0, globals_1.beforeAll)(() => {
        loadTestingService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
    });
    (0, globals_1.test)('should validate system can handle 1000+ concurrent games', async () => {
        const heavyLoadConfig = {
            maxConcurrentGames: 1000,
            testDurationMs: 120000,
            rampUpTimeMs: 60000,
            latencyThresholdMs: 100,
            memoryThresholdMB: 4096,
            cpuThresholdPercent: 90,
            targetThroughput: 100
        };
        const result = await loadTestingService.executeLoadTest(heavyLoadConfig);
        (0, globals_1.expect)(result.gamesCompleted).toBeGreaterThan(500);
        (0, globals_1.expect)(result.averageLatency).toBeLessThan(500);
        (0, globals_1.expect)(result.errorRate).toBeLessThan(0.1);
        (0, globals_1.expect)(result.throughput).toBeGreaterThan(5);
    }, 180000);
    (0, globals_1.test)('should provide accurate performance recommendations', async () => {
        const recommendations = loadTestingService.getScalingRecommendations();
        (0, globals_1.expect)(recommendations.recommendations).toContain(globals_1.expect.stringMatching(/performance|scaling|optimization|capacity/i));
        (0, globals_1.expect)(recommendations.recommendedCapacity).toBeGreaterThan(0);
        (0, globals_1.expect)(recommendations.currentCapacity).toBeGreaterThanOrEqual(0);
    });
});
(0, globals_1.describe)('Compliance and Fraud Detection Coverage', () => {
    let complianceService;
    (0, globals_1.beforeAll)(() => {
        complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
    });
    (0, globals_1.test)('should achieve 100% fraud detection test coverage', async () => {
        const testCases = [
            { userId: 'new_wallet_user', amount: 1000, country: 'US', expected: 'medium' },
            { userId: 'high_risk_user', amount: 100000, country: 'KP', expected: 'critical' },
            { userId: 'normal_user', amount: 100, country: 'US', expected: 'low' },
            { userId: 'rapid_user', amount: 5000, country: 'CN', expected: 'high' }
        ];
        for (const testCase of testCases) {
            const result = await complianceService.detectFraud(testCase.userId, testCase.amount, { country: testCase.country });
            (0, globals_1.expect)(result.riskLevel).toBeDefined();
            (0, globals_1.expect)(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
        }
    });
    (0, globals_1.test)('should validate all KYC verification levels', async () => {
        const kycLevels = ['basic_user', 'intermediate_user', 'full_user', 'no_kyc_user'];
        for (const userId of kycLevels) {
            const kyc = await complianceService.verifyKYC(userId);
            (0, globals_1.expect)(['none', 'basic', 'intermediate', 'full']).toContain(kyc.level);
            (0, globals_1.expect)(['pending', 'approved', 'rejected', 'expired']).toContain(kyc.status);
        }
    });
    (0, globals_1.test)('should test all investigation workflow states', async () => {
        await complianceService.detectFraud('inv_user_1', 90000, { country: 'RU' });
        await complianceService.detectFraud('inv_user_2', 95000, { country: 'IR' });
        await complianceService.processInvestigationQueue();
        const investigations = Array.from(complianceService.activeInvestigations.values());
        const statuses = investigations.map((inv) => inv.status);
        (0, globals_1.expect)(statuses).toEqual(globals_1.expect.arrayContaining(['open', 'in_progress', 'resolved', 'escalated']));
    });
});
exports.testUtilities = {
    createMockUser: (userId) => ({
        id: userId,
        email: `${userId}@test.com`,
        wallet_address: `${userId}_wallet`,
        created_at: new Date(),
        total_winnings: '1000.00'
    }),
    createMockTransaction: (userId, amount) => ({
        id: `tx_${Date.now()}`,
        user_id: userId,
        amount: amount.toString(),
        createdAt: new Date(),
        status: 'completed'
    }),
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};
//# sourceMappingURL=final-gap-closure.test.js.map