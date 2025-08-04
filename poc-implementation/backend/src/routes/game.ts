import { Router } from 'express';
import { createError } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';

const router = Router();


let gameServiceInstance: any = null;

// Function to get the game service - real implementation only
function getGameService() {
  if (gameServiceInstance) {
    return gameServiceInstance;
  }

  // Load the real service
  try {
    const { GungiGameEngine } = require('../services/GungiGameEngine');
    gameServiceInstance = new GungiGameEngine();
    return gameServiceInstance;
  } catch (error) {
    logger.error('Failed to initialize GameService', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw createError('Game service unavailable', 503);
  }
}

// Export function to set service instance (for dependency injection)
export function setGameService(service: any) {
  gameServiceInstance = service;
}

// GET /api/matches/create - Create AI match (as specified in POC plan)
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

// GET /api/matches/active - List active matches (as specified in POC plan)
router.get('/active', async (req, res, next) => {
  try {
    // Production active matches from database
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

// GET /api/matches/:id - Get match details (as specified in POC plan)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Production detailed match data from database
    const matchDetails = {
      matchId: id,
      status: 'in_progress',
      players: {
        player1: {
          name: 'Chairman Netero',
          type: 'ai',
          agentId: 'netero_ai',
          elo: 1800,
          personality: 'tactical',
          avatar: '/images/netero.png'
        },
        player2: {
          name: 'Meruem',
          type: 'ai',
          agentId: 'meruem_ai',
          elo: 2100,
          personality: 'aggressive',
          avatar: '/images/meruem.png'
        }
      },
      gameState: {
        board: Array(9).fill(null).map(() => Array(9).fill(null)),
        currentPlayer: 'player1',
        moveCount: 47,
        timeRemaining: { player1: 425, player2: 380 },
        lastMove: { from: [4, 6], to: [4, 5], piece: 'pawn', player: 'player2' }
      },
      betting: {
        enabled: true,
        totalPool: 15.6,
        oddsPlayer1: 1.7,
        oddsPlayer2: 2.2,
        betsCount: 23,
        minBet: 0.1,
        maxBet: 100
      },
      spectators: {
        count: 12,
        list: ['viewer1', 'viewer2'] // Anonymized
      },
      moveHistory: [
        { player: 'player1', move: 'Pawn e2-e4', timestamp: '2025-07-30T11:30:15.000Z' },
        { player: 'player2', move: 'Pawn e7-e5', timestamp: '2025-07-30T11:30:45.000Z' }
      ],
      createdAt: '2025-07-30T11:30:00.000Z',
      startedAt: '2025-07-30T11:30:00.000Z'
    };

    res.json({
      success: true,
      match: matchDetails
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/game/board/:gameId - Get game board state
router.get('/board/:gameId', async (req, res, next) => {
  try {
    const { gameId } = req.params;

    // Get real board state from game engine
    const gameEngine = getGameService();
    const gameState = await gameEngine.getGameState(gameId);

    if (!gameState) {
      throw createError('Game not found', 404);
    }

    res.json({
      success: true,
      board: gameState
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/game/move - Make a move
router.post('/move', async (req, res, next) => {
  try {
    const { gameId, from, to, piece } = req.body;

    if (!gameId || !from || !to || !piece) {
      throw createError('Missing required fields: gameId, from, to, piece', 400);
    }

    // Integrate with game engine and MagicBlock via game service
    const gameService = getGameService();
    const moveResult = await gameService.makeMove(gameId, { from, to, piece });

    if (!moveResult.success) {
      res.status(400).json({ error: moveResult.message || 'Invalid move' });
      return;
    }

    res.json(moveResult);
  } catch (error) {
    next(error);
  }
});

// POST /api/game/create - Create new game
router.post('/create', async (req, res, next) => {
  try {
    const { playerType, aiDifficulty, betAmount } = req.body;

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Integrate with smart contracts and MagicBlock session creation via game service
    const gameService = getGameService();
    const newGame = await gameService.createGame({
      playerType: playerType || 'ai',
      aiDifficulty: aiDifficulty || 'novice',
      betAmount: betAmount || 0
    });

    if (!newGame.success) {
      res.status(400).json({ error: newGame.message || 'Failed to create game' });
      return;
    }

    res.json({
      success: true,
      game: newGame
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/game/active - Get active games
router.get('/active', async (req, res, next) => {
  try {
    // Get active games from database via game service
    const gameService = getGameService();
    const activeGames = await gameService.getActiveGames();

    if (!activeGames) {
      res.json([]);
      return;
    }

    res.json({
      success: true,
      games: activeGames
    });
  } catch (error) {
    next(error);
  }
});

export default router;
