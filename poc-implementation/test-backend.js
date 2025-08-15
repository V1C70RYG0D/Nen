#!/usr/bin/env node

/**
 * Quick test server to verify the API endpoints work
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3011;

// Middleware
app.use(cors());
app.use(express.json());

// Load and mount the training routes
try {
  const replayTrainingRoutes = require('./backend/src/routes/replayTraining.js');
  app.use('/api/training', replayTrainingRoutes);
  console.log('✅ Training routes loaded');
} catch (error) {
  console.error('❌ Failed to load routes:', error.message);
  process.exit(1);
}

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Test server running on http://127.0.0.1:${PORT}`);
  console.log(`Health: http://127.0.0.1:${PORT}/health`);
  console.log(`Owned agents: http://127.0.0.1:${PORT}/api/training/owned-agents?walletAddress=H8UekPGwePSmQ3ttuYGPU1skmfnBGqzrVtxAvhjb5LZt`);
});
