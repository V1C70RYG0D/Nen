const express = require('express');
const cors = require('cors');
const trainingService = require('./src/services/training-devnet.js');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'nen-backend', timestamp: new Date().toISOString() });
});

// Training endpoint
app.post('/api/training/sessions/replay-based', async (req, res) => {
  try {
    console.log('🔥 Training session request received:', req.body);
    
    const { walletPubkey, agentMint, sessionId, replayCommitments, trainingParams } = req.body;
    
    // Validate required fields
    if (!walletPubkey || !agentMint || !sessionId || !replayCommitments || !trainingParams) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: walletPubkey, agentMint, sessionId, replayCommitments, trainingParams'
      });
    }
    
    console.log('✅ Validation passed, calling training service...');
    
    // Call the training service
    const result = await trainingService.createTrainingSessionOnChain({
      walletPubkey,
      agentMint,
      sessionId,
      replayCommitments,
      trainingParams
    });
    
    console.log('✅ Training service result:', result);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Training endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple training server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎯 Training endpoint: POST http://localhost:${PORT}/api/training/sessions/replay-based`);
});
