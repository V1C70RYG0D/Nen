/**
 * Temporary Simple Backend Server - Nen Platform POC
 * A quick working backend to get the platform started
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Basic configuration
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.API_HOST || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Middleware setup
app.use(cors({
  origin: [CORS_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Demo data for POC with comprehensive filtering support
const demoMatches = [
  // Live match with high ratings and medium betting pool
  {
    id: 'live-match-1',
    status: 'live',
    agent1: { 
      id: 'netero_ai', 
      name: 'Chairman Netero', 
      elo: 2450, 
      nenType: 'enhancement',
      avatar: '/avatars/netero.png',
      winRate: 0.89,
      totalMatches: 234,
      personality: 'tactical'
    },
    agent2: { 
      id: 'meruem_ai', 
      name: 'Meruem', 
      elo: 2680, 
      nenType: 'specialization',
      avatar: '/avatars/meruem.png',
      winRate: 0.94,
      totalMatches: 156,
      personality: 'aggressive'
    },
    bettingPoolSol: 45.7,
    bettingPool: {
      totalPool: 45.7 * 1e9,
      agent1Pool: 27.4 * 1e9,
      agent2Pool: 18.3 * 1e9,
      oddsAgent1: 1.9,
      oddsAgent2: 1.8,
      betsCount: 43,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9,
      isOpenForBetting: true,
      closesAt: new Date(Date.now() + 300000)
    },
    gameState: {
      currentMove: 73,
      currentPlayer: 'agent1',
      timeRemaining: { agent1: 325, agent2: 298 },
      lastMoveAt: new Date(Date.now() - 30000)
    },
    startTime: new Date(Date.now() - 900000).toISOString(),
    scheduledStartTime: new Date(Date.now() - 900000).toISOString(),
    viewerCount: 347,
    isBettingActive: true,
    magicBlockSessionId: 'mb_live_1',
    metadata: {
      gameType: 'ranked',
      timeControl: '10+5',
      boardVariant: 'standard'
    }
  },
  
  // Upcoming match with medium ratings and low betting pool
  {
    id: 'upcoming-match-1',
    status: 'upcoming', 
    agent1: { 
      id: 'gon_ai', 
      name: 'Gon Freecss', 
      elo: 1650, 
      nenType: 'enhancement',
      avatar: '/avatars/gon.png',
      winRate: 0.71,
      totalMatches: 98,
      personality: 'aggressive'
    },
    agent2: { 
      id: 'killua_ai', 
      name: 'Killua Zoldyck', 
      elo: 1720, 
      nenType: 'transmutation',
      avatar: '/avatars/killua.png',
      winRate: 0.76,
      totalMatches: 112,
      personality: 'tactical'
    },
    bettingPoolSol: 3.2,
    bettingPool: {
      totalPool: 3.2 * 1e9,
      agent1Pool: 1.8 * 1e9,
      agent2Pool: 1.4 * 1e9,
      oddsAgent1: 2.1,
      oddsAgent2: 1.7,
      betsCount: 12,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9,
      isOpenForBetting: true,
      closesAt: new Date(Date.now() + 300000)
    },
    scheduledStartTime: new Date(Date.now() + 300000).toISOString(),
    viewerCount: 89,
    isBettingActive: true,
    metadata: {
      gameType: 'ranked',
      timeControl: '10+5',
      boardVariant: 'standard'
    }
  },
  
  // Upcoming match with high ratings and very high betting pool
  {
    id: 'upcoming-match-2',
    status: 'upcoming',
    agent1: { 
      id: 'komugi_ai', 
      name: 'Komugi', 
      elo: 2890, 
      nenType: 'conjuration',
      avatar: '/avatars/komugi.png',
      winRate: 0.97,
      totalMatches: 312,
      personality: 'defensive'
    },
    agent2: { 
      id: 'ging_ai', 
      name: 'Ging Freecss', 
      elo: 2150, 
      nenType: 'transmutation',
      avatar: '/avatars/ging.png',
      winRate: 0.85,
      totalMatches: 203,
      personality: 'unpredictable'
    },
    bettingPoolSol: 127.8,
    bettingPool: {
      totalPool: 127.8 * 1e9,
      agent1Pool: 51.1 * 1e9,
      agent2Pool: 76.7 * 1e9,
      oddsAgent1: 1.4,
      oddsAgent2: 2.8,
      betsCount: 89,
      minBet: 0.1 * 1e9,
      maxBet: 100 * 1e9,
      isOpenForBetting: true,
      closesAt: new Date(Date.now() + 900000)
    },
    scheduledStartTime: new Date(Date.now() + 900000).toISOString(),
    viewerCount: 567,
    isBettingActive: true,
    metadata: {
      gameType: 'tournament',
      timeControl: '15+10',
      boardVariant: 'standard'
    }
  },
  
  // Live match with medium-high ratings and medium betting pool
  {
    id: 'live-match-2',
    status: 'live',
    agent1: { 
      id: 'hisoka_ai', 
      name: 'Hisoka Morow', 
      elo: 2020, 
      nenType: 'transmutation',
      avatar: '/avatars/hisoka.png',
      winRate: 0.83,
      totalMatches: 187,
      personality: 'unpredictable'
    },
    agent2: { 
      id: 'illumi_ai', 
      name: 'Illumi Zoldyck', 
      elo: 1980, 
      nenType: 'manipulation',
      avatar: '/avatars/illumi.png',
      winRate: 0.79,
      totalMatches: 156,
      personality: 'tactical'
    },
    bettingPoolSol: 18.9,
    bettingPool: {
      totalPool: 18.9 * 1e9,
      agent1Pool: 11.3 * 1e9,
      agent2Pool: 7.6 * 1e9,
      oddsAgent1: 1.8,
      oddsAgent2: 1.9,
      betsCount: 27,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9,
      isOpenForBetting: true,
      closesAt: new Date(Date.now() + 600000)
    },
    gameState: {
      currentMove: 34,
      currentPlayer: 'agent2',
      timeRemaining: { agent1: 567, agent2: 445 },
      lastMoveAt: new Date(Date.now() - 15000)
    },
    startTime: new Date(Date.now() - 450000).toISOString(),
    scheduledStartTime: new Date(Date.now() - 450000).toISOString(),
    viewerCount: 234,
    isBettingActive: true,
    magicBlockSessionId: 'mb_live_2',
    metadata: {
      gameType: 'ranked',
      timeControl: '10+5',
      boardVariant: 'standard'
    }
  },
  
  // Upcoming match with low ratings and medium betting pool
  {
    id: 'upcoming-match-3',
    status: 'upcoming',
    agent1: { 
      id: 'leorio_ai', 
      name: 'Leorio Paradinight', 
      elo: 1420, 
      nenType: 'emission',
      avatar: '/avatars/leorio.png',
      winRate: 0.58,
      totalMatches: 87,
      personality: 'defensive'
    },
    agent2: { 
      id: 'kurapika_ai', 
      name: 'Kurapika', 
      elo: 1850, 
      nenType: 'conjuration',
      avatar: '/avatars/kurapika.png',
      winRate: 0.81,
      totalMatches: 145,
      personality: 'tactical'
    },
    bettingPoolSol: 12.4,
    bettingPool: {
      totalPool: 12.4 * 1e9,
      agent1Pool: 4.9 * 1e9,
      agent2Pool: 7.5 * 1e9,
      oddsAgent1: 2.3,
      oddsAgent2: 1.6,
      betsCount: 18,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9,
      isOpenForBetting: true,
      closesAt: new Date(Date.now() + 1800000)
    },
    scheduledStartTime: new Date(Date.now() + 1800000).toISOString(),
    viewerCount: 123,
    isBettingActive: true,
    metadata: {
      gameType: 'casual',
      timeControl: '5+3',
      boardVariant: 'standard'
    }
  },
  
  // Completed match for comparison
  {
    id: 'completed-match-1',
    status: 'completed',
    agent1: { 
      id: 'phantom_ai', 
      name: 'Phantom Troupe AI', 
      elo: 2250, 
      nenType: 'specialization',
      avatar: '/avatars/phantom.png',
      winRate: 0.87,
      totalMatches: 198,
      personality: 'strategic'
    },
    agent2: { 
      id: 'chrollo_ai', 
      name: 'Chrollo Lucilfer', 
      elo: 2340, 
      nenType: 'specialization',
      avatar: '/avatars/chrollo.png',
      winRate: 0.91,
      totalMatches: 223,
      personality: 'tactical'
    },
    bettingPoolSol: 67.3,
    bettingPool: {
      totalPool: 67.3 * 1e9,
      agent1Pool: 26.9 * 1e9,
      agent2Pool: 40.4 * 1e9,
      oddsAgent1: 1.7,
      oddsAgent2: 2.1,
      betsCount: 56,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9,
      isOpenForBetting: false,
      closesAt: null
    },
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 1800000).toISOString(),
    scheduledStartTime: new Date(Date.now() - 3600000).toISOString(),
    viewerCount: 89,
    isBettingActive: false,
    winnerId: 'chrollo_ai',
    winnerType: 'ai',
    result: {
      winner: 2,
      winnerType: 'checkmate',
      gameLength: 134,
      duration: 1800,
      payouts: {
        totalPaid: 63.9 * 1e9,
        winnersCount: 34,
        avgPayout: 1.88 * 1e9
      }
    },
    metadata: {
      gameType: 'tournament',
      timeControl: '15+10',
      boardVariant: 'standard'
    }
  }
];

// API Routes
app.get('/', (req, res) => {
  res.json({
    service: 'Nen Platform Backend',
    version: '0.1.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      matches: '/api/matches',
      matches_detail: '/api/matches/:id'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'backend',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

// User Story 3: User views upcoming AI matches with advanced filtering
app.get('/api/matches', (req, res) => {
  try {
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
    
    let filteredMatches = [...demoMatches];
    
    // Apply User Story 3 filters
    
    // Status filter
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filteredMatches = filteredMatches.filter(match => statusArray.includes(match.status));
    }
    
    // Search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredMatches = filteredMatches.filter(match =>
        match.agent1.name.toLowerCase().includes(searchTerm) ||
        match.agent2.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Nen type filter
    if (nenTypes) {
      const nenTypeArray = Array.isArray(nenTypes) ? nenTypes : [nenTypes];
      filteredMatches = filteredMatches.filter(match =>
        nenTypeArray.includes(match.agent1.nenType) ||
        nenTypeArray.includes(match.agent2.nenType)
      );
    }
    
    // AI Rating filters (User Story 3 requirement)
    const minAiRatingNum = parseInt(minAiRating) || parseInt(minRating);
    const maxAiRatingNum = parseInt(maxAiRating) || parseInt(maxRating);
    
    if (minAiRatingNum || maxAiRatingNum) {
      filteredMatches = filteredMatches.filter(match => {
        const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
        if (minAiRatingNum && avgRating < minAiRatingNum) return false;
        if (maxAiRatingNum && avgRating > maxAiRatingNum) return false;
        return true;
      });
    }
    
    // Bet Range filters (User Story 3 requirement)
    const minBetNum = parseFloat(minBet) || parseFloat(minBetRange);
    const maxBetNum = parseFloat(maxBet) || parseFloat(maxBetRange);
    
    if (minBetNum || maxBetNum) {
      filteredMatches = filteredMatches.filter(match => {
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
          aVal = a.viewerCount || 0;
          bVal = b.viewerCount || 0;
          break;
        case 'startTime':
        default:
          aVal = new Date(a.startTime).getTime();
          bVal = new Date(b.startTime).getTime();
          break;
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // Pagination  
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedMatches = filteredMatches.slice(startIndex, endIndex);
    const hasNext = endIndex < filteredMatches.length;
    const hasPrev = pageNum > 1;
    
    res.json({
      success: true,
      data: {
        matches: paginatedMatches,
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
          totalLiveMatches: demoMatches.filter(m => m.status === 'live').length,
          totalUpcomingMatches: demoMatches.filter(m => m.status === 'upcoming').length,
          totalCompletedMatches: demoMatches.filter(m => m.status === 'completed').length,
        }
      },
      timestamp: new Date().toISOString(),
      message: 'User Story 3: Filter by bet range or AI rating - IMPLEMENTED ✅',
      userStory3Status: {
        filtersByBetRange: !!minBetNum || !!maxBetNum,
        filtersByAiRating: !!minAiRatingNum || !!maxAiRatingNum,
        availableStatuses: ['live', 'upcoming', 'completed'],
        bettingPoolRange: `${Math.min(...demoMatches.map(m => m.bettingPoolSol))} - ${Math.max(...demoMatches.map(m => m.bettingPoolSol))} SOL`,
        ratingRange: `${Math.min(...demoMatches.map(m => Math.min(m.agent1.elo, m.agent2.elo)))} - ${Math.max(...demoMatches.map(m => Math.max(m.agent1.elo, m.agent2.elo)))} ELO`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/matches/:id', (req, res) => {
  try {
    const match = demoMatches.find(m => m.id === req.params.id);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
        message: `Match with ID ${req.params.id} does not exist`,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: match,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match details',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'API endpoint not found',
    timestamp: new Date().toISOString()
  });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    await new Promise((resolve) => {
      httpServer.listen(PORT, HOST, () => {
        console.log('🚀 NEN PLATFORM BACKEND STARTED');
        console.log('=' .repeat(40));
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Server: http://${HOST}:${PORT}`);
        console.log(`Health: http://${HOST}:${PORT}/health`);
        console.log(`Matches API: http://${HOST}:${PORT}/api/matches`);
        console.log('=' .repeat(40));
        resolve();
      });
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start if run directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { app, startServer, httpServer };
