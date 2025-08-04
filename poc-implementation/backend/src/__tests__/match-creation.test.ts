/**
 * Match Creation with AI Agents Test Suite
 *
 * Test Scenarios:
 * - Diverse AI difficulty matches
 * - Initialization and configuration of AI agents
 * - Edge cases for invalid/types
 * - Verification of match state and data handling
 * - Concurrent match creation handling
 */

import { v4 as uuidv4 } from 'uuid';
import { describe, test, expect } from '@jest/globals';
import { GameService } from '../services/GameService';
import { MockAIManager } from '../__tests__/ai/agent-management.test'; // Assuming MockAIManager exists

const gameService = new GameService();
const mockAIManager = new MockAIManager();

// Test data configuration
const AI_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];

// Test cases for match creation

describe('Match Creation Tests', () => {

    test('should create matches with various AI difficulty levels', async () => {
        for (const difficulty of AI_DIFFICULTIES) {
            const aiAgent1 = mockAIManager.getAgent(difficulty, 'balanced');
            const aiAgent2 = mockAIManager.getAgent(difficulty, 'balanced');

            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: aiAgent1?.id,
                aiAgent2Id: aiAgent2?.id,
            });

            expect(match).toBeDefined();
            expect(match.aiAgent1Id).toBe(aiAgent1?.id);
            expect(match.aiAgent2Id).toBe(aiAgent2?.id);
            expect(match.matchType).toBe('ai_vs_ai');
        }
    });

    test('should handle invalid AI types or missing configurations', async () => {
        await expect(gameService.createMatch({ matchType: 'ai_vs_ai' })).rejects.toThrow();
        await expect(gameService.createMatch({ matchType: 'invalid_type', aiAgent1Id: '1', aiAgent2Id: '2' })).rejects.toThrow();
    });

    test('verify match state after creation', async () => {
        const aiAgent1 = mockAIManager.getAgent('medium', 'aggressive');
        const aiAgent2 = mockAIManager.getAgent('medium', 'defensive');
        const match = await gameService.createMatch({
            matchType: 'ai_vs_ai',
            aiAgent1Id: aiAgent1?.id,
            aiAgent2Id: aiAgent2?.id,
        });

        expect(match.status).toBe('pending');

        const startedMatch = await gameService.startMatch(match.id);
        expect(startedMatch.status).toBe('active');
    });

    test('should process concurrent match creation requests', async () => {
        const matchRequests = Array.from({ length: 10 }, (_, i) => {
            return gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: `agent1-${i}`,
                aiAgent2Id: `agent2-${i}`,
            });
        });

        const matches = await Promise.all(matchRequests);
        expect(matches).toHaveLength(10);

        const ids = matches.map(match => match.id);
        expect(new Set(ids).size).toBe(10); // All IDs should be unique
    });
});

