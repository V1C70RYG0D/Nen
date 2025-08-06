"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
// AI Service for Gungi agents
const logger_1 = require("../utils/logger");
const database_1 = require("../utils/database");
const redis_1 = require("../utils/redis");
const uuid_1 = require("uuid");
class AIService {
    constructor() {
        this.cache = new redis_1.CacheService();
    }
    // Get AI agent by ID
    async getAgent(agentId) {
        try {
            const cacheKey = `ai_agent:${agentId}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            const rows = await (0, database_1.query)(`
        SELECT * FROM ai_agents WHERE id = $1
      `, [agentId]);
            if (rows.length === 0) {
                return null;
            }
            const row = rows[0];
            const agent = {
                id: row.id,
                ownerId: row.owner_id,
                nftMintAddress: row.nft_mint_address,
                name: row.name,
                description: row.description,
                personalityTraits: row.personality_traits || {},
                playingStyle: row.playing_style || {},
                skillLevel: row.skill_level,
                eloRating: row.elo_rating,
                gamesPlayed: row.games_played,
                wins: row.wins,
                losses: row.losses,
                draws: row.draws,
                trainingDataCount: row.training_data_count,
                modelVersion: row.model_version,
                modelHash: row.model_hash,
                isPublic: row.is_public,
                isTradeable: row.is_tradeable,
                marketPrice: row.market_price ? parseFloat(row.market_price) : undefined,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };
            // Cache for 10 minutes
            await this.cache.set(cacheKey, agent, 600);
            return agent;
        }
        catch (error) {
            logger_1.logger.error('Error getting AI agent:', error);
            throw error;
        }
    }
    // Get all available AI agents
    async getAvailableAgents(filters) {
        try {
            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;
            if (filters?.isPublic !== undefined) {
                whereClause += ` AND is_public = $${paramIndex}`;
                params.push(filters.isPublic);
                paramIndex++;
            }
            if (filters?.minElo !== undefined) {
                whereClause += ` AND elo_rating >= $${paramIndex}`;
                params.push(filters.minElo);
                paramIndex++;
            }
            if (filters?.maxElo !== undefined) {
                whereClause += ` AND elo_rating <= $${paramIndex}`;
                params.push(filters.maxElo);
                paramIndex++;
            }
            if (filters?.skillLevel !== undefined) {
                whereClause += ` AND skill_level = $${paramIndex}`;
                params.push(filters.skillLevel);
                paramIndex++;
            }
            const limit = filters?.limit || 20;
            const limitClause = `LIMIT $${paramIndex}`;
            params.push(limit);
            const rows = await (0, database_1.query)(`
        SELECT * FROM ai_agents
        ${whereClause}
        ORDER BY elo_rating DESC
        ${limitClause}
      `, params);
            return rows.map(row => ({
                id: row.id,
                ownerId: row.owner_id,
                nftMintAddress: row.nft_mint_address,
                name: row.name,
                description: row.description,
                personalityTraits: row.personality_traits || {},
                playingStyle: row.playing_style || {},
                skillLevel: row.skill_level,
                eloRating: row.elo_rating,
                gamesPlayed: row.games_played,
                wins: row.wins,
                losses: row.losses,
                draws: row.draws,
                trainingDataCount: row.training_data_count,
                modelVersion: row.model_version,
                modelHash: row.model_hash,
                isPublic: row.is_public,
                isTradeable: row.is_tradeable,
                marketPrice: row.market_price ? parseFloat(row.market_price) : undefined,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting available agents:', error);
            throw error;
        }
    }
    // Generate move for AI agent
    async getMove(agentId, gameState, timeLimit = 5000) {
        try {
            const agent = await this.getAgent(agentId);
            if (!agent) {
                throw new Error('AI agent not found');
            }
            // Simulate thinking time based on agent's skill level
            const thinkingTime = Math.max(500, (11 - agent.skillLevel) * 200);
            await new Promise(resolve => setTimeout(resolve, Math.min(thinkingTime, timeLimit)));
            // Generate move based on agent's skill level and personality
            const move = await this.generateMove(agent, gameState);
            if (move) {
                logger_1.logger.debug('AI move generated', {
                    agentId,
                    move,
                    skillLevel: agent.skillLevel,
                    thinkingTime
                });
            }
            return move;
        }
        catch (error) {
            logger_1.logger.error('Error generating AI move:', error);
            return null;
        }
    }
    // Generate move based on AI agent's characteristics
    async generateMove(agent, gameState) {
        try {
            // Different move generation strategies based on skill level
            switch (true) {
                case agent.skillLevel <= 3:
                    return this.getRandomMove(gameState);
                case agent.skillLevel <= 6:
                    return this.getMediumMove(agent, gameState);
                case agent.skillLevel <= 9:
                    return this.getHardMove(agent, gameState);
                default:
                    return this.getExpertMove(agent, gameState);
            }
        }
        catch (error) {
            logger_1.logger.error('Error in move generation logic:', error);
            return this.getRandomMove(gameState);
        }
    }
    // Random move for low-skill agents
    getRandomMove(gameState) {
        return {
            from: { x: Math.floor(Math.random() * 9), y: Math.floor(Math.random() * 9), level: 0 },
            to: { x: Math.floor(Math.random() * 9), y: Math.floor(Math.random() * 9), level: 0 },
            piece: 'pawn',
            evaluation: 0,
            confidence: 0.3,
        };
    }
    // Medium-level move with basic heuristics
    getMediumMove(agent, gameState) {
        const move = this.getRandomMove(gameState);
        // Apply personality modifiers
        const aggression = agent.personalityTraits.aggression || 0.5;
        const evaluation = Math.random() * aggression;
        return {
            ...move,
            evaluation,
            confidence: 0.6,
        };
    }
    // Hard move with tactical evaluation
    getHardMove(agent, gameState) {
        const move = this.getRandomMove(gameState);
        // Simulate minimax-like evaluation
        const evaluation = this.evaluatePosition(agent, gameState, move);
        return {
            ...move,
            evaluation,
            confidence: 0.8,
        };
    }
    // Expert move with deep analysis
    getExpertMove(agent, gameState) {
        const move = this.getRandomMove(gameState);
        // Advanced position evaluation
        const evaluation = this.evaluatePosition(agent, gameState, move) * 1.2;
        return {
            ...move,
            evaluation,
            confidence: 0.95,
        };
    }
    // Evaluate position based on agent personality
    evaluatePosition(agent, gameState, move) {
        let evaluation = 0;
        // Base evaluation
        evaluation += Math.random() * 100;
        // Personality modifiers
        const traits = agent.personalityTraits;
        if (traits.aggression > 0.7) {
            evaluation += 20; // Bonus for aggressive moves
        }
        if (traits.patience > 0.7) {
            evaluation += 10; // Bonus for defensive moves
        }
        if (traits.riskTolerance > 0.7) {
            evaluation += Math.random() * 30 - 15; // More variance for risky agents
        }
        return evaluation;
    }
    // Start AI training session
    async startTraining(trainingData) {
        try {
            const agent = await this.getAgent(trainingData.aiAgentId);
            if (!agent) {
                throw new Error('AI agent not found');
            }
            const session = {
                id: (0, uuid_1.v4)(),
                aiAgentId: trainingData.aiAgentId,
                userId: trainingData.userId,
                trainingType: trainingData.trainingType,
                episodesCount: trainingData.episodesCount || 1000,
                gamesTrainedOn: 0,
                trainingParameters: {
                    learningRate: 0.001,
                    batchSize: 32,
                    epochs: 10,
                },
                personalityModifications: trainingData.personalityModifications || {},
                openingPreferences: trainingData.openingPreferences || {},
                strategicFocus: trainingData.strategicFocus || {},
                initialElo: agent.eloRating,
                finalElo: agent.eloRating,
                improvementMetrics: {},
                trainingCostSol: this.calculateTrainingCost(trainingData.episodesCount || 1000),
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            // Store training session
            await (0, database_1.query)(`
        INSERT INTO training_sessions (
          id, ai_agent_id, user_id, training_type, episodes_count,
          training_parameters, personality_modifications, opening_preferences,
          strategic_focus, initial_elo, training_cost_sol, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
                session.id, session.aiAgentId, session.userId, session.trainingType,
                session.episodesCount, JSON.stringify(session.trainingParameters),
                JSON.stringify(session.personalityModifications),
                JSON.stringify(session.openingPreferences),
                JSON.stringify(session.strategicFocus), session.initialElo,
                session.trainingCostSol, session.status
            ]);
            // Start training process (simulate)
            this.runTrainingSession(session).catch(error => {
                logger_1.logger.error('Training session failed:', error);
            });
            logger_1.logger.info('Training session started', { sessionId: session.id, agentId: session.aiAgentId });
            return session;
        }
        catch (error) {
            logger_1.logger.error('Error starting training session:', error);
            throw error;
        }
    }
    // Run training session (simulated)
    async runTrainingSession(session) {
        try {
            // Update status to running
            await (0, database_1.query)(`
        UPDATE training_sessions
        SET status = 'running', started_at = $1, updated_at = $1
        WHERE id = $2
      `, [new Date(), session.id]);
            // Simulate training time (5-30 seconds for demo)
            const trainingTime = 5000 + Math.random() * 25000;
            await new Promise(resolve => setTimeout(resolve, trainingTime));
            // Calculate improvement
            const eloImprovement = Math.floor(Math.random() * 50) + 10; // 10-60 ELO gain
            const finalElo = session.initialElo + eloImprovement;
            // Apply personality modifications to agent
            const agent = await this.getAgent(session.aiAgentId);
            if (agent && session.personalityModifications) {
                const updatedTraits = { ...agent.personalityTraits };
                for (const [trait, modification] of Object.entries(session.personalityModifications)) {
                    if (updatedTraits[trait] !== undefined) {
                        updatedTraits[trait] = Math.max(0, Math.min(1, updatedTraits[trait] + modification));
                    }
                }
                // Update agent in database
                await (0, database_1.transaction)(async (client) => {
                    await client.query(`
            UPDATE ai_agents
            SET elo_rating = $1, personality_traits = $2,
                training_data_count = training_data_count + $3, updated_at = $4
            WHERE id = $5
          `, [finalElo, JSON.stringify(updatedTraits), session.episodesCount, new Date(), session.aiAgentId]);
                    await client.query(`
            UPDATE training_sessions
            SET status = 'completed', final_elo = $1, games_trained_on = $2,
                improvement_metrics = $3, completed_at = $4, updated_at = $4
            WHERE id = $5
          `, [
                        finalElo, session.episodesCount,
                        JSON.stringify({ eloGain: eloImprovement, trainingTime }),
                        new Date(), session.id
                    ]);
                });
                // Clear agent cache
                await this.cache.del(`ai_agent:${session.aiAgentId}`);
            }
            logger_1.logger.info('Training session completed', {
                sessionId: session.id,
                eloImprovement,
                finalElo
            });
        }
        catch (error) {
            logger_1.logger.error('Error in training session:', error);
            // Mark session as failed
            await (0, database_1.query)(`
        UPDATE training_sessions
        SET status = 'failed', updated_at = $1
        WHERE id = $2
      `, [new Date(), session.id]);
        }
    }
    // Calculate training cost
    calculateTrainingCost(episodes) {
        const baseCostPerEpisode = 0.0001; // 0.0001 SOL per episode
        return episodes * baseCostPerEpisode;
    }
    // Get training session
    async getTrainingSession(sessionId) {
        try {
            const rows = await (0, database_1.query)(`
        SELECT * FROM training_sessions WHERE id = $1
      `, [sessionId]);
            if (rows.length === 0) {
                return null;
            }
            const row = rows[0];
            return {
                id: row.id,
                aiAgentId: row.ai_agent_id,
                userId: row.user_id,
                trainingType: row.training_type,
                episodesCount: row.episodes_count,
                gamesTrainedOn: row.games_trained_on,
                trainingParameters: row.training_parameters || {},
                personalityModifications: row.personality_modifications || {},
                openingPreferences: row.opening_preferences || {},
                strategicFocus: row.strategic_focus || {},
                initialElo: row.initial_elo,
                finalElo: row.final_elo,
                improvementMetrics: row.improvement_metrics || {},
                trainingCostSol: parseFloat(row.training_cost_sol || '0'),
                status: row.status,
                startedAt: row.started_at,
                completedAt: row.completed_at,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting training session:', error);
            throw error;
        }
    }
    // Update agent ELO after match
    async updateAgentElo(agentId, result, opponentElo) {
        try {
            const agent = await this.getAgent(agentId);
            if (!agent) {
                throw new Error('Agent not found');
            }
            // Calculate ELO change using standard formula
            const K = 32; // K-factor
            const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - agent.eloRating) / 400));
            let actualScore;
            switch (result) {
                case 'win':
                    actualScore = 1;
                    break;
                case 'loss':
                    actualScore = 0;
                    break;
                case 'draw':
                    actualScore = 0.5;
                    break;
            }
            const eloChange = Math.round(K * (actualScore - expectedScore));
            const newElo = Math.max(100, agent.eloRating + eloChange); // Minimum ELO of 100
            // Update database
            const updateQuery = result === 'win'
                ? 'UPDATE ai_agents SET elo_rating = $1, wins = wins + 1, games_played = games_played + 1, updated_at = $2 WHERE id = $3'
                : result === 'loss'
                    ? 'UPDATE ai_agents SET elo_rating = $1, losses = losses + 1, games_played = games_played + 1, updated_at = $2 WHERE id = $3'
                    : 'UPDATE ai_agents SET elo_rating = $1, draws = draws + 1, games_played = games_played + 1, updated_at = $2 WHERE id = $3';
            await (0, database_1.query)(updateQuery, [newElo, new Date(), agentId]);
            // Clear cache
            await this.cache.del(`ai_agent:${agentId}`);
            logger_1.logger.info('Agent ELO updated', {
                agentId,
                result,
                oldElo: agent.eloRating,
                newElo,
                change: eloChange
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating agent ELO:', error);
            throw error;
        }
    }
}
exports.AIService = AIService;
//# sourceMappingURL=AIService.js.map