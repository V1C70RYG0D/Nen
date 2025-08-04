import { chromium, FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

/**
 * Global Setup for Integration Tests
 * Initializes test environment, mock services, and test data
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting integration test environment setup...');

  // Setup test environment variables
  setupTestEnvironment();

  // Initialize Solana test environment
  await initializeSolanaTestEnvironment();

  // Setup mock wallet for testing
  await setupMockWallet();

  // Verify services are running
  await verifyServices();

  // Setup test data
  await setupTestData();

  console.log('✅ Integration test environment setup complete!');
}

function setupTestEnvironment() {
  console.log('📝 Setting up test environment variables...');

  process.env.NODE_ENV = 'test';
  process.env.SOLANA_NETWORK = 'localnet';

  process.env.RPC_URL = process.env.TEST_RPC_URL || process.env.DEFAULT_RPC_URL || process.env.TEST_SOLANA_RPC_URL;
  process.env.WS_URL = process.env.TEST_WS_URL || process.env.DEFAULT_WS_URL || process.env.TEST_WS_URL;
  process.env.API_URL = process.env.TEST_API_URL || process.env.DEFAULT_API_URL || process.env.TEST_API_BASE_URL;
  process.env.FRONTEND_URL = process.env.TEST_FRONTEND_URL || process.env.DEFAULT_FRONTEND_URL || process.env.TEST_FRONTEND_URL;

  // Test-specific configurations
  process.env.TEST_TIMEOUT = process.env.TEST_TIMEOUT || '60000';
  process.env.WALLET_TIMEOUT = process.env.WALLET_TIMEOUT || '30000';
  process.env.WS_TIMEOUT = process.env.WS_TIMEOUT || '15000';
}

async function initializeSolanaTestEnvironment() {
  console.log('🔗 Initializing Solana test environment...');

  try {
    // Create test connection
    const connection = new Connection(process.env.RPC_URL!, 'confirmed');

    // Test connection
    const version = await connection.getVersion();
    console.log(`Connected to Solana cluster version: ${version['solana-core']}`);

    // Save connection details for tests
    const testConfig = {
      rpcUrl: process.env.RPC_URL,
      connection: 'established',
      version: version['solana-core']
    };

    fs.writeFileSync(
      path.join(__dirname, '../test-data/solana-config.json'),
      JSON.stringify(testConfig, null, 2)
    );

  } catch (error) {
    console.warn('⚠️ Solana localnet not available, using devnet for testing');
    process.env.RPC_URL = 'https://api.devnet.solana.com';
    process.env.SOLANA_NETWORK = 'devnet';
  }
}

async function setupMockWallet() {
  console.log('👛 Setting up mock wallet for testing...');

  // Create test keypairs
  const testWallet = Keypair.generate();
  const secondaryWallet = Keypair.generate();

  // Create test wallet data
  const walletData = {
    primary: {
      publicKey: testWallet.publicKey.toString(),
      secretKey: Array.from(testWallet.secretKey)
    },
    secondary: {
      publicKey: secondaryWallet.publicKey.toString(),
      secretKey: Array.from(secondaryWallet.secretKey)
    }
  };

  // Ensure test-data directory exists
  const testDataDir = path.join(__dirname, '../test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Save wallet data for tests
  fs.writeFileSync(
    path.join(testDataDir, 'test-wallets.json'),
    JSON.stringify(walletData, null, 2)
  );

  console.log(`Test wallet created: ${testWallet.publicKey.toString()}`);
}

async function verifyServices() {
  console.log('🔍 Verifying services are running...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Test frontend
    await page.goto(process.env.FRONTEND_URL!);
    await page.waitForLoadState('networkidle');
    console.log('✅ Frontend service is running');

    // Test backend API
    const apiResponse = await page.request.get(`${process.env.API_URL}/health`);
    if (apiResponse.ok()) {
      console.log('✅ Backend API service is running');
    } else {
      console.warn('⚠️ Backend API service may not be fully ready');
    }

    // Test WebSocket connection
    await page.evaluate((wsUrl) => {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          ws.close();
          resolve('connected');
        };
        ws.onerror = reject;
        setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
      });
    }, process.env.WS_URL!);
    console.log('✅ WebSocket service is running');

  } catch (error) {
    console.error('❌ Service verification failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestData() {
  console.log('📊 Setting up test data...');

  const testDataDir = path.join(__dirname, '../test-data');

  // Game test data
  const gameTestData = {
    testGame: {
      id: 'test-game-001',
      players: ['player1', 'player2'],
      status: 'waiting',
      betAmount: 0.1,
      timeLimit: 600000
    },
    testMoves: [
      { piece: 'pawn', from: 'a2', to: 'a3', player: 'player1' },
      { piece: 'pawn', from: 'b7', to: 'b6', player: 'player2' }
    ]
  };

  fs.writeFileSync(
    path.join(testDataDir, 'game-test-data.json'),
    JSON.stringify(gameTestData, null, 2)
  );

  // API test endpoints
  const apiEndpoints = {
    health: '/health',
    auth: '/api/auth',
    wallet: '/api/wallet',
    game: '/api/game',
    betting: '/api/betting',
    websocket: '/ws'
  };

  fs.writeFileSync(
    path.join(testDataDir, 'api-endpoints.json'),
    JSON.stringify(apiEndpoints, null, 2)
  );

  console.log('✅ Test data setup complete');
}

export default globalSetup;
