#!/usr/bin/env node

/**
 * Ultra-simple server for Nen Platform
 * Works with minimal dependencies
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3001;

// Simple JSON response helper
function jsonResponse(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Simple router
const routes = {
  '/api/v1/health': () => ({
    success: true,
    message: 'Nen Platform Backend is running (simple mode)',
    timestamp: new Date().toISOString(),
    mode: 'simple-server'
  }),

  // Frontend expects these exact endpoints
  '/api/matches': (query) => ({
    success: true,
    matches: [
      {
        id: 'demo-match-1',
        player1: 'AI Agent Alpha',
        player2: 'AI Agent Beta',
        status: query.status === 'live' ? 'live' : 'active',
        created: new Date().toISOString(),
        gameType: 'gungi',
        currentTurn: 'Alpha',
        spectators: 12
      },
      {
        id: 'demo-match-2',
        player1: 'AI Agent Gamma',
        player2: 'AI Agent Delta',
        status: query.status === 'live' ? 'live' : 'completed',
        created: new Date(Date.now() - 3600000).toISOString(),
        gameType: 'gungi',
        winner: 'Gamma'
      }
    ],
    timestamp: new Date().toISOString()
  }),

  '/api/stats': () => ({
    success: true,
    stats: {
      totalMatches: 1247,
      activeMatches: 23,
      totalPlayers: 892,
      onlinePlayers: 156,
      totalBets: '12.4 SOL',
      topAgent: 'AI Agent Alpha',
      averageMatchTime: '18m 32s',
      dailyMatches: 89
    },
    timestamp: new Date().toISOString()
  }),

  '/api/v1/game/matches': () => ({
    success: true,
    matches: [
      {
        id: 'demo-match-1',
        player1: 'AI Agent Alpha',
        player2: 'AI Agent Beta',
        status: 'active',
        created: new Date().toISOString()
      }
    ],
    timestamp: new Date().toISOString()
  }),

  '/api/v1/agents': () => ({
    success: true,
    agents: [
      {
        id: 'agent-alpha',
        name: 'Alpha',
        skill: 'Advanced',
        wins: 42,
        losses: 18
      },
      {
        id: 'agent-beta',
        name: 'Beta',
        skill: 'Expert',
        wins: 38,
        losses: 22
      }
    ],
    timestamp: new Date().toISOString()
  }),

  '/api/analytics/web-vitals': () => ({
    success: true,
    message: 'Web vitals recorded',
    timestamp: new Date().toISOString()
  })
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Handle POST requests (like web-vitals)
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (routes[path]) {
        try {
          const data = routes[path](query, body);
          jsonResponse(res, data);
        } catch (error) {
          jsonResponse(res, {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }, 500);
        }
      } else {
        jsonResponse(res, {
          success: true,
          message: 'Data received',
          timestamp: new Date().toISOString()
        });
      }
    });
    return;
  }

  // Route handler for GET requests
  if (routes[path]) {
    try {
      const data = routes[path](query);
      jsonResponse(res, data);
    } catch (error) {
      jsonResponse(res, {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
  } else {
    jsonResponse(res, {
      success: false,
      error: 'Route not found',
      path: path,
      timestamp: new Date().toISOString()
    }, 404);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Nen Platform Simple Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🎮 Matches API: http://localhost:${PORT}/api/v1/game/matches`);
  console.log(`🤖 Agents API: http://localhost:${PORT}/api/v1/agents`);
  console.log('');
  console.log('This is a simplified server running while dependencies install.');
  console.log('For full features, run: npm run dev (after npm install completes)');
});
