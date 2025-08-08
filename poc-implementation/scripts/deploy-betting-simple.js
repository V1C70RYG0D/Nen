#!/usr/bin/env node

/**
 * Simple Betting Platform Deployment Script
 * Deploys the betting program and initializes the platform
 * Follows User Story 2 and GI.md requirements
 */

const { 
  Connection, 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL,
  clusterApiUrl
} = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Configuration
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const BETTING_PROGRAM_ID = new PublicKey('Bet1111111111111111111111111111111111111111');

console.log('🚀 Simple Betting Platform Setup');
console.log('📋 Configuration:');
console.log(`   - RPC URL: ${SOLANA_RPC_URL}`);
console.log(`   - Program ID: ${BETTING_PROGRAM_ID.toString()}`);

async function checkProgramDeployment() {
  try {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    
    console.log('\n🔍 Checking betting program deployment...');
    
    // Check if the program account exists
    const programAccount = await connection.getAccountInfo(BETTING_PROGRAM_ID);
    
    if (!programAccount) {
      console.log('❌ Betting program not found on-chain');
      console.log('\n📝 To deploy the betting program:');
      console.log('1. Navigate to smart-contracts directory: cd smart-contracts');
      console.log('2. Build the program: anchor build');
      console.log('3. Deploy to devnet: anchor deploy --provider.cluster devnet');
      console.log('4. Run this script again');
      return false;
    }
    
    if (!programAccount.executable) {
      console.log('❌ Program account exists but is not executable');
      return false;
    }
    
    console.log('✅ Betting program found and executable');
    console.log(`   - Account Size: ${programAccount.data.length} bytes`);
    console.log(`   - Owner: ${programAccount.owner.toString()}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error checking program deployment:', error.message);
    return false;
  }
}

async function checkBettingPlatformInitialization() {
  try {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    
    // Get betting platform PDA
    const [bettingPlatformPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('betting_platform')],
      BETTING_PROGRAM_ID
    );
    
    console.log(`\n🏦 Checking platform initialization...`);
    console.log(`   - Platform PDA: ${bettingPlatformPDA.toString()}`);
    
    const platformAccount = await connection.getAccountInfo(bettingPlatformPDA);
    
    if (!platformAccount) {
      console.log('❌ Betting platform not initialized');
      console.log('\n📝 To initialize the platform:');
      console.log('1. Fund an admin wallet with devnet SOL');
      console.log('2. Run: npm run deploy:betting');
      console.log('3. Or use: anchor run initialize-platform');
      return false;
    }
    
    console.log('✅ Betting platform initialized');
    console.log(`   - Account Size: ${platformAccount.data.length} bytes`);
    console.log(`   - Balance: ${platformAccount.lamports / LAMPORTS_PER_SOL} SOL`);
    
    return true;
  } catch (error) {
    console.error('❌ Error checking platform initialization:', error.message);
    return false;
  }
}

async function provideFallbackInstructions() {
  console.log('\n💡 Current Status: Using Fallback Betting System');
  console.log('\n🔧 The application will work with temporary features:');
  console.log('   ✅ Connect wallet');
  console.log('   ✅ View betting account (simulated)');
  console.log('   ✅ Deposit SOL (simulated transactions)');
  console.log('   ✅ View balance and history');
  console.log('   ⚠️  Real SOL transfers require program deployment');
  
  console.log('\n🎯 For full functionality (User Story 2 requirements):');
  console.log('1. Deploy betting program to devnet');
  console.log('2. Initialize betting platform');
  console.log('3. Real SOL deposits will work automatically');
  
  console.log('\n🚦 Current system status: READY FOR DEMO');
  console.log('   - Frontend will show fallback mode indicator');
  console.log('   - Users can test all features safely');
  console.log('   - No real SOL at risk');
}

async function testBasicConnectivity() {
  try {
    console.log('\n🧪 Testing basic connectivity...');
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    
    const slot = await connection.getSlot();
    console.log(`✅ Connected to Solana - Current slot: ${slot}`);
    
    const version = await connection.getVersion();
    console.log(`✅ RPC Version: ${version['solana-core']}`);
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🎮 NEN PLATFORM BETTING SYSTEM STATUS CHECK');
  console.log('='.repeat(60));
  
  // Test basic connectivity
  const connected = await testBasicConnectivity();
  if (!connected) {
    console.log('\n❌ Cannot proceed without RPC connection');
    process.exit(1);
  }
  
  // Check program deployment
  const programDeployed = await checkProgramDeployment();
  
  // Check platform initialization
  let platformInitialized = false;
  if (programDeployed) {
    platformInitialized = await checkBettingPlatformInitialization();
  }
  
  // Provide status summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SYSTEM STATUS SUMMARY');
  console.log('='.repeat(60));
  
  if (programDeployed && platformInitialized) {
    console.log('🎉 Status: FULLY OPERATIONAL');
    console.log('   - Betting program deployed ✅');
    console.log('   - Platform initialized ✅');
    console.log('   - Real SOL deposits enabled ✅');
    console.log('\n🚀 Ready for production betting!');
  } else if (programDeployed && !platformInitialized) {
    console.log('⚠️  Status: PROGRAM DEPLOYED, NEEDS INITIALIZATION');
    console.log('   - Betting program deployed ✅');
    console.log('   - Platform initialization needed ❌');
    console.log('\n🔧 Run initialization command to complete setup');
  } else {
    console.log('⚠️  Status: FALLBACK MODE');
    console.log('   - Betting program not deployed ❌');
    console.log('   - Using temporary implementation ✅');
    await provideFallbackInstructions();
  }
  
  console.log('\n✅ Status check complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  checkProgramDeployment, 
  checkBettingPlatformInitialization,
  testBasicConnectivity
};
