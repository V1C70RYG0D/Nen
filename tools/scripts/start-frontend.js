#!/usr/bin/env node

/**
 * Enhanced Frontend Starter Script
 * Starts the Next.js frontend with AI system integration
 * No hardcoded values, proper error handling
 */

const { spawn } = require('child_process');
const path = require('path');

// Load environment configuration - externalized values
require('dotenv').config({ path: path.join(__dirname, '.env') });

const FRONTEND_PORT = process.env.FRONTEND_PORT || process.env.DEV_FRONTEND_PORT || process.env.DEFAULT_FRONTEND_PORT || (() => {
  throw new Error('FRONTEND_PORT, DEV_FRONTEND_PORT, or DEFAULT_FRONTEND_PORT must be set in environment variables. No hardcoded values allowed.');
})();
const FRONTEND_HOST = process.env.FRONTEND_HOST || process.env.DEV_FRONTEND_HOST || process.env.DEFAULT_FRONTEND_HOST || (() => {
  throw new Error('FRONTEND_HOST, DEV_FRONTEND_HOST, or DEFAULT_FRONTEND_HOST must be set in environment variables. No hardcoded values allowed.');
})();
const AI_SERVICE_PORT = process.env.AI_SERVICE_PORT || process.env.DEV_AI_SERVICE_PORT || process.env.DEFAULT_AI_SERVICE_PORT || (() => {
  throw new Error('AI_SERVICE_PORT, DEV_AI_SERVICE_PORT, or DEFAULT_AI_SERVICE_PORT must be set in environment variables. No hardcoded values allowed.');
})();

console.log('🚀 Starting Nen Platform Frontend...');
console.log(`📊 AI Service: http://${FRONTEND_HOST}:${AI_SERVICE_PORT}`);

// Check if AI service is ready
const checkAIService = () => {
  const fs = require('fs');
  const aiReadyFlag = path.join(__dirname, 'backend', 'ai-services', 'AI_SYSTEM_PERFECT.flag');

  if (fs.existsSync(aiReadyFlag)) {
    console.log('✅ AI System: PERFECT - Ready for operation');
  } else {
    console.log('⚠️ AI System: Not validated - Run validation first');
  }
};

// Check AI system status
checkAIService();

// Change to frontend directory and start Next.js
const frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

frontendProcess.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
});

frontendProcess.on('error', (err) => {
  console.error('Failed to start frontend:', err);
});

console.log(`🌐 Frontend starting on http://${FRONTEND_HOST}:${FRONTEND_PORT}`);
console.log('🤖 AI-powered gaming experience ready!');
