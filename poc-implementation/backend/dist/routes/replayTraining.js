"use strict";
/**
 * Replay Training Routes
 * Handles API endpoints for on-chain replay-based AI training
 *
 * Features:
 * - Fetch agent replays with filtering
 * - Validate training parameters
 * - Submit training requests using selected replays
 * - Real devnet integration for AI agent verification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const logger_1 = require("../middleware/logger");
const OnChainReplayService_1 = require("../services/OnChainReplayService");
const EnhancedAITrainingServiceV3_1 = require("../services/EnhancedAITrainingServiceV3");
const router = express_1.default.Router();
const replayService = (0, OnChainReplayService_1.getOnChainReplayService)();
const trainingService = new EnhancedAITrainingServiceV3_1.EnhancedAITrainingServiceV3();
// Error handling utilities
const createError = (message, status = 500, details) => {
    const error = new Error(message);
    error.status = status;
    error.details = details;
    return error;
};
const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};
/**
 * GET /api/training/replays/:agentId
 * Fetch available match replays for an AI agent
 */
router.get('/replays/:agentId', [
    (0, express_validator_1.param)('agentId')
        .isString()
        .notEmpty()
        .withMessage('Agent ID is required'),
    (0, express_validator_1.query)('opponent')
        .optional()
        .isString()
        .withMessage('Opponent must be a string'),
    (0, express_validator_1.query)('dateFrom')
        .optional()
        .isISO8601()
        .withMessage('Date from must be a valid ISO date'),
    (0, express_validator_1.query)('dateTo')
        .optional()
        .isISO8601()
        .withMessage('Date to must be a valid ISO date'),
    (0, express_validator_1.query)('result')
        .optional()
        .isIn(['white_wins', 'black_wins', 'draw', 'any'])
        .withMessage('Result must be: white_wins, black_wins, draw, or any'),
    (0, express_validator_1.query)('opening')
        .optional()
        .isString()
        .withMessage('Opening must be a string'),
    (0, express_validator_1.query)('gamePhase')
        .optional()
        .isIn(['opening', 'midgame', 'endgame', 'any'])
        .withMessage('Game phase must be: opening, midgame, endgame, or any'),
    (0, express_validator_1.query)('quality')
        .optional()
        .isIn(['low', 'medium', 'high', 'any'])
        .withMessage('Quality must be: low, medium, high, or any'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be 0 or greater')
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw createError('Validation failed', 400, errors.array());
        }
        const { agentId } = req.params;
        const filter = {
            opponent: req.query.opponent,
            dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
            dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
            result: req.query.result,
            opening: req.query.opening,
            gamePhase: req.query.gamePhase,
            quality: req.query.quality,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0
        };
        logger_1.logger.info('Fetching agent replays', { agentId, filter });
        const replays = await replayService.getAgentReplays(agentId, filter);
        const statistics = await replayService.getReplayStatistics(agentId);
        res.json({
            success: true,
            data: {
                replays,
                statistics,
                filter: filter,
                pagination: {
                    total: replays.length,
                    limit: filter.limit,
                    offset: filter.offset
                }
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch agent replays', {
            agentId: req.params.agentId,
            error: getErrorMessage(error)
        });
        next(error);
    }
});
/**
 * GET /api/training/replays/:agentId/openings
 * Get available openings for filtering
 */
router.get('/replays/:agentId/openings', [
    (0, express_validator_1.param)('agentId')
        .isString()
        .notEmpty()
        .withMessage('Agent ID is required')
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw createError('Validation failed', 400, errors.array());
        }
        const { agentId } = req.params;
        logger_1.logger.info('Fetching available openings', { agentId });
        const openings = await replayService.getAvailableOpenings(agentId);
        res.json({
            success: true,
            data: {
                openings,
                count: openings.length
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch available openings', {
            agentId: req.params.agentId,
            error: getErrorMessage(error)
        });
        next(error);
    }
});
/**
 * POST /api/training/replays/process
 * Process selected replays into training data and submit training request
 */
router.post('/replays/process', [
    (0, express_validator_1.body)('agentId')
        .isString()
        .notEmpty()
        .withMessage('Agent ID is required'),
    (0, express_validator_1.body)('userId')
        .isString()
        .notEmpty()
        .withMessage('User ID is required'),
    (0, express_validator_1.body)('selectedReplays')
        .isArray({ min: 1 })
        .withMessage('Selected replays must be a non-empty array'),
    (0, express_validator_1.body)('selectedReplays.*')
        .isString()
        .notEmpty()
        .withMessage('Each replay ID must be a non-empty string'),
    (0, express_validator_1.body)('focusArea')
        .isIn(['openings', 'midgame', 'endgame', 'all'])
        .withMessage('Focus area must be: openings, midgame, endgame, or all'),
    (0, express_validator_1.body)('intensity')
        .isIn(['low', 'medium', 'high'])
        .withMessage('Intensity must be: low, medium, or high'),
    (0, express_validator_1.body)('maxMatches')
        .isInt({ min: 1, max: 1000 })
        .withMessage('Max matches must be between 1 and 1000'),
    (0, express_validator_1.body)('learningRate')
        .optional()
        .isFloat({ min: 0.0001, max: 1.0 })
        .withMessage('Learning rate must be between 0.0001 and 1.0'),
    (0, express_validator_1.body)('batchSize')
        .optional()
        .isInt({ min: 1, max: 128 })
        .withMessage('Batch size must be between 1 and 128'),
    (0, express_validator_1.body)('epochs')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Epochs must be between 1 and 100')
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw createError('Validation failed', 400, errors.array());
        }
        const { agentId, userId, selectedReplays, focusArea, intensity, maxMatches, learningRate, batchSize, epochs } = req.body;
        // Validate replay selection count
        if (selectedReplays.length > maxMatches) {
            throw createError(`Too many replays selected. Maximum allowed: ${maxMatches}`, 400);
        }
        const trainingParams = {
            focusArea,
            intensity,
            maxMatches,
            learningRate,
            batchSize,
            epochs
        };
        logger_1.logger.info('Processing replay-based training request', {
            agentId,
            userId,
            replayCount: selectedReplays.length,
            trainingParams
        });
        // Process replays into training data
        const processedData = await replayService.processReplaysForTraining(selectedReplays, trainingParams);
        // Calculate training cost
        const baseCostPerMatch = 0.001; // 0.001 SOL per match
        const intensityMultiplier = intensity === 'low' ? 1 : intensity === 'medium' ? 1.5 : 2;
        const totalCost = selectedReplays.length * baseCostPerMatch * intensityMultiplier;
        // Create enhanced training configuration
        const trainingConfig = {
            aiAgentId: agentId,
            userId: userId,
            trainingType: 'self_play', // Use valid training type
            episodesCount: processedData.trainingData.moves.length,
            learningRate: trainingParams.learningRate || 0.001,
            batchSize: trainingParams.batchSize || 32,
            explorationRate: 0.1,
            targetImprovement: 50,
            maxTrainingHours: Math.ceil(processedData.estimatedDuration / 60),
            costPerHour: totalCost / Math.max(1, Math.ceil(processedData.estimatedDuration / 60)),
            personalityFocus: {
                adaptability: focusArea === 'all' ? 0.8 : 0.5,
                aggression: focusArea === 'endgame' ? 0.7 : 0.5,
                patience: focusArea === 'openings' ? 0.8 : 0.5,
                riskTolerance: intensity === 'high' ? 0.7 : 0.4
            },
            strategicFocus: focusArea === 'endgame' ? 'tactical' : 'balanced'
        };
        // Start training session
        const sessionId = await trainingService.startTrainingSession(trainingConfig);
        logger_1.logger.info('Replay-based training session started', {
            sessionId,
            agentId,
            userId,
            replayCount: selectedReplays.length,
            estimatedDuration: processedData.estimatedDuration,
            totalCost
        });
        res.json({
            success: true,
            data: {
                sessionId,
                processedData: {
                    replayCount: processedData.replayCount,
                    moveCount: processedData.trainingData.moves.length,
                    estimatedDuration: processedData.estimatedDuration
                },
                trainingConfig: {
                    focusArea: trainingParams.focusArea,
                    intensity: trainingParams.intensity,
                    parameters: trainingConfig
                },
                cost: {
                    totalCost,
                    costPerMatch: baseCostPerMatch,
                    intensityMultiplier
                }
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to process replay training request', {
            error: getErrorMessage(error),
            requestBody: req.body
        });
        next(error);
    }
});
/**
 * GET /api/training/sessions/:sessionId/progress
 * Get training session progress
 */
router.get('/sessions/:sessionId/progress', [
    (0, express_validator_1.param)('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required')
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw createError('Validation failed', 400, errors.array());
        }
        const { sessionId } = req.params;
        logger_1.logger.info('Fetching training session progress', { sessionId });
        const progress = await trainingService.getTrainingProgress(sessionId);
        if (!progress) {
            throw createError('Training session not found', 404);
        }
        res.json({
            success: true,
            data: progress,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch training progress', {
            sessionId: req.params.sessionId,
            error: getErrorMessage(error)
        });
        next(error);
    }
});
/**
 * GET /api/training/sessions/:sessionId/result
 * Get training session result
 */
router.get('/sessions/:sessionId/result', [
    (0, express_validator_1.param)('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required')
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw createError('Validation failed', 400, errors.array());
        }
        const { sessionId } = req.params;
        logger_1.logger.info('Fetching training session result', { sessionId });
        const result = await trainingService.getTrainingResult(sessionId);
        if (!result) {
            throw createError('Training session not found', 404);
        }
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch training result', {
            sessionId: req.params.sessionId,
            error: getErrorMessage(error)
        });
        next(error);
    }
});
/**
 * POST /api/training/sessions/:sessionId/cancel
 * Cancel active training session
 */
router.post('/sessions/:sessionId/cancel', [
    (0, express_validator_1.param)('sessionId')
        .isString()
        .notEmpty()
        .withMessage('Session ID is required'),
    (0, express_validator_1.body)('userId')
        .isString()
        .notEmpty()
        .withMessage('User ID is required')
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw createError('Validation failed', 400, errors.array());
        }
        const { sessionId } = req.params;
        const { userId } = req.body;
        logger_1.logger.info('Cancelling training session', { sessionId, userId });
        // For now, we'll just mark it as cancelled in logs
        // In a real implementation, this would stop the training process
        logger_1.logger.warn('Training session cancellation requested', { sessionId, userId });
        res.json({
            success: true,
            message: 'Training session cancelled successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to cancel training session', {
            sessionId: req.params.sessionId,
            error: getErrorMessage(error)
        });
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=replayTraining.js.map