/**
 * Enhanced AI Customization Service
 *
 * Implements advanced AI features as specified in POC Master Plan:
 * - Advanced personality systems with learning algorithms
 * - Performance tracking and evolution mechanics
 * - User-defined customizations (personalities, openings, styles)
 * - Real-time inference optimization for <50ms execution via MagicBlock
 * - Comprehensive fraud detection for AI decisions
 * - NFT-tradeable agents with verified performance metrics
 *

 * - Real implementations over simulations
 * - Production-ready with comprehensive error handling
 * - Modular design with single responsibility
 */
import { GameState, Move, PieceType } from './GungiGameEngine';
export declare enum AIPersonality {
    AGGRESSIVE = "aggressive",
    DEFENSIVE = "defensive",
    BALANCED = "balanced",
    TACTICAL = "tactical",
    HUNTER = "hunter",
    CALCULATOR = "calculator"
}
export declare enum AIDifficulty {
    EASY = "easy",
    MEDIUM = "medium",
    HARD = "hard",
    EXPERT = "expert",
    GRANDMASTER = "grandmaster"
}
export interface AIAgent {
    id: string;
    name: string;
    personality: AIPersonality;
    difficulty: AIDifficulty;
    elo: number;
    gamesPlayed: number;
    winRate: number;
    averageMovesPerGame: number;
    preferredOpenings: string[];
    learningEnabled: boolean;
    nftTokenId?: string;
    customizations: AICustomizations;
    performanceMetrics: PerformanceMetrics;
    fraudDetection: FraudDetectionConfig;
    createdAt: Date;
    lastUpdated: Date;
}
export interface AICustomizations {
    aggressiveness: number;
    riskTolerance: number;
    calculationDepth: number;
    adaptationRate: number;
    specializations: PieceType[];
    avoidancePatterns: string[];
    favoriteFormations: string[];
    timeManagement: number;
}
export interface PerformanceMetrics {
    totalMoves: number;
    averageThinkingTime: number;
    accuracyScore: number;
    improvementRate: number;
    strengths: string[];
    weaknesses: string[];
    recentPerformance: number[];
    evolutionHistory: EvolutionPoint[];
}
export interface EvolutionPoint {
    timestamp: Date;
    elo: number;
    learningEvent: string;
    improvement: number;
}
export interface FraudDetectionConfig {
    enabled: boolean;
    maxMovesPerSecond: number;
    suspiciousPatternThreshold: number;
    minimumThinkingTime: number;
    maximumAccuracy: number;
}
export interface MoveAnalysis {
    move: Move;
    confidence: number;
    calculatedDepth: number;
    alternatives: Move[];
    reasoning: string;
    riskAssessment: number;
    expectedOutcome: number;
}
export declare class EnhancedAICustomizationService {
    private activeAgents;
    private trainingSession;
    private readonly maxConcurrentTraining;
    constructor();
    private initializeService;
    /**
     * Create a new customized AI agent
     */
    createCustomAIAgent(name: string, personality: AIPersonality, difficulty: AIDifficulty, customizations: Partial<AICustomizations>, userId?: string): Promise<AIAgent>;
    /**
     * Generate AI move with enhanced decision-making
     */
    generateEnhancedMove(agentId: string, gameState: GameState, timeLimit?: number): Promise<MoveAnalysis>;
    /**
     * Train AI agent with evolutionary algorithms
     */
    trainAgent(agentId: string, trainingGames?: number, opponentAgents?: string[]): Promise<EvolutionPoint>;
    private calculateBestMove;
    private performFraudDetection;
    private updateAgentPerformance;
    private loadPredefinedAgents;
    private initializeLearningEngine;
    private generateAgentId;
    private calculateInitialElo;
    private getDefaultOpenings;
    private mergeCustomizations;
    private initializePerformanceMetrics;
    private getDefaultFraudDetection;
    private generateBoardHash;
    private wrapMoveInAnalysis;
    private generatePossibleMoves;
    private scoreMove;
    private getDifficultyMultiplier;
    private getPersonalityScore;
    private calculateConfidence;
    private generateMoveReasoning;
    private assessMoveRisk;
    private simulateTraining;
    private applyLearningResults;
    private getAgent;
    /**
     * Get all available AI agents
     */
    getAllAgents(): Promise<AIAgent[]>;
    /**
     * Get agent performance statistics
     */
    getAgentStats(agentId: string): Promise<PerformanceMetrics | null>;
}
export declare const enhancedAICustomizationService: EnhancedAICustomizationService;
//# sourceMappingURL=EnhancedAICustomizationService.d.ts.map