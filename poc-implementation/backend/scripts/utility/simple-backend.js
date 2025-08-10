/**
 * Simple Working Backend for Arena Page

 */

const express = require('express');
const cors = require('cors');
const path = require('path');


require('dotenv').config();

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || (() => {

})();


const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.DEV_FRONTEND_URL,
  process.env.NEXT_PUBLIC_API_URL
].filter(Boolean); // Remove undefined values

if (allowedOrigins.length === 0) {

}

// Enable CORS for frontend
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// In-memory storage for demo (would be database in production)
const matches = [];
let matchCounter = 1;

// Mock AI agents data
const aiAgents = [
  { id: 'royal-guard-alpha', name: 'Royal Guard Alpha', elo: 1850, avatar: '👑' },
  { id: 'phantom-striker', name: 'Phantom Striker', elo: 1920, avatar: '⚡' },
  { id: 'azure-tactician', name: 'Azure Tactician', elo: 1780, avatar: '🔷' },
  { id: 'crimson-beast', name: 'Crimson Beast', elo: 1865, avatar: '🔥' }
];

// Create initial demo match
const createDemoMatch = () => {
  const agent1 = aiAgents[Math.floor(Math.random() * aiAgents.length)];
  const agent2 = aiAgents.filter(a => a.id !== agent1.id)[Math.floor(Math.random() * 3)];

  return {
    matchId: `match_${matchCounter++}`,
    status: Math.random() > 0.5 ? 'in_progress' : 'pending',
    players: {
      player1: agent1,
      player2: agent2
    },
    gameState: {
      currentMove: Math.floor(Math.random() * 30) + 1,
      currentPlayer: Math.random() > 0.5 ? 1 : 2,
      board: Array(9).fill(null).map(() => Array(9).fill(null)),
      moveCount: Math.floor(Math.random() * 30) + 1
    },
    spectators: {
      count: Math.floor(Math.random() * 20) + 5
    },
    betting: {
      enabled: true,
      totalPool: Math.random() * 50 + 10,
      oddsPlayer1: 1.5 + Math.random() * 0.5,
      oddsPlayer2: 1.5 + Math.random() * 0.5
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Initialize with one demo match
matches.push(createDemoMatch());

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Get all matches
app.get('/api/v1/game/matches', (req, res) => {
  try {
    // Update demo data to simulate live changes
    if (matches.length > 0) {
      const match = matches[0];
      match.spectators.count = Math.floor(Math.random() * 20) + 5;
      match.gameState.currentMove = Math.floor(Math.random() * 50) + 10;
      match.gameState.moveCount = match.gameState.currentMove;
      match.updatedAt = new Date().toISOString();

      // Sometimes change status to simulate progression
      if (Math.random() > 0.8 && match.status === 'pending') {
        match.status = 'in_progress';
      }
    }

    const response = matches.length > 0 ? {
      success: true,
      match: matches[0], // Return the first match for demo
      timestamp: new Date().toISOString()
    } : {
      success: false,
      message: 'No active matches',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
      timestamp: new Date().toISOString()
    });
  }
});

// Get specific match
app.get('/api/v1/game/match/:matchId', (req, res) => {
  try {
    const { matchId } = req.params;
    const match = matches.find(m => m.matchId === matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
        timestamp: new Date().toISOString()
      });
    }

    // Update live data
    match.spectators.count = Math.floor(Math.random() * 20) + 5;
    match.gameState.currentMove++;
    match.gameState.moveCount = match.gameState.currentMove;
    match.gameState.currentPlayer = match.gameState.currentPlayer === 1 ? 2 : 1;
    match.updatedAt = new Date().toISOString();

    // Randomly end the game
    if (match.gameState.currentMove > 40 && Math.random() > 0.9) {
      match.status = 'completed';
      match.winner = Math.random() > 0.5 ? 1 : 2;
    }

    res.json({
      success: true,
      match: match,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match',
      timestamp: new Date().toISOString()
    });
  }
});

// Create new match
app.post('/api/v1/game/match', (req, res) => {
  try {
    const { aiAgent1Id, aiAgent2Id, matchType, bettingEnabled } = req.body;

    const agent1 = aiAgents.find(a => a.id === aiAgent1Id) || aiAgents[0];
    const agent2 = aiAgents.find(a => a.id === aiAgent2Id) || aiAgents[1];

    const newMatch = {
      matchId: `match_${matchCounter++}`,
      status: 'pending',
      players: {
        player1: agent1,
        player2: agent2
      },
      gameState: {
        currentMove: 0,
        currentPlayer: 1,
        board: Array(9).fill(null).map(() => Array(9).fill(null)),
        moveCount: 0
      },
      spectators: {
        count: 0
      },
      betting: {
        enabled: bettingEnabled || false,
        totalPool: 0,
        oddsPlayer1: 1.7,
        oddsPlayer2: 2.2
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    matches.unshift(newMatch); // Add to beginning

    // Auto-start after 2 seconds
    setTimeout(() => {
      newMatch.status = 'in_progress';
      newMatch.updatedAt = new Date().toISOString();
    }, 2000);

    res.json({
      success: true,
      match: newMatch,
      message: 'Match created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create match',
      timestamp: new Date().toISOString()
    });
  }
});

// List AI agents
app.get('/api/v1/ai/agents', (req, res) => {
  res.json({
    success: true,
    agents: aiAgents,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  const host = process.env.BACKEND_HOST || 'localhost';
  const protocol = process.env.BACKEND_SECURE === 'true' ? 'https' : 'http';

  console.log(`✅ Nen Backend Server running on port ${PORT}`);
  console.log(`🌐 Health check: ${protocol}://${host}:${PORT}/api/v1/health`);
  console.log(`🎮 Matches API: ${protocol}://${host}:${PORT}/api/v1/game/matches`);
  console.log(`📊 CORS enabled for: ${allowedOrigins.join(', ')}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

module.exports = app;
