/**
 * Direct test of betting account creation with correct seeds
 * Tests if the ConstraintSeeds error is fixed
 */

const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('C8uJ3ABMU87GjcB8moR1jiiAgYnFUDR17DBfiQE4eUcz');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function testBettingAccountCreation() {
  console.log('🧪 Testing betting account creation with correct seeds...');
  console.log(`📍 Program ID: ${PROGRAM_ID.toString()}`);
  
  try {
    // Load wallet
    const walletPath = `${process.env.HOME}/.config/solana/id.json`;
    const walletKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
    );
    
    console.log(`👤 Wallet: ${walletKeypair.publicKey.toString()}`);
    
    // Calculate PDA with correct seed
    const [bettingAccountPDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('betting_account'), walletKeypair.publicKey.toBuffer()],
      PROGRAM_ID
    );
    
    console.log(`🏦 Betting Account PDA: ${bettingAccountPDA.toString()}`);
    console.log(`🎯 Bump: ${bump}`);
    
    // Check if account already exists
    const accountInfo = await connection.getAccountInfo(bettingAccountPDA);
    if (accountInfo) {
      console.log(`✅ Account already exists! Size: ${accountInfo.data.length} bytes`);
      console.log(`💰 Lamports: ${accountInfo.lamports}`);
      return;
    }
    
    console.log('📭 Account does not exist, attempting to create...');
    
    // Load IDL
    const idlPath = './frontend/lib/idl/nen_betting.json';
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
    
    // Setup provider
    const wallet = new Wallet(walletKeypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = new Program(idl, PROGRAM_ID, provider);
    
    console.log('📝 Creating betting account transaction...');
    
    // Try to create the betting account
    const tx = await program.methods
      .createBettingAccount()
      .accounts({
        bettingAccount: bettingAccountPDA,
        user: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log(`✅ Betting account created successfully!`);
    console.log(`🔗 Transaction: ${tx}`);
    console.log(`🔗 View on Solana Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    
    // Verify the account was created
    const finalAccountInfo = await connection.getAccountInfo(bettingAccountPDA);
    if (finalAccountInfo) {
      console.log(`✅ Account verification successful! Size: ${finalAccountInfo.data.length} bytes`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('ConstraintSeeds')) {
      console.log('\n🔍 ConstraintSeeds error detected!');
      console.log('This means the PDA derivation on client side doesn\'t match the smart contract.');
      console.log('Expected: [b"betting_account", user.key().as_ref()]');
      console.log('Make sure client uses: [Buffer.from("betting_account"), userPublicKey.toBuffer()]');
    }
    
    if (error.logs) {
      console.log('\n📋 Program logs:');
      error.logs.forEach(log => console.log(`  ${log}`));
    }
    
    throw error;
  }
}

async function main() {
  try {
    await testBettingAccountCreation();
    console.log('\n✅ Test completed successfully! The ConstraintSeeds error should be fixed.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
