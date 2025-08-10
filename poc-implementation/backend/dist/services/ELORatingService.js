"use strict";
// ELO Rating Service
// Comprehensive ELO rating system with robust calculations, edge case handling,
// and consistency across sessions following competitive gaming standards
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELORatingService = void 0;
const logger_1 = require("../utils/logger");
const database_1 = require("../utils/database");
const redis_1 = require("../utils/redis");
const uuid_1 = require("uuid");
class ELORatingService {
    constructor() {
        this.cache = new redis_1.CacheService();
        this.config = {
            k_factors: {
                provisional: 40, // Higher K for new players
                novice: 32, // Standard K for beginners
                average: 24, // Standard K for average players
                expert: 16, // Lower K for experienced players
                master: 12, // Lowest K for masters
            },
            min_rating: 100,
            max_rating: 3000,
            starting_rating: 1200,
            provisional_games: 30,
            draw_probability: 0.05, // 5% chance of draws in Gungi
            rating_floor: 800, // Minimum rating to prevent extreme drops
        };
    }
    /**
     * Update ELO ratings for two players after a match
     */
    async updateRatings(player1Id, player2Id, matchId, result) {
        try {
            // Get current player ratings and statistics
            const [player1Profile, player2Profile] = await Promise.all([
                this.getPlayerProfile(player1Id),
                this.getPlayerProfile(player2Id),
            ]);
            if (!player1Profile || !player2Profile) {
                throw new Error('Player profiles not found');
            }
            // Calculate expected scores using ELO formula
            const expectedScores = this.calculateExpectedScores(player1Profile.currentRating, player2Profile.currentRating);
            // Determine actual scores based on match result
            let player1Score, player2Score;
            switch (result) {
                case 'player1_wins':
                    player1Score = 1.0;
                    player2Score = 0.0;
                    break;
                case 'player2_wins':
                    player1Score = 0.0;
                    player2Score = 1.0;
                    break;
                case 'draw':
                    player1Score = 0.5;
                    player2Score = 0.5;
                    break;
                default:
                    throw new Error('Invalid match result');
            }
            // Get K-factors for both players
            const player1K = this.getKFactor(player1Profile);
            const player2K = this.getKFactor(player2Profile);
            // Calculate rating changes
            const player1Change = this.calculateRatingChange(player1K, player1Score, expectedScores.player1);
            const player2Change = this.calculateRatingChange(player2K, player2Score, expectedScores.player2);
            // Apply rating bounds and anti-inflation measures
            const player1NewRating = this.applyRatingBounds(player1Profile.currentRating + player1Change, player1Profile.gamesPlayed);
            const player2NewRating = this.applyRatingBounds(player2Profile.currentRating + player2Change, player2Profile.gamesPlayed);
            // Create rating data objects
            const player1Rating = {
                userId: player1Id,
                currentRating: player1NewRating,
                previousRating: player1Profile.currentRating,
                ratingChange: player1NewRating - player1Profile.currentRating,
                matchId,
                opponentId: player2Id,
                opponentRating: player2Profile.currentRating,
                matchResult: player1Score === 1 ? 'win' : player1Score === 0 ? 'loss' : 'draw',
                k_factor: player1K,
                expectedScore: expectedScores.player1,
                actualScore: player1Score,
                confidence: this.calculateConfidence(player1Profile.gamesPlayed),
                gamesPlayed: player1Profile.gamesPlayed + 1,
                timestamp: new Date(),
            };
            const player2Rating = {
                userId: player2Id,
                currentRating: player2NewRating,
                previousRating: player2Profile.currentRating,
                ratingChange: player2NewRating - player2Profile.currentRating,
                matchId,
                opponentId: player1Id,
                opponentRating: player1Profile.currentRating,
                matchResult: player2Score === 1 ? 'win' : player2Score === 0 ? 'loss' : 'draw',
                k_factor: player2K,
                expectedScore: expectedScores.player2,
                actualScore: player2Score,
                confidence: this.calculateConfidence(player2Profile.gamesPlayed),
                gamesPlayed: player2Profile.gamesPlayed + 1,
                timestamp: new Date(),
            };
            // Update database and cache in transaction
            await this.persistRatingUpdates(player1Rating, player2Rating);
            logger_1.logger.info('ELO ratings updated successfully', {
                matchId,
                player1: {
                    id: player1Id,
                    oldRating: player1Profile.currentRating,
                    newRating: player1NewRating,
                    change: player1Rating.ratingChange,
                },
                player2: {
                    id: player2Id,
                    oldRating: player2Profile.currentRating,
                    newRating: player2NewRating,
                    change: player2Rating.ratingChange,
                },
            });
            return {
                player1: player1Rating,
                player2: player2Rating,
            };
        }
        catch (error) {
            logger_1.logger.error('Error updating ELO ratings:', error);
            throw new Error('Failed to update ELO ratings');
        }
    }
    /**
     * Get comprehensive player rating profile
     */
    async getPlayerProfile(userId) {
        try {
            const cacheKey = `player_profile:${userId}`;
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            // Get user basic data
            const userRows = await (0, database_1.query)(`
        SELECT
          id, elo_rating, games_played, games_won,
          total_winnings, total_losses, created_at
        FROM users
        WHERE id = $1 AND is_active = true
      `, [userId]);
            if (userRows.length === 0) {
                return null;
            }
            const user = userRows[0];
            // Get detailed rating statistics
            const statsRows = await (0, database_1.query)(`
        SELECT
          COUNT(*) as total_games,
          SUM(CASE WHEN match_result = 'win' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN match_result = 'loss' THEN 1 ELSE 0 END) as losses,
          SUM(CASE WHEN match_result = 'draw' THEN 1 ELSE 0 END) as draws,
          MAX(rating_after) as peak_rating,
          MIN(rating_after) as lowest_rating,
          AVG(opponent_rating) as avg_opponent_rating,
          STDDEV(rating_change) as rating_volatility
        FROM rating_history
        WHERE user_id = $1
      `, [userId]);
            const stats = statsRows[0] || {};
            // Get recent form (last 10 games)
            const recentGamesRows = await (0, database_1.query)(`
        SELECT match_result
        FROM rating_history
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT 10
      `, [userId]);
            const recentForm = recentGamesRows.map((row) => {
                switch (row.match_result) {
                    case 'win': return 'W';
                    case 'loss': return 'L';
                    case 'draw': return 'D';
                    default: return 'L';
                }
            });
            // Calculate rating trend (last 20 games)
            const trendRows = await (0, database_1.query)(`
        SELECT rating_change
        FROM rating_history
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT 20
      `, [userId]);
            const averageTrend = trendRows.length > 0
                ? trendRows.reduce((sum, row) => sum + row.rating_change, 0) / trendRows.length
                : 0;
            const ratingTrend = averageTrend > 5 ? 'up' : averageTrend < -5 ? 'down' : 'stable';
            const profile = {
                userId,
                currentRating: user.elo_rating || this.config.starting_rating,
                peakRating: stats.peak_rating || user.elo_rating || this.config.starting_rating,
                lowestRating: stats.lowest_rating || user.elo_rating || this.config.starting_rating,
                gamesPlayed: parseInt(stats.total_games) || 0,
                wins: parseInt(stats.wins) || 0,
                losses: parseInt(stats.losses) || 0,
                draws: parseInt(stats.draws) || 0,
                winRate: stats.total_games > 0 ? (stats.wins / stats.total_games) * 100 : 0,
                isProvisional: (parseInt(stats.total_games) || 0) < this.config.provisional_games,
                confidence: this.calculateConfidence(parseInt(stats.total_games) || 0),
                ratingVolatility: parseFloat(stats.rating_volatility) || 0,
                recentForm,
                averageOpponentRating: parseFloat(stats.avg_opponent_rating) || this.config.starting_rating,
                ratingTrend,
                lastUpdated: new Date(),
            };
            // Cache for 5 minutes
            await this.cache.set(cacheKey, profile, 300);
            return profile;
        }
        catch (error) {
            logger_1.logger.error('Error getting player profile:', error);
            throw error;
        }
    }
    /**
     * Calculate expected scores using ELO formula
     */
    calculateExpectedScores(rating1, rating2) {
        const expectedPlayer1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
        const expectedPlayer2 = 1 / (1 + Math.pow(10, (rating1 - rating2) / 400));
        return {
            player1: expectedPlayer1,
            player2: expectedPlayer2,
        };
    }
    /**
     * Determine K-factor based on player profile
     */
    getKFactor(profile) {
        // Use higher K-factor for provisional players
        if (profile.isProvisional) {
            return this.config.k_factors.provisional;
        }
        // Adjust K-factor based on rating range
        if (profile.currentRating < 1400) {
            return this.config.k_factors.novice;
        }
        else if (profile.currentRating < 1800) {
            return this.config.k_factors.average;
        }
        else if (profile.currentRating < 2200) {
            return this.config.k_factors.expert;
        }
        else {
            return this.config.k_factors.master;
        }
    }
    /**
     * Calculate rating change using ELO formula
     */
    calculateRatingChange(kFactor, actualScore, expectedScore) {
        return Math.round(kFactor * (actualScore - expectedScore));
    }
    /**
     * Apply rating bounds and anti-inflation measures
     */
    applyRatingBounds(newRating, gamesPlayed) {
        // Apply absolute bounds
        newRating = Math.max(this.config.min_rating, newRating);
        newRating = Math.min(this.config.max_rating, newRating);
        // Apply rating floor for experienced players to prevent extreme drops
        if (gamesPlayed > this.config.provisional_games) {
            newRating = Math.max(this.config.rating_floor, newRating);
        }
        return Math.round(newRating);
    }
    /**
     * Calculate confidence level based on games played
     */
    calculateConfidence(gamesPlayed) {
        if (gamesPlayed === 0)
            return 0;
        // Confidence approaches 100% as games played increases
        // Using logarithmic scale to prevent infinite growth
        const confidence = Math.min(100, (Math.log(gamesPlayed + 1) / Math.log(100)) * 100);
        return Math.round(confidence * 100) / 100; // Round to 2 decimal places
    }
    /**
     * Persist rating updates to database and cache
     */
    async persistRatingUpdates(player1Rating, player2Rating) {
        await (0, database_1.transaction)(async (client) => {
            // Update user ratings
            await client.query(`
        UPDATE users
        SET
          elo_rating = $2,
          games_played = games_played + 1,
          games_won = games_won + CASE WHEN $3 = 'win' THEN 1 ELSE 0 END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [player1Rating.userId, player1Rating.currentRating, player1Rating.matchResult]);
            await client.query(`
        UPDATE users
        SET
          elo_rating = $2,
          games_played = games_played + 1,
          games_won = games_won + CASE WHEN $3 = 'win' THEN 1 ELSE 0 END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [player2Rating.userId, player2Rating.currentRating, player2Rating.matchResult]);
            // Insert rating history records
            const historyId1 = (0, uuid_1.v4)();
            const historyId2 = (0, uuid_1.v4)();
            await client.query(`
        INSERT INTO rating_history (
          id, user_id, match_id, rating_before, rating_after, rating_change,
          opponent_id, opponent_rating, match_result, k_factor, expected_score,
          actual_score, confidence, is_provisional, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
                historyId1, player1Rating.userId, player1Rating.matchId,
                player1Rating.previousRating, player1Rating.currentRating, player1Rating.ratingChange,
                player1Rating.opponentId, player1Rating.opponentRating, player1Rating.matchResult,
                player1Rating.k_factor, player1Rating.expectedScore, player1Rating.actualScore,
                player1Rating.confidence, player1Rating.gamesPlayed < this.config.provisional_games,
                player1Rating.timestamp
            ]);
            await client.query(`
        INSERT INTO rating_history (
          id, user_id, match_id, rating_before, rating_after, rating_change,
          opponent_id, opponent_rating, match_result, k_factor, expected_score,
          actual_score, confidence, is_provisional, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
                historyId2, player2Rating.userId, player2Rating.matchId,
                player2Rating.previousRating, player2Rating.currentRating, player2Rating.ratingChange,
                player2Rating.opponentId, player2Rating.opponentRating, player2Rating.matchResult,
                player2Rating.k_factor, player2Rating.expectedScore, player2Rating.actualScore,
                player2Rating.confidence, player2Rating.gamesPlayed < this.config.provisional_games,
                player2Rating.timestamp
            ]);
        });
        // Clear relevant caches
        await Promise.all([
            this.cache.del(`player_profile:${player1Rating.userId}`),
            this.cache.del(`player_profile:${player2Rating.userId}`),
            this.cache.del('leaderboard:current'),
            this.cache.del('matches:active'),
        ]);
    }
    /**
     * Get rating history for a player
     */
    async getRatingHistory(userId, limit = 50, offset = 0) {
        try {
            const rows = await (0, database_1.query)(`
        SELECT * FROM rating_history
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);
            return rows.map((row) => ({
                id: row.id,
                userId: row.user_id,
                matchId: row.match_id,
                ratingBefore: row.rating_before,
                ratingAfter: row.rating_after,
                ratingChange: row.rating_change,
                opponentId: row.opponent_id,
                opponentRating: row.opponent_rating,
                matchResult: row.match_result,
                k_factor: row.k_factor,
                expectedScore: row.expected_score,
                actualScore: row.actual_score,
                confidence: row.confidence,
                isProvisional: row.is_provisional,
                timestamp: row.timestamp,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting rating history:', error);
            throw error;
        }
    }
    /**
     * Get global leaderboard with comprehensive stats
     */
    async getLeaderboard(limit = 50) {
        try {
            const cacheKey = 'leaderboard:comprehensive';
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached.slice(0, limit);
            }
            // Get all active users with ratings
            const userRows = await (0, database_1.query)(`
        SELECT id FROM users
        WHERE is_active = true AND games_played > 0
        ORDER BY elo_rating DESC
        LIMIT $1
      `, [limit]);
            const leaderboard = await Promise.all(userRows.map(async (row, index) => {
                const profile = await this.getPlayerProfile(row.id);
                return {
                    rank: index + 1,
                    profile: profile,
                };
            }));
            // Cache for 2 minutes
            await this.cache.set(cacheKey, leaderboard, 120);
            return leaderboard;
        }
        catch (error) {
            logger_1.logger.error('Error getting leaderboard:', error);
            throw error;
        }
    }
    /**
     * Recalculate all ratings (admin function for consistency checks)
     */
    async recalculateAllRatings() {
        try {
            logger_1.logger.info('Starting ELO rating recalculation for all users');
            const results = {
                usersProcessed: 0,
                errors: [],
            };
            // Get all users with match history
            const userRows = await (0, database_1.query)(`
        SELECT DISTINCT u.id
        FROM users u
        INNER JOIN rating_history rh ON u.id = rh.user_id
        WHERE u.is_active = true
        ORDER BY u.created_at ASC
      `);
            for (const userRow of userRows) {
                try {
                    await this.recalculateUserRating(userRow.id);
                    results.usersProcessed++;
                }
                catch (error) {
                    const errorMsg = `Failed to recalculate rating for user ${userRow.id}: ${error}`;
                    logger_1.logger.error(errorMsg);
                    results.errors.push(errorMsg);
                }
            }
            logger_1.logger.info(`ELO rating recalculation completed. Processed: ${results.usersProcessed}, Errors: ${results.errors.length}`);
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error during rating recalculation:', error);
            throw error;
        }
    }
    /**
     * Recalculate rating for a specific user
     */
    async recalculateUserRating(userId) {
        // Get all matches for this user in chronological order
        const matches = await (0, database_1.query)(`
      SELECT
        match_id, opponent_id, opponent_rating, match_result, timestamp
      FROM rating_history
      WHERE user_id = $1
      ORDER BY timestamp ASC
    `, [userId]);
        let currentRating = this.config.starting_rating;
        let gamesPlayed = 0;
        for (const match of matches) {
            gamesPlayed++;
            // Recalculate what the rating should have been
            const expectedScore = this.calculateExpectedScores(currentRating, match.opponent_rating);
            const actualScore = match.match_result === 'win' ? 1 : match.match_result === 'loss' ? 0 : 0.5;
            const kFactor = gamesPlayed < this.config.provisional_games ?
                this.config.k_factors.provisional :
                this.getKFactorForRating(currentRating);
            const ratingChange = this.calculateRatingChange(kFactor, actualScore, expectedScore.player1);
            currentRating = this.applyRatingBounds(currentRating + ratingChange, gamesPlayed);
        }
        // Update user's current rating if different
        await (0, database_1.query)(`
      UPDATE users
      SET elo_rating = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId, currentRating]);
        // Clear cache
        await this.cache.del(`player_profile:${userId}`);
    }
    /**
     * Helper method to get K-factor based on rating alone
     */
    getKFactorForRating(rating) {
        if (rating < 1400) {
            return this.config.k_factors.novice;
        }
        else if (rating < 1800) {
            return this.config.k_factors.average;
        }
        else if (rating < 2200) {
            return this.config.k_factors.expert;
        }
        else {
            return this.config.k_factors.master;
        }
    }
}
exports.ELORatingService = ELORatingService;
//# sourceMappingURL=ELORatingService.js.map