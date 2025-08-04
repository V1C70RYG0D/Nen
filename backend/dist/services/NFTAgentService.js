"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NFTAgentService = void 0;
const web3_js_1 = require("@solana/web3.js");
const uuid_1 = require("uuid");
class NFTAgentService {
    logger;
    agentRegistry = new Map();
    constructor(logger) {
        this.logger = logger;
        this.logger.info('NFT Agent Service initialized');
    }
    async mintAIAgent(request) {
        try {
            this.logger.info('Minting new AI Agent NFT', {
                creator: request.creatorWallet,
                name: request.agentName,
                personality: request.personalityId
            });
            await this.validateMintingRequest(request);
            const agentId = (0, uuid_1.v4)();
            const mintAddress = this.generateMockMintAddress();
            const metadata = await this.generateAgentMetadata(request);
            const agentConfig = {
                personalityId: request.personalityId,
                skillLevel: 50,
                specializations: this.extractSpecializations(request.customizations),
                trainingGames: 0,
                winRate: 0,
                eloRating: 1200,
                customizations: {
                    openingPreferences: request.customizations.openingPreferences || [],
                    playingStyle: request.customizations.playingStyle || {},
                    trainedAgainst: []
                }
            };
            const stats = {
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
            const agentNFT = {
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
            this.agentRegistry.set(agentId, agentNFT);
            await this.simulateMintTransaction(agentNFT);
            this.logger.info('AI Agent NFT minted successfully', {
                agentId,
                mint: mintAddress,
                owner: request.creatorWallet,
                name: request.agentName
            });
            return agentNFT;
        }
        catch (error) {
            this.logger.error('Failed to mint AI Agent NFT', {
                request,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async updateAgentStats(agentId, gameResult, gameData) {
        try {
            const agent = this.agentRegistry.get(agentId);
            if (!agent) {
                throw new Error(`Agent not found: ${agentId}`);
            }
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
            agent.agentConfig.winRate = agent.stats.wins / agent.stats.gamesPlayed;
            const eloChange = this.calculateEloChange(gameResult, agent.agentConfig.eloRating);
            agent.agentConfig.eloRating += eloChange;
            const totalTime = agent.stats.averageGameTime * (agent.stats.gamesPlayed - 1) + gameData.gameDuration;
            agent.stats.averageGameTime = totalTime / agent.stats.gamesPlayed;
            if (gameData.tacticalMoves && gameData.totalMoves) {
                const tacticalAccuracy = gameData.tacticalMoves / gameData.totalMoves;
                agent.stats.performanceMetrics.tacticalAccuracy =
                    (agent.stats.performanceMetrics.tacticalAccuracy * 0.9) + (tacticalAccuracy * 0.1);
            }
            if (gameData.earnings) {
                agent.stats.totalEarnings += gameData.earnings;
            }
            agent.agentConfig.skillLevel = Math.min(100, Math.max(1, Math.floor(agent.agentConfig.eloRating / 20)));
            agent.lastUpdated = new Date();
            await this.updateMetadataAttributes(agent);
            this.logger.info('Agent stats updated', {
                agentId,
                gameResult,
                newElo: agent.agentConfig.eloRating,
                winRate: agent.agentConfig.winRate,
                skillLevel: agent.agentConfig.skillLevel
            });
        }
        catch (error) {
            this.logger.error('Failed to update agent stats', {
                agentId,
                gameResult,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async listAgentForSale(agentId, price, ownerWallet) {
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
                price: price / web3_js_1.LAMPORTS_PER_SOL,
                owner: ownerWallet
            });
        }
        catch (error) {
            this.logger.error('Failed to list agent for sale', {
                agentId,
                price,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async purchaseAgent(agentId, buyerWallet, offeredPrice) {
        try {
            const agent = this.agentRegistry.get(agentId);
            if (!agent) {
                throw new Error(`Agent not found: ${agentId}`);
            }
            if (!agent.isListed || !agent.listPrice) {
                throw new Error('Agent is not listed for sale');
            }
            if (offeredPrice < agent.listPrice) {
                throw new Error(`Offered price too low. Listed price: ${agent.listPrice / web3_js_1.LAMPORTS_PER_SOL} SOL`);
            }
            if (agent.owner === buyerWallet) {
                throw new Error('Cannot purchase your own agent');
            }
            const marketplaceFee = Math.floor(offeredPrice * 0.025);
            const sellerProceeds = offeredPrice - marketplaceFee;
            const tradingRecord = {
                transactionId: (0, uuid_1.v4)(),
                fromWallet: agent.owner,
                toWallet: buyerWallet,
                price: offeredPrice,
                timestamp: new Date(),
                marketplaceFee
            };
            const previousOwner = agent.owner;
            agent.owner = buyerWallet;
            agent.isListed = false;
            delete agent.listPrice;
            agent.lastUpdated = new Date();
            agent.tradingHistory.push(tradingRecord);
            await this.simulatePaymentProcessing(previousOwner, sellerProceeds, marketplaceFee);
            this.logger.info('Agent purchased successfully', {
                agentId,
                previousOwner,
                newOwner: buyerWallet,
                price: offeredPrice / web3_js_1.LAMPORTS_PER_SOL,
                marketplaceFee: marketplaceFee / web3_js_1.LAMPORTS_PER_SOL
            });
            return tradingRecord;
        }
        catch (error) {
            this.logger.error('Failed to purchase agent', {
                agentId,
                buyerWallet,
                offeredPrice,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    getAgent(agentId) {
        return this.agentRegistry.get(agentId);
    }
    getAgentsByOwner(ownerWallet) {
        return Array.from(this.agentRegistry.values())
            .filter(agent => agent.owner === ownerWallet);
    }
    getListedAgents() {
        return Array.from(this.agentRegistry.values())
            .filter(agent => agent.isListed)
            .sort((a, b) => (a.listPrice || 0) - (b.listPrice || 0));
    }
    getTopAgents(limit = 10) {
        return Array.from(this.agentRegistry.values())
            .filter(agent => agent.stats.gamesPlayed >= 5)
            .sort((a, b) => b.agentConfig.eloRating - a.agentConfig.eloRating)
            .slice(0, limit);
    }
    async validateMintingRequest(request) {
        if (!request.agentName || request.agentName.length < 3) {
            throw new Error('Agent name must be at least 3 characters');
        }
        if (!request.description || request.description.length < 10) {
            throw new Error('Description must be at least 10 characters');
        }
        if (!request.personalityId) {
            throw new Error('Personality ID is required');
        }
        const existingNames = Array.from(this.agentRegistry.values())
            .map(agent => agent.metadata.name.toLowerCase());
        if (existingNames.includes(request.agentName.toLowerCase())) {
            throw new Error('Agent name already exists');
        }
    }
    generateMockMintAddress() {
        return `Agent${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    }
    async generateAgentMetadata(request) {
        const attributes = [
            { trait_type: 'Personality', value: request.personalityId },
            { trait_type: 'Creator', value: request.creatorWallet },
            { trait_type: 'Skill Level', value: 50, display_type: 'number' },
            { trait_type: 'ELO Rating', value: 1200, display_type: 'number' },
            { trait_type: 'Games Played', value: 0, display_type: 'number' },
            { trait_type: 'Win Rate', value: 0, display_type: 'boost_percentage' }
        ];
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
    extractSpecializations(customizations) {
        const specializations = [];
        if (customizations.aggressiveness > 0.7)
            specializations.push('aggressive');
        if (customizations.defensiveness > 0.7)
            specializations.push('defensive');
        if (customizations.tacticalFocus > 0.7)
            specializations.push('tactical');
        if (customizations.openingSpecialist)
            specializations.push('opening_specialist');
        if (customizations.endgameSpecialist)
            specializations.push('endgame_specialist');
        return specializations;
    }
    async simulateMintTransaction(agent) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.logger.debug('Simulated mint transaction', {
            mint: agent.mint,
            owner: agent.owner
        });
    }
    calculateEloChange(result, _currentElo) {
        const K = 32;
        const expectedScore = 0.5;
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
        return Math.round(K * (actualScore - expectedScore));
    }
    async updateMetadataAttributes(agent) {
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
    async simulatePaymentProcessing(seller, amount, fee) {
        await new Promise(resolve => setTimeout(resolve, 500));
        this.logger.debug('Simulated payment processing', {
            seller,
            amount: amount / web3_js_1.LAMPORTS_PER_SOL,
            fee: fee / web3_js_1.LAMPORTS_PER_SOL
        });
    }
    getMarketplaceStats() {
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
            topAgent: agents.reduce((top, agent) => agent.agentConfig.eloRating > (top?.agentConfig.eloRating || 0) ? agent : top, null)
        };
    }
}
exports.NFTAgentService = NFTAgentService;
//# sourceMappingURL=NFTAgentService.js.map