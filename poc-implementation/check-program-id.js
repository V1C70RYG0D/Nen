const { Keypair } = require('@solana/web3.js');

// Load the keypair from the deploy artifacts
const keypairArray = [84,23,182,205,88,149,134,96,20,103,210,129,12,169,181,41,157,80,165,45,2,0,106,95,195,14,168,252,216,105,122,66,30,151,174,124,246,105,80,226,243,244,101,24,142,47,106,164,254,182,220,188,123,0,91,152,68,9,55,95,195,109,78,154];

const keypair = Keypair.fromSecretKey(new Uint8Array(keypairArray));

console.log('🔍 Program ID Verification');
console.log('===========================');
console.log(`Deployed program public key: ${keypair.publicKey.toString()}`);
console.log(`Expected program ID:         34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5`);
console.log(`Match: ${keypair.publicKey.toString() === '34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5'}`);

// If they don't match, this is the problem
if (keypair.publicKey.toString() !== '34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5') {
  console.log('');
  console.log('🚨 PROBLEM FOUND! Program ID mismatch!');
  console.log('The deployed program has a different ID than what the declare_id!() specifies.');
  console.log('This would cause ConstraintSeeds errors.');
  console.log('');
  console.log('Solutions:');
  console.log('1. Update the client code to use the deployed program ID');
  console.log('2. OR redeploy the program with the correct keypair');
  console.log('3. OR update the declare_id!() in the Rust code and redeploy');
}
