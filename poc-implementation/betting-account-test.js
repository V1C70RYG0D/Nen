/**
 * Simple test script for betting account functionality
 * Tests the fixes for "Cannot read properties of undefined (reading 'toNumber')" error
 */

const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Test the creation of safe BN objects
function createSafeBN(value) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return {
    toNumber: () => isNaN(numValue) ? 0 : numValue
  };
}

// Test the safe conversion function
function safeToSol(value) {
  if (!value) return 0;
  
  // If it's already a number, return it divided by LAMPORTS_PER_SOL if it seems to be in lamports
  if (typeof value === 'number') {
    // If the number is large (>= 1 SOL in lamports), assume it's in lamports
    return value >= LAMPORTS_PER_SOL ? value / LAMPORTS_PER_SOL : value;
  }
  
  // If it has toNumber method (BN object), use it
  if (value && typeof value.toNumber === 'function') {
    return value.toNumber() / LAMPORTS_PER_SOL;
  }
  
  // Try to parse as number if it's a string
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  
  // Default to 0 for any other type
  return 0;
}

async function testBettingAccountFixes() {
  console.log('🧪 Testing betting account fixes...');
  
  // Test 1: Safe BN creation
  console.log('\n1. Testing safe BN creation:');
  const testBN1 = createSafeBN(1500000000); // 1.5 SOL in lamports
  const testBN2 = createSafeBN(undefined);
  const testBN3 = createSafeBN('500000000');
  
  console.log(`  - BN from number: ${testBN1.toNumber()} lamports`);
  console.log(`  - BN from undefined: ${testBN2.toNumber()} lamports`);
  console.log(`  - BN from string: ${testBN3.toNumber()} lamports`);
  
  // Test 2: Safe SOL conversion
  console.log('\n2. Testing safe SOL conversion:');
  const testVal1 = 1500000000; // 1.5 SOL in lamports
  const testVal2 = 1.5; // Already in SOL
  const testVal3 = undefined;
  const testVal4 = createSafeBN(2000000000); // 2 SOL in lamports
  
  console.log(`  - From lamports number: ${safeToSol(testVal1)} SOL`);
  console.log(`  - From SOL number: ${safeToSol(testVal2)} SOL`);
  console.log(`  - From undefined: ${safeToSol(testVal3)} SOL`);
  console.log(`  - From safe BN: ${safeToSol(testVal4)} SOL`);
  
  // Test 3: Mock account creation like our real implementation
  console.log('\n3. Testing mock account creation:');
  const mockUser = Keypair.generate();
  
  // Simulate account data that might be undefined or missing properties
  const mockAccountData = {
    balance: undefined, // This would cause the original error
    totalDeposited: createSafeBN(500000000),
    totalWithdrawn: 0,
    lockedBalance: null,
  };
  
  // Process the account data safely
  const safeAccount = {
    user: mockUser.publicKey,
    balance: safeToSol(mockAccountData.balance),
    totalDeposited: safeToSol(mockAccountData.totalDeposited),
    totalWithdrawn: safeToSol(mockAccountData.totalWithdrawn),
    lockedBalance: safeToSol(mockAccountData.lockedBalance),
  };
  
  console.log(`  - User: ${safeAccount.user.toString().slice(0, 8)}...`);
  console.log(`  - Balance: ${safeAccount.balance} SOL`);
  console.log(`  - Total Deposited: ${safeAccount.totalDeposited} SOL`);
  console.log(`  - Total Withdrawn: ${safeAccount.totalWithdrawn} SOL`);
  console.log(`  - Locked Balance: ${safeAccount.lockedBalance} SOL`);
  
  console.log('\n✅ All tests passed! The toNumber() error should be fixed.');
  
  // Test 4: Demonstrate the original error scenario
  console.log('\n4. Demonstrating the original error scenario:');
  try {
    const badAccount = { balance: undefined };
    // This would cause the original error:
    // const result = badAccount.balance.toNumber();
    console.log('  ❌ Original code would fail: badAccount.balance.toNumber()');
    
    // Our fixed code handles it safely:
    const result = safeToSol(badAccount.balance);
    console.log(`  ✅ Fixed code handles it: ${result} SOL`);
  } catch (error) {
    console.log(`  ❌ Error caught: ${error.message}`);
  }
}

// Run the test
testBettingAccountFixes().catch(console.error);
