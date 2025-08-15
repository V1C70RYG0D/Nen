#!/usr/bin/env node
/**
 * Simple Backend Starter
 * Starts the backend using the simple server for testing
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Simple Backend Server...');

const backendProcess = spawn('node', ['simple-server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

backendProcess.on('error', (error) => {
  console.error('❌ Failed to start backend:', error);
  process.exit(1);
});

backendProcess.on('close', (code) => {
  console.log(`🛑 Backend process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backend...');
  backendProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down backend...');
  backendProcess.kill('SIGTERM');
});

console.log('✅ Backend startup initiated');
console.log('📍 Backend URL: http://127.0.0.1:3001');
console.log('🔍 Health Check: http://127.0.0.1:3001/api/v1/health');
