"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GameService_1 = require("../services/GameService");
const agent_management_test_1 = require("../__tests__/ai/agent-management.test");
const gameService = new GameService_1.GameService();
const mockAIManager = new agent_management_test_1.MockAIManager();
const AI_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
(0, globals_1.describe)('Match Creation Tests', () => {
    (0, globals_1.test)('should create matches with various AI difficulty levels', async () => {
        for (const difficulty of AI_DIFFICULTIES) {
            const aiAgent1 = mockAIManager.getAgent(difficulty, 'balanced');
            const aiAgent2 = mockAIManager.getAgent(difficulty, 'balanced');
            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: aiAgent1?.id,
                aiAgent2Id: aiAgent2?.id,
            });
            (0, globals_1.expect)(match).toBeDefined();
            (0, globals_1.expect)(match.aiAgent1Id).toBe(aiAgent1?.id);
            (0, globals_1.expect)(match.aiAgent2Id).toBe(aiAgent2?.id);
            (0, globals_1.expect)(match.matchType).toBe('ai_vs_ai');
        }
    });
    (0, globals_1.test)('should handle invalid AI types or missing configurations', async () => {
        await (0, globals_1.expect)(gameService.createMatch({ matchType: 'ai_vs_ai' })).rejects.toThrow();
        await (0, globals_1.expect)(gameService.createMatch({ matchType: 'invalid_type', aiAgent1Id: '1', aiAgent2Id: '2' })).rejects.toThrow();
    });
    (0, globals_1.test)('verify match state after creation', async () => {
        const aiAgent1 = mockAIManager.getAgent('medium', 'aggressive');
        const aiAgent2 = mockAIManager.getAgent('medium', 'defensive');
        const match = await gameService.createMatch({
            matchType: 'ai_vs_ai',
            aiAgent1Id: aiAgent1?.id,
            aiAgent2Id: aiAgent2?.id,
        });
        (0, globals_1.expect)(match.status).toBe('pending');
        const startedMatch = await gameService.startMatch(match.id);
        (0, globals_1.expect)(startedMatch.status).toBe('active');
    });
    (0, globals_1.test)('should process concurrent match creation requests', async () => {
        const matchRequests = Array.from({ length: 10 }, (_, i) => {
            return gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: `agent1-${i}`,
                aiAgent2Id: `agent2-${i}`,
            });
        });
        const matches = await Promise.all(matchRequests);
        (0, globals_1.expect)(matches).toHaveLength(10);
        const ids = matches.map(match => match.id);
        (0, globals_1.expect)(new Set(ids).size).toBe(10);
    });
});
//# sourceMappingURL=match-creation.test.js.map