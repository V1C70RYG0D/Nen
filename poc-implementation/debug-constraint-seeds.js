const { PublicKey } = require('@solana/web3.js');

// Program ID from deployment
const BETTING_PROGRAM_ID = new PublicKey('34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5');

// Let's test with a specific user key that might be causing the error
// From the error logs, we can try to find the user key that was used

console.log('🔍 Debugging ConstraintSeeds Error');
console.log('==================================');
console.log(`Program ID: ${BETTING_PROGRAM_ID.toString()}`);
console.log('');

// The error shows these two addresses:
console.log('Error addresses from logs:');
console.log('Left (expected): E2NC61tdNWJCza5yZxykPnsbu1DMMbAsQQnA9YzP3o6m');
console.log('Right (got):     EdCbeBwGCAjKn5JLQNRpLL9ZsEQDFu9zMf (truncated)');
console.log('');

// Let's try to reverse engineer what user key would generate the "Left" (expected) address
const expectedPDA = new PublicKey('E2NC61tdNWJCza5yZxykPnsbu1DMMbAsQQnA9YzP3o6m');

console.log('Analyzing the expected address:');
console.log(`Expected PDA length: ${expectedPDA.toBuffer().length}`);
console.log('');

// Let's test with some common user keys
const testUsers = [
  '84YCBt3bEkFUYFzUhh9xUCzqwp6nDUJdtj62WWh3hrnT', // deployer wallet
  '11111111111111111111111111111111', // system program
  'So11111111111111111111111111111111111111112', // wrapped SOL
];

console.log('Testing PDA generation with different seeds:');
console.log('===========================================');

for (const userKey of testUsers) {
  try {
    const userPubkey = new PublicKey(userKey);
    console.log(`\nUser: ${userKey}`);
    
    // Test different seed combinations
    const seedTests = [
      {
        name: 'betting_account (underscore)',
        seeds: [Buffer.from('betting_account'), userPubkey.toBuffer()]
      },
      {
        name: 'betting-account (hyphen)',
        seeds: [Buffer.from('betting-account'), userPubkey.toBuffer()]
      },
      {
        name: 'betting_account (string)',
        seeds: ['betting_account', userPubkey.toBuffer()]
      },
      {
        name: 'betting-account (string)',
        seeds: ['betting-account', userPubkey.toBuffer()]
      }
    ];
    
    for (const test of seedTests) {
      try {
        const [pda, bump] = PublicKey.findProgramAddressSync(test.seeds, BETTING_PROGRAM_ID);
        console.log(`  ${test.name}: ${pda.toString()} (bump: ${bump})`);
        
        // Check if this matches either of the error addresses
        if (pda.toString() === 'E2NC61tdNWJCza5yZxykPnsbu1DMMbAsQQnA9YzP3o6m') {
          console.log(`  🎯 MATCH! This generates the EXPECTED address!`);
        }
        if (pda.toString().startsWith('EdCbeBwGCAjKn5JLQNRpLL9ZsEQDFu9zMf')) {
          console.log(`  🎯 MATCH! This generates the GOT address (partial)!`);
        }
      } catch (error) {
        console.log(`  ${test.name}: ERROR - ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`Invalid user key: ${userKey}`);
  }
}

// Now let's check if the issue might be with the bump seed
console.log('\n');
console.log('Checking if bump seed is manually included:');
console.log('==========================================');

// Sometimes the issue is that the bump is manually included in the seeds
for (let bump = 254; bump <= 255; bump++) {
  const userPubkey = new PublicKey('84YCBt3bEkFUYFzUhh9xUCzqwp6nDUJdtj62WWh3hrnT');
  
  try {
    // Try with manual bump
    const seedsWithBump = [Buffer.from('betting_account'), userPubkey.toBuffer(), Buffer.from([bump])];
    const pda = PublicKey.createProgramAddressSync(seedsWithBump, BETTING_PROGRAM_ID);
    console.log(`Manual bump ${bump}: ${pda.toString()}`);
    
    if (pda.toString() === 'E2NC61tdNWJCza5yZxykPnsbu1DMMbAsQQnA9YzP3o6m') {
      console.log(`🎯 MATCH! Manual bump ${bump} generates the EXPECTED address!`);
    }
  } catch (error) {
    // Expected for most bump values
  }
}

console.log('\n');
console.log('Summary:');
console.log('========');
console.log('To fix the ConstraintSeeds error, we need to ensure:');
console.log('1. The seeds used in the client match the seeds in the Rust program');
console.log('2. The program ID is identical');
console.log('3. No manual bump is included in client-side PDA derivation');
console.log('4. The Rust program uses the same seed format in all constraints');
