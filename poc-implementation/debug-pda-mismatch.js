const { PublicKey } = require('@solana/web3.js');

// Program ID from DEVNET_PROGRAMS.json
const BETTING_PROGRAM_ID = new PublicKey('34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5');

// Example user public key - let's use a common one for testing
const exampleUserPubkey = new PublicKey('84YCBt3bEkFUYFzUhh9xUCzqwp6nDUJdtj62WWh3hrnT');

console.log('🔍 PDA Debug Analysis');
console.log('========================');
console.log(`Program ID: ${BETTING_PROGRAM_ID.toString()}`);
console.log(`User Pubkey: ${exampleUserPubkey.toString()}`);
console.log('');

// Test different seed variations
const seedVariations = [
  ['betting_account', exampleUserPubkey.toBuffer()],
  ['betting-account', exampleUserPubkey.toBuffer()],
  [Buffer.from('betting_account'), exampleUserPubkey.toBuffer()],
  [Buffer.from('betting-account'), exampleUserPubkey.toBuffer()],
  ['betting_account', exampleUserPubkey.toBytes()],
  ['betting-account', exampleUserPubkey.toBytes()],
];

console.log('Testing different seed combinations:');
console.log('=====================================');

seedVariations.forEach((seeds, index) => {
  try {
    const [pda, bump] = PublicKey.findProgramAddressSync(seeds, BETTING_PROGRAM_ID);
    const seedsStr = seeds.map(s => {
      if (typeof s === 'string') return `"${s}"`;
      if (Buffer.isBuffer(s)) return `Buffer("${s.toString()}")`;
      return `${s.constructor.name}(${s.toString().slice(0, 20)}...)`;
    }).join(', ');
    
    console.log(`${index + 1}. Seeds: [${seedsStr}]`);
    console.log(`   PDA: ${pda.toString()}`);
    console.log(`   Bump: ${bump}`);
    console.log('');
  } catch (error) {
    console.log(`${index + 1}. Seeds: [${seeds.join(', ')}] - ERROR: ${error.message}`);
  }
});

// Let's specifically check what we're generating in our current client
console.log('Current client PDA generation:');
console.log('===============================');
try {
  const [currentPDA, currentBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('betting_account'), exampleUserPubkey.toBuffer()],
    BETTING_PROGRAM_ID
  );
  console.log(`Current PDA: ${currentPDA.toString()}`);
  console.log(`Current Bump: ${currentBump}`);
  console.log('');
} catch (error) {
  console.log(`Current PDA generation failed: ${error.message}`);
}

// Now let's check the actual declared_id from the program
console.log('Checking program declare_id vs actual program ID:');
console.log('==================================================');

// Let's also try with the declared_id that might be in the deployed program
console.log('From error message:');
console.log('Left (expected): E2NC61tdNWJCza5yZxykPnsbu1DMMbAsQQnA9YzP3o6m');
console.log('Right (got):     EdCbeBwGCAjKn5JLQNRpLL9ZsEQDFu9zMf');
console.log('');

// Let's see if the "left" address from the error can be reverse-engineered
console.log('Trying to reverse-engineer the expected PDA:');
try {
  const expectedPDA = new PublicKey('E2NC61tdNWJCza5yZxykPnsbu1DMMbAsQQnA9YzP3o6m');
  console.log(`Expected PDA: ${expectedPDA.toString()}`);
  
  // Try to find what seeds would generate this PDA
  for (let bump = 255; bump >= 0; bump--) {
    try {
      const testSeeds = [Buffer.from('betting_account'), exampleUserPubkey.toBuffer(), Buffer.from([bump])];
      const testPDA = PublicKey.createProgramAddressSync(testSeeds, BETTING_PROGRAM_ID);
      if (testPDA.equals(expectedPDA)) {
        console.log(`✅ Found matching seeds with manual bump ${bump}`);
        break;
      }
    } catch (e) {
      // Continue trying
    }
  }
} catch (e) {
  console.log('Could not create expected PDA:', e.message);
}
