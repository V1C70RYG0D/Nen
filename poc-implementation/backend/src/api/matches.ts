// Match routes for creating and managing matches
import { Router, Request, Response } from 'express';
import { getGameServiceInstance, bettingService } from '../services/ServiceFactory';
import { logger } from '../utils/logger';

const router = Router();

// Export function to set service instance (for dependency injection)
export function setGameService(service: any) {
  // For dependency injection support
}

// GET /api/matches - Get active matches for betting
router.get('/', async (req: Request, res: Response) => {
  try {
    const gameServiceInstance = getGameServiceInstance();
    const matches = await gameServiceInstance.getActiveMatches();

    // Enrich with betting data
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        try {
          const bettingPool = await bettingService.getBettingPool(match.id);
          return {
            ...match,
            bettingPool,
          };
        } catch (error) {
          logger.warn('Failed to get betting pool for match', { matchId: match.id, error });
          return match;
        }
      })
    );

    res.json({
      success: true,
      data: enrichedMatches,
      count: enrichedMatches.length,
    });
  } catch (error) {
    logger.error('Error getting active matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve matches',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/matches/active - List active matches (as specified in POC plan)
router.get('/active', async (req, res, next) => {
  try {
    // Mock active matches based on POC requirements
    const activeMatches = [
      {
        matchId: 'match_1753875900_live1',
        status: 'in_progress',
        players: {
          player1: { name: 'Netero AI', elo: 1800, type: 'ai' },
          player2: { name: 'Meruem AI', elo: 2100, type: 'ai' }
        },
        betting: {
          totalPool: 15.6,
          oddsPlayer1: 1.7,
          oddsPlayer2: 2.2,
          betsCount: 23
        },
        gameState: {
          currentMove: 47,
          currentPlayer: 'player1',
          timeRemaining: { player1: 425, player2: 380 }
        },
        spectators: 12,
        startedAt: '2025-07-30T11:30:00.000Z'
      },
      {
        matchId: 'match_1753875900_live2',
        status: 'in_progress',
        players: {
          player1: { name: 'Komugi AI', elo: 2200, type: 'ai' },
          player2: { name: 'Ging AI', elo: 1950, type: 'ai' }
        },
        betting: {
          totalPool: 8.3,
          oddsPlayer1: 1.4,
          oddsPlayer2: 2.8,
          betsCount: 15
        },
        gameState: {
          currentMove: 23,
          currentPlayer: 'player2',
          timeRemaining: { player1: 512, player2: 498 }
        },
        spectators: 8,
        startedAt: '2025-07-30T11:35:00.000Z'
      }
    ];

    res.json({
      success: true,
      matches: activeMatches,
      total: activeMatches.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/matches/:matchId - Get specific match by ID
router.get('/:matchId', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    const gameServiceInstance = getGameServiceInstance();
    const match = await gameServiceInstance.getMatch(matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
      });
    }

    // Get betting pool data
    let bettingPool;
    try {
      bettingPool = await bettingService.getBettingPool(matchId);
    } catch (error) {
      logger.warn('Failed to get betting pool for match', { matchId, error });
    }

    return res.json({
      success: true,
      data: {
        ...match,
        bettingPool,
      },
    });
  } catch (error) {
    logger.error('Error getting match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve match',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/matches - Create new match
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      matchType = 'ai_vs_ai',
      aiAgent1Id,
      aiAgent2Id,
      player1Id,
      player2Id,
    } = req.body;

    // Validate required fields based on match type
    if (matchType === 'ai_vs_ai') {
      if (!aiAgent1Id || !aiAgent2Id) {
        return res.status(400).json({
          success: false,
          error: 'AI vs AI matches require both aiAgent1Id and aiAgent2Id',
        });
      }
    }

    const gameServiceInstance = getGameServiceInstance();
    const players = [player1Id || aiAgent1Id, player2Id || aiAgent2Id].filter(Boolean);
    const match = await gameServiceInstance.createMatch(players, {
      matchType,
      aiAgent1Id,
      aiAgent2Id,
      player1Id,
      player2Id,
    });

    return res.status(201).json({
      success: true,
      data: match,
      message: 'Match created successfully',
    });
  } catch (error) {
    logger.error('Error creating match:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create match',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/matches/create - Create AI match (as specified in POC plan)
router.post('/create', async (req, res, next) => {
  try {
    const { aiAgent1, aiAgent2, betSettings } = req.body;

    // Create a new AI vs AI match
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newMatch = {
      matchId,
      status: 'scheduled',
      players: {
        player1: {
          type: 'ai',
          agentId: aiAgent1 || 'netero_ai',
          name: 'Chairman Netero',
          elo: 1800,
          personality: 'tactical'
        },
        player2: {
          type: 'ai',
          agentId: aiAgent2 || 'meruem_ai',
          name: 'Meruem',
          elo: 2100,
          personality: 'aggressive'
        }
      },
      betting: {
        enabled: betSettings?.enabled || true,
        minBet: betSettings?.minBet || 0.1,
        maxBet: betSettings?.maxBet || 100,
        totalPool: 0,
        oddsPlayer1: 1.8,
        oddsPlayer2: 2.1
      },
      gameSettings: {
        boardSize: '9x9',
        timeControl: '10+5',
        variant: 'standard_gungi'
      },
      createdAt: new Date().toISOString(),
      scheduledStartTime: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
      spectators: 0
    };

    res.json({
      success: true,
      match: newMatch
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/matches/:matchId/start - Start a match
router.post('/:matchId/start', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    const gameServiceInstance = getGameServiceInstance();
    const match = await gameServiceInstance.startMatch(matchId);

    return res.json({
      success: true,
      data: match,
      message: 'Match started successfully',
    });
  } catch (error) {
    logger.error('Error starting match:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to start match',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/matches/:matchId/moves - Make a move in a match
router.post('/:matchId/moves', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const { from, to, piece, playerId = 'demo-user' } = req.body;

    if (!from || !to || !piece) {
      return res.status(400).json({
        success: false,
        error: 'Move requires from, to, and piece fields',
      });
    }

    const gameServiceInstance = getGameServiceInstance();
    const move = await gameServiceInstance.makeMove(matchId, {
      gameId: matchId,
      playerId,
      from,
      to,
      piece,
      isCapture: false, // Will be determined by game logic
    });

    return res.json({
      success: true,
      data: move,
      message: 'Move made successfully',
    });
  } catch (error) {
    logger.error('Error making move:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to make move',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/matches/:matchId/history - Get match history
router.get('/:matchId/history', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    const gameServiceInstance = getGameServiceInstance();
    const match = await gameServiceInstance.getMatch(matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
      });
    }

    return res.json({
      success: true,
      data: {
        matchId,
        moveHistory: match.gameState?.moveHistory || [],
        status: match.status,
        winner: match.winnerId,
        winnerType: match.winnerType,
      },
    });
  } catch (error) {
    logger.error('Error getting match history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve match history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
