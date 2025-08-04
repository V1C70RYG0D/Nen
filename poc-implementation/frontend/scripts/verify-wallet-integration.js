#!/usr/bin/env node

/**
 * Wallet Integration Verification Script
 *
 * This script verifies that all wallet adapters and components are properly configured
 * and integrated within the Nen Platform frontend.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Wallet Integration...\n');

// Check if all required dependencies are installed
function checkDependencies() {
  console.log('1. Checking dependencies...');

  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const requiredDeps = [
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
    '@solana/web3.js'
  ];

  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);

  if (missingDeps.length === 0) {
    console.log('✅ All required wallet dependencies are installed');
  } else {
    console.log('❌ Missing dependencies:', missingDeps);
    return false;
  }

  return true;
}

// Check if wallet components exist
function checkComponents() {
  console.log('\n2. Checking wallet components...');

  const components = [
    './components/WalletProvider/WalletProvider.tsx',
    './components/WalletButton/WalletButton.tsx',
    './components/WalletSelector/WalletSelector.tsx',
    './components/BalanceDisplay/BalanceDisplay.tsx'
  ];

  let allExist = true;

  components.forEach(component => {
    if (fs.existsSync(component)) {
      console.log(`✅ ${path.basename(component)} exists`);
    } else {
      console.log(`❌ ${path.basename(component)} missing`);
      allExist = false;
    }
  });

  return allExist;
}

// Check if tests exist for wallet components
function checkTests() {
  console.log('\n3. Checking wallet component tests...');

  const tests = [
    './__tests__/components/WalletProvider/WalletProvider.test.tsx',
    './__tests__/components/WalletButton/WalletButton.test.tsx',
    './__tests__/components/WalletSelector/WalletSelector.test.tsx',
    './__tests__/components/BalanceDisplay/BalanceDisplay.test.tsx'
  ];

  let allExist = true;

  tests.forEach(test => {
    if (fs.existsSync(test)) {
      console.log(`✅ ${path.basename(test)} exists`);
    } else {
      console.log(`❌ ${path.basename(test)} missing`);
      allExist = false;
    }
  });

  return allExist;
}

// Check WalletProvider configuration
function checkWalletProviderConfig() {
  console.log('\n4. Checking WalletProvider configuration...');

  const walletProviderPath = './components/WalletProvider/WalletProvider.tsx';

  if (!fs.existsSync(walletProviderPath)) {
    console.log('❌ WalletProvider.tsx not found');
    return false;
  }

  const content = fs.readFileSync(walletProviderPath, 'utf8');

  const checks = [
    { name: 'ConnectionProvider import', pattern: /import.*ConnectionProvider.*from.*@solana\/wallet-adapter-react/ },
    { name: 'WalletProvider import', pattern: /import.*WalletProvider.*from.*@solana\/wallet-adapter-react/ },
    { name: 'WalletModalProvider import', pattern: /import.*WalletModalProvider.*from.*@solana\/wallet-adapter-react-ui/ },
    { name: 'PhantomWalletAdapter', pattern: /PhantomWalletAdapter/ },
    { name: 'CoinbaseWalletAdapter', pattern: /CoinbaseWalletAdapter/ },
    { name: 'SolflareWalletAdapter', pattern: /SolflareWalletAdapter/ },
    { name: 'LedgerWalletAdapter', pattern: /LedgerWalletAdapter/ },
    { name: 'TorusWalletAdapter', pattern: /TorusWalletAdapter/ },
    { name: 'CSS import', pattern: /require.*@solana\/wallet-adapter-react-ui\/styles.css/ }
  ];

  let allPassed = true;

  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.name} configured`);
    } else {
      console.log(`❌ ${check.name} missing or misconfigured`);
      allPassed = false;
    }
  });

  return allPassed;
}

// Check if WalletProvider is integrated in _app.tsx
function checkAppIntegration() {
  console.log('\n5. Checking _app.tsx integration...');

  const appPath = './pages/_app.tsx';

  if (!fs.existsSync(appPath)) {
    console.log('❌ _app.tsx not found');
    return false;
  }

  const content = fs.readFileSync(appPath, 'utf8');

  const checks = [
    { name: 'WalletContextProvider import', pattern: /import.*WalletContextProvider.*from.*WalletProvider/ },
    { name: 'WalletContextProvider usage', pattern: /<WalletContextProvider>/ }
  ];

  let allPassed = true;

  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.name} found`);
    } else {
      console.log(`❌ ${check.name} missing`);
      allPassed = false;
    }
  });

  return allPassed;
}

// Check environment variables
function checkEnvironmentVariables() {
  console.log('\n6. Checking environment variables...');

  const envPath = './.env.local';

  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local not found');
    return false;
  }

  const content = fs.readFileSync(envPath, 'utf8');

  const requiredVars = [
    'NEXT_PUBLIC_RPC_URL',
    'NEXT_PUBLIC_NETWORK'
  ];

  let allSet = true;

  requiredVars.forEach(varName => {
    if (content.includes(varName)) {
      console.log(`✅ ${varName} is set`);
    } else {
      console.log(`❌ ${varName} is missing`);
      allSet = false;
    }
  });

  return allSet;
}

// Run all checks
async function runVerification() {
  const results = [
    checkDependencies(),
    checkComponents(),
    checkTests(),
    checkWalletProviderConfig(),
    checkAppIntegration(),
    checkEnvironmentVariables()
  ];

  const allPassed = results.every(result => result === true);

  console.log('\n' + '='.repeat(50));

  if (allPassed) {
    console.log('🎉 All wallet integration checks passed!');
    console.log('✅ Wallet adapters are properly configured');
    console.log('✅ All components are in place');
    console.log('✅ Tests are available');
    console.log('✅ Integration is complete');
  } else {
    console.log('❌ Some wallet integration checks failed');
    console.log('Please review the issues above and fix them');
    process.exit(1);
  }
}

runVerification().catch(console.error);
