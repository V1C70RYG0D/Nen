import { PublicKey } from '@solana/web3.js';

/**
 * Devnet configuration for NEN Platform
 * All programs deployed on Solana Devnet
 * Deployment Date: 2025-01-10
 */

export const DEVNET_CONFIG = {
  // Network Configuration
  network: 'devnet' as const,
  rpcEndpoint: 'https://api.devnet.solana.com',
  wsEndpoint: 'wss://api.devnet.solana.com/',
  
  // Deployed Program IDs
  programs: {
    betting: new PublicKey(process.env.NEXT_PUBLIC_BETTING_PROGRAM_ID || '34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5'),
    core: new PublicKey(process.env.NEXT_PUBLIC_CORE_PROGRAM_ID || 'Xs4PKxWNyY1C7i5bdqMh5tNhwPbDbxMXf4YcJAreJcF'),
    magicblock: new PublicKey(process.env.NEXT_PUBLIC_MAGICBLOCK_PROGRAM_ID || 'AhGXiWjzKjd8T7J3FccYk51y4D97jGkZ7d7NJfmb3aFX'),
  },
  
  // Program Metadata
  programInfo: {
    betting: {
      name: 'NEN Betting Program',
      description: 'Handles all betting operations including deposits, withdrawals, bet placement, and payouts',
      deployedSlot: 400389615,
      size: 245584,
    },
    core: {
      name: 'NEN Core Program',
      description: 'Core platform functionality including AI agents, matches, and platform state',
      deployedSlot: 400395438,
      size: 405080,
    },
    magicblock: {
      name: 'NEN MagicBlock Program',
      description: 'Integration with MagicBlock ephemeral rollups for real-time gaming',
      deployedSlot: 400395452,
      size: 332992,
    },
  },
  
  // API Endpoints (local development)
  api: {
    backend: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    websocket: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    ai: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:3003',
  },
  
  // External Services
  external: {
    magicblock: {
      api: 'https://api.magicblock.io',
      ws: 'wss://api.magicblock.io',
    },
    ipfs: {
      gateway: 'https://gateway.pinata.cloud/ipfs',
      api: 'https://api.pinata.cloud',
    },
  },
  
  // Feature Flags
  features: {
    betting: true,
    aiTraining: true,
    gaming: true,
    nftMarketplace: true,
    debug: true,
  },
  
  // Transaction Settings
  transaction: {
    confirmationLevel: 'confirmed' as const,
    skipPreflight: false,
    maxRetries: 3,
  },
  
  // Betting Limits
  betting: {
    minDeposit: 0.1, // SOL
    maxDeposit: 1000, // SOL
    minBet: 0.1, // SOL
    maxBet: 100, // SOL
    platformFee: 0.05, // 5%
    withdrawalCooldown: 24 * 60 * 60, // 24 hours in seconds
  },
  
  // AI Training Settings
  training: {
    baseRatePerHour: 0.01, // SOL
    minTrainingHours: 1,
    maxTrainingHours: 24,
    treasuryShare: 0.8, // 80%
    computeProviderShare: 0.2, // 20%
  },
  
  // NFT Marketplace Settings
  marketplace: {
    mintingFee: 0.1, // SOL
    marketplaceFee: 0.025, // 2.5%
    creatorRoyalty: 0.05, // 5%
    listingExpiryDays: 30,
  },
  
  // Game Settings
  gaming: {
    defaultTimeControl: '10+5', // 10 minutes + 5 second increment
    maxLatency: 100, // milliseconds
    sessionTimeout: 3600, // 1 hour in seconds
  },
};

// Helper function to get program ID by name
export function getProgramId(programName: 'betting' | 'core' | 'magicblock'): PublicKey {
  return DEVNET_CONFIG.programs[programName];
}

// Helper function to get program info
export function getProgramInfo(programName: 'betting' | 'core' | 'magicblock') {
  return DEVNET_CONFIG.programInfo[programName];
}

// Export individual program IDs for convenience
export const BETTING_PROGRAM_ID = DEVNET_CONFIG.programs.betting;
export const CORE_PROGRAM_ID = DEVNET_CONFIG.programs.core;
export const MAGICBLOCK_PROGRAM_ID = DEVNET_CONFIG.programs.magicblock;

// Check if we're on devnet
export const isDevnet = () => DEVNET_CONFIG.network === 'devnet';

// Get the full RPC configuration
export const getRpcConfig = () => ({
  endpoint: DEVNET_CONFIG.rpcEndpoint,
  wsEndpoint: DEVNET_CONFIG.wsEndpoint,
  confirmationLevel: DEVNET_CONFIG.transaction.confirmationLevel,
});

export default DEVNET_CONFIG;
