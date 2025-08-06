"use strict";
/**
 * Mock Implementations for Betting Services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockBettingService = exports.mockOptimizedBettingService = exports.mockEnhancedBettingService = exports.MockBettingService = exports.MockOptimizedBettingService = exports.MockEnhancedBettingService = void 0;
const uuid_1 = require("uuid");
// Mock Enhanced Betting Service
class MockEnhancedBettingService {
    constructor() {
        this.activePools = new Map();
        this.minBetAmount = 0.1 * 1e9; // 0.1 SOL in lamports
        this.maxBetAmount = 100 * 1e9; // 100 SOL in lamports
    }
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
        // Update pool
        pool.bets.push(betData);
        pool.totalPool += amount;
        pool.betsCount += 1;
        return betData;
    }
    calculateOdds(pool, betAmount) {
        // Simplified odds calculation
        const totalPool = pool.totalPool + betAmount;
        const odds = totalPool === 0 ? 2.0 : Math.max(1.01, Math.min(10.0, totalPool / (betAmount + 1)));
        return Math.round(odds * 100) / 100; // Round to 2 decimal places
    }
    async closeBettingPool(matchId) {
        const pool = this.activePools.get(matchId);
        if (pool) {
            pool.isActive = false;
        }
    }
}
exports.MockEnhancedBettingService = MockEnhancedBettingService;
// Mock Optimized Betting Service
class MockOptimizedBettingService {
    constructor() {
        this.activePools = new Map();
        this.minBetAmount = 0.1; // SOL
        this.maxBetAmount = 100; // SOL
    }
    async placeBet(bettorWallet, matchId, amount, predictedWinner, predictedWinnerType) {
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
            // Create bet
            const betId = (0, uuid_1.v4)();
            const betData = {
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
// Mock Basic Betting Service
class MockBettingService {
    constructor() {
        this.bets = [];
        this.pools = new Map();
    }
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
// Export mock instances for use in tests
exports.mockEnhancedBettingService = new MockEnhancedBettingService();
exports.mockOptimizedBettingService = new MockOptimizedBettingService();
exports.mockBettingService = new MockBettingService();
//# sourceMappingURL=bettingServiceMocks.js.map