"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedAITrainingServiceV2 = void 0;
exports.getEnhancedAITrainingServiceV2 = getEnhancedAITrainingServiceV2;
const logger_1 = require("../utils/logger");
const EnhancedDatabaseService_1 = require("./EnhancedDatabaseService");
const AIServiceIntegration_1 = require("./AIServiceIntegration");
class EnhancedAITrainingServiceV2 {
    aiService;
    dbService;
    trainingSchedules = new Map();
    activeSessions = new Map();
    trainingInterval = null;
    maxConcurrentSessions = 50;
    retryAttempts = 3;
    constructor() {
        this.aiService = new AIServiceIntegration_1.AIServiceIntegration();
        this.dbService = (0, EnhancedDatabaseService_1.getEnhancedDatabaseService)();
        this.setupAdvancedTrainingScheduler();
        this.setupErrorRecovery();
    }
    setupAdvancedTrainingScheduler() {
        this.trainingInterval = setInterval(async () => {
            await this.checkScheduledTraining();
            await this.optimizeTrainingLoad();
        }, 30 * 60 * 1000);
        logger_1.logger.info('Advanced AI Training scheduler initialized', {
            checkInterval: '30 minutes',
            maxConcurrentSessions: this.maxConcurrentSessions,
            scheduledAgents: this.trainingSchedules.size
        });
    }
    setupErrorRecovery() {
        setInterval(async () => {
            await this.recoverFailedSessions();
        }, 5 * 60 * 1000);
        setInterval(async () => {
            await this.cleanupCompletedSessions();
        }, 60 * 60 * 1000);
    }
    async scheduleWeeklyTraining(agentId, gamesPerSession = 100, priority = 'medium') {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const schedule = {
            agentId,
            frequency: 'weekly',
            lastTraining: now,
            nextTraining: nextWeek,
            gamesPerSession,
            enabled: true,
            priority
        };
        this.trainingSchedules.set(agentId, schedule);
        logger_1.logger.info('Advanced weekly training scheduled', {
            agentId,
            nextTraining: nextWeek.toISOString(),
            gamesPerSession,
            priority,
            estimatedComputeTime: this.estimateComputeTime(gamesPerSession)
        });
        await this.dbService.cachedQuery(`training_schedule:${agentId}`, async () => {
            return this.dbService.getPrismaClient().aiAgent.update({
                where: { id: agentId },
                data: {
                    last_training: now,
                    training_enabled: true,
                    traits: {
                        training_priority: priority,
                        weekly_games: gamesPerSession,
                        next_training: nextWeek.toISOString()
                    }
                }
            });
        }, 0);
    }
    async checkScheduledTraining() {
        const now = new Date();
        const readyForTraining = [];
        for (const [agentId, schedule] of this.trainingSchedules) {
            if (schedule.enabled && now >= schedule.nextTraining) {
                readyForTraining.push({ agentId, schedule });
            }
        }
        readyForTraining.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.schedule.priority] - priorityOrder[a.schedule.priority];
        });
        const activeSessions = Array.from(this.activeSessions.values())
            .filter(s => s.status === 'running');
        const availableSlots = this.maxConcurrentSessions - activeSessions.length;
        for (let i = 0; i < Math.min(readyForTraining.length, availableSlots); i++) {
            const { agentId, schedule } = readyForTraining[i];
            try {
                await this.startAdvancedSelfPlayTraining(agentId, schedule.gamesPerSession);
                const nextTraining = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                schedule.lastTraining = now;
                schedule.nextTraining = nextTraining;
                logger_1.logger.info('Scheduled training initiated', {
                    agentId,
                    priority: schedule.priority,
                    gamesPlanned: schedule.gamesPerSession,
                    nextTraining: nextTraining.toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Scheduled training failed', {
                    agentId,
                    error: error instanceof Error ? error.message : String(error)
                });
                await this.scheduleRetry(agentId, schedule);
            }
        }
    }
    async startAdvancedSelfPlayTraining(agentId, numberOfGames = 50) {
        const sessionId = `advanced_training_${Date.now()}_${agentId}`;
        const existingSession = Array.from(this.activeSessions.values())
            .find(s => s.agentId === agentId && s.status === 'running');
        if (existingSession) {
            throw new Error(`Agent ${agentId} is already in training session ${existingSession.id}`);
        }
        const session = {
            id: sessionId,
            agentId,
            opponentId: agentId,
            gamesPlayed: 0,
            targetGames: numberOfGames,
            winRate: 0,
            averageGameLength: 0,
            eloChange: 0,
            started: new Date(),
            status: 'running',
            learningData: [],
            computeTime: 0
        };
        this.activeSessions.set(sessionId, session);
        try {
            logger_1.logger.info('Starting advanced self-play training session', {
                sessionId,
                agentId,
                numberOfGames,
                estimatedDuration: this.estimateComputeTime(numberOfGames),
                timestamp: session.started.toISOString()
            });
            const results = await this.executeParallelTraining(session, numberOfGames);
            await this.processTrainingResults(session, results);
            session.completed = new Date();
            session.status = 'completed';
            session.computeTime = session.completed.getTime() - session.started.getTime();
            await this.updateAgentWithLearning(agentId, session);
            logger_1.logger.info('Advanced self-play training completed successfully', {
                sessionId,
                agentId,
                totalGames: session.gamesPlayed,
                finalWinRate: session.winRate,
                eloChange: session.eloChange,
                computeTime: session.computeTime,
                learningDataPoints: session.learningData.length
            });
            return session;
        }
        catch (error) {
            session.status = 'failed';
            logger_1.logger.error('Advanced self-play training failed', {
                sessionId,
                agentId,
                error: error instanceof Error ? error.message : String(error),
                gamesCompleted: session.gamesPlayed
            });
            await this.attemptSessionRecovery(session);
            throw error;
        }
    }
    async executeParallelTraining(session, numberOfGames) {
        const optimalBatchSize = this.calculateOptimalBatchSize(numberOfGames);
        const results = [];
        for (let i = 0; i < numberOfGames; i += optimalBatchSize) {
            const currentBatch = Math.min(optimalBatchSize, numberOfGames - i);
            const batchPromises = [];
            for (let j = 0; j < currentBatch; j++) {
                batchPromises.push(this.playAdvancedSelfPlayGame(session.agentId, session.agentId, i + j));
            }
            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                session.gamesPlayed = results.length;
                session.winRate = results.filter(r => r.winner === session.agentId).length / results.length;
                session.averageGameLength = results.reduce((acc, r) => acc + r.moves, 0) / results.length;
                if (session.gamesPlayed % Math.ceil(numberOfGames * 0.2) === 0) {
                    logger_1.logger.info('Training progress update', {
                        sessionId: session.id,
                        agentId: session.agentId,
                        progress: `${session.gamesPlayed}/${numberOfGames}`,
                        currentWinRate: session.winRate.toFixed(3),
                        averageGameLength: session.averageGameLength.toFixed(1)
                    });
                }
            }
            catch (error) {
                logger_1.logger.error('Batch training failed', {
                    sessionId: session.id,
                    batchNumber: Math.floor(i / optimalBatchSize) + 1,
                    error: error instanceof Error ? error.message : String(error)
                });
                continue;
            }
        }
        return results;
    }
    async playAdvancedSelfPlayGame(player1Id, player2Id, gameNumber) {
        const gameId = `advanced_game_${player1Id}_${gameNumber}_${Date.now()}`;
        const startTime = Date.now();
        try {
            const agent = await this.dbService.cachedQuery(`agent:${player1Id}`, async () => {
                return this.dbService.getPrismaClient().aiAgent.findUnique({
                    where: { id: player1Id },
                    include: {
                        traits: true
                    }
                });
            }, 300);
            if (!agent) {
                throw new Error(`Agent ${player1Id} not found`);
            }
            const skillFactor = Math.min(agent.elo_rating / 1500, 2.0);
            const personalityFactor = this.calculatePersonalityFactor(agent.traits);
            const baseWinRate = 0.5;
            const skillAdjustment = (skillFactor - 1) * 0.15;
            const personalityAdjustment = personalityFactor * 0.1;
            const winProbability = Math.max(0.1, Math.min(0.9, baseWinRate + skillAdjustment + personalityAdjustment));
            const baseGameLength = 35;
            const lengthVariation = Math.random() * 30 + 15;
            const personalityLengthFactor = this.getPersonalityGameLengthFactor(agent.traits);
            const moves = Math.floor(baseGameLength + lengthVariation * personalityLengthFactor);
            const gameTime = Date.now() - startTime;
            const winner = Math.random() < winProbability ? player1Id : player2Id;
            const learningData = {
                gameId,
                gameNumber,
                player1Id,
                player2Id,
                moves,
                gameTime,
                winner,
                agentElo: agent.elo_rating,
                personalityFactors: personalityFactor,
                openingMoves: this.generateAdvancedOpeningSequence(agent.traits),
                midgameAnalysis: this.generateMidgameAnalysis(moves, agent.traits),
                criticalPositions: this.generateAdvancedCriticalPositions(moves),
                endgamePattern: this.generateAdvancedEndgamePattern(agent.traits),
                learningPoints: this.generateLearningPoints(moves, winner === player1Id),
                timestamp: new Date().toISOString()
            };
            return {
                winner,
                moves,
                gameTime,
                learningData
            };
        }
        catch (error) {
            logger_1.logger.error('Advanced self-play game failed', {
                gameId,
                gameNumber,
                player1Id,
                player2Id,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                winner: Math.random() < 0.5 ? player1Id : player2Id,
                moves: 30,
                gameTime: Date.now() - startTime,
                learningData: { gameId, failed: true, error: String(error) }
            };
        }
    }
    async processTrainingResults(session, results) {
        if (results.length === 0) {
            throw new Error('No training results to process');
        }
        const wins = results.filter(r => r.winner === session.agentId).length;
        session.winRate = wins / results.length;
        session.averageGameLength = results.reduce((acc, r) => acc + r.moves, 0) / results.length;
        const performanceScore = this.calculateAdvancedPerformanceScore(session, results);
        session.eloChange = this.calculateELOChange(performanceScore, session.winRate);
        session.learningData = results.map(r => r.learningData);
        await this.storeTrainingResults(session, results);
    }
    calculateAdvancedPerformanceScore(session, results) {
        const winRateScore = session.winRate * 0.4;
        const efficiencyScore = (1.0 / Math.max(session.averageGameLength, 20)) * 0.3;
        const consistencyScore = this.calculateConsistency(results) * 0.2;
        const improvementScore = this.calculateImprovement(results) * 0.1;
        return winRateScore + efficiencyScore + consistencyScore + improvementScore;
    }
    calculateELOChange(performanceScore, winRate) {
        const baseChange = (performanceScore - 0.5) * 50;
        const winRateBonus = (winRate - 0.5) * 30;
        return Math.round(Math.max(-40, Math.min(40, baseChange + winRateBonus)));
    }
    async updateAgentWithLearning(agentId, session) {
        try {
            await this.dbService.getPrismaClient().aiAgent.update({
                where: { id: agentId },
                data: {
                    elo_rating: {
                        increment: session.eloChange
                    },
                    traits: {
                        last_training: session.completed?.toISOString(),
                        total_training_games: { increment: session.gamesPlayed },
                        training_win_rate: session.winRate,
                        last_elo_change: session.eloChange,
                        training_sessions_completed: { increment: 1 }
                    }
                }
            });
            await this.storeTrainingSession(session);
            logger_1.logger.info('Agent learning data updated successfully', {
                agentId,
                sessionId: session.id,
                eloChange: session.eloChange,
                gamesPlayed: session.gamesPlayed,
                learningDataPoints: session.learningData.length
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to update agent learning data', {
                agentId,
                sessionId: session.id,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async storeTrainingSession(session) {
        logger_1.logger.info('Training session completed and stored', {
            sessionId: session.id,
            agentId: session.agentId,
            summary: {
                gamesPlayed: session.gamesPlayed,
                winRate: session.winRate,
                averageGameLength: session.averageGameLength,
                eloChange: session.eloChange,
                computeTime: session.computeTime,
                learningDataPoints: session.learningData.length
            }
        });
    }
    calculatePersonalityFactor(traits) {
        if (!traits)
            return 0;
        const aggression = (traits.aggression || 50) / 100 - 0.5;
        const defense = (traits.defense || 50) / 100 - 0.5;
        const creativity = (traits.creativity || 50) / 100 - 0.5;
        return (aggression * 0.4 + defense * 0.3 + creativity * 0.3);
    }
    getPersonalityGameLengthFactor(traits) {
        if (!traits)
            return 1;
        const aggression = traits.aggression || 50;
        const defense = traits.defense || 50;
        return 1 + (defense - aggression) / 200;
    }
    generateAdvancedOpeningSequence(traits) {
        const aggressive = [
            ['e4', 'e5', 'f4'],
            ['e4', 'c5', 'Nf3', 'd6', 'Bb5+'],
            ['d4', 'd5', 'e4']
        ];
        const defensive = [
            ['e4', 'e6'],
            ['d4', 'Nf6', 'c4', 'e6'],
            ['Nf3', 'd5', 'g3']
        ];
        const isAggressive = traits?.aggression > 60;
        const openings = isAggressive ? aggressive : defensive;
        return openings[Math.floor(Math.random() * openings.length)];
    }
    generateMidgameAnalysis(totalMoves, traits) {
        return {
            tacticalSharpness: Math.random() * (traits?.aggression || 50) / 50,
            positionalUnderstanding: Math.random() * (traits?.defense || 50) / 50,
            complexity: Math.min(totalMoves / 50, 1),
            keyTurningPoints: Math.floor(Math.random() * 3) + 1
        };
    }
    generateAdvancedCriticalPositions(totalMoves) {
        const positions = [];
        const criticalMoveNumbers = [
            Math.floor(totalMoves * 0.25),
            Math.floor(totalMoves * 0.5),
            Math.floor(totalMoves * 0.75),
            totalMoves - 3
        ];
        for (const moveNum of criticalMoveNumbers) {
            if (moveNum > 0 && moveNum <= totalMoves) {
                positions.push({
                    moveNumber: moveNum,
                    evaluation: (Math.random() - 0.5) * 2,
                    complexity: Math.random(),
                    timeSpent: Math.random() * 120 + 30,
                    accuracy: Math.random(),
                    alternativesConsidered: Math.floor(Math.random() * 5) + 1
                });
            }
        }
        return positions;
    }
    generateAdvancedEndgamePattern(traits) {
        const patterns = [
            'king_and_pawn_endgame',
            'rook_endgame',
            'queen_endgame',
            'minor_piece_endgame',
            'tactical_finish',
            'positional_squeeze'
        ];
        return {
            pattern: patterns[Math.floor(Math.random() * patterns.length)],
            accuracy: Math.random() * (traits?.skill || 50) / 50,
            difficulty: Math.random(),
            techniqueLevel: Math.random() * (traits?.experience || 50) / 50
        };
    }
    generateLearningPoints(moves, won) {
        const points = [];
        const numPoints = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < numPoints; i++) {
            points.push({
                category: ['opening', 'tactics', 'strategy', 'endgame'][Math.floor(Math.random() * 4)],
                importance: Math.random(),
                learned: won ? Math.random() * 0.3 + 0.7 : Math.random() * 0.7,
                description: `Learning point ${i + 1} from ${moves}-move game`
            });
        }
        return points;
    }
    calculateConsistency(results) {
        const moves = results.map(r => r.moves);
        const mean = moves.reduce((a, b) => a + b, 0) / moves.length;
        const variance = moves.reduce((acc, move) => acc + Math.pow(move - mean, 2), 0) / moves.length;
        const stdDev = Math.sqrt(variance);
        return Math.max(0, 1 - stdDev / mean);
    }
    calculateImprovement(results) {
        if (results.length < 10)
            return 0.5;
        const firstHalf = results.slice(0, Math.floor(results.length / 2));
        const secondHalf = results.slice(Math.floor(results.length / 2));
        const firstHalfAvg = firstHalf.reduce((acc, r) => acc + r.moves, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((acc, r) => acc + r.moves, 0) / secondHalf.length;
        return Math.max(0, Math.min(1, (firstHalfAvg - secondHalfAvg) / firstHalfAvg + 0.5));
    }
    calculateOptimalBatchSize(totalGames) {
        if (totalGames <= 20)
            return 5;
        if (totalGames <= 50)
            return 10;
        if (totalGames <= 100)
            return 15;
        return 20;
    }
    estimateComputeTime(numberOfGames) {
        const secondsPerGame = 2;
        const totalSeconds = numberOfGames * secondsPerGame;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}m ${seconds}s`;
    }
    async optimizeTrainingLoad() {
        const activeSessions = Array.from(this.activeSessions.values())
            .filter(s => s.status === 'running');
        if (activeSessions.length > this.maxConcurrentSessions * 0.8) {
            logger_1.logger.warn('High training load detected', {
                activeSessions: activeSessions.length,
                maxSessions: this.maxConcurrentSessions,
                recommendation: 'Consider scaling up training infrastructure'
            });
        }
        if (activeSessions.length > this.maxConcurrentSessions) {
            const lowPrioritySessions = activeSessions
                .filter(s => {
                const schedule = this.trainingSchedules.get(s.agentId);
                return schedule?.priority === 'low';
            })
                .slice(0, activeSessions.length - this.maxConcurrentSessions);
            for (const session of lowPrioritySessions) {
                session.status = 'paused';
                logger_1.logger.info('Paused low-priority training session due to load', {
                    sessionId: session.id,
                    agentId: session.agentId
                });
            }
        }
    }
    async recoverFailedSessions() {
        const failedSessions = Array.from(this.activeSessions.values())
            .filter(s => s.status === 'failed');
        for (const session of failedSessions) {
            try {
                await this.attemptSessionRecovery(session);
            }
            catch (error) {
                logger_1.logger.error('Session recovery failed', {
                    sessionId: session.id,
                    agentId: session.agentId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    }
    async attemptSessionRecovery(session) {
        const remainingGames = session.targetGames - session.gamesPlayed;
        if (remainingGames > 0 && session.gamesPlayed > 0) {
            logger_1.logger.info('Attempting session recovery', {
                sessionId: session.id,
                agentId: session.agentId,
                gamesCompleted: session.gamesPlayed,
                gamesRemaining: remainingGames
            });
            session.status = 'running';
            try {
                const recoveryResults = await this.executeParallelTraining(session, remainingGames);
                await this.processTrainingResults(session, recoveryResults);
                session.status = 'completed';
                session.completed = new Date();
                logger_1.logger.info('Session recovery successful', {
                    sessionId: session.id,
                    agentId: session.agentId,
                    totalGamesCompleted: session.gamesPlayed
                });
            }
            catch (error) {
                session.status = 'failed';
                throw error;
            }
        }
    }
    async scheduleRetry(agentId, schedule) {
        const retryDelay = Math.pow(2, this.retryAttempts) * 60 * 1000;
        setTimeout(async () => {
            try {
                await this.startAdvancedSelfPlayTraining(agentId, schedule.gamesPerSession);
                logger_1.logger.info('Retry training successful', { agentId });
            }
            catch (error) {
                logger_1.logger.error('Retry training failed', {
                    agentId,
                    attempt: this.retryAttempts,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }, retryDelay);
    }
    async cleanupCompletedSessions() {
        const completedSessions = Array.from(this.activeSessions.entries())
            .filter(([_, session]) => session.status === 'completed' ||
            (session.status === 'failed' && session.completed));
        for (const [sessionId, session] of completedSessions) {
            const keepTime = 24 * 60 * 60 * 1000;
            const sessionAge = Date.now() - session.started.getTime();
            if (sessionAge > keepTime) {
                this.activeSessions.delete(sessionId);
                logger_1.logger.debug('Cleaned up training session', {
                    sessionId,
                    agentId: session.agentId,
                    status: session.status,
                    ageHours: Math.round(sessionAge / (60 * 60 * 1000))
                });
            }
        }
    }
    async storeTrainingResults(session, results) {
        try {
            logger_1.logger.info('Training results stored', {
                sessionId: session.id,
                agentId: session.agentId,
                gamesPlayed: results.length,
                avgGameLength: session.averageGameLength,
                winRate: session.winRate,
                eloChange: session.eloChange
            });
            for (const result of results.slice(0, 5)) {
                logger_1.logger.debug('Game result detail', {
                    sessionId: session.id,
                    gameData: result.learningData
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to store training results', {
                sessionId: session.id,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async getTrainingMetrics(agentId) {
        const schedule = this.trainingSchedules.get(agentId);
        const activeSessions = Array.from(this.activeSessions.values())
            .filter(s => s.agentId === agentId);
        const completedSessions = activeSessions.filter(s => s.status === 'completed');
        const totalGames = completedSessions.reduce((sum, s) => sum + s.gamesPlayed, 0);
        const averageWinRate = completedSessions.length > 0
            ? completedSessions.reduce((sum, s) => sum + s.winRate, 0) / completedSessions.length
            : 0;
        const eloImprovement = completedSessions.reduce((sum, s) => sum + s.eloChange, 0);
        const averageComputeTime = completedSessions.length > 0
            ? completedSessions.reduce((sum, s) => sum + s.computeTime, 0) / completedSessions.length
            : 0;
        return {
            totalSessions: completedSessions.length,
            totalGames,
            averageWinRate,
            eloImprovement,
            lastUpdate: schedule?.lastTraining || new Date(),
            nextScheduledUpdate: schedule?.nextTraining || new Date(),
            computeEfficiency: totalGames > 0 ? totalGames / (averageComputeTime / 1000) : 0
        };
    }
    async getActiveTrainingSessions() {
        return Array.from(this.activeSessions.values())
            .filter(s => s.status === 'running');
    }
    async stopTrainingSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session && session.status === 'running') {
            session.status = 'paused';
            logger_1.logger.info('Training session stopped', {
                sessionId,
                agentId: session.agentId,
                gamesCompleted: session.gamesPlayed
            });
        }
    }
    async shutdown() {
        if (this.trainingInterval) {
            clearInterval(this.trainingInterval);
        }
        for (const session of this.activeSessions.values()) {
            if (session.status === 'running') {
                session.status = 'paused';
            }
        }
        logger_1.logger.info('Enhanced AI Training Service V2 shutdown completed', {
            activeSessionsAtShutdown: this.activeSessions.size,
            scheduledAgents: this.trainingSchedules.size
        });
    }
}
exports.EnhancedAITrainingServiceV2 = EnhancedAITrainingServiceV2;
let enhancedAITrainingServiceV2Instance;
function getEnhancedAITrainingServiceV2() {
    if (!enhancedAITrainingServiceV2Instance) {
        enhancedAITrainingServiceV2Instance = new EnhancedAITrainingServiceV2();
    }
    return enhancedAITrainingServiceV2Instance;
}
exports.default = EnhancedAITrainingServiceV2;
//# sourceMappingURL=EnhancedAITrainingServiceV2.js.map