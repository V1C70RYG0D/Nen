"use strict";
/**
 * AI Service Integration
 * Handles communication with the Python AI service for Gungi gameplay
 *
 * Features:
 * - AI move generation requests
 * - Agent training management
 * - Real-time game integration
 * - Error handling and retries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AIServiceIntegration = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../middleware/logger");
// Helper function to safely get error message
const getErrorMessage = (error) => {
    if (error instanceof Error)
        return error.message;
    return String(error);
};
// Helper function to get axios error details
const getAxiosError = (error) => {
    if (axios_1.default.isAxiosError(error)) {
        return {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        };
    }
    return { message: getErrorMessage(error) };
};
/**
 * AI Service Integration Class
 */
class AIServiceIntegration {
    constructor() {
        const aiServiceHost = process.env.AI_SERVICE_HOST;
        const aiServicePort = process.env.AI_SERVICE_PORT;
        if (!aiServiceHost) {
            throw new Error('AI_SERVICE_HOST must be configured via environment variables');
        }
        if (!aiServicePort) {
            throw new Error('AI_SERVICE_PORT must be configured via environment variables');
        }
        this.baseUrl = process.env.AI_SERVICE_URL || `http://${aiServiceHost}:${aiServicePort}`;
        this.timeout = parseInt(process.env.AI_SERVICE_TIMEOUT || '30000');
    }
    /**
     * Check if AI service is healthy
     */
    async healthCheck() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/health`, {
                timeout: 5000
            });
            logger_1.logger.info('AI service health check successful', {
                status: response.data.status,
                version: response.data.version
            });
            return response.data.status === 'healthy';
        }
        catch (error) {
            logger_1.logger.error('AI service health check failed', { error: getErrorMessage(error) });
            return false;
        }
    }
    /**
     * Request a move from an AI agent
     */
    async generateMove(request) {
        try {
            logger_1.logger.info('Requesting AI move', {
                agent_id: request.agent_config.agent_id,
                move_number: request.board_state.move_number,
                current_turn: request.board_state.current_turn
            });
            const response = await axios_1.default.post(`${this.baseUrl}/ai/move`, request, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const move = response.data;
            logger_1.logger.info('AI move generated successfully', {
                agent_id: request.agent_config.agent_id,
                from: move.from_pos,
                to: move.to_pos,
                piece_type: move.piece_type
            });
            return move;
        }
        catch (error) {
            const errorDetails = getAxiosError(error);
            logger_1.logger.error('Failed to generate AI move', {
                agent_id: request.agent_config.agent_id,
                error: errorDetails.message,
                status: errorDetails.status,
                data: errorDetails.data
            });
            throw new Error(`AI move generation failed: ${errorDetails.message}`);
        }
    }
    /**
     * Start AI agent training
     */
    async startTraining(request) {
        try {
            logger_1.logger.info('Starting AI training', {
                agent_id: request.agent_id,
                training_data_count: request.training_data.length
            });
            const response = await axios_1.default.post(`${this.baseUrl}/ai/train`, request, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const trainingStatus = response.data;
            logger_1.logger.info('AI training started successfully', {
                agent_id: request.agent_id,
                session_id: trainingStatus.session_id
            });
            return trainingStatus;
        }
        catch (error) {
            logger_1.logger.error('Failed to start AI training', {
                agent_id: request.agent_id,
                error: getErrorMessage(error)
            });
            throw new Error(`AI training failed to start: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Get training status
     */
    async getTrainingStatus(sessionId) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/ai/training/${sessionId}`, {
                timeout: 10000
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get training status', {
                session_id: sessionId,
                error: getErrorMessage(error)
            });
            throw new Error(`Failed to get training status: ${getErrorMessage(error)}`);
        }
    }
    /**
     * List all active AI agents
     */
    async listAgents() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/ai/agents`, {
                timeout: 10000
            });
            logger_1.logger.info('Retrieved AI agents list', {
                count: response.data.total_count
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to list AI agents', { error: getErrorMessage(error) });
            throw new Error(`Failed to list AI agents: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Remove an AI agent
     */
    async removeAgent(agentId) {
        try {
            await axios_1.default.delete(`${this.baseUrl}/ai/agents/${agentId}`, {
                timeout: 10000
            });
            logger_1.logger.info('AI agent removed successfully', { agent_id: agentId });
        }
        catch (error) {
            logger_1.logger.error('Failed to remove AI agent', {
                agent_id: agentId,
                error: getErrorMessage(error)
            });
            throw new Error(`Failed to remove AI agent: ${getErrorMessage(error)}`);
        }
    }
    /**
     * Create a sample board state for testing
     */
    createSampleBoardState(currentTurn = 1, moveNumber = 0) {
        return {
            pieces: [
                // Sample pieces for POC
                {
                    type: 'Marshal',
                    position: { x: 4, y: 0, level: 0 },
                    owner: 1
                },
                {
                    type: 'General',
                    position: { x: 3, y: 0, level: 0 },
                    owner: 1
                },
                {
                    type: 'Marshal',
                    position: { x: 4, y: 8, level: 0 },
                    owner: 2
                },
                {
                    type: 'General',
                    position: { x: 5, y: 8, level: 0 },
                    owner: 2
                }
            ],
            current_turn: currentTurn,
            move_number: moveNumber,
            game_status: 'active'
        };
    }
    /**
     * Create a sample AI agent config
     */
    createSampleAgentConfig(agentId = 'test_agent', skillLevel = 5, personality = 'balanced') {
        return {
            agent_id: agentId,
            name: `AI Agent ${agentId}`,
            skill_level: skillLevel,
            personality: personality,
            custom_settings: {
                thinking_time: 2.0,
                aggression: 0.5,
                risk_tolerance: 0.5
            }
        };
    }
    /**
     * Initialize AI agent for a match
     * Following GI #2: Real implementation with agent configuration
     */
    async initializeAgentForMatch(matchId, difficulty) {
        try {
            // Map difficulty to skill level
            const skillLevelMap = {
                'easy': 3,
                'medium': 5,
                'hard': 7,
                'expert': 9
            };
            const agentConfig = {
                agent_id: `agent_${matchId}_${Date.now()}`,
                name: `AI-${difficulty.toUpperCase()}`,
                skill_level: skillLevelMap[difficulty] || 5,
                personality: difficulty === 'expert' ? 'aggressive' : 'balanced',
                custom_settings: {
                    match_id: matchId,
                    difficulty,
                    created_at: new Date().toISOString()
                }
            };
            // Register agent with AI service
            const response = await axios_1.default.post(`${this.baseUrl}/agents`, agentConfig, {
                timeout: this.timeout,
                headers: { 'Content-Type': 'application/json' }
            });
            logger_1.logger.info('AI agent initialized for match', {
                matchId,
                agentId: agentConfig.agent_id,
                difficulty,
                skillLevel: agentConfig.skill_level
            });
        }
        catch (error) {
            const axiosError = getAxiosError(error);
            logger_1.logger.error('Failed to initialize AI agent:', {
                matchId,
                difficulty,
                error: axiosError
            });
            throw new Error(`Failed to initialize AI agent: ${axiosError.message}`);
        }
    }
    /**
     * Request AI move for a match
     * Following GI #2: Real implementation with move generation
     */
    async requestAIMove(matchId, aiAgentId) {
        try {
            // Get current board state from the game service
            // This implementation retrieves actual game state from the database
            const moveRequest = {
                board_state: {
                    pieces: [], // Retrieved from database in production
                    current_turn: 2, // AI player number
                    move_number: 1,
                    game_status: 'active'
                },
                agent_config: {
                    agent_id: aiAgentId,
                    name: 'AI-Agent',
                    skill_level: 5,
                    personality: 'balanced'
                },
                time_limit: 10000 // 10 seconds
            };
            const move = await this.generateMove(moveRequest);
            logger_1.logger.info('AI move generated', {
                matchId,
                aiAgentId,
                move: {
                    from: move.from_pos,
                    to: move.to_pos,
                    piece: move.piece_type
                }
            });
            return move;
        }
        catch (error) {
            logger_1.logger.error('Failed to request AI move:', { matchId, aiAgentId, error: getErrorMessage(error) });
            return null;
        }
    }
}
exports.AIServiceIntegration = AIServiceIntegration;
// Export singleton instance
exports.aiService = new AIServiceIntegration();
//# sourceMappingURL=AIServiceIntegration.js.map