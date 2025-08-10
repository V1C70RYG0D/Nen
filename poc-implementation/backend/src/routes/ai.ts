import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { simpleAIService } from '../services/SimpleAIService';
import { logger } from '../middleware/logger';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../../../config/game.env') });
config({ path: path.join(__dirname, '../../../config/constants.env') });

const router = Router();

// Helper function to safely get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Health check for AI service
router.get('/health', async (req, res, next) => {
  try {
    const isHealthy = await simpleAIService.healthCheck();

    if (isHealthy) {
      res.json({
        status: 'healthy',
        ai_service: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        ai_service: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('AI health check failed', { error: getErrorMessage(error) });
    next(error);
  }
});

// GET /api/ai/agents - Get available AI agents
router.get('/agents', async (req, res, next) => {
  try {
    // Try to get agents from AI service, fallback to static list
    let agents;
    try {
      const agentsData = await simpleAIService.listAgents();
      agents = agentsData.agents;
      logger.info('AI agents retrieved from service', { count: agentsData.total_count });
    } catch (error) {
      logger.warn('Failed to get agents from AI service, using fallback', { error: getErrorMessage(error) });
      // Fallback to Hunter x Hunter themed agents for POC
      agents = [
        {
          id: 'netero',
          name: 'netero',
          difficulty: 'legendary',
          personality: 'balanced',
          skillLevel: 95,
          winRate: 0.92,
          elo: 2100,
          description: 'Isaac Netero - Master strategist with unmatched experience',
          specialty: 'Endgame mastery',
          gamesPlayed: 10000
        },
        {
          id: 'meruem',
          name: 'meruem',
          difficulty: 'godlike',
          personality: 'aggressive',
          skillLevel: 98,
          winRate: 0.97,
          elo: 2300,
          description: 'Meruem - The Chimera Ant King with perfect game understanding',
          specialty: 'Pattern recognition',
          gamesPlayed: 1000
        },
        {
          id: 'komugi',
          name: 'komugi',
          difficulty: 'legendary',
          personality: 'defensive',
          skillLevel: 99,
          winRate: 0.95,
          elo: 2200,
          description: 'Komugi - Gungi prodigy with instinctive gameplay',
          specialty: 'Intuitive play',
          gamesPlayed: 50000
        },
        {
          id: 'ging',
          name: 'ging',
          difficulty: 'expert',
          personality: 'creative',
          skillLevel: 88,
          winRate: 0.85,
          elo: 1950,
          description: 'Ging Freecss - Innovative strategist with unique approaches',
          specialty: 'Creative combinations',
          gamesPlayed: 5000
        },
        {
          id: 'hisoka',
          name: 'hisoka',
          difficulty: 'expert',
          personality: 'unpredictable',
          skillLevel: 85,
          winRate: parseFloat(process.env.AI_HISOKA_WIN_RATE || '0.82'),
          elo: parseInt(process.env.AI_HISOKA_ELO || '1900'),
          description: process.env.AI_HISOKA_DESCRIPTION || 'Hisoka - Unpredictable fighter with psychological warfare',
          specialty: process.env.AI_HISOKA_SPECIALTY || 'Psychological pressure',
          gamesPlayed: parseInt(process.env.AI_HISOKA_GAMES_PLAYED || '3000')
        }
      ];
    }

    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/move - Request AI move
router.post('/move', async (req, res, next) => {
  try {
    const { board_state, agent_config, time_limit } = req.body;

    // Validate required fields
    if (!board_state || !agent_config) {
      throw createError('Missing required fields: board_state and agent_config', 400);
    }

    logger.info('Processing AI move request', {
      agent_id: agent_config.agent_id,
      move_number: board_state.move_number
    });

    const move = await simpleAIService.generateMove(
      agent_config.agent_id,
      {
        pieces: board_state.pieces || [],
        currentTurn: board_state.current_turn || 1,
        moveNumber: board_state.move_number || 1,
        gameStatus: 'active'
      }
    );

    res.json({
      success: true,
      move,
      agent_id: agent_config.agent_id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate AI move', { error: getErrorMessage(error) });
    next(error);
  }
});

// POST /api/ai/customize - Customize AI agent
router.post('/customize', async (req, res, next) => {
  try {
    const {
      agentId,
      personality,
      openings,
      playingStyle,
      aggression,
      defensiveness
    } = req.body;

    if (!agentId) {
      throw createError('Agent ID required', 400);
    }

    // Create custom agent config for AI service
    const customizedAgent = simpleAIService.createSampleAgentConfig(
      `custom_${agentId}_${Date.now()}`,
      Math.round((aggression + defensiveness) * 5) || 5,
      personality || 'balanced'
    );

    // Add custom settings
    customizedAgent.custom_settings = {
      ...customizedAgent.custom_settings,
      openings: openings || [],
      playingStyle: playingStyle || 'adaptive',
      aggression: aggression || 0.5,
      defensiveness: defensiveness || 0.5
    };

    res.json({
      success: true,
      agent: {
        id: customizedAgent.agent_id,
        baseAgent: agentId,
        customizations: customizedAgent.custom_settings,
        status: 'ready',
        config: customizedAgent
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/train - Start AI training
router.post('/train', async (req, res, next) => {
  try {
    const { agent_id, training_data, training_config } = req.body;

    // Validate required fields
    if (!agent_id || !training_data) {
      throw createError('Missing required fields: agent_id and training_data', 400);
    }

    logger.info('Starting AI training', {
      agent_id,
      training_data_count: training_data.length
    });

    const trainingStatus = await simpleAIService.startTraining({
      agent_id,
      training_data,
      training_config: training_config || {}
    });

    res.json({
      success: true,
      training_status: trainingStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to start AI training', { error: getErrorMessage(error) });
    next(error);
  }
});

// GET /api/ai/training/:sessionId - Get training status
router.get('/training/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const trainingStatus = await simpleAIService.getTrainingStatus(sessionId);

    res.json({
      success: true,
      training: trainingStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const { sessionId } = req.params;
    logger.error('Failed to get training status', {
      session_id: sessionId,
      error: (error as Error).message
    });

    // Fallback for demo - return simulated training status
    const simulatedTraining = {
      session_id: sessionId,
      status: 'completed',
      progress: 100,
      started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      agent_id: sessionId.split('_')[0] || 'unknown'
    };

    res.json({
      success: true,
      training: simulatedTraining,
      fallback: true,
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/ai/agents/:agentId - Remove AI agent
router.delete('/agents/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;

    await simpleAIService.removeAgent(agentId);

    logger.info('AI agent removed successfully', { agent_id: agentId });

    res.json({
      success: true,
      message: 'AI agent removed successfully',
      agent_id: agentId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to remove AI agent', {
      agent_id: req.params.agentId,
      error: getErrorMessage(error)
    });
    next(error);
  }
});

// POST /api/ai/demo/ai-vs-ai - AI vs AI game simulation
router.post('/demo/ai-vs-ai', async (req, res, next) => {
  try {
    logger.info('Starting AI vs AI demo');

    // Create sample board state and agent configs
    const boardState = simpleAIService.createSampleBoardState(1, 0);
    const agent1Config = simpleAIService.createSampleAgentConfig('random_ai', 3, 'aggressive');
    const agent2Config = simpleAIService.createSampleAgentConfig('minimax_ai', 7, 'defensive');

    // Generate moves for both agents
    const move1 = await simpleAIService.generateMove(
      agent1Config.agent_id,
      boardState
    );

    // Switch turns for second move
    const updatedBoardState = {
      ...boardState,
      currentTurn: 2,
      moveNumber: 1
    };

    const move2 = await simpleAIService.generateMove(
      agent2Config.agent_id,
      updatedBoardState
    );

    res.json({
      success: true,
      demo: 'AI vs AI simulation',
      game_state: {
        initial_board: boardState,
        agent1: agent1Config,
        agent2: agent2Config,
        moves: [
          { player: 1, move: move1, agent: agent1Config.agent_id },
          { player: 2, move: move2, agent: agent2Config.agent_id }
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('AI vs AI demo failed', { error: getErrorMessage(error) });
    next(error);
  }
});

// GET /api/ai/agents/error-test - Test route for error handling (must be before /:id route)
router.get('/agents/error-test', async (req, res, next) => {
  try {
    throw new Error('Test error for error handling');
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error during testing',
      error: getErrorMessage(error)
    });
  }
});

// GET /api/ai/agents/:id - Get specific agent details
router.get('/agents/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Hunter x Hunter agents data
    const agents = [
      {
        id: 'netero',
        name: 'netero',
        difficulty: 'legendary',
        personality: 'balanced',
        skillLevel: 95,
        winRate: 0.92,
        elo: 2100,
        description: 'Isaac Netero - Master strategist with unmatched experience',
        specialty: 'Endgame mastery',
        gamesPlayed: 10000
      },
      {
        id: 'meruem',
        name: 'meruem',
        difficulty: 'godlike',
        personality: 'aggressive',
        skillLevel: 98,
        winRate: 0.97,
        elo: 2300,
        description: 'Meruem - The Chimera Ant King with perfect game understanding',
        specialty: 'Pattern recognition',
        gamesPlayed: 1000
      },
      {
        id: 'komugi',
        name: 'komugi',
        difficulty: 'legendary',
        personality: 'defensive',
        skillLevel: 99,
        winRate: 0.95,
        elo: 2200,
        description: 'Komugi - Gungi prodigy with instinctive gameplay',
        specialty: 'Intuitive play',
        gamesPlayed: 50000
      },
      {
        id: 'ging',
        name: 'ging',
        difficulty: 'expert',
        personality: 'creative',
        skillLevel: 88,
        winRate: 0.85,
        elo: 1950,
        description: 'Ging Freecss - Innovative strategist with unique approaches',
        specialty: 'Creative combinations',
        gamesPlayed: 5000
      },
      {
        id: 'hisoka',
        name: 'hisoka',
        difficulty: 'expert',
        personality: 'unpredictable',
        skillLevel: 85,
        winRate: 0.82,
        elo: 1900,
        description: 'Hisoka - Unpredictable fighter with psychological warfare',
        specialty: 'Psychological pressure',
        gamesPlayed: 3000
      }
    ];

    const agent = agents.find(a => a.id === id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: `Agent with id '${id}' not found`
      });
    }

    return res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/ai/agents/:id/challenge - Create challenge between agents
router.post('/agents/:id/challenge', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { opponent, opponentId, gameSettings, gameType } = req.body;

    // Support both 'opponent' and 'opponentId' for compatibility
    const finalOpponentId = opponent || opponentId;

    // Validate required fields
    if (!finalOpponentId) {
      return res.status(400).json({
        success: false,
        message: 'opponent or opponentId is required'
      });
    }

    // Generate a match ID for the challenge
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return res.json({
      success: true,
      data: {
        matchId,
        agent1: id,
        agent2: finalOpponentId,
        challengerId: id,
        opponentId: finalOpponentId,
        gameSettings: gameSettings || { timeControl: 600, variant: 'standard' },
        gameType: gameType || 'standard',
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/ai/leaderboard - Get AI agent leaderboard
router.get('/leaderboard', async (req, res, next) => {
  try {
    // Hunter x Hunter agents sorted by ELO
    const leaderboard = [
      {
        id: 'meruem',
        name: 'meruem',
        elo: 2300,
        winRate: 0.97,
        gamesPlayed: 1000,
        rank: 1
      },
      {
        id: 'komugi',
        name: 'komugi',
        elo: 2200,
        winRate: 0.95,
        gamesPlayed: 50000,
        rank: 2
      },
      {
        id: 'netero',
        name: 'netero',
        elo: 2100,
        winRate: 0.92,
        gamesPlayed: 10000,
        rank: 3
      },
      {
        id: 'ging',
        name: 'ging',
        elo: 1950,
        winRate: 0.85,
        gamesPlayed: 5000,
        rank: 4
      },
      {
        id: 'hisoka',
        name: 'hisoka',
        elo: 1900,
        winRate: 0.82,
        gamesPlayed: 3000,
        rank: 5
      }
    ];

    res.json({
      success: true,
      data: {
        leaderboard,
        totalAgents: leaderboard.length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/agents/create - Create custom AI agent
router.post('/agents/create', async (req, res, next) => {
  try {
    const { name, personality, skillLevel, description } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Agent name is required'
      });
    }

    if (!personality) {
      return res.status(400).json({
        success: false,
        message: 'Agent personality is required'
      });
    }

    // Generate new agent
    const newAgent = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      personality,
      skillLevel: skillLevel || 50,
      elo: 1200, // Starting ELO
      winRate: 0,
      gamesPlayed: 0,
      description: description || `Custom AI agent: ${name}`,
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      data: newAgent,
      message: 'Custom AI agent created successfully'
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
