"use strict";
/**
 * Test Fixtures for Match, Player, and AI Agent Configurations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAgentFixture = exports.playerFixture2 = exports.playerFixture1 = exports.matchFixture = void 0;
exports.matchFixture = {
    id: 'sample-match',
    players: ['player1', 'player2'],
    status: 'active',
};
exports.playerFixture1 = {
    id: 'player1',
    name: 'Alice',
    rating: 2000,
};
exports.playerFixture2 = {
    id: 'player2',
    name: 'Bob',
    rating: 1950,
};
exports.aiAgentFixture = {
    id: 'ai-agent-1',
    level: 10,
    strategy: 'aggressive',
};
//# sourceMappingURL=entities.js.map