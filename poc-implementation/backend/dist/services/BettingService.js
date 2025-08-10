"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BettingService = void 0;
// Comprehensive Betting Service with SOL escrow and settlement
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("../utils/logger");
const database_1 = require("../utils/database");
const redis_1 = require("../utils/redis");
const uuid_1 = require("uuid");
class BettingService {
    constructor() {
        this.platformFeeRate = 0.03; // 3% platform fee
        this.connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
        this.cache = new redis_1.CacheService();
        this.programId = new web3_js_1.PublicKey(process.env.NEN_BETTING_PROGRAM_ID || 'BetFg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
    }
    // Get or create betting account for user
    async getBettingAccount(walletAddress) {
        try {
            if (!this.isValidSolanaAddress(walletAddress)) {
                throw new Error('Invalid Solana wallet address');
            }
            // Check cache first
            const cacheKey = `betting_account:${walletAddress}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            // Get user account
            const userResult = await (0, database_1.query)(`
        SELECT id, betting_balance, total_winnings, total_losses 
        FROM users WHERE wallet_address = $1
      `, [walletAddress]);
            if (userResult.length === 0) {
                throw new Error('User not found');
            }
            const user = userResult[0];
            // Derive betting account PDA
            const walletPubkey = new web3_js_1.PublicKey(walletAddress);
            const [bettingAccountPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('betting'), walletPubkey.toBuffer()], this.programId);
            // Check if betting account exists on-chain
            const accountInfo = await this.connection.getAccountInfo(bettingAccountPda);
            let balance = parseFloat(user.betting_balance || '0');
            if (accountInfo) {
                // Parse account data to get balance (simplified for POC)
                // In production, this would deserialize the account data properly
                balance = accountInfo.lamports / web3_js_1.LAMPORTS_PER_SOL;
            }
            const bettingAccount = {
                userId: user.id,
                walletAddress,
                pdaAddress: bettingAccountPda.toString(),
                balance,
                totalDeposited: parseFloat(user.betting_balance || '0'),
                totalWithdrawn: 0,
                lockedBalance: 0,
                lastUpdated: new Date(),
            };
            // Cache for 5 minutes
            await this.cache.set(cacheKey, bettingAccount, 300);
            return bettingAccount;
        }
        catch (error) {
            logger_1.logger.error('Error getting betting account:', error);
            throw error;
        }
    }
    // Deposit SOL into betting account
    async depositSol(depositRequest) {
        try {
            const { userId, walletAddress, amount, transactionSignature } = depositRequest;
            // Validate inputs
            if (!this.isValidSolanaAddress(walletAddress)) {
                throw new Error('Invalid wallet address');
            }
            if (amount < 0.1) {
                throw new Error('Minimum deposit amount is 0.1 SOL');
            }
            if (amount > 1000) {
                throw new Error('Maximum deposit amount is 1000 SOL');
            }
            // Get or create betting account
            const bettingAccount = await this.getBettingAccount(walletAddress);
            // Create transaction record
            const transactionId = (0, uuid_1.v4)();
            const transactionRecord = {
                id: transactionId,
                userId,
                walletAddress,
                type: 'deposit',
                amount,
                transactionHash: transactionSignature,
                status: 'pending',
                metadata: {
                    pdaAddress: bettingAccount.pdaAddress,
                    previousBalance: bettingAccount.balance,
                },
                createdAt: new Date(),
            };
            // Store transaction record
            await this.storeTransactionRecord(transactionRecord);
            // For POC: Simulate on-chain transaction
            // In production, this would:
            // 1. Verify the transaction signature on-chain
            // 2. Check that funds were transferred to the betting PDA
            // 3. Update the betting account balance
            const mockTransactionHash = transactionSignature || `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Simulate transaction confirmation delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Update betting account balance in database
            const newBalance = bettingAccount.balance + amount;
            await (0, database_1.transaction)(async (client) => {
                await client.query(`
          UPDATE users 
          SET betting_balance = $1, updated_at = $2 
          WHERE id = $3
        `, [newBalance, new Date(), userId]);
            });
            // Update transaction status
            await this.updateTransactionStatus(transactionId, 'confirmed', mockTransactionHash);
            // Clear cache
            await this.cache.del(`betting_account:${walletAddress}`);
            const result = {
                success: true,
                transactionId: mockTransactionHash,
                newBalance,
                depositAmount: amount,
                pdaAddress: bettingAccount.pdaAddress,
                message: `Successfully deposited ${amount} SOL to betting account`,
            };
            logger_1.logger.info('Deposit completed successfully', {
                walletAddress,
                amount,
                transactionId: mockTransactionHash,
                newBalance,
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error processing deposit:', error);
            throw error;
        }
    }
    // Withdraw SOL from betting account
    async withdrawSol(withdrawalRequest) {
        try {
            const { userId, walletAddress, amount, destinationAddress } = withdrawalRequest;
            // Validate inputs
            if (!this.isValidSolanaAddress(walletAddress)) {
                throw new Error('Invalid wallet address');
            }
            if (amount <= 0) {
                throw new Error('Withdrawal amount must be greater than 0');
            }
            // Get betting account
            const bettingAccount = await this.getBettingAccount(walletAddress);
            // Check sufficient balance
            const availableBalance = bettingAccount.balance - bettingAccount.lockedBalance;
            if (amount > availableBalance) {
                throw new Error(`Insufficient balance. Available: ${availableBalance} SOL`);
            }
            // Minimum withdrawal amount
            if (amount < 0.01) {
                throw new Error('Minimum withdrawal amount is 0.01 SOL');
            }
            // Create transaction record
            const transactionId = (0, uuid_1.v4)();
            const transactionRecord = {
                id: transactionId,
                userId,
                walletAddress,
                type: 'withdrawal',
                amount,
                status: 'pending',
                metadata: {
                    destinationAddress: destinationAddress || walletAddress,
                    previousBalance: bettingAccount.balance,
                },
                createdAt: new Date(),
            };
            await this.storeTransactionRecord(transactionRecord);
            // For POC: Simulate on-chain withdrawal
            const mockTransactionHash = `withdrawal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Simulate transaction processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Update betting account balance in database
            const newBalance = bettingAccount.balance - amount;
            await (0, database_1.transaction)(async (client) => {
                await client.query(`
          UPDATE users 
          SET betting_balance = $1, updated_at = $2 
          WHERE id = $3
        `, [newBalance, new Date(), userId]);
            });
            // Update transaction status
            await this.updateTransactionStatus(transactionId, 'confirmed', mockTransactionHash);
            // Clear cache
            await this.cache.del(`betting_account:${walletAddress}`);
            const result = {
                success: true,
                transactionId: mockTransactionHash,
                newBalance,
                withdrawalAmount: amount,
                message: `Successfully withdrew ${amount} SOL from betting account`,
            };
            logger_1.logger.info('Withdrawal completed successfully', {
                walletAddress,
                amount,
                transactionId: mockTransactionHash,
                newBalance,
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error processing withdrawal:', error);
            throw error;
        }
    }
    // Get transaction history for a user
    async getTransactionHistory(walletAddress, limit = 50) {
        try {
            // For POC: Return mock transaction history
            // In production: Query from database
            const mockHistory = [
                {
                    id: '1',
                    userId: 'user_1',
                    walletAddress,
                    type: 'deposit',
                    amount: 5.0,
                    transactionHash: 'dep_hash_1',
                    status: 'confirmed',
                    createdAt: new Date(Date.now() - 86400000), // 1 day ago
                },
                {
                    id: '2',
                    userId: 'user_1',
                    walletAddress,
                    type: 'bet',
                    amount: 1.5,
                    transactionHash: 'bet_hash_1',
                    status: 'confirmed',
                    metadata: { matchId: 'match_1', agentId: 'agent_1' },
                    createdAt: new Date(Date.now() - 43200000), // 12 hours ago
                },
                {
                    id: '3',
                    userId: 'user_1',
                    walletAddress,
                    type: 'payout',
                    amount: 2.25,
                    transactionHash: 'payout_hash_1',
                    status: 'confirmed',
                    metadata: { matchId: 'match_1', betId: 'bet_1' },
                    createdAt: new Date(Date.now() - 21600000), // 6 hours ago
                },
            ];
            return mockHistory.slice(0, limit);
        }
        catch (error) {
            logger_1.logger.error('Error getting transaction history:', error);
            throw error;
        }
    }
    // Private helper methods for deposits/withdrawals
    async storeTransactionRecord(record) {
        // In production: Store in database
        // For POC: Store in cache
        const cacheKey = `transaction:${record.id}`;
        await this.cache.set(cacheKey, record, 3600); // 1 hour
    }
    async updateTransactionStatus(transactionId, status, transactionHash) {
        // In production: Update database
        // For POC: Update cache
        const cacheKey = `transaction:${transactionId}`;
        const record = await this.cache.get(cacheKey);
        if (record) {
            record.status = status;
            if (transactionHash) {
                record.transactionHash = transactionHash;
            }
            await this.cache.set(cacheKey, record, 3600);
        }
    }
    isValidSolanaAddress(address) {
        try {
            new web3_js_1.PublicKey(address);
            return true;
        }
        catch {
            return false;
        }
    }
    // Place a bet on a match
    async placeBet(betData) {
        try {
            // Validate bet amount
            const limits = await this.getBettingLimits();
            if (betData.amountSol < limits.minBetSol || betData.amountSol > limits.maxBetSol) {
                throw new Error(`Bet amount must be between ${limits.minBetSol} and ${limits.maxBetSol} SOL`);
            }
            // Check if match exists and is accepting bets
            const matchResult = await (0, database_1.query)(`
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
            const bet = {
                id: (0, uuid_1.v4)(),
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
            await (0, database_1.transaction)(async (client) => {
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
            logger_1.logger.info('Bet placed successfully', {
                betId: bet.id,
                userId: bet.userId,
                matchId: bet.matchId,
                amount: bet.amountSol,
                odds: bet.odds
            });
            return bet;
        }
        catch (error) {
            logger_1.logger.error('Error placing bet:', error);
            throw error;
        }
    }
    // Get betting pool for a match
    async getBettingPool(matchId) {
        try {
            const cacheKey = `betting_pool:${matchId}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            // Query betting data
            const betsResult = await (0, database_1.query)(`
        SELECT
          predicted_winner_id,
          predicted_winner_type,
          SUM(amount_sol) as total_amount,
          COUNT(*) as bet_count
        FROM bets
        WHERE match_id = $1 AND status = 'placed'
        GROUP BY predicted_winner_id, predicted_winner_type
      `, [matchId]);
            const matchResult = await (0, database_1.query)(`
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
                    }
                    else {
                        agent2Pool = parseFloat(bet.total_amount);
                    }
                }
            }
            const pool = {
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
        }
        catch (error) {
            logger_1.logger.error('Error getting betting pool:', error);
            throw error;
        }
    }
    // Calculate odds for a specific prediction
    calculateOdds(pool, predictedWinnerId) {
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
    calculateOddsFromPool(totalPool, agentPool) {
        if (totalPool === 0 || agentPool === 0) {
            return 2.0;
        }
        const odds = (totalPool / agentPool) * 0.97; // 3% platform fee
        return Math.max(1.1, Math.min(10.0, odds));
    }
    // Get user's bets
    async getUserBets(userId, limit = 20) {
        try {
            const rows = await (0, database_1.query)(`
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
        }
        catch (error) {
            logger_1.logger.error('Error getting user bets:', error);
            throw error;
        }
    }
    // Settle bets for a completed match
    async settleBets(matchId, winnerId, winnerType) {
        try {
            logger_1.logger.info('Starting bet settlement', { matchId, winnerId, winnerType });
            // Get all bets for the match
            const bets = await (0, database_1.query)(`
        SELECT * FROM bets
        WHERE match_id = $1 AND status = 'placed'
      `, [matchId]);
            if (bets.length === 0) {
                logger_1.logger.info('No bets to settle for match', { matchId });
                return;
            }
            // Calculate payouts and update bets
            await (0, database_1.transaction)(async (client) => {
                for (const bet of bets) {
                    const isWinningBet = bet.predicted_winner_id === winnerId &&
                        bet.predicted_winner_type === winnerType;
                    let newStatus;
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
                    }
                    else {
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
            logger_1.logger.info('Bet settlement completed', {
                matchId,
                settledBets: bets.length,
                winnerId,
                winnerType
            });
        }
        catch (error) {
            logger_1.logger.error('Error settling bets:', error);
            throw error;
        }
    }
    // Get betting limits and configuration
    async getBettingLimits() {
        try {
            const cacheKey = 'betting_limits';
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            // Get from system config
            const result = await (0, database_1.query)(`
        SELECT value FROM system_config WHERE key = 'betting_limits'
      `);
            let limits;
            if (result.length > 0) {
                const config = result[0].value;
                limits = {
                    minBetSol: config.min_bet_sol || 0.1,
                    maxBetSol: config.max_bet_sol || 100.0,
                    platformFeeRate: this.platformFeeRate,
                };
            }
            else {
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
        }
        catch (error) {
            logger_1.logger.error('Error getting betting limits:', error);
            // Return default limits on error
            return {
                minBetSol: 0.1,
                maxBetSol: 100.0,
                platformFeeRate: this.platformFeeRate,
            };
        }
    }
    // Update betting pool cache
    async updateBettingPoolCache(matchId) {
        try {
            const cacheKey = `betting_pool:${matchId}`;
            await this.cache.del(cacheKey);
            // Regenerate cache
            await this.getBettingPool(matchId);
        }
        catch (error) {
            logger_1.logger.error('Error updating betting pool cache:', error);
        }
    }
    // Get betting statistics
    async getBettingStats(userId) {
        try {
            let query_text;
            let params;
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
            }
            else {
                query_text = `
          SELECT
            COUNT(*) as total_bets,
            SUM(amount_sol) as total_volume,
            AVG(amount_sol) as average_bet
          FROM bets
        `;
                params = [];
            }
            const result = await (0, database_1.query)(query_text, params);
            const stats = result[0];
            return {
                totalBets: parseInt(stats.total_bets || '0'),
                totalVolume: parseFloat(stats.total_volume || '0'),
                averageBet: parseFloat(stats.average_bet || '0'),
                winRate: stats.win_rate ? parseFloat(stats.win_rate) : undefined,
                totalWinnings: stats.total_winnings ? parseFloat(stats.total_winnings) : undefined,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting betting stats:', error);
            throw error;
        }
    }
}
exports.BettingService = BettingService;
//# sourceMappingURL=BettingService.js.map