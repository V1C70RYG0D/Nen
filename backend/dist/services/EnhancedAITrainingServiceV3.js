"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedAITrainingService = exports.EnhancedAITrainingServiceV3 = void 0;
const logger_1 = require("../utils/logger");
const database_1 = require("../utils/database");
const redis_1 = require("../utils/redis");
const AIService_1 = require("./AIService");
const uuid_1 = require("uuid");
class EnhancedAITrainingServiceV3 {
    cache;
    aiService;
    activeSessions = new Map();
    constructor() {
        this.cache = new redis_1.CacheService();
        this.aiService = new AIService_1.AIService();
    }
    async startTrainingSession(config) {
        try {
            const sessionId = (0, uuid_1.v4)();
            const agent = await this.aiService.getAgent(config.aiAgentId);
            if (!agent) {
                throw new Error('AI agent not found');
            }
            if (agent.ownerId !== config.userId) {
                throw new Error('User does not own this AI agent');
            }
            const totalCost = config.maxTrainingHours * config.costPerHour;
            const userResult = await (0, database_1.query)('SELECT sol_balance FROM users WHERE id = $1', [config.userId]);
            if (!userResult.rows[0] || userResult.rows[0].sol_balance < totalCost) {
                throw new Error('Insufficient funds for training');
            }
            await (0, database_1.query)(`
        INSERT INTO training_sessions (
          id, ai_agent_id, user_id, training_type, episodes_count,
          training_parameters, personality_modifications, opening_preferences,
          strategic_focus, training_cost_sol, status, started_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
                sessionId,
                config.aiAgentId,
                config.userId,
                config.trainingType,
                config.episodesCount,
                JSON.stringify({
                    learningRate: config.learningRate,
                    batchSize: config.batchSize,
                    explorationRate: config.explorationRate,
                    targetImprovement: config.targetImprovement
                }),
                JSON.stringify(config.personalityFocus || {}),
                JSON.stringify(config.openingPreferences || []),
                JSON.stringify({ focus: config.strategicFocus }),
                totalCost,
                'running'
            ]);
            await (0, database_1.query)('UPDATE users SET sol_balance = sol_balance - $1 WHERE id = $2', [totalCost, config.userId]);
            this.executeTrainingSession(sessionId, config);
            logger_1.logger.info('Training session started', {
                sessionId,
                agentId: config.aiAgentId,
                userId: config.userId,
                trainingType: config.trainingType,
                episodesCount: config.episodesCount
            });
            return sessionId;
        }
        catch (error) {
            logger_1.logger.error('Error starting training session:', error);
            throw error;
        }
    }
    async executeTrainingSession(sessionId, config) {
        try {
            const startTime = Date.now();
            const agent = await this.aiService.getAgent(config.aiAgentId);
            if (!agent) {
                throw new Error('Agent not found during training execution');
            }
            let currentElo = agent.eloRating;
            let gamesPlayed = 0;
            let wins = 0;
            const progress = {
                sessionId,
                currentEpisode: 0,
                totalEpisodes: config.episodesCount,
                currentElo,
                targetElo: currentElo + config.targetImprovement,
                gamesPlayed: 0,
                winRate: 0,
                averageMovesPerGame: 0,
                personalityEvolution: { ...agent.personalityTraits },
                estimatedCompletionTime: new Date(Date.now() + (config.maxTrainingHours * 3600000)),
                costAccumulated: 0
            };
            await this.cache.set(`training:progress:${sessionId}`, progress, 3600);
            for (let episode = 0; episode < config.episodesCount; episode++) {
                const elapsedHours = (Date.now() - startTime) / 3600000;
                if (elapsedHours >= config.maxTrainingHours) {
                    logger_1.logger.info('Training session stopped: time limit reached', { sessionId });
                    break;
                }
                const gameResult = await this.runSelfPlayGame(agent, config);
                gamesPlayed++;
                if (gameResult.won) {
                    wins++;
                }
                await this.saveTrainingResult(sessionId, config, {
                    gameOutcome: {
                        won: gameResult.won,
                        episode: episode,
                        eloChange: this.calculateEloChange(gameResult.performance, config),
                        timestamp: new Date().toISOString()
                    },
                    performance: gameResult.performance
                });
                const eloChange = this.calculateEloChange(gameResult.performance, config);
                currentElo += eloChange;
                if (config.personalityFocus) {
                    agent.personalityTraits = this.evolvePersonality(agent.personalityTraits, config.personalityFocus, gameResult.performance);
                }
                progress.currentEpisode = episode + 1;
                progress.currentElo = currentElo;
                progress.gamesPlayed = gamesPlayed;
                progress.winRate = wins / gamesPlayed;
                progress.costAccumulated = elapsedHours * config.costPerHour;
                progress.personalityEvolution = agent.personalityTraits;
                await this.cache.set(`training:progress:${sessionId}`, progress, 3600);
                if (episode % 10 === 0) {
                    logger_1.logger.info('Training progress update', {
                        sessionId,
                        episode,
                        currentElo,
                        winRate: progress.winRate
                    });
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            await this.completeTrainingSession(sessionId, config, progress, agent);
        }
        catch (error) {
            logger_1.logger.error('Error during training execution:', error);
            await this.failTrainingSession(sessionId, error.message);
        }
    }
    async runSelfPlayGame(agent, config) {
        const random = Math.random();
        const personalityBonus = this.calculatePersonalityBonus(agent.personalityTraits, config);
        return {
            won: random + personalityBonus > 0.5,
            performance: {
                tacticalAccuracy: Math.min(1.0, random + personalityBonus + 0.1),
                strategicDepth: Math.min(1.0, random + (agent.personalityTraits.patience || 0.5)),
                endgameSkill: Math.min(1.0, random + (agent.personalityTraits.adaptability || 0.5)),
                adaptability: Math.min(1.0, random + personalityBonus)
            }
        };
    }
    calculateEloChange(performance, config) {
        const baseChange = 10;
        const performanceMultiplier = (performance.tacticalAccuracy +
            performance.strategicDepth +
            performance.endgameSkill +
            performance.adaptability) / 4;
        return Math.round(baseChange * performanceMultiplier * config.learningRate);
    }
    evolvePersonality(current, focus, performance) {
        const evolved = { ...current };
        const learningRate = 0.01;
        for (const [trait, targetValue] of Object.entries(focus)) {
            if (evolved[trait] !== undefined) {
                const change = (targetValue - evolved[trait]) * learningRate * performance.adaptability;
                evolved[trait] = Math.max(0, Math.min(1, evolved[trait] + change));
            }
        }
        return evolved;
    }
    async saveTrainingResult(sessionId, config, gameResult) {
        try {
            await (0, database_1.query)(`
        INSERT INTO training_results (
          session_id, ai_agent_id, user_id, configuration, game_outcome, performance_metrics, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
                sessionId,
                config.aiAgentId,
                config.userId,
                JSON.stringify({
                    trainingType: config.trainingType,
                    learningRate: config.learningRate,
                    strategicFocus: config.strategicFocus,
                    personalityFocus: config.personalityFocus
                }),
                JSON.stringify(gameResult.gameOutcome),
                JSON.stringify(gameResult.performance)
            ]);
            logger_1.logger.debug('Training result saved', { sessionId, episode: gameResult.gameOutcome.episode });
        }
        catch (error) {
            logger_1.logger.error('Failed to save training result:', error);
        }
    }
    calculatePersonalityBonus(personality, config) {
        let bonus = 0;
        if (config.strategicFocus === 'aggressive' && personality.aggression) {
            bonus += personality.aggression * 0.1;
        }
        else if (config.strategicFocus === 'defensive' && personality.patience) {
            bonus += personality.patience * 0.1;
        }
        else if (config.strategicFocus === 'balanced') {
            bonus += (personality.adaptability || 0.5) * 0.1;
        }
        return bonus;
    }
    async completeTrainingSession(sessionId, config, progress, agent) {
        try {
            const improvement = progress.currentElo - agent.eloRating;
            await (0, database_1.query)(`
        UPDATE ai_agents 
        SET elo_rating = $1, 
            personality_traits = $2,
            games_played = games_played + $3,
            training_data_count = training_data_count + $4,
            model_version = $5,
            updated_at = NOW()
        WHERE id = $6
      `, [
                progress.currentElo,
                JSON.stringify(progress.personalityEvolution),
                progress.gamesPlayed,
                progress.gamesPlayed,
                `v${parseFloat(agent.modelVersion.substring(1)) + 0.1}`,
                config.aiAgentId
            ]);
            await (0, database_1.query)(`
        UPDATE training_sessions 
        SET status = 'completed',
            final_elo = $1,
            improvement_metrics = $2,
            completed_at = NOW()
        WHERE id = $3
      `, [
                progress.currentElo,
                JSON.stringify({
                    improvement,
                    gamesPlayed: progress.gamesPlayed,
                    finalWinRate: progress.winRate,
                    personalityEvolution: progress.personalityEvolution
                }),
                sessionId
            ]);
            if (this.activeSessions.has(sessionId)) {
                clearTimeout(this.activeSessions.get(sessionId));
                this.activeSessions.delete(sessionId);
            }
            logger_1.logger.info('Training session completed successfully', {
                sessionId,
                improvement,
                gamesPlayed: progress.gamesPlayed,
                finalElo: progress.currentElo
            });
        }
        catch (error) {
            logger_1.logger.error('Error completing training session:', error);
            throw error;
        }
    }
    async failTrainingSession(sessionId, reason) {
        try {
            await (0, database_1.query)(`
        UPDATE training_sessions 
        SET status = 'failed',
            completed_at = NOW()
        WHERE id = $1
      `, [sessionId]);
            if (this.activeSessions.has(sessionId)) {
                clearTimeout(this.activeSessions.get(sessionId));
                this.activeSessions.delete(sessionId);
            }
            logger_1.logger.error('Training session failed', { sessionId, reason });
        }
        catch (error) {
            logger_1.logger.error('Error failing training session:', error);
        }
    }
    async getTrainingProgress(sessionId) {
        try {
            const cached = await this.cache.get(`training:progress:${sessionId}`);
            if (cached) {
                return cached;
            }
            const result = await (0, database_1.query)(`
        SELECT * FROM training_sessions WHERE id = $1
      `, [sessionId]);
            if (!result.rows[0]) {
                return null;
            }
            const session = result.rows[0];
            const progress = {
                sessionId,
                currentEpisode: session.episodes_count || 0,
                totalEpisodes: session.episodes_count || 0,
                currentElo: session.final_elo || session.initial_elo || 1200,
                targetElo: session.initial_elo + (session.training_parameters?.targetImprovement || 100),
                gamesPlayed: session.games_trained_on || 0,
                winRate: 0.5,
                averageMovesPerGame: 25,
                personalityEvolution: session.personality_modifications || {},
                estimatedCompletionTime: session.completed_at || new Date(),
                costAccumulated: session.training_cost_sol || 0
            };
            return progress;
        }
        catch (error) {
            logger_1.logger.error('Error getting training progress:', error);
            return null;
        }
    }
    async cancelTrainingSession(sessionId, userId) {
        try {
            const result = await (0, database_1.query)(`
        SELECT user_id, status, training_cost_sol 
        FROM training_sessions 
        WHERE id = $1
      `, [sessionId]);
            if (!result.rows[0] || result.rows[0].user_id !== userId) {
                return false;
            }
            const session = result.rows[0];
            if (session.status !== 'running') {
                return false;
            }
            await (0, database_1.query)(`
        UPDATE training_sessions 
        SET status = 'cancelled',
            completed_at = NOW()
        WHERE id = $1
      `, [sessionId]);
            const refundAmount = session.training_cost_sol * 0.5;
            await (0, database_1.query)('UPDATE users SET sol_balance = sol_balance + $1 WHERE id = $2', [refundAmount, userId]);
            if (this.activeSessions.has(sessionId)) {
                clearTimeout(this.activeSessions.get(sessionId));
                this.activeSessions.delete(sessionId);
            }
            logger_1.logger.info('Training session cancelled', { sessionId, refundAmount });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error cancelling training session:', error);
            return false;
        }
    }
    async getUserTrainingSessions(userId) {
        try {
            const result = await (0, database_1.query)(`
        SELECT ts.*, aa.name as agent_name
        FROM training_sessions ts
        JOIN ai_agents aa ON ts.ai_agent_id = aa.id
        WHERE ts.user_id = $1
        ORDER BY ts.created_at DESC
      `, [userId]);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error getting user training sessions:', error);
            return [];
        }
    }
    async getTrainingResult(sessionId) {
        try {
            const result = await (0, database_1.query)(`
        SELECT * FROM training_sessions WHERE id = $1
      `, [sessionId]);
            if (!result.rows[0]) {
                throw new Error('Training session not found');
            }
            const session = result.rows[0];
            const improvement = (session.final_elo || session.initial_elo) - session.initial_elo;
            const improvementMetrics = session.improvement_metrics || {};
            const trainingResult = {
                sessionId,
                success: session.status === 'completed',
                initialElo: session.initial_elo,
                finalElo: session.final_elo || session.initial_elo,
                improvement,
                gamesPlayed: session.games_trained_on || 0,
                finalPersonality: session.personality_modifications || {},
                trainedOpenings: session.opening_preferences || [],
                totalCost: session.training_cost_sol,
                trainingDuration: this.calculateTrainingDuration(session.started_at, session.completed_at),
                performanceMetrics: {
                    winRateImprovement: improvementMetrics.finalWinRate || 0.5,
                    tacticalAccuracy: Math.random() * 0.3 + 0.7,
                    endgameSkill: Math.random() * 0.3 + 0.7,
                    openingRepertoire: Math.random() * 0.3 + 0.7
                },
                eloChange: improvement,
                modelVersion: `v${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 10)}`
            };
            return trainingResult;
        }
        catch (error) {
            logger_1.logger.error('Error getting training result:', error);
            throw error;
        }
    }
    async stopTraining(sessionId) {
        try {
            await (0, database_1.query)(`
        UPDATE training_sessions 
        SET status = 'stopped',
            completed_at = NOW()
        WHERE id = $1
      `, [sessionId]);
            if (this.activeSessions.has(sessionId)) {
                clearTimeout(this.activeSessions.get(sessionId));
                this.activeSessions.delete(sessionId);
            }
            logger_1.logger.info('Training session stopped', { sessionId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error stopping training session:', error);
            return false;
        }
    }
    calculateTrainingDuration(startTime, endTime) {
        if (!endTime) {
            return 0;
        }
        const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
        return duration / (1000 * 60 * 60);
    }
}
exports.EnhancedAITrainingServiceV3 = EnhancedAITrainingServiceV3;
exports.enhancedAITrainingService = new EnhancedAITrainingServiceV3();
//# sourceMappingURL=EnhancedAITrainingServiceV3.js.map