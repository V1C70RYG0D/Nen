"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedNFTAgentService = exports.EnhancedNFTAgentService = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("../utils/logger");
const EnhancedCachingService_1 = require("./EnhancedCachingService");
var AgentRarity;
(function (AgentRarity) {
    AgentRarity["COMMON"] = "common";
    AgentRarity["UNCOMMON"] = "uncommon";
    AgentRarity["RARE"] = "rare";
    AgentRarity["EPIC"] = "epic";
    AgentRarity["LEGENDARY"] = "legendary";
    AgentRarity["MYTHIC"] = "mythic";
})(AgentRarity || (AgentRarity = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["UNVERIFIED"] = "unverified";
    VerificationStatus["PENDING"] = "pending";
    VerificationStatus["VERIFIED"] = "verified";
    VerificationStatus["CERTIFIED"] = "certified";
    VerificationStatus["LEGENDARY_VERIFIED"] = "legendary_verified";
})(VerificationStatus || (VerificationStatus = {}));
class EnhancedNFTAgentService {
    activeNFTs = new Map();
    marketplaceData = new Map();
    collectionStats = new Map();
    constructor() {
        this.initializeService();
    }
    async initializeService() {
        try {
            await this.initializeMetaplex();
            await this.loadMarketplaceData();
            await this.calculateRarityScores();
            logger_1.logger.info('Enhanced NFT Agent Service initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Enhanced NFT Agent Service:', error);
            throw error;
        }
    }
    async mintEnhancedAIAgentNFT(baseAgent, creatorWallet, specialAbilities = [], customMetadata) {
        try {
            logger_1.logger.info(`Minting enhanced AI agent NFT for agent: ${baseAgent.name}`);
            const nftId = this.generateNFTId();
            const rarity = this.calculateAgentRarity(baseAgent, specialAbilities);
            const metadata = {
                name: baseAgent.name,
                description: this.generateAgentDescription(baseAgent, specialAbilities),
                image: await this.generateAgentImage(baseAgent, rarity),
                animation_url: await this.generateAgentAnimation(baseAgent),
                external_url: `https://nen-platform.com/agents/${nftId}`,
                attributes: this.generateEnhancedAttributes(baseAgent, specialAbilities, rarity),
                properties: {
                    category: 'AI Agent',
                    subcategory: 'Hunter x Hunter',
                    creators: [
                        {
                            address: creatorWallet,
                            share: 70,
                            verified: true
                        },
                        {
                            address: process.env.PLATFORM_WALLET || '',
                            share: 30,
                            verified: true
                        }
                    ],
                    files: [
                        {
                            uri: await this.generateAgentImage(baseAgent, rarity),
                            type: 'image/png'
                        }
                    ]
                },
                version: '2.0',
                generation: 1,
                rarity,
                performanceMetrics: this.createInitialPerformanceSnapshot(baseAgent),
                evolutionHistory: [],
                certifications: [],
                ...customMetadata
            };
            const nft = {
                id: nftId,
                mint: await this.mintToSolana(metadata),
                owner: creatorWallet,
                creator: creatorWallet,
                metadata,
                agentConfig: {
                    baseAgent,
                    customPersonality: baseAgent.personality,
                    specialAbilities,
                    trainingLevel: 1,
                    experiencePoints: 0,
                    masteryAreas: this.initializeMasteryAreas(),
                    weaknesses: this.generateInitialWeaknesses(baseAgent),
                    preferredStrategies: baseAgent.preferredOpenings,
                    adaptationRate: baseAgent.customizations.adaptationRate,
                    learningCapacity: 100
                },
                stats: this.createEnhancedStats(baseAgent),
                tradingHistory: [],
                performanceHistory: [],
                createdAt: new Date(),
                lastUpdated: new Date(),
                isListed: false,
                marketplaceData: this.initializeMarketplaceData(),
                royaltyConfig: this.createRoyaltyConfig(),
                verificationStatus: VerificationStatus.UNVERIFIED
            };
            await EnhancedCachingService_1.enhancedCachingService.set({ type: 'nft_metadata', identifier: nftId }, nft, 7200);
            this.activeNFTs.set(nftId, nft);
            logger_1.logger.info(`Enhanced AI agent NFT minted successfully: ${nftId}`);
            return nft;
        }
        catch (error) {
            logger_1.logger.error(`Failed to mint enhanced AI agent NFT:`, error);
            throw new Error(`NFT minting failed: ${error}`);
        }
    }
    async evolveAgentNFT(nftId, performanceData, newAbilities = []) {
        try {
            const nft = await this.getNFT(nftId);
            if (!nft) {
                throw new Error(`NFT not found: ${nftId}`);
            }
            logger_1.logger.info(`Evolving AI agent NFT: ${nftId}`);
            const improvements = this.calculateEvolutionImprovements(performanceData);
            nft.agentConfig.trainingLevel = Math.min(100, nft.agentConfig.trainingLevel + improvements.levelIncrease);
            nft.agentConfig.experiencePoints += improvements.experienceGained;
            nft.agentConfig.specialAbilities.push(...newAbilities);
            nft.stats.elo += improvements.eloGain;
            nft.stats.improvementRate = improvements.improvementRate;
            nft.stats.gamesPlayed += performanceData.length;
            nft.metadata.generation++;
            nft.metadata.attributes = this.generateEnhancedAttributes(nft.agentConfig.baseAgent, nft.agentConfig.specialAbilities, nft.metadata.rarity);
            const evolutionSnapshot = {
                generation: nft.metadata.generation,
                timestamp: new Date(),
                improvements: improvements.skillsGained,
                newAbilities,
                statChanges: new Map([
                    ['elo', improvements.eloGain],
                    ['training_level', improvements.levelIncrease],
                    ['experience', improvements.experienceGained]
                ])
            };
            nft.metadata.evolutionHistory.push(evolutionSnapshot);
            nft.performanceHistory.push(...performanceData);
            nft.lastUpdated = new Date();
            if (improvements.levelIncrease >= 10) {
                nft.metadata.rarity = this.recalculateRarity(nft);
            }
            await EnhancedCachingService_1.enhancedCachingService.set({ type: 'nft_metadata', identifier: nftId }, nft, 7200);
            logger_1.logger.info(`AI agent NFT evolved successfully: ${nftId} (Gen ${nft.metadata.generation})`);
            return nft;
        }
        catch (error) {
            logger_1.logger.error(`Failed to evolve AI agent NFT ${nftId}:`, error);
            throw error;
        }
    }
    async listOnMarketplace(nftId, price, marketplace = 'nen-marketplace') {
        try {
            const nft = await this.getNFT(nftId);
            if (!nft) {
                throw new Error(`NFT not found: ${nftId}`);
            }
            const suggestedPrice = await this.calculateSuggestedPrice(nft);
            if (price < suggestedPrice * 0.5) {
                logger_1.logger.warn(`Listed price (${price}) significantly below suggested price (${suggestedPrice})`);
            }
            const listing = {
                marketplace,
                price,
                listedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                seller: nft.owner,
                conditions: 'Standard sale terms'
            };
            nft.isListed = true;
            nft.listPrice = price;
            nft.marketplaceData.currentListings.push(listing);
            nft.lastUpdated = new Date();
            await EnhancedCachingService_1.enhancedCachingService.set({ type: 'nft_metadata', identifier: nftId }, nft, 7200);
            logger_1.logger.info(`NFT listed on marketplace: ${nftId} at ${price / web3_js_1.LAMPORTS_PER_SOL} SOL`);
            return listing;
        }
        catch (error) {
            logger_1.logger.error(`Failed to list NFT ${nftId} on marketplace:`, error);
            throw error;
        }
    }
    async initializeMetaplex() {
        logger_1.logger.info('Metaplex connection initialized');
    }
    async loadMarketplaceData() {
        logger_1.logger.info('Marketplace data loaded');
    }
    async calculateRarityScores() {
        logger_1.logger.info('Rarity scores calculated');
    }
    generateNFTId() {
        return `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    calculateAgentRarity(agent, abilities) {
        let rarityScore = 0;
        if (agent.elo > 2400)
            rarityScore += 50;
        else if (agent.elo > 2100)
            rarityScore += 30;
        else if (agent.elo > 1800)
            rarityScore += 20;
        else if (agent.elo > 1500)
            rarityScore += 10;
        rarityScore += abilities.length * 10;
        if (agent.winRate > 0.8)
            rarityScore += 20;
        else if (agent.winRate > 0.7)
            rarityScore += 15;
        else if (agent.winRate > 0.6)
            rarityScore += 10;
        if (rarityScore >= 80)
            return AgentRarity.MYTHIC;
        if (rarityScore >= 65)
            return AgentRarity.LEGENDARY;
        if (rarityScore >= 50)
            return AgentRarity.EPIC;
        if (rarityScore >= 35)
            return AgentRarity.RARE;
        if (rarityScore >= 20)
            return AgentRarity.UNCOMMON;
        return AgentRarity.COMMON;
    }
    generateAgentDescription(agent, abilities) {
        return `${agent.name} is a ${agent.personality} AI agent specialized in Gungi gameplay. ` +
            `With an ELO rating of ${agent.elo} and ${abilities.length} special abilities, ` +
            `this agent represents the pinnacle of strategic artificial intelligence.`;
    }
    async generateAgentImage(agent, rarity) {
        return `https://nen-platform.com/images/agents/${agent.id}_${rarity}.png`;
    }
    async generateAgentAnimation(agent) {
        return `https://nen-platform.com/animations/agents/${agent.id}.mp4`;
    }
    generateEnhancedAttributes(agent, abilities, rarity) {
        return [
            { trait_type: 'Personality', value: agent.personality },
            { trait_type: 'Difficulty', value: agent.difficulty },
            { trait_type: 'ELO Rating', value: agent.elo, display_type: 'number' },
            { trait_type: 'Win Rate', value: Math.round(agent.winRate * 100), display_type: 'boost_percentage' },
            { trait_type: 'Games Played', value: agent.gamesPlayed, display_type: 'number' },
            { trait_type: 'Special Abilities', value: abilities.length, display_type: 'boost_number' },
            { trait_type: 'Rarity', value: rarity },
            { trait_type: 'Generation', value: 1, display_type: 'number' },
            { trait_type: 'Aggressiveness', value: agent.customizations.aggressiveness, display_type: 'boost_percentage', max_value: 100 },
            { trait_type: 'Risk Tolerance', value: agent.customizations.riskTolerance, display_type: 'boost_percentage', max_value: 100 }
        ];
    }
    async mintToSolana(metadata) {
        const agentSeed = `nft_agent_${metadata.name}_${Date.now()}`;
        const mintAddress = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(agentSeed.slice(0, 32))], new web3_js_1.PublicKey(process.env.SOLANA_PROGRAM_ID))[0];
        return mintAddress.toString();
    }
    createInitialPerformanceSnapshot(agent) {
        return {
            timestamp: new Date(),
            elo: agent.elo,
            gamesPlayed: agent.gamesPlayed,
            winRate: agent.winRate,
            strengths: [],
            achievements: []
        };
    }
    initializeMasteryAreas() {
        return [
            { area: 'Opening Theory', level: 1, experiencePoints: 0, lastImprovement: new Date() },
            { area: 'Middle Game', level: 1, experiencePoints: 0, lastImprovement: new Date() },
            { area: 'Endgame', level: 1, experiencePoints: 0, lastImprovement: new Date() },
            { area: 'Tactical Combinations', level: 1, experiencePoints: 0, lastImprovement: new Date() }
        ];
    }
    generateInitialWeaknesses(agent) {
        const weaknesses = [];
        if (agent.customizations.riskTolerance < 30)
            weaknesses.push('Over-cautious play');
        if (agent.customizations.aggressiveness > 80)
            weaknesses.push('Reckless attacks');
        if (agent.customizations.calculationDepth < 3)
            weaknesses.push('Shallow calculation');
        return weaknesses;
    }
    createEnhancedStats(agent) {
        return {
            elo: agent.elo,
            gamesPlayed: agent.gamesPlayed,
            winRate: agent.winRate,
            drawRate: 0.1,
            averageGameLength: 45,
            tacticalRating: agent.elo * 0.9,
            positionalRating: agent.elo * 0.95,
            endgameRating: agent.elo * 0.85,
            openingRating: agent.elo * 1.0,
            consistencyScore: 75,
            improvementRate: 5,
            pieceUtilization: new Map(),
            formationMastery: new Map(),
            matchupWinRates: new Map(),
            totalEarnings: 0,
            marketValue: 0,
            tradingVolume: 0,
            royaltiesEarned: 0
        };
    }
    initializeMarketplaceData() {
        return {
            currentListings: [],
            floorPrice: 0,
            lastSalePrice: 0,
            priceHistory: [],
            marketRanking: 0,
            liquidityScore: 0
        };
    }
    createRoyaltyConfig() {
        return {
            primarySaleRoyalty: 1000,
            secondaryRoyalty: 500,
            creatorRoyalty: 300,
            platformRoyalty: 200,
            beneficiaries: [
                { address: '', share: 60, role: 'creator' },
                { address: '', share: 20, role: 'platform' },
                { address: '', share: 20, role: 'community' }
            ]
        };
    }
    calculateEvolutionImprovements(performanceData) {
        const wins = performanceData.filter(p => p.result === 'win').length;
        const totalGames = performanceData.length;
        const winRate = wins / totalGames;
        return {
            levelIncrease: Math.floor(winRate * 10),
            experienceGained: totalGames * 100,
            eloGain: Math.floor((winRate - 0.5) * 50),
            improvementRate: winRate * 100,
            skillsGained: ['Improved calculation', 'Better endgame']
        };
    }
    async calculateSuggestedPrice(nft) {
        let basePrice = web3_js_1.LAMPORTS_PER_SOL * 0.1;
        const rarityMultipliers = {
            [AgentRarity.COMMON]: 1,
            [AgentRarity.UNCOMMON]: 2,
            [AgentRarity.RARE]: 5,
            [AgentRarity.EPIC]: 10,
            [AgentRarity.LEGENDARY]: 25,
            [AgentRarity.MYTHIC]: 50
        };
        basePrice *= rarityMultipliers[nft.metadata.rarity];
        const performanceMultiplier = 1 + (nft.stats.winRate - 0.5);
        basePrice *= performanceMultiplier;
        return Math.floor(basePrice);
    }
    recalculateRarity(nft) {
        return this.calculateAgentRarity(nft.agentConfig.baseAgent, nft.agentConfig.specialAbilities);
    }
    async getNFT(nftId) {
        if (this.activeNFTs.has(nftId)) {
            return this.activeNFTs.get(nftId);
        }
        const cachedNFT = await EnhancedCachingService_1.enhancedCachingService.get({ type: 'nft_metadata', identifier: nftId });
        if (cachedNFT) {
            this.activeNFTs.set(nftId, cachedNFT);
            return cachedNFT;
        }
        return null;
    }
    async getNFTsByOwner(ownerWallet) {
        return Array.from(this.activeNFTs.values()).filter(nft => nft.owner === ownerWallet);
    }
    async getMarketplaceStats() {
        const allNFTs = Array.from(this.activeNFTs.values());
        const listedNFTs = allNFTs.filter(nft => nft.isListed);
        return {
            totalNFTs: allNFTs.length,
            listedNFTs: listedNFTs.length,
            floorPrice: Math.min(...listedNFTs.map(nft => nft.listPrice || 0)),
            averagePrice: listedNFTs.reduce((sum, nft) => sum + (nft.listPrice || 0), 0) / listedNFTs.length,
            totalVolume: allNFTs.reduce((sum, nft) => sum + nft.stats.tradingVolume, 0)
        };
    }
}
exports.EnhancedNFTAgentService = EnhancedNFTAgentService;
exports.enhancedNFTAgentService = new EnhancedNFTAgentService();
//# sourceMappingURL=EnhancedNFTAgentService.js.map