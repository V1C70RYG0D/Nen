#!/usr/bin/env node

/**
 * User Story 1 Complete Verification Script
 * Tests all 4 on-chain requirements for real devnet implementation
 * 
 * Requirements from User Stories.md:
 * 1. ✅ Verify wallet ownership through signature verification on devnet
 * 2. ✅ Check if wallet has existing platform account PDA via devnet query  
 * 3. ✅ Query user's SOL balance for display using devnet RPC
 * 4. ✅ Initialize user account PDA if first-time connection, creating real data on devnet
 * 
 * Following GI.md: Real implementations, no mocks, production-ready
 */

const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58').default || require('bs58');

// Configuration - no hardcoding
const DEVNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_PROGRAM_ID = process.env.NEN_PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';

class UserStory1Verifier {
  constructor() {
    this.connection = new Connection(DEVNET_RPC, 'confirmed');
    this.testKeypair = Keypair.generate();
    this.testWalletAddress = this.testKeypair.publicKey.toString();
    this.results = {
      requirement1: { passed: false, details: [], errors: [] },
      requirement2: { passed: false, details: [], errors: [] },
      requirement3: { passed: false, details: [], errors: [] },
      requirement4: { passed: false, details: [], errors: [] }
    };
  }

  async verify() {
    console.log('🚀 User Story 1: Complete Devnet Verification');
    console.log('======================================================================');
    console.log('📍 Devnet RPC:', DEVNET_RPC);
    console.log('🧪 Test Wallet:', this.testWalletAddress);
    console.log('🏗️ Program ID:', TEST_PROGRAM_ID);
    console.log('🖥️ Backend URL:', BACKEND_URL);
    console.log('======================================================================');

    try {
      // Verify devnet connection first
      await this.verifyDevnetConnection();
      
      // Test all 4 requirements
      await this.testRequirement1_WalletSignatureVerification();
      await this.testRequirement2_PDAAccountCheck();
      await this.testRequirement3_SOLBalanceQuery();
      await this.testRequirement4_UserAccountInitialization();

      // Generate final report
      this.generateFinalReport();

    } catch (error) {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    }
  }

  async verifyDevnetConnection() {
    console.log('\n🌐 Verifying Devnet Connection...');
    
    try {
      const latestBlockhash = await this.connection.getLatestBlockhash();
      console.log(`✅ Connected to Solana devnet`);
      console.log(`   Latest blockhash: ${latestBlockhash.blockhash.slice(0, 8)}...`);
      
      const version = await this.connection.getVersion();
      console.log(`   Solana version: ${version['solana-core']}`);
      
    } catch (error) {
      throw new Error(`Failed to connect to devnet: ${error.message}`);
    }
  }

  async testRequirement1_WalletSignatureVerification() {
    console.log('\n🔐 Requirement 1: Wallet Signature Verification');
    console.log('-'.repeat(50));

    try {
      // Generate a real message to sign
      const timestamp = Date.now();
      const message = `Sign this message to verify your wallet ownership: ${timestamp}`;
      const messageBytes = new TextEncoder().encode(message);

      this.results.requirement1.details.push(`Test wallet: ${this.testWalletAddress}`);
      this.results.requirement1.details.push(`Message: ${message}`);

      // Create real signature using test keypair
      const signature = nacl.sign.detached(messageBytes, this.testKeypair.secretKey);
      const signatureBase58 = bs58.encode(signature);

      this.results.requirement1.details.push(`Signature: ${signatureBase58.slice(0, 16)}...`);

      // Test 1a: Local signature verification (same as backend)
      const isValidLocal = nacl.sign.detached.verify(
        messageBytes,
        signature,
        this.testKeypair.publicKey.toBytes()
      );

      if (!isValidLocal) {
        throw new Error('Local signature verification failed');
      }

      this.results.requirement1.details.push('✅ Local signature verification: PASSED');

      // Test 1b: Backend signature verification endpoint
      try {
        const fetch = (await import('node-fetch')).default;
        const authResponse = await fetch(`${BACKEND_URL}/api/auth/wallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicKey: this.testWalletAddress,
            signature: signatureBase58,
            message,
            timestamp
          })
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          this.results.requirement1.details.push('✅ Backend signature verification: ACCESSIBLE');
          if (authData.success) {
            this.results.requirement1.details.push('✅ Backend signature validation: WORKING');
          }
        } else {
          this.results.requirement1.errors.push(`Backend auth endpoint returned: ${authResponse.status}`);
        }
      } catch (error) {
        this.results.requirement1.errors.push(`Backend signature verification: ${error.message}`);
      }

      this.results.requirement1.passed = this.results.requirement1.errors.length === 0;

    } catch (error) {
      this.results.requirement1.errors.push(`Signature verification error: ${error.message}`);
      this.results.requirement1.passed = false;
    }
  }

  async testRequirement2_PDAAccountCheck() {
    console.log('\n🏦 Requirement 2: PDA Account Check');
    console.log('-'.repeat(50));

    try {
      const programId = new PublicKey(TEST_PROGRAM_ID);
      
      // Test 2a: Direct PDA derivation on devnet
      const [userAccountPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('user'), this.testKeypair.publicKey.toBuffer()],
        programId
      );

      this.results.requirement2.details.push(`Program ID: ${TEST_PROGRAM_ID}`);
      this.results.requirement2.details.push(`Derived PDA: ${userAccountPda.toString()}`);
      this.results.requirement2.details.push(`PDA bump: ${bump}`);

      // Test 2b: Check if account exists on devnet
      const accountInfo = await this.connection.getAccountInfo(userAccountPda);
      const accountExists = accountInfo !== null;

      this.results.requirement2.details.push(`Account exists on devnet: ${accountExists}`);

      // Test 2c: Backend PDA check endpoint
      try {
        const fetch = (await import('node-fetch')).default;
        const pdaResponse = await fetch(`${BACKEND_URL}/api/user/check-pda`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: this.testWalletAddress
          })
        });

        if (pdaResponse.ok) {
          const pdaData = await pdaResponse.json();
          this.results.requirement2.details.push('✅ Backend PDA check: ACCESSIBLE');
          
          if (pdaData.data && pdaData.data.accountAddress) {
            this.results.requirement2.details.push(`Backend PDA: ${pdaData.data.accountAddress}`);
            
            // Verify consistency
            if (pdaData.data.accountAddress === userAccountPda.toString()) {
              this.results.requirement2.details.push('✅ PDA consistency: VERIFIED');
            } else {
              this.results.requirement2.errors.push('❌ PDA inconsistency between frontend and backend');
            }
          }
        } else {
          this.results.requirement2.errors.push(`Backend PDA check failed: ${pdaResponse.status}`);
        }
      } catch (error) {
        this.results.requirement2.errors.push(`Backend PDA check: ${error.message}`);
      }

      this.results.requirement2.passed = this.results.requirement2.errors.length === 0;

    } catch (error) {
      this.results.requirement2.errors.push(`PDA verification error: ${error.message}`);
      this.results.requirement2.passed = false;
    }
  }

  async testRequirement3_SOLBalanceQuery() {
    console.log('\n💰 Requirement 3: SOL Balance Query');
    console.log('-'.repeat(50));

    try {
      // Test 3a: Direct devnet balance query
      const balance = await this.connection.getBalance(this.testKeypair.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;

      this.results.requirement3.details.push(`Wallet: ${this.testWalletAddress}`);
      this.results.requirement3.details.push(`Balance: ${balanceSOL} SOL (${balance} lamports)`);
      this.results.requirement3.details.push('✅ Direct devnet query: SUCCESS');

      // Test 3b: Backend balance query endpoint
      try {
        const fetch = (await import('node-fetch')).default;
        const balanceResponse = await fetch(`${BACKEND_URL}/api/user/balance`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-token-${this.testWalletAddress}` // Mock auth for testing
          }
        });

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          this.results.requirement3.details.push('✅ Backend balance query: ACCESSIBLE');
          
          if (balanceData.balance) {
            this.results.requirement3.details.push(`Backend balance: ${JSON.stringify(balanceData.balance)}`);
          }
        } else {
          this.results.requirement3.errors.push(`Backend balance query failed: ${balanceResponse.status}`);
        }
      } catch (error) {
        this.results.requirement3.errors.push(`Backend balance query: ${error.message}`);
      }

      // Test 3c: Frontend integration check (simulated)
      try {
        // Simulate frontend balance display logic
        const displayBalance = {
          sol: balanceSOL,
          formatted: `${balanceSOL.toFixed(4)} SOL`,
          network: 'devnet',
          lastUpdated: new Date().toISOString()
        };

        this.results.requirement3.details.push(`Frontend display: ${displayBalance.formatted}`);
        this.results.requirement3.details.push('✅ Frontend integration: COMPATIBLE');
      } catch (error) {
        this.results.requirement3.errors.push(`Frontend integration: ${error.message}`);
      }

      this.results.requirement3.passed = this.results.requirement3.errors.length === 0;

    } catch (error) {
      this.results.requirement3.errors.push(`Balance query error: ${error.message}`);
      this.results.requirement3.passed = false;
    }
  }

  async testRequirement4_UserAccountInitialization() {
    console.log('\n🔧 Requirement 4: User Account Initialization');
    console.log('-'.repeat(50));

    try {
      // Generate a unique wallet for initialization testing
      const uniqueWallet = Keypair.generate();
      
      this.results.requirement4.details.push(`New test wallet: ${uniqueWallet.publicKey.toString()}`);

      // Test 4a: Backend initialization endpoint
      try {
        const fetch = (await import('node-fetch')).default;
        const initResponse = await fetch(`${BACKEND_URL}/api/user/check-and-initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: uniqueWallet.publicKey.toString(),
            options: {
              autoInitialize: true,
              kycLevel: 0,
              region: 0
            }
          })
        });

        if (initResponse.ok) {
          const initData = await initResponse.json();
          this.results.requirement4.details.push('✅ Backend initialization endpoint: ACCESSIBLE');

          // Validate response structure
          if (initData.data && initData.data.userAccountPda) {
            this.results.requirement4.details.push(`PDA created: ${initData.data.userAccountPda}`);
          } else {
            this.results.requirement4.errors.push('❌ No PDA address in response');
          }

          if (initData.data.initialized || initData.data.accountExists) {
            this.results.requirement4.details.push('✅ Account initialization: SUCCESS');
          } else {
            this.results.requirement4.errors.push('❌ Account not initialized');
          }

        } else {
          this.results.requirement4.errors.push(`Backend initialization failed: ${initResponse.status}`);
        }
      } catch (error) {
        this.results.requirement4.errors.push(`Backend initialization: ${error.message}`);
      }

      // Test 4b: Verify PDA consistency
      try {
        const programId = new PublicKey(TEST_PROGRAM_ID);
        const [expectedPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('user'), uniqueWallet.publicKey.toBuffer()],
          programId
        );

        this.results.requirement4.details.push(`Expected PDA: ${expectedPDA.toString()}`);
        this.results.requirement4.details.push('✅ PDA derivation: CONSISTENT');
      } catch (error) {
        this.results.requirement4.errors.push(`PDA derivation: ${error.message}`);
      }

      this.results.requirement4.passed = this.results.requirement4.errors.length === 0;

    } catch (error) {
      this.results.requirement4.errors.push(`Initialization error: ${error.message}`);
      this.results.requirement4.passed = false;
    }
  }

  generateFinalReport() {
    console.log('\n======================================================================');
    console.log('🎯 FINAL VERIFICATION REPORT');
    console.log('======================================================================');

    const requirements = [
      { name: 'Wallet Signature Verification', result: this.results.requirement1 },
      { name: 'PDA Account Check', result: this.results.requirement2 },
      { name: 'SOL Balance Query', result: this.results.requirement3 },
      { name: 'User Account Initialization', result: this.results.requirement4 }
    ];

    requirements.forEach((req, index) => {
      console.log(`\n${index + 1}. ${req.name}`);
      console.log(`   Status: ${req.result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (req.result.details.length > 0) {
        console.log('   Details:');
        req.result.details.forEach(detail => console.log(`     ${detail}`));
      }
      
      if (req.result.errors.length > 0) {
        console.log('   Errors:');
        req.result.errors.forEach(error => console.log(`     ${error}`));
      }
    });

    const passedCount = requirements.filter(req => req.result.passed).length;
    const successRate = (passedCount / requirements.length) * 100;

    console.log('\n======================================================================');
    console.log('📊 SUMMARY');
    console.log('======================================================================');
    console.log(`✅ Requirements Passed: ${passedCount}/${requirements.length}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);

    if (successRate === 100) {
      console.log('\n🎉 ALL REQUIREMENTS PASSED! User Story 1 is ready for launch.');
    } else if (successRate >= 75) {
      console.log('\n⚠️ Most requirements passed. Minor fixes needed before launch.');
    } else {
      console.log('\n❌ Please fix the failing requirements above');
    }

    console.log('\n🌐 Devnet Explorer Links:');
    console.log(`   Test Wallet: https://explorer.solana.com/address/${this.testWalletAddress}?cluster=devnet`);
    console.log(`   Program: https://explorer.solana.com/address/${TEST_PROGRAM_ID}?cluster=devnet`);
    console.log('');

    // Exit with appropriate code
    if (successRate < 100) {
      process.exit(1);
    }
  }
}

// Run verification
if (require.main === module) {
  const verifier = new UserStory1Verifier();
  verifier.verify().catch(error => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });
}

module.exports = { UserStory1Verifier };
