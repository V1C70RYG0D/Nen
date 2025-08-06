"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
// User Service for authentication and profile management
const web3_js_1 = require("@solana/web3.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const database_1 = require("../utils/database");
const redis_1 = require("../utils/redis");
const uuid_1 = require("uuid");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
class UserService {
    constructor() {
        this.cache = new redis_1.CacheService();
        this.jwtSecret = process.env.JWT_SECRET || 'nen-platform-default-secret';
    }
    // Authenticate user with wallet signature
    async authenticateWallet(signatureData) {
        try {
            // Verify signature
            const isValidSignature = this.verifySignature(signatureData);
            if (!isValidSignature) {
                throw new Error('Invalid wallet signature');
            }
            // Get or create user
            let user = await this.getUserByWallet(signatureData.walletAddress);
            if (!user) {
                user = await this.createUser(signatureData.walletAddress);
            }
            // Generate JWT token
            const token = this.generateJWT(user);
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            const authToken = {
                token,
                userId: user.id,
                walletAddress: user.walletAddress,
                expiresAt,
            };
            // Cache token
            await this.cache.set(`auth_token:${token}`, authToken, 24 * 60 * 60); // 24 hours
            logger_1.logger.info('User authenticated successfully', {
                userId: user.id,
                walletAddress: user.walletAddress
            });
            return authToken;
        }
        catch (error) {
            logger_1.logger.error('Error authenticating wallet:', error);
            throw error;
        }
    }
    // Verify JWT token
    async verifyToken(token) {
        try {
            // Check cache first
            const cachedToken = await this.cache.get(`auth_token:${token}`);
            if (cachedToken && new Date() < cachedToken.expiresAt) {
                return await this.getUserById(cachedToken.userId);
            }
            // Verify JWT
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            if (!decoded.userId) {
                return null;
            }
            const user = await this.getUserById(decoded.userId);
            return user;
        }
        catch (error) {
            logger_1.logger.debug('Token verification failed:', error);
            return null;
        }
    }
    // Get user by ID
    async getUserById(userId) {
        try {
            const cacheKey = `user:${userId}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            const rows = await (0, database_1.query)(`
        SELECT * FROM users WHERE id = $1 AND is_active = true
      `, [userId]);
            if (rows.length === 0) {
                return null;
            }
            const user = this.mapRowToUser(rows[0]);
            // Cache for 10 minutes
            await this.cache.set(cacheKey, user, 600);
            return user;
        }
        catch (error) {
            logger_1.logger.error('Error getting user by ID:', error);
            throw error;
        }
    }
    // Get user by wallet address
    async getUserByWallet(walletAddress) {
        try {
            const cacheKey = `user_wallet:${walletAddress}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            const rows = await (0, database_1.query)(`
        SELECT * FROM users WHERE wallet_address = $1 AND is_active = true
      `, [walletAddress]);
            if (rows.length === 0) {
                return null;
            }
            const user = this.mapRowToUser(rows[0]);
            // Cache for 10 minutes
            await this.cache.set(cacheKey, user, 600);
            await this.cache.set(`user:${user.id}`, user, 600);
            return user;
        }
        catch (error) {
            logger_1.logger.error('Error getting user by wallet:', error);
            throw error;
        }
    }
    // Create new user
    async createUser(walletAddress, userData) {
        try {
            // Validate wallet address
            if (!this.isValidSolanaAddress(walletAddress)) {
                throw new Error('Invalid Solana wallet address');
            }
            const userId = (0, uuid_1.v4)();
            const user = {
                id: userId,
                walletAddress,
                username: userData?.username,
                email: userData?.email,
                profileImageUrl: userData?.profileImageUrl,
                solBalance: 0,
                bettingBalance: 0,
                totalWinnings: 0,
                totalLosses: 0,
                gamesPlayed: 0,
                gamesWon: 0,
                eloRating: 1200, // Starting ELO
                isActive: true,
                preferences: userData?.preferences || {},
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            // Insert into database
            await (0, database_1.query)(`
        INSERT INTO users (
          id, wallet_address, username, email, profile_image_url,
          sol_balance, betting_balance, total_winnings, total_losses,
          games_played, games_won, elo_rating, is_active, preferences
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
                user.id, user.walletAddress, user.username, user.email, user.profileImageUrl,
                user.solBalance, user.bettingBalance, user.totalWinnings, user.totalLosses,
                user.gamesPlayed, user.gamesWon, user.eloRating, user.isActive,
                JSON.stringify(user.preferences)
            ]);
            logger_1.logger.info('User created successfully', { userId, walletAddress });
            return user;
        }
        catch (error) {
            logger_1.logger.error('Error creating user:', error);
            throw error;
        }
    }
    // Update user profile
    async updateUser(userId, updates) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Build update query dynamically
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            if (updates.username !== undefined) {
                updateFields.push(`username = $${paramIndex}`);
                values.push(updates.username);
                paramIndex++;
            }
            if (updates.email !== undefined) {
                updateFields.push(`email = $${paramIndex}`);
                values.push(updates.email);
                paramIndex++;
            }
            if (updates.profileImageUrl !== undefined) {
                updateFields.push(`profile_image_url = $${paramIndex}`);
                values.push(updates.profileImageUrl);
                paramIndex++;
            }
            if (updates.preferences !== undefined) {
                updateFields.push(`preferences = $${paramIndex}`);
                values.push(JSON.stringify(updates.preferences));
                paramIndex++;
            }
            if (updateFields.length === 0) {
                return user; // No updates
            }
            updateFields.push(`updated_at = $${paramIndex}`);
            values.push(new Date());
            paramIndex++;
            values.push(userId); // WHERE clause
            await (0, database_1.query)(`
        UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
      `, values);
            // Clear caches
            await this.cache.del(`user:${userId}`);
            await this.cache.del(`user_wallet:${user.walletAddress}`);
            // Return updated user
            const updatedUser = await this.getUserById(userId);
            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }
            logger_1.logger.info('User updated successfully', { userId });
            return updatedUser;
        }
        catch (error) {
            logger_1.logger.error('Error updating user:', error);
            throw error;
        }
    }
    // Update user balance
    async updateBalance(userId, balanceChanges) {
        try {
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            if (balanceChanges.solBalance !== undefined) {
                updateFields.push(`sol_balance = sol_balance + $${paramIndex}`);
                values.push(balanceChanges.solBalance);
                paramIndex++;
            }
            if (balanceChanges.bettingBalance !== undefined) {
                updateFields.push(`betting_balance = betting_balance + $${paramIndex}`);
                values.push(balanceChanges.bettingBalance);
                paramIndex++;
            }
            if (updateFields.length === 0) {
                const user = await this.getUserById(userId);
                if (!user)
                    throw new Error('User not found');
                return user;
            }
            updateFields.push(`updated_at = $${paramIndex}`);
            values.push(new Date());
            paramIndex++;
            values.push(userId); // WHERE clause
            await (0, database_1.query)(`
        UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
      `, values);
            // Clear cache
            const user = await this.getUserById(userId);
            if (user) {
                await this.cache.del(`user:${userId}`);
                await this.cache.del(`user_wallet:${user.walletAddress}`);
            }
            // Return updated user
            const updatedUser = await this.getUserById(userId);
            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }
            logger_1.logger.info('User balance updated', { userId, balanceChanges });
            return updatedUser;
        }
        catch (error) {
            logger_1.logger.error('Error updating user balance:', error);
            throw error;
        }
    }
    // Get user statistics
    async getUserStats(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Calculate win rate
            const winRate = user.gamesPlayed > 0 ? (user.gamesWon / user.gamesPlayed) * 100 : 0;
            // Get betting stats
            const bettingStats = await (0, database_1.query)(`
        SELECT
          AVG(amount_sol) as avg_bet,
          COUNT(*) as total_bets
        FROM bets
        WHERE user_id = $1
      `, [userId]);
            const averageBet = bettingStats[0]?.avg_bet ? parseFloat(bettingStats[0].avg_bet) : 0;
            // Calculate total profit/loss
            const totalProfit = user.totalWinnings - user.totalLosses;
            // Get user rank by ELO
            const rankResult = await (0, database_1.query)(`
        SELECT COUNT(*) + 1 as rank
        FROM users
        WHERE elo_rating > $1 AND is_active = true
      `, [user.eloRating]);
            const rank = parseInt(rankResult[0]?.rank || '0');
            // Get recent games (last 7 days)
            const recentGamesResult = await (0, database_1.query)(`
        SELECT COUNT(*) as recent_games
        FROM matches m
        WHERE (m.player1_id = $1 OR m.player2_id = $1)
        AND m.created_at > NOW() - INTERVAL '7 days'
      `, [userId]);
            const recentGames = parseInt(recentGamesResult[0]?.recent_games || '0');
            return {
                winRate,
                averageBet,
                totalProfit,
                rank,
                recentGames,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting user stats:', error);
            throw error;
        }
    }
    // Verify Solana wallet signature
    verifySignature(signatureData) {
        try {
            const publicKey = new web3_js_1.PublicKey(signatureData.walletAddress);
            const messageBytes = new TextEncoder().encode(signatureData.message);
            const signatureBytes = bs58_1.default.decode(signatureData.signature);
            return tweetnacl_1.default.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
        }
        catch (error) {
            logger_1.logger.debug('Signature verification failed:', error);
            return false;
        }
    }
    // Generate JWT token
    generateJWT(user) {
        return jsonwebtoken_1.default.sign({
            userId: user.id,
            walletAddress: user.walletAddress,
        }, this.jwtSecret, {
            expiresIn: '24h',
            issuer: 'nen-platform',
            subject: user.id,
        });
    }
    // Validate Solana address format
    isValidSolanaAddress(address) {
        try {
            new web3_js_1.PublicKey(address);
            return true;
        }
        catch {
            return false;
        }
    }
    // Map database row to User object
    mapRowToUser(row) {
        return {
            id: row.id,
            walletAddress: row.wallet_address,
            username: row.username,
            email: row.email,
            profileImageUrl: row.profile_image_url,
            solBalance: parseFloat(row.sol_balance || '0'),
            bettingBalance: parseFloat(row.betting_balance || '0'),
            totalWinnings: parseFloat(row.total_winnings || '0'),
            totalLosses: parseFloat(row.total_losses || '0'),
            gamesPlayed: row.games_played || 0,
            gamesWon: row.games_won || 0,
            eloRating: row.elo_rating || 1200,
            isActive: row.is_active,
            preferences: row.preferences || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    // Sign out user (invalidate token)
    async signOut(token) {
        try {
            await this.cache.del(`auth_token:${token}`);
            logger_1.logger.info('User signed out successfully');
        }
        catch (error) {
            logger_1.logger.error('Error signing out user:', error);
            throw error;
        }
    }
    // Get leaderboard
    async getLeaderboard(limit = 20) {
        try {
            const rows = await (0, database_1.query)(`
        SELECT
          u.id, u.username, u.wallet_address, u.elo_rating,
          u.games_played, u.games_won,
          ROW_NUMBER() OVER (ORDER BY u.elo_rating DESC) as rank
        FROM users u
        WHERE u.is_active = true AND u.games_played > 0
        ORDER BY u.elo_rating DESC
        LIMIT $1
      `, [limit]);
            return rows.map(row => ({
                rank: parseInt(row.rank),
                user: {
                    id: row.id,
                    username: row.username,
                    walletAddress: row.wallet_address,
                    eloRating: row.elo_rating,
                    gamesPlayed: row.games_played,
                    gamesWon: row.games_won,
                },
                winRate: row.games_played > 0 ? (row.games_won / row.games_played) * 100 : 0,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting leaderboard:', error);
            throw error;
        }
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map