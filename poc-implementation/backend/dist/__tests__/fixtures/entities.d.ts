/**
 * Test Fixtures for Match, Player, and AI Agent Configurations
 */
interface MatchFixture {
    id: string;
    players: [string, string];
    status: 'pending' | 'active' | 'completed';
    winner?: string;
}
interface PlayerFixture {
    id: string;
    name: string;
    rating: number;
}
interface AIAgentFixture {
    id: string;
    level: number;
    strategy: string;
}
export declare const matchFixture: MatchFixture;
export declare const playerFixture1: PlayerFixture;
export declare const playerFixture2: PlayerFixture;
export declare const aiAgentFixture: AIAgentFixture;
export {};
//# sourceMappingURL=entities.d.ts.map