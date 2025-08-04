#!/usr/bin/env node

/**
 * Quick Start Backend for Nen Platform
 * Minimal setup to get the backend running quickly

 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');


require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });

const app = express();
const PORT = process.env.PORT || process.env.DEFAULT_PORT || 5002;


const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [`${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.FRONTEND_PORT || 3000}`,
     `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.FRONTEND_ALT_PORT || 3006}`];

// Basic middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Basic routes for frontend to work
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Backend is running', timestamp: new Date().toISOString() });
});

app.get('/api/v1/game/matches', async (req, res) => {
  try {
    // Use demo service for quick start
    const DemoGameService = require('./src/services/demo-game-service');
    const gameService = new DemoGameService();
    const matches = await gameService.getActiveMatches();

    res.json({
      success: true,
      matches: matches || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/game/create-match', async (req, res) => {
  try {
    // Use demo service for quick start
    const DemoGameService = require('./src/services/demo-game-service');
    const gameService = new DemoGameService();
    const matchData = await gameService.createMatch(req.body);

    res.json({
      success: true,
      match: matchData,
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

app.get('/api/v1/game/match/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;

    // Use demo service for quick start
    const DemoGameService = require('./src/services/demo-game-service');
    const gameService = new DemoGameService();
    const match = await gameService.getMatchById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
        timestamp: new Date().toISOString()
      });
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

app.get('/api/v1/agents', async (req, res) => {
  try {
    // Use demo service for quick start
    const DemoGameService = require('./src/services/demo-game-service');
    const gameService = new DemoGameService();
    const agents = await gameService.getAvailableAgents();

    res.json({
      success: true,
      agents: agents || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/betting/pool/:matchId', (req, res) => {
  const pool = {
    success: true,
    pool: {
      id: 'pool_' + req.params.matchId,
      matchId: req.params.matchId,
      totalPool: (Math.random() * 100 + 20).toFixed(1),
      option1Pool: (Math.random() * 60 + 10).toFixed(1),
      option2Pool: (Math.random() * 40 + 10).toFixed(1),
      option1Odds: (Math.random() * 0.8 + 1.2).toFixed(2),
      option2Odds: (Math.random() * 0.8 + 1.2).toFixed(2),
      status: 'open'
    }
  };

  res.json(pool);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.listen(PORT, () => {
  const host = process.env.HOST;
  const protocol = process.env.PROTOCOL || 'http';
  const baseUrl = `${protocol}://${host}:${PORT}`;

  console.log(`🚀 Nen Platform Backend running on port ${PORT}`);
  console.log(`📊 Health check: ${baseUrl}/api/v1/health`);
  console.log(`🎮 Matches API: ${baseUrl}/api/v1/game/matches`);
  console.log(`🤖 Agents API: ${baseUrl}/api/v1/agents`);
});
