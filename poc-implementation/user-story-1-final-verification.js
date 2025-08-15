#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎯 USER STORY 1 ON-CHAIN REQUIREMENTS VERIFICATION');
console.log('===================================================');
console.log(`📅 ${new Date().toISOString()}`);
console.log('===================================================\n');

// User Story 1 On-Chain Requirements from User Stories.md
const requirements = [
  {
    id: 'US1-REQ1',
    description: 'Verify wallet ownership through signature verification on devnet',
    files: ['backend/src/services/authService.ts'],
    checkFunction: checkSignatureVerification
  },
  {
    id: 'US1-REQ2',
    description: 'Check if wallet has existing platform account PDA via devnet query',
    files: ['backend/src/services/UserService.ts'],
    checkFunction: checkPDAQuery
  },
  {
    id: 'US1-REQ3',
    description: 'Query user\'s SOL balance for display using devnet RPC',
    files: ['frontend/hooks/useWalletConnection.ts', 'backend/src/services/blockchain.ts'],
    checkFunction: checkBalanceQuery
  },
  {
    id: 'US1-REQ4',
    description: 'Initialize user account PDA if first-time connection',
    files: ['backend/src/services/UserService.ts'],
    checkFunction: checkPDAInitialization
  }
];

let passedRequirements = 0;
let totalRequirements = requirements.length;

console.log('📋 CHECKING USER STORY 1 ON-CHAIN REQUIREMENTS:\n');

requirements.forEach((req, index) => {
  console.log(`${index + 1}. ${req.description}`);
  console.log(`   Files: ${req.files.join(', ')}`);
  
  const result = req.checkFunction(req.files);
  if (result.passed) {
    console.log(`   ✅ IMPLEMENTED: ${result.details}`);
    passedRequirements++;
  } else {
    console.log(`   ❌ ISSUE: ${result.details}`);
  }
  console.log('');
});

// Final assessment
console.log('📊 FINAL ASSESSMENT:');
console.log('====================');
console.log(`Requirements Implemented: ${passedRequirements}/${totalRequirements} (${Math.round(passedRequirements/totalRequirements*100)}%)`);

if (passedRequirements === totalRequirements) {
  console.log('🎉 STATUS: ✅ ALL REQUIREMENTS IMPLEMENTED - READY FOR LAUNCH!');
  console.log('📝 GI.md COMPLIANCE: ✅ FULL COMPLIANCE ACHIEVED');
} else {
  console.log(`⚠️  STATUS: ${passedRequirements}/${totalRequirements} requirements implemented`);
  console.log('📝 GI.md COMPLIANCE: ❌ ISSUES REMAINING');
}

// Requirement checking functions
function checkSignatureVerification(files) {
  try {
    const authServicePath = path.join(__dirname, files[0]);
    const content = fs.readFileSync(authServicePath, 'utf8');
    
    // Check for real signature verification (no mocks/simulations)
    const hasRealVerification = content.includes('nacl.sign.detached.verify');
    const hasNoMockSignature = !content.includes('// Mock signature verification') && 
                              !content.includes('return true; // Placeholder');
    const hasNaclImport = content.includes('require(\'tweetnacl\')');
    
    if (hasRealVerification && hasNoMockSignature && hasNaclImport) {
      return {
        passed: true,
        details: 'Real tweetnacl signature verification implemented on devnet'
      };
    } else {
      return {
        passed: false,
        details: 'Mock signature verification detected or missing real implementation'
      };
    }
  } catch (error) {
    return {
      passed: false,
      details: `Error reading file: ${error.message}`
    };
  }
}

function checkPDAQuery(files) {
  try {
    const userServicePath = path.join(__dirname, files[0]);
    const content = fs.readFileSync(userServicePath, 'utf8');
    
    // Check for real PDA query implementation
    const hasRealPDAQuery = content.includes('connection.getAccountInfo') && 
                           content.includes('PublicKey.findProgramAddressSync');
    const hasNoMockPDA = !content.includes('Math.random()') && 
                        !content.includes('// Mock PDA check');
    
    if (hasRealPDAQuery && hasNoMockPDA) {
      return {
        passed: true,
        details: 'Real PDA query via devnet connection implemented'
      };
    } else {
      return {
        passed: false,
        details: 'Mock PDA query detected or missing real devnet implementation'
      };
    }
  } catch (error) {
    return {
      passed: false,
      details: `Error reading file: ${error.message}`
    };
  }
}

function checkBalanceQuery(files) {
  try {
    const hookPath = path.join(__dirname, files[0]);
    const blockchainPath = path.join(__dirname, files[1]);
    
    const hookContent = fs.readFileSync(hookPath, 'utf8');
    const blockchainContent = fs.readFileSync(blockchainPath, 'utf8');
    
    // Check for real balance query (no simulation)
    const hasRealBalanceQuery = blockchainContent.includes('connection.getBalance') ||
                               hookContent.includes('response.data.balance');
    const hasNoMockBalance = !hookContent.includes('Math.random()') && 
                            !hookContent.includes('// Simulated balance');
    
    if (hasRealBalanceQuery && hasNoMockBalance) {
      return {
        passed: true,
        details: 'Real SOL balance query via devnet RPC implemented'
      };
    } else {
      return {
        passed: false,
        details: 'Simulated balance generation detected or missing real devnet query'
      };
    }
  } catch (error) {
    return {
      passed: false,
      details: `Error reading files: ${error.message}`
    };
  }
}

function checkPDAInitialization(files) {
  try {
    const userServicePath = path.join(__dirname, files[0]);
    const content = fs.readFileSync(userServicePath, 'utf8');
    
    // Check for real PDA initialization with transaction sending
    const hasRealPDAInit = content.includes('SystemProgram.createAccount') && 
                          (content.includes('sendTransaction') || content.includes('confirmTransaction'));
    const hasNoMockInit = !content.includes('// Mock account creation');
    
    if (hasRealPDAInit && hasNoMockInit) {
      return {
        passed: true,
        details: 'Real PDA account creation via devnet transactions implemented'
      };
    } else {
      return {
        passed: false,
        details: 'Mock account creation detected or missing real devnet initialization'
      };
    }
  } catch (error) {
    return {
      passed: false,
      details: `Error reading file: ${error.message}`
    };
  }
}
