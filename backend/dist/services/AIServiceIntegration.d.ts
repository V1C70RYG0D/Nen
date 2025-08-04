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
export declare class AIServiceIntegration {
    private baseUrl;
    private timeout;
    constructor();
    healthCheck(): Promise<boolean>;
    generateMove(request: AIMoveRequest): Promise<AIGameMove>;
    startTraining(request: AITrainingRequest): Promise<AITrainingStatus>;
    getTrainingStatus(sessionId: string): Promise<AITrainingStatus>;
    listAgents(): Promise<{
        agents: any[];
        total_count: number;
    }>;
    removeAgent(agentId: string): Promise<void>;
    createSampleBoardState(currentTurn?: number, moveNumber?: number): AIBoardState;
    createSampleAgentConfig(agentId?: string, skillLevel?: number, personality?: string): AIAgentConfig;
    initializeAgentForMatch(matchId: string, difficulty: string): Promise<void>;
    requestAIMove(matchId: string, aiAgentId: string): Promise<AIGameMove | null>;
}
export declare const aiService: AIServiceIntegration;
//# sourceMappingURL=AIServiceIntegration.d.ts.map