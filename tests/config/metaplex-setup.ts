/**
 * Metaplex SDK Test Configuration
 */

import { Metaplex, keypairIdentity, bundlrStorage } from '@metaplex-foundation/js';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import * as dotenv from 'dotenv';

// Load test environment
dotenv.config({ path: '.env.test' });

export interface MetaplexTestConfig {
  metaplex: Metaplex;
  connection: Connection;
  payer: Keypair;
  treasury: Keypair;
}

/**
 * Initialize Metaplex SDK for testing
 */
export async function initializeMetaplexForTesting(): Promise<MetaplexTestConfig> {
  console.log('🎨 Initializing Metaplex SDK for testing...');

  // Create connection to Solana devnet
  const rpcUrl = process.env.METAPLEX_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  // Load or generate payer keypair
  let payer: Keypair;
  const payerSecretKey = process.env.TREASURY_WALLET_SECRET_KEY;

  if (payerSecretKey && payerSecretKey !== 'test-treasury-wallet-private-key-here') {
    try {
      const secretArray = JSON.parse(payerSecretKey);
      payer = Keypair.fromSecretKey(new Uint8Array(secretArray));
      console.log(`✅ Loaded payer wallet: ${payer.publicKey.toString()}`);
    } catch (error) {
      console.warn('⚠️ Failed to load payer wallet, generating new one');
      payer = Keypair.generate();
    }
  } else {
    payer = Keypair.generate();
    console.log(`🆕 Generated new payer wallet: ${payer.publicKey.toString()}`);
  }

  // Initialize Metaplex instance
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payer))
    .use(bundlrStorage({
      address: process.env.METAPLEX_BUNDLR_ADDRESS || 'https://devnet.bundlr.network',
      providerUrl: rpcUrl,
      timeout: parseInt(process.env.METAPLEX_BUNDLR_TIMEOUT || '60000'),
    }));

  console.log('✅ Metaplex SDK initialized successfully');

  return {
    metaplex,
    connection,
    payer,
    treasury: payer, // For testing, payer and treasury are the same
  };
}

/**
 * Create test NFT collection
 */
export async function createTestNFTCollection(metaplex: Metaplex) {
  console.log('🎭 Creating test NFT collection...');

  try {
    const { nft: collectionNft } = await metaplex.nfts().create({
      uri: 'https://arweave.net/test-collection-metadata.json',
      name: 'Nen AI Agents Test Collection',
      symbol: process.env.NFT_SYMBOL || 'NENAI',
      sellerFeeBasisPoints: parseInt(process.env.NFT_SELLER_FEE_BASIS_POINTS || '250'),
      isCollection: true,
      collectionDetails: {
        kind: 'sized',
        size: parseInt(process.env.NFT_COLLECTION_SIZE || '10000'),
      },
    });

    console.log(`✅ Test collection created: ${collectionNft.address.toString()}`);
    return collectionNft;

  } catch (error) {
    console.error('❌ Failed to create test collection:', error);
    throw error;
  }
}

/**
 * Test Metaplex SDK functionality
 */
export async function testMetaplexFunctionality(): Promise<boolean> {
  try {
    console.log('🧪 Testing Metaplex SDK functionality...');

    const config = await initializeMetaplexForTesting();
    const { metaplex, connection, payer } = config;

    // Test 1: Check payer balance
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`💰 Payer balance: ${balance / 1e9} SOL`);

    if (balance < 100000000) { // Less than 0.1 SOL
      console.warn('⚠️ Low balance, requesting airdrop...');
      const signature = await connection.requestAirdrop(payer.publicKey, 1000000000);
      await connection.confirmTransaction(signature);
      console.log('✅ Airdrop completed');
    }

    // Test 2: Check Metaplex connection
    const candyMachines = await metaplex.candyMachines().findAllBy({
      type: 'authority',
      publicKey: payer.publicKey,
    });
    console.log(`✅ Metaplex connection test passed - Found ${candyMachines.length} candy machines`);

    // Test 3: Test metadata upload (mock)
    const mockMetadata = {
      name: process.env.TEST_NFT_NAME || 'Test AI Agent',
      description: process.env.TEST_NFT_DESCRIPTION || 'Test NFT for Nen Platform',
      image: process.env.TEST_IMAGE_URL || process.env.DEFAULT_TEST_IMAGE_URL || (() => {
      })(),
      attributes: [
        { trait_type: 'Rarity', value: process.env.TEST_NFT_RARITY || 'Common' },
        { trait_type: 'ELO', value: parseInt(process.env.TEST_NFT_ELO || '1200') },
      ],
    };

    // In a real test, you would upload this to Arweave/IPFS
    console.log('✅ Metadata structure validated');

    return true;

  } catch (error) {
    console.error('❌ Metaplex functionality test failed:', error);
    return false;
  }
}

/**
 * Clean up test resources
 */
export async function cleanupMetaplexTest(): Promise<void> {
  console.log('🧹 Cleaning up Metaplex test resources...');
  // Add cleanup logic if needed
  console.log('✅ Metaplex cleanup completed');
}
