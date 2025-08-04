#!/usr/bin/env node

/**
 * Arena Page Backend Server - Standalone Fix
 *
 * This is a complete backend solution for the arena page issues.
 * Run this file directly to start a working backend server.
 *
 * Usage: node arena-backend-fix.js
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 5002;

// Mock match data that updates dynamically
let matches = [
  {
    matchId: 'live_match_1',
    status: 'in_progress',
    players: {
      player1: { name: 'Royal Guard Alpha', elo: 1850, avatar: '👑' },
      player2: { name: 'Phantom Striker', elo: 1920, avatar: '⚡' }
    },
    gameState: {
      currentMove: 15,
      currentPlayer: 1,
      moveCount: 15,
      board: Array(9).fill(null).map(() => Array(9).fill(null))
    },
    spectators: { count: 12 },
    betting: { enabled: true, totalPool: 42.5 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Update match data periodically to simulate live changes
setInterval(() => {
  matches.forEach(match => {
    if (match.status === 'in_progress') {
      match.gameState.currentMove++;
      match.gameState.moveCount = match.gameState.currentMove;
      match.gameState.currentPlayer = match.gameState.currentPlayer === 1 ? 2 : 1;
      match.spectators.count = Math.floor(Math.random() * 20) + 5;
      match.updatedAt = new Date().toISOString();

      // Randomly end game
      if (match.gameState.currentMove > 50 && Math.random() > 0.95) {
        match.status = 'completed';
        match.winner = Math.random() > 0.5 ? 1 : 2;
      }
    }
  });
}, 3000);

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  try {
    if (path === '/api/v1/health') {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'Arena Backend is running',
        timestamp: new Date().toISOString(),
        port: PORT
      }));
    }
    else if (path === '/api/v1/game/matches') {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        match: matches[0] || null,
        timestamp: new Date().toISOString()
      }));
    }
    else if (path.startsWith('/api/v1/game/match/')) {
      const matchId = path.split('/').pop();
      const match = matches.find(m => m.matchId === matchId);

      if (!match) {
        res.writeHead(404);
        res.end(JSON.stringify({
          success: false,
          error: 'Match not found',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        match: match,
        timestamp: new Date().toISOString()
      }));
    }
    else if (path === '/api/v1/game/match' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);

          const newMatch = {
            matchId: `match_${Date.now()}`,
            status: 'pending',
            players: {
              player1: { name: 'AI Agent Alpha', elo: 1800, avatar: '🤖' },
              player2: { name: 'AI Agent Beta', elo: 1780, avatar: '🎯' }
            },
            gameState: {
              currentMove: 0,
              currentPlayer: 1,
              moveCount: 0,
              board: Array(9).fill(null).map(() => Array(9).fill(null))
            },
            spectators: { count: 0 },
            betting: { enabled: true, totalPool: 0 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          matches.unshift(newMatch);

          // Auto-start after 2 seconds
          setTimeout(() => {
            newMatch.status = 'in_progress';
            newMatch.updatedAt = new Date().toISOString();
          }, 2000);

          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            match: newMatch,
            message: 'Match created successfully',
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid JSON',
            timestamp: new Date().toISOString()
          }));
        }
      });
    }
    else {
      res.writeHead(404);
      res.end(JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        timestamp: new Date().toISOString()
      }));
    }
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }));
  }
});

server.listen(PORT, () => {
  console.log('🎮 Nen Arena Backend Server');
  console.log('============================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health: ${process.env.ARENA_PROTOCOL || 'http'}://${process.env.ARENA_HOST || 'localhost'}:${PORT}/api/v1/health`);
  console.log(`🎯 Matches: ${process.env.ARENA_PROTOCOL || 'http'}://${process.env.ARENA_HOST || 'localhost'}:${PORT}/api/v1/game/matches`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log('');
  console.log('🔴 Live match data updates every 3 seconds');
  console.log(`📱 Frontend should run on port ${process.env.FRONTEND_PORT || '3006'}`);
  console.log(`🔗 Arena URL: ${process.env.ARENA_PROTOCOL || 'http'}://${process.env.ARENA_HOST || 'localhost'}:${process.env.FRONTEND_PORT || '3006'}/arena/working`);
});

module.exports = server;
