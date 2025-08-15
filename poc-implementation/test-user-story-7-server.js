/**
 * Quick test server to verify User Story 7 routes work correctly
 */

const express = require('express');
const cors = require('cors');
const replayTrainingRoutes = require('./backend/src/routes/replayTraining');

const app = express();
const PORT = 3015; // Use different port to avoid conflict

// Middleware
app.use(cors());
app.use(express.json());

// Mount training routes
app.use('/api/training', replayTrainingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-story-7-test', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧪 User Story 7 Test Server running on http://127.0.0.1:${PORT}`);
  console.log('Available routes:');
  console.log('- GET  /api/training/owned-agents');
  console.log('- GET  /api/training/match-replays');
  console.log('- GET  /api/training/parameters/validation');
  console.log('- POST /api/training/sessions/replay-based');
});

module.exports = app;
