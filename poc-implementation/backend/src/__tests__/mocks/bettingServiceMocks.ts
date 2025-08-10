/**
 * Mock Implementations for Betting Services
 */

import { v4 as uuidv4 } from 'uuid';

// Mock data structures
export interface BetData {
  id: string;
  matchId: string;
  bettorWallet: string;
  amount: number;
  predictedWinner: string;
  predictedWinnerType: string;
  odds: number;
  placedAt: Date;
  status: 'active' | 'settled' | 'cancelled';
  potentialPayout: number;
  escrowAccount: string;
}

export interface BettingPool {
  matchId: string;
  totalPool: number;
  betsCount: number;
  isActive: boolean;
  bets: BetData[];
  createdAt: Date;
}

// Mock Enhanced Betting Service
export class MockEnhancedBettingService {
  private activePools: Map<string, BettingPool> = new Map();
  private minBetAmount = 0.1 * 1e9; // 0.1 SOL in lamports
  private maxBetAmount = 100 * 1e9; // 100 SOL in lamports

  async createBettingPool(matchId: string): Promise<BettingPool> {
    const pool: BettingPool = {
      matchId,
      totalPool: 0,
      betsCount: 0,
      isActive: true,
      bets: [],
      createdAt: new Date()
    };

    this.activePools.set(matchId, pool);
    return pool;
  }

  async getBettingPool(matchId: string): Promise<BettingPool | null> {
    return this.activePools.get(matchId) || null;
  }

  async placeBet(
    bettorWallet: string,
    matchId: string,
    amount: number,
    predictedWinner: string,
    predictedWinnerType: string
  ): Promise<BetData> {
    // Validate inputs
    if (!bettorWallet || !matchId || !amount || !predictedWinner || !predictedWinnerType) {
      throw new Error('Invalid bet parameters');
    }

    // Validate bet amount
    if (amount < this.minBetAmount || amount > this.maxBetAmount) {
      throw new Error(`Bet amount must be between ${this.minBetAmount / 1e9} and ${this.maxBetAmount / 1e9} SOL`);
    }

    // Check if betting pool exists
    const pool = this.activePools.get(matchId);
    if (!pool) {
      throw new Error('Betting pool not found');
    }

    if (!pool.isActive) {
      throw new Error('Betting is closed for this match');
    }

    // Calculate odds (simplified calculation)
    const odds = this.calculateOdds(pool, amount);
    const potentialPayout = Math.floor(amount * odds);

    // Create bet data
    const betData: BetData = {
      id: uuidv4(),
      matchId,
      bettorWallet,
      amount,
      predictedWinner,
      predictedWinnerType,
      odds,
      placedAt: new Date(),
      status: 'active',
      potentialPayout,
      escrowAccount: `escrow-${uuidv4()}`
    };

    // Update pool
    pool.bets.push(betData);
    pool.totalPool += amount;
    pool.betsCount += 1;

    return betData;
  }

  private calculateOdds(pool: BettingPool, betAmount: number): number {
    // Simplified odds calculation
    const totalPool = pool.totalPool + betAmount;
    const odds = totalPool === 0 ? 2.0 : Math.max(1.01, Math.min(10.0, totalPool / (betAmount + 1)));
    return Math.round(odds * 100) / 100; // Round to 2 decimal places
  }

  async closeBettingPool(matchId: string): Promise<void> {
    const pool = this.activePools.get(matchId);
    if (pool) {
      pool.isActive = false;
    }
  }
}

// Mock Optimized Betting Service
export class MockOptimizedBettingService {
  private activePools: Map<string, BettingPool> = new Map();
  private minBetAmount = 0.1; // SOL
  private maxBetAmount = 100; // SOL

  async placeBet(
    bettorWallet: string,
    matchId: string,
    amount: number,
    predictedWinner: string,
    predictedWinnerType: string
  ): Promise<{ success: boolean; betId?: string; message: string; error?: string }> {
    try {
      // Validate bet amount
      if (amount < this.minBetAmount || amount > this.maxBetAmount) {
        return {
          success: false,
          message: 'Bet amount validation failed',
          error: `Bet amount must be between ${this.minBetAmount} and ${this.maxBetAmount} SOL`
        };
      }

      // Check if pool exists or create it
      if (!this.activePools.has(matchId)) {
        const pool: BettingPool = {
          matchId,
          totalPool: 0,
          betsCount: 0,
          isActive: true,
          bets: [],
          createdAt: new Date()
        };
        this.activePools.set(matchId, pool);
      }

      const pool = this.activePools.get(matchId)!;

      if (!pool.isActive) {
        return {
          success: false,
          message: 'Betting failed',
          error: 'Betting is closed for this match'
        };
      }

      // Create bet
      const betId = uuidv4();
      const betData: BetData = {
        id: betId,
        matchId,
        bettorWallet,
        amount: amount * 1e9, // Convert to lamports
        predictedWinner,
        predictedWinnerType,
        odds: 2.0,
        placedAt: new Date(),
        status: 'active',
        potentialPayout: amount * 2 * 1e9,
        escrowAccount: `escrow-${betId}`
      };

      pool.bets.push(betData);
      pool.totalPool += betData.amount;
      pool.betsCount += 1;

      return {
        success: true,
        betId,
        message: 'Bet placed successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Bet placement failed',
        error: error.message
      };
    }
  }

  async getBettingPool(matchId: string): Promise<BettingPool | null> {
    return this.activePools.get(matchId) || null;
  }
}

// Mock Basic Betting Service
export class MockBettingService {
  private bets: BetData[] = [];
  private pools: Map<string, BettingPool> = new Map();

  async createBet(betData: Partial<BetData>): Promise<BetData> {
    const bet: BetData = {
      id: uuidv4(),
      matchId: betData.matchId!,
      bettorWallet: betData.bettorWallet!,
      amount: betData.amount!,
      predictedWinner: betData.predictedWinner!,
      predictedWinnerType: betData.predictedWinnerType!,
      odds: betData.odds || 2.0,
      placedAt: new Date(),
      status: 'active',
      potentialPayout: betData.amount! * (betData.odds || 2.0),
      escrowAccount: `escrow-${uuidv4()}`
    };

    this.bets.push(bet);
    return bet;
  }

  async getBet(betId: string): Promise<BetData | null> {
    return this.bets.find(bet => bet.id === betId) || null;
  }

  async getAllBets(): Promise<BetData[]> {
    return [...this.bets];
  }

  async updateBetStatus(betId: string, status: BetData['status']): Promise<void> {
    const bet = this.bets.find(bet => bet.id === betId);
    if (bet) {
      bet.status = status;
    }
  }
}

// Export mock instances for use in tests
export const mockEnhancedBettingService = new MockEnhancedBettingService();
export const mockOptimizedBettingService = new MockOptimizedBettingService();
export const mockBettingService = new MockBettingService();
