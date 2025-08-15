/**
 * Simple test server to verify User Story 7 routes work
 */

const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Load replay training routes
try {
  const replayTrainingRoutes = require('./backend/src/routes/replayTraining');
  app.use('/api/training', replayTrainingRoutes);
  console.log('✅ Replay training routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load replay training routes:', error.message);
  process.exit(1);
}

// Test endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'User Story 7 Test Server',
    endpoints: [
      'GET /api/training/owned-agents',
      'GET /api/training/match-replays', 
      'GET /api/training/parameters/validation',
      'POST /api/training/sessions/replay-based'
    ]
  });
});

const PORT = 3012;
app.listen(PORT, () => {
  console.log(`🚀 User Story 7 test server running on http://127.0.0.1:${PORT}`);
  console.log('Test the endpoints at:');
  console.log(`  http://127.0.0.1:${PORT}/api/training/parameters/validation`);
});
