import { AIService } from '../../services/AIService';
import { GameStateGenerator } from '../helpers/GameStateGenerator';

const aiService = new AIService();

describe('Material Balance and Personality Evaluation', () => {
  it('should evaluate material balance correctly on standard board', async () => {
    const gameState = GameStateGenerator.createMidgameState();
    const move = await aiService.getMove('sampleAgentId', gameState);
    // Assert evaluation logic here
  });

  it('should show over 10% variance with personality modifier impact', async () => {
    const gameState = GameStateGenerator.createMidgameState();
    // Adjust personality traits
    const move1 = await aiService.getMove('agentId1', gameState);
    const move2 = await aiService.getMove('agentId2', gameState);
    // Calculate variance
    expect(calculateVariance(move1.evaluation, move2.evaluation)).toBeGreaterThan(10);
  });

  it('should handle empty board correctly', async () => {
    const gameState = GameStateGenerator.createNoMovesState();
    const move = await aiService.getMove('sampleAgentId', gameState);
    expect(move).toBeNull();
  });
});

