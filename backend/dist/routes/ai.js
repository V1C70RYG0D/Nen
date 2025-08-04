"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const SimpleAIService_1 = require("../services/SimpleAIService");
const logger_1 = require("../middleware/logger");
const router = (0, express_1.Router)();
const getErrorMessage = (error) => {
    if (error instanceof Error)
        return error.message;
    return String(error);
};
router.get('/health', async (req, res, next) => {
    try {
        const isHealthy = await SimpleAIService_1.simpleAIService.healthCheck();
        if (isHealthy) {
            res.json({
                status: 'healthy',
                ai_service: 'connected',
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(503).json({
                status: 'unhealthy',
                ai_service: 'disconnected',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        logger_1.logger.error('AI health check failed', { error: getErrorMessage(error) });
        next(error);
    }
});
router.get('/agents', async (req, res, next) => {
    try {
        let agents;
        try {
            const agentsData = await SimpleAIService_1.simpleAIService.listAgents();
            agents = agentsData.agents;
            logger_1.logger.info('AI agents retrieved from service', { count: agentsData.total_count });
        }
        catch (error) {
            logger_1.logger.warn('Failed to get agents from AI service, using fallback', { error: getErrorMessage(error) });
            agents = [
                {
                    id: 'netero',
                    name: 'netero',
                    difficulty: 'legendary',
                    personality: 'balanced',
                    skillLevel: 95,
                    winRate: 0.92,
                    elo: 2100,
                    description: 'Isaac Netero - Master strategist with unmatched experience',
                    specialty: 'Endgame mastery',
                    gamesPlayed: 10000
                },
                {
                    id: 'meruem',
                    name: 'meruem',
                    difficulty: 'godlike',
                    personality: 'aggressive',
                    skillLevel: 98,
                    winRate: 0.97,
                    elo: 2300,
                    description: 'Meruem - The Chimera Ant King with perfect game understanding',
                    specialty: 'Pattern recognition',
                    gamesPlayed: 1000
                },
                {
                    id: 'komugi',
                    name: 'komugi',
                    difficulty: 'legendary',
                    personality: 'defensive',
                    skillLevel: 99,
                    winRate: 0.95,
                    elo: 2200,
                    description: 'Komugi - Gungi prodigy with instinctive gameplay',
                    specialty: 'Intuitive play',
                    gamesPlayed: 50000
                },
                {
                    id: 'ging',
                    name: 'ging',
                    difficulty: 'expert',
                    personality: 'creative',
                    skillLevel: 88,
                    winRate: 0.85,
                    elo: 1950,
                    description: 'Ging Freecss - Innovative strategist with unique approaches',
                    specialty: 'Creative combinations',
                    gamesPlayed: 5000
                },
                {
                    id: 'hisoka',
                    name: 'hisoka',
                    difficulty: 'expert',
                    personality: 'unpredictable',
                    skillLevel: 85,
                    winRate: 0.82,
                    elo: 1900,
                    description: 'Hisoka - Unpredictable fighter with psychological warfare',
                    specialty: 'Psychological pressure',
                    gamesPlayed: 3000
                }
            ];
        }
        res.json({
            success: true,
            data: agents
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/move', async (req, res, next) => {
    try {
        const { board_state, agent_config, time_limit } = req.body;
        if (!board_state || !agent_config) {
            throw (0, errorHandler_1.createError)('Missing required fields: board_state and agent_config', 400);
        }
        logger_1.logger.info('Processing AI move request', {
            agent_id: agent_config.agent_id,
            move_number: board_state.move_number
        });
        const move = await SimpleAIService_1.simpleAIService.generateMove(agent_config.agent_id, {
            pieces: board_state.pieces || [],
            currentTurn: board_state.current_turn || 1,
            moveNumber: board_state.move_number || 1,
            gameStatus: 'active'
        });
        res.json({
            success: true,
            move,
            agent_id: agent_config.agent_id,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate AI move', { error: getErrorMessage(error) });
        next(error);
    }
});
router.post('/customize', async (req, res, next) => {
    try {
        const { agentId, personality, openings, playingStyle, aggression, defensiveness } = req.body;
        if (!agentId) {
            throw (0, errorHandler_1.createError)('Agent ID required', 400);
        }
        const customizedAgent = SimpleAIService_1.simpleAIService.createSampleAgentConfig(`custom_${agentId}_${Date.now()}`, Math.round((aggression + defensiveness) * 5) || 5, personality || 'balanced');
        customizedAgent.custom_settings = {
            ...customizedAgent.custom_settings,
            openings: openings || [],
            playingStyle: playingStyle || 'adaptive',
            aggression: aggression || 0.5,
            defensiveness: defensiveness || 0.5
        };
        res.json({
            success: true,
            agent: {
                id: customizedAgent.agent_id,
                baseAgent: agentId,
                customizations: customizedAgent.custom_settings,
                status: 'ready',
                config: customizedAgent
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/train', async (req, res, next) => {
    try {
        const { agent_id, training_data, training_config } = req.body;
        if (!agent_id || !training_data) {
            throw (0, errorHandler_1.createError)('Missing required fields: agent_id and training_data', 400);
        }
        logger_1.logger.info('Starting AI training', {
            agent_id,
            training_data_count: training_data.length
        });
        const trainingStatus = await SimpleAIService_1.simpleAIService.startTraining({
            agent_id,
            training_data,
            training_config: training_config || {}
        });
        res.json({
            success: true,
            training_status: trainingStatus,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start AI training', { error: getErrorMessage(error) });
        next(error);
    }
});
router.get('/training/:sessionId', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const trainingStatus = await SimpleAIService_1.simpleAIService.getTrainingStatus(sessionId);
        res.json({
            success: true,
            training: trainingStatus,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        const { sessionId } = req.params;
        logger_1.logger.error('Failed to get training status', {
            session_id: sessionId,
            error: error.message
        });
        const simulatedTraining = {
            session_id: sessionId,
            status: 'completed',
            progress: 100,
            started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            completed_at: new Date().toISOString(),
            agent_id: sessionId.split('_')[0] || 'unknown'
        };
        res.json({
            success: true,
            training: simulatedTraining,
            fallback: true,
            timestamp: new Date().toISOString()
        });
    }
});
router.delete('/agents/:agentId', async (req, res, next) => {
    try {
        const { agentId } = req.params;
        await SimpleAIService_1.simpleAIService.removeAgent(agentId);
        logger_1.logger.info('AI agent removed successfully', { agent_id: agentId });
        res.json({
            success: true,
            message: 'AI agent removed successfully',
            agent_id: agentId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to remove AI agent', {
            agent_id: req.params.agentId,
            error: getErrorMessage(error)
        });
        next(error);
    }
});
router.post('/demo/ai-vs-ai', async (req, res, next) => {
    try {
        logger_1.logger.info('Starting AI vs AI demo');
        const boardState = SimpleAIService_1.simpleAIService.createSampleBoardState(1, 0);
        const agent1Config = SimpleAIService_1.simpleAIService.createSampleAgentConfig('random_ai', 3, 'aggressive');
        const agent2Config = SimpleAIService_1.simpleAIService.createSampleAgentConfig('minimax_ai', 7, 'defensive');
        const move1 = await SimpleAIService_1.simpleAIService.generateMove(agent1Config.agent_id, boardState);
        const updatedBoardState = {
            ...boardState,
            currentTurn: 2,
            moveNumber: 1
        };
        const move2 = await SimpleAIService_1.simpleAIService.generateMove(agent2Config.agent_id, updatedBoardState);
        res.json({
            success: true,
            demo: 'AI vs AI simulation',
            game_state: {
                initial_board: boardState,
                agent1: agent1Config,
                agent2: agent2Config,
                moves: [
                    { player: 1, move: move1, agent: agent1Config.agent_id },
                    { player: 2, move: move2, agent: agent2Config.agent_id }
                ]
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('AI vs AI demo failed', { error: getErrorMessage(error) });
        next(error);
    }
});
router.get('/agents/error-test', async (req, res, next) => {
    try {
        throw new Error('Test error for error handling');
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error during testing',
            error: getErrorMessage(error)
        });
    }
});
router.get('/agents/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const agents = [
            {
                id: 'netero',
                name: 'netero',
                difficulty: 'legendary',
                personality: 'balanced',
                skillLevel: 95,
                winRate: 0.92,
                elo: 2100,
                description: 'Isaac Netero - Master strategist with unmatched experience',
                specialty: 'Endgame mastery',
                gamesPlayed: 10000
            },
            {
                id: 'meruem',
                name: 'meruem',
                difficulty: 'godlike',
                personality: 'aggressive',
                skillLevel: 98,
                winRate: 0.97,
                elo: 2300,
                description: 'Meruem - The Chimera Ant King with perfect game understanding',
                specialty: 'Pattern recognition',
                gamesPlayed: 1000
            },
            {
                id: 'komugi',
                name: 'komugi',
                difficulty: 'legendary',
                personality: 'defensive',
                skillLevel: 99,
                winRate: 0.95,
                elo: 2200,
                description: 'Komugi - Gungi prodigy with instinctive gameplay',
                specialty: 'Intuitive play',
                gamesPlayed: 50000
            },
            {
                id: 'ging',
                name: 'ging',
                difficulty: 'expert',
                personality: 'creative',
                skillLevel: 88,
                winRate: 0.85,
                elo: 1950,
                description: 'Ging Freecss - Innovative strategist with unique approaches',
                specialty: 'Creative combinations',
                gamesPlayed: 5000
            },
            {
                id: 'hisoka',
                name: 'hisoka',
                difficulty: 'expert',
                personality: 'unpredictable',
                skillLevel: 85,
                winRate: 0.82,
                elo: 1900,
                description: 'Hisoka - Unpredictable fighter with psychological warfare',
                specialty: 'Psychological pressure',
                gamesPlayed: 3000
            }
        ];
        const agent = agents.find(a => a.id === id);
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: `Agent with id '${id}' not found`
            });
        }
        return res.json({
            success: true,
            data: agent
        });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/agents/:id/challenge', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { opponent, opponentId, gameSettings, gameType } = req.body;
        const finalOpponentId = opponent || opponentId;
        if (!finalOpponentId) {
            return res.status(400).json({
                success: false,
                message: 'opponent or opponentId is required'
            });
        }
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return res.json({
            success: true,
            data: {
                matchId,
                agent1: id,
                agent2: finalOpponentId,
                challengerId: id,
                opponentId: finalOpponentId,
                gameSettings: gameSettings || { timeControl: 600, variant: 'standard' },
                gameType: gameType || 'standard',
                status: 'pending',
                createdAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/leaderboard', async (req, res, next) => {
    try {
        const leaderboard = [
            {
                id: 'meruem',
                name: 'meruem',
                elo: 2300,
                winRate: 0.97,
                gamesPlayed: 1000,
                rank: 1
            },
            {
                id: 'komugi',
                name: 'komugi',
                elo: 2200,
                winRate: 0.95,
                gamesPlayed: 50000,
                rank: 2
            },
            {
                id: 'netero',
                name: 'netero',
                elo: 2100,
                winRate: 0.92,
                gamesPlayed: 10000,
                rank: 3
            },
            {
                id: 'ging',
                name: 'ging',
                elo: 1950,
                winRate: 0.85,
                gamesPlayed: 5000,
                rank: 4
            },
            {
                id: 'hisoka',
                name: 'hisoka',
                elo: 1900,
                winRate: 0.82,
                gamesPlayed: 3000,
                rank: 5
            }
        ];
        res.json({
            success: true,
            data: {
                leaderboard,
                totalAgents: leaderboard.length,
                lastUpdated: new Date().toISOString()
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/agents/create', async (req, res, next) => {
    try {
        const { name, personality, skillLevel, description } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Agent name is required'
            });
        }
        if (!personality) {
            return res.status(400).json({
                success: false,
                message: 'Agent personality is required'
            });
        }
        const newAgent = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            personality,
            skillLevel: skillLevel || 50,
            elo: 1200,
            winRate: 0,
            gamesPlayed: 0,
            description: description || `Custom AI agent: ${name}`,
            isCustom: true,
            createdAt: new Date().toISOString()
        };
        return res.status(201).json({
            success: true,
            data: newAgent,
            message: 'Custom AI agent created successfully'
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=ai.js.map