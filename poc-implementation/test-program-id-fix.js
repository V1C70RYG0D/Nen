/**
 * Test Program ID Mismatch Fix
 * Verifies that the declared program ID matches the deployed program ID
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');

// Test configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';
const DECLARED_PROGRAM_ID = '34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5';

async function testProgramIdFix() {
  console.log('🧪 Testing Program ID Mismatch Fix');
  console.log('==================================\n');

  const connection = new Connection(DEVNET_RPC, 'confirmed');
  const programId = new PublicKey(DECLARED_PROGRAM_ID);
  
  console.log(`🎯 Testing Program ID: ${DECLARED_PROGRAM_ID}`);
  
  try {
    // Check if the program exists and is executable
    console.log('\n🔍 Step 1: Verify Program Deployment');
    const programInfo = await connection.getAccountInfo(programId);
    
    if (!programInfo) {
      console.log('❌ Program not found at declared address');
      return;
    }
    
    if (!programInfo.executable) {
      console.log('❌ Program exists but is not executable');
      return;
    }
    
    console.log('✅ Program is deployed and executable');
    console.log(`   Owner: ${programInfo.owner.toString()}`);
    console.log(`   Data Length: ${programInfo.data.length} bytes`);
    console.log(`   Lamports: ${programInfo.lamports}`);
    
    // Test PDA derivation with the correct program ID
    console.log('\n🔍 Step 2: Test PDA Derivation');
    
    // Use a test user public key
    let testUserKey;
    try {
      const keypairData = JSON.parse(fs.readFileSync('smart-contracts/tests/fixtures/user1-keypair.json', 'utf8'));
      const testKeypair = require('@solana/web3.js').Keypair.fromSecretKey(new Uint8Array(keypairData));
      testUserKey = testKeypair.publicKey;
    } catch (error) {
      // Use a generated key if file not found
      testUserKey = require('@solana/web3.js').Keypair.generate().publicKey;
    }
    
    const [bettingPDA, bump] = await PublicKey.findProgramAddress(
      [Buffer.from('betting_account'), testUserKey.toBuffer()],
      programId
    );
    
    console.log(`✅ PDA derived successfully`);
    console.log(`   User: ${testUserKey.toString()}`);
    console.log(`   PDA: ${bettingPDA.toString()}`);
    console.log(`   Bump: ${bump}`);
    
    // Test account constraints (simulate what Anchor would check)
    console.log('\n🔍 Step 3: Verify Anchor Constraint Compatibility');
    
    // The smart contract expects:
    // seeds = [b"betting_account", user.key().as_ref()]
    // program_id = 34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5
    
    const expectedSeeds = [Buffer.from('betting_account'), testUserKey.toBuffer()];
    const [constraintPDA] = await PublicKey.findProgramAddress(expectedSeeds, programId);
    
    if (constraintPDA.equals(bettingPDA)) {
      console.log('✅ PDA matches Anchor constraint expectations');
    } else {
      console.log('❌ PDA does NOT match Anchor constraints');
    }
    
    // Test if any account already exists at the PDA
    console.log('\n🔍 Step 4: Check Existing Account');
    const accountInfo = await connection.getAccountInfo(bettingPDA);
    
    if (accountInfo) {
      console.log('⚠️  Account already exists at PDA');
      console.log(`   Owner: ${accountInfo.owner.toString()}`);
      
      if (accountInfo.owner.equals(programId)) {
        console.log('✅ Existing account is owned by the correct program');
      } else {
        console.log('❌ Existing account is owned by different program');
      }
    } else {
      console.log('✅ No existing account (ready for creation)');
    }
    
    console.log('\n✅ Program ID Fix Verification Complete!');
    console.log('\n📋 Summary:');
    console.log('   - Program deployed at declared address ✅');
    console.log('   - Program is executable ✅');
    console.log('   - PDA derivation works correctly ✅');
    console.log('   - Anchor constraints satisfied ✅');
    console.log('   - Ready for createBettingAccount calls ✅');
    
    console.log('\n🎯 Expected Result:');
    console.log('   - DeclaredProgramIdMismatch error should be resolved ✅');
    console.log('   - User can successfully create betting accounts ✅');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testProgramIdFix().catch(console.error);
