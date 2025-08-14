const { Connection, PublicKey } = require('@solana/web3.js');

async function checkSpecificPDA() {
  // The failing PDA from the error (note: might be truncated)
  const pdaAddress = 'E2NC61tdNWJCza5yZxykPnsbu1DMMbAsQQnA9YzP3o6m'; // Full address from original error
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5');
  
  console.log('🔍 Checking PDA:', pdaAddress);
  console.log('📋 Program ID:', programId.toString());
  
  try {
    const pda = new PublicKey(pdaAddress);
    const accountInfo = await connection.getAccountInfo(pda);
    
    if (accountInfo) {
      console.log('\n✅ Account exists on-chain:');
      console.log('   Owner:', accountInfo.owner.toString());
      console.log('   Lamports:', accountInfo.lamports);
      console.log('   Data length:', accountInfo.data.length, 'bytes');
      console.log('   Executable:', accountInfo.executable);
      
      if (accountInfo.owner.equals(programId)) {
        console.log('✅ Owned by our betting program - this should work!');
      } else if (accountInfo.owner.equals(new PublicKey('11111111111111111111111111111111'))) {
        console.log('⚠️  Owned by System Program - likely failed creation');
      } else {
        console.log('❌ Owned by different program:', accountInfo.owner.toString());
      }
      
      // If it has data, let's see what's in it
      if (accountInfo.data.length > 0) {
        console.log('\n📋 Account data (first 64 bytes):');
        console.log(accountInfo.data.slice(0, 64).toString('hex'));
      }
    } else {
      console.log('\n❌ Account does not exist on-chain');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSpecificPDA().catch(console.error);
