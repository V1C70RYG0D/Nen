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

// Demo data for POC
const demoMatches = [
  {
    id: 'demo-match-1',
    status: 'live',
    agent1: { id: 'netero_ai', name: 'Chairman Netero', elo: 1850, nenType: 'enhancement' },
    agent2: { id: 'meruem_ai', name: 'Meruem', elo: 2100, nenType: 'specialization' },
    bettingPool: {
      totalPool: 15.6 * 1e9,
      oddsAgent1: 1.6,
      oddsAgent2: 2.4,
      isOpenForBetting: true,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9
    },
    startTime: new Date().toISOString(),
    gameType: 'gungi'
  },
  {
    id: 'demo-match-2',
    status: 'upcoming',
    agent1: { id: 'gon_ai', name: 'Gon Freecss', elo: 1650, nenType: 'enhancement' },
    agent2: { id: 'killua_ai', name: 'Killua Zoldyck', elo: 1680, nenType: 'transmutation' },
    bettingPool: {
      totalPool: 8.3 * 1e9,
      oddsAgent1: 1.9,
      oddsAgent2: 1.8,
      isOpenForBetting: true,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9
    },
    startTime: new Date(Date.now() + 60000).toISOString(),
    gameType: 'gungi'
  },
  {
    id: 'demo-match-3',
    status: 'upcoming',
    agent1: { id: 'kurapika_ai', name: 'Kurapika', elo: 1720, nenType: 'conjuration' },
    agent2: { id: 'hisoka_ai', name: 'Hisoka', elo: 1890, nenType: 'transmutation' },
    bettingPool: {
      totalPool: 12.1 * 1e9,
      oddsAgent1: 2.1,
      oddsAgent2: 1.7,
      isOpenForBetting: true,
      minBet: 0.1 * 1e9,
      maxBet: 50 * 1e9
    },
    startTime: new Date(Date.now() + 120000).toISOString(),
    gameType: 'gungi'
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

// User Story 3: User views upcoming AI matches
app.get('/api/matches', (req, res) => {
  try {
    const { status, minRating, maxRating, minBet, maxBet } = req.query;
    
    let filteredMatches = [...demoMatches];
    
    // Apply filters
    if (status) {
      filteredMatches = filteredMatches.filter(match => match.status === status);
    }
    
    if (minRating || maxRating) {
      filteredMatches = filteredMatches.filter(match => {
        const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
        if (minRating && avgRating < parseInt(minRating)) return false;
        if (maxRating && avgRating > parseInt(maxRating)) return false;
        return true;
      });
    }
    
    if (minBet || maxBet) {
      filteredMatches = filteredMatches.filter(match => {
        const minBetSOL = match.bettingPool.minBet / 1e9;
        const maxBetSOL = match.bettingPool.maxBet / 1e9;
        if (minBet && maxBetSOL < parseFloat(minBet)) return false;
        if (maxBet && minBetSOL > parseFloat(maxBet)) return false;
        return true;
      });
    }
    
    res.json({
      success: true,
      data: {
        matches: filteredMatches,
        total: filteredMatches.length,
        filters: { status, minRating, maxRating, minBet, maxBet }
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
