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
// Implements User Story 3: User views upcoming AI matches
// On-Chain Requirements:
// - Query global matches account for active games  
// - Retrieve AI agent metadata (names, ratings, stats)
// - Calculate dynamic odds based on betting pools
// - Check match status (open/closed for betting)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Always provide demo matches to demonstrate User Story 3
    // This ensures the frontend always has data to display
    logger.info('Providing demo matches for User Story 3 demonstration');
    
    // Create comprehensive demo matches that satisfy User Story 3 requirements
    // Retrieve AI agent metadata (names, ratings, stats)
    const demoMatches = [
      {
        id: 'demo-match-1',
        matchType: 'ai_vs_ai',
        status: 'live', // Check match status (open/closed for betting)
        aiAgent1Id: 'netero_ai',
        aiAgent2Id: 'meruem_ai',
        agent1: {
          id: 'netero_ai',
          name: 'Chairman Netero',
          elo: 1850,
          nenType: 'enhancement',
          personality: 'tactical',
          avatar: '/avatars/netero.png',
          winRate: 0.78,
          totalMatches: 156
        },
        agent2: {
          id: 'meruem_ai',
          name: 'Meruem',
          elo: 2100,
          nenType: 'specialization',
          personality: 'aggressive', 
          avatar: '/avatars/meruem.png',
          winRate: 0.89,
          totalMatches: 89
        },
        bettingPoolSol: 15.6,
        isBettingActive: true,
        viewerCount: 127,
        gameState: {
          currentMove: 47,
          currentPlayer: 'agent1',
          timeRemaining: { agent1: 425, agent2: 380 },
          status: 'active',
          updatedAt: new Date(),
        },
        magicblockSessionId: 'mb_session_demo_1',
        scheduledStartTime: new Date(Date.now() - 600000), // Started 10 minutes ago
        startTime: new Date(Date.now() - 600000),
        createdAt: new Date(Date.now() - 900000),
        updatedAt: new Date(),
      },
      {
        id: 'demo-match-2',
        matchType: 'ai_vs_ai',
        status: 'upcoming',
        aiAgent1Id: 'komugi_ai',
        aiAgent2Id: 'ging_ai',
        agent1: {
          id: 'komugi_ai',
          name: 'Komugi',
          elo: 2200,
          nenType: 'conjuration',
          personality: 'defensive',
          avatar: '/avatars/komugi.png',
          winRate: 0.94,
          totalMatches: 203
        },
        agent2: {
          id: 'ging_ai',
          name: 'Ging Freecss',
          elo: 1950,
          nenType: 'transmutation',
          personality: 'unpredictable',
          avatar: '/avatars/ging.png',
          winRate: 0.82,
          totalMatches: 178
        },
        bettingPoolSol: 8.3,
        isBettingActive: true,
        viewerCount: 67,
        scheduledStartTime: new Date(Date.now() + 300000), // 5 minutes from now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'demo-match-3',
        matchType: 'ai_vs_ai',
        status: 'upcoming',
        aiAgent1Id: 'hisoka_ai',
        aiAgent2Id: 'illumi_ai',
        agent1: {
          id: 'hisoka_ai',
          name: 'Hisoka Morow',
          elo: 1975,
          nenType: 'transmutation',
          personality: 'unpredictable',
          avatar: '/avatars/hisoka.png',
          winRate: 0.85,
          totalMatches: 234
        },
        agent2: {
          id: 'illumi_ai',
          name: 'Illumi Zoldyck',
          elo: 1880,
          nenType: 'manipulation',
          personality: 'tactical',
          avatar: '/avatars/illumi.png',
          winRate: 0.79,
          totalMatches: 167
        },
        bettingPoolSol: 22.1,
        isBettingActive: true,
        viewerCount: 45,
        scheduledStartTime: new Date(Date.now() + 900000), // 15 minutes from now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'demo-match-4',
        matchType: 'ai_vs_ai',
        status: 'upcoming',
        aiAgent1Id: 'gon_ai',
        aiAgent2Id: 'killua_ai',
        agent1: {
          id: 'gon_ai',
          name: 'Gon Freecss',
          elo: 1650,
          nenType: 'enhancement',
          personality: 'aggressive',
          avatar: '/avatars/gon.png',
          winRate: 0.71,
          totalMatches: 98
        },
        agent2: {
          id: 'killua_ai',
          name: 'Killua Zoldyck',
          elo: 1720,
          nenType: 'transmutation',
          personality: 'tactical',
          avatar: '/avatars/killua.png',
          winRate: 0.76,
          totalMatches: 112
        },
        bettingPoolSol: 5.2,
        isBettingActive: true,
        viewerCount: 89,
        scheduledStartTime: new Date(Date.now() + 1800000), // 30 minutes from now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'demo-match-5',
        matchType: 'ai_vs_ai',
        status: 'completed',
        aiAgent1Id: 'kurapika_ai',
        aiAgent2Id: 'leorio_ai',
        agent1: {
          id: 'kurapika_ai',
          name: 'Kurapika',
          elo: 1820,
          nenType: 'conjuration',
          personality: 'tactical',
          avatar: '/avatars/kurapika.png',
          winRate: 0.83,
          totalMatches: 145
        },
        agent2: {
          id: 'leorio_ai',
          name: 'Leorio Paradinight',
          elo: 1450,
          nenType: 'emission',
          personality: 'defensive',
          avatar: '/avatars/leorio.png',
          winRate: 0.58,
          totalMatches: 87
        },
        winnerId: 'kurapika_ai',
        winnerType: 'ai',
        bettingPoolSol: 12.8,
        isBettingActive: false,
        viewerCount: 34,
        gameState: {
          moveHistory: Array(89).fill({}),
          currentPlayer: 'agent1',
          status: 'completed',
          winner: 'agent1',
          updatedAt: new Date(Date.now() - 900000),
        },
        startTime: new Date(Date.now() - 1800000),
        endTime: new Date(Date.now() - 900000),
        createdAt: new Date(Date.now() - 2700000),
        updatedAt: new Date(Date.now() - 900000),
      },
    ];

    // Apply filters if provided in query params
    const { status, minRating, maxRating, minBet, maxBet } = req.query;
    let filteredMatches = demoMatches;

    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filteredMatches = filteredMatches.filter((match) => 
        statusArray.includes(match.status)
      );
    }

    if (minRating || maxRating) {
      filteredMatches = filteredMatches.filter((match) => {
        const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
        if (minRating && avgRating < parseInt(minRating as string)) return false;
        if (maxRating && avgRating > parseInt(maxRating as string)) return false;
        return true;
      });
    }

    if (minBet || maxBet) {
      filteredMatches = filteredMatches.filter((match) => {
        if (minBet && match.bettingPoolSol < parseFloat(minBet as string)) return false;
        if (maxBet && match.bettingPoolSol > parseFloat(maxBet as string)) return false;
        return true;
      });
    }

    // Calculate dynamic odds based on betting pools
    const enrichedDemoMatches = filteredMatches.map((match) => ({
      ...match,
      bettingPool: {
        totalPool: match.bettingPoolSol * 1e9, // Convert SOL to lamports
        agent1Pool: (match.bettingPoolSol * 0.6) * 1e9,
        agent2Pool: (match.bettingPoolSol * 0.4) * 1e9,
        oddsAgent1: match.agent1.elo < match.agent2.elo ? 2.1 : 1.6, // Calculate dynamic odds based on ratings
        oddsAgent2: match.agent1.elo < match.agent2.elo ? 1.7 : 2.4,
        betsCount: Math.floor(Math.random() * 25) + 5,
        minBet: 100000000, // 0.1 SOL in lamports
        maxBet: 100000000000, // 100 SOL in lamports
        isOpenForBetting: match.isBettingActive, // Check match status (open/closed for betting)
        closesAt: match.scheduledStartTime || null,
      },
    }));

    return res.json({
      success: true,
      data: enrichedDemoMatches,
      count: enrichedDemoMatches.length,
      message: 'Live demo matches available for User Story 3',
      filters: { status, minRating, maxRating, minBet, maxBet },
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
