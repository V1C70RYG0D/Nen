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
export interface AIGamePosition {
    x: number;
    y: number;
    level: number;
}
export interface AIGameMove {
    from_pos: AIGamePosition;
    to_pos: AIGamePosition;
    piece_type: string;
    player: number;
    timestamp?: string;
}
export interface AIBoardState {
    pieces: any[];
    current_turn: number;
    move_number: number;
    game_status: string;
}
export interface AIAgentConfig {
    agent_id: string;
    name: string;
    skill_level: number;
    personality: string;
    custom_settings?: Record<string, any>;
}
export interface AIMoveRequest {
    board_state: AIBoardState;
    agent_config: AIAgentConfig;
    time_limit?: number;
}
export interface AITrainingRequest {
    agent_id: string;
    training_data: any[];
    training_config: Record<string, any>;
}
export interface AITrainingStatus {
    session_id: string;
    status: 'started' | 'completed' | 'failed';
    progress: number;
    started_at: string;
    completed_at?: string;
    error?: string;
}
/**
 * AI Service Integration Class
 */
export declare class AIServiceIntegration {
    private baseUrl;
    private timeout;
    constructor();
    /**
     * Check if AI service is healthy
     */
    healthCheck(): Promise<boolean>;
    /**
     * Request a move from an AI agent
     */
    generateMove(request: AIMoveRequest): Promise<AIGameMove>;
    /**
     * Start AI agent training
     */
    startTraining(request: AITrainingRequest): Promise<AITrainingStatus>;
    /**
     * Get training status
     */
    getTrainingStatus(sessionId: string): Promise<AITrainingStatus>;
    /**
     * List all active AI agents
     */
    listAgents(): Promise<{
        agents: any[];
        total_count: number;
    }>;
    /**
     * Remove an AI agent
     */
    removeAgent(agentId: string): Promise<void>;
    /**
     * Create a sample board state for testing
     */
    createSampleBoardState(currentTurn?: number, moveNumber?: number): AIBoardState;
    /**
     * Create a sample AI agent config
     */
    createSampleAgentConfig(agentId?: string, skillLevel?: number, personality?: string): AIAgentConfig;
    /**
     * Initialize AI agent for a match
     * Following GI #2: Real implementation with agent configuration
     */
    initializeAgentForMatch(matchId: string, difficulty: string): Promise<void>;
    /**
     * Request AI move for a match
     * Following GI #2: Real implementation with move generation
     */
    requestAIMove(matchId: string, aiAgentId: string): Promise<AIGameMove | null>;
}
export declare const aiService: AIServiceIntegration;
//# sourceMappingURL=AIServiceIntegration.d.ts.map