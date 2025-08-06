/**
 * NFT Agent Service for Nen Platform POC Phase 2
 * Step 2.4: NFT Agents (Days 38-42)
 *
 * Implements AI agent NFT minting and trading with Metaplex
 * Following GI.md guidelines for production-ready implementation
 */
import { Logger } from 'winston';
interface AIAgentMetadata {
    name: string;
    description: string;
    image: string;
    attributes: AIAgentAttributes[];
    properties: {
        category: 'AI Agent';
        creators: Array<{
            address: string;
            share: number;
        }>;
    };
    external_url?: string;
    animation_url?: string;
}
interface AIAgentAttributes {
    trait_type: string;
    value: string | number;
    display_type?: 'boost_number' | 'boost_percentage' | 'number' | 'date';
}
interface AIAgentNFT {
    id: string;
    mint: string;
    owner: string;
    creator: string;
    metadata: AIAgentMetadata;
    agentConfig: AIAgentConfig;
    stats: AIAgentStats;
    tradingHistory: TradingRecord[];
    createdAt: Date;
    lastUpdated: Date;
    isListed: boolean;
    listPrice?: number | undefined;
}
interface AIAgentConfig {
    personalityId: string;
    skillLevel: number;
    specializations: string[];
    trainingGames: number;
    winRate: number;
    eloRating: number;
    customizations: {
        openingPreferences: string[];
        playingStyle: Record<string, number>;
        trainedAgainst: string[];
    };
}
interface AIAgentStats {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    averageGameTime: number;
    lastActiveAt: Date;
    totalEarnings: number;
    performanceMetrics: {
        tacticalAccuracy: number;
        strategicRating: number;
        endgameStrength: number;
        openingKnowledge: number;
    };
}
interface TradingRecord {
    transactionId: string;
    fromWallet: string;
    toWallet: string;
    price: number;
    timestamp: Date;
    marketplaceFee: number;
}
interface MintingRequest {
    creatorWallet: string;
    agentName: string;
    description: string;
    personalityId: string;
    customizations: Record<string, any>;
    initialPrice?: number;
}
export declare class NFTAgentService {
    private logger;
    private agentRegistry;
    constructor(logger: Logger);
    /**
     * Mint a new AI Agent NFT
     */
    mintAIAgent(request: MintingRequest): Promise<AIAgentNFT>;
    /**
     * Update AI agent stats after a game
     */
    updateAgentStats(agentId: string, gameResult: 'win' | 'loss' | 'draw', gameData: {
        opponent: string;
        gameDuration: number;
        tacticalMoves: number;
        totalMoves: number;
        earnings?: number;
    }): Promise<void>;
    /**
     * List agent for sale on marketplace
     */
    listAgentForSale(agentId: string, price: number, ownerWallet: string): Promise<void>;
    /**
     * Purchase agent from marketplace
     */
    purchaseAgent(agentId: string, buyerWallet: string, offeredPrice: number): Promise<TradingRecord>;
    /**
     * Get agent by ID
     */
    getAgent(agentId: string): AIAgentNFT | undefined;
    /**
     * Get agents owned by wallet
     */
    getAgentsByOwner(ownerWallet: string): AIAgentNFT[];
    /**
     * Get listed agents (marketplace)
     */
    getListedAgents(): AIAgentNFT[];
    /**
     * Get top performing agents
     */
    getTopAgents(limit?: number): AIAgentNFT[];
    private validateMintingRequest;
    private generateMockMintAddress;
    private generateAgentMetadata;
    private extractSpecializations;
    private simulateMintTransaction;
    private calculateEloChange;
    private updateMetadataAttributes;
    private simulatePaymentProcessing;
    /**
     * Get marketplace statistics
     */
    getMarketplaceStats(): any;
}
export {};
//# sourceMappingURL=NFTAgentService.d.ts.map