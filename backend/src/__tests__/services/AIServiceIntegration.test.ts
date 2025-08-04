import { AIServiceIntegration } from '../../services/AIServiceIntegration';

// Mock axios for HTTP requests
jest.mock('axios');

describe('AIServiceIntegration', () => {
  let aiService: AIServiceIntegration;

  beforeEach(() => {
    aiService = new AIServiceIntegration();
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    test('should initialize with proper configuration', () => {
      expect(aiService).toBeDefined();
      expect(aiService).toBeInstanceOf(AIServiceIntegration);
    });
  });

  describe('Health Check', () => {
    test('should check AI service health successfully', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          status: 'healthy',
          version: '1.0.0'
        }
      });

      const isHealthy = await aiService.healthCheck();

      expect(isHealthy).toBe(true);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({ timeout: 5000 })
      );
    });

    test('should handle unhealthy service response', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          status: 'unhealthy',
          version: '1.0.0'
        }
      });

      const isHealthy = await aiService.healthCheck();

      expect(isHealthy).toBe(false);
    });

    test('should handle network errors gracefully', async () => {
      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('Network timeout'));

      const isHealthy = await aiService.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('AI Move Generation', () => {
    test('should generate move for valid request', async () => {
      const mockRequest = {
        agent_config: {
          agent_id: 'agent-123',
          name: 'Meruem\'s Pride',
          skill_level: 8,
          personality: 'aggressive'
        },
        board_state: {
          pieces: [],
          current_turn: 1,
          move_number: 1,
          game_status: 'active'
        },
        time_limit: 30000
      };

      const mockResponse = {
        data: {
          from_pos: { x: 6, y: 4, level: 0 },
          to_pos: { x: 5, y: 4, level: 0 },
          piece_type: 'pawn',
          player: 1,
          timestamp: new Date().toISOString()
        }
      };

      const axios = require('axios');
      axios.post.mockResolvedValue(mockResponse);

      const result = await aiService.generateMove(mockRequest);

      expect(result).toBeDefined();
      expect(result.from_pos).toEqual({ x: 6, y: 4, level: 0 });
      expect(result.to_pos).toEqual({ x: 5, y: 4, level: 0 });
      expect(result.piece_type).toBe('pawn');
      expect(result.player).toBe(1);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/ai/move'),
        mockRequest,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });

    test('should handle AI service errors', async () => {
      const mockRequest = {
        agent_config: {
          agent_id: 'agent-123',
          name: 'Netero\'s Wisdom',
          skill_level: 7,
          personality: 'defensive'
        },
        board_state: {
          pieces: [],
          current_turn: 1,
          move_number: 1,
          game_status: 'active'
        }
      };

      const axios = require('axios');
      axios.post.mockRejectedValue(new Error('AI service unavailable'));

      await expect(aiService.generateMove(mockRequest))
        .rejects.toThrow('AI service unavailable');
    });

    test('should timeout on slow responses', async () => {
      const mockRequest = {
        agent_config: {
          agent_id: 'agent-456',
          name: 'Killua\'s Lightning',
          skill_level: 9,
          personality: 'tactical'
        },
        board_state: {
          pieces: [],
          current_turn: 2,
          move_number: 15,
          game_status: 'active'
        },
        time_limit: 10000
      };

      const axios = require('axios');
      axios.post.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      await expect(aiService.generateMove(mockRequest))
        .rejects.toMatchObject({
          message: expect.stringContaining('AI move generation failed')
        });
    });
  });

  describe('Agent Training', () => {
    test('should start training session successfully', async () => {
      const mockTrainingRequest = {
        agent_id: 'agent-123',
        training_data: [
          {
            game_id: 'game-456',
            moves: [
              { from_pos: { x: 6, y: 4, level: 0 }, to_pos: { x: 5, y: 4, level: 0 }, piece_type: 'pawn', player: 1 }
            ],
            result: 'win'
          }
        ],
        training_config: {
          learning_rate: 0.001,
          batch_size: 32,
          epochs: 100
        }
      };

      const mockResponse = {
        data: {
          session_id: 'training-789',
          status: 'started',
          progress: 0,
          started_at: new Date().toISOString()
        }
      };

      const axios = require('axios');
      axios.post.mockResolvedValue(mockResponse);

      const result = await aiService.startTraining(mockTrainingRequest);

      expect(result).toBeDefined();
      expect(result.session_id).toBe('training-789');
      expect(result.status).toBe('started');
      expect(result.progress).toBe(0);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/ai/train'),
        mockTrainingRequest,
        expect.any(Object)
      );
    });

    test('should get training status', async () => {
      const sessionId = 'training-789';
      const mockResponse = {
        data: {
          session_id: sessionId,
          status: 'completed',
          progress: 100,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date().toISOString()
        }
      };

      const axios = require('axios');
      axios.get.mockResolvedValue(mockResponse);

      const result = await aiService.getTrainingStatus(sessionId);

      expect(result).toBeDefined();
      expect(result.session_id).toBe(sessionId);
      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/ai/training/${sessionId}`),
        expect.any(Object)
      );
    });
  });

  describe('Agent Management', () => {
    test('should list available agents', async () => {
      const mockResponse = {
        data: {
          agents: [
            {
              agent_id: 'agent-123',
              name: 'Meruem\'s Pride',
              skill_level: 8,
              personality: 'aggressive'
            },
            {
              agent_id: 'agent-456',
              name: 'Netero\'s Wisdom',
              skill_level: 7,
              personality: 'defensive'
            }
          ],
          total_count: 2
        }
      };

      const axios = require('axios');
      axios.get.mockResolvedValue(mockResponse);

      const result = await aiService.listAgents();

      expect(result).toBeDefined();
      expect(result.agents).toHaveLength(2);
      expect(result.total_count).toBe(2);
      expect(result.agents[0].agent_id).toBe('agent-123');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/ai/agents'),
        expect.any(Object)
      );
    });

    test('should remove agent successfully', async () => {
      const agentId = 'agent-123';

      const axios = require('axios');
      axios.delete.mockResolvedValue({ status: 204 });

      await expect(aiService.removeAgent(agentId)).resolves.not.toThrow();

      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/ai/agents/${agentId}`),
        expect.any(Object)
      );
    });

    test('should handle agent removal errors', async () => {
      const agentId = 'non-existent-agent';

      const axios = require('axios');
      axios.delete.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Agent not found' }
        }
      });

      await expect(aiService.removeAgent(agentId))
        .rejects.toMatchObject({
          message: expect.stringContaining('Failed to remove AI agent')
        });
    });
  });

  describe('Error Handling', () => {
    test('should handle axios network errors', async () => {
      const axios = require('axios');
      axios.get.mockRejectedValue({
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND localhost'
      });

      const isHealthy = await aiService.healthCheck();
      expect(isHealthy).toBe(false);
    });

    test('should handle HTTP error codes', async () => {
      const axios = require('axios');
      axios.get.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      });

      const isHealthy = await aiService.healthCheck();
      expect(isHealthy).toBe(false);
    });

    test('should handle malformed responses', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: null // Malformed response
      });

      const isHealthy = await aiService.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });
});
