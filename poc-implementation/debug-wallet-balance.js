#!/usr/bin/env node

/**
 * Debug script for Wallet Balance button clicking issues
 * Checks for common frontend problems that prevent button clicks
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Wallet Balance Button Issues...\n');

// 1. Check if required dependencies are installed
console.log('1. Checking frontend dependencies...');
const frontendPackagePath = path.join(__dirname, 'frontend', 'package.json');
if (fs.existsSync(frontendPackagePath)) {
  const pkg = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
  const requiredDeps = [
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/web3.js',
    '@coral-xyz/anchor',
    'framer-motion',
    'react-hot-toast'
  ];
  
  console.log('✅ Dependencies check:');
  requiredDeps.forEach(dep => {
    const version = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
    console.log(`   ${dep}: ${version ? version : '❌ MISSING'}`);
  });
} else {
  console.log('❌ frontend/package.json not found');
}

// 2. Check environment variables
console.log('\n2. Checking environment variables...');
const envLocalPath = path.join(__dirname, 'frontend', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const requiredEnvVars = [
    'NEXT_PUBLIC_SOLANA_RPC_URL',
    'NEXT_PUBLIC_BETTING_PROGRAM_ID',
    'NEXT_PUBLIC_API_URL'
  ];
  
  console.log('✅ Environment variables:');
  requiredEnvVars.forEach(envVar => {
    const exists = envContent.includes(envVar);
    console.log(`   ${envVar}: ${exists ? '✅ SET' : '❌ MISSING'}`);
  });
} else {
  console.log('❌ frontend/.env.local not found');
}

// 3. Check for TypeScript/JavaScript errors in the WalletBalance component
console.log('\n3. Checking WalletBalance component...');
const walletBalancePath = path.join(__dirname, 'frontend', 'components', 'WalletBalance', 'WalletBalance.tsx');
if (fs.existsSync(walletBalancePath)) {
  const componentContent = fs.readFileSync(walletBalancePath, 'utf8');
  
  // Check for potential issues
  const issues = [];
  
  // Check for button click handlers
  const clickHandlers = componentContent.match(/onClick=\{([^}]+)\}/g) || [];
  console.log(`✅ Found ${clickHandlers.length} onClick handlers`);
  
  // Check for useState hooks
  const stateHooks = componentContent.match(/useState</g) || [];
  console.log(`✅ Found ${stateHooks.length} useState hooks`);
  
  // Check for useCallback hooks  
  const callbackHooks = componentContent.match(/useCallback</g) || [];
  console.log(`✅ Found ${callbackHooks.length} useCallback hooks`);
  
  // Check for missing semicolons or syntax issues
  if (componentContent.includes('onClick={handleRefresh}')) {
    console.log('✅ handleRefresh click handler found');
  } else {
    issues.push('❌ handleRefresh click handler missing or malformed');
  }
  
  if (componentContent.includes('onClick={() => setShowDepositModal(true)}')) {
    console.log('✅ Deposit modal trigger found');
  } else {
    issues.push('❌ Deposit modal trigger missing or malformed');
  }
  
  if (componentContent.includes('onClick={() => setShowWithdrawModal(true)}')) {
    console.log('✅ Withdraw modal trigger found');
  } else {
    issues.push('❌ Withdraw modal trigger missing or malformed');
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️  Component issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('✅ Component structure looks good');
  }
} else {
  console.log('❌ WalletBalance component not found');
}

// 4. Check hooks dependency
console.log('\n4. Checking useProductionBetting hook...');
const hookPath = path.join(__dirname, 'frontend', 'hooks', 'useProductionBetting.ts');
if (fs.existsSync(hookPath)) {
  const hookContent = fs.readFileSync(hookPath, 'utf8');
  
  if (hookContent.includes('export const useProductionBetting')) {
    console.log('✅ useProductionBetting hook exported correctly');
  } else {
    console.log('❌ useProductionBetting hook export issue');
  }
  
  if (hookContent.includes('ProductionSolanaBettingClient')) {
    console.log('✅ ProductionSolanaBettingClient imported');
  } else {
    console.log('❌ ProductionSolanaBettingClient import missing');
  }
} else {
  console.log('❌ useProductionBetting hook not found');
}

// 5. Check IDL file
console.log('\n5. Checking IDL file...');
const idlPath = path.join(__dirname, 'frontend', 'lib', 'idl', 'nen_betting.json');
if (fs.existsSync(idlPath)) {
  try {
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
    console.log('✅ IDL file is valid JSON');
    console.log(`✅ Program name: ${idl.name}`);
    console.log(`✅ Instructions: ${idl.instructions?.length || 0}`);
  } catch (error) {
    console.log('❌ IDL file is invalid JSON:', error.message);
  }
} else {
  console.log('❌ IDL file not found');
}

// 6. Check if frontend server is running
console.log('\n6. Checking if frontend server is accessible...');
const { spawn } = require('child_process');

const curlProcess = spawn('curl', ['-sS', 'http://127.0.0.1:3010'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

curlProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Frontend server is accessible on port 3010');
  } else {
    console.log('❌ Frontend server is not accessible on port 3010');
  }
  
  console.log('\n7. Debugging recommendations:');
  console.log('   1. Check browser console for JavaScript errors');
  console.log('   2. Verify wallet connection status');
  console.log('   3. Check network requests in browser dev tools');
  console.log('   4. Ensure no CSS is blocking button clicks (z-index, pointer-events)');
  console.log('   5. Test with disabled button states');
  console.log('   6. Check if useProductionBetting hook is throwing errors');
  console.log('\n   To debug in browser:');
  console.log('   - Open http://127.0.0.1:3010');
  console.log('   - Open browser dev tools (F12)');
  console.log('   - Check Console tab for errors');
  console.log('   - Check Network tab for failed requests');
  console.log('   - Test button clicks and watch for console output');
});

curlProcess.on('error', (error) => {
  console.log('❌ Could not check frontend server:', error.message);
});
