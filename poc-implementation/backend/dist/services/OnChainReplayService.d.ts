/**
 * On-Chain Replay Service
 * Handles fetching and managing match replays stored on MagicBlock rollups
 *
 * Features:
 * - Fetch match replays from MagicBlock ephemeral rollups
 * - Filter replays by various criteria (opponent, date, result, opening)
 * - Validate replay data integrity
 * - Integration with Solana devnet for real on-chain data
 */
export interface MatchReplay {
    replayId: string;
    sessionId: string;
    matchDate: Date;
    playerWhite: string;
    playerBlack: string;
    aiAgentId?: string;
    result: 'white_wins' | 'black_wins' | 'draw';
    totalMoves: number;
    gameLength: number;
    openingName: string;
    openingMoves: string[];
    merkleRoot: string;
    rollupAddress: string;
    devnetTxHash: string;
    moves: MatchMove[];
    metadata: {
        averageThinkTime: number;
        complexity: number;
        gamePhase: 'opening' | 'midgame' | 'endgame';
        quality: 'low' | 'medium' | 'high';
    };
}
export interface MatchMove {
    moveNumber: number;
    player: 'white' | 'black';
    notation: string;
    fromPosition: {
        x: number;
        y: number;
        level: number;
    };
    toPosition: {
        x: number;
        y: number;
        level: number;
    };
    pieceType: string;
    timestamp: number;
    thinkTime: number;
}
export interface ReplayFilter {
    agentId?: string;
    opponent?: string;
    dateFrom?: Date;
    dateTo?: Date;
    result?: 'white_wins' | 'black_wins' | 'draw' | 'any';
    opening?: string;
    minMoves?: number;
    maxMoves?: number;
    gamePhase?: 'opening' | 'midgame' | 'endgame' | 'any';
    quality?: 'low' | 'medium' | 'high' | 'any';
    limit?: number;
    offset?: number;
}
export interface TrainingDataParams {
    focusArea: 'openings' | 'midgame' | 'endgame' | 'all';
    intensity: 'low' | 'medium' | 'high';
    maxMatches: number;
    learningRate?: number;
    batchSize?: number;
    epochs?: number;
}
declare class OnChainReplayService {
    private connection;
    private dbService;
    private magicBlockEndpoint;
    constructor();
    /**
     * Fetch match replays for a specific AI agent from on-chain sources
     */
    getAgentReplays(agentId: string, filter?: ReplayFilter): Promise<MatchReplay[]>;
    /**
     * Get available openings for filtering
     */
    getAvailableOpenings(agentId: string): Promise<string[]>;
    /**
     * Validate training parameters before processing
     */
    validateTrainingParams(params: TrainingDataParams): void;
    /**
     * Process selected replays into training data format
     */
    processReplaysForTraining(replayIds: string[], params: TrainingDataParams): Promise<{
        sessionId: string;
        trainingData: any;
        replayCount: number;
        estimatedDuration: number;
    }>;
    /**
     * Fetch replay statistics for UI display
     */
    getReplayStatistics(agentId: string): Promise<{
        totalReplays: number;
        winRate: number;
        averageGameLength: number;
        openingsPlayed: number;
        lastActivity: Date | null;
    }>;
    private validateAgentOwnership;
    private queryDatabaseReplays;
    private enrichReplayFromMagicBlock;
    private applyReplayFilters;
    private getReplayData;
    private extractTrainingMoves;
    private calculateTrainingDuration;
    private getDefaultLearningRate;
    private getDefaultBatchSize;
    private getDefaultEpochs;
    private determineGamePhase;
    private determineGameQuality;
}
export declare const getOnChainReplayService: () => OnChainReplayService;
export { OnChainReplayService };
//# sourceMappingURL=OnChainReplayService.d.ts.map