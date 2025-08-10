/**
 * NFT Agent Service for Nen Platform POC Phase 2
 * Step 2.4: NFT Agents (Days 38-42)
 *
 * Implements AI agent NFT minting and trading with Metaplex
 * Following GI.md guidelines for production-ready implementation
 */

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Types for NFT Agent system
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
    mint: string; // NFT mint address
    owner: string; // Current owner wallet
    creator: string; // Original creator wallet
    metadata: AIAgentMetadata;
    agentConfig: AIAgentConfig;
    stats: AIAgentStats;
    tradingHistory: TradingRecord[];
    createdAt: Date;
    lastUpdated: Date;
    isListed: boolean;
    listPrice?: number | undefined; // in lamports
}

interface AIAgentConfig {
    personalityId: string;
    skillLevel: number; // 1-100
    specializations: string[]; // e.g., ["aggressive", "endgame", "opening_specialist"]
    trainingGames: number;
    winRate: number;
    eloRating: number;
    customizations: {
        openingPreferences: string[];
        playingStyle: Record<string, number>;
        trainedAgainst: string[]; // IDs of agents trained against
    };
}

interface AIAgentStats {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    averageGameTime: number; // seconds
    lastActiveAt: Date;
    totalEarnings: number; // lamports earned from betting
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
    price: number; // in lamports
    timestamp: Date;
    marketplaceFee: number;
}

interface MintingRequest {
    creatorWallet: string;
    agentName: string;
    description: string;
    personalityId: string;
    customizations: Record<string, any>;
    initialPrice?: number; // listing price in lamports
}

export class NFTAgentService {
    private logger: Logger;
    private agentRegistry: Map<string, AIAgentNFT> = new Map();

    constructor(logger: Logger) {
        this.logger = logger;
        this.logger.info('NFT Agent Service initialized');
    }

    /**
     * Mint a new AI Agent NFT
     */
    async mintAIAgent(request: MintingRequest): Promise<AIAgentNFT> {
        try {
            this.logger.info('Minting new AI Agent NFT', {
                creator: request.creatorWallet,
                name: request.agentName,
                personality: request.personalityId
            });

            // Validate request
            await this.validateMintingRequest(request);

            // Generate unique IDs
            const agentId = uuidv4();
            const mintAddress = this.generateMockMintAddress();

            // Create metadata based on personality and customizations
            const metadata = await this.generateAgentMetadata(request);

            // Create agent configuration
            const agentConfig: AIAgentConfig = {
                personalityId: request.personalityId,
                skillLevel: 50, // Starting skill level
                specializations: this.extractSpecializations(request.customizations),
                trainingGames: 0,
                winRate: 0,
                eloRating: 1200, // Starting ELO
                customizations: {
                    openingPreferences: request.customizations.openingPreferences || [],
                    playingStyle: request.customizations.playingStyle || {},
                    trainedAgainst: []
                }
            };

            // Initialize stats
            const stats: AIAgentStats = {
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                averageGameTime: 0,
                lastActiveAt: new Date(),
                totalEarnings: 0,
                performanceMetrics: {
                    tacticalAccuracy: 0.5,
                    strategicRating: 0.5,
                    endgameStrength: 0.5,
                    openingKnowledge: 0.5
                }
            };

            // Create NFT record
            const agentNFT: AIAgentNFT = {
                id: agentId,
                mint: mintAddress,
                owner: request.creatorWallet,
                creator: request.creatorWallet,
                metadata,
                agentConfig,
                stats,
                tradingHistory: [],
                createdAt: new Date(),
                lastUpdated: new Date(),
                isListed: !!request.initialPrice,
                listPrice: request.initialPrice || undefined
            };

            // Store in registry
            this.agentRegistry.set(agentId, agentNFT);

            // Simulate minting transaction
            await this.simulateMintTransaction(agentNFT);

            this.logger.info('AI Agent NFT minted successfully', {
                agentId,
                mint: mintAddress,
                owner: request.creatorWallet,
                name: request.agentName
            });

            return agentNFT;

        } catch (error) {
            this.logger.error('Failed to mint AI Agent NFT', {
                request,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Update AI agent stats after a game
     */
    async updateAgentStats(
        agentId: string,
        gameResult: 'win' | 'loss' | 'draw',
        gameData: {
            opponent: string;
            gameDuration: number;
            tacticalMoves: number;
            totalMoves: number;
            earnings?: number;
        }
    ): Promise<void> {
        try {
            const agent = this.agentRegistry.get(agentId);
            if (!agent) {
                throw new Error(`Agent not found: ${agentId}`);
            }

            // Update basic stats
            agent.stats.gamesPlayed += 1;
            agent.stats.lastActiveAt = new Date();

            switch (gameResult) {
                case 'win':
                    agent.stats.wins += 1;
                    break;
                case 'loss':
                    agent.stats.losses += 1;
                    break;
                case 'draw':
                    agent.stats.draws += 1;
                    break;
            }

            // Update calculated stats
            agent.agentConfig.winRate = agent.stats.wins / agent.stats.gamesPlayed;

            // Update ELO (simplified calculation)
            const eloChange = this.calculateEloChange(gameResult, agent.agentConfig.eloRating);
            agent.agentConfig.eloRating += eloChange;

            // Update average game time
            const totalTime = agent.stats.averageGameTime * (agent.stats.gamesPlayed - 1) + gameData.gameDuration;
            agent.stats.averageGameTime = totalTime / agent.stats.gamesPlayed;

            // Update performance metrics
            if (gameData.tacticalMoves && gameData.totalMoves) {
                const tacticalAccuracy = gameData.tacticalMoves / gameData.totalMoves;
                agent.stats.performanceMetrics.tacticalAccuracy =
                    (agent.stats.performanceMetrics.tacticalAccuracy * 0.9) + (tacticalAccuracy * 0.1);
            }

            // Update earnings
            if (gameData.earnings) {
                agent.stats.totalEarnings += gameData.earnings;
            }

            // Update skill level based on performance
            agent.agentConfig.skillLevel = Math.min(100, Math.max(1,
                Math.floor(agent.agentConfig.eloRating / 20)
            ));

            agent.lastUpdated = new Date();

            // Update metadata attributes to reflect new stats
            await this.updateMetadataAttributes(agent);

            this.logger.info('Agent stats updated', {
                agentId,
                gameResult,
                newElo: agent.agentConfig.eloRating,
                winRate: agent.agentConfig.winRate,
                skillLevel: agent.agentConfig.skillLevel
            });

        } catch (error) {
            this.logger.error('Failed to update agent stats', {
                agentId,
                gameResult,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * List agent for sale on marketplace
     */
    async listAgentForSale(agentId: string, price: number, ownerWallet: string): Promise<void> {
        try {
            const agent = this.agentRegistry.get(agentId);
            if (!agent) {
                throw new Error(`Agent not found: ${agentId}`);
            }

            if (agent.owner !== ownerWallet) {
                throw new Error('Only the owner can list the agent for sale');
            }

            agent.isListed = true;
            agent.listPrice = price;
            agent.lastUpdated = new Date();

            this.logger.info('Agent listed for sale', {
                agentId,
                price: price / LAMPORTS_PER_SOL,
                owner: ownerWallet
            });

        } catch (error) {
            this.logger.error('Failed to list agent for sale', {
                agentId,
                price,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Purchase agent from marketplace
     */
    async purchaseAgent(
        agentId: string,
        buyerWallet: string,
        offeredPrice: number
    ): Promise<TradingRecord> {
        try {
            const agent = this.agentRegistry.get(agentId);
            if (!agent) {
                throw new Error(`Agent not found: ${agentId}`);
            }

            if (!agent.isListed || !agent.listPrice) {
                throw new Error('Agent is not listed for sale');
            }

            if (offeredPrice < agent.listPrice) {
                throw new Error(`Offered price too low. Listed price: ${agent.listPrice / LAMPORTS_PER_SOL} SOL`);
            }

            if (agent.owner === buyerWallet) {
                throw new Error('Cannot purchase your own agent');
            }

            // Calculate marketplace fee (2.5%)
            const marketplaceFee = Math.floor(offeredPrice * 0.025);
            const sellerProceeds = offeredPrice - marketplaceFee;

            // Create trading record
            const tradingRecord: TradingRecord = {
                transactionId: uuidv4(),
                fromWallet: agent.owner,
                toWallet: buyerWallet,
                price: offeredPrice,
                timestamp: new Date(),
                marketplaceFee
            };

            // Transfer ownership
            const previousOwner = agent.owner;
            agent.owner = buyerWallet;
            agent.isListed = false;
            delete (agent as any).listPrice;
            agent.lastUpdated = new Date();
            agent.tradingHistory.push(tradingRecord);

            // Simulate payment processing
            await this.simulatePaymentProcessing(previousOwner, sellerProceeds, marketplaceFee);

            this.logger.info('Agent purchased successfully', {
                agentId,
                previousOwner,
                newOwner: buyerWallet,
                price: offeredPrice / LAMPORTS_PER_SOL,
                marketplaceFee: marketplaceFee / LAMPORTS_PER_SOL
            });

            return tradingRecord;

        } catch (error) {
            this.logger.error('Failed to purchase agent', {
                agentId,
                buyerWallet,
                offeredPrice,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Get agent by ID
     */
    getAgent(agentId: string): AIAgentNFT | undefined {
        return this.agentRegistry.get(agentId);
    }

    /**
     * Get agents owned by wallet
     */
    getAgentsByOwner(ownerWallet: string): AIAgentNFT[] {
        return Array.from(this.agentRegistry.values())
            .filter(agent => agent.owner === ownerWallet);
    }

    /**
     * Get listed agents (marketplace)
     */
    getListedAgents(): AIAgentNFT[] {
        return Array.from(this.agentRegistry.values())
            .filter(agent => agent.isListed)
            .sort((a, b) => (a.listPrice || 0) - (b.listPrice || 0));
    }

    /**
     * Get top performing agents
     */
    getTopAgents(limit: number = 10): AIAgentNFT[] {
        return Array.from(this.agentRegistry.values())
            .filter(agent => agent.stats.gamesPlayed >= 5) // Minimum games for ranking
            .sort((a, b) => b.agentConfig.eloRating - a.agentConfig.eloRating)
            .slice(0, limit);
    }

    // Private helper methods

    private async validateMintingRequest(request: MintingRequest): Promise<void> {
        if (!request.agentName || request.agentName.length < 3) {
            throw new Error('Agent name must be at least 3 characters');
        }

        if (!request.description || request.description.length < 10) {
            throw new Error('Description must be at least 10 characters');
        }

        if (!request.personalityId) {
            throw new Error('Personality ID is required');
        }

        // Check for duplicate names (simplified)
        const existingNames = Array.from(this.agentRegistry.values())
            .map(agent => agent.metadata.name.toLowerCase());

        if (existingNames.includes(request.agentName.toLowerCase())) {
            throw new Error('Agent name already exists');
        }
    }

    private generateMockMintAddress(): string {
        // In real implementation, this would be the actual Solana mint address
        return `Agent${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    }

    private async generateAgentMetadata(request: MintingRequest): Promise<AIAgentMetadata> {
        const attributes: AIAgentAttributes[] = [
            { trait_type: 'Personality', value: request.personalityId },
            { trait_type: 'Creator', value: request.creatorWallet },
            { trait_type: 'Skill Level', value: 50, display_type: 'number' },
            { trait_type: 'ELO Rating', value: 1200, display_type: 'number' },
            { trait_type: 'Games Played', value: 0, display_type: 'number' },
            { trait_type: 'Win Rate', value: 0, display_type: 'boost_percentage' }
        ];

        // Add custom attributes based on personality
        if (request.customizations.aggressiveness) {
            attributes.push({
                trait_type: 'Aggressiveness',
                value: Math.round(request.customizations.aggressiveness * 100),
                display_type: 'number'
            });
        }

        return {
            name: request.agentName,
            description: request.description,
            image: `https://nen-platform.com/api/agent-avatar/${request.personalityId}`,
            attributes,
            properties: {
                category: 'AI Agent',
                creators: [{
                    address: request.creatorWallet,
                    share: 100
                }]
            },
            external_url: `https://nen-platform.com/agent/${request.agentName}`
        };
    }

    private extractSpecializations(customizations: Record<string, any>): string[] {
        const specializations: string[] = [];

        if (customizations.aggressiveness > 0.7) specializations.push('aggressive');
        if (customizations.defensiveness > 0.7) specializations.push('defensive');
        if (customizations.tacticalFocus > 0.7) specializations.push('tactical');
        if (customizations.openingSpecialist) specializations.push('opening_specialist');
        if (customizations.endgameSpecialist) specializations.push('endgame_specialist');

        return specializations;
    }

    private async simulateMintTransaction(agent: AIAgentNFT): Promise<void> {
        // Simulate blockchain transaction time
        await new Promise(resolve => setTimeout(resolve, 1000));

        this.logger.debug('Simulated mint transaction', {
            mint: agent.mint,
            owner: agent.owner
        });
    }

    private calculateEloChange(result: 'win' | 'loss' | 'draw', _currentElo: number): number {
        const K = 32; // K-factor for ELO calculation
        const expectedScore = 0.5; // Simplified - assume equal opponents

        let actualScore: number;
        switch (result) {
            case 'win': actualScore = 1; break;
            case 'loss': actualScore = 0; break;
            case 'draw': actualScore = 0.5; break;
        }

        return Math.round(K * (actualScore - expectedScore));
    }

    private async updateMetadataAttributes(agent: AIAgentNFT): Promise<void> {
        // Update dynamic attributes in metadata
        agent.metadata.attributes = agent.metadata.attributes.map(attr => {
            switch (attr.trait_type) {
                case 'Skill Level':
                    return { ...attr, value: agent.agentConfig.skillLevel };
                case 'ELO Rating':
                    return { ...attr, value: agent.agentConfig.eloRating };
                case 'Games Played':
                    return { ...attr, value: agent.stats.gamesPlayed };
                case 'Win Rate':
                    return { ...attr, value: Math.round(agent.agentConfig.winRate * 100) };
                default:
                    return attr;
            }
        });
    }

    private async simulatePaymentProcessing(
        seller: string,
        amount: number,
        fee: number
    ): Promise<void> {
        // Simulate payment processing time
        await new Promise(resolve => setTimeout(resolve, 500));

        this.logger.debug('Simulated payment processing', {
            seller,
            amount: amount / LAMPORTS_PER_SOL,
            fee: fee / LAMPORTS_PER_SOL
        });
    }

    /**
     * Get marketplace statistics
     */
    getMarketplaceStats(): any {
        const agents = Array.from(this.agentRegistry.values());
        const listedAgents = agents.filter(agent => agent.isListed);
        const tradingHistory = agents.flatMap(agent => agent.tradingHistory);

        return {
            totalAgents: agents.length,
            listedAgents: listedAgents.length,
            totalTrades: tradingHistory.length,
            totalVolume: tradingHistory.reduce((sum, trade) => sum + trade.price, 0),
            averagePrice: tradingHistory.length > 0
                ? tradingHistory.reduce((sum, trade) => sum + trade.price, 0) / tradingHistory.length
                : 0,
            topAgent: agents.reduce((top, agent) =>
                agent.agentConfig.eloRating > (top?.agentConfig.eloRating || 0) ? agent : top,
                null as AIAgentNFT | null
            )
        };
    }
}
