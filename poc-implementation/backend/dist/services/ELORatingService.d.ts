export interface ELORatingData {
    userId: string;
    currentRating: number;
    previousRating: number;
    ratingChange: number;
    matchId: string;
    opponentId: string;
    opponentRating: number;
    matchResult: 'win' | 'loss' | 'draw';
    k_factor: number;
    expectedScore: number;
    actualScore: number;
    confidence: number;
    gamesPlayed: number;
    timestamp: Date;
}
export interface ELOConfiguration {
    k_factors: {
        provisional: number;
        novice: number;
        average: number;
        expert: number;
        master: number;
    };
    min_rating: number;
    max_rating: number;
    starting_rating: number;
    provisional_games: number;
    draw_probability: number;
    rating_floor: number;
}
export interface RatingHistory {
    id: string;
    userId: string;
    matchId: string;
    ratingBefore: number;
    ratingAfter: number;
    ratingChange: number;
    opponentId: string;
    opponentRating: number;
    matchResult: 'win' | 'loss' | 'draw';
    k_factor: number;
    expectedScore: number;
    actualScore: number;
    confidence: number;
    isProvisional: boolean;
    timestamp: Date;
}
export interface PlayerRatingProfile {
    userId: string;
    currentRating: number;
    peakRating: number;
    lowestRating: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    isProvisional: boolean;
    confidence: number;
    ratingVolatility: number;
    recentForm: ('W' | 'L' | 'D')[];
    averageOpponentRating: number;
    ratingTrend: 'up' | 'down' | 'stable';
    lastUpdated: Date;
}
export declare class ELORatingService {
    private cache;
    private config;
    constructor();
    /**
     * Update ELO ratings for two players after a match
     */
    updateRatings(player1Id: string, player2Id: string, matchId: string, result: 'player1_wins' | 'player2_wins' | 'draw'): Promise<{
        player1: ELORatingData;
        player2: ELORatingData;
    }>;
    /**
     * Get comprehensive player rating profile
     */
    getPlayerProfile(userId: string): Promise<PlayerRatingProfile | null>;
    /**
     * Calculate expected scores using ELO formula
     */
    private calculateExpectedScores;
    /**
     * Determine K-factor based on player profile
     */
    private getKFactor;
    /**
     * Calculate rating change using ELO formula
     */
    private calculateRatingChange;
    /**
     * Apply rating bounds and anti-inflation measures
     */
    private applyRatingBounds;
    /**
     * Calculate confidence level based on games played
     */
    private calculateConfidence;
    /**
     * Persist rating updates to database and cache
     */
    private persistRatingUpdates;
    /**
     * Get rating history for a player
     */
    getRatingHistory(userId: string, limit?: number, offset?: number): Promise<RatingHistory[]>;
    /**
     * Get global leaderboard with comprehensive stats
     */
    getLeaderboard(limit?: number): Promise<Array<{
        rank: number;
        profile: PlayerRatingProfile;
    }>>;
    /**
     * Recalculate all ratings (admin function for consistency checks)
     */
    recalculateAllRatings(): Promise<{
        usersProcessed: number;
        errors: string[];
    }>;
    /**
     * Recalculate rating for a specific user
     */
    private recalculateUserRating;
    /**
     * Helper method to get K-factor based on rating alone
     */
    private getKFactorForRating;
}
//# sourceMappingURL=ELORatingService.d.ts.map