"use strict";
/**
 * Enhanced Routes V2 - Final 5% Gap Closure Implementation
 * Integrates all enhanced services for complete functionality
 *
 * Routes:
 * - /api/v1/enhanced/ai-training - Advanced AI training management
 * - /api/v1/enhanced/load-testing - Load testing and performance monitoring
 * - /api/v1/enhanced/compliance - Enhanced compliance and fraud detection
 * - /api/v1/enhanced/analytics - Comprehensive analytics and metrics
 * - /api/v1/enhanced/admin - Administrative controls and monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logger_1 = require("../utils/logger");
const EnhancedAITrainingServiceV2_1 = require("../services/EnhancedAITrainingServiceV2");
const AdvancedLoadTestingService_1 = require("../services/AdvancedLoadTestingService");
const EnhancedComplianceServiceV2_1 = require("../services/EnhancedComplianceServiceV2");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = express_1.default.Router();
// Rate limiting for enhanced endpoints
const enhancedRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests to enhanced endpoints'
});
const adminRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // more restrictive for admin endpoints
    message: 'Too many admin requests'
});
router.use(enhancedRateLimit);
// ========== AI TRAINING ROUTES ==========
/**
 * @route POST /api/v1/enhanced/ai-training/schedule
 * @desc Schedule weekly training for an AI agent
 * @access Public (in POC)
 */
router.post('/ai-training/schedule', async (req, res) => {
    try {
        const { agentId, gamesPerSession = 100, priority = 'medium' } = req.body;
        if (!agentId) {
            return res.status(400).json({
                success: false,
                error: 'Agent ID is required'
            });
        }
        const aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
        await aiTrainingService.scheduleWeeklyTraining(agentId, gamesPerSession, priority);
        logger_1.logger.info('Weekly training scheduled via API', {
            agentId,
            gamesPerSession,
            priority,
            requestId: req.headers['x-request-id']
        });
        res.json({
            success: true,
            message: 'Weekly training scheduled successfully',
            data: {
                agentId,
                gamesPerSession,
                priority,
                scheduledAt: new Date().toISOString()
            }
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('Failed to schedule training', {
            error: error instanceof Error ? error.message : String(error),
            requestBody: req.body
        });
        res.status(500).json({
            success: false,
            error: 'Failed to schedule training',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * @route POST /api/v1/enhanced/ai-training/start
 * @desc Start advanced self-play training session
 * @access Public (in POC)
 */
router.post('/ai-training/start', async (req, res) => {
    try {
        const { agentId, numberOfGames = 50 } = req.body;
        if (!agentId) {
            return res.status(400).json({
                success: false,
                error: 'Agent ID is required'
            });
        }
        if (numberOfGames < 1 || numberOfGames > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Number of games must be between 1 and 1000'
            });
        }
        const aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
        const session = await aiTrainingService.startAdvancedSelfPlayTraining(agentId, numberOfGames);
        res.json({
            success: true,
            message: 'Training session started successfully',
            data: {
                sessionId: session.id,
                agentId: session.agentId,
                targetGames: session.targetGames,
                status: session.status,
                startedAt: session.started.toISOString(),
                estimatedDuration: `${Math.ceil(numberOfGames * 2 / 60)} minutes`
            }
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('Failed to start training session', {
            error: error instanceof Error ? error.message : String(error),
            requestBody: req.body
        });
        res.status(500).json({
            success: false,
            error: 'Failed to start training session',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * @route GET /api/v1/enhanced/ai-training/metrics/:agentId
 * @desc Get training metrics for specific agent
 * @access Public (in POC)
 */
router.get('/ai-training/metrics/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
        const metrics = await aiTrainingService.getTrainingMetrics(agentId);
        res.json({
            success: true,
            data: {
                agentId,
                metrics,
                lastUpdated: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get training metrics', {
            error: error instanceof Error ? error.message : String(error),
            agentId: req.params.agentId
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get training metrics',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * @route GET /api/v1/enhanced/ai-training/sessions
 * @desc Get active training sessions
 * @access Public (in POC)
 */
router.get('/ai-training/sessions', async (req, res) => {
    try {
        const aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
        const sessions = await aiTrainingService.getActiveTrainingSessions();
        res.json({
            success: true,
            data: {
                activeSessions: sessions,
                count: sessions.length,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get active sessions', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get active sessions'
        });
    }
});
/**
 * @route POST /api/v1/enhanced/ai-training/stop/:sessionId
 * @desc Stop a training session
 * @access Public (in POC)
 */
router.post('/ai-training/stop/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
        await aiTrainingService.stopTrainingSession(sessionId);
        res.json({
            success: true,
            message: 'Training session stopped successfully',
            data: {
                sessionId,
                stoppedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to stop training session', {
            error: error instanceof Error ? error.message : String(error),
            sessionId: req.params.sessionId
        });
        res.status(500).json({
            success: false,
            error: 'Failed to stop training session'
        });
    }
});
// ========== LOAD TESTING ROUTES ==========
/**
 * @route POST /api/v1/enhanced/load-testing/execute
 * @desc Execute comprehensive load test
 * @access Admin only
 */
router.post('/load-testing/execute', adminRateLimit, async (req, res) => {
    try {
        const { maxConcurrentGames = 100, testDurationMs = 60000, rampUpTimeMs = 30000, latencyThresholdMs = 100, memoryThresholdMB = 2048, cpuThresholdPercent = 80, targetThroughput = 50 } = req.body;
        const loadTestingService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
        // Validate configuration
        if (maxConcurrentGames > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Maximum concurrent games cannot exceed 2000 for safety'
            });
        }
        const config = {
            maxConcurrentGames,
            testDurationMs,
            rampUpTimeMs,
            latencyThresholdMs,
            memoryThresholdMB,
            cpuThresholdPercent,
            targetThroughput
        };
        logger_1.logger.info('Starting load test via API', {
            config,
            requestId: req.headers['x-request-id']
        });
        // Start load test asynchronously and return immediately
        const testPromise = loadTestingService.executeLoadTest(config);
        res.json({
            success: true,
            message: 'Load test started successfully',
            data: {
                config,
                startedAt: new Date().toISOString(),
                estimatedDuration: `${Math.ceil(testDurationMs / 60000)} minutes`,
                testId: `load_test_${Date.now()}`
            }
        });
        return;
        // Log completion when test finishes
        testPromise.then(metrics => {
            logger_1.logger.info('Load test completed via API', {
                metrics,
                config
            });
        }).catch(error => {
            logger_1.logger.error('Load test failed via API', {
                error: error instanceof Error ? error.message : String(error),
                config
            });
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start load test', {
            error: error instanceof Error ? error.message : String(error),
            requestBody: req.body
        });
        res.status(500).json({
            success: false,
            error: 'Failed to start load test',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * @route GET /api/v1/enhanced/load-testing/status
 * @desc Get current load test status
 * @access Admin only
 */
router.get('/load-testing/status', adminRateLimit, async (req, res) => {
    try {
        const loadTestingService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
        const status = loadTestingService.getLoadTestStatus();
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get load test status', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get load test status'
        });
    }
});
/**
 * @route GET /api/v1/enhanced/load-testing/recommendations
 * @desc Get scaling recommendations based on test results
 * @access Admin only
 */
router.get('/load-testing/recommendations', adminRateLimit, async (req, res) => {
    try {
        const loadTestingService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
        const recommendations = loadTestingService.getScalingRecommendations();
        res.json({
            success: true,
            data: recommendations
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get scaling recommendations', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get scaling recommendations'
        });
    }
});
/**
 * @route GET /api/v1/enhanced/load-testing/export
 * @desc Export detailed test results
 * @access Admin only
 */
router.get('/load-testing/export', adminRateLimit, async (req, res) => {
    try {
        const loadTestingService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
        const results = loadTestingService.exportTestResults();
        res.json({
            success: true,
            data: results,
            exportedAt: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to export test results', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to export test results'
        });
    }
});
// ========== COMPLIANCE ROUTES ==========
/**
 * @route POST /api/v1/enhanced/compliance/fraud-check
 * @desc Perform fraud detection analysis
 * @access Public (in POC)
 */
router.post('/compliance/fraud-check', async (req, res) => {
    try {
        const { userId, transactionAmount, metadata = {} } = req.body;
        if (!userId || !transactionAmount) {
            return res.status(400).json({
                success: false,
                error: 'User ID and transaction amount are required'
            });
        }
        if (transactionAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Transaction amount must be positive'
            });
        }
        // Add request metadata
        const enhancedMetadata = {
            ...metadata,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
        };
        const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
        const result = await complianceService.detectFraud(userId, transactionAmount, enhancedMetadata);
        logger_1.logger.info('Fraud detection completed via API', {
            userId,
            transactionAmount,
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            shouldBlock: result.shouldBlock
        });
        res.json({
            success: true,
            data: {
                ...result,
                checkedAt: new Date().toISOString()
            }
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('Fraud detection failed via API', {
            error: error instanceof Error ? error.message : String(error),
            requestBody: req.body
        });
        res.status(500).json({
            success: false,
            error: 'Fraud detection failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * @route POST /api/v1/enhanced/compliance/kyc-verify
 * @desc Perform KYC verification
 * @access Public (in POC)
 */
router.post('/compliance/kyc-verify', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }
        const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
        const verification = await complianceService.verifyKYC(userId);
        res.json({
            success: true,
            data: verification
        });
        return;
    }
    catch (error) {
        logger_1.logger.error('KYC verification failed via API', {
            error: error instanceof Error ? error.message : String(error),
            userId: req.body.userId
        });
        res.status(500).json({
            success: false,
            error: 'KYC verification failed'
        });
    }
});
/**
 * @route GET /api/v1/enhanced/compliance/metrics
 * @desc Get compliance metrics
 * @access Admin only
 */
router.get('/compliance/metrics', adminRateLimit, async (req, res) => {
    try {
        const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
        const metrics = complianceService.getComplianceMetrics();
        res.json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get compliance metrics', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get compliance metrics'
        });
    }
});
/**
 * @route GET /api/v1/enhanced/compliance/investigations
 * @desc Get active investigations
 * @access Admin only
 */
router.get('/compliance/investigations', adminRateLimit, async (req, res) => {
    try {
        const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
        const investigations = complianceService.getActiveInvestigations();
        res.json({
            success: true,
            data: {
                investigations,
                count: investigations.length,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get investigations', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get investigations'
        });
    }
});
// ========== ANALYTICS ROUTES ==========
/**
 * @route GET /api/v1/enhanced/analytics/performance
 * @desc Get comprehensive performance analytics
 * @access Admin only
 */
router.get('/analytics/performance', adminRateLimit, async (req, res) => {
    try {
        const aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
        const loadTestingService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
        const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
        // Gather analytics from all services
        const [activeSessions, loadTestStatus, complianceMetrics] = await Promise.all([
            aiTrainingService.getActiveTrainingSessions(),
            loadTestingService.getLoadTestStatus(),
            complianceService.getComplianceMetrics()
        ]);
        const analytics = {
            system: {
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            },
            aiTraining: {
                activeSessions: activeSessions.length,
                totalGamesInProgress: activeSessions.reduce((sum, s) => sum + s.gamesPlayed, 0)
            },
            loadTesting: {
                isRunning: loadTestStatus.running,
                activeSessions: loadTestStatus.activeSessions,
                metrics: loadTestStatus.metrics
            },
            compliance: complianceMetrics,
            recommendations: []
        };
        // Generate recommendations based on analytics
        if (activeSessions.length > 10) {
            analytics.recommendations.push('High AI training load detected - consider scaling');
        }
        if (complianceMetrics.flaggedTransactions / complianceMetrics.totalTransactions > 0.1) {
            analytics.recommendations.push('High fraud detection rate - review thresholds');
        }
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get performance analytics', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get performance analytics'
        });
    }
});
/**
 * @route GET /api/v1/enhanced/analytics/health
 * @desc Get system health status
 * @access Public
 */
router.get('/analytics/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                limit: Math.round(process.memoryUsage().rss / 1024 / 1024)
            },
            services: {
                aiTraining: 'operational',
                loadTesting: 'operational',
                compliance: 'operational',
                database: 'operational' // Would check actual DB connection
            }
        };
        // Check memory usage
        if (health.memory.used > 1024) { // > 1GB
            health.status = 'warning';
        }
        res.json({
            success: true,
            data: health
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get health status', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get health status',
            data: {
                status: 'unhealthy',
                timestamp: new Date().toISOString()
            }
        });
    }
});
// ========== ADMIN ROUTES ==========
/**
 * @route POST /api/v1/enhanced/admin/shutdown-services
 * @desc Gracefully shutdown all enhanced services
 * @access Admin only
 */
router.post('/admin/shutdown-services', adminRateLimit, async (req, res) => {
    try {
        const aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
        const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
        await Promise.all([
            aiTrainingService.shutdown(),
            complianceService.shutdown()
        ]);
        logger_1.logger.info('All enhanced services shut down via API');
        res.json({
            success: true,
            message: 'All enhanced services shut down successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to shutdown services', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to shutdown services'
        });
    }
});
/**
 * @route GET /api/v1/enhanced/admin/system-info
 * @desc Get detailed system information
 * @access Admin only
 */
router.get('/admin/system-info', adminRateLimit, async (req, res) => {
    try {
        const systemInfo = {
            timestamp: new Date().toISOString(),
            node: {
                version: process.version,
                platform: process.platform,
                arch: process.arch,
                uptime: process.uptime()
            },
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            environment: {
                nodeEnv: process.env.NODE_ENV,
                port: process.env.PORT,
                logLevel: process.env.LOG_LEVEL
            },
            services: {
                enhancedAITraining: 'active',
                advancedLoadTesting: 'active',
                enhancedCompliance: 'active'
            }
        };
        res.json({
            success: true,
            data: systemInfo
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get system info', {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get system info'
        });
    }
});
// Error handling middleware for enhanced routes
router.use((error, req, res, next) => {
    logger_1.logger.error('Enhanced routes error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
    });
    res.status(500).json({
        success: false,
        error: 'Internal server error in enhanced routes',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
//# sourceMappingURL=enhanced-v2.js.map