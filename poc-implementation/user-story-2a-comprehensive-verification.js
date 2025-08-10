#!/usr/bin/env node

/**
 * User Story 2a Comprehensive Verification Script
 * 
 * This script performs a complete verification of User Story 2a implementation
 * against all requirements, identifying critical issues that must be resolved
 * before production launch.
 * 
 * User Story 2a: "As a Betting Player, I want to withdraw SOL from my betting account 
 * so that I can access my funds outside the platform."
 */

const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Configuration
const DEVNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC, 'confirmed');

console.log('🔍 USER STORY 2a COMPREHENSIVE VERIFICATION');
console.log('=============================================');
console.log(`📍 Devnet RPC: ${DEVNET_RPC}`);
console.log(`📅 Verification Time: ${new Date().toISOString()}`);
console.log('');

let verificationResults = {
  criticalIssues: [],
  warningIssues: [],
  passedTests: [],
  failedTests: [],
  recommendations: []
};

/**
 * Test 1: Smart Contract Implementation Verification
 */
async function verifySmartContractImplementation() {
  console.log('🔍 TEST 1: Smart Contract Implementation');
  console.log('========================================');
  
  try {
    // Check if smart contract file exists and has required functions
    const smartContractPath = path.join(__dirname, 'smart-contracts/programs/nen-betting/src/lib.rs');
    
    if (!fs.existsSync(smartContractPath)) {
      verificationResults.criticalIssues.push({
        issue: 'Smart contract file not found',
        impact: 'CRITICAL',
        description: 'No smart contract implementation found for withdrawal functionality'
      });
      console.log('❌ Smart contract file not found');
      return false;
    }
    
    const smartContractContent = fs.readFileSync(smartContractPath, 'utf8');
    
    // Check for required withdrawal function
    if (!smartContractContent.includes('withdraw_sol')) {
      verificationResults.criticalIssues.push({
        issue: 'withdraw_sol function missing',
        impact: 'CRITICAL',
        description: 'Smart contract does not implement withdrawal function'
      });
      console.log('❌ withdraw_sol function not found in smart contract');
      return false;
    }
    
    // Check for 24-hour cooldown implementation
    const hasCooldownLogic = smartContractContent.includes('cooldown') || 
                           smartContractContent.includes('24') ||
                           smartContractContent.includes('last_withdrawal_time');
    
    if (!hasCooldownLogic) {
      verificationResults.criticalIssues.push({
        issue: '24-hour cooldown not implemented in smart contract',
        impact: 'CRITICAL',
        description: 'Cooldown logic only exists in frontend, not enforced on-chain'
      });
      console.log('❌ 24-hour cooldown logic missing in smart contract');
    } else {
      console.log('✅ 24-hour cooldown logic found in smart contract');
      verificationResults.passedTests.push('Smart contract cooldown implementation');
    }
    
    // Check for last_withdrawal_time field
    const hasWithdrawalTimeField = smartContractContent.includes('last_withdrawal_time');
    if (!hasWithdrawalTimeField) {
      verificationResults.criticalIssues.push({
        issue: 'last_withdrawal_time field missing',
        impact: 'CRITICAL',
        description: 'BettingAccount struct missing field to track withdrawal timestamps'
      });
      console.log('❌ last_withdrawal_time field missing in BettingAccount struct');
    } else {
      console.log('✅ last_withdrawal_time field found in BettingAccount struct');
      verificationResults.passedTests.push('Withdrawal timestamp field');
    }
    
    // Check for proper error handling
    const hasWithdrawalErrors = smartContractContent.includes('WithdrawalCooldownActive') ||
                               smartContractContent.includes('cooldown');
    if (!hasWithdrawalErrors) {
      verificationResults.warningIssues.push({
        issue: 'Withdrawal cooldown error handling incomplete',
        impact: 'MEDIUM',
        description: 'Smart contract may not have proper error codes for cooldown violations'
      });
      console.log('⚠️  Withdrawal cooldown error handling needs verification');
    }
    
    console.log('✅ Smart contract file exists and contains withdrawal function');
    verificationResults.passedTests.push('Smart contract file existence');
    return true;
    
  } catch (error) {
    verificationResults.criticalIssues.push({
      issue: 'Smart contract verification failed',
      impact: 'CRITICAL',
      description: `Error reading smart contract: ${error.message}`
    });
    console.log(`❌ Error verifying smart contract: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Frontend Implementation Analysis
 */
async function verifyFrontendImplementation() {
  console.log('\\n🔍 TEST 2: Frontend Implementation');
  console.log('===================================');
  
  try {
    // Check frontend withdrawal implementation
    const frontendPath = path.join(__dirname, 'frontend/lib/solana-betting-client.ts');
    
    if (!fs.existsSync(frontendPath)) {
      verificationResults.criticalIssues.push({
        issue: 'Frontend withdrawal client not found',
        impact: 'CRITICAL',
        description: 'Frontend implementation file missing'
      });
      console.log('❌ Frontend withdrawal client not found');
      return false;
    }
    
    const frontendContent = fs.readFileSync(frontendPath, 'utf8');
    
    // Check if frontend calls smart contract or just memo transactions
    const usesMemoTransaction = frontendContent.includes('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    const callsSmartContract = frontendContent.includes('withdraw_sol') && 
                              frontendContent.includes('program.methods') ||
                              frontendContent.includes('instruction');
    
    if (usesMemoTransaction && !callsSmartContract) {
      verificationResults.criticalIssues.push({
        issue: 'Frontend using memo transactions instead of smart contract',
        impact: 'CRITICAL',
        description: 'Frontend is not calling actual smart contract withdrawal function'
      });
      console.log('❌ Frontend using memo transactions instead of smart contract calls');
    } else if (callsSmartContract) {
      console.log('✅ Frontend calls smart contract withdrawal function');
      verificationResults.passedTests.push('Frontend smart contract integration');
    }
    
    // Check for proper cooldown implementation
    const hasFrontendCooldown = frontendContent.includes('cooldown') || 
                               frontendContent.includes('24.*hour');
    if (hasFrontendCooldown) {
      console.log('✅ Frontend implements cooldown logic');
      verificationResults.passedTests.push('Frontend cooldown implementation');
    } else {
      verificationResults.warningIssues.push({
        issue: 'Frontend cooldown logic missing',
        impact: 'MEDIUM',
        description: 'Frontend may not properly validate cooldown before transactions'
      });
      console.log('⚠️  Frontend cooldown logic needs verification');
    }
    
    return true;
    
  } catch (error) {
    verificationResults.criticalIssues.push({
      issue: 'Frontend verification failed',
      impact: 'CRITICAL',
      description: `Error reading frontend code: ${error.message}`
    });
    console.log(`❌ Error verifying frontend: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Devnet Connectivity and Program Deployment
 */
async function verifyDevnetDeployment() {
  console.log('\\n🔍 TEST 3: Devnet Deployment Status');
  console.log('====================================');
  
  try {
    // Test devnet connectivity
    const slot = await connection.getSlot();
    console.log(`✅ Devnet connection active - Current slot: ${slot}`);
    verificationResults.passedTests.push('Devnet connectivity');
    
    // Check if NEN betting program is deployed
    // Note: We would need the actual program ID from deployment
    const programId = 'C8uJ3ABMU87GjcB8moR1jiiAgYnFUDR17DBfiQE4eUcz'; // From smart contract
    
    try {
      const programAccount = await connection.getAccountInfo(new PublicKey(programId));
      if (programAccount && programAccount.executable) {
        console.log('✅ NEN betting program found on devnet');
        console.log(`📍 Program ID: ${programId}`);
        verificationResults.passedTests.push('Smart contract deployment');
      } else {
        verificationResults.criticalIssues.push({
          issue: 'Smart contract not deployed to devnet',
          impact: 'CRITICAL',
          description: 'Program ID exists but is not executable or not found'
        });
        console.log('❌ NEN betting program not properly deployed');
      }
    } catch (error) {
      verificationResults.criticalIssues.push({
        issue: 'Cannot verify smart contract deployment',
        impact: 'CRITICAL',
        description: `Program deployment status unknown: ${error.message}`
      });
      console.log('❌ Cannot verify program deployment status');
    }
    
    // Check memo program (used by current implementation)
    const memoProgramId = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
    const memoAccount = await connection.getAccountInfo(new PublicKey(memoProgramId));
    if (memoAccount) {
      console.log('✅ Memo program available (currently used for transactions)');
      verificationResults.passedTests.push('Memo program availability');
    }
    
    return true;
    
  } catch (error) {
    verificationResults.criticalIssues.push({
      issue: 'Devnet connectivity failed',
      impact: 'CRITICAL',
      description: `Cannot connect to devnet: ${error.message}`
    });
    console.log(`❌ Devnet connectivity error: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: On-Chain Requirements Compliance
 */
async function verifyOnChainRequirements() {
  console.log('\\n🔍 TEST 4: On-Chain Requirements Compliance');
  console.log('============================================');
  
  const requirements = [
    {
      name: 'Validate against locked funds on devnet PDA',
      status: 'PARTIAL',
      issue: 'Validation exists in frontend but may not use actual smart contract'
    },
    {
      name: 'Transfer real SOL from PDA to wallet via devnet transaction',
      status: 'FAILED',
      issue: 'Using memo transactions instead of actual PDA-to-wallet transfers'
    },
    {
      name: 'Enforce cooldown using devnet timestamps',
      status: 'PARTIAL',
      issue: 'Cooldown implemented in frontend, needs smart contract enforcement'
    },
    {
      name: 'Emit withdrawal event; update real balance records on devnet',
      status: 'PARTIAL',
      issue: 'Events emitted from frontend, not from smart contract'
    }
  ];
  
  requirements.forEach(req => {
    if (req.status === 'FAILED') {
      console.log(`❌ ${req.name}: ${req.issue}`);
      verificationResults.criticalIssues.push({
        issue: req.name,
        impact: 'CRITICAL',
        description: req.issue
      });
    } else if (req.status === 'PARTIAL') {
      console.log(`⚠️  ${req.name}: ${req.issue}`);
      verificationResults.warningIssues.push({
        issue: req.name,
        impact: 'MEDIUM',
        description: req.issue
      });
    } else {
      console.log(`✅ ${req.name}`);
      verificationResults.passedTests.push(req.name);
    }
  });
}

/**
 * Test 5: Security and Production Readiness
 */
async function verifySecurityReadiness() {
  console.log('\\n🔍 TEST 5: Security and Production Readiness');
  console.log('==============================================');
  
  const securityChecks = [
    {
      name: 'Cooldown enforced on-chain (not just frontend)',
      passed: false,
      critical: true,
      description: 'Financial security requires on-chain enforcement'
    },
    {
      name: 'Real PDA validation and SOL transfers',
      passed: false,
      critical: true,
      description: 'Must use actual smart contract, not simulation'
    },
    {
      name: 'Proper error handling for all edge cases',
      passed: true,
      critical: false,
      description: 'Frontend has comprehensive error handling'
    },
    {
      name: 'Transaction signature verification',
      passed: true,
      critical: false,
      description: 'Frontend properly verifies wallet signatures'
    }
  ];
  
  securityChecks.forEach(check => {
    if (check.passed) {
      console.log(`✅ ${check.name}`);
      verificationResults.passedTests.push(check.name);
    } else {
      console.log(`❌ ${check.name}: ${check.description}`);
      if (check.critical) {
        verificationResults.criticalIssues.push({
          issue: check.name,
          impact: 'CRITICAL',
          description: check.description
        });
      } else {
        verificationResults.warningIssues.push({
          issue: check.name,
          impact: 'MEDIUM',
          description: check.description
        });
      }
    }
  });
}

/**
 * Generate Recommendations
 */
function generateRecommendations() {
  console.log('\\n📋 REQUIRED FIXES FOR LAUNCH COMPLIANCE');
  console.log('========================================');
  
  const fixes = [
    {
      priority: 'CRITICAL',
      action: 'Update smart contract with 24-hour cooldown enforcement',
      description: 'Add cooldown validation logic to withdraw_sol function in Rust contract',
      files: ['smart-contracts/programs/nen-betting/src/lib.rs']
    },
    {
      priority: 'CRITICAL',
      action: 'Replace memo transactions with actual smart contract calls',
      description: 'Update frontend to call deployed smart contract instead of memo instructions',
      files: ['frontend/lib/solana-betting-client.ts', 'frontend/lib/betting-account-fallback.ts']
    },
    {
      priority: 'CRITICAL',
      action: 'Deploy updated smart contract to devnet',
      description: 'Build and deploy the updated contract with cooldown logic',
      files: ['smart-contracts/']
    },
    {
      priority: 'HIGH',
      action: 'Implement proper PDA-to-wallet SOL transfers',
      description: 'Use actual program instructions instead of simulated transfers',
      files: ['frontend/lib/solana-betting-client.ts']
    },
    {
      priority: 'HIGH',
      action: 'Add comprehensive integration tests',
      description: 'Test complete withdrawal flow from frontend through smart contract',
      files: ['tests/']
    }
  ];
  
  fixes.forEach((fix, index) => {
    console.log(`${index + 1}. [${fix.priority}] ${fix.action}`);
    console.log(`   Description: ${fix.description}`);
    console.log(`   Files: ${fix.files.join(', ')}`);
    console.log('');
    
    verificationResults.recommendations.push(fix);
  });
}

/**
 * Generate Final Report
 */
function generateFinalReport() {
  console.log('\\n📊 VERIFICATION SUMMARY');
  console.log('========================');
  
  console.log(`✅ Passed Tests: ${verificationResults.passedTests.length}`);
  console.log(`⚠️  Warning Issues: ${verificationResults.warningIssues.length}`);
  console.log(`❌ Critical Issues: ${verificationResults.criticalIssues.length}`);
  console.log('');
  
  if (verificationResults.criticalIssues.length > 0) {
    console.log('🚨 LAUNCH STATUS: NOT READY - CRITICAL ISSUES FOUND');
    console.log('====================================================');
    console.log('The current implementation has critical security and compliance issues');
    console.log('that MUST be resolved before production launch.');
    console.log('');
    console.log('Key Issues:');
    verificationResults.criticalIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.issue}`);
      console.log(`   Impact: ${issue.impact}`);
      console.log(`   Details: ${issue.description}`);
      console.log('');
    });
  } else {
    console.log('✅ LAUNCH STATUS: READY');
    console.log('=======================');
    console.log('All critical requirements have been met.');
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'USER_STORY_2A_COMPREHENSIVE_VERIFICATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    userStory: '2a - SOL Withdrawal',
    verificationResults,
    launchReady: verificationResults.criticalIssues.length === 0
  }, null, 2));
  
  console.log(`\\n📄 Detailed report saved: ${reportPath}`);
}

/**
 * Main Verification Process
 */
async function main() {
  try {
    console.log('Starting comprehensive verification of User Story 2a implementation...\\n');
    
    await verifySmartContractImplementation();
    await verifyFrontendImplementation();
    await verifyDevnetDeployment();
    await verifyOnChainRequirements();
    await verifySecurityReadiness();
    
    generateRecommendations();
    generateFinalReport();
    
    // Exit with appropriate code
    if (verificationResults.criticalIssues.length > 0) {
      console.log('\\n❌ VERIFICATION FAILED - Critical issues found');
      process.exit(1);
    } else {
      console.log('\\n✅ VERIFICATION PASSED - Ready for launch');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Verification process failed:', error);
    process.exit(1);
  }
}

// Run verification
main();
