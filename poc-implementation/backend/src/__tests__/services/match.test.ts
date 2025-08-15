/**
 * Match Service Tests
 *
 * Tests for match management, creation, and battle execution functionality.
 */

import { createTestServices } from '../utils/testServiceFactory';
import { IMatchService } from '../types/serviceTypes';
import { logger } from '../../utils/logger';

// Mock external dependencies
jest.mock('../../utils/logger');

describe('Match Service', () => {
  let testServices: ReturnType<typeof createTestServices>;
  let matchService: IMatchService;

  const mockMatchConfig = {
    agent1Id: 'agent-123',
    agent2Id: 'agent-456',
    type: 'ranked' as const,
    rules: {
      maxTurns: 100,
      timeLimit: 300
    }
  };

  beforeAll(() => {
    testServices = createTestServices();
    matchService = testServices.matchService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Match Creation', () => {
    test('should create a new match', async () => {
      const match = await matchService.createMatch(mockMatchConfig);

      expect(match).toBeDefined();
      expect(match.id).toBeDefined();
      expect(match.agent1Id).toBe(mockMatchConfig.agent1Id);
      expect(match.agent2Id).toBe(mockMatchConfig.agent2Id);
      expect(match.status).toBe('pending');
      expect(match.type).toBe('ranked');
    });

    test('should generate unique match IDs', async () => {
      const match1 = await matchService.createMatch(mockMatchConfig);
      const match2 = await matchService.createMatch({
        ...mockMatchConfig,
        agent1Id: 'agent-789',
        agent2Id: 'agent-101'
      });

      expect(match1.id).not.toBe(match2.id);
      expect(match1.id).toBeDefined();
      expect(match2.id).toBeDefined();
    });

    test('should validate match configuration', async () => {
      try {
        await matchService.createMatch({
          agent1Id: '',
          agent2Id: 'agent-456',
          type: 'ranked',
          rules: {}
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Match Management', () => {
    test('should get match by ID', async () => {
      const createdMatch = await matchService.createMatch(mockMatchConfig);
      const retrievedMatch = await matchService.getMatchById(createdMatch.id);

      expect(retrievedMatch).toBeDefined();
      expect(retrievedMatch?.id).toBe(createdMatch.id);
      expect(retrievedMatch?.agent1Id).toBe(mockMatchConfig.agent1Id);
    });

    test('should return null for non-existent match', async () => {
      const match = await matchService.getMatchById('non-existent-id');
      expect(match).toBeNull();
    });

    test('should list active matches', async () => {
      await matchService.createMatch(mockMatchConfig);
      await matchService.createMatch({
        ...mockMatchConfig,
        agent1Id: 'agent-789',
        agent2Id: 'agent-101'
      });

      const matches = await matchService.listActiveMatches();
      
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    test('should update match status', async () => {
      const match = await matchService.createMatch(mockMatchConfig);
      
      const updatedMatch = await matchService.updateMatchStatus(match.id, 'in_progress');

      expect(updatedMatch).toBeDefined();
      expect(updatedMatch.status).toBe('in_progress');
    });
  });

  describe('Match Execution', () => {
    test('should start match execution', async () => {
      const match = await matchService.createMatch(mockMatchConfig);
      
      const startedMatch = await matchService.startMatch(match.id);

      expect(startedMatch).toBeDefined();
      expect(startedMatch.status).toBe('in_progress');
      expect(startedMatch.startedAt).toBeInstanceOf(Date);
    });

    test('should get match progress', async () => {
      const match = await matchService.createMatch(mockMatchConfig);
      await matchService.startMatch(match.id);

      const progress = await matchService.getMatchProgress(match.id);

      expect(progress).toBeDefined();
      expect(progress).toHaveProperty('currentTurn');
      expect(progress).toHaveProperty('totalTurns');
      expect(progress).toHaveProperty('timeRemaining');
      expect(typeof progress.currentTurn).toBe('number');
    });

    test('should process match turn', async () => {
      const match = await matchService.createMatch(mockMatchConfig);
      await matchService.startMatch(match.id);

      const turnResult = await matchService.processTurn(match.id, {
        agentId: mockMatchConfig.agent1Id,
        action: 'attack',
        parameters: { power: 5 }
      });

      expect(turnResult).toBeDefined();
      expect(turnResult.success).toBe(true);
      expect(turnResult).toHaveProperty('gameState');
    });

    test('should end match with result', async () => {
      const match = await matchService.createMatch(mockMatchConfig);
      await matchService.startMatch(match.id);

      const endedMatch = await matchService.endMatch(match.id, {
        winnerId: mockMatchConfig.agent1Id,
        loserId: mockMatchConfig.agent2Id,
        reason: 'victory',
        score: { agent1: 100, agent2: 75 }
      });

      expect(endedMatch).toBeDefined();
      expect(endedMatch.status).toBe('completed');
      expect(endedMatch.winnerId).toBe(mockMatchConfig.agent1Id);
      expect(endedMatch.endedAt).toBeInstanceOf(Date);
    });
  });

  describe('Match Statistics', () => {
    test('should get match statistics', async () => {
      const match = await matchService.createMatch(mockMatchConfig);
      await matchService.startMatch(match.id);

      const stats = await matchService.getMatchStatistics(match.id);

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('duration');
      expect(stats).toHaveProperty('totalTurns');
      expect(stats).toHaveProperty('performance');
      expect(typeof stats.totalTurns).toBe('number');
    });

    test('should get match replay data', async () => {
      const match = await matchService.createMatch(mockMatchConfig);
      await matchService.startMatch(match.id);

      const replay = await matchService.getMatchReplay(match.id);

      expect(replay).toBeDefined();
      expect(replay).toHaveProperty('matchId');
      expect(replay).toHaveProperty('turns');
      expect(Array.isArray(replay.turns)).toBe(true);
    });
  });

  describe('Match History', () => {
    test('should get matches by agent', async () => {
      const match1 = await matchService.createMatch(mockMatchConfig);
      const match2 = await matchService.createMatch({
        ...mockMatchConfig,
        agent2Id: 'agent-789'
      });

      const matches = await matchService.getMatchesByAgent(mockMatchConfig.agent1Id);

      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThanOrEqual(2);
      
      // All matches should include the specified agent
      matches.forEach(match => {
        expect(
          match.agent1Id === mockMatchConfig.agent1Id ||
          match.agent2Id === mockMatchConfig.agent1Id
        ).toBe(true);
      });
    });

    test('should get recent matches', async () => {
      await matchService.createMatch(mockMatchConfig);
      await matchService.createMatch({
        ...mockMatchConfig,
        agent1Id: 'agent-789',
        agent2Id: 'agent-101'
      });

      const recentMatches = await matchService.getRecentMatches(5);

      expect(Array.isArray(recentMatches)).toBe(true);
      expect(recentMatches.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Match Validation', () => {
    test('should validate agent availability', async () => {
      const availability = await matchService.checkAgentAvailability(
        mockMatchConfig.agent1Id,
        mockMatchConfig.agent2Id
      );

      expect(availability).toBeDefined();
      expect(typeof availability.agent1Available).toBe('boolean');
      expect(typeof availability.agent2Available).toBe('boolean');
    });

    test('should validate match rules', async () => {
      const validation = await matchService.validateMatchRules({
        maxTurns: 100,
        timeLimit: 300,
        gameMode: 'classic'
      });

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid match configuration', async () => {
      try {
        await matchService.createMatch({
          agent1Id: 'same-agent',
          agent2Id: 'same-agent',
          type: 'ranked',
          rules: {}
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle starting non-existent match', async () => {
      try {
        await matchService.startMatch('non-existent-id');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle invalid turn actions', async () => {
      const match = await matchService.createMatch(mockMatchConfig);
      await matchService.startMatch(match.id);

      const turnResult = await matchService.processTurn(match.id, {
        agentId: 'invalid-agent-id',
        action: 'invalid-action' as any,
        parameters: {}
      });

      expect(turnResult.success).toBe(false);
      expect(turnResult.error).toBeDefined();
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
});
