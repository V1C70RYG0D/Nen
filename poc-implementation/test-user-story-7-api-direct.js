#!/usr/bin/env node

/**
 * Test User Story 7 API endpoints directly
 */

const express = require('express');

async function testUserStory7API() {
  try {
    console.log('🧪 Testing User Story 7 API Implementation');
    console.log('=' .repeat(50));

    // Load the training routes
    const replayTrainingRoutes = require('./backend/src/routes/replayTraining.js');
    console.log('✅ Training routes loaded successfully');

    // Create a mock Express app for testing
    const app = express();
    app.use(express.json());
    app.use('/api/training', replayTrainingRoutes);

    // Mock request/response objects for testing
    const createMockReq = (query = {}, body = {}) => ({
      query,
      body,
      params: {}
    });

    const createMockRes = () => {
      const res = {
        statusCode: 200,
        jsonData: null,
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { this.jsonData = data; return this; }
      };
      return res;
    };

    // Test 1: Get owned agents
    console.log('\n📋 Test 1: GET /api/training/owned-agents');
  const testWallet = '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC';
    
    // Find the owned-agents route
    const routes = replayTrainingRoutes.stack;
    const ownedAgentsRoute = routes.find(r => 
      r.route && r.route.path === '/owned-agents' && r.route.methods.get
    );
    
    if (ownedAgentsRoute) {
      console.log('  ✅ Route found: GET /owned-agents');
      
      const req = createMockReq({ walletAddress: testWallet });
      const res = createMockRes();
      
      try {
        await ownedAgentsRoute.route.stack[0].handle(req, res);
        
        if (res.statusCode === 200 && res.jsonData?.success) {
          console.log('  ✅ API call successful');
          console.log(`  📊 Found ${res.jsonData.data.length} owned agents`);
          console.log('  📝 Sample agent:', res.jsonData.data[0]?.name || 'None');
        } else {
          console.log('  ❌ API call failed:', res.jsonData?.error || 'Unknown error');
        }
      } catch (error) {
        console.log('  ❌ Route execution failed:', error.message);
      }
    } else {
      console.log('  ❌ Route not found');
    }

    // Test 2: Get match replays  
    console.log('\n🎮 Test 2: GET /api/training/match-replays');
    
    const matchReplaysRoute = routes.find(r => 
      r.route && r.route.path === '/match-replays' && r.route.methods.get
    );
    
    if (matchReplaysRoute) {
      console.log('  ✅ Route found: GET /match-replays');
      
      const req = createMockReq({ 
        agentMint: 'H4o5x8s4A3pYsG47yPCsGMe4GzLDXdbdJPQ7VHG89FzY',
        walletAddress: testWallet,
        limit: 10
      });
      const res = createMockRes();
      
      try {
        await matchReplaysRoute.route.stack[0].handle(req, res);
        
        if (res.statusCode === 200 && res.jsonData?.success) {
          console.log('  ✅ API call successful');
          console.log(`  📊 Found ${res.jsonData.data.length} match replays`);
          console.log('  🎯 Sample replay:', res.jsonData.data[0]?.replayId || 'None');
        } else {
          console.log('  ❌ API call failed:', res.jsonData?.error || 'Unknown error');
        }
      } catch (error) {
        console.log('  ❌ Route execution failed:', error.message);
      }
    } else {
      console.log('  ❌ Route not found');
    }

    // Test 3: Create training session
    console.log('\n🎯 Test 3: POST /api/training/sessions/replay-based');
    
    const trainingSessionRoute = routes.find(r => 
      r.route && r.route.path === '/sessions/replay-based' && r.route.methods.post
    );
    
    if (trainingSessionRoute) {
      console.log('  ✅ Route found: POST /sessions/replay-based');
      
      const req = createMockReq({}, {
        walletPubkey: testWallet,
        agentMint: 'H4o5x8s4A3pYsG47yPCsGMe4GzLDXdbdJPQ7VHG89FzY',
        selectedReplays: ['replay_1', 'replay_2', 'replay_3'],
        trainingParams: {
          focusArea: 'all',
          intensity: 'medium',
          maxMatches: 3
        }
      });
      const res = createMockRes();
      
      try {
        await trainingSessionRoute.route.stack[0].handle(req, res);
        
        if (res.statusCode === 200 && res.jsonData?.success) {
          console.log('  ✅ Training session created successfully');
          console.log('  🆔 Session ID:', res.jsonData.sessionId);
          console.log('  🔗 Explorer:', res.jsonData.explorer);
        } else {
          console.log('  ❌ Session creation failed:', res.jsonData?.error || 'Unknown error');
        }
      } catch (error) {
        console.log('  ❌ Route execution failed:', error.message);
      }
    } else {
      console.log('  ❌ Route not found');
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 User Story 7 API Testing Complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testUserStory7API().catch(console.error);
