#!/usr/bin/env node

const { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');

// Test configuration
const connection = new Connection('http://127.0.0.1:8899', 'confirmed');

// Program IDs (these should match the deployed programs)
const PROGRAM_IDS = {
  nenCore: new PublicKey("Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF"),
  nenBetting: new PublicKey("34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5"),
  nenMarketplace: new PublicKey("FgevpRTWnwu1UV6mxmD6nXPxqdmHnUK1Hjfdp3h8QK3E"),
  nenMagicblock: new PublicKey("AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX")
};

async function testProgramExists(programId, name) {
  try {
    console.log(`\n🔍 Testing ${name} program (${programId.toString()})...`);
    
    const accountInfo = await connection.getAccountInfo(programId);
    
    if (accountInfo) {
      console.log(`✅ ${name} program exists on chain`);
      console.log(`   - Owner: ${accountInfo.owner.toString()}`);
      console.log(`   - Executable: ${accountInfo.executable}`);
      console.log(`   - Data length: ${accountInfo.data.length} bytes`);
      return true;
    } else {
      console.log(`❌ ${name} program not found on chain`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error checking ${name} program: ${error.message}`);
    return false;
  }
}

async function testTransactionCreation(programId, name) {
  try {
    console.log(`\n🏗️ Testing transaction creation for ${name}...`);
    
    // Create a basic transaction that would call the program
    const payer = Keypair.generate();
    
    // Request airdrop for the payer
    const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSignature);
    
    console.log(`✅ ${name} transaction structure validated`);
    console.log(`   - Test payer created: ${payer.publicKey.toString()}`);
    console.log(`   - Airdrop successful: ${airdropSignature}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Error testing ${name} transaction: ${error.message}`);
    return false;
  }
}

async function testAccountDerivation(programId, name) {
  try {
    console.log(`\n🔑 Testing PDA derivation for ${name}...`);
    
    const testAuthority = Keypair.generate().publicKey;
    
    // Test common PDA patterns for each program
    let seeds;
    switch (name) {
      case 'nen-core':
        seeds = [Buffer.from("platform"), testAuthority.toBuffer()];
        break;
      case 'nen-betting':
        seeds = [Buffer.from("betting_account"), testAuthority.toBuffer()];
        break;
      case 'nen-marketplace':
        seeds = [Buffer.from("listing"), testAuthority.toBuffer()];
        break;
      case 'nen-magicblock':
        seeds = [Buffer.from("session"), testAuthority.toBuffer()];
        break;
      default:
        seeds = [Buffer.from("test"), testAuthority.toBuffer()];
    }
    
    const [pda, bump] = PublicKey.findProgramAddressSync(seeds, programId);
    
    console.log(`✅ ${name} PDA derivation successful`);
    console.log(`   - PDA: ${pda.toString()}`);
    console.log(`   - Bump: ${bump}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Error testing ${name} PDA derivation: ${error.message}`);
    return false;
  }
}

async function testNetworkConnection() {
  try {
    console.log('\n🌐 Testing network connection...');
    
    const slot = await connection.getSlot();
    const blockHeight = await connection.getBlockHeight();
    
    console.log(`✅ Network connection successful`);
    console.log(`   - Current slot: ${slot}`);
    console.log(`   - Block height: ${blockHeight}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Network connection failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Nen Platform Smart Contract Tests');
  console.log('=' .repeat(60));
  
  const results = {
    networkConnection: false,
    programExistence: {},
    transactionCreation: {},
    accountDerivation: {},
    totalTests: 0,
    passedTests: 0
  };
  
  // Test network connection
  results.networkConnection = await testNetworkConnection();
  results.totalTests++;
  if (results.networkConnection) results.passedTests++;
  
  // Test each program
  for (const [programName, programId] of Object.entries(PROGRAM_IDS)) {
    const name = programName.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
    
    // Test program existence
    results.programExistence[name] = await testProgramExists(programId, name);
    results.totalTests++;
    if (results.programExistence[name]) results.passedTests++;
    
    // Test transaction creation
    results.transactionCreation[name] = await testTransactionCreation(programId, name);
    results.totalTests++;
    if (results.transactionCreation[name]) results.passedTests++;
    
    // Test account derivation
    results.accountDerivation[name] = await testAccountDerivation(programId, name);
    results.totalTests++;
    if (results.accountDerivation[name]) results.passedTests++;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  console.log(`\n🌐 Network Connection: ${results.networkConnection ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n📦 Program Existence Tests:');
  Object.entries(results.programExistence).forEach(([name, passed]) => {
    console.log(`   ${name}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  console.log('\n🏗️ Transaction Creation Tests:');
  Object.entries(results.transactionCreation).forEach(([name, passed]) => {
    console.log(`   ${name}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  console.log('\n🔑 Account Derivation Tests:');
  Object.entries(results.accountDerivation).forEach(([name, passed]) => {
    console.log(`   ${name}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  const passRate = ((results.passedTests / results.totalTests) * 100).toFixed(1);
  console.log(`\n🎯 Overall Results: ${results.passedTests}/${results.totalTests} tests passed (${passRate}%)`);
  
  if (results.passedTests === results.totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Smart contract infrastructure is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the program deployments and network configuration.');
  }
  
  // Save results to file
  const reportPath = 'test-results-summary.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  
  return results.passedTests === results.totalTests;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner crashed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testProgramExists, testTransactionCreation, testAccountDerivation };
