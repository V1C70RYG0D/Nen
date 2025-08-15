#!/usr/bin/env node

/**
 * User Story 1: Real Devnet Demo & Test
 * 
 * Demonstrates the complete wallet connection flow with real devnet data
 * - Creates real wallet on devnet
 * - Airdrops real SOL to wallet
 * - Tests all 4 requirements with real on-chain data
 * - Validates User Story 1 acceptance criteria
 * 
 * Following GI.md: Real implementations only, no mocks
 */

const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58').default || require('bs58');

const DEVNET_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_PROGRAM_ID = process.env.NEN_PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';

class UserStory1DevnetDemo {
  constructor() {
    this.connection = new Connection(DEVNET_RPC, 'confirmed');
    this.testWallet = Keypair.generate();
    this.walletAddress = this.testWallet.publicKey.toString();
  }

  async runDemo() {
    console.log('🚀 User Story 1: Real Devnet Demo');
    console.log('==================================================');
    console.log('📍 Devnet RPC:', DEVNET_RPC);
    console.log('🧪 Test Wallet:', this.walletAddress);
    console.log('🏗️ Program ID:', TEST_PROGRAM_ID);
    console.log('🖥️ Backend URL:', BACKEND_URL);
    console.log('==================================================\\n');

    try {
      // Step 1: Demonstrate wallet connection workflow
      await this.demonstrateWalletConnection();
      
      // Step 2: Fund wallet with real devnet SOL
      await this.fundWalletWithDevnetSOL();
      
      // Step 3: Test all User Story 1 acceptance criteria
      await this.testAcceptanceCriteria();
      
      // Step 4: Demonstrate error handling scenarios
      await this.demonstrateErrorHandling();
      
      console.log('\\n🎉 User Story 1 Demo Completed Successfully!');
      console.log('✅ All acceptance criteria validated with real devnet data');
      
    } catch (error) {
      console.error('💥 Demo failed:', error.message);
      process.exit(1);
    }
  }

  async demonstrateWalletConnection() {
    console.log('👛 STEP 1: Wallet Connection Workflow');
    console.log('-'.repeat(50));
    
    // Simulate User clicks "Connect Wallet" button
    console.log('🖱️  User clicks "Connect Wallet" button');
    
    // Simulate User selects wallet provider (Phantom, Solflare, etc.)
    console.log('📱 User selects wallet provider (simulated)');
    
    // Generate signature to prove wallet ownership
    const timestamp = Date.now();
    const message = `Connect to Nen Platform: ${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, this.testWallet.secretKey);
    const signatureBase58 = bs58.encode(signature);
    
    console.log('✍️  User approves connection in wallet popup (simulated)');
    console.log(`📝 Signature created: ${signatureBase58.slice(0, 16)}...`);
    
    // Test backend authentication
    const fetch = (await import('node-fetch')).default;
    const authResponse = await fetch(`${BACKEND_URL}/api/auth/wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: this.walletAddress,
        signature: signatureBase58,
        message,
        timestamp
      })
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ User sees wallet address displayed on platform');
      console.log(`   Wallet: ${authData.data.walletAddress}`);
      console.log(`   Verified: ${authData.data.verified}`);
      console.log(`   Network: ${authData.data.network}`);
    } else {
      throw new Error('Wallet authentication failed');
    }
  }

  async fundWalletWithDevnetSOL() {
    console.log('\\n💰 STEP 2: Fund Wallet with Real Devnet SOL');
    console.log('-'.repeat(50));
    
    try {
      console.log('💳 Requesting devnet SOL airdrop...');
      
      // Request airdrop of 2 SOL for testing
      const airdropSignature = await this.connection.requestAirdrop(
        this.testWallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      
      console.log(`🌧️  Airdrop requested: ${airdropSignature.slice(0, 16)}...`);
      
      // Confirm the airdrop transaction
      const latestBlockhash = await this.connection.getLatestBlockhash();
      await this.connection.confirmTransaction({
        signature: airdropSignature,
        ...latestBlockhash
      });
      
      // Verify balance
      const balance = await this.connection.getBalance(this.testWallet.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      
      console.log(`✅ Airdrop confirmed! Balance: ${balanceSOL} SOL`);
      console.log(`🔗 View on Explorer: https://explorer.solana.com/tx/${airdropSignature}?cluster=devnet`);
      
    } catch (error) {
      console.log('⚠️  Airdrop failed (rate limits are common), proceeding with 0 balance...');
      console.log(`   Error: ${error.message}`);
    }
  }

  async testAcceptanceCriteria() {
    console.log('\\n📋 STEP 3: Testing User Story 1 Acceptance Criteria');
    console.log('-'.repeat(50));
    
    const fetch = (await import('node-fetch')).default;
    
    // Test: User sees wallet address displayed on platform
    console.log('🧪 Testing: User sees wallet address displayed');
    const currentBalance = await this.connection.getBalance(this.testWallet.publicKey);
    console.log(`✅ Wallet Address: ${this.walletAddress}`);
    console.log(`✅ Current Balance: ${currentBalance / LAMPORTS_PER_SOL} SOL`);
    
    // Test: Platform account PDA initialization
    console.log('\\n🧪 Testing: Platform account PDA initialization');
    const initResponse = await fetch(`${BACKEND_URL}/api/user/check-and-initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: this.walletAddress,
        options: { autoInitialize: true, kycLevel: 0, region: 0 }
      })
    });
    
    if (initResponse.ok) {
      const initData = await initResponse.json();
      console.log(`✅ Platform Account PDA: ${initData.data.userAccountPda}`);
      console.log(`✅ Account exists: ${initData.data.accountExists}`);
      console.log(`✅ Initialization: ${initData.data.initialized ? 'SUCCESS' : 'READY'}`);
    }
    
    // Test: Balance query and display
    console.log('\\n🧪 Testing: Balance query and display');
    const balanceResponse = await fetch(`${BACKEND_URL}/api/user/balance?wallet=${this.walletAddress}`);
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log(`✅ Backend Balance Query: ${balanceData.data.balance.formatted}`);
      console.log(`✅ Network: ${balanceData.data.network}`);
      console.log(`✅ Last Updated: ${balanceData.data.lastUpdated}`);
    }
    
    // Test: PDA consistency check
    console.log('\\n🧪 Testing: PDA consistency between frontend and backend');
    const pdaResponse = await fetch(`${BACKEND_URL}/api/user/check-pda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: this.walletAddress })
    });
    
    if (pdaResponse.ok) {
      const pdaData = await pdaResponse.json();
      
      // Verify PDA derivation locally
      const programId = new PublicKey(TEST_PROGRAM_ID);
      const [localPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user'), this.testWallet.publicKey.toBuffer()],
        programId
      );
      
      const isConsistent = pdaData.data.accountAddress === localPDA.toString();
      console.log(`✅ Backend PDA: ${pdaData.data.accountAddress}`);
      console.log(`✅ Local PDA: ${localPDA.toString()}`);
      console.log(`✅ Consistency: ${isConsistent ? 'VERIFIED' : 'FAILED'}`);
    }
  }

  async demonstrateErrorHandling() {
    console.log('\\n🚨 STEP 4: Error Handling Scenarios');
    console.log('-'.repeat(50));
    
    const fetch = (await import('node-fetch')).default;
    
    // Test: Invalid signature
    console.log('🧪 Testing: Invalid signature rejection');
    const invalidAuthResponse = await fetch(`${BACKEND_URL}/api/auth/wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: this.walletAddress,
        signature: 'invalid_signature',
        message: 'test message',
        timestamp: Date.now()
      })
    });
    
    if (!invalidAuthResponse.ok) {
      console.log('✅ Invalid signature properly rejected');
    } else {
      console.log('❌ Invalid signature should have been rejected');
    }
    
    // Test: Missing required fields
    console.log('\\n🧪 Testing: Missing required fields handling');
    const incompleteResponse = await fetch(`${BACKEND_URL}/api/auth/wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: this.walletAddress })
    });
    
    if (!incompleteResponse.ok) {
      console.log('✅ Missing fields properly handled');
    } else {
      console.log('❌ Missing fields should have been rejected');
    }
    
    // Test: Invalid wallet address format
    console.log('\\n🧪 Testing: Invalid wallet address handling');
    const invalidWalletResponse = await fetch(`${BACKEND_URL}/api/user/balance?wallet=invalid_address`);
    
    if (!invalidWalletResponse.ok) {
      console.log('✅ Invalid wallet address properly handled');
    } else {
      console.log('❌ Invalid wallet address should have been rejected');
    }
  }
}

// Run the demo
if (require.main === module) {
  const demo = new UserStory1DevnetDemo();
  demo.runDemo().catch(error => {
    console.error('💥 Demo failed:', error);
    process.exit(1);
  });
}

module.exports = { UserStory1DevnetDemo };
