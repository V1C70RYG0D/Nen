"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedBettingService = void 0;
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
const EnhancedCachingService_1 = require("./EnhancedCachingService");
class OptimizedBettingService {
    activePools = new Map();
    userBets = new Map();
    minBetAmount = 0.1;
    maxBetAmount = 100;
    platformFee = 0.03;
    cacheTimeout = 30000;
    constructor() {
        logger_1.logger.info('Optimized Betting Service initialized');
        this.initializeDefaultPools();
    }
    initializeDefaultPools() {
        const defaultMatches = ['match-123', 'demo-match-1', 'test-match-2'];
        defaultMatches.forEach(matchId => {
            const pool = {
                matchId,
                totalPool: 0,
                betsCount: 0,
                agent1Pool: 0,
                agent2Pool: 0,
                bets: new Map(),
                isActive: true,
                lastUpdated: new Date()
            };
            this.activePools.set(matchId, pool);
        });
        logger_1.logger.info('Default betting pools initialized', {
            poolCount: defaultMatches.length
        });
    }
    async placeBet(bettorWallet, matchId, amount, predictedWinner, predictedWinnerType) {
        try {
            const startTime = Date.now();
            if (amount < this.minBetAmount || amount > this.maxBetAmount) {
                return {
                    success: false,
                    error: `Bet amount must be between ${this.minBetAmount} and ${this.maxBetAmount} SOL`
                };
            }
            let pool = this.activePools.get(matchId);
            if (!pool) {
                pool = await this.createBettingPool(matchId);
            }
            if (!pool.isActive) {
                return {
                    success: false,
                    error: `Betting is closed for match ${matchId}`
                };
            }
            const bet = {
                id: (0, uuid_1.v4)(),
                matchId,
                bettorWallet,
                amount,
                predictedWinner,
                predictedWinnerType,
                odds: this.calculateCurrentOdds(pool, predictedWinner),
                placedAt: new Date(),
                status: 'active',
                potentialPayout: amount * this.calculateCurrentOdds(pool, predictedWinner),
                riskScore: this.calculateRiskScore(bettorWallet, amount)
            };
            pool.bets.set(bet.id, bet);
            pool.betsCount++;
            pool.totalPool += amount;
            pool.lastUpdated = new Date();
            if (predictedWinner.includes('agent1') || predictedWinner === 'royal_guard_alpha') {
                pool.agent1Pool += amount;
            }
            else {
                pool.agent2Pool += amount;
            }
            if (!this.userBets.has(bettorWallet)) {
                this.userBets.set(bettorWallet, []);
            }
            this.userBets.get(bettorWallet).push(bet);
            await this.invalidatePoolCache(matchId);
            const responseTime = Date.now() - startTime;
            logger_1.logger.info('Bet placed successfully', {
                betId: bet.id,
                matchId,
                amount,
                responseTime: `${responseTime}ms`,
                performance: responseTime < 100 ? 'optimal' : 'acceptable'
            });
            return {
                success: true,
                betId: bet.id,
                message: 'Bet placed successfully'
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to place bet', {
                bettorWallet,
                matchId,
                amount,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to place bet'
            };
        }
    }
    async calculateOdds(matchId) {
        try {
            const cacheKey = {
                type: 'betting_odds',
                identifier: matchId
            };
            const cached = await EnhancedCachingService_1.enhancedCachingService.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
            const pool = this.activePools.get(matchId);
            if (!pool) {
                return null;
            }
            const totalPool = pool.totalPool || 1;
            const agent1Share = pool.agent1Pool / totalPool;
            const agent2Share = pool.agent2Pool / totalPool;
            const odds = {
                agent1: {
                    odds: Math.max(1.1, Math.min(10, 1 / Math.max(agent1Share, 0.1))),
                    pool: pool.agent1Pool
                },
                agent2: {
                    odds: Math.max(1.1, Math.min(10, 1 / Math.max(agent2Share, 0.1))),
                    pool: pool.agent2Pool
                }
            };
            await EnhancedCachingService_1.enhancedCachingService.set(cacheKey, JSON.stringify(odds), this.cacheTimeout);
            return odds;
        }
        catch (error) {
            logger_1.logger.error('Failed to calculate odds', {
                matchId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    async getUserBets(userId, limit = 50) {
        try {
            const userBets = this.userBets.get(userId) || [];
            return userBets
                .sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())
                .slice(0, limit);
        }
        catch (error) {
            logger_1.logger.error('Failed to get user bets', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }
    async settleMatch(matchId, winnerId, finalScore) {
        try {
            const pool = this.activePools.get(matchId);
            if (!pool) {
                return {
                    success: false,
                    settledBets: 0,
                    totalPayout: 0,
                    error: 'Match not found'
                };
            }
            let settledBets = 0;
            let totalPayout = 0;
            for (const [betId, bet] of pool.bets) {
                if (bet.status !== 'active')
                    continue;
                const betWon = this.determineBetResult(bet, winnerId);
                if (betWon) {
                    bet.status = 'won';
                    const payout = bet.potentialPayout * (1 - this.platformFee);
                    totalPayout += payout;
                    logger_1.logger.info('Bet won - payout calculated', {
                        betId,
                        payout,
                        winner: winnerId
                    });
                }
                else {
                    bet.status = 'lost';
                }
                settledBets++;
            }
            pool.isActive = false;
            pool.lastUpdated = new Date();
            await this.invalidatePoolCache(matchId);
            logger_1.logger.info('Match settled successfully', {
                matchId,
                winnerId,
                settledBets,
                totalPayout
            });
            return {
                success: true,
                settledBets,
                totalPayout
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to settle match', {
                matchId,
                winnerId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                settledBets: 0,
                totalPayout: 0,
                error: error instanceof Error ? error.message : 'Settlement failed'
            };
        }
    }
    async createBettingPool(matchId) {
        const pool = {
            matchId,
            totalPool: 0,
            betsCount: 0,
            agent1Pool: 0,
            agent2Pool: 0,
            bets: new Map(),
            isActive: true,
            lastUpdated: new Date()
        };
        this.activePools.set(matchId, pool);
        logger_1.logger.info('New betting pool created', { matchId });
        return pool;
    }
    calculateCurrentOdds(pool, predictedWinner) {
        const totalPool = pool.totalPool || 1;
        const agentPool = predictedWinner.includes('agent1') || predictedWinner === 'royal_guard_alpha'
            ? pool.agent1Pool
            : pool.agent2Pool;
        const share = agentPool / totalPool;
        return Math.max(1.1, Math.min(10, 1 / Math.max(share, 0.1)));
    }
    calculateRiskScore(wallet, amount) {
        let risk = 0;
        if (amount > 50)
            risk += 30;
        else if (amount > 20)
            risk += 15;
        const userHistory = this.userBets.get(wallet) || [];
        const recentBets = userHistory.filter(bet => Date.now() - bet.placedAt.getTime() < 3600000);
        if (recentBets.length > 5)
            risk += 25;
        return Math.min(risk, 100);
    }
    determineBetResult(bet, winnerId) {
        return bet.predictedWinner === winnerId ||
            bet.predictedWinner.includes(winnerId) ||
            winnerId.includes(bet.predictedWinner);
    }
    async invalidatePoolCache(matchId) {
        try {
            await EnhancedCachingService_1.enhancedCachingService.delete({
                type: 'betting_odds',
                identifier: matchId
            });
            await EnhancedCachingService_1.enhancedCachingService.delete({
                type: 'betting_pool',
                identifier: matchId
            });
        }
        catch (error) {
            logger_1.logger.warn('Failed to invalidate cache', { matchId, error });
        }
    }
    getHealthStatus() {
        const totalBets = Array.from(this.activePools.values())
            .reduce((sum, pool) => sum + pool.betsCount, 0);
        return {
            status: 'healthy',
            activePools: this.activePools.size,
            totalBets
        };
    }
}
exports.OptimizedBettingService = OptimizedBettingService;
exports.default = OptimizedBettingService;
//# sourceMappingURL=OptimizedBettingService.js.map