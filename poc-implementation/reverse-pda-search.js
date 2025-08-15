const { PublicKey } = require('@solana/web3.js');

// Test PDA derivation to find the user that would generate the failing PDA
async function findUserForPDA() {
  const targetPDA = 'E2NC61tdNWJCza5yZxykPnsbu1DMMbAsQQnA9YzP3o6m';
  const programId = new PublicKey('34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5');
  
  console.log('🎯 Target PDA:', targetPDA);
  console.log('📋 Program ID:', programId.toString());
  
  // Test current seeds with various user addresses
  console.log('\n🔍 Testing current seed format: ["betting_account", user_pubkey]');
  
  // Generate a bunch of random user keys to see if any match
  for (let i = 0; i < 1000; i++) {
    try {
      // Generate a random keypair
      const randomUser = new PublicKey(Buffer.from(Array.from({length: 32}, () => Math.floor(Math.random() * 256))));
      
      const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('betting_account'), randomUser.toBuffer()],
        programId
      );
      
      if (pda.toString() === targetPDA) {
        console.log('🎯 FOUND MATCH!');
        console.log('   User:', randomUser.toString());
        console.log('   PDA:', pda.toString());
        console.log('   Bump:', bump);
        return;
      }
      
      // Check if it starts with the same characters (in case of truncation)
      if (pda.toString().startsWith(targetPDA.substring(0, 20))) {
        console.log('🔍 Partial match found:');
        console.log('   User:', randomUser.toString());
        console.log('   PDA:', pda.toString());
        console.log('   Bump:', bump);
      }
    } catch (error) {
      // Skip invalid keys
    }
  }
  
  console.log('\n🔍 Testing old seed format: ["betting-account", user_pubkey] (with hyphen)');
  
  // Test with old hyphen format
  for (let i = 0; i < 1000; i++) {
    try {
      const randomUser = new PublicKey(Buffer.from(Array.from({length: 32}, () => Math.floor(Math.random() * 256))));
      
      const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('betting-account'), randomUser.toBuffer()],
        programId
      );
      
      if (pda.toString() === targetPDA) {
        console.log('🎯 FOUND MATCH WITH OLD HYPHEN FORMAT!');
        console.log('   User:', randomUser.toString());
        console.log('   PDA:', pda.toString());
        console.log('   Bump:', bump);
        return;
      }
      
      if (pda.toString().startsWith(targetPDA.substring(0, 20))) {
        console.log('🔍 Partial match with hyphen format:');
        console.log('   User:', randomUser.toString());
        console.log('   PDA:', pda.toString());
        console.log('   Bump:', bump);
      }
    } catch (error) {
      // Skip invalid keys
    }
  }
  
  console.log('\n❌ Could not find a user that generates this PDA');
  console.log('💡 This suggests the PDA might be from:');
  console.log('   1. A different program');
  console.log('   2. Different seed format');
  console.log('   3. The error message is showing the wrong PDA');
}

findUserForPDA().catch(console.error);
