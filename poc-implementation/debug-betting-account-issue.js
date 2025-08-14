#!/usr/bin/env node

/**
 * Debug Script for Betting Account Creation Issue
 * 
 * This script helps diagnose and fix the "account already in use" error
 * when creating betting accounts.
 */

const { PublicKey, Connection } = require('@solana/web3.js');

// Configuration
const PROGRAM_ID = new PublicKey('34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5');
const RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// The specific account address from the error
const PROBLEMATIC_ACCOUNT = 'EdCbeBwGCAjKn5JLQNRpLL9ZsEQDFu9zMfbGXeWe';

async function debugAccountIssue() {
  console.log('🔍 Debugging Betting Account Creation Issue');
  console.log('==========================================');
  console.log();

  try {
    // Check if the problematic account exists
    console.log(`📋 Checking account: ${PROBLEMATIC_ACCOUNT}`);
    const accountInfo = await connection.getAccountInfo(new PublicKey(PROBLEMATIC_ACCOUNT));
    
    if (accountInfo) {
      console.log('✅ Account exists:');
      console.log(`   - Lamports: ${accountInfo.lamports}`);
      console.log(`   - Owner: ${accountInfo.owner.toString()}`);
      console.log(`   - Executable: ${accountInfo.executable}`);
      console.log(`   - Data length: ${accountInfo.data.length}`);
      console.log(`   - Rent epoch: ${accountInfo.rentEpoch}`);
      
      // Check if it's owned by our program
      if (accountInfo.owner.equals(PROGRAM_ID)) {
        console.log('🎯 Account is owned by our betting program');
        console.log('💡 This account already exists and is properly initialized');
        console.log('');
        console.log('SOLUTION:');
        console.log('- The frontend should check if the account exists before trying to create it');
        console.log('- Or handle the "already exists" error gracefully');
      } else if (accountInfo.owner.equals(new PublicKey('11111111111111111111111111111111'))) {
        console.log('⚠️  Account is owned by System Program');
        console.log('💡 This might be a leftover from a failed creation attempt');
        console.log('');
        console.log('SOLUTION:');
        console.log('- The account needs to be properly initialized by the betting program');
        console.log('- Or you may need to close/reclaim this account first');
      } else {
        console.log('❌ Account is owned by an unexpected program');
        console.log('💡 This suggests a PDA derivation conflict');
      }
    } else {
      console.log('❌ Account does not exist');
      console.log('💡 This is unexpected given the error message');
    }

    console.log();
    console.log('🔍 Additional Diagnostics:');
    console.log('==========================');

    // Check if this could be a PDA derivation issue
    console.log('📋 Checking common PDA derivations...');
    
    // Try different user public keys to see if we can derive this address
    const commonSeeds = [
      'betting_account',
      'user_account', 
      'account',
      'betting',
    ];

    let foundDerivation = false;
    for (const seed of commonSeeds) {
      try {
        // Try to find which user public key would generate this PDA
        // Use some common wallet addresses for testing
        const testUsers = [
          'So11111111111111111111111111111111111111112', // Wrapped SOL
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
          '11111111111111111111111111111111111111112', // System program variant
        ];
        
        for (const testUserStr of testUsers) {
          try {
            const testUser = new PublicKey(testUserStr);
            const [pda] = PublicKey.findProgramAddressSync(
              [Buffer.from(seed), testUser.toBuffer()],
              PROGRAM_ID
            );
            
            if (pda.equals(new PublicKey(PROBLEMATIC_ACCOUNT))) {
              console.log(`✅ Found PDA derivation!`);
              console.log(`   - Seed: "${seed}"`);
              console.log(`   - User: ${testUser.toString()}`);
              console.log(`   - PDA: ${pda.toString()}`);
              foundDerivation = true;
              break;
            }
          } catch (e) {
            // Skip invalid public keys
          }
        }
        if (foundDerivation) break;
      } catch (e) {
        // Skip derivation errors
      }
    }

    if (!foundDerivation) {
      console.log('❌ Could not determine PDA derivation');
    }

    console.log();
    console.log('🛠️  Recommended Actions:');
    console.log('========================');
    console.log('1. Update frontend to check account existence before creation');
    console.log('2. Implement proper error handling for "already exists" scenarios');
    console.log('3. Consider account recovery/reinitialization if needed');
    console.log('4. Ensure consistent PDA derivation across all components');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

async function suggestFix() {
  console.log();
  console.log('💡 Suggested Frontend Fix:');
  console.log('===========================');
  console.log(`
// In the betting client, before creating account:
async createBettingAccount(userPublicKey) {
  const [pda] = this.getBettingAccountPDA(userPublicKey);
  
  // Check if account already exists
  const existingAccount = await this.connection.getAccountInfo(pda);
  if (existingAccount) {
    console.log('Account already exists, returning existing');
    return 'ACCOUNT_EXISTS';
  }
  
  // Proceed with creation only if account doesn't exist
  try {
    const tx = await this.program.methods
      .createBettingAccount()
      .accounts({
        bettingAccount: pda,
        user: userPublicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    return tx;
  } catch (error) {
    if (error.message.includes('already in use')) {
      // Handle race condition where account was created between check and creation
      console.log('Account created by another transaction');
      return 'ACCOUNT_EXISTS';
    }
    throw error;
  }
}
  `);
}

// Run the debug
debugAccountIssue().then(() => {
  suggestFix();
}).catch(console.error);
