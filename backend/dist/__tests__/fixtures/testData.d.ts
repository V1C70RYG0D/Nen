export interface TestUser {
    username: string;
    email: string;
    walletAddress?: string;
}
export interface TestMatch {
    matchType: 'ai_vs_ai' | 'player_vs_ai' | 'player_vs_player';
    aiAgent1Id?: string;
    aiAgent2Id?: string;
    player1Id?: string;
    player2Id?: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    betAmount?: number;
}
export interface TestAgent {
    name: string;
    type: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    attributes?: Record<string, any>;
}
export declare function createTestUser(userData: TestUser): Promise<string>;
export declare function createTestMatch(matchData: TestMatch): Promise<string>;
export declare function createTestAgent(agentData: TestAgent): Promise<string>;
export declare function getTestUser(userId: string): (TestUser & {
    id: string;
}) | undefined;
export declare function getTestMatch(matchId: string): (TestMatch & {
    id: string;
    createdAt: string;
}) | undefined;
export declare function getTestAgent(agentId: string): (TestAgent & {
    id: string;
    tokenId: string;
}) | undefined;
export declare function getAllTestUsers(): (TestUser & {
    id: string;
})[];
export declare function getAllTestMatches(): (TestMatch & {
    id: string;
    createdAt: string;
})[];
export declare function getAllTestAgents(): (TestAgent & {
    id: string;
    tokenId: string;
})[];
export declare function clearTestData(): void;
export declare function createSampleData(): Promise<{
    users: string[];
    agents: string[];
    matches: string[];
}>;
export declare function createTestBettingPool(matchId: string): {
    gameId: string;
    totalPool: number;
    pools: {
        agentId: string;
        agentName: string;
        totalBets: number;
        odds: number;
        bettors: number;
    }[];
    lastUpdated: string;
};
export declare function createTestBettingHistory(userId: string): {
    betId: string;
    gameId: string;
    agentId: string;
    amount: number;
    odds: number;
    status: string;
    payout: number;
    placedAt: string;
    settledAt: string;
}[];
export declare function createTestNFTCollection(userId: string): ({
    tokenId: string;
    name: string;
    type: string;
    rarity: string;
    attributes: {
        winRate: number;
        elo: number;
        customizations: string[];
        pieceStyle?: undefined;
        boardTheme?: undefined;
    };
    acquiredAt: string;
    isListed: boolean;
} | {
    tokenId: string;
    name: string;
    type: string;
    rarity: string;
    attributes: {
        pieceStyle: string;
        boardTheme: string;
        winRate?: undefined;
        elo?: undefined;
        customizations?: undefined;
    };
    acquiredAt: string;
    isListed: boolean;
})[];
//# sourceMappingURL=testData.d.ts.map