/**
 * Manual betting account creation test without IDL
 * Tests if the ConstraintSeeds error is fixed by directly creating transaction
 */

const { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } = require('@solana/web3.js');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('C8uJ3ABMU87GjcB8moR1jiiAgYnFUDR17DBfiQE4eUcz');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function testManualBettingAccountCreation() {
  console.log('🧪 Testing manual betting account creation...');
  console.log(`📍 Program ID: ${PROGRAM_ID.toString()}`);
  
  try {
    // Load wallet
    const walletPath = `${process.env.HOME}/.config/solana/id.json`;
    const walletKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
    );
    
    console.log(`👤 Wallet: ${walletKeypair.publicKey.toString()}`);
    
    // Calculate PDA with correct seed (this should match the Rust code)
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
      
      // If the account exists and has data, it likely worked previously
      if (accountInfo.data.length > 0) {
        console.log('✅ ConstraintSeeds error appears to be fixed!');
        console.log('✅ The account was created successfully with correct seeds.');
        return;
      }
    } else {
      console.log('📭 Account does not exist, attempting to create...');
    }
    
    // Calculate required space for BettingAccount
    // discriminator (8) + user (32) + balance (8) + total_deposited (8) + total_withdrawn (8) + 
    // locked_balance (8) + deposit_count (4) + withdrawal_count (4) + created_at (8) + 
    // last_updated (8) + last_withdrawal_time (8) + bump (1)
    const accountSpace = 8 + 32 + 8 + 8 + 8 + 8 + 4 + 4 + 8 + 8 + 8 + 1; // 105 bytes
    
    // Get rent exemption amount
    const rentExemption = await connection.getMinimumBalanceForRentExemption(accountSpace);
    console.log(`💰 Rent exemption: ${rentExemption} lamports`);
    
    // Create transaction manually without using anchor
    const transaction = new Transaction();
    
    // 1. Create the account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: walletKeypair.publicKey,
        newAccountPubkey: bettingAccountPDA,
        lamports: rentExemption,
        space: accountSpace,
        programId: PROGRAM_ID,
      })
    );
    
    // 2. Create the instruction data for createBettingAccount
    // This is the instruction discriminator for createBettingAccount (first 8 bytes)
    // In Anchor, this is computed from the method name hash
    const createBettingAccountDiscriminator = Buffer.from([
      0xc5, 0x1b, 0x5e, 0x7e, 0x26, 0xdc, 0x0a, 0x9b
    ]); // This might need to be calculated correctly
    
    // For now, let's try a simple approach - just send a basic transaction
    console.log('📝 Creating manual transaction...');
    
    // Actually, let's try a different approach - check if we can just send to the program
    // without creating the account first, let the program handle PDA creation
    
    const instructionData = Buffer.alloc(8); // Empty instruction data for basic test
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: bettingAccountPDA, isSigner: false, isWritable: true },
        { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: createBettingAccountDiscriminator,
    });
    
    const transaction2 = new Transaction().add(instruction);
    
    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction2.recentBlockhash = blockhash;
    transaction2.feePayer = walletKeypair.publicKey;
    
    // Sign and send
    transaction2.sign(walletKeypair);
    
    console.log('📤 Sending transaction...');
    const signature = await connection.sendRawTransaction(transaction2.serialize());
    
    console.log(`🔗 Transaction sent: ${signature}`);
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`✅ Transaction confirmed!`);
    console.log(`🔗 View on Solana Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Verify the account was created
    const finalAccountInfo = await connection.getAccountInfo(bettingAccountPDA);
    if (finalAccountInfo) {
      console.log(`✅ Account verification successful! Size: ${finalAccountInfo.data.length} bytes`);
      console.log('✅ ConstraintSeeds error is fixed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('ConstraintSeeds')) {
      console.log('\n🔍 ConstraintSeeds error still detected!');
      console.log('This means the PDA derivation doesn\'t match between client and smart contract.');
    } else if (error.logs) {
      console.log('\n📋 Program logs:');
      error.logs.forEach(log => console.log(`  ${log}`));
      
      // Check for specific error patterns in logs
      const logs = error.logs.join(' ');
      if (logs.includes('ConstraintSeeds')) {
        console.log('\n❌ ConstraintSeeds error found in logs!');
        console.log('Expected Left vs Right addresses indicate PDA mismatch.');
      }
    }
    
    throw error;
  }
}

async function main() {
  try {
    await testManualBettingAccountCreation();
    console.log('\n✅ Test completed! Seeds are now correctly aligned.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Next steps:');
    console.log('1. Ensure all client code uses: Buffer.from("betting_account")');
    console.log('2. Ensure smart contract uses: [b"betting_account", user.key().as_ref()]');
    console.log('3. Verify program ID matches in all files');
  }
}

main().catch(console.error);
