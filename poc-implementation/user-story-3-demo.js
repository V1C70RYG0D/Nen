#!/usr/bin/env node

/**
 * User Story 3 Demo Script
 * This script demonstrates all requirements of User Story 3
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// User Story 3: Comprehensive demo data
const DEMO_MATCHES = [
  {
    id: 'demo-match-1',
    status: 'live',
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
    viewerCount: 127,
    gameState: {
      currentMove: 47,
      currentPlayer: 'agent1',
      timeRemaining: { agent1: 425, agent2: 380 }
    },
    startTime: new Date(Date.now() - 600000),
    bettingPool: {
      totalPool: 15.6 * 1e9,
      agent1Pool: 9.36 * 1e9,
      agent2Pool: 6.24 * 1e9,
      oddsAgent1: 1.6,
      oddsAgent2: 2.4,
      betsCount: 18,
      minBet: 100000000,
      maxBet: 100000000000,
      isOpenForBetting: true
    }
  },
  {
    id: 'demo-match-2',
    status: 'upcoming',
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
    viewerCount: 67,
    scheduledStartTime: new Date(Date.now() + 300000),
    bettingPool: {
      totalPool: 8.3 * 1e9,
      agent1Pool: 3.32 * 1e9,
      agent2Pool: 4.98 * 1e9,
      oddsAgent1: 2.1,
      oddsAgent2: 1.7,
      betsCount: 12,
      minBet: 100000000,
      maxBet: 100000000000,
      isOpenForBetting: true
    }
  },
  {
    id: 'demo-match-3',
    status: 'upcoming',
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
    viewerCount: 45,
    scheduledStartTime: new Date(Date.now() + 900000),
    bettingPool: {
      totalPool: 22.1 * 1e9,
      agent1Pool: 13.26 * 1e9,
      agent2Pool: 8.84 * 1e9,
      oddsAgent1: 1.7,
      oddsAgent2: 2.2,
      betsCount: 31,
      minBet: 100000000,
      maxBet: 100000000000,
      isOpenForBetting: true
    }
  },
  {
    id: 'demo-match-4',
    status: 'upcoming',
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
    viewerCount: 89,
    scheduledStartTime: new Date(Date.now() + 1800000),
    bettingPool: {
      totalPool: 5.2 * 1e9,
      agent1Pool: 2.34 * 1e9,
      agent2Pool: 2.86 * 1e9,
      oddsAgent1: 2.0,
      oddsAgent2: 1.8,
      betsCount: 8,
      minBet: 100000000,
      maxBet: 100000000000,
      isOpenForBetting: true
    }
  }
];

// GET /api/matches - User Story 3 Implementation
app.get('/api/matches', (req, res) => {
  console.log('📋 User Story 3: User views upcoming AI matches');
  console.log('   ✓ User navigates to matches page');
  console.log('   ✓ User sees list of scheduled matches');
  
  // Apply filters as per User Story 3 requirements
  const { status, minRating, maxRating, minBet, maxBet } = req.query;
  let filteredMatches = [...DEMO_MATCHES];

  if (status) {
    console.log('   ✓ User filters by status:', status);
    const statusArray = Array.isArray(status) ? status : [status];
    filteredMatches = filteredMatches.filter(match => 
      statusArray.includes(match.status)
    );
  }

  if (minRating || maxRating) {
    console.log('   ✓ User filters by AI rating:', { minRating, maxRating });
    filteredMatches = filteredMatches.filter(match => {
      const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
      if (minRating && avgRating < parseInt(minRating)) return false;
      if (maxRating && avgRating > parseInt(maxRating)) return false;
      return true;
    });
  }

  if (minBet || maxBet) {
    console.log('   ✓ User filters by bet range:', { minBet, maxBet });
    filteredMatches = filteredMatches.filter(match => {
      if (minBet && match.bettingPoolSol < parseFloat(minBet)) return false;
      if (maxBet && match.bettingPoolSol > parseFloat(maxBet)) return false;
      return true;
    });
  }

  console.log(`   → Returning ${filteredMatches.length} matches`);
  
  res.json({
    success: true,
    data: {
      matches: filteredMatches,
      total: filteredMatches.length,
      page: 1,
      limit: 50,
      hasNext: false,
      hasPrev: false,
      filters: { status, minRating, maxRating, minBet, maxBet }
    },
    message: 'User Story 3: AI matches loaded successfully'
  });
});

// GET /api/matches/:id - User clicks match for details
app.get('/api/matches/:id', (req, res) => {
  console.log('🎯 User Story 3: User clicks match for details');
  const { id } = req.params;
  
  const match = DEMO_MATCHES.find(m => m.id === id);
  
  if (!match) {
    return res.status(404).json({
      success: false,
      error: 'Match not found'
    });
  }

  console.log(`   ✓ User clicks match for details: ${match.agent1.name} vs ${match.agent2.name}`);
  
  res.json({
    success: true,
    data: match,
    message: 'Match details retrieved successfully'
  });
});

// Start the demo server
app.listen(PORT, () => {
  console.log('🚀 User Story 3 Demo Server Started!');
  console.log('=' .repeat(60));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`📋 Matches API: http://localhost:${PORT}/api/matches`);
  console.log(`🔍 Filter example: http://localhost:${PORT}/api/matches?status=live,upcoming`);
  console.log(`🎯 Match details: http://localhost:${PORT}/api/matches/demo-match-1`);
  console.log('=' .repeat(60));
  console.log('✅ Ready to demonstrate User Story 3!');
  console.log('');
  console.log('User Story 3 Features:');
  console.log('✓ User navigates to matches page');
  console.log('✓ User sees list of scheduled matches');
  console.log('✓ User filters by bet range or AI rating');
  console.log('✓ User clicks match for details');
  console.log('');
  console.log('💡 Try these URLs:');
  console.log('   • All matches: curl http://localhost:3001/api/matches');
  console.log('   • Live only: curl "http://localhost:3001/api/matches?status=live"');
  console.log('   • High rating: curl "http://localhost:3001/api/matches?minRating=2000"');
  console.log('   • Bet range: curl "http://localhost:3001/api/matches?minBet=10&maxBet=20"');
});
