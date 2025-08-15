/**
 * Test Data Fixtures
 *
 * Provides factory functions for creating test data
 */

import { v4 as uuidv4 } from 'uuid';

export interface TestUser {
  username: string;
  email: string;
  walletAddress?: string;
}

export interface TestMatch {
  matchType: 'ai_vs_ai' | 'player_vs_ai' | 'player_vs_player';
  aiAgent1Id?: string;
  aiAgent2Id?: string;
  player1Id?: string;
  player2Id?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  betAmount?: number;
}

export interface TestAgent {
  name: string;
  type: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  attributes?: Record<string, any>;
}

let testDatabase: {
  users: Map<string, TestUser & { id: string }>;
  matches: Map<string, TestMatch & { id: string; createdAt: string }>;
  agents: Map<string, TestAgent & { id: string; tokenId: string }>;
} = {
  users: new Map(),
  matches: new Map(),
  agents: new Map()
};

/**
 * Creates a test user with realistic data
 */
export async function createTestUser(userData: TestUser): Promise<string> {
  const userId = uuidv4();
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
export async function createTestMatch(matchData: TestMatch): Promise<string> {
  const matchId = uuidv4();
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
export async function createTestAgent(agentData: TestAgent): Promise<string> {
  const agentId = uuidv4();
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
export function getTestUser(userId: string) {
  return testDatabase.users.get(userId);
}

/**
 * Gets test match by ID
 */
export function getTestMatch(matchId: string) {
  return testDatabase.matches.get(matchId);
}

/**
 * Gets test agent by ID
 */
export function getTestAgent(agentId: string) {
  return testDatabase.agents.get(agentId);
}

/**
 * Gets all test users
 */
export function getAllTestUsers() {
  return Array.from(testDatabase.users.values());
}

/**
 * Gets all test matches
 */
export function getAllTestMatches() {
  return Array.from(testDatabase.matches.values());
}

/**
 * Gets all test agents
 */
export function getAllTestAgents() {
  return Array.from(testDatabase.agents.values());
}

/**
 * Clears all test data
 */
export function clearTestData() {
  testDatabase.users.clear();
  testDatabase.matches.clear();
  testDatabase.agents.clear();
}

/**
 * Creates sample test data for comprehensive testing
 */
export async function createSampleData() {
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
function initializeGungiBoard(): any[][] {
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
function calculateAgentPrice(rarity: string): number {
  const basePrices = {
    common: 0.5,
    uncommon: 1.5,
    rare: 5.0,
    epic: 15.0,
    legendary: 50.0
  };

  const basePrice = basePrices[rarity as keyof typeof basePrices] || 1.0;
  // Add some randomness (±20%)
  const variance = 0.8 + Math.random() * 0.4;
  return Math.round(basePrice * variance * 100) / 100;
}

/**
 * Creates betting pool data for testing
 */
export function createTestBettingPool(matchId: string) {
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
export function createTestBettingHistory(userId: string) {
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
export function createTestNFTCollection(userId: string) {
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
