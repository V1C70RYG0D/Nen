#!/usr/bin/env node

/**
 * Test Training Service - Debug the _bn error
 */

require('dotenv').config();

async function testTrainingService() {
  try {
    console.log('Loading training service...');
    const trainingService = require('./src/services/training-devnet.js');
    console.log('✅ Training service loaded');

    console.log('Testing createTrainingSessionOnChain...');
    
    const testParams = {
      walletPubkey: '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC',
      agentMint: 'H4o5x8s4A3pYsG47yPCsGMe4GzLDXdbdJPQ7VHG89FzY',
      sessionId: '12345678-1234-1234-1234-123456789012',
      replayCommitments: ['711a90da39aaae69b7d6b45d746265662e7625dc0eea0570f36b29c485de3f87'],
      trainingParams: {
        focusArea: 'all',
        intensity: 'medium',
        maxMatches: 1,
        learningRate: 0.001,
        epochs: 10,
        batchSize: 32
      }
    };

    console.log('Calling createTrainingSessionOnChain with test params...');
    const result = await trainingService.createTrainingSessionOnChain(testParams);
    console.log('✅ Success:', result);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

if (require.main === module) {
  testTrainingService();
}
