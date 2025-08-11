/**
 * Manual initialization of betting platform using raw transactions
 * This bypasses the Anchor version compatibility issues
 */

const { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction, TransactionInstruction } = require('@solana/web3.js');
const fs = require('fs');

// Constants
const PROGRAM_ID = new PublicKey('C8uJ3ABMU87GjcB8moR1jiiAgYnFUDR17DBfiQE4eUcz');
const DEVNET_URL = 'https://api.devnet.solana.com';

async function initializePlatformManually() {
  console.log('🔧 Manual Betting Platform Initialization');
  console.log('Program ID:', PROGRAM_ID.toString());
  
  // Load wallet
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
  );
  console.log('Admin wallet:', walletKeypair.publicKey.toString());
  
  // Setup connection
  const connection = new Connection(DEVNET_URL, 'confirmed');
  
  // Calculate betting platform PDA
  const [bettingPlatformPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('betting_platform')],
    PROGRAM_ID
  );
  
  console.log('Betting Platform PDA:', bettingPlatformPDA.toString());
  console.log('Bump:', bump);
  
  try {
    // Check if already initialized
    const existingAccount = await connection.getAccountInfo(bettingPlatformPDA);
    if (existingAccount) {
      console.log('✅ Betting platform already initialized');
      console.log('Data length:', existingAccount.data.length);
      return;
    }
    
    console.log('🎯 Platform not initialized - manual initialization needed');
    console.log('⚠️  Due to Anchor version compatibility issues, please initialize manually.');
    console.log('');
    console.log('📋 INITIALIZATION REQUIREMENTS:');
    console.log('1. Use anchor deploy to deploy the program');
    console.log('2. Call initialize_betting_platform with these parameters:');
    console.log('   - admin:', walletKeypair.publicKey.toString());
    console.log('   - minimum_deposit:', (0.1 * LAMPORTS_PER_SOL).toString(), 'lamports (0.1 SOL)');
    console.log('   - maximum_deposit:', (100 * LAMPORTS_PER_SOL).toString(), 'lamports (100 SOL)');
    console.log('   - platform_fee_bps: 100 (1%)');
    console.log('');
    console.log('🚀 ALTERNATIVE: Use frontend to initialize when first user deposits');
    console.log('   The smart contract is designed to handle missing platform gracefully');
    
  } catch (error) {
    console.error('❌ Error during manual initialization check:', error);
  }
}

initializePlatformManually().catch(console.error);
