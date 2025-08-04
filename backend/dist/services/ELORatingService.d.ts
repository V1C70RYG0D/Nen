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
    updateRatings(player1Id: string, player2Id: string, matchId: string, result: 'player1_wins' | 'player2_wins' | 'draw'): Promise<{
        player1: ELORatingData;
        player2: ELORatingData;
    }>;
    getPlayerProfile(userId: string): Promise<PlayerRatingProfile | null>;
    private calculateExpectedScores;
    private getKFactor;
    private calculateRatingChange;
    private applyRatingBounds;
    private calculateConfidence;
    private persistRatingUpdates;
    getRatingHistory(userId: string, limit?: number, offset?: number): Promise<RatingHistory[]>;
    getLeaderboard(limit?: number): Promise<Array<{
        rank: number;
        profile: PlayerRatingProfile;
    }>>;
    recalculateAllRatings(): Promise<{
        usersProcessed: number;
        errors: string[];
    }>;
    private recalculateUserRating;
    private getKFactorForRating;
}
//# sourceMappingURL=ELORatingService.d.ts.map