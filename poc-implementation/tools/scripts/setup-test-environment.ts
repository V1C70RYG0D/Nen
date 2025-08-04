#!/usr/bin/env tsx
/**
 * Test Environment Setup Script
 * Sets up Solana devnet connections, test wallets, and funding
 * Real implementations, production-ready setup
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const DEVNET_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const AIRDROP_AMOUNT = parseInt(process.env.TEST_AIRDROP_AMOUNT || process.env.DEFAULT_TEST_AIRDROP_AMOUNT || (() => {
  throw new Error('TEST_AIRDROP_AMOUNT or DEFAULT_TEST_AIRDROP_AMOUNT must be set in environment variables. No hardcoded values allowed.');
})()); // 2 SOL
const MINIMUM_BALANCE = parseInt(process.env.MINIMUM_SOL_BALANCE || process.env.DEFAULT_MINIMUM_SOL_BALANCE || (() => {
  throw new Error('MINIMUM_SOL_BALANCE or DEFAULT_MINIMUM_SOL_BALANCE must be set in environment variables. No hardcoded values allowed.');
})()); // 1 SOL

interface TestWallet {
  name: string;
  keypair: Keypair;
  publicKey: string;
  secretKey: string;
}

class TestEnvironmentSetup {
  private connection: Connection;
  private testWallets: TestWallet[] = [];

  constructor() {
    this.connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  }

  /**
   * Initialize test environment
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Test Environment...');
    console.log(`📡 Connecting to Solana Devnet: ${DEVNET_RPC_URL}`);

    try {
      // Test connection
      const version = await this.connection.getVersion();
      console.log(`✅ Connected to Solana RPC - Version: ${version['solana-core']}`);

      // Create or load test wallets
      await this.setupTestWallets();

      // Fund test wallets
      await this.fundTestWallets();

      // Verify balances
      await this.verifyWalletBalances();

      // Generate wallet configuration
      await this.generateWalletConfig();

      console.log('✅ Test environment setup completed successfully!');

    } catch (error) {
      console.error('❌ Failed to initialize test environment:', error);
      throw error;
    }
  }

  /**
   * Create or load test wallets
   */
  private async setupTestWallets(): Promise<void> {
    console.log('🔑 Setting up test wallets...');

    const walletConfigs = [
      { name: 'treasury', envVar: 'TREASURY_WALLET_SECRET_KEY' },
      { name: 'admin', envVar: 'ADMIN_WALLET_SECRET_KEY' },
      { name: 'user1', envVar: 'TEST_USER_WALLET_1_SECRET' },
      { name: 'user2', envVar: 'TEST_USER_WALLET_2_SECRET' },
    ];

    for (const config of walletConfigs) {
      const secretKey = process.env[config.envVar];
      let keypair: Keypair;

      if (secretKey && secretKey !== `test-${config.name}-wallet-private-key-here`) {
        // Load existing wallet from secret key
        try {
          const secretArray = JSON.parse(secretKey);
          keypair = Keypair.fromSecretKey(new Uint8Array(secretArray));
          console.log(`📥 Loaded existing ${config.name} wallet: ${keypair.publicKey.toString()}`);
        } catch {
          // Try base58 format
          try {
            const bs58 = await import('bs58');
            keypair = Keypair.fromSecretKey(bs58.default.decode(secretKey));
            console.log(`📥 Loaded existing ${config.name} wallet: ${keypair.publicKey.toString()}`);
          } catch {
            // Generate new wallet if loading fails
            keypair = Keypair.generate();
            console.log(`🆕 Generated new ${config.name} wallet: ${keypair.publicKey.toString()}`);
          }
        }
      } else {
        // Generate new wallet
        keypair = Keypair.generate();
        console.log(`🆕 Generated new ${config.name} wallet: ${keypair.publicKey.toString()}`);
      }

      this.testWallets.push({
        name: config.name,
        keypair,
        publicKey: keypair.publicKey.toString(),
        secretKey: JSON.stringify(Array.from(keypair.secretKey)),
      });
    }
  }

  /**
   * Fund test wallets with SOL from devnet faucet
   */
  private async fundTestWallets(): Promise<void> {
    console.log('💰 Funding test wallets...');

    for (const wallet of this.testWallets) {
      try {
        const balance = await this.connection.getBalance(wallet.keypair.publicKey);

        if (balance < MINIMUM_BALANCE) {
          console.log(`💸 Requesting airdrop for ${wallet.name} wallet...`);

          const signature = await this.connection.requestAirdrop(
            wallet.keypair.publicKey,
            AIRDROP_AMOUNT
          );

          // Wait for confirmation
          await this.connection.confirmTransaction(signature, 'confirmed');

          const newBalance = await this.connection.getBalance(wallet.keypair.publicKey);
          console.log(`✅ ${wallet.name} wallet funded: ${newBalance / LAMPORTS_PER_SOL} SOL`);
        } else {
          console.log(`✅ ${wallet.name} wallet already funded: ${balance / LAMPORTS_PER_SOL} SOL`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.warn(`⚠️ Failed to fund ${wallet.name} wallet:`, error);
        // Continue with other wallets
      }
    }
  }

  /**
   * Verify wallet balances
   */
  private async verifyWalletBalances(): Promise<void> {
    console.log('🔍 Verifying wallet balances...');

    for (const wallet of this.testWallets) {
      try {
        const balance = await this.connection.getBalance(wallet.keypair.publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;

        if (balance >= MINIMUM_BALANCE) {
          console.log(`✅ ${wallet.name}: ${solBalance} SOL (sufficient)`);
        } else {
          console.warn(`⚠️ ${wallet.name}: ${solBalance} SOL (insufficient, may affect tests)`);
        }
      } catch (error) {
        console.error(`❌ Failed to check balance for ${wallet.name}:`, error);
      }
    }
  }

  /**
   * Generate wallet configuration for tests
   */
  private async generateWalletConfig(): Promise<void> {
    console.log('📝 Generating wallet configuration...');

    const config = {
      devnet_rpc_url: DEVNET_RPC_URL,
      wallets: {},
      generated_at: new Date().toISOString(),
    };

    // Add wallet configurations
    for (const wallet of this.testWallets) {
      config.wallets[wallet.name] = {
        public_key: wallet.publicKey,
        secret_key: wallet.secretKey,
      };
    }

    // Write to test configuration file
    const configPath = join(__dirname, '../tests/config/test-wallets.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Wallet configuration saved to: ${configPath}`);

    // Update .env.test file with wallet addresses
    await this.updateEnvFile();
  }

  /**
   * Update .env.test file with generated wallet addresses
   */
  private async updateEnvFile(): Promise<void> {
    const envPath = '.env.test';
    let envContent = readFileSync(envPath, 'utf8');

    // Update wallet public keys and secret keys
    for (const wallet of this.testWallets) {
      const publicKeyVar = this.getPublicKeyEnvVar(wallet.name);
      const secretKeyVar = this.getSecretKeyEnvVar(wallet.name);

      if (publicKeyVar) {
        envContent = envContent.replace(
          new RegExp(`${publicKeyVar}=.*`),
          `${publicKeyVar}=${wallet.publicKey}`
        );
      }

      if (secretKeyVar) {
        envContent = envContent.replace(
          new RegExp(`${secretKeyVar}=.*`),
          `${secretKeyVar}=${wallet.secretKey}`
        );
      }
    }

    writeFileSync(envPath, envContent);
    console.log('✅ Updated .env.test with wallet addresses');
  }

  /**
   * Get public key environment variable name for wallet
   */
  private getPublicKeyEnvVar(walletName: string): string | null {
    const mapping = {
      treasury: 'TREASURY_WALLET_PUBLIC_KEY',
      admin: 'ADMIN_WALLET_PUBLIC_KEY',
      user1: 'TEST_USER_WALLET_1_PUBLIC',
      user2: 'TEST_USER_WALLET_2_PUBLIC',
    };
    return mapping[walletName] || null;
  }

  /**
   * Get secret key environment variable name for wallet
   */
  private getSecretKeyEnvVar(walletName: string): string | null {
    const mapping = {
      treasury: 'TREASURY_WALLET_SECRET_KEY',
      admin: 'ADMIN_WALLET_SECRET_KEY',
      user1: 'TEST_USER_WALLET_1_SECRET',
      user2: 'TEST_USER_WALLET_2_SECRET',
    };
    return mapping[walletName] || null;
  }

  /**
   * Test Solana RPC connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const blockHeight = await this.connection.getBlockHeight();
      console.log(`✅ Solana RPC connection successful - Block height: ${blockHeight}`);
      return true;
    } catch (error) {
      console.error('❌ Solana RPC connection failed:', error);
      return false;
    }
  }

  /**
   * Clean up test environment
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');
    // Add cleanup logic if needed
    console.log('✅ Cleanup completed');
  }
}

// Main execution
async function main() {
  const setup = new TestEnvironmentSetup();

  try {
    await setup.initialize();
    process.exit(0);
  } catch (error) {
    console.error('💥 Test environment setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { TestEnvironmentSetup };
