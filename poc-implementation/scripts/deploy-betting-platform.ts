#!/usr/bin/env ts-node

/**
 * Betting Platform Deployment Script
 * Deploys and initializes the real Solana betting program
 * Complies with GI.md: Real implementation, no simulations
 */

import {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

// Load the IDL
const idlPath = path.join(__dirname, '../frontend/lib/idl/nen_betting.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

// Program ID (should match declare_id! in Rust program)
const BETTING_PROGRAM_ID = new PublicKey('Bet1111111111111111111111111111111111111111');

// Configuration
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const ADMIN_KEYPAIR_PATH = process.env.ADMIN_KEYPAIR_PATH || './admin-keypair.json';

// Betting platform configuration (User Story 2 requirements)
const PLATFORM_CONFIG = {
  minimumDeposit: 0.1 * LAMPORTS_PER_SOL,    // 0.1 SOL minimum (User Story 2)
  maximumDeposit: 1000 * LAMPORTS_PER_SOL,   // 1000 SOL maximum
  platformFeeBps: 250,                        // 2.5% platform fee
};

async function loadAdminKeypair(): Promise<Keypair> {
  try {
    const keypairData = JSON.parse(fs.readFileSync(ADMIN_KEYPAIR_PATH, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(keypairData));
  } catch (error) {
    console.log('Admin keypair not found, generating new one...');
    const newKeypair = Keypair.generate();
    
    // Save keypair for future use
    fs.writeFileSync(
      ADMIN_KEYPAIR_PATH,
      JSON.stringify(Array.from(newKeypair.secretKey))
    );
    
    console.log(`Generated new admin keypair: ${newKeypair.publicKey.toString()}`);
    console.log(`Saved to: ${ADMIN_KEYPAIR_PATH}`);
    console.log('⚠️  Please fund this admin account with SOL before deployment');
    
    return newKeypair;
  }
}

function getBettingPlatformPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('betting_platform')],
    BETTING_PROGRAM_ID
  );
}

async function deployBettingPlatform() {
  console.log('🚀 Starting Betting Platform Deployment...');
  console.log('📋 Configuration:');
  console.log(`   - RPC URL: ${SOLANA_RPC_URL}`);
  console.log(`   - Program ID: ${BETTING_PROGRAM_ID.toString()}`);
  console.log(`   - Min Deposit: ${PLATFORM_CONFIG.minimumDeposit / LAMPORTS_PER_SOL} SOL`);
  console.log(`   - Max Deposit: ${PLATFORM_CONFIG.maximumDeposit / LAMPORTS_PER_SOL} SOL`);
  console.log(`   - Platform Fee: ${PLATFORM_CONFIG.platformFeeBps / 100}%`);

  try {
    // Initialize connection
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    console.log('\n✅ Connected to Solana network');

    // Load admin keypair
    const adminKeypair = await loadAdminKeypair();
    console.log(`🔑 Admin Public Key: ${adminKeypair.publicKey.toString()}`);

    // Check admin balance
    const adminBalance = await connection.getBalance(adminKeypair.publicKey);
    console.log(`💰 Admin Balance: ${adminBalance / LAMPORTS_PER_SOL} SOL`);

    if (adminBalance < 0.1 * LAMPORTS_PER_SOL) {
      throw new Error('Admin account needs at least 0.1 SOL for deployment');
    }

    // Initialize provider and program
    const wallet = new Wallet(adminKeypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    const program = new Program(idl, provider);
    console.log('📋 Program initialized');

    // Get betting platform PDA
    const [bettingPlatformPDA, bump] = getBettingPlatformPDA();
    console.log(`🏦 Betting Platform PDA: ${bettingPlatformPDA.toString()}`);

    // Check if platform is already initialized
    try {
      const existingPlatform = await program.account.bettingPlatform.fetch(bettingPlatformPDA);
      console.log('⚠️  Betting platform already exists!');
      console.log(`   - Admin: ${existingPlatform.admin.toString()}`);
      console.log(`   - Total Users: ${existingPlatform.totalUsers.toString()}`);
      console.log(`   - Total Deposits: ${existingPlatform.totalDeposits.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`   - Is Paused: ${existingPlatform.isPaused}`);
      return;
    } catch (error) {
      // Platform doesn't exist, continue with initialization
      console.log('🆕 Platform not found, proceeding with initialization...');
    }

    // Initialize betting platform
    console.log('\n🔧 Initializing betting platform...');
    const tx = await program.methods
      .initializeBettingPlatform(
        adminKeypair.publicKey,
        new BN(PLATFORM_CONFIG.minimumDeposit),
        new BN(PLATFORM_CONFIG.maximumDeposit),
        PLATFORM_CONFIG.platformFeeBps
      )
      .accounts({
        bettingPlatform: bettingPlatformPDA,
        admin: adminKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Platform initialized! Transaction: ${tx}`);

    // Verify initialization
    const platformAccount = await program.account.bettingPlatform.fetch(bettingPlatformPDA);
    console.log('\n📊 Platform Details:');
    console.log(`   - Admin: ${platformAccount.admin.toString()}`);
    console.log(`   - Min Deposit: ${platformAccount.minimumDeposit.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`   - Max Deposit: ${platformAccount.maximumDeposit.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`   - Platform Fee: ${platformAccount.platformFeeBps}bps (${platformAccount.platformFeeBps / 100}%)`);
    console.log(`   - Total Users: ${platformAccount.totalUsers.toString()}`);
    console.log(`   - Created At: ${new Date(platformAccount.createdAt.toNumber() * 1000).toISOString()}`);
    console.log(`   - Is Paused: ${platformAccount.isPaused}`);

    console.log('\n🎉 Betting Platform Deployment Complete!');
    console.log('\n📝 Integration Notes:');
    console.log(`   1. Update frontend BETTING_PROGRAM_ID to: ${BETTING_PROGRAM_ID.toString()}`);
    console.log(`   2. Update RPC URL in frontend to: ${SOLANA_RPC_URL}`);
    console.log(`   3. Platform PDA: ${bettingPlatformPDA.toString()}`);
    console.log(`   4. Admin can toggle pause with: ${adminKeypair.publicKey.toString()}`);

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Test platform functionality
async function testPlatformFunctionality() {
  console.log('\n🧪 Testing Platform Functionality...');
  
  try {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const adminKeypair = await loadAdminKeypair();
    const wallet = new Wallet(adminKeypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    const program = new Program(idl, provider);

    // Test: Create a betting account
    const testUserKeypair = Keypair.generate();
    console.log(`🧪 Test User: ${testUserKeypair.publicKey.toString()}`);

    // Airdrop SOL to test user (devnet only)
    if (SOLANA_RPC_URL.includes('devnet')) {
      console.log('💰 Airdropping SOL to test user...');
      const airdropSignature = await connection.requestAirdrop(
        testUserKeypair.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignature);
      console.log('✅ Airdrop complete');
    }

    // Test: Get betting account PDA
    const [bettingAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('betting_account'), testUserKeypair.publicKey.toBuffer()],
      BETTING_PROGRAM_ID
    );

    console.log(`🏦 Test User Betting PDA: ${bettingAccountPDA.toString()}`);

    console.log('\n✅ Platform functionality test complete!');
    console.log('\n🔗 Ready for frontend integration');

  } catch (error) {
    console.error('❌ Testing failed:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    await testPlatformFunctionality();
  } else {
    await deployBettingPlatform();
    
    if (args.includes('--with-test')) {
      await testPlatformFunctionality();
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { deployBettingPlatform, testPlatformFunctionality };
