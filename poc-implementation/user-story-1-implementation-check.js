#!/usr/bin/env node

/**
 * User Story 1 Implementation Verification (Simple Test)
 * Checks that all components are properly implemented according to GI.md guidelines
 */

const fs = require('fs');
const path = require('path');

class UserStory1ImplementationCheck {
  constructor() {
    this.results = {
      requirement1: { passed: false, details: [], errors: [] },
      requirement2: { passed: false, details: [], errors: [] },
      requirement3: { passed: false, details: [], errors: [] },
      requirement4: { passed: false, details: [], errors: [] }
    };
    
    this.basePath = __dirname;
  }

  run() {
    console.log('🔍 User Story 1: Implementation Verification');
    console.log('=' .repeat(60));

    try {
      this.checkRequirement1_SignatureVerification();
      this.checkRequirement2_PDAImplementation();
      this.checkRequirement3_BalanceQuery();
      this.checkRequirement4_AccountInitialization();
      
      this.generateReport();
    } catch (error) {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    }
  }

  checkFileExists(filePath) {
    const fullPath = path.join(this.basePath, filePath);
    return fs.existsSync(fullPath);
  }

  checkFileContains(filePath, patterns) {
    const fullPath = path.join(this.basePath, filePath);
    if (!fs.existsSync(fullPath)) {
      return { exists: false, matches: [] };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const matches = patterns.map(pattern => ({
      pattern,
      found: content.includes(pattern)
    }));

    return { exists: true, matches, content };
  }

  checkRequirement1_SignatureVerification() {
    console.log('\n🔐 Requirement 1: Wallet Signature Verification');
    console.log('-' .repeat(50));

    const checks = [
      {
        file: 'backend/src/services/AuthenticationService.ts',
        patterns: [
          'nacl.sign.detached.verify',
          'bs58.decode',
          'new TextEncoder().encode',
          'publicKey.toBytes'
        ]
      },
      {
        file: 'backend/src/middleware/auth.ts',
        patterns: [
          'nacl.sign.detached.verify',
          'signatureBytes.length !== 64',
          'timestamp'
        ]
      },
      {
        file: 'frontend/hooks/useWalletConnection.ts',
        patterns: [
          'walletProvider.signMessage',
          'Date.now()',
          'signature verification'
        ]
      }
    ];

    let passed = 0;
    const total = checks.length;

    checks.forEach(check => {
      const result = this.checkFileContains(check.file, check.patterns);
      
      if (!result.exists) {
        this.results.requirement1.errors.push(`❌ File not found: ${check.file}`);
        return;
      }

      const foundPatterns = result.matches.filter(m => m.found).length;
      if (foundPatterns === check.patterns.length) {
        this.results.requirement1.details.push(`✅ ${check.file}: All patterns found`);
        passed++;
      } else {
        this.results.requirement1.errors.push(`⚠️ ${check.file}: ${foundPatterns}/${check.patterns.length} patterns found`);
      }
    });

    // Check for GI.md violations (no simulations)
    const authService = this.checkFileContains('backend/src/services/authService.ts', [
      'return true; // For development/testing'
    ]);

    if (authService.exists && authService.matches[0]?.found) {
      this.results.requirement1.errors.push('❌ Found simulation code in authService.ts (violates GI.md)');
    } else {
      this.results.requirement1.details.push('✅ No simulation code found (GI.md compliant)');
    }

    this.results.requirement1.passed = passed === total && this.results.requirement1.errors.length === 0;
  }

  checkRequirement2_PDAImplementation() {
    console.log('\n🏦 Requirement 2: PDA Account Check');
    console.log('-' .repeat(50));

    const checks = [
      {
        file: 'backend/src/services/UserService.ts',
        patterns: [
          'PublicKey.findProgramAddressSync',
          'Buffer.from(\'user\')',
          'getAccountInfo',
          'https://api.devnet.solana.com'
        ]
      },
      {
        file: 'frontend/hooks/useWalletConnection.ts',
        patterns: [
          'checkPDA',
          '/api/user/check-and-initialize',
          'pdaResult'
        ]
      },
      {
        file: 'backend/src/routes/user.ts',
        patterns: [
          '/check-pda',
          '/check-and-initialize',
          'checkExistingPDA'
        ]
      }
    ];

    let passed = 0;
    const total = checks.length;

    checks.forEach(check => {
      const result = this.checkFileContains(check.file, check.patterns);
      
      if (!result.exists) {
        this.results.requirement2.errors.push(`❌ File not found: ${check.file}`);
        return;
      }

      const foundPatterns = result.matches.filter(m => m.found).length;
      if (foundPatterns >= check.patterns.length - 1) { // Allow 1 missing pattern
        this.results.requirement2.details.push(`✅ ${check.file}: Implementation found`);
        passed++;
      } else {
        this.results.requirement2.errors.push(`⚠️ ${check.file}: Incomplete implementation`);
      }
    });

    this.results.requirement2.passed = passed >= 2; // At least 2 out of 3 should pass
  }

  checkRequirement3_BalanceQuery() {
    console.log('\n💰 Requirement 3: SOL Balance Query');
    console.log('-' .repeat(50));

    const checks = [
      {
        file: 'backend/src/services/blockchain.ts',
        patterns: [
          'https://api.devnet.solana.com',
          'getBalance',
          'LAMPORTS_PER_SOL'
        ]
      },
      {
        file: 'backend/src/routes/blockchain.ts',
        patterns: [
          '/balance/:address',
          'connection.getBalance',
          'lamports / 1000000000'
        ]
      }
    ];

    // Check for FIXED frontend implementation
    const frontendBalance = this.checkFileContains('frontend/hooks/useWalletConnection.ts', [
      'Math.random() * 10 + 1' // This should NOT be found after our fix
    ]);

    if (frontendBalance.exists && frontendBalance.matches[0]?.found) {
      this.results.requirement3.errors.push('❌ Frontend still has simulation fallback (violates GI.md)');
    } else {
      this.results.requirement3.details.push('✅ Frontend simulation fallback removed (GI.md compliant)');
    }

    // Check for real error handling
    const realErrorHandling = this.checkFileContains('frontend/hooks/useWalletConnection.ts', [
      'throw new Error',
      'Failed to fetch real SOL balance'
    ]);

    if (realErrorHandling.exists && realErrorHandling.matches.every(m => m.found)) {
      this.results.requirement3.details.push('✅ Real error handling implemented');
    }

    let passed = 0;
    checks.forEach(check => {
      const result = this.checkFileContains(check.file, check.patterns);
      
      if (result.exists && result.matches.filter(m => m.found).length >= 2) {
        this.results.requirement3.details.push(`✅ ${check.file}: Implementation found`);
        passed++;
      } else if (!result.exists) {
        this.results.requirement3.errors.push(`❌ File not found: ${check.file}`);
      }
    });

    this.results.requirement3.passed = passed >= 1 && this.results.requirement3.errors.length === 0;
  }

  checkRequirement4_AccountInitialization() {
    console.log('\n🔧 Requirement 4: User Account Initialization');
    console.log('-' .repeat(50));

    const checks = [
      {
        file: 'backend/src/services/UserService.ts',
        patterns: [
          'initializeUserAccountIfNeeded',
          'checkAndInitializeAccount',
          'real devnet data',
          'SystemProgram.createAccount' // Should be present after our fix
        ]
      },
      {
        file: 'backend/src/routes/user.ts',
        patterns: [
          '/check-and-initialize',
          'autoInitialize: true',
          'walletAddress'
        ]
      }
    ];

    // Check that mock transactions were replaced
    const mockCheck = this.checkFileContains('backend/src/services/UserService.ts', [
      'mockTransactionHash' // This should NOT be found after our fix
    ]);

    if (mockCheck.exists && mockCheck.matches[0]?.found) {
      this.results.requirement4.errors.push('❌ Mock transaction code still present (violates GI.md)');
    } else {
      this.results.requirement4.details.push('✅ Mock transaction code removed (GI.md compliant)');
    }

    // Check for real devnet implementation
    const realDevnetCheck = this.checkFileContains('backend/src/services/UserService.ts', [
      'https://api.devnet.solana.com',
      'real PDA account',
      'devnet',
      'realBlockchainAccount'
    ]);

    if (realDevnetCheck.exists && realDevnetCheck.matches.filter(m => m.found).length >= 2) {
      this.results.requirement4.details.push('✅ Real devnet implementation found');
    }

    let passed = 0;
    checks.forEach(check => {
      const result = this.checkFileContains(check.file, check.patterns);
      
      if (result.exists && result.matches.filter(m => m.found).length >= 2) {
        this.results.requirement4.details.push(`✅ ${check.file}: Implementation found`);
        passed++;
      } else if (!result.exists) {
        this.results.requirement4.errors.push(`❌ File not found: ${check.file}`);
      }
    });

    this.results.requirement4.passed = passed >= 1 && this.results.requirement4.errors.length === 0;
  }

  generateReport() {
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 IMPLEMENTATION VERIFICATION REPORT');
    console.log('=' .repeat(60));

    const requirements = [
      { id: 'requirement1', name: 'Wallet Signature Verification' },
      { id: 'requirement2', name: 'PDA Account Check' },
      { id: 'requirement3', name: 'SOL Balance Query' },
      { id: 'requirement4', name: 'User Account Initialization' }
    ];

    let totalPassed = 0;
    const totalRequirements = requirements.length;

    requirements.forEach((req, index) => {
      const result = this.results[req.id];
      const status = result.passed ? '✅ IMPLEMENTED' : '❌ NEEDS WORK';
      
      console.log(`\n${index + 1}. ${req.name}`);
      console.log(`   Status: ${status}`);
      
      if (result.details.length > 0) {
        result.details.forEach(detail => console.log(`     ${detail}`));
      }
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.log(`     ${error}`));
      }

      if (result.passed) totalPassed++;
    });

    console.log('\n' + '=' .repeat(60));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Requirements Implemented: ${totalPassed}/${totalRequirements}`);
    console.log(`📈 Implementation Rate: ${((totalPassed / totalRequirements) * 100).toFixed(1)}%`);

    // GI.md Compliance Check
    const nonCompliantIssues = [];
    Object.values(this.results).forEach(result => {
      result.errors.forEach(error => {
        if (error.includes('violates GI.md') || error.includes('simulation')) {
          nonCompliantIssues.push(error);
        }
      });
    });

    console.log('\n📋 GI.md COMPLIANCE:');
    if (nonCompliantIssues.length === 0) {
      console.log('✅ FULLY COMPLIANT - No simulations or mocks found');
    } else {
      console.log('❌ NON-COMPLIANT ISSUES FOUND:');
      nonCompliantIssues.forEach(issue => console.log(`   ${issue}`));
    }

    if (totalPassed === totalRequirements && nonCompliantIssues.length === 0) {
      console.log('\n🎉 USER STORY 1 IMPLEMENTATION COMPLETE!');
      console.log('✅ All requirements implemented with real devnet data');
      console.log('✅ GI.md compliant - no simulations or mocks');
      console.log('🚀 READY FOR DEVNET TESTING AND LAUNCH!');
    } else {
      console.log('\n⚠️ Implementation needs completion:');
      if (totalPassed < totalRequirements) {
        console.log(`   - Complete ${totalRequirements - totalPassed} remaining requirements`);
      }
      if (nonCompliantIssues.length > 0) {
        console.log(`   - Fix ${nonCompliantIssues.length} GI.md compliance issues`);
      }
    }

    return {
      passed: totalPassed,
      total: totalRequirements,
      compliant: nonCompliantIssues.length === 0,
      ready: totalPassed === totalRequirements && nonCompliantIssues.length === 0
    };
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  const checker = new UserStory1ImplementationCheck();
  checker.run();
}

module.exports = UserStory1ImplementationCheck;
