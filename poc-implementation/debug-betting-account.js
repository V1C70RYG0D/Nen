/**
 * Debug script to test betting account creation
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet, BN } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load IDL
const idlPath = path.join(__dirname, 'frontend', 'lib', 'idl', 'nen_betting.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

// Configuration
const PROGRAM_ID = new PublicKey('34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5');
const RPC_URL = 'https://api.devnet.solana.com';

async function debugBettingAccount() {
  console.log('🔍 Debug: Betting Account Creation');
  console.log('==================================');
  
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Test 1: Check if program exists
    console.log(`\n1. Checking if program ${PROGRAM_ID.toString()} exists...`);
    const programAccount = await connection.getAccountInfo(PROGRAM_ID);
    if (!programAccount) {
      console.error('❌ Program not found on devnet!');
      return;
    }
    console.log('✅ Program found on devnet');
    
    // Test 2: Create a test keypair (like a wallet)
    console.log('\n2. Creating test keypair...');
    const testWallet = Keypair.generate();
    console.log(`Test wallet: ${testWallet.publicKey.toString()}`);
    
    // Test 3: Calculate PDA for this test wallet
    console.log('\n3. Calculating betting account PDA...');
    const [bettingAccountPDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('betting_account'), testWallet.publicKey.toBuffer()],
      PROGRAM_ID
    );
    console.log(`Betting Account PDA: ${bettingAccountPDA.toString()}`);
    console.log(`Bump: ${bump}`);
    
    // Test 4: Check if this PDA already exists
    console.log('\n4. Checking if PDA already exists...');
    const existingAccount = await connection.getAccountInfo(bettingAccountPDA);
    if (existingAccount) {
      console.log('⚠️  PDA already exists:');
      console.log(`   Owner: ${existingAccount.owner.toString()}`);
      console.log(`   Lamports: ${existingAccount.lamports}`);
      console.log(`   Data length: ${existingAccount.data.length}`);
      
      if (existingAccount.owner.equals(PROGRAM_ID)) {
        console.log('✅ Account is owned by our program (valid betting account)');
      } else {
        console.log('❌ Account is owned by different program');
      }
    } else {
      console.log('✅ PDA does not exist (safe to create)');
    }
    
    // Test 5: Try to create program instance
    console.log('\n5. Creating program instance...');
    const wallet = new Wallet(testWallet);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = new Program(idl, PROGRAM_ID, provider);
    console.log('✅ Program instance created');
    
    // Test 6: Check if we can read the IDL/program methods
    console.log('\n6. Available program methods:');
    console.log(Object.keys(program.methods));
    
    // Test 7: Fund the test wallet for actual testing (you'd need to do this manually)
    console.log('\n7. Test wallet balance:');
    const balance = await connection.getBalance(testWallet.publicKey);
    console.log(`Balance: ${balance / 1_000_000_000} SOL`);
    
    if (balance === 0) {
      console.log('⚠️  Test wallet has no SOL. Fund it manually to test account creation.');
      console.log(`   Address: ${testWallet.publicKey.toString()}`);
      console.log('   Send some devnet SOL using: https://faucet.solana.com/');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugBettingAccount();
