import { logger } from '../utils/logger';
import { getDatabase } from '../config/database';
import { getRedisClient } from '../config/redis';

// Service interfaces
export interface GameService {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  
  // Game management
  createMatch(players: string[], options?: any): Promise<any>;
  getMatch(matchId: string): Promise<any>;
  updateMatch(matchId: string, data: any): Promise<any>;
  endMatch(matchId: string, result: any): Promise<any>;
  
  // Move processing
  validateMove(matchId: string, move: any, playerId: string): Promise<boolean>;
  processMove(matchId: string, move: any, playerId: string): Promise<any>;
  
  // Game state
  getGameState(matchId: string): Promise<any>;
  updateGameState(matchId: string, state: any): Promise<any>;
  
  // Utilities
  getActiveMatches(): Promise<any[]>;
  getMatchHistory(playerId: string, limit?: number): Promise<any[]>;
  getStats(): Promise<any>;
  
  // Additional methods
  startMatch(matchId: string): Promise<any>;
  makeMove(matchId: string, move: any): Promise<any>;
}

export interface BettingService {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  
  // Betting pool management
  createBettingPool(matchId: string, options?: any): Promise<any>;
  getBettingPool(matchId: string): Promise<any>;
  closeBettingPool(matchId: string): Promise<any>;
  
  // Bet processing
  placeBet(userId: string, matchId: string, amount: number, prediction: any): Promise<any>;
  cancelBet(betId: string, userId: string): Promise<boolean>;
  
  // Payout processing
  processPayout(matchId: string, result: any): Promise<any>;
  calculateOdds(matchId: string): Promise<any>;
  
  // Statistics
  getBettingStats(matchId?: string): Promise<any>;
  getUserBettingHistory(userId: string, limit?: number): Promise<any[]>;
}

// Basic implementations
class DefaultGameService implements GameService {
  public id = 'default-game-service';
  public name = 'Default Game Service';
  public status: 'active' | 'inactive' | 'maintenance' = 'active';
  
  private db = getDatabase();
  private redis = getRedisClient();

  async createMatch(players: string[], options?: any): Promise<any> {
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const match = {
      id: matchId,
      players,
      status: 'waiting',
      createdAt: new Date(),
      options: options || {}
    };

    // Store in Redis for quick access
    await this.redis.set(`match:${matchId}`, match, 3600); // 1 hour TTL

    logger.info('Match created', { matchId, players });
    return match;
  }

  async getMatch(matchId: string): Promise<any> {
    const cachedMatch = await this.redis.get(`match:${matchId}`);
    if (cachedMatch) {
      return cachedMatch;
    }

    // Fallback to database or return null
    logger.warn('Match not found in cache', { matchId });
    return null;
  }

  async updateMatch(matchId: string, data: any): Promise<any> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    const updatedMatch = {
      ...match,
      ...data,
      updatedAt: new Date()
    };

    await this.redis.set(`match:${matchId}`, updatedMatch, 3600);
    logger.info('Match updated', { matchId, data });
    return updatedMatch;
  }

  async endMatch(matchId: string, result: any): Promise<any> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    const endedMatch = {
      ...match,
      status: 'completed',
      result,
      endedAt: new Date()
    };

    await this.redis.set(`match:${matchId}`, endedMatch, 86400); // Keep for 24 hours
    logger.info('Match ended', { matchId, result });
    return endedMatch;
  }

  async validateMove(matchId: string, move: any, playerId: string): Promise<boolean> {
    // Basic validation - can be extended
    const match = await this.getMatch(matchId);
    if (!match) {
      return false;
    }

    if (!match.players.includes(playerId)) {
      return false;
    }

    if (match.status !== 'active') {
      return false;
    }

    // Add more game-specific validation logic here
    return true;
  }

  async processMove(matchId: string, move: any, playerId: string): Promise<any> {
    const isValid = await this.validateMove(matchId, move, playerId);
    if (!isValid) {
      throw new Error('Invalid move');
    }

    const match = await this.getMatch(matchId);
    const updatedMatch = {
      ...match,
      lastMove: {
        playerId,
        move,
        timestamp: new Date()
      }
    };

    await this.redis.set(`match:${matchId}`, updatedMatch, 3600);
    logger.info('Move processed', { matchId, playerId, move });
    return updatedMatch;
  }

  async getGameState(matchId: string): Promise<any> {
    const match = await this.getMatch(matchId);
    return match ? match.gameState || {} : null;
  }

  async updateGameState(matchId: string, state: any): Promise<any> {
    return await this.updateMatch(matchId, { gameState: state });
  }

  async getActiveMatches(): Promise<any[]> {
    // This is a simplified implementation
    // In a real system, you'd query the database
    return [];
  }

  async getMatchHistory(playerId: string, limit = 10): Promise<any[]> {
    // This is a simplified implementation
    // In a real system, you'd query the database
    return [];
  }

  async getStats(): Promise<any> {
    return {
      activeMatches: 0,
      totalMatches: 0,
      averageGameLength: 0,
      uptime: process.uptime()
    };
  }

  async startMatch(matchId: string): Promise<any> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    if (match.status !== 'waiting' && match.status !== 'scheduled') {
      throw new Error(`Cannot start match in status: ${match.status}`);
    }

    const startedMatch = {
      ...match,
      status: 'active',
      startedAt: new Date(),
      gameState: {
        currentPlayer: 'player1',
        moveCount: 0,
        board: this.initializeBoard(),
        moveHistory: []
      }
    };

    await this.redis.set(`match:${matchId}`, startedMatch, 3600);
    logger.info('Match started', { matchId });
    return startedMatch;
  }

  async makeMove(matchId: string, move: any): Promise<any> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    if (match.status !== 'active') {
      throw new Error(`Cannot make move in match with status: ${match.status}`);
    }

    // Process the move
    const gameState = match.gameState || {};
    const moveHistory = gameState.moveHistory || [];
    
    const processedMove = {
      ...move,
      moveNumber: moveHistory.length + 1,
      timestamp: new Date(),
      processed: true
    };

    moveHistory.push(processedMove);
    
    // Update game state
    const updatedGameState = {
      ...gameState,
      moveHistory,
      currentPlayer: gameState.currentPlayer === 'player1' ? 'player2' : 'player1',
      moveCount: moveHistory.length,
      lastMove: processedMove
    };

    const updatedMatch = {
      ...match,
      gameState: updatedGameState,
      updatedAt: new Date()
    };

    await this.redis.set(`match:${matchId}`, updatedMatch, 3600);
    logger.info('Move made', { matchId, move: processedMove });
    return processedMove;
  }

  private initializeBoard(): string[][] {
    // Initialize a basic 9x9 game board
    const board = Array(9).fill(null).map(() => Array(9).fill(''));
    // Add initial piece setup logic here
    return board;
  }
}

class DefaultBettingService implements BettingService {
  public id = 'default-betting-service';
  public name = 'Default Betting Service';
  public status: 'active' | 'inactive' | 'maintenance' = 'active';
  
  private db = getDatabase();
  private redis = getRedisClient();

  async createBettingPool(matchId: string, options?: any): Promise<any> {
    const poolId = `pool_${matchId}`;
    const pool = {
      id: poolId,
      matchId,
      status: 'open',
      totalAmount: 0,
      bets: [],
      odds: { player1: 2.0, player2: 2.0 },
      createdAt: new Date(),
      options: options || {}
    };

    await this.redis.set(`betting_pool:${matchId}`, pool, 7200); // 2 hours TTL
    logger.info('Betting pool created', { matchId, poolId });
    return pool;
  }

  async getBettingPool(matchId: string): Promise<any> {
    const pool = await this.redis.get(`betting_pool:${matchId}`);
    if (!pool) {
      // Auto-create if not exists
      return await this.createBettingPool(matchId);
    }
    return pool;
  }

  async closeBettingPool(matchId: string): Promise<any> {
    const pool = await this.getBettingPool(matchId);
    if (!pool) {
      throw new Error(`Betting pool for match ${matchId} not found`);
    }

    const closedPool = {
      ...pool,
      status: 'closed',
      closedAt: new Date()
    };

    await this.redis.set(`betting_pool:${matchId}`, closedPool, 86400); // Keep for 24 hours
    logger.info('Betting pool closed', { matchId });
    return closedPool;
  }

  async placeBet(userId: string, matchId: string, amount: number, prediction: any): Promise<any> {
    const pool = await this.getBettingPool(matchId);
    if (pool.status !== 'open') {
      throw new Error('Betting pool is closed');
    }

    const betId = `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bet = {
      id: betId,
      userId,
      matchId,
      amount,
      prediction,
      timestamp: new Date(),
      status: 'active'
    };

    // Add bet to pool
    pool.bets.push(bet);
    pool.totalAmount += amount;

    await this.redis.set(`betting_pool:${matchId}`, pool, 7200);
    await this.redis.set(`bet:${betId}`, bet, 86400);

    logger.info('Bet placed', { betId, userId, matchId, amount });
    return bet;
  }

  async cancelBet(betId: string, userId: string): Promise<boolean> {
    const bet = await this.redis.get(`bet:${betId}`);
    if (!bet || bet.userId !== userId || bet.status !== 'active') {
      return false;
    }

    bet.status = 'cancelled';
    bet.cancelledAt = new Date();

    await this.redis.set(`bet:${betId}`, bet, 86400);
    logger.info('Bet cancelled', { betId, userId });
    return true;
  }

  async processPayout(matchId: string, result: any): Promise<any> {
    const pool = await this.getBettingPool(matchId);
    if (!pool || pool.status === 'paid') {
      return null;
    }

    // Simple payout logic
    const winningBets = pool.bets.filter((bet: any) => 
      this.checkWinningBet(bet, result)
    );

    const totalWinningAmount = winningBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);
    const payoutRatio = pool.totalAmount / totalWinningAmount || 1;

    const payouts = winningBets.map((bet: any) => ({
      betId: bet.id,
      userId: bet.userId,
      originalAmount: bet.amount,
      payout: bet.amount * payoutRatio,
      multiplier: payoutRatio
    }));

    pool.status = 'paid';
    pool.payouts = payouts;
    pool.paidAt = new Date();

    await this.redis.set(`betting_pool:${matchId}`, pool, 86400);
    logger.info('Payouts processed', { matchId, totalPayouts: payouts.length });
    return { pool, payouts };
  }

  private checkWinningBet(bet: any, result: any): boolean {
    // Simple winning logic - can be made more sophisticated
    return bet.prediction.winner === result.winner;
  }

  async calculateOdds(matchId: string): Promise<any> {
    const pool = await this.getBettingPool(matchId);
    
    // Simple odds calculation
    const player1Bets = pool.bets.filter((bet: any) => bet.prediction.winner === 'player1').length;
    const player2Bets = pool.bets.filter((bet: any) => bet.prediction.winner === 'player2').length;
    
    const totalBets = player1Bets + player2Bets || 1;
    
    return {
      player1: totalBets / (player1Bets || 1),
      player2: totalBets / (player2Bets || 1)
    };
  }

  async getBettingStats(matchId?: string): Promise<any> {
    if (matchId) {
      const pool = await this.getBettingPool(matchId);
      return {
        matchId,
        totalAmount: pool?.totalAmount || 0,
        totalBets: pool?.bets?.length || 0,
        status: pool?.status || 'unknown'
      };
    }

    // Global stats
    return {
      totalPools: 0,
      totalAmount: 0,
      activePools: 0
    };
  }

  async getUserBettingHistory(userId: string, limit = 10): Promise<any[]> {
    // Simplified implementation
    return [];
  }
}

// Singleton instances
let gameServiceInstance: GameService | null = null;
let bettingServiceInstance: BettingService | null = null;

// Service factory functions
export function getGameServiceInstance(): GameService {
  if (!gameServiceInstance) {
    gameServiceInstance = new DefaultGameService();
    logger.info('Game service instance created');
  }
  return gameServiceInstance;
}

export function getBettingServiceInstance(): BettingService {
  if (!bettingServiceInstance) {
    bettingServiceInstance = new DefaultBettingService();
    logger.info('Betting service instance created');
  }
  return bettingServiceInstance;
}

// Global service instances for backward compatibility
export const gameService = getGameServiceInstance();
export const bettingService = getBettingServiceInstance();

// Service registration and management
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  register(name: string, service: any): void {
    this.services.set(name, service);
    logger.info('Service registered', { name, serviceId: service.id });
  }

  get(name: string): any {
    return this.services.get(name);
  }

  getAll(): Map<string, any> {
    return new Map(this.services);
  }

  unregister(name: string): boolean {
    const removed = this.services.delete(name);
    if (removed) {
      logger.info('Service unregistered', { name });
    }
    return removed;
  }

  async healthCheck(): Promise<any> {
    const services = Array.from(this.services.entries());
    const healthResults = await Promise.all(
      services.map(async ([name, service]) => {
        try {
          return {
            name,
            status: service.status || 'unknown',
            healthy: true
          };
        } catch (error) {
          return {
            name,
            status: 'error',
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return {
      totalServices: services.length,
      healthyServices: healthResults.filter(r => r.healthy).length,
      services: healthResults,
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize default services
const serviceRegistry = ServiceRegistry.getInstance();
serviceRegistry.register('game', getGameServiceInstance());
serviceRegistry.register('betting', getBettingServiceInstance());

export { serviceRegistry };

// Export service instances for global use
export default {
  gameService: getGameServiceInstance(),
  bettingService: getBettingServiceInstance(),
  serviceRegistry,
  getGameServiceInstance,
  getBettingServiceInstance
};
