"use strict";
/**
 * Test Data Fixtures
 *
 * Provides factory functions for creating test data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestUser = createTestUser;
exports.createTestMatch = createTestMatch;
exports.createTestAgent = createTestAgent;
exports.getTestUser = getTestUser;
exports.getTestMatch = getTestMatch;
exports.getTestAgent = getTestAgent;
exports.getAllTestUsers = getAllTestUsers;
exports.getAllTestMatches = getAllTestMatches;
exports.getAllTestAgents = getAllTestAgents;
exports.clearTestData = clearTestData;
exports.createSampleData = createSampleData;
exports.createTestBettingPool = createTestBettingPool;
exports.createTestBettingHistory = createTestBettingHistory;
exports.createTestNFTCollection = createTestNFTCollection;
const uuid_1 = require("uuid");
let testDatabase = {
    users: new Map(),
    matches: new Map(),
    agents: new Map()
};
/**
 * Creates a test user with realistic data
 */
async function createTestUser(userData) {
    const userId = (0, uuid_1.v4)();
    const user = {
        id: userId,
        ...userData,
        walletAddress: userData.walletAddress || `wallet_${userId.slice(0, 8)}`,
        createdAt: new Date().toISOString()
    };
    testDatabase.users.set(userId, user);
    return userId;
}
/**
 * Creates a test match with realistic data
 */
async function createTestMatch(matchData) {
    const matchId = (0, uuid_1.v4)();
    const match = {
        id: matchId,
        ...matchData,
        createdAt: new Date().toISOString(),
        gameState: {
            board: initializeGungiBoard(),
            currentPlayer: 'player1',
            moveHistory: [],
            captures: { player1: [], player2: [] },
            gamePhase: 'placement'
        }
    };
    testDatabase.matches.set(matchId, match);
    return matchId;
}
/**
 * Creates a test agent/NFT with realistic data
 */
async function createTestAgent(agentData) {
    const agentId = (0, uuid_1.v4)();
    const tokenId = `nft_${agentData.type}_${Date.now()}${Math.random().toString(36).substring(2, 7)}`;
    const agent = {
        id: agentId,
        tokenId,
        ...agentData,
        attributes: {
            winRate: 0.65 + Math.random() * 0.3, // 65-95% win rate
            elo: 1200 + Math.random() * 800, // 1200-2000 ELO
            matchesPlayed: Math.floor(Math.random() * 1000),
            ...agentData.attributes
        },
        price: calculateAgentPrice(agentData.rarity),
        isListed: true,
        createdAt: new Date().toISOString()
    };
    testDatabase.agents.set(agentId, agent);
    return agentId;
}
/**
 * Gets test user by ID
 */
function getTestUser(userId) {
    return testDatabase.users.get(userId);
}
/**
 * Gets test match by ID
 */
function getTestMatch(matchId) {
    return testDatabase.matches.get(matchId);
}
/**
 * Gets test agent by ID
 */
function getTestAgent(agentId) {
    return testDatabase.agents.get(agentId);
}
/**
 * Gets all test users
 */
function getAllTestUsers() {
    return Array.from(testDatabase.users.values());
}
/**
 * Gets all test matches
 */
function getAllTestMatches() {
    return Array.from(testDatabase.matches.values());
}
/**
 * Gets all test agents
 */
function getAllTestAgents() {
    return Array.from(testDatabase.agents.values());
}
/**
 * Clears all test data
 */
function clearTestData() {
    testDatabase.users.clear();
    testDatabase.matches.clear();
    testDatabase.agents.clear();
}
/**
 * Creates sample test data for comprehensive testing
 */
async function createSampleData() {
    // Create sample users
    const user1 = await createTestUser({
        username: 'alice_gungi_master',
        email: 'alice@nen.platform'
    });
    const user2 = await createTestUser({
        username: 'bob_strategist',
        email: 'bob@nen.platform'
    });
    // Create sample agents
    const agent1 = await createTestAgent({
        name: 'Royal Guard Alpha',
        type: 'agent',
        rarity: 'rare',
        attributes: {
            specialization: 'defensive',
            winRate: 0.82,
            elo: 1750
        }
    });
    const agent2 = await createTestAgent({
        name: 'Phantom Striker',
        type: 'agent',
        rarity: 'epic',
        attributes: {
            specialization: 'aggressive',
            winRate: 0.78,
            elo: 1680
        }
    });
    // Create sample matches
    const match1 = await createTestMatch({
        matchType: 'ai_vs_ai',
        aiAgent1Id: agent1,
        aiAgent2Id: agent2,
        status: 'active'
    });
    const match2 = await createTestMatch({
        matchType: 'player_vs_ai',
        player1Id: user1,
        aiAgent1Id: agent1,
        status: 'pending'
    });
    return {
        users: [user1, user2],
        agents: [agent1, agent2],
        matches: [match1, match2]
    };
}
/**
 * Initializes a Gungi board for testing
 */
function initializeGungiBoard() {
    const board = Array(9).fill(null).map(() => Array(9).fill(null));
    // Place some initial pieces for realistic testing
    board[0][0] = { piece: 'fortress', tier: 1, player: 'player1' };
    board[0][8] = { piece: 'fortress', tier: 1, player: 'player1' };
    board[8][0] = { piece: 'fortress', tier: 1, player: 'player2' };
    board[8][8] = { piece: 'fortress', tier: 1, player: 'player2' };
    return board;
}
/**
 * Calculates agent price based on rarity
 */
function calculateAgentPrice(rarity) {
    const basePrices = {
        common: 0.5,
        uncommon: 1.5,
        rare: 5.0,
        epic: 15.0,
        legendary: 50.0
    };
    const basePrice = basePrices[rarity] || 1.0;
    // Add some randomness (±20%)
    const variance = 0.8 + Math.random() * 0.4;
    return Math.round(basePrice * variance * 100) / 100;
}
/**
 * Creates betting pool data for testing
 */
function createTestBettingPool(matchId) {
    return {
        gameId: matchId,
        totalPool: 12.5,
        pools: [
            {
                agentId: 'royal_guard_alpha',
                agentName: 'Royal Guard Alpha',
                totalBets: 7.5,
                odds: 1.67,
                bettors: 12
            },
            {
                agentId: 'phantom_striker',
                agentName: 'Phantom Striker',
                totalBets: 5.0,
                odds: 2.50,
                bettors: 8
            }
        ],
        lastUpdated: new Date().toISOString()
    };
}
/**
 * Creates user betting history for testing
 */
function createTestBettingHistory(userId) {
    return [
        {
            betId: `bet_${userId}_001`,
            gameId: 'game_demo_001',
            agentId: 'royal_guard_alpha',
            amount: 2.5,
            odds: 1.85,
            status: 'won',
            payout: 4.625,
            placedAt: new Date(Date.now() - 86400000).toISOString(),
            settledAt: new Date(Date.now() - 82800000).toISOString()
        },
        {
            betId: `bet_${userId}_002`,
            gameId: 'game_demo_002',
            agentId: 'phantom_striker',
            amount: 1.0,
            odds: 2.30,
            status: 'lost',
            payout: 0,
            placedAt: new Date(Date.now() - 43200000).toISOString(),
            settledAt: new Date(Date.now() - 39600000).toISOString()
        }
    ];
}
/**
 * Creates NFT collection data for testing
 */
function createTestNFTCollection(userId) {
    return [
        {
            tokenId: `nft_agent_${userId}_001`,
            name: 'Custom Strategic Agent',
            type: 'agent',
            rarity: 'uncommon',
            attributes: {
                winRate: 0.68,
                elo: 1520,
                customizations: ['opening_book_basic', 'endgame_training']
            },
            acquiredAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            isListed: false
        },
        {
            tokenId: `nft_cosmetic_${userId}_001`,
            name: 'Golden Piece Set',
            type: 'cosmetic',
            rarity: 'rare',
            attributes: {
                pieceStyle: 'golden',
                boardTheme: 'classical'
            },
            acquiredAt: new Date(Date.now() - 14 * 86400000).toISOString(),
            isListed: false
        }
    ];
}
//# sourceMappingURL=testData.js.map