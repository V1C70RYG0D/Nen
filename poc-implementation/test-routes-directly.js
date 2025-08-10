/**
 * Direct Route Test - Test User Story 7 routes without server startup
 */

const express = require('express');
const request = require('supertest');

// Mock request for testing
const mockReq = {
  query: {},
  body: {},
  params: {}
};

const mockRes = {
  json: (data) => {
    console.log('Response:', JSON.stringify(data, null, 2));
    return mockRes;
  },
  status: (code) => {
    console.log('Status:', code);
    return mockRes;
  }
};

async function testRoutesDirectly() {
  console.log('🧪 Testing User Story 7 Routes Directly');
  console.log('=' .repeat(50));

  try {
    // Import routes
    const replayTrainingRoutes = require('./backend/src/routes/replayTraining');
    console.log('✅ Routes imported successfully');
    console.log('Routes type:', typeof replayTrainingRoutes);

    // Create test app
    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/training', replayTrainingRoutes);

    console.log('\n🚀 Testing individual endpoints...\n');

    // Test 1: Parameter validation endpoint
    console.log('📋 Test: Parameter Validation Endpoint');
    const paramTest = await new Promise((resolve) => {
      const req = { ...mockReq };
      const res = {
        json: (data) => {
          console.log('✅ SUCCESS: Parameter validation response received');
          resolve({ success: true, data });
        },
        status: (code) => ({ json: (data) => resolve({ success: false, status: code, data }) })
      };
      
      // Simulate the route handler
      const handler = replayTrainingRoutes.stack?.find(layer => 
        layer.route?.path === '/parameters/validation' && 
        layer.route?.methods?.get
      );
      
      if (handler) {
        handler.route.stack[0].handle(req, res);
      } else {
        console.log('❌ Handler not found');
        resolve({ success: false, error: 'Handler not found' });
      }
    });

    // Test with supertest
    console.log('\n🔧 Testing with supertest...');
    const response = await request(testApp)
      .get('/api/training/parameters/validation')
      .expect('Content-Type', /json/);

    console.log('✅ Supertest response status:', response.status);
    console.log('✅ Supertest response body:', response.body);

    if (response.status === 200 && response.body.success) {
      console.log('\n🎉 User Story 7 routes are working correctly!');
      console.log('The routes can handle requests and return proper responses.');
      console.log('\n📝 Routes are ready, the issue is likely with route mounting in the main server.');
      
      return { success: true, message: 'Routes working correctly' };
    } else {
      console.log('\n❌ Routes not responding correctly');
      return { success: false, message: 'Routes not responding correctly' };
    }

  } catch (error) {
    console.error('❌ Error testing routes:', error.message);
    return { success: false, error: error.message };
  }
}

// Run test
if (require.main === module) {
  testRoutesDirectly().then(result => {
    console.log('\n📊 Final Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { testRoutesDirectly };
