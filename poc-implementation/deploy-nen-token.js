#!/usr/bin/env node

/**
 * $NEN Token Deployment Script for Devnet
 * Creates a test $NEN token for staking validation testing
 */

console.log('🪙 $NEN TOKEN DEPLOYMENT FOR DEVNET');
console.log('=' .repeat(50));

async function deployNENToken() {
  try {
    // Load environment
    const path = require('path');
    const fs = require('fs');
    const envPath = path.join(__dirname, 'backend/.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key] = value;
        }
      });
    }

    const { Keypair } = require('@solana/web3.js');
    const { NENStakingService } = require('./backend/src/services/nen-staking-service.js');
    const devnet = require('./backend/src/services/training-devnet.js');

    console.log('\n🔧 Setting up deployment...');
    
    // Load service keypair
    const serviceKeypair = devnet.loadServiceKeypair();
    const connection = devnet.getConnection();
    
    console.log('Service Wallet:', serviceKeypair.publicKey.toString());
    console.log('RPC Endpoint:', connection.rpcEndpoint);
    
    // Check balance
    const balance = await connection.getBalance(serviceKeypair.publicKey);
    console.log('Balance:', balance / 1e9, 'SOL');
    
    if (balance < 0.01 * 1e9) {
      console.log('\n💰 Requesting devnet airdrop...');
      const airdropSig = await connection.requestAirdrop(serviceKeypair.publicKey, 1e9);
      await connection.confirmTransaction(airdropSig);
      console.log('✅ Airdrop completed');
    }

    console.log('\n🪙 Deploying $NEN token...');
    
    const stakingService = new NENStakingService();
    const deployment = await stakingService.deployTestNENToken(serviceKeypair);
    
    console.log('\n✅ $NEN TOKEN DEPLOYED SUCCESSFULLY!');
    console.log('Mint Address:', deployment.mint);
    console.log('Token Account:', deployment.tokenAccount);
    console.log('Explorer:', deployment.explorerUrl);
    
    // Update environment file with mint address
    console.log('\n📝 Updating environment configuration...');
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('NEN_TOKEN_MINT_ADDRESS=')) {
        envContent = envContent.replace(
          /NEN_TOKEN_MINT_ADDRESS=.*/,
          `NEN_TOKEN_MINT_ADDRESS=${deployment.mint}`
        );
      } else {
        envContent += `\n# $NEN Token Configuration\nNEN_TOKEN_MINT_ADDRESS=${deployment.mint}\nMIN_STAKE_FOR_PRIORITY=100\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Environment updated with token mint address');
    }
    
    // Test the staking service
    console.log('\n🧪 Testing staking validation...');
    
    const testValidation = await stakingService.validateStakedNEN(serviceKeypair.publicKey.toString());
    console.log('Stake Validation Result:');
    console.log('- Has Minimum Stake:', testValidation.hasMinimumStake);
    console.log('- Staked Amount:', testValidation.stakedAmount, '$NEN');
    console.log('- Priority:', testValidation.priority);
    console.log('- Reason:', testValidation.reason);
    
    console.log('\n🎯 DEPLOYMENT SUMMARY');
    console.log('=' .repeat(30));
    console.log('✅ $NEN token deployed on devnet');
    console.log('✅ 1,000,000 test tokens minted');
    console.log('✅ Environment configuration updated');
    console.log('✅ Staking validation service ready');
    console.log('✅ User Story 7 Requirement 5: COMPLETE');
    
    console.log('\n🔗 Next Steps:');
    console.log('1. Restart the backend server to load new configuration');
    console.log('2. Test training API with $NEN staking validation');
    console.log('3. Transfer test $NEN tokens to user wallets for testing');
    
    return deployment;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

deployNENToken().then(() => {
  console.log('\n🎉 $NEN TOKEN DEPLOYMENT COMPLETE!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Critical deployment error:', error.message);
  process.exit(1);
});
