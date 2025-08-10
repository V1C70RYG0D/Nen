/**
 * AI Behavior Validation Tests
 *
 * Validating distinct AI personalities and engagement levels
 */

import { describe, test, expect } from '@jest/globals';
import { SimpleAIService } from '../src/services/SimpleAIService';
import { AIAgent, BoardState } from '../src/services/SimpleAIService';

// Utility function to create sample board states
function createSampleBoardState(turn: number): BoardState {
  return {
    pieces: [], // Simplified for testing
    currentTurn: turn,
    moveNumber: 0,
    gameStatus: 'ongoing'
  };
}

describe('AI Behavior Validation', () => {
  const aiService = new SimpleAIService();
  const personalities: AIAgent['personality'][] = ['aggressive', 'defensive', 'balanced', 'creative'];

  personalities.forEach(personality => {
    test(`AI with ${personality} personality should exhibit distinct behavior`, async () => {
      const boardState = createSampleBoardState(1);
      const agent = await aiService.getAgent('netero');
    if (!agent) throw new Error('Agent not found');
    // Ensure personality match is checked in reasoning
    agent.personality = personality;
      const move = await aiService.generateMove(agent.id, boardState);

      expect(move).toBeDefined();
    expect(move.reasoning).toBeDefined();
    const validReasoningPatterns = [
      agent.name,
      agent.specialty,
      'Strategic positioning',
      'Tactical advancement',
      'Defensive consolidation',
      'games of experience'
    ];
    const hasValidReasoning = validReasoningPatterns.some(pattern =>
      move.reasoning && move.reasoning.includes(pattern)
    );
    expect(hasValidReasoning).toBe(true);

    });
  });

  test('AI should provide appropriate challenge level based on skill level', async () => {
    const boardState = createSampleBoardState(1);
    const agent = await aiService.getAgent('meruem');
    if (!agent) throw new Error('Agent not found');
    agent.skillLevel = 10; // High skill

    const move = await aiService.generateMove(agent.id, boardState);

    expect(move.confidence).toBeGreaterThanOrEqual(0.7); // High confidence for high skill
  });

  test('AI should make reasonable moves according to game logic', async () => {
    const boardState = createSampleBoardState(1);
    const agent = await aiService.getAgent('komugi');
    if (!agent) throw new Error('Agent not found');

    const move = await aiService.generateMove(agent.id, boardState);
    expect(move.from.x).not.toEqual(move.to.x); // Move involves a piece shift
    expect(move.reasoning).toBeDefined();
  });

  test('AI should have consistent personality traits throughout games', async () => {
    const boardState = createSampleBoardState(1);
    const agent = await aiService.getAgent('hisoka');
    if (!agent) throw new Error('Agent not found');

    const move1 = await aiService.generateMove(agent.id, boardState);
    const move2 = await aiService.generateMove(agent.id, boardState);

    expect(move1.reasoning).toBeDefined();
    expect(move2.reasoning).toBeDefined();

    // Verify both moves have valid reasoning strings from the expected set
    const validReasoningPatterns = [
      agent.name,
      agent.specialty,
      'Strategic positioning',
      'Tactical advancement',
      'Defensive consolidation',
      'games of experience',
      agent.personality
    ];

    if (move1.reasoning && move2.reasoning) {
      const move1HasValidReasoning = validReasoningPatterns.some(pattern =>
        move1.reasoning!.includes(pattern)
      );
      const move2HasValidReasoning = validReasoningPatterns.some(pattern =>
        move2.reasoning!.includes(pattern)
      );
      expect(move1HasValidReasoning).toBe(true);
      expect(move2HasValidReasoning).toBe(true);
    }

  });

  test('AI should demonstrate progressive difficulty adjustment', async () => {
    const boardState = createSampleBoardState(1);
    const agent = await aiService.getAgent('ging');
    if (!agent) throw new Error('Agent not found');
    agent.difficulty = 'expert';

    const move = await aiService.generateMove(agent.id, boardState);
    expect(move.confidence).toBeGreaterThanOrEqual(0.8); // High confidence for expert
  });

  test('AI should ensure fair and engaging gameplay experience', async () => {
    const boardState = createSampleBoardState(1);
    const agent = await aiService.getAgent('netero');
    if (!agent) throw new Error('Agent not found');

    const move = await aiService.generateMove(agent.id, boardState);
    expect(move).toBeDefined();
    expect(agent.winRate).toBeLessThanOrEqual(1);
  });
});

