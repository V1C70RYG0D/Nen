"use strict";
/**
 * Helper Functions for Common Test Operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockMatch = createMockMatch;
exports.transitionGameState = transitionGameState;
exports.createMockPlayer = createMockPlayer;
exports.createMockAIAgent = createMockAIAgent;
const GameStateGenerator_1 = require("./GameStateGenerator");
const entities_1 = require("../fixtures/entities");
function createMockMatch() {
    return { ...entities_1.matchFixture, id: 'mock-match', winner: 'player1' };
}
function transitionGameState(phase) {
    switch (phase) {
        case 'midgame':
            return GameStateGenerator_1.GameStateGenerator.createMidgameState();
        case 'endgame':
            return GameStateGenerator_1.GameStateGenerator.createEndgameState();
        default:
            return GameStateGenerator_1.GameStateGenerator.createInitialState();
    }
}
function createMockPlayer(id) {
    if (id === 'player1')
        return entities_1.playerFixture1;
    if (id === 'player2')
        return entities_1.playerFixture2;
    return { id, name: `Unknown ${id}`, rating: 1000 };
}
function createMockAIAgent() {
    return entities_1.aiAgentFixture;
}
//# sourceMappingURL=testHelper.js.map