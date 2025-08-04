"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AIService_1 = require("../../services/AIService");
const GameStateGenerator_1 = require("../helpers/GameStateGenerator");
const aiService = new AIService_1.AIService();
describe('Material Balance and Personality Evaluation', () => {
    it('should evaluate material balance correctly on standard board', async () => {
        const gameState = GameStateGenerator_1.GameStateGenerator.createMidgameState();
        const move = await aiService.getMove('sampleAgentId', gameState);
    });
    it('should show over 10% variance with personality modifier impact', async () => {
        const gameState = GameStateGenerator_1.GameStateGenerator.createMidgameState();
        const move1 = await aiService.getMove('agentId1', gameState);
        const move2 = await aiService.getMove('agentId2', gameState);
        expect(calculateVariance(move1.evaluation, move2.evaluation)).toBeGreaterThan(10);
    });
    it('should handle empty board correctly', async () => {
        const gameState = GameStateGenerator_1.GameStateGenerator.createNoMovesState();
        const move = await aiService.getMove('sampleAgentId', gameState);
        expect(move).toBeNull();
    });
});
//# sourceMappingURL=material-balance.test.js.map