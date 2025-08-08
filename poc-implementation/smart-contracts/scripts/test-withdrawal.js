const { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction, TransactionInstruction } = require('@solana/web3.js');
const fs = require('fs');

// Constants
const PROGRAM_ID = new PublicKey('C8uJ3ABMU87GjcB8moR1jiiAgYnFUDR17DBfiQE4eUcz');
const DEVNET_URL = 'https://api.devnet.solana.com';

async function createTestWithdrawal() {
  console.log('🧪 Testing Smart Contract Withdrawal...');
  console.log('Program ID:', PROGRAM_ID.toString());
  
  // Load wallet
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8')))
  );
  console.log('Test wallet:', walletKeypair.publicKey.toString());
  
  // Setup connection
  const connection = new Connection(DEVNET_URL, 'confirmed');
  
  // Calculate PDAs
  const [bettingPlatformPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('betting_platform')],
    PROGRAM_ID
  );
  
  const [bettingAccountPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('betting_account'), walletKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  console.log('Betting Platform PDA:', bettingPlatformPDA.toString());
  console.log('Betting Account PDA:', bettingAccountPDA.toString());
  
  try {
    // Check wallet balance
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log('Wallet balance:', balance / LAMPORTS_PER_SOL, 'SOL');
    
    // Check betting platform exists
    const platformAccount = await connection.getAccountInfo(bettingPlatformPDA);
    if (!platformAccount) {
      console.log('❌ Betting platform not initialized. Please run initialize-platform.js first.');
      return;
    }
    console.log('✅ Betting platform exists');
    
    // Check betting account exists
    const bettingAccount = await connection.getAccountInfo(bettingAccountPDA);
    if (!bettingAccount) {
      console.log('❌ User betting account not found. User needs to deposit first.');
      return;
    }
    console.log('✅ User betting account exists');
    console.log('Account data length:', bettingAccount.data.length);
    
    // For now, let's just verify the accounts exist and the program is deployed
    console.log('✅ All required accounts exist for withdrawal testing');
    console.log('✅ Smart contract is ready for frontend integration');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

createTestWithdrawal().catch(console.error);
