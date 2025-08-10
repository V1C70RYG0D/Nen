#!/usr/bin/env node

/**
 * Test script to verify the withdrawal fix works on devnet
 * This tests the real functionality without frontend dependencies
 */

const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet, BN } = require('@coral-xyz/anchor');
const fs = require('fs');

// Configuration
const RPC_URL = 'https://api.devnet.solana.com';
const BETTING_PROGRAM_ID = '34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5';

// IDL for the betting program
const IDL = {
  "version": "0.1.0",
  "name": "nen_betting",
  "instructions": [
    {
      "name": "withdrawSol",
      "accounts": [
        { "name": "bettingAccount", "isMut": true, "isSigner": false },
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [{ "name": "amount", "type": "u64" }]
    }
  ],
  "accounts": [
    {
      "name": "BettingAccount",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "balance", "type": "u64" },
          { "name": "totalDeposited", "type": "u64" },
          { "name": "totalWithdrawn", "type": "u64" },
          { "name": "lockedFunds", "type": "u64" },
          { "name": "lastActivity", "type": "i64" },
          { "name": "lastWithdrawal", "type": "i64" },
          { "name": "withdrawalCount", "type": "u64" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "WithdrawalAmountInvalid", "msg": "Withdrawal amount must be greater than 0" },
    { "code": 6001, "name": "WithdrawalTooSmall", "msg": "Withdrawal amount too small (minimum 0.01 SOL)" },
    { "code": 6002, "name": "InsufficientAvailableBalance", "msg": "Insufficient available balance (funds may be locked in active bets)" },
    { "code": 6003, "name": "WithdrawalCooldownActive", "msg": "Withdrawal cooldown active - must wait 24 hours between withdrawals" },
    { "code": 6004, "name": "UnauthorizedWithdrawal", "msg": "Unauthorized withdrawal attempt" },
    { "code": 6005, "name": "InsufficientAccountLamports", "msg": "Insufficient lamports in account for withdrawal plus rent" }
  ]
};

async function testWithdrawalFix() {
  console.log('🧪 Testing Withdrawal Fix on Devnet');
  console.log('=====================================');

  try {
    // Setup connection
    const connection = new Connection(RPC_URL, 'confirmed');
    console.log('✅ Connected to Solana devnet');

    // Load test wallet (assuming you have a keypair file)
    let wallet;
    try {
      const keypairPath = process.env.HOME + '/.config/solana/id.json';
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
      wallet = new Wallet(keypair);
      console.log('✅ Loaded wallet:', wallet.publicKey.toString());
    } catch (error) {
      console.log('❌ Failed to load wallet. Please ensure you have a Solana keypair.');
      console.log('   Run: solana-keygen new --outfile ~/.config/solana/id.json');
      return;
    }

    // Setup provider and program
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const programId = new PublicKey(BETTING_PROGRAM_ID);
    const program = new Program(IDL, programId, provider);
    console.log('✅ Initialized Anchor program');

    // Get betting account PDA
    const [bettingAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('betting-account'), wallet.publicKey.toBuffer()],
      programId
    );
    console.log('📍 Betting Account PDA:', bettingAccountPDA.toString());

    // Check if betting account exists
    let bettingAccount;
    try {
      bettingAccount = await program.account.bettingAccount.fetch(bettingAccountPDA);
      console.log('✅ Found existing betting account');
      console.log('   Balance:', bettingAccount.balance.toNumber() / LAMPORTS_PER_SOL, 'SOL');
      console.log('   Locked:', bettingAccount.lockedFunds.toNumber() / LAMPORTS_PER_SOL, 'SOL');
      console.log('   Available:', (bettingAccount.balance.toNumber() - bettingAccount.lockedFunds.toNumber()) / LAMPORTS_PER_SOL, 'SOL');
    } catch (error) {
      console.log('❌ No betting account found. Please create one first via the frontend.');
      return;
    }

    // Check if there's available balance
    const availableBalance = bettingAccount.balance.toNumber() - bettingAccount.lockedFunds.toNumber();
    if (availableBalance < 10_000_000) { // Less than 0.01 SOL
      console.log('❌ Insufficient balance for withdrawal test');
      console.log('   Available:', availableBalance / LAMPORTS_PER_SOL, 'SOL');
      console.log('   Minimum required: 0.01 SOL');
      return;
    }

    // Test withdrawal
    const withdrawalAmount = 10_000_000; // 0.01 SOL
    console.log('\\n🚀 Testing withdrawal of 0.01 SOL...');

    try {
      const tx = await program.methods
        .withdrawSol(new BN(withdrawalAmount))
        .accounts({
          bettingAccount: bettingAccountPDA,
          user: wallet.publicKey,
          systemProgram: require('@solana/web3.js').SystemProgram.programId,
        })
        .rpc({
          skipPreflight: false,
          commitment: 'confirmed',
        });

      console.log('✅ WITHDRAWAL SUCCESSFUL!');
      console.log('   Transaction:', tx);
      console.log('   Explorer: https://explorer.solana.com/tx/' + tx + '?cluster=devnet');

      // Verify account balance updated
      const updatedAccount = await program.account.bettingAccount.fetch(bettingAccountPDA);
      console.log('\\n📊 Updated Account State:');
      console.log('   New Balance:', updatedAccount.balance.toNumber() / LAMPORTS_PER_SOL, 'SOL');
      console.log('   Total Withdrawn:', updatedAccount.totalWithdrawn.toNumber() / LAMPORTS_PER_SOL, 'SOL');
      console.log('   Withdrawal Count:', updatedAccount.withdrawalCount.toNumber());

    } catch (error) {
      console.log('❌ WITHDRAWAL FAILED:');
      
      if (error.message.includes('invalid program argument')) {
        console.log('   This was the original error - it should be fixed now!');
      }
      
      console.log('   Error:', error.message);
      
      if (error.logs) {
        console.log('   Logs:');
        error.logs.forEach(log => console.log('     ', log));
      }
    }

  } catch (error) {
    console.log('❌ Test setup failed:', error.message);
  }
}

// Run the test
testWithdrawalFix();
