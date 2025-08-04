"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockBettingService = exports.mockOptimizedBettingService = exports.mockEnhancedBettingService = exports.MockBettingService = exports.MockOptimizedBettingService = exports.MockEnhancedBettingService = void 0;
const uuid_1 = require("uuid");
class MockEnhancedBettingService {
    activePools = new Map();
    minBetAmount = 0.1 * 1e9;
    maxBetAmount = 100 * 1e9;
    async createBettingPool(matchId) {
        const pool = {
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
    async getBettingPool(matchId) {
        return this.activePools.get(matchId) || null;
    }
    async placeBet(bettorWallet, matchId, amount, predictedWinner, predictedWinnerType) {
        if (!bettorWallet || !matchId || !amount || !predictedWinner || !predictedWinnerType) {
            throw new Error('Invalid bet parameters');
        }
        if (amount < this.minBetAmount || amount > this.maxBetAmount) {
            throw new Error(`Bet amount must be between ${this.minBetAmount / 1e9} and ${this.maxBetAmount / 1e9} SOL`);
        }
        const pool = this.activePools.get(matchId);
        if (!pool) {
            throw new Error('Betting pool not found');
        }
        if (!pool.isActive) {
            throw new Error('Betting is closed for this match');
        }
        const odds = this.calculateOdds(pool, amount);
        const potentialPayout = Math.floor(amount * odds);
        const betData = {
            id: (0, uuid_1.v4)(),
            matchId,
            bettorWallet,
            amount,
            predictedWinner,
            predictedWinnerType,
            odds,
            placedAt: new Date(),
            status: 'active',
            potentialPayout,
            escrowAccount: `escrow-${(0, uuid_1.v4)()}`
        };
        pool.bets.push(betData);
        pool.totalPool += amount;
        pool.betsCount += 1;
        return betData;
    }
    calculateOdds(pool, betAmount) {
        const totalPool = pool.totalPool + betAmount;
        const odds = totalPool === 0 ? 2.0 : Math.max(1.01, Math.min(10.0, totalPool / (betAmount + 1)));
        return Math.round(odds * 100) / 100;
    }
    async closeBettingPool(matchId) {
        const pool = this.activePools.get(matchId);
        if (pool) {
            pool.isActive = false;
        }
    }
}
exports.MockEnhancedBettingService = MockEnhancedBettingService;
class MockOptimizedBettingService {
    activePools = new Map();
    minBetAmount = 0.1;
    maxBetAmount = 100;
    async placeBet(bettorWallet, matchId, amount, predictedWinner, predictedWinnerType) {
        try {
            if (amount < this.minBetAmount || amount > this.maxBetAmount) {
                return {
                    success: false,
                    message: 'Bet amount validation failed',
                    error: `Bet amount must be between ${this.minBetAmount} and ${this.maxBetAmount} SOL`
                };
            }
            if (!this.activePools.has(matchId)) {
                const pool = {
                    matchId,
                    totalPool: 0,
                    betsCount: 0,
                    isActive: true,
                    bets: [],
                    createdAt: new Date()
                };
                this.activePools.set(matchId, pool);
            }
            const pool = this.activePools.get(matchId);
            if (!pool.isActive) {
                return {
                    success: false,
                    message: 'Betting failed',
                    error: 'Betting is closed for this match'
                };
            }
            const betId = (0, uuid_1.v4)();
            const betData = {
                id: betId,
                matchId,
                bettorWallet,
                amount: amount * 1e9,
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
        }
        catch (error) {
            return {
                success: false,
                message: 'Bet placement failed',
                error: error.message
            };
        }
    }
    async getBettingPool(matchId) {
        return this.activePools.get(matchId) || null;
    }
}
exports.MockOptimizedBettingService = MockOptimizedBettingService;
class MockBettingService {
    bets = [];
    pools = new Map();
    async createBet(betData) {
        const bet = {
            id: (0, uuid_1.v4)(),
            matchId: betData.matchId,
            bettorWallet: betData.bettorWallet,
            amount: betData.amount,
            predictedWinner: betData.predictedWinner,
            predictedWinnerType: betData.predictedWinnerType,
            odds: betData.odds || 2.0,
            placedAt: new Date(),
            status: 'active',
            potentialPayout: betData.amount * (betData.odds || 2.0),
            escrowAccount: `escrow-${(0, uuid_1.v4)()}`
        };
        this.bets.push(bet);
        return bet;
    }
    async getBet(betId) {
        return this.bets.find(bet => bet.id === betId) || null;
    }
    async getAllBets() {
        return [...this.bets];
    }
    async updateBetStatus(betId, status) {
        const bet = this.bets.find(bet => bet.id === betId);
        if (bet) {
            bet.status = status;
        }
    }
}
exports.MockBettingService = MockBettingService;
exports.mockEnhancedBettingService = new MockEnhancedBettingService();
exports.mockOptimizedBettingService = new MockOptimizedBettingService();
exports.mockBettingService = new MockBettingService();
//# sourceMappingURL=bettingServiceMocks.js.map