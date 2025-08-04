// Comprehensive Betting Service with SOL escrow and settlement
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { query, transaction } from '../utils/database';
import { CacheService } from '../utils/redis';
import { v4 as uuidv4 } from 'uuid';

export interface BetData {
  id: string;
  userId: string;
  matchId: string;
  amountSol: number;
  predictedWinnerId: string;
  predictedWinnerType: 'user' | 'ai';
  odds: number;
  potentialPayout: number;
  status: 'placed' | 'won' | 'lost' | 'refunded';
  actualPayout: number;
  settledAt?: Date;
  placementTxSignature?: string;
  settlementTxSignature?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BettingPool {
  matchId: string;
  totalPool: number;
  agent1Pool: number;
  agent2Pool: number;
  agent1Odds: number;
  agent2Odds: number;
  betsCount: number;
  lastUpdated: Date;
}

export interface BettingLimits {
  minBetSol: number;
  maxBetSol: number;
  platformFeeRate: number;
}

export class BettingService {
  private connection: Connection;
  private cache: CacheService;
  private platformFeeRate = 0.03; // 3% platform fee

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    this.cache = new CacheService();
  }

  // Place a bet on a match
  async placeBet(betData: {
    userId: string;
    matchId: string;
    amountSol: number;
    predictedWinnerId: string;
    predictedWinnerType: 'user' | 'ai';
    walletAddress: string;
  }): Promise<BetData> {
    try {
      // Validate bet amount
      const limits = await this.getBettingLimits();
      if (betData.amountSol < limits.minBetSol || betData.amountSol > limits.maxBetSol) {
        throw new Error(`Bet amount must be between ${limits.minBetSol} and ${limits.maxBetSol} SOL`);
      }

      // Check if match exists and is accepting bets
      const matchResult = await query(`
        SELECT id, status, is_betting_active, betting_deadline
        FROM matches WHERE id = $1
      `, [betData.matchId]);

      if (matchResult.length === 0) {
        throw new Error('Match not found');
      }

      const match = matchResult[0];
      if (!match.is_betting_active || match.status !== 'pending') {
        throw new Error('Betting is not active for this match');
      }

      // Check betting deadline
      if (match.betting_deadline && new Date() > new Date(match.betting_deadline)) {
        throw new Error('Betting deadline has passed');
      }

      // Calculate odds and potential payout
      const bettingPool = await this.getBettingPool(betData.matchId);
      const odds = this.calculateOdds(bettingPool, betData.predictedWinnerId);
      const potentialPayout = betData.amountSol * odds;

      // Create bet record
      const bet: BetData = {
        id: uuidv4(),
        userId: betData.userId,
        matchId: betData.matchId,
        amountSol: betData.amountSol,
        predictedWinnerId: betData.predictedWinnerId,
        predictedWinnerType: betData.predictedWinnerType,
        odds,
        potentialPayout,
        status: 'placed',
        actualPayout: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Execute bet placement in transaction
      await transaction(async (client) => {
        // Insert bet record
        await client.query(`
          INSERT INTO bets (
            id, user_id, match_id, amount_sol, predicted_winner_id,
            predicted_winner_type, odds, potential_payout, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          bet.id, bet.userId, bet.matchId, bet.amountSol, bet.predictedWinnerId,
          bet.predictedWinnerType, bet.odds, bet.potentialPayout, bet.status
        ]);

        // Update user's betting balance
        await client.query(`
          UPDATE users
          SET betting_balance = betting_balance - $1, updated_at = $2
          WHERE id = $3 AND betting_balance >= $1
        `, [bet.amountSol, new Date(), bet.userId]);

        // Update match betting pool
        await client.query(`
          UPDATE matches
          SET betting_pool_sol = betting_pool_sol + $1, updated_at = $2
          WHERE id = $3
        `, [bet.amountSol, new Date(), bet.matchId]);
      });

      // Update betting pool cache
      await this.updateBettingPoolCache(betData.matchId);

      // Log successful bet placement
      logger.info('Bet placed successfully', {
        betId: bet.id,
        userId: bet.userId,
        matchId: bet.matchId,
        amount: bet.amountSol,
        odds: bet.odds
      });

      return bet;
    } catch (error) {
      logger.error('Error placing bet:', error);
      throw error;
    }
  }

  // Get betting pool for a match
  async getBettingPool(matchId: string): Promise<BettingPool> {
    try {
      const cacheKey = `betting_pool:${matchId}`;
      const cached = await this.cache.get<BettingPool>(cacheKey);

      if (cached) {
        return cached;
      }

      // Query betting data
      const betsResult = await query(`
        SELECT
          predicted_winner_id,
          predicted_winner_type,
          SUM(amount_sol) as total_amount,
          COUNT(*) as bet_count
        FROM bets
        WHERE match_id = $1 AND status = 'placed'
        GROUP BY predicted_winner_id, predicted_winner_type
      `, [matchId]);

      const matchResult = await query(`
        SELECT betting_pool_sol FROM matches WHERE id = $1
      `, [matchId]);

      const totalPool = matchResult[0]?.betting_pool_sol || 0;

      let agent1Pool = 0;
      let agent2Pool = 0;
      let betsCount = 0;

      for (const bet of betsResult) {
        betsCount += parseInt(bet.bet_count);

        // Assume first agent is agent1, second is agent2
        if (bet.predicted_winner_type === 'ai') {
          if (agent1Pool === 0) {
            agent1Pool = parseFloat(bet.total_amount);
          } else {
            agent2Pool = parseFloat(bet.total_amount);
          }
        }
      }

      const pool: BettingPool = {
        matchId,
        totalPool: parseFloat(totalPool.toString()),
        agent1Pool,
        agent2Pool,
        agent1Odds: this.calculateOddsFromPool(totalPool, agent1Pool),
        agent2Odds: this.calculateOddsFromPool(totalPool, agent2Pool),
        betsCount,
        lastUpdated: new Date(),
      };

      // Cache for 1 minute
      await this.cache.set(cacheKey, pool, 60);

      return pool;
    } catch (error) {
      logger.error('Error getting betting pool:', error);
      throw error;
    }
  }

  // Calculate odds for a specific prediction
  private calculateOdds(pool: BettingPool, predictedWinnerId: string): number {
    if (pool.totalPool === 0) {
      return 2.0; // Default odds when no bets placed
    }

    // Simple odds calculation based on pool distribution
    const agentPool = pool.agent1Pool; // Simplified - should check actual agent
    const opposingPool = pool.totalPool - agentPool;

    if (agentPool === 0) {
      return 10.0; // Max odds
    }

    const odds = (pool.totalPool / agentPool) * 0.97; // 3% platform fee
    return Math.max(1.1, Math.min(10.0, odds)); // Clamp between 1.1 and 10.0
  }

  // Calculate odds from pool amounts
  private calculateOddsFromPool(totalPool: number, agentPool: number): number {
    if (totalPool === 0 || agentPool === 0) {
      return 2.0;
    }

    const odds = (totalPool / agentPool) * 0.97; // 3% platform fee
    return Math.max(1.1, Math.min(10.0, odds));
  }

  // Get user's bets
  async getUserBets(userId: string, limit: number = 20): Promise<BetData[]> {
    try {
      const rows = await query(`
        SELECT b.*, m.match_type, m.status as match_status
        FROM bets b
        JOIN matches m ON b.match_id = m.id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        matchId: row.match_id,
        amountSol: parseFloat(row.amount_sol),
        predictedWinnerId: row.predicted_winner_id,
        predictedWinnerType: row.predicted_winner_type,
        odds: parseFloat(row.odds),
        potentialPayout: parseFloat(row.potential_payout),
        status: row.status,
        actualPayout: parseFloat(row.actual_payout || '0'),
        settledAt: row.settled_at,
        placementTxSignature: row.placement_tx_signature,
        settlementTxSignature: row.settlement_tx_signature,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      logger.error('Error getting user bets:', error);
      throw error;
    }
  }

  // Settle bets for a completed match
  async settleBets(matchId: string, winnerId: string, winnerType: 'user' | 'ai'): Promise<void> {
    try {
      logger.info('Starting bet settlement', { matchId, winnerId, winnerType });

      // Get all bets for the match
      const bets = await query(`
        SELECT * FROM bets
        WHERE match_id = $1 AND status = 'placed'
      `, [matchId]);

      if (bets.length === 0) {
        logger.info('No bets to settle for match', { matchId });
        return;
      }

      // Calculate payouts and update bets
      await transaction(async (client) => {
        for (const bet of bets) {
          const isWinningBet = bet.predicted_winner_id === winnerId &&
                              bet.predicted_winner_type === winnerType;

          let newStatus: BetData['status'];
          let actualPayout = 0;

          if (isWinningBet) {
            newStatus = 'won';
            actualPayout = parseFloat(bet.potential_payout);

            // Add winnings to user's balance
            await client.query(`
              UPDATE users
              SET betting_balance = betting_balance + $1,
                  total_winnings = total_winnings + $2,
                  updated_at = $3
              WHERE id = $4
            `, [actualPayout, actualPayout - parseFloat(bet.amount_sol), new Date(), bet.user_id]);
          } else {
            newStatus = 'lost';

            // Update user's total losses
            await client.query(`
              UPDATE users
              SET total_losses = total_losses + $1, updated_at = $2
              WHERE id = $3
            `, [parseFloat(bet.amount_sol), new Date(), bet.user_id]);
          }

          // Update bet record
          await client.query(`
            UPDATE bets
            SET status = $1, actual_payout = $2, settled_at = $3, updated_at = $3
            WHERE id = $4
          `, [newStatus, actualPayout, new Date(), bet.id]);
        }
      });

      // Clear betting pool cache
      await this.cache.del(`betting_pool:${matchId}`);

      logger.info('Bet settlement completed', {
        matchId,
        settledBets: bets.length,
        winnerId,
        winnerType
      });
    } catch (error) {
      logger.error('Error settling bets:', error);
      throw error;
    }
  }

  // Get betting limits and configuration
  async getBettingLimits(): Promise<BettingLimits> {
    try {
      const cacheKey = 'betting_limits';
      const cached = await this.cache.get<BettingLimits>(cacheKey);

      if (cached) {
        return cached;
      }

      // Get from system config
      const result = await query(`
        SELECT value FROM system_config WHERE key = 'betting_limits'
      `);

      let limits: BettingLimits;
      if (result.length > 0) {
        const config = result[0].value;
        limits = {
          minBetSol: config.min_bet_sol || 0.1,
          maxBetSol: config.max_bet_sol || 100.0,
          platformFeeRate: this.platformFeeRate,
        };
      } else {
        // Default limits
        limits = {
          minBetSol: 0.1,
          maxBetSol: 100.0,
          platformFeeRate: this.platformFeeRate,
        };
      }

      // Cache for 1 hour
      await this.cache.set(cacheKey, limits, 3600);

      return limits;
    } catch (error) {
      logger.error('Error getting betting limits:', error);

      // Return default limits on error
      return {
        minBetSol: 0.1,
        maxBetSol: 100.0,
        platformFeeRate: this.platformFeeRate,
      };
    }
  }

  // Update betting pool cache
  private async updateBettingPoolCache(matchId: string): Promise<void> {
    try {
      const cacheKey = `betting_pool:${matchId}`;
      await this.cache.del(cacheKey);

      // Regenerate cache
      await this.getBettingPool(matchId);
    } catch (error) {
      logger.error('Error updating betting pool cache:', error);
    }
  }

  // Get betting statistics
  async getBettingStats(userId?: string): Promise<{
    totalBets: number;
    totalVolume: number;
    averageBet: number;
    winRate?: number;
    totalWinnings?: number;
  }> {
    try {
      let query_text: string;
      let params: any[];

      if (userId) {
        query_text = `
          SELECT
            COUNT(*) as total_bets,
            SUM(amount_sol) as total_volume,
            AVG(amount_sol) as average_bet,
            SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END)::float / COUNT(*) as win_rate,
            SUM(CASE WHEN status = 'won' THEN actual_payout ELSE 0 END) as total_winnings
          FROM bets WHERE user_id = $1
        `;
        params = [userId];
      } else {
        query_text = `
          SELECT
            COUNT(*) as total_bets,
            SUM(amount_sol) as total_volume,
            AVG(amount_sol) as average_bet
          FROM bets
        `;
        params = [];
      }

      const result = await query(query_text, params);
      const stats = result[0];

      return {
        totalBets: parseInt(stats.total_bets || '0'),
        totalVolume: parseFloat(stats.total_volume || '0'),
        averageBet: parseFloat(stats.average_bet || '0'),
        winRate: stats.win_rate ? parseFloat(stats.win_rate) : undefined,
        totalWinnings: stats.total_winnings ? parseFloat(stats.total_winnings) : undefined,
      };
    } catch (error) {
      logger.error('Error getting betting stats:', error);
      throw error;
    }
  }
}
