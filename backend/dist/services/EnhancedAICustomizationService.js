"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedAICustomizationService = exports.EnhancedAICustomizationService = exports.AIDifficulty = exports.AIPersonality = void 0;
const EnhancedCachingService_1 = require("./EnhancedCachingService");
const logger_1 = require("../utils/logger");
var AIPersonality;
(function (AIPersonality) {
    AIPersonality["AGGRESSIVE"] = "aggressive";
    AIPersonality["DEFENSIVE"] = "defensive";
    AIPersonality["BALANCED"] = "balanced";
    AIPersonality["TACTICAL"] = "tactical";
    AIPersonality["HUNTER"] = "hunter";
    AIPersonality["CALCULATOR"] = "calculator";
})(AIPersonality || (exports.AIPersonality = AIPersonality = {}));
var AIDifficulty;
(function (AIDifficulty) {
    AIDifficulty["EASY"] = "easy";
    AIDifficulty["MEDIUM"] = "medium";
    AIDifficulty["HARD"] = "hard";
    AIDifficulty["EXPERT"] = "expert";
    AIDifficulty["GRANDMASTER"] = "grandmaster";
})(AIDifficulty || (exports.AIDifficulty = AIDifficulty = {}));
class EnhancedAICustomizationService {
    activeAgents = new Map();
    trainingSession = new Map();
    maxConcurrentTraining = 5;
    constructor() {
        this.initializeService();
    }
    async initializeService() {
        try {
            await this.loadPredefinedAgents();
            await this.initializeLearningEngine();
            logger_1.logger.info('Enhanced AI Customization Service initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Enhanced AI Customization Service:', error);
            throw error;
        }
    }
    async createCustomAIAgent(name, personality, difficulty, customizations, userId) {
        try {
            const agentId = this.generateAgentId();
            const agent = {
                id: agentId,
                name,
                personality,
                difficulty,
                elo: this.calculateInitialElo(difficulty),
                gamesPlayed: 0,
                winRate: 0,
                averageMovesPerGame: 0,
                preferredOpenings: this.getDefaultOpenings(personality),
                learningEnabled: true,
                customizations: this.mergeCustomizations(customizations),
                performanceMetrics: this.initializePerformanceMetrics(),
                fraudDetection: this.getDefaultFraudDetection(),
                createdAt: new Date(),
                lastUpdated: new Date()
            };
            await EnhancedCachingService_1.enhancedCachingService.set({ type: 'ai_agent', identifier: agentId }, agent, 3600);
            this.activeAgents.set(agentId, agent);
            logger_1.logger.info(`Created custom AI agent: ${name} (${agentId})`);
            return agent;
        }
        catch (error) {
            logger_1.logger.error('Failed to create custom AI agent:', error);
            throw new Error(`AI agent creation failed: ${error}`);
        }
    }
    async generateEnhancedMove(agentId, gameState, timeLimit = 5000) {
        const startTime = performance.now();
        try {
            const agent = await this.getAgent(agentId);
            if (!agent) {
                throw new Error(`AI agent not found: ${agentId}`);
            }
            const boardHash = this.generateBoardHash(gameState);
            const cachedMove = await EnhancedCachingService_1.enhancedCachingService.getCachedAIMove(gameState.id, boardHash, agent.difficulty);
            if (cachedMove) {
                logger_1.logger.debug(`Using cached move for agent ${agentId}`);
                return this.wrapMoveInAnalysis(cachedMove, agent, 'cached');
            }
            const moveAnalysis = await this.calculateBestMove(agent, gameState, timeLimit);
            await this.performFraudDetection(agent, moveAnalysis, startTime);
            await EnhancedCachingService_1.enhancedCachingService.cacheAIMove(gameState.id, boardHash, moveAnalysis.move, agent.difficulty);
            await this.updateAgentPerformance(agent, moveAnalysis);
            const executionTime = performance.now() - startTime;
            logger_1.logger.info(`AI move generated for ${agentId} in ${executionTime.toFixed(2)}ms`);
            return moveAnalysis;
        }
        catch (error) {
            logger_1.logger.error(`Failed to generate AI move for ${agentId}:`, error);
            throw error;
        }
    }
    async trainAgent(agentId, trainingGames = 100, opponentAgents = []) {
        try {
            const agent = await this.getAgent(agentId);
            if (!agent) {
                throw new Error(`AI agent not found: ${agentId}`);
            }
            if (this.trainingSession.has(agentId)) {
                throw new Error(`Agent ${agentId} is already in training`);
            }
            if (this.trainingSession.size >= this.maxConcurrentTraining) {
                throw new Error('Maximum concurrent training sessions reached');
            }
            const trainingData = {
                startTime: new Date(),
                gamesCompleted: 0,
                targetGames: trainingGames,
                initialElo: agent.elo,
                improvements: []
            };
            this.trainingSession.set(agentId, trainingData);
            logger_1.logger.info(`Started training session for agent ${agentId}`);
            const evolutionPoint = await this.simulateTraining(agent, trainingGames);
            await this.applyLearningResults(agent, evolutionPoint);
            this.trainingSession.delete(agentId);
            return evolutionPoint;
        }
        catch (error) {
            logger_1.logger.error(`Training failed for agent ${agentId}:`, error);
            this.trainingSession.delete(agentId);
            throw error;
        }
    }
    async calculateBestMove(agent, gameState, timeLimit) {
        const possibleMoves = this.generatePossibleMoves(gameState);
        if (possibleMoves.length === 0) {
            throw new Error('No valid moves available');
        }
        const scoredMoves = possibleMoves.map(move => {
            const score = this.scoreMove(move, gameState, agent);
            return { move, score };
        });
        scoredMoves.sort((a, b) => b.score - a.score);
        const bestMove = scoredMoves[0].move;
        const alternatives = scoredMoves.slice(1, 4).map(sm => sm.move);
        return {
            move: bestMove,
            confidence: this.calculateConfidence(scoredMoves[0].score, scoredMoves),
            calculatedDepth: agent.customizations.calculationDepth,
            alternatives,
            reasoning: this.generateMoveReasoning(bestMove, gameState, agent),
            riskAssessment: this.assessMoveRisk(bestMove, gameState, agent),
            expectedOutcome: scoredMoves[0].score
        };
    }
    async performFraudDetection(agent, moveAnalysis, startTime) {
        if (!agent.fraudDetection.enabled)
            return;
        const executionTime = performance.now() - startTime;
        if (executionTime < agent.fraudDetection.minimumThinkingTime) {
            throw new Error('Move calculated too quickly - potential fraud detected');
        }
        if (moveAnalysis.confidence > agent.fraudDetection.maximumAccuracy) {
            logger_1.logger.warn(`Suspicious high accuracy detected for agent ${agent.id}`);
        }
    }
    async updateAgentPerformance(agent, moveAnalysis) {
        agent.performanceMetrics.totalMoves++;
        agent.performanceMetrics.averageThinkingTime =
            (agent.performanceMetrics.averageThinkingTime + moveAnalysis.calculatedDepth) / 2;
        agent.lastUpdated = new Date();
        await EnhancedCachingService_1.enhancedCachingService.set({ type: 'ai_agent', identifier: agent.id }, agent, 3600);
    }
    async loadPredefinedAgents() {
        const predefinedAgents = [
            {
                name: 'Gon Freecss',
                personality: AIPersonality.AGGRESSIVE,
                difficulty: AIDifficulty.MEDIUM
            },
            {
                name: 'Killua Zoldyck',
                personality: AIPersonality.TACTICAL,
                difficulty: AIDifficulty.HARD
            },
            {
                name: 'Kurapika',
                personality: AIPersonality.CALCULATOR,
                difficulty: AIDifficulty.EXPERT
            },
            {
                name: 'Leorio',
                personality: AIPersonality.BALANCED,
                difficulty: AIDifficulty.EASY
            },
            {
                name: 'Meruem',
                personality: AIPersonality.CALCULATOR,
                difficulty: AIDifficulty.GRANDMASTER
            }
        ];
        for (const preset of predefinedAgents) {
            await this.createCustomAIAgent(preset.name, preset.personality, preset.difficulty, {});
        }
    }
    async initializeLearningEngine() {
        logger_1.logger.info('Learning engine initialized');
    }
    generateAgentId() {
        return `ai_agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    calculateInitialElo(difficulty) {
        const eloMap = {
            [AIDifficulty.EASY]: 1200,
            [AIDifficulty.MEDIUM]: 1500,
            [AIDifficulty.HARD]: 1800,
            [AIDifficulty.EXPERT]: 2100,
            [AIDifficulty.GRANDMASTER]: 2400
        };
        return eloMap[difficulty];
    }
    getDefaultOpenings(personality) {
        const openingMap = {
            [AIPersonality.AGGRESSIVE]: ['King\'s Gambit', 'Sicilian Dragon'],
            [AIPersonality.DEFENSIVE]: ['French Defense', 'Caro-Kann'],
            [AIPersonality.BALANCED]: ['Italian Game', 'Ruy Lopez'],
            [AIPersonality.TACTICAL]: ['Nimzo-Indian', 'King\'s Indian'],
            [AIPersonality.HUNTER]: ['Bird\'s Opening', 'English Attack'],
            [AIPersonality.CALCULATOR]: ['Queen\'s Gambit', 'Catalan']
        };
        return openingMap[personality] || [];
    }
    mergeCustomizations(custom) {
        return {
            aggressiveness: custom.aggressiveness || 50,
            riskTolerance: custom.riskTolerance || 50,
            calculationDepth: custom.calculationDepth || 3,
            adaptationRate: custom.adaptationRate || 25,
            specializations: custom.specializations || [],
            avoidancePatterns: custom.avoidancePatterns || [],
            favoriteFormations: custom.favoriteFormations || [],
            timeManagement: custom.timeManagement || 50
        };
    }
    initializePerformanceMetrics() {
        return {
            totalMoves: 0,
            averageThinkingTime: 0,
            accuracyScore: 0,
            improvementRate: 0,
            strengths: [],
            weaknesses: [],
            recentPerformance: [],
            evolutionHistory: []
        };
    }
    getDefaultFraudDetection() {
        return {
            enabled: true,
            maxMovesPerSecond: 10,
            suspiciousPatternThreshold: 0.95,
            minimumThinkingTime: 100,
            maximumAccuracy: 0.98
        };
    }
    generateBoardHash(gameState) {
        return `board_${gameState.currentPlayer}_${gameState.moves.length}`;
    }
    wrapMoveInAnalysis(move, agent, source) {
        return {
            move,
            confidence: 0.8,
            calculatedDepth: agent.customizations.calculationDepth,
            alternatives: [],
            reasoning: `Cached move from ${source}`,
            riskAssessment: 0.5,
            expectedOutcome: 0.6
        };
    }
    generatePossibleMoves(gameState) {
        return [];
    }
    scoreMove(move, gameState, agent) {
        const baseScore = agent.elo / 3000;
        const difficultyMultiplier = this.getDifficultyMultiplier(agent.difficulty);
        const personalityScore = this.getPersonalityScore(agent.personality);
        const finalScore = (baseScore * 0.6) + (difficultyMultiplier * 0.3) + (personalityScore * 0.1);
        return Math.max(0.1, Math.min(0.9, finalScore));
    }
    getDifficultyMultiplier(difficulty) {
        switch (difficulty) {
            case AIDifficulty.EASY: return 0.3;
            case AIDifficulty.MEDIUM: return 0.6;
            case AIDifficulty.HARD: return 0.8;
            case AIDifficulty.EXPERT: return 1.0;
            default: return 0.5;
        }
    }
    getPersonalityScore(personality) {
        switch (personality) {
            case AIPersonality.AGGRESSIVE: return 0.8;
            case AIPersonality.DEFENSIVE: return 0.4;
            case AIPersonality.TACTICAL: return 0.7;
            case AIPersonality.CALCULATOR: return 0.9;
            case AIPersonality.HUNTER: return 0.75;
            case AIPersonality.BALANCED: return 0.6;
            default: return 0.5;
        }
    }
    calculateConfidence(bestScore, allScores) {
        if (allScores.length < 2)
            return 1.0;
        const gap = bestScore - allScores[1].score;
        return Math.min(0.95, 0.5 + gap / 2);
    }
    generateMoveReasoning(move, gameState, agent) {
        return `${agent.personality} move focusing on tactical advantage`;
    }
    assessMoveRisk(move, gameState, agent) {
        return agent.customizations.riskTolerance / 100;
    }
    async simulateTraining(agent, games) {
        const improvement = Math.random() * 50 + 10;
        return {
            timestamp: new Date(),
            elo: agent.elo + improvement,
            learningEvent: `Completed ${games} training games`,
            improvement
        };
    }
    async applyLearningResults(agent, evolution) {
        agent.elo = evolution.elo;
        agent.performanceMetrics.evolutionHistory.push(evolution);
        agent.lastUpdated = new Date();
        await EnhancedCachingService_1.enhancedCachingService.set({ type: 'ai_agent', identifier: agent.id }, agent, 3600);
    }
    async getAgent(agentId) {
        if (this.activeAgents.has(agentId)) {
            return this.activeAgents.get(agentId);
        }
        const cachedAgent = await EnhancedCachingService_1.enhancedCachingService.get({ type: 'ai_agent', identifier: agentId });
        if (cachedAgent) {
            this.activeAgents.set(agentId, cachedAgent);
            return cachedAgent;
        }
        return null;
    }
    async getAllAgents() {
        return Array.from(this.activeAgents.values());
    }
    async getAgentStats(agentId) {
        const agent = await this.getAgent(agentId);
        return agent?.performanceMetrics || null;
    }
}
exports.EnhancedAICustomizationService = EnhancedAICustomizationService;
exports.enhancedAICustomizationService = new EnhancedAICustomizationService();
//# sourceMappingURL=EnhancedAICustomizationService.js.map