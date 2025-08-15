#!/usr/bin/env node

/**
 * User Story 3 Development Server
 * Starts backend and provides instructions for frontend
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('🚀 Starting User Story 3 Development Environment');
console.log('=' .repeat(60));

// Function to check if a port is available
function checkPort(port, callback) {
  const server = require('net').createServer();
  
  server.listen(port, (err) => {
    if (err) {
      callback(false);
    } else {
      server.once('close', () => callback(true));
      server.close();
    }
  });
  
  server.on('error', () => callback(false));
}

// Function to wait for backend to be ready
function waitForBackend(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      
      const req = http.get(`http://localhost:${port}/api/matches`, (res) => {
        console.log('✅ Backend is ready and serving matches API');
        resolve();
      });
      
      req.on('error', (err) => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Backend not ready after ${maxAttempts} attempts`));
        } else {
          console.log(`⏳ Waiting for backend... (attempt ${attempts}/${maxAttempts})`);
          setTimeout(check, 1000);
        }
      });
    };
    
    check();
  });
}

async function startDevelopmentEnvironment() {
  try {
    console.log('📋 User Story 3: User views upcoming AI matches');
    console.log('   Requirements:');
    console.log('   ✓ User navigates to matches page');
    console.log('   ✓ User sees list of scheduled matches');
    console.log('   ✓ User filters by bet range or AI rating');  
    console.log('   ✓ User clicks match for details');
    console.log('');

    // Check if port 3001 is available
    console.log('🔍 Checking backend port availability...');
    const port3001Available = await new Promise(resolve => checkPort(3001, resolve));
    
    if (!port3001Available) {
      console.log('⚠️  Port 3001 is already in use');
      console.log('   Backend may already be running, or another service is using the port');
      console.log('   Trying to connect to existing backend...');
    } else {
      console.log('✅ Port 3001 is available');
    }

    // Start the backend server
    console.log('\\n🚀 Starting backend server...');
    const backendProcess = spawn('node', ['backend/simple-server.js'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PORT: '3001' }
    });

    backendProcess.on('error', (error) => {
      console.error('❌ Failed to start backend:', error);
      process.exit(1);
    });

    // Wait for backend to be ready
    console.log('⏳ Waiting for backend to start...');
    await waitForBackend(3001);
    
    // Test the User Story 3 implementation
    console.log('\\n🧪 Running User Story 3 validation...');
    const testProcess = spawn('node', ['test-user-story-3.js'], {
      stdio: 'inherit',
      shell: true
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\\n' + '='.repeat(60));
        console.log('🎉 User Story 3 is ready for launch!');
        console.log('\\n📍 Access points:');
        console.log('   🔗 Backend API: http://localhost:3001/api/matches');
        console.log('   🔗 Health Check: http://localhost:3001/api/v1/health');
        console.log('\\n🚀 Next steps:');
        console.log('   1. Start frontend: cd frontend && npm run dev');
        console.log('   2. Visit: http://localhost:3000');
        console.log('   3. Navigate to matches section');
        console.log('   4. Verify all User Story 3 requirements');
        console.log('\\n✨ Ready for final launch!');
      } else {
        console.log('❌ User Story 3 validation failed');
        process.exit(1);
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\\n🛑 Shutting down User Story 3 development environment...');
      backendProcess.kill('SIGINT');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start development environment:', error);
    console.log('\\n🔧 Troubleshooting:');
    console.log('   1. Make sure no other process is using port 3001');
    console.log('   2. Check that Node.js is properly installed');
    console.log('   3. Verify all dependencies are available');
    process.exit(1);
  }
}

startDevelopmentEnvironment();
