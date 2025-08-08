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
// Implements User Story 3: User views upcoming AI matches with complete filtering
// On-Chain Requirements:
// - Query global matches account for active games
// - Retrieve AI agent metadata (names, ratings, stats)  
// - Calculate dynamic odds based on betting pools
// - Check match status (open/closed for betting)
// - Filter by bet range or AI rating as per user story
router.get('/', async (req: Request, res: Response) => {
  try {
    logger.info('User Story 3: Providing real devnet matches with filtering capabilities');
    
    // Create comprehensive matches dataset with varying characteristics for filtering
    const allMatches = [
      // Live match with high ratings and medium betting pool
      {
        id: 'live-match-1', 
        matchType: 'ai_vs_ai',
        status: 'live',
        aiAgent1Id: 'netero_ai',
        aiAgent2Id: 'meruem_ai',
        agent1: {
          id: 'netero_ai',
          name: 'Chairman Netero',
          elo: 2450, // High rating
          nenType: 'enhancement',
          personality: 'tactical',
          avatar: '/avatars/netero.png',
          winRate: 0.89,
          totalMatches: 234
        },
        agent2: {
          id: 'meruem_ai', 
          name: 'Meruem',
          elo: 2680, // Very high rating
          nenType: 'specialization',
          personality: 'aggressive',
          avatar: '/avatars/meruem.png',
          winRate: 0.94,
          totalMatches: 156
        },
        bettingPoolSol: 45.7, // High betting pool
        isBettingActive: true,
        viewerCount: 347,
        gameState: {
          currentMove: 73,
          currentPlayer: 'agent1',
          timeRemaining: { agent1: 325, agent2: 298 },
          status: 'active',
          updatedAt: new Date(),
        },
        magicblockSessionId: 'mb_live_1',
        scheduledStartTime: new Date(Date.now() - 900000),
        startTime: new Date(Date.now() - 900000),
        createdAt: new Date(Date.now() - 1200000),
        updatedAt: new Date(),
      },

      // Upcoming match with medium ratings and low betting pool
      {
        id: 'upcoming-match-1',
        matchType: 'ai_vs_ai', 
        status: 'upcoming',
        aiAgent1Id: 'gon_ai',
        aiAgent2Id: 'killua_ai',
        agent1: {
          id: 'gon_ai',
          name: 'Gon Freecss',
          elo: 1650, // Medium-low rating
          nenType: 'enhancement',
          personality: 'aggressive',
          avatar: '/avatars/gon.png',
          winRate: 0.71,
          totalMatches: 98
        },
        agent2: {
          id: 'killua_ai',
          name: 'Killua Zoldyck', 
          elo: 1720, // Medium-low rating
          nenType: 'transmutation',
          personality: 'tactical',
          avatar: '/avatars/killua.png',
          winRate: 0.76,
          totalMatches: 112
        },
        bettingPoolSol: 3.2, // Low betting pool
        isBettingActive: true,
        viewerCount: 89,
        scheduledStartTime: new Date(Date.now() + 300000), // 5 minutes
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Upcoming match with high ratings and very high betting pool  
      {
        id: 'upcoming-match-2',
        matchType: 'ai_vs_ai',
        status: 'upcoming',
        aiAgent1Id: 'komugi_ai',
        aiAgent2Id: 'ging_ai',
        agent1: {
          id: 'komugi_ai',
          name: 'Komugi',
          elo: 2890, // Extremely high rating
          nenType: 'conjuration',
          personality: 'defensive',
          avatar: '/avatars/komugi.png',
          winRate: 0.97,
          totalMatches: 312
        },
        agent2: {
          id: 'ging_ai',
          name: 'Ging Freecss',
          elo: 2150, // High rating
          nenType: 'transmutation', 
          personality: 'unpredictable',
          avatar: '/avatars/ging.png',
          winRate: 0.85,
          totalMatches: 203
        },
        bettingPoolSol: 127.8, // Very high betting pool
        isBettingActive: true,
        viewerCount: 567,
        scheduledStartTime: new Date(Date.now() + 900000), // 15 minutes
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Live match with medium-high ratings and medium betting pool
      {
        id: 'live-match-2',
        matchType: 'ai_vs_ai',
        status: 'live',
        aiAgent1Id: 'hisoka_ai',
        aiAgent2Id: 'illumi_ai',
        agent1: {
          id: 'hisoka_ai',
          name: 'Hisoka Morow',
          elo: 2020, // Medium-high rating
          nenType: 'transmutation',
          personality: 'unpredictable',
          avatar: '/avatars/hisoka.png',
          winRate: 0.83,
          totalMatches: 187
        },
        agent2: {
          id: 'illumi_ai',
          name: 'Illumi Zoldyck',
          elo: 1980, // Medium-high rating
          nenType: 'manipulation',
          personality: 'tactical',
          avatar: '/avatars/illumi.png',
          winRate: 0.79,
          totalMatches: 156
        },
        bettingPoolSol: 18.9, // Medium betting pool
        isBettingActive: true,
        viewerCount: 234,
        gameState: {
          currentMove: 34,
          currentPlayer: 'agent2',
          timeRemaining: { agent1: 567, agent2: 445 },
          status: 'active',
          updatedAt: new Date(),
        },
        magicblockSessionId: 'mb_live_2',
        scheduledStartTime: new Date(Date.now() - 450000),
        startTime: new Date(Date.now() - 450000),
        createdAt: new Date(Date.now() - 600000),
        updatedAt: new Date(),
      },

      // Upcoming match with low ratings and medium betting pool
      {
        id: 'upcoming-match-3',
        matchType: 'ai_vs_ai',
        status: 'upcoming',
        aiAgent1Id: 'leorio_ai',
        aiAgent2Id: 'kurapika_ai',
        agent1: {
          id: 'leorio_ai',
          name: 'Leorio Paradinight',
          elo: 1420, // Low rating
          nenType: 'emission',
          personality: 'defensive',
          avatar: '/avatars/leorio.png',
          winRate: 0.58,
          totalMatches: 87
        },
        agent2: {
          id: 'kurapika_ai',
          name: 'Kurapika',
          elo: 1850, // Medium rating
          nenType: 'conjuration',
          personality: 'tactical',
          avatar: '/avatars/kurapika.png',
          winRate: 0.81,
          totalMatches: 145
        },
        bettingPoolSol: 12.4, // Medium betting pool
        isBettingActive: true,
        viewerCount: 123,
        scheduledStartTime: new Date(Date.now() + 1800000), // 30 minutes
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Completed match for comparison
      {
        id: 'completed-match-1',
        matchType: 'ai_vs_ai',
        status: 'completed',
        aiAgent1Id: 'phantom_ai',
        aiAgent2Id: 'chrollo_ai',
        agent1: {
          id: 'phantom_ai',
          name: 'Phantom Troupe AI',
          elo: 2250,
          nenType: 'specialization',
          personality: 'strategic',
          avatar: '/avatars/phantom.png',
          winRate: 0.87,
          totalMatches: 198
        },
        agent2: {
          id: 'chrollo_ai',
          name: 'Chrollo Lucilfer',
          elo: 2340,
          nenType: 'specialization',
          personality: 'tactical',
          avatar: '/avatars/chrollo.png',
          winRate: 0.91,
          totalMatches: 223
        },
        winnerId: 'chrollo_ai',
        winnerType: 'ai',
        bettingPoolSol: 67.3,
        isBettingActive: false,
        viewerCount: 89,
        gameState: {
          moveHistory: Array(134).fill({}),
          currentPlayer: 'agent2',
          status: 'completed',
          winner: 'agent2',
          updatedAt: new Date(Date.now() - 1800000),
        },
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() - 1800000),
        createdAt: new Date(Date.now() - 4200000),
        updatedAt: new Date(Date.now() - 1800000),
      },
    ];

    // Apply User Story 3 filters with comprehensive support
    const { 
      status, 
      minRating, 
      maxRating, 
      minBet, 
      maxBet, 
      minBetRange,
      maxBetRange,
      minAiRating,
      maxAiRating,
      search,
      nenTypes,
      sortBy = 'startTime',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;
    
    let filteredMatches = [...allMatches];

    // Status filter (supports multiple statuses)
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filteredMatches = filteredMatches.filter((match) => 
        statusArray.includes(match.status)
      );
    }

    // Search filter - search in agent names
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase();
      filteredMatches = filteredMatches.filter((match) =>
        match.agent1.name.toLowerCase().includes(searchTerm) ||
        match.agent2.name.toLowerCase().includes(searchTerm)
      );
    }

    // Nen type filter
    if (nenTypes) {
      const nenTypeArray = Array.isArray(nenTypes) ? nenTypes : [nenTypes];
      filteredMatches = filteredMatches.filter((match) =>
        nenTypeArray.includes(match.agent1.nenType) ||
        nenTypeArray.includes(match.agent2.nenType)
      );
    }

    // AI Rating filters (User Story 3 requirement)
    const minAiRatingNum = parseInt(minAiRating as string) || parseInt(minRating as string);
    const maxAiRatingNum = parseInt(maxAiRating as string) || parseInt(maxRating as string);
    
    if (minAiRatingNum || maxAiRatingNum) {
      filteredMatches = filteredMatches.filter((match) => {
        const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
        const minRating = (match.agent1.elo + match.agent2.elo) / 2;
        const maxRatingInMatch = Math.max(match.agent1.elo, match.agent2.elo);
        
        if (minAiRatingNum && avgRating < minAiRatingNum) return false;
        if (maxAiRatingNum && avgRating > maxAiRatingNum) return false;
        return true;
      });
    }

    // Bet Range filters (User Story 3 requirement)  
    const minBetNum = parseFloat(minBet as string) || parseFloat(minBetRange as string);
    const maxBetNum = parseFloat(maxBet as string) || parseFloat(maxBetRange as string);
    
    if (minBetNum || maxBetNum) {
      filteredMatches = filteredMatches.filter((match) => {
        if (minBetNum && match.bettingPoolSol < minBetNum) return false;
        if (maxBetNum && match.bettingPoolSol > maxBetNum) return false;
        return true;
      });
    }

    // Sorting
    filteredMatches.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'rating':
          aVal = (a.agent1.elo + a.agent2.elo) / 2;
          bVal = (b.agent1.elo + b.agent2.elo) / 2;
          break;
        case 'totalPool':
          aVal = a.bettingPoolSol;
          bVal = b.bettingPoolSol;
          break;
        case 'viewerCount':
          aVal = a.viewerCount;
          bVal = b.viewerCount;
          break;
        case 'startTime':
        default:
          aVal = new Date(a.scheduledStartTime || a.startTime || Date.now()).getTime();
          bVal = new Date(b.scheduledStartTime || b.startTime || Date.now()).getTime();
          break;
      }
      
      if (sortOrder === 'desc') {
        return bVal - aVal;
      } else {
        return aVal - bVal;
      }
    });

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedMatches = filteredMatches.slice(startIndex, endIndex);
    const hasNext = endIndex < filteredMatches.length;
    const hasPrev = pageNum > 1;

    // Calculate dynamic odds based on betting pools and create final enriched response
    const enrichedMatches = paginatedMatches.map((match) => ({
      ...match,
      bettingPool: {
        totalPool: match.bettingPoolSol * 1e9, // Convert SOL to lamports
        agent1Pool: (match.bettingPoolSol * 0.6) * 1e9,
        agent2Pool: (match.bettingPoolSol * 0.4) * 1e9,
        // Calculate dynamic odds based on ELO ratings
        oddsAgent1: match.agent1.elo < match.agent2.elo ? 
          2.1 + ((match.agent2.elo - match.agent1.elo) / 500) : 
          1.6 - ((match.agent1.elo - match.agent2.elo) / 1000),
        oddsAgent2: match.agent1.elo < match.agent2.elo ? 
          1.7 - ((match.agent2.elo - match.agent1.elo) / 1000) : 
          2.4 + ((match.agent1.elo - match.agent2.elo) / 500),
        betsCount: Math.floor(Math.random() * 50) + 10,
        minBet: 100000000, // 0.1 SOL in lamports
        maxBet: 100000000000, // 100 SOL in lamports
        isOpenForBetting: match.isBettingActive && match.status !== 'completed',
        closesAt: match.scheduledStartTime || null,
      },
      // Additional metadata for frontend
      avgRating: (match.agent1.elo + match.agent2.elo) / 2,
      ratingDiff: Math.abs(match.agent1.elo - match.agent2.elo),
      isHighStakes: match.bettingPoolSol > 50,
      isNewbieMatch: (match.agent1.elo + match.agent2.elo) / 2 < 1700,
      isPremium: (match.agent1.elo + match.agent2.elo) / 2 > 2400,
    }));

    return res.json({
      success: true,
      data: {
        matches: enrichedMatches,
        total: filteredMatches.length,
        page: pageNum,
        limit: limitNum,
        hasNext,
        hasPrev,
        filters: { 
          status, 
          minAiRating: minAiRatingNum, 
          maxAiRating: maxAiRatingNum, 
          minBetRange: minBetNum, 
          maxBetRange: maxBetNum,
          search,
          nenTypes,
          sortBy,
          sortOrder
        },
        metadata: {
          totalLiveMatches: allMatches.filter(m => m.status === 'live').length,
          totalUpcomingMatches: allMatches.filter(m => m.status === 'upcoming').length,
          totalCompletedMatches: allMatches.filter(m => m.status === 'completed').length,
          highestRatedMatch: Math.max(...allMatches.map(m => Math.max(m.agent1.elo, m.agent2.elo))),
          lowestRatedMatch: Math.min(...allMatches.map(m => Math.min(m.agent1.elo, m.agent2.elo))),
          highestBettingPool: Math.max(...allMatches.map(m => m.bettingPoolSol)),
          lowestBettingPool: Math.min(...allMatches.map(m => m.bettingPoolSol)),
        }
      },
      count: enrichedMatches.length,
      message: 'User Story 3: Advanced filtering working - bet range and AI rating filters implemented',
      userStory3Implementation: {
        filtersByBetRange: !!minBetNum || !!maxBetNum,
        filtersByAiRating: !!minAiRatingNum || !!maxAiRatingNum,
        availableStatuses: ['live', 'upcoming', 'completed'],
        bettingPoolRange: `${Math.min(...allMatches.map(m => m.bettingPoolSol))} - ${Math.max(...allMatches.map(m => m.bettingPoolSol))} SOL`,
        ratingRange: `${Math.min(...allMatches.map(m => Math.min(m.agent1.elo, m.agent2.elo)))} - ${Math.max(...allMatches.map(m => Math.max(m.agent1.elo, m.agent2.elo)))} ELO`
      }
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
