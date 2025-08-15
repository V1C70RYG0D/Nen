/**
 * AI Agent Service Tests
 *
 * Tests for AI agent management, training, and battle functionality.
 */

import { createTestServices } from '../utils/testServiceFactory';
import { IAIAgentService } from '../types/serviceTypes';
import { logger } from '../../utils/logger';

// Mock external dependencies
jest.mock('../../utils/logger');

describe('AI Agent Service', () => {
  let testServices: ReturnType<typeof createTestServices>;
  let aiAgentService: IAIAgentService;

  const mockAgentConfig = {
    name: 'TestAgent',
    strategy: 'aggressive',
    parameters: {
      learningRate: 0.01,
      explorationRate: 0.1
    }
  };

  beforeAll(() => {
    testServices = createTestServices();
    aiAgentService = testServices.aiAgentService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Agent Creation', () => {
    test('should create a new AI agent', async () => {
      const agent = await aiAgentService.createAgent(mockAgentConfig);

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe(mockAgentConfig.name);
      expect(agent.strategy).toBe(mockAgentConfig.strategy);
      expect(agent.status).toBe('active');
    });

    test('should generate unique agent IDs', async () => {
      const agent1 = await aiAgentService.createAgent({
        ...mockAgentConfig,
        name: 'Agent1'
      });
      
      const agent2 = await aiAgentService.createAgent({
        ...mockAgentConfig,
        name: 'Agent2'
      });

      expect(agent1.id).not.toBe(agent2.id);
      expect(agent1.name).not.toBe(agent2.name);
    });
  });

  describe('Agent Management', () => {
    test('should get agent by ID', async () => {
      const createdAgent = await aiAgentService.createAgent(mockAgentConfig);
      const retrievedAgent = await aiAgentService.getAgentById(createdAgent.id);

      expect(retrievedAgent).toBeDefined();
      expect(retrievedAgent?.id).toBe(createdAgent.id);
      expect(retrievedAgent?.name).toBe(mockAgentConfig.name);
    });

    test('should return null for non-existent agent', async () => {
      const agent = await aiAgentService.getAgentById('non-existent-id');
      expect(agent).toBeNull();
    });

    test('should list all active agents', async () => {
      await aiAgentService.createAgent({
        ...mockAgentConfig,
        name: 'Agent1'
      });
      
      await aiAgentService.createAgent({
        ...mockAgentConfig,
        name: 'Agent2'
      });

      const agents = await aiAgentService.listActiveAgents();
      
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThanOrEqual(2);
    });

    test('should update agent configuration', async () => {
      const agent = await aiAgentService.createAgent(mockAgentConfig);
      
      const updatedAgent = await aiAgentService.updateAgentConfig(agent.id, {
        strategy: 'defensive',
        parameters: {
          learningRate: 0.02,
          explorationRate: 0.05
        }
      });

      expect(updatedAgent).toBeDefined();
      expect(updatedAgent.strategy).toBe('defensive');
      expect(updatedAgent.parameters.learningRate).toBe(0.02);
    });
  });

  describe('Agent Training', () => {
    test('should start training session', async () => {
      const agent = await aiAgentService.createAgent(mockAgentConfig);
      
      const trainingSession = await aiAgentService.startTraining(agent.id, {
        type: 'reinforcement',
        duration: 3600,
        opponent: 'builtin'
      });

      expect(trainingSession).toBeDefined();
      expect(trainingSession.agentId).toBe(agent.id);
      expect(trainingSession.status).toBe('active');
      expect(trainingSession.type).toBe('reinforcement');
    });

    test('should get training progress', async () => {
      const agent = await aiAgentService.createAgent(mockAgentConfig);
      const session = await aiAgentService.startTraining(agent.id, {
        type: 'reinforcement',
        duration: 3600,
        opponent: 'builtin'
      });

      const progress = await aiAgentService.getTrainingProgress(session.id);

      expect(progress).toBeDefined();
      expect(progress).toHaveProperty('completion');
      expect(progress).toHaveProperty('performance');
      expect(typeof progress.completion).toBe('number');
    });

    test('should stop training session', async () => {
      const agent = await aiAgentService.createAgent(mockAgentConfig);
      const session = await aiAgentService.startTraining(agent.id, {
        type: 'reinforcement',
        duration: 3600,
        opponent: 'builtin'
      });

      const stoppedSession = await aiAgentService.stopTraining(session.id);

      expect(stoppedSession).toBeDefined();
      expect(stoppedSession.status).toBe('stopped');
    });
  });

  describe('Agent Performance', () => {
    test('should get agent performance metrics', async () => {
      const agent = await aiAgentService.createAgent(mockAgentConfig);
      
      const metrics = await aiAgentService.getPerformanceMetrics(agent.id);

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('winRate');
      expect(metrics).toHaveProperty('totalBattles');
      expect(metrics).toHaveProperty('averagePerformance');
      expect(typeof metrics.winRate).toBe('number');
      expect(typeof metrics.totalBattles).toBe('number');
    });

    test('should get agent battle history', async () => {
      const agent = await aiAgentService.createAgent(mockAgentConfig);
      
      const history = await aiAgentService.getBattleHistory(agent.id);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Agent Battle Preparation', () => {
    test('should prepare agent for battle', async () => {
      const agent = await aiAgentService.createAgent(mockAgentConfig);
      
      const battleReady = await aiAgentService.prepareForBattle(agent.id, {
        matchId: 'test-match-123',
        opponent: 'opponent-agent-456'
      });

      expect(battleReady).toBeDefined();
      expect(battleReady.agentId).toBe(agent.id);
      expect(battleReady.ready).toBe(true);
      expect(battleReady.matchId).toBe('test-match-123');
    });

    test('should validate agent readiness', async () => {
      const agent = await aiAgentService.createAgent(mockAgentConfig);
      
      const readiness = await aiAgentService.checkBattleReadiness(agent.id);

      expect(readiness).toBeDefined();
      expect(typeof readiness.ready).toBe('boolean');
      expect(readiness).toHaveProperty('issues');
      expect(Array.isArray(readiness.issues)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid agent configuration', async () => {
      try {
        await aiAgentService.createAgent({
          name: '',
          strategy: 'invalid-strategy' as any,
          parameters: {}
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle training on non-existent agent', async () => {
      try {
        await aiAgentService.startTraining('non-existent-id', {
          type: 'reinforcement',
          duration: 3600,
          opponent: 'builtin'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
});
