// Mock wallet states
export const mockWalletState = (wallet: any, state: string) => {
  switch (state) {
    case 'connected':
      wallet.connected = true;
      wallet.publicKey = { toBase58: () => 'mock-public-key' };
      break;
    case 'disconnected':
      wallet.connected = false;
      wallet.publicKey = null;
      break;
    case 'ready':
      wallet.readyState = 'Ready';
      break;
    default:
      wallet.connected = false;
      wallet.readyState = 'Installed';
  }
};

// jest.setup.ts
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { TextEncoder, TextDecoder } from 'util';

// Set environment variables for testing - GI-18 compliance
if (!process.env.NEXT_PUBLIC_RPC_URL) {
  process.env.NEXT_PUBLIC_RPC_URL = 'https://api.devnet.solana.com';
}
if (!process.env.NEXT_PUBLIC_WS_URL) {
  process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3001';
}
if (!process.env.NEXT_PUBLIC_PROGRAM_ID) {
  process.env.NEXT_PUBLIC_PROGRAM_ID = 'TestProgramId';
}
if (!process.env.NEXT_PUBLIC_MAGICBLOCK_URL) {
  process.env.NEXT_PUBLIC_MAGICBLOCK_URL = 'wss://magicblock.dev';
}
if (!process.env.NEXT_PUBLIC_NETWORK) {
  process.env.NEXT_PUBLIC_NETWORK = 'devnet';
}

// Extend Jest matchers
(expect as any).extend(toHaveNoViolations);

// Global polyfills
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

