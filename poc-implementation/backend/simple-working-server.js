/**
 * Simple Working Backend Server - Nen Platform POC
 * Minimal server to get the platform started quickly
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const dotenv = require('dotenv');
const path = require('path');

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const httpServer = createServer(app);

// Basic configuration
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.API_HOST || '127.0.0.1';

console.log('🔧 Server Configuration:');
console.log(`  - PORT: ${PORT}`);
console.log(`  - HOST: ${HOST}`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Middleware setup
app.use(cors({
  origin: [
    'http://localhost:3030', 'http://127.0.0.1:3030',
    'http://localhost:3010', 'http://127.0.0.1:3010',
    'http://localhost:3000', 'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper function to create complete betting pool data
function createBettingPool(totalSol, status, agent1Elo, agent2Elo) {
  const totalLamports = Math.floor(totalSol * 1e9); // Convert SOL to lamports
  const agent1Pool = Math.floor(totalLamports * (0.4 + Math.random() * 0.2)); // 40-60% split
  const agent2Pool = totalLamports - agent1Pool;
  
  // Calculate odds based on ELO difference and pool distribution
  const eloDiff = agent2Elo - agent1Elo;
  const baseOdds1 = 1.5 + (eloDiff / 1000); // Higher if agent2 has higher ELO
  const baseOdds2 = 1.5 - (eloDiff / 1000); // Lower if agent1 has lower ELO
  
  // Adjust odds based on betting pool distribution
  const poolRatio = agent1Pool / (agent2Pool || 1);
  const oddsAgent1 = Math.max(1.1, Math.min(10.0, baseOdds1 * (1 + poolRatio * 0.1)));
  const oddsAgent2 = Math.max(1.1, Math.min(10.0, baseOdds2 * (1 + (1/poolRatio) * 0.1)));
  
  return {
    totalPool: totalLamports,
    agent1Pool,
    agent2Pool,
    oddsAgent1: parseFloat(oddsAgent1.toFixed(2)),
    oddsAgent2: parseFloat(oddsAgent2.toFixed(2)),
    betsCount: Math.floor(totalSol * 10 + Math.random() * 20),
    minBet: 100000000, // 0.1 SOL in lamports
    maxBet: 10000000000, // 10 SOL in lamports
    isOpenForBetting: status === 'upcoming' || status === 'live',
    closesAt: status === 'upcoming' ? new Date(Date.now() + 240000).toISOString() : undefined
  };
}

// Helper function to create game state for live matches
function createGameState(matchId) {
  return {
    currentMove: Math.floor(Math.random() * 50) + 10,
    currentPlayer: Math.random() > 0.5 ? 'agent1' : 'agent2',
    timeRemaining: {
      agent1: Math.floor(Math.random() * 500) + 100,
      agent2: Math.floor(Math.random() * 500) + 100
    },
    lastMoveAt: new Date(Date.now() - Math.random() * 30000).toISOString()
  };
}

// Demo data for POC with complete structure matching frontend types
const demoMatches = [
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
      personality: 'tactical',
      specialAbility: 'Hundred-Type Guanyin Bodhisattva',
      recentPerformance: { wins: 23, losses: 2, draws: 1, period: 'last_30_days' }
    },
    agent2: { 
      id: 'meruem_ai', 
      name: 'Meruem', 
      elo: 2680, 
      nenType: 'specialization',
      avatar: '/avatars/meruem.png',
      winRate: 0.94,
      totalMatches: 156,
      personality: 'aggressive',
      specialAbility: 'Metamorphosis',
      recentPerformance: { wins: 28, losses: 1, draws: 0, period: 'last_30_days' }
    },
    bettingPool: createBettingPool(45.7, 'live', 2450, 2680),
    gameState: createGameState('live-match-1'),
    startTime: new Date(Date.now() - 900000).toISOString(),
    viewerCount: 347,
    magicBlockSessionId: 'mb_sess_live1_' + Date.now(),
    metadata: {
      gameType: 'ranked',
      timeControl: '10+5',
      boardVariant: 'standard'
    },
    created: new Date(Date.now() - 1200000).toISOString()
  },
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
      personality: 'aggressive',
      specialAbility: 'Jajanken',
      recentPerformance: { wins: 15, losses: 7, draws: 2, period: 'last_30_days' }
    },
    agent2: { 
      id: 'killua_ai', 
      name: 'Killua Zoldyck', 
      elo: 1720, 
      nenType: 'transmutation',
      avatar: '/avatars/killua.png',
      winRate: 0.76,
      totalMatches: 112,
      personality: 'tactical',
      specialAbility: 'Godspeed',
      recentPerformance: { wins: 18, losses: 5, draws: 1, period: 'last_30_days' }
    },
    bettingPool: createBettingPool(3.2, 'upcoming', 1650, 1720),
    scheduledStartTime: new Date(Date.now() + 300000).toISOString(),
    viewerCount: 89,
    metadata: {
      gameType: 'casual',
      timeControl: '5+3',
      boardVariant: 'standard'
    },
    created: new Date(Date.now() - 600000).toISOString()
  },
  {
    id: 'completed-match-1',
    status: 'completed',
    agent1: { 
      id: 'kurapika_ai', 
      name: 'Kurapika', 
      elo: 1890, 
      nenType: 'conjuration',
      avatar: '/avatars/kurapika.png',
      winRate: 0.82,
      totalMatches: 145,
      personality: 'strategic',
      specialAbility: 'Chain Jail',
      recentPerformance: { wins: 19, losses: 4, draws: 2, period: 'last_30_days' }
    },
    agent2: { 
      id: 'chrollo_ai', 
      name: 'Chrollo Lucilfer', 
      elo: 2150, 
      nenType: 'specialization',
      avatar: '/avatars/chrollo.png',
      winRate: 0.87,
      totalMatches: 189,
      personality: 'strategic',
      specialAbility: 'Skill Hunter',
      recentPerformance: { wins: 21, losses: 3, draws: 1, period: 'last_30_days' }
    },
    bettingPool: createBettingPool(12.4, 'completed', 1890, 2150),
    result: {
      winner: 2,
      winnerType: 'checkmate',
      finalScore: { agent1: 0, agent2: 1 },
      gameLength: 47,
      duration: 2340,
      payouts: { totalPaid: 11180000000, winnersCount: 12, avgPayout: 931666666 }
    },
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 1260000).toISOString(),
    viewerCount: 156,
    metadata: {
      gameType: 'ranked',
      timeControl: '15+10',
      boardVariant: 'standard'
    },
    created: new Date(Date.now() - 4200000).toISOString()
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

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'backend',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

// User Story 3: User views upcoming AI matches
app.get('/api/matches', (req, res) => {
  try {
    const { 
      status, 
      minRating, 
      maxRating, 
      minBet, 
      maxBet,
      search,
      sortBy = 'startTime',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;
    
    let filteredMatches = [...demoMatches];
    
    // Apply filters
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filteredMatches = filteredMatches.filter(match => statusArray.includes(match.status));
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredMatches = filteredMatches.filter(match =>
        match.agent1.name.toLowerCase().includes(searchTerm) ||
        match.agent2.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Rating filters
    if (minRating || maxRating) {
      filteredMatches = filteredMatches.filter(match => {
        const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
        if (minRating && avgRating < parseInt(minRating)) return false;
        if (maxRating && avgRating > parseInt(maxRating)) return false;
        return true;
      });
    }
    
    // Bet filters - now using bettingPool.totalPool instead of bettingPoolSol
    if (minBet || maxBet) {
      filteredMatches = filteredMatches.filter(match => {
        const poolSol = match.bettingPool ? match.bettingPool.totalPool / 1e9 : 0; // Convert lamports to SOL
        if (minBet && poolSol < parseFloat(minBet)) return false;
        if (maxBet && poolSol > parseFloat(maxBet)) return false;
        return true;
      });
    }
    
    // Pagination  
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedMatches = filteredMatches.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        matches: paginatedMatches,
        total: filteredMatches.length,
        page: pageNum,
        limit: limitNum,
        hasNext: endIndex < filteredMatches.length,
        hasPrev: pageNum > 1
      },
      timestamp: new Date().toISOString()
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
    
    // Ensure match has all required fields for frontend
    const enhancedMatch = {
      ...match,
      // Update game state for live matches to simulate real-time
      gameState: match.status === 'live' && match.gameState ? {
        ...match.gameState,
        currentMove: match.gameState.currentMove + Math.floor(Math.random() * 3),
        timeRemaining: {
          agent1: Math.max(0, match.gameState.timeRemaining.agent1 - Math.floor(Math.random() * 30)),
          agent2: Math.max(0, match.gameState.timeRemaining.agent2 - Math.floor(Math.random() * 30))
        },
        lastMoveAt: new Date().toISOString()
      } : match.gameState
    };
    
    res.json({
      success: true,
      data: {
        match: enhancedMatch
      },
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

// Training API - Get owned AI agents for a wallet
app.get('/api/training/owned-agents', (req, res) => {
  try {
    const walletAddress = req.query.wallet || req.query.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required',
        message: 'Please provide wallet address as query parameter'
      });
    }

    // Load training data for the specific wallet
    const fs = require('fs');
    const path = require('path');
    
    const trainingDataPath = path.join(__dirname, '..', 'backend-training-service-data.json');
    
    if (!fs.existsSync(trainingDataPath)) {
      return res.status(404).json({
        success: false,
        error: 'Training data not found',
        message: 'No training data available'
      });
    }

    const trainingData = JSON.parse(fs.readFileSync(trainingDataPath, 'utf8'));
    
    // Check if the requested wallet matches the data
    if (trainingData.wallet !== walletAddress) {
      return res.json({
        success: true,
        data: {
          agents: [],
          wallet: walletAddress,
          total: 0
        },
        message: 'No agents found for this wallet'
      });
    }

    // Return the agents with enhanced metadata
    const enhancedAgents = trainingData.agents.map(agent => ({
      ...agent,
      verified: true,
      onChainData: {
        mint: agent.mint,
        owner: walletAddress,
        verified: true,
        lastVerified: new Date().toISOString()
      }
    }));

    res.json({
      success: true,
      data: {
        agents: enhancedAgents,
        wallet: walletAddress,
        total: enhancedAgents.length
      },
      message: `Found ${enhancedAgents.length} AI agents for wallet`
    });

  } catch (error) {
    console.error('Training API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch owned agents',
      message: error.message
    });
  }
});

// Match replays endpoint for training
app.get('/api/training/match-replays/:agentMint', (req, res) => {
  try {
    const { agentMint } = req.params;
    
    const fs = require('fs');
    const path = require('path');
    
    const trainingDataPath = path.join(__dirname, '..', 'backend-training-service-data.json');
    
    if (!fs.existsSync(trainingDataPath)) {
      return res.status(404).json({
        success: false,
        error: 'Training data not found'
      });
    }

    const trainingData = JSON.parse(fs.readFileSync(trainingDataPath, 'utf8'));
    const agent = trainingData.agents.find(a => a.mint === agentMint);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: {
        agent: agent.name,
        mint: agentMint,
        replays: agent.matchHistory || [],
        statistics: agent.statistics || {}
      }
    });

  } catch (error) {
    console.error('Match replays API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match replays',
      message: error.message
    });
  }
});

// Agents API for marketplace
app.get('/api/agents', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const marketplaceDataPath = path.join(__dirname, '..', 'backend-marketplace-service-data.json');
    
    if (!fs.existsSync(marketplaceDataPath)) {
      return res.status(404).json({
        success: false,
        error: 'Marketplace data not found'
      });
    }

    const marketplaceData = JSON.parse(fs.readFileSync(marketplaceDataPath, 'utf8'));
    
    // Transform listings to agents format for the frontend
    const agents = marketplaceData.listings.map(listing => ({
      id: listing.agentId,
      name: listing.metadata.name,
      elo: listing.metadata.elo,
      winRate: listing.metadata.winRate,
      totalMatches: Math.floor(Math.random() * 100) + 50, // Random for demo
      price: listing.price,
      owner: listing.sellerId,
      personality: ['Tactical', 'Aggressive', 'Defensive', 'Strategic'][Math.floor(Math.random() * 4)],
      nenType: ['Enhancement', 'Transmutation', 'Emission', 'Manipulation', 'Conjuration', 'Specialization'][Math.floor(Math.random() * 6)],
      specialAbilities: ['Special Attack', 'Defense Boost', 'Speed Enhancement', 'Mind Games'],
      generation: Math.floor(Math.random() * 5) + 1,
      rarity: listing.metadata.tier.toLowerCase(),
      description: listing.metadata.description,
      tier: listing.metadata.tier,
      features: listing.features,
      createdAt: listing.createdAt,
      status: listing.status
    }));

    res.json({
      success: true,
      data: {
        agents: agents,
        total: agents.length
      },
      message: 'Marketplace agents loaded successfully'
    });

  } catch (error) {
    console.error('Agents API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents',
      message: error.message
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
        console.log(`Agents API: http://${HOST}:${PORT}/api/agents`);
        console.log(`Training API: http://${HOST}:${PORT}/api/training/owned-agents?wallet=8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC`);
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
