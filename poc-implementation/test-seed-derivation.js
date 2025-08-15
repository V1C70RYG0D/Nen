/**
 * Test script to check PDA seed derivation
 * Helps debug the ConstraintSeeds error
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey('34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function testSeedDerivation() {
  console.log('🧪 Testing PDA seed derivation...');
  console.log(`📍 Program ID: ${PROGRAM_ID.toString()}`);
  
  // Create a test user keypair
  const testUser = Keypair.generate();
  console.log(`👤 Test User: ${testUser.publicKey.toString()}`);
  
  // Test different seed combinations
  const seedVariations = [
    'betting_account',    // Underscore (matches Rust contract)
    'betting-account',    // Hyphen (incorrect)
    'betting_platform',   // Platform PDA seed
  ];
  
  console.log('\n📋 Testing seed variations:');
  
  for (const seed of seedVariations) {
    try {
      console.log(`\n🔍 Testing seed: "${seed}"`);
      
      const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from(seed), testUser.publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      console.log(`  ✅ PDA: ${pda.toString()}`);
      console.log(`  🎯 Bump: ${bump}`);
      
      // Check if account exists on devnet
      try {
        const accountInfo = await connection.getAccountInfo(pda);
        if (accountInfo) {
          console.log(`  🏦 Account exists on devnet! Size: ${accountInfo.data.length} bytes`);
        } else {
          console.log(`  📭 Account does not exist on devnet`);
        }
      } catch (error) {
        console.log(`  ❌ Error checking account: ${error.message}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Failed to derive PDA: ${error.message}`);
    }
  }
  
  // Test with an existing wallet if available
  console.log('\n🔑 Testing with actual wallet...');
  
  // Use the deployment wallet
  const walletPath = `${process.env.HOME}/.config/solana/id.json`;
  const fs = require('fs');
  
  if (fs.existsSync(walletPath)) {
    try {
      const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
      );
      
      console.log(`👤 Wallet: ${walletKeypair.publicKey.toString()}`);
      
      const [bettingPDA, bettingBump] = PublicKey.findProgramAddressSync(
        [Buffer.from('betting_account'), walletKeypair.publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      console.log(`🏦 Betting Account PDA: ${bettingPDA.toString()}`);
      console.log(`🎯 Bump: ${bettingBump}`);
      
      // Check if this account exists
      const accountInfo = await connection.getAccountInfo(bettingPDA);
      if (accountInfo) {
        console.log(`✅ Betting account exists! Size: ${accountInfo.data.length} bytes`);
        console.log(`💰 Lamports: ${accountInfo.lamports}`);
      } else {
        console.log(`📭 Betting account does not exist yet`);
      }
      
    } catch (error) {
      console.log(`❌ Error loading wallet: ${error.message}`);
    }
  }
}

// Also test the program's expected address from the error message
async function analyzeErrorAddresses() {
  console.log('\n🔍 Analyzing error addresses from the logs...');
  
  const leftAddress = 'E2NC61tdNWJCza5yZxykPnsbu1DMMbAsQQnA9YzP3o6m';
  const rightAddress = 'EdCbeBwGCAjKn5JLQNRpLL9ZsEQDFu9zM'; // This seems truncated
  
  console.log(`📍 Left address (expected): ${leftAddress}`);
  console.log(`📍 Right address (provided): ${rightAddress}`);
  
  try {
    const leftPubkey = new PublicKey(leftAddress);
    console.log(`✅ Left address is valid: ${leftPubkey.toString()}`);
    
    // Check if this corresponds to any known PDA derivation
    // This would require reverse-engineering which is complex
    
  } catch (error) {
    console.log(`❌ Left address invalid: ${error.message}`);
  }
  
  try {
    const rightPubkey = new PublicKey(rightAddress);
    console.log(`✅ Right address is valid: ${rightPubkey.toString()}`);
  } catch (error) {
    console.log(`❌ Right address invalid (likely truncated): ${error.message}`);
  }
}

async function main() {
  try {
    await testSeedDerivation();
    await analyzeErrorAddresses();
    
    console.log('\n💡 Summary:');
    console.log('1. Use "betting_account" (with underscore) as the seed');
    console.log('2. Ensure the client and smart contract use the same seed');
    console.log('3. The ConstraintSeeds error means the PDA derivation is inconsistent');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);
