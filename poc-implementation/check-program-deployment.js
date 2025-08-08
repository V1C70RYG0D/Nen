const { Connection, PublicKey } = require('@solana/web3.js');

async function checkProgramDeployment() {
  console.log('🔍 Checking Betting Program Deployment on Devnet...\n');
  
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const programId = new PublicKey('Bet1111111111111111111111111111111111111111');
    
    console.log(`📋 Program ID: ${programId.toString()}`);
    console.log(`🌐 RPC URL: https://api.devnet.solana.com\n`);
    
    // Check if program exists
    const accountInfo = await connection.getAccountInfo(programId);
    
    if (!accountInfo) {
      console.log('❌ PROGRAM NOT DEPLOYED');
      console.log('\n📝 To deploy the betting program:');
      console.log('1. Navigate to smart-contracts directory: cd smart-contracts');
      console.log('2. Build the program: anchor build');  
      console.log('3. Deploy to devnet: anchor deploy --provider.cluster devnet');
      console.log('4. Verify deployment with this script\n');
      return false;
    }
    
    console.log('✅ PROGRAM FOUND ON DEVNET');
    console.log(`📊 Account Owner: ${accountInfo.owner.toString()}`);
    console.log(`💾 Data Length: ${accountInfo.data.length} bytes`);
    console.log(`🔄 Executable: ${accountInfo.executable}`);
    console.log(`💰 Lamports: ${accountInfo.lamports}`);
    
    if (!accountInfo.executable) {
      console.log('\n⚠️  WARNING: Program exists but is not executable');
      return false;
    }
    
    console.log('\n🎉 PROGRAM SUCCESSFULLY DEPLOYED AND EXECUTABLE ON DEVNET');
    return true;
    
  } catch (error) {
    console.error('❌ Error checking program deployment:', error.message);
    return false;
  }
}

checkProgramDeployment();
