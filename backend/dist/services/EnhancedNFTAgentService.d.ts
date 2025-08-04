import { AIAgent, AIPersonality } from './EnhancedAICustomizationService';
interface EnhancedAIAgentMetadata {
    name: string;
    description: string;
    image: string;
    animation_url?: string;
    external_url?: string;
    attributes: EnhancedAIAgentAttributes[];
    properties: {
        category: 'AI Agent';
        subcategory: 'Hunter x Hunter';
        creators: Array<{
            address: string;
            share: number;
            verified: boolean;
        }>;
        files: Array<{
            uri: string;
            type: string;
        }>;
    };
    version: string;
    generation: number;
    rarity: AgentRarity;
    performanceMetrics: PerformanceSnapshot;
    evolutionHistory: EvolutionSnapshot[];
    certifications: AgentCertification[];
}
interface EnhancedAIAgentAttributes {
    trait_type: string;
    value: string | number;
    display_type?: 'boost_number' | 'boost_percentage' | 'number' | 'date' | 'ranking';
    max_value?: number;
    rarity_score?: number;
}
interface EnhancedAIAgentNFT {
    id: string;
    mint: string;
    owner: string;
    creator: string;
    metadata: EnhancedAIAgentMetadata;
    agentConfig: EnhancedAIAgentConfig;
    stats: EnhancedAIAgentStats;
    tradingHistory: EnhancedTradingRecord[];
    performanceHistory: PerformanceRecord[];
    createdAt: Date;
    lastUpdated: Date;
    isListed: boolean;
    listPrice?: number;
    marketplaceData: MarketplaceData;
    royaltyConfig: RoyaltyConfiguration;
    verificationStatus: VerificationStatus;
}
interface EnhancedAIAgentConfig {
    baseAgent: AIAgent;
    customPersonality: AIPersonality;
    specialAbilities: SpecialAbility[];
    trainingLevel: number;
    experiencePoints: number;
    masteryAreas: MasteryArea[];
    weaknesses: string[];
    preferredStrategies: string[];
    adaptationRate: number;
    learningCapacity: number;
}
interface EnhancedAIAgentStats {
    elo: number;
    gamesPlayed: number;
    winRate: number;
    drawRate: number;
    averageGameLength: number;
    tacticalRating: number;
    positionalRating: number;
    endgameRating: number;
    openingRating: number;
    consistencyScore: number;
    improvementRate: number;
    pieceUtilization: Map<string, number>;
    formationMastery: Map<string, number>;
    matchupWinRates: Map<string, number>;
    totalEarnings: number;
    marketValue: number;
    tradingVolume: number;
    royaltiesEarned: number;
}
declare enum AgentRarity {
    COMMON = "common",
    UNCOMMON = "uncommon",
    RARE = "rare",
    EPIC = "epic",
    LEGENDARY = "legendary",
    MYTHIC = "mythic"
}
declare enum VerificationStatus {
    UNVERIFIED = "unverified",
    PENDING = "pending",
    VERIFIED = "verified",
    CERTIFIED = "certified",
    LEGENDARY_VERIFIED = "legendary_verified"
}
interface SpecialAbility {
    id: string;
    name: string;
    description: string;
    rarity: AgentRarity;
    effect: string;
    cooldown: number;
    unlockLevel: number;
}
interface MasteryArea {
    area: string;
    level: number;
    experiencePoints: number;
    lastImprovement: Date;
}
interface PerformanceSnapshot {
    timestamp: Date;
    elo: number;
    gamesPlayed: number;
    winRate: number;
    strengths: string[];
    achievements: string[];
}
interface EvolutionSnapshot {
    generation: number;
    timestamp: Date;
    improvements: string[];
    newAbilities: SpecialAbility[];
    statChanges: Map<string, number>;
}
interface AgentCertification {
    type: 'performance' | 'rarity' | 'achievement' | 'tournament';
    name: string;
    description: string;
    issuedAt: Date;
    issuer: string;
    verificationHash: string;
}
interface EnhancedTradingRecord {
    id: string;
    from: string;
    to: string;
    price: number;
    timestamp: Date;
    transactionHash: string;
    marketplaceId: string;
    royaltiesPaid: number;
    agentPerformanceAtSale: PerformanceSnapshot;
    saleReason?: string;
    bundledWith?: string[];
}
interface PerformanceRecord {
    timestamp: Date;
    matchId: string;
    opponentType: 'ai' | 'human';
    opponentRating: number;
    result: 'win' | 'loss' | 'draw';
    performanceScore: number;
    improvementPoints: number;
    newSkillsLearned: string[];
}
interface MarketplaceData {
    currentListings: MarketplaceListing[];
    floorPrice: number;
    lastSalePrice: number;
    priceHistory: PricePoint[];
    marketRanking: number;
    liquidityScore: number;
}
interface MarketplaceListing {
    marketplace: string;
    price: number;
    listedAt: Date;
    expiresAt?: Date;
    seller: string;
    conditions?: string;
}
interface PricePoint {
    timestamp: Date;
    price: number;
    volume: number;
}
interface RoyaltyConfiguration {
    primarySaleRoyalty: number;
    secondaryRoyalty: number;
    creatorRoyalty: number;
    platformRoyalty: number;
    beneficiaries: RoyaltyBeneficiary[];
}
interface RoyaltyBeneficiary {
    address: string;
    share: number;
    role: 'creator' | 'platform' | 'trainer' | 'community';
}
export declare class EnhancedNFTAgentService {
    private activeNFTs;
    private marketplaceData;
    private collectionStats;
    constructor();
    private initializeService;
    mintEnhancedAIAgentNFT(baseAgent: AIAgent, creatorWallet: string, specialAbilities?: SpecialAbility[], customMetadata?: Partial<EnhancedAIAgentMetadata>): Promise<EnhancedAIAgentNFT>;
    evolveAgentNFT(nftId: string, performanceData: PerformanceRecord[], newAbilities?: SpecialAbility[]): Promise<EnhancedAIAgentNFT>;
    listOnMarketplace(nftId: string, price: number, marketplace?: string): Promise<MarketplaceListing>;
    private initializeMetaplex;
    private loadMarketplaceData;
    private calculateRarityScores;
    private generateNFTId;
    private calculateAgentRarity;
    private generateAgentDescription;
    private generateAgentImage;
    private generateAgentAnimation;
    private generateEnhancedAttributes;
    private mintToSolana;
    private createInitialPerformanceSnapshot;
    private initializeMasteryAreas;
    private generateInitialWeaknesses;
    private createEnhancedStats;
    private initializeMarketplaceData;
    private createRoyaltyConfig;
    private calculateEvolutionImprovements;
    private calculateSuggestedPrice;
    private recalculateRarity;
    private getNFT;
    getNFTsByOwner(ownerWallet: string): Promise<EnhancedAIAgentNFT[]>;
    getMarketplaceStats(): Promise<any>;
}
export declare const enhancedNFTAgentService: EnhancedNFTAgentService;
export {};
//# sourceMappingURL=EnhancedNFTAgentService.d.ts.map