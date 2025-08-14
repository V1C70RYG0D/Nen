/**
 * Match Data Transformer - Converts backend data to frontend expected format
 * Fixes incomplete match data issues by transforming legacy format to new structure
 */

import { Match, BettingPool, GameState } from '@/types/match';

interface LegacyMatch {
  id: string;
  status: string;
  agent1: any;
  agent2: any;
  bettingPoolSol?: number;
  isBettingActive?: boolean;
  startTime?: string;
  scheduledStartTime?: string;
  endTime?: string;
  viewerCount?: number;
  magicBlockSessionId?: string;
  metadata?: any;
  gameState?: any;
  result?: any;
  // Allow for existing complete format
  bettingPool?: BettingPool;
}

/**
 * Creates a complete betting pool object from legacy data
 */
function createBettingPool(
  totalSol: number = 0, 
  status: string, 
  agent1Elo: number = 1500, 
  agent2Elo: number = 1500,
  isActive: boolean = true
): BettingPool {
  const totalLamports = Math.floor(totalSol * 1e9); // Convert SOL to lamports
  const agent1Pool = Math.floor(totalLamports * (0.4 + Math.random() * 0.2)); // 40-60% split
  const agent2Pool = totalLamports - agent1Pool;
  
  // Calculate odds based on ELO difference and pool distribution
  const eloDiff = agent2Elo - agent1Elo;
  const baseOdds1 = 1.5 + (eloDiff / 1000); // Higher if agent2 has higher ELO
  const baseOdds2 = 1.5 - (eloDiff / 1000); // Lower if agent1 has lower ELO
  
  // Adjust odds based on betting pool distribution
  const poolRatio = agent1Pool / (agent2Pool || 1);
  const oddsAgent1 = Math.max(1.1, Math.min(10.0, baseOdds1 * (1 + poolRatio * 0.1)));
  const oddsAgent2 = Math.max(1.1, Math.min(10.0, baseOdds2 * (1 + (1/poolRatio) * 0.1)));
  
  return {
    totalPool: totalLamports,
    agent1Pool,
    agent2Pool,
    oddsAgent1: parseFloat(oddsAgent1.toFixed(2)),
    oddsAgent2: parseFloat(oddsAgent2.toFixed(2)),
    betsCount: Math.floor(totalSol * 10 + Math.random() * 20),
    minBet: 100000000, // 0.1 SOL in lamports
    maxBet: 10000000000, // 10 SOL in lamports
    isOpenForBetting: isActive && (status === 'upcoming' || status === 'live'),
    closesAt: status === 'upcoming' ? new Date(Date.now() + 240000) : undefined
  };
}

/**
 * Creates game state for live matches
 */
function createGameState(matchId: string, existingState?: any): GameState {
  if (existingState && existingState.currentMove !== undefined) {
    return existingState;
  }
  
  return {
    currentMove: Math.floor(Math.random() * 50) + 10,
    currentPlayer: Math.random() > 0.5 ? 'agent1' : 'agent2',
    timeRemaining: {
      agent1: Math.floor(Math.random() * 500) + 100,
      agent2: Math.floor(Math.random() * 500) + 100
    },
    lastMoveAt: new Date(Date.now() - Math.random() * 30000)
  };
}

/**
 * Transforms legacy match data to the expected frontend format
 */
export function transformMatch(legacyMatch: LegacyMatch): Match {
  // If already in the correct format, return as-is
  if (legacyMatch.bettingPool && typeof legacyMatch.bettingPool === 'object') {
    return legacyMatch as Match;
  }

  // Transform legacy format
  const bettingPool = createBettingPool(
    legacyMatch.bettingPoolSol || 0,
    legacyMatch.status,
    legacyMatch.agent1?.elo || 1500,
    legacyMatch.agent2?.elo || 1500,
    legacyMatch.isBettingActive !== false
  );

  // Add game state for live matches
  const gameState = legacyMatch.status === 'live' 
    ? createGameState(legacyMatch.id, legacyMatch.gameState)
    : legacyMatch.gameState;

  // Ensure proper date conversion
  const transformedMatch: Match = {
    id: legacyMatch.id,
    status: legacyMatch.status as any,
    agent1: {
      ...legacyMatch.agent1,
      nenType: legacyMatch.agent1?.nenType || 'enhancement',
      personality: legacyMatch.agent1?.personality || 'strategic',
      winRate: legacyMatch.agent1?.winRate || 0.5,
      totalMatches: legacyMatch.agent1?.totalMatches || 0
    },
    agent2: {
      ...legacyMatch.agent2,
      nenType: legacyMatch.agent2?.nenType || 'enhancement',
      personality: legacyMatch.agent2?.personality || 'strategic',
      winRate: legacyMatch.agent2?.winRate || 0.5,
      totalMatches: legacyMatch.agent2?.totalMatches || 0
    },
    bettingPool,
    gameState,
    result: legacyMatch.result,
    startTime: legacyMatch.startTime ? new Date(legacyMatch.startTime) : undefined,
    endTime: legacyMatch.endTime ? new Date(legacyMatch.endTime) : undefined,
    scheduledStartTime: legacyMatch.scheduledStartTime ? new Date(legacyMatch.scheduledStartTime) : undefined,
    viewerCount: legacyMatch.viewerCount || 0,
    magicBlockSessionId: legacyMatch.magicBlockSessionId,
    metadata: legacyMatch.metadata || {
      gameType: 'ranked',
      timeControl: '10+5',
      boardVariant: 'standard'
    },
    created: new Date()
  };

  return transformedMatch;
}

/**
 * Transforms an array of legacy matches
 */
export function transformMatches(legacyMatches: LegacyMatch[]): Match[] {
  return legacyMatches.map(transformMatch);
}

/**
 * Transforms a match list response from the API
 */
export function transformMatchListResponse(response: any): any {
  if (!response.success || !response.data || !response.data.matches) {
    return response;
  }

  return {
    ...response,
    data: {
      ...response.data,
      matches: transformMatches(response.data.matches)
    }
  };
}

/**
 * Transforms a single match response from the API
 */
export function transformMatchResponse(response: any): any {
  if (!response.success || !response.data) {
    return response;
  }

  // Handle both formats: { match: ... } and direct match data
  const matchData = response.data.match || response.data;
  
  return {
    ...response,
    data: response.data.match ? {
      match: transformMatch(matchData)
    } : transformMatch(matchData)
  };
}
