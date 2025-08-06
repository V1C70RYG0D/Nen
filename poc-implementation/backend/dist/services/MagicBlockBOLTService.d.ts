import { PublicKey, Connection } from '@solana/web3.js';
import winston from 'winston';
interface AnchorProvider {
    wallet: {
        publicKey: PublicKey;
    };
}
export declare enum GeographicRegion {
    AMERICAS = "us-east-1",
    EUROPE = "eu-west-1",
    AUTO = "auto"
}
export declare enum PerformanceLevel {
    STANDARD = 1,
    ENHANCED = 2,
    ULTRA = 3
}
export interface PositionComponent {
    x: number;
    y: number;
    level: number;
    entityId: string;
}
export interface PieceComponent {
    pieceType: PieceType;
    owner: number;
    hasMoved: boolean;
    captured: boolean;
    entityId: string;
}
export interface AIAgentComponent {
    personality: PersonalityType;
    skillLevel: number;
    gamesPlayed: number;
    winRate: number;
    entityId: string;
}
export declare enum PieceType {
    Marshal = "Marshal",
    General = "General",
    Lieutenant = "Lieutenant",
    Major = "Major",
    Minor = "Minor",
    Shinobi = "Shinobi",
    Bow = "Bow"
}
export declare enum PersonalityType {
    Aggressive = "Aggressive",
    Defensive = "Defensive",
    Balanced = "Balanced"
}
export interface MoveData {
    fromX: number;
    fromY: number;
    fromLevel: number;
    toX: number;
    toY: number;
    toLevel: number;
    pieceType: PieceType;
    player: number;
    moveHash: string;
    timestamp: number;
}
export interface SessionConfig {
    timeControl: number;
    region: string;
    allowSpectators: boolean;
    tournamentMode: boolean;
}
export interface PerformanceMetrics {
    averageMoveLatency: number;
    totalMoves: number;
    peakLatency: number;
    errorCount: number;
    lastUpdateTime: number;
}
export declare class MagicBlockBOLTService {
    private connection;
    private provider;
    private program;
    private logger;
    private sessionCache;
    private performanceTracker;
    private geographicRegion;
    private performanceLevel;
    constructor(connection: Connection, provider: AnchorProvider, logger: winston.Logger);
    private initializeBOLTService;
    createEnhancedSession(sessionId: string, player1: PublicKey, player2: PublicKey | null, config: SessionConfig, region: string): Promise<string>;
    private initializeBOLTWorldOptimized;
    private initializeBOLTWorld;
    private getGungiStartingPosition;
    private getOptimizedStartingPosition;
    private generateEntityIdsOptimized;
    private generateEntityIds;
    submitMoveEnhanced(sessionId: string, moveData: MoveData, playerId: PublicKey, antiFraudToken: Uint8Array): Promise<{
        success: boolean;
        moveHash: string;
        latency: number;
    }>;
    private validateMoveBOLTECS;
    private findPieceAtPosition;
    private validatePieceMovement;
    private applyMoveToBOLTECS;
    private generateMoveHash;
    private updatePerformanceMetrics;
    private updateErrorMetrics;
    private emitBOLTUpdate;
    private startPerformanceMonitoring;
    getSessionMetrics(sessionId: string): PerformanceMetrics | null;
    deployToEphemeralRollup(sessionId: string): Promise<{
        rollupId: string;
        endpoint: string;
    }>;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=MagicBlockBOLTService.d.ts.map