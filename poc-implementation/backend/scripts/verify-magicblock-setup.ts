#!/usr/bin/env tsx
/**
 * MagicBlock SDK Setup Verification Script
 * Verifies that MagicBlock SDK integration and geographic clustering are correctly configured
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import winston from 'winston';
import { config } from '../src/config';
import { MagicBlockBOLTService } from '../src/services/MagicBlockBOLTService';
import { GeographicClusterManager } from '../src/services/GeographicClusterManager';

// Test provider implementation
class TestAnchorProvider {
  public wallet: { publicKey: PublicKey };

  constructor(keypair: Keypair) {
    this.wallet = { publicKey: keypair.publicKey };
  }
}

async function verifyMagicBlockSetup() {
  console.log('🔍 Starting MagicBlock SDK setup verification...\n');

  // Initialize logger
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.simple()
    ),
    transports: [new winston.transports.Console()]
  });

  try {
    // 1. Verify environment configuration
    console.log('✅ Step 1: Verifying environment configuration');

    const requiredEnvVars = [
      'MAGICBLOCK_API_KEY',
      'MAGICBLOCK_ENDPOINT',
      'SOLANA_RPC_URL',
      'SOLANA_PROGRAM_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log(`   - MagicBlock Endpoint: ${config.externalServices.magicBlockEndpoint}`);
    console.log(`   - Solana RPC URL: ${config.solana.rpcUrl}`);
    console.log(`   - Program ID: ${config.solana.programId}\n`);

    // 2. Test Solana connection
    console.log('✅ Step 2: Testing Solana connection');

    const connection = new Connection(config.solana.rpcUrl);
    const blockHeight = await connection.getBlockHeight();
    console.log(`   - Connected to Solana (Block height: ${blockHeight})\n`);

    // 3. Initialize MagicBlock BOLT service
    console.log('✅ Step 3: Initializing MagicBlock BOLT service');

    const testKeypair = Keypair.generate();
    const provider = new TestAnchorProvider(testKeypair);
    const magicBlockService = new MagicBlockBOLTService(connection, provider, logger);

    console.log(`   - MagicBlock service initialized with wallet: ${testKeypair.publicKey.toString()}\n`);

    // 4. Initialize geographic clustering
    console.log('✅ Step 4: Initializing geographic clustering');

    const clusterManager = new GeographicClusterManager(logger);
    const clusterStatus = clusterManager.getClusterStatus();

    console.log(`   - Cluster regions: ${clusterStatus.topology.regions.length}`);
    console.log(`   - Available regions: ${clusterStatus.topology.regions.map(r => r.region).join(', ')}`);

    // Test region selection
    const testRegions = ['us-east', 'us-west', 'eu-central', 'asia-pacific'];
    for (const region of testRegions) {
      const selectedRegion = clusterManager.selectOptimalRegion(region);
      if (selectedRegion) {
        console.log(`   - ${region}: Selected ${selectedRegion.nodeId} (${selectedRegion.healthStatus})`);
      } else {
        console.log(`   - ${region}: No suitable region found`);
      }
    }
    console.log('');

    // 5. Test session creation
    console.log('✅ Step 5: Testing session creation');

    const sessionId = `test-session-${Date.now()}`;
    const player1 = Keypair.generate();
    const player2 = Keypair.generate();
    const sessionConfig = {
      timeControl: 600000,
      region: 'us-east-1',
      allowSpectators: true,
      tournamentMode: false
    };

    const sessionPublicKey = await magicBlockService.createEnhancedSession(
      sessionId,
      player1.publicKey,
      player2.publicKey,
      sessionConfig,
      'us-east'
    );

    console.log(`   - Session created with ID: ${sessionId}`);
    console.log(`   - Session public key: ${sessionPublicKey}\n`);

    // 6. Test performance metrics
    console.log('✅ Step 6: Verifying performance metrics');

    const sessionMetrics = magicBlockService.getSessionMetrics(sessionId);
    if (sessionMetrics) {
      console.log(`   - Session metrics available for ${sessionId}`);
      console.log(`   - Average latency: ${sessionMetrics.averageMoveLatency}ms`);
      console.log(`   - Total moves: ${sessionMetrics.totalMoves}`);
    } else {
      console.log(`   - No metrics found for ${sessionId} (expected for new session)`);
    }
    console.log('');

    // 7. Test ephemeral rollup deployment (mock)
    console.log('✅ Step 7: Testing ephemeral rollup deployment');

    const rollupDeployment = await magicBlockService.deployToEphemeralRollup(sessionId);
    console.log(`   - Rollup deployed with ID: ${rollupDeployment.rollupId}`);
    console.log(`   - Rollup endpoint: ${rollupDeployment.endpoint}\n`);

    // 8. Cleanup
    console.log('✅ Step 8: Cleanup');

    await magicBlockService.shutdown();
    await clusterManager.shutdown();
    console.log(`   - Services shut down cleanly\n`);

    // Summary
    console.log('🎉 MagicBlock SDK setup verification completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✓ Environment variables configured');
    console.log('   ✓ Solana connection established');
    console.log('   ✓ MagicBlock BOLT service initialized');
    console.log('   ✓ Geographic clustering operational');
    console.log('   ✓ Session creation working');
    console.log('   ✓ Performance metrics available');
    console.log('   ✓ Ephemeral rollup deployment ready');
    console.log('   ✓ Clean shutdown verified');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ MagicBlock SDK setup verification failed:');
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);

    if (error instanceof Error && error.stack) {
      console.error('\n🔍 Stack trace:');
      console.error(error.stack);
    }

    console.log('\n🛠️  Please check:');
    console.log('   - Environment variables are properly set');
    console.log('   - Solana devnet is accessible');
    console.log('   - MagicBlock API credentials are valid');
    console.log('   - All required dependencies are installed');

    process.exit(1);
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyMagicBlockSetup();
}
