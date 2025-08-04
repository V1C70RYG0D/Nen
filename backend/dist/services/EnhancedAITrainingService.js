"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedAITrainingService = exports.getEnhancedAITrainingService = void 0;
const logger_1 = require("../middleware/logger");
const EnhancedDatabaseService_1 = require("./EnhancedDatabaseService");
const AIServiceIntegration_1 = require("./AIServiceIntegration");
class EnhancedAITrainingService {
    aiService;
    dbService;
    trainingSchedules = new Map();
    activeSessions = new Map();
    trainingInterval = null;
    constructor() {
        this.aiService = new AIServiceIntegration_1.AIServiceIntegration();
        this.dbService = (0, EnhancedDatabaseService_1.getEnhancedDatabaseService)();
        this.setupTrainingScheduler();
    }
    setupTrainingScheduler() {
        this.trainingInterval = setInterval(async () => {
            await this.checkScheduledTraining();
        }, 60 * 60 * 1000);
        logger_1.logger.info('AI Training scheduler initialized', {
            checkInterval: '1 hour',
            scheduledAgents: this.trainingSchedules.size
        });
    }
    async scheduleWeeklyTraining(agentId, gamesPerSession = 100) {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const schedule = {
            agentId,
            frequency: 'weekly',
            lastTraining: now,
            nextTraining: nextWeek,
            gamesPerSession,
            enabled: true
        };
        this.trainingSchedules.set(agentId, schedule);
        logger_1.logger.info('Weekly training scheduled', {
            agentId,
            nextTraining: nextWeek.toISOString(),
            gamesPerSession
        });
        await this.dbService.cachedQuery(`training_schedule:${agentId}`, async () => {
            return this.dbService.getPrismaClient().aiAgent.update({
                where: { id: agentId },
                data: {
                    last_training: now,
                    training_enabled: true
                }
            });
        }, 0);
    }
    async checkScheduledTraining() {
        const now = new Date();
        for (const [agentId, schedule] of this.trainingSchedules) {
            if (schedule.enabled && now >= schedule.nextTraining) {
                try {
                    await this.startSelfPlayTraining(agentId, schedule.gamesPerSession);
                    const nextTraining = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    schedule.lastTraining = now;
                    schedule.nextTraining = nextTraining;
                    logger_1.logger.info('Scheduled training initiated', {
                        agentId,
                        gamesPlayed: schedule.gamesPerSession,
                        nextTraining: nextTraining.toISOString()
                    });
                }
                catch (error) {
                    logger_1.logger.error('Scheduled training failed', {
                        agentId,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
        }
    }
    async startSelfPlayTraining(agentId, numberOfGames = 50) {
        const sessionId = `session_${Date.now()}_${agentId}`;
        const session = {
            id: sessionId,
            agentId,
            opponentId: agentId,
            gamesPlayed: 0,
            winRate: 0,
            averageGameLength: 0,
            eloChange: 0,
            started: new Date(),
            status: 'running'
        };
        this.activeSessions.set(sessionId, session);
        try {
            logger_1.logger.info('Starting self-play training session', {
                sessionId,
                agentId,
                numberOfGames,
                timestamp: session.started.toISOString()
            });
            const batchSize = Math.min(numberOfGames, 10);
            const results = [];
            for (let i = 0; i < numberOfGames; i += batchSize) {
                const currentBatch = Math.min(batchSize, numberOfGames - i);
                const batchPromises = [];
                for (let j = 0; j < currentBatch; j++) {
                    batchPromises.push(this.playSelfPlayGame(agentId, agentId));
                }
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                session.gamesPlayed = results.length;
                session.winRate = results.filter(r => r.winner === agentId).length / results.length;
                session.averageGameLength = results.reduce((acc, r) => acc + r.moves, 0) / results.length;
                logger_1.logger.info('Self-play training progress', {
                    sessionId,
                    gamesCompleted: session.gamesPlayed,
                    winRate: session.winRate,
                    averageGameLength: session.averageGameLength
                });
            }
            const performanceScore = session.winRate * 0.7 + (1.0 / session.averageGameLength) * 0.3;
            session.eloChange = Math.round(performanceScore * 50 - 25);
            await this.updateAgentELO(agentId, session.eloChange);
            session.completed = new Date();
            session.status = 'completed';
            logger_1.logger.info('Self-play training completed', {
                sessionId,
                agentId,
                totalGames: session.gamesPlayed,
                finalWinRate: session.winRate,
                eloChange: session.eloChange,
                duration: session.completed.getTime() - session.started.getTime()
            });
            return session;
        }
        catch (error) {
            session.status = 'failed';
            logger_1.logger.error('Self-play training failed', {
                sessionId,
                agentId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async playSelfPlayGame(player1Id, player2Id) {
        const sessionId = `self_play_${agentId}_${Date.now()}`;
        try {
            const agent = await this.dbService.cachedQuery(`agent:${agentId}`, async () => {
                return this.dbService.getPrismaClient().aiAgent.findUnique({
                    where: { id: agentId }
                });
            }, 300);
            if (!agent) {
                throw new Error(`Agent ${agentId} not found`);
            }
            const session = {
                id: sessionId,
                agentId,
                opponentId: agentId,
                gamesPlayed: 0,
                winRate: 0,
                averageGameLength: 0,
                eloChange: 0,
                started: new Date(),
                status: 'running'
            };
            this.activeSessions.set(sessionId, session);
            logger_1.logger.info('Self-play training session started', {
                sessionId,
                agentId,
                targetGames: numberOfGames,
                currentElo: agent.elo_rating
            });
            this.runSelfPlaySession(session, numberOfGames).catch(error => {
                logger_1.logger.error('Self-play session failed', {
                    sessionId,
                    error: error instanceof Error ? error.message : String(error)
                });
                session.status = 'failed';
            });
            return session;
        }
        catch (error) {
            logger_1.logger.error('Failed to start self-play training', {
                agentId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async runSelfPlaySession(session, targetGames) {
        let wins = 0;
        let totalGameLength = 0;
        const initialElo = await this.getAgentElo(session.agentId);
        for (let gameIndex = 0; gameIndex < targetGames; gameIndex++) {
            try {
                const gameResult = await this.simulateSelfPlayGame(session.agentId);
                session.gamesPlayed++;
                if (gameResult.winner === session.agentId) {
                    wins++;
                }
                totalGameLength += gameResult.gameLength;
                session.winRate = wins / session.gamesPlayed;
                session.averageGameLength = totalGameLength / session.gamesPlayed;
                if (session.gamesPlayed % 10 === 0) {
                    logger_1.logger.info('Self-play training progress', {
                        sessionId: session.id,
                        gamesCompleted: session.gamesPlayed,
                        targetGames,
                        winRate: session.winRate,
                        progress: `${Math.round((session.gamesPlayed / targetGames) * 100)}%`
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Self-play game failed', {
                    sessionId: session.id,
                    gameIndex,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        const finalElo = await this.calculateEloAfterTraining(session.agentId, session.winRate);
        session.eloChange = finalElo - initialElo;
        session.completed = new Date();
        session.status = 'completed';
        await this.updateAgentAfterTraining(session.agentId, finalElo, session);
        logger_1.logger.info('Self-play training session completed', {
            sessionId: session.id,
            agentId: session.agentId,
            gamesPlayed: session.gamesPlayed,
            winRate: session.winRate,
            eloChange: session.eloChange,
            duration: `${Date.now() - session.started.getTime()}ms`
        });
        this.activeSessions.delete(session.id);
    }
    async simulateSelfPlayGame(agentId) {
        const agent1 = await this.getAgent(agentId);
        const agent2 = await this.selectOpponent(agent1);
        const gameResult = await this.executeAIGame(agent1, agent2);
        return {
            winner: gameResult.winnerId,
            gameLength: gameResult.moveCount
        };
    }
    async getAgent(agentId) {
        return {
            id: agentId,
            elo: 1500 + Math.floor(Math.random() * 1000),
            personality: 'tactical'
        };
    }
    async selectOpponent(agent) {
        return {
            id: 'opponent_' + Date.now(),
            elo: agent.elo + (Math.random() - 0.5) * 200,
            personality: 'balanced'
        };
    }
    async executeAIGame(agent1, agent2) {
        const moveCount = Math.floor(Math.random() * 60) + 40;
        const eloAdvantage = agent1.elo - agent2.elo;
        const winProbability = 0.5 + (eloAdvantage / 1000);
        const winnerId = Math.random() < winProbability ? agent1.id : agent2.id;
        return { winnerId, moveCount };
    }
    async getAgentElo(agentId) {
        const agent = await this.dbService.cachedQuery(`agent_elo:${agentId}`, async () => {
            return this.dbService.getPrismaClient().aiAgent.findUnique({
                where: { id: agentId },
                select: { elo_rating: true }
            });
        }, 60);
        return agent?.elo_rating || 1200;
    }
    async calculateEloAfterTraining(agentId, winRate) {
        const currentElo = await this.getAgentElo(agentId);
        let adjustment = 0;
        if (winRate > 0.6) {
            adjustment = 20;
        }
        else if (winRate > 0.5) {
            adjustment = 10;
        }
        else if (winRate < 0.4) {
            adjustment = -10;
        }
        return Math.max(800, Math.min(2400, currentElo + adjustment));
    }
    async updateAgentAfterTraining(agentId, newElo, session) {
        await this.dbService.getPrismaClient().aiAgent.update({
            where: { id: agentId },
            data: {
                elo_rating: newElo,
                games_played: {
                    increment: session.gamesPlayed
                },
                last_training: session.completed || new Date(),
                win_rate: session.winRate
            }
        });
        await this.dbService.getRedisClient().del(`agent:${agentId}`, `agent_elo:${agentId}`);
    }
    async getTrainingMetrics(agentId) {
        const schedule = this.trainingSchedules.get(agentId);
        const agent = await this.getAgentElo(agentId);
        return {
            totalSessions: Array.from(this.activeSessions.values())
                .filter(s => s.agentId === agentId && s.status === 'completed').length,
            totalGames: 0,
            averageWinRate: 0.5,
            eloImprovement: agent - 1200,
            lastUpdate: schedule?.lastTraining || new Date(),
            nextScheduledUpdate: schedule?.nextTraining || new Date()
        };
    }
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    async stopTraining(agentId) {
        const schedule = this.trainingSchedules.get(agentId);
        if (schedule) {
            schedule.enabled = false;
            logger_1.logger.info('Training stopped for agent', { agentId });
        }
        for (const [sessionId, session] of this.activeSessions) {
            if (session.agentId === agentId && session.status === 'running') {
                session.status = 'failed';
                this.activeSessions.delete(sessionId);
                logger_1.logger.info('Active training session stopped', { sessionId, agentId });
            }
        }
    }
    async updateAgentELO(agentId, eloChange) {
        try {
            await this.dbService.getPrismaClient().aiAgent.update({
                where: { id: agentId },
                data: {
                    elo: {
                        increment: eloChange
                    },
                    updated_at: new Date()
                }
            });
            logger_1.logger.info('Agent ELO updated', {
                agentId,
                eloChange,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to update agent ELO', {
                agentId,
                eloChange,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async shutdown() {
        if (this.trainingInterval) {
            clearInterval(this.trainingInterval);
        }
        for (const session of this.activeSessions.values()) {
            if (session.status === 'running') {
                session.status = 'failed';
            }
        }
        logger_1.logger.info('AI Training service shut down');
    }
}
exports.EnhancedAITrainingService = EnhancedAITrainingService;
let trainingService;
const getEnhancedAITrainingService = () => {
    if (!trainingService) {
        trainingService = new EnhancedAITrainingService();
    }
    return trainingService;
};
exports.getEnhancedAITrainingService = getEnhancedAITrainingService;
//# sourceMappingURL=EnhancedAITrainingService.js.map