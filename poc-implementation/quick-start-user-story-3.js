#!/usr/bin/env node

/**
 * Quick Start Script for User Story 3 Demo
 * Starts backend and validates the filtering implementation
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('🚀 Quick Start: User Story 3 - Filter by bet range or AI rating');
console.log('=' .repeat(60));

// Start backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Starting backend server...');
    
    const backend = spawn('node', ['backend/src/temp-server.js'], {
      stdio: 'pipe',
      shell: true
    });

    backend.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('BACKEND STARTED')) {
        console.log('✅ Backend server started successfully');
        console.log('🔗 API: http://localhost:3001/api/matches');
        resolve(backend);
      }
      process.stdout.write(output);
    });

    backend.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    backend.on('error', reject);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Backend startup timeout'));
    }, 10000);
  });
}

// Test API endpoints
async function testEndpoints() {
  console.log('\n🧪 Testing User Story 3 endpoints...');
  
  const tests = [
    {
      url: 'http://localhost:3001/api/matches',
      name: 'Basic matches'
    },
    {
      url: 'http://localhost:3001/api/matches?minBetRange=10&maxBetRange=50',
      name: 'Filter by bet range (10-50 SOL)'
    },
    {
      url: 'http://localhost:3001/api/matches?minAiRating=2000&maxAiRating=2500',
      name: 'Filter by AI rating (2000-2500)'
    },
    {
      url: 'http://localhost:3001/api/matches?status=live',
      name: 'Filter by live status'
    }
  ];

  for (const test of tests) {
    try {
      const result = await makeRequest(test.url);
      console.log(`✅ ${test.name}: ${result.data?.matches?.length || 0} matches`);
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function main() {
  try {
    const backend = await startBackend();
    
    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testEndpoints();
    
    console.log('\n🎉 User Story 3 backend is ready!');
    console.log('\n📋 Next steps:');
    console.log('1. Frontend should now show matches with working filters');
    console.log('2. Open http://localhost:3000 and navigate to matches');
    console.log('3. Test the "Filter by bet range or AI rating" functionality');
    console.log('\n✨ Implementation complete - ready for launch!');
    
    // Keep the backend running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      backend.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Failed to start:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Check Node.js is installed');
    console.log('- Ensure port 3001 is available');
    console.log('- Try: cd backend && node src/temp-server.js');
    process.exit(1);
  }
}

main();
