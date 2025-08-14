const { Connection, PublicKey } = require('@solana/web3.js');

async function debugConstraintSeedsError() {
  console.log('🔍 Debugging ConstraintSeeds Error for PDA: E2NC61tdNWJCza5yZxykPnsbu1DMMbAs');
  
  // The failing PDA from the error message
  const failingPDA = 'E2NC61tdNWJCza5yZxykPnsbu1DMMbAs';
  
  // Connection to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Our program ID
  const programId = new PublicKey('34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5');
  
  console.log(`📋 Program ID: ${programId.toString()}`);
  
  // Check if this PDA exists on-chain
  try {
    const pdaPublicKey = new PublicKey(failingPDA);
    const accountInfo = await connection.getAccountInfo(pdaPublicKey);
    
    if (accountInfo) {
      console.log('✅ PDA exists on-chain:');
      console.log(`   - Address: ${pdaPublicKey.toString()}`);
      console.log(`   - Owner: ${accountInfo.owner.toString()}`);
      console.log(`   - Lamports: ${accountInfo.lamports}`);
      console.log(`   - Data length: ${accountInfo.data.length} bytes`);
      console.log(`   - Executable: ${accountInfo.executable}`);
      
      // Check if it's owned by our program
      if (accountInfo.owner.equals(programId)) {
        console.log('✅ Account is owned by our betting program');
      } else if (accountInfo.owner.equals(new PublicKey('11111111111111111111111111111111'))) {
        console.log('⚠️  Account is owned by System Program');
      } else {
        console.log(`❌ Account is owned by different program: ${accountInfo.owner.toString()}`);
      }
    } else {
      console.log('❌ PDA does not exist on-chain');
    }
  } catch (error) {
    console.error('❌ Error checking PDA on-chain:', error.message);
  }
  
  // Now try to reverse-engineer what user public key would generate this PDA
  console.log('\n🔍 Attempting to reverse-engineer the user public key...');
  
  // We know the PDA is derived from: [b"betting_account", user.key().as_ref()]
  const seedPrefix = Buffer.from('betting_account');
  
  // Try some common test wallet addresses that might be used
  const testWallets = [
    'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',  // Common test wallet
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',  // Another common one
    'A7bScQTwzY25mQ95pBcZhBjuKFLLYK2VB5A5T2vwsPh8',  // Another test wallet
    // Add any other wallet addresses you commonly use for testing
  ];
  
  for (const walletStr of testWallets) {
    try {
      const userPubkey = new PublicKey(walletStr);
      const [derivedPDA, bump] = PublicKey.findProgramAddressSync(
        [seedPrefix, userPubkey.toBuffer()],
        programId
      );
      
      console.log(`\n🔑 Testing wallet: ${walletStr}`);
      console.log(`   - Generated PDA: ${derivedPDA.toString()}`);
      console.log(`   - Bump: ${bump}`);
      
      if (derivedPDA.toString() === failingPDA) {
        console.log('🎯 MATCH FOUND!');
        console.log(`   - User wallet: ${userPubkey.toString()}`);
        console.log(`   - Generated PDA: ${derivedPDA.toString()}`);
        console.log(`   - Bump: ${bump}`);
        return;
      }
    } catch (error) {
      console.log(`   - Invalid wallet address: ${walletStr}`);
    }
  }
  
  console.log('\n❌ Could not find matching user wallet from test wallets');
  console.log('💡 To debug further, please provide the user wallet address that triggered this error');
  
  // Also verify our program ID derivation is correct
  console.log('\n🔍 Verifying program ID derivation...');
  
  // Test with a known good wallet address
  const knownWallet = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
  const [testPDA, testBump] = PublicKey.findProgramAddressSync(
    [seedPrefix, knownWallet.toBuffer()],
    programId
  );
  
  console.log(`   - Test wallet: ${knownWallet.toString()}`);
  console.log(`   - Test PDA: ${testPDA.toString()}`);
  console.log(`   - Test bump: ${testBump}`);
  
  // Check if there might be a program mismatch
  console.log('\n🔍 Checking if PDA could be from different program...');
  
  // Some common program IDs that might be confused
  const commonPrograms = [
    '11111111111111111111111111111111',  // System Program
    'BPFLoader2111111111111111111111111111111111',  // BPF Loader
    // Add any other program IDs you might have used in testing
  ];
  
  for (const programStr of commonPrograms) {
    try {
      const testProgram = new PublicKey(programStr);
      const [testPDA] = PublicKey.findProgramAddressSync(
        [seedPrefix, new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS').toBuffer()],
        testProgram
      );
      
      if (testPDA.toString().startsWith(failingPDA.substring(0, 10))) {
        console.log(`🔍 Similar PDA found with program: ${programStr}`);
        console.log(`   - PDA: ${testPDA.toString()}`);
      }
    } catch (error) {
      // Skip invalid program IDs
    }
  }
}

debugConstraintSeedsError().catch(console.error);
