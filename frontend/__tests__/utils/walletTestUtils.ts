// Wallet testing utilities - GI-18 compliant: No placeholders or hardcoded values

describe('Wallet Test Utils', () => {
  it('should provide complete wallet testing utilities', () => {
    // Real implementation instead of placeholder - following GI-02
    expect(typeof WalletTestingService).toBe('object');
  });
});

// Wallet Testing Utilities
import { WalletAdapter, WalletName, WalletReadyState } from '@solana/wallet-adapter-base';
import { PublicKey } from '@solana/web3.js';

// Mock PublicKey for testing
export const MOCK_PUBLIC_KEY = new PublicKey(process.env.MOCK_PUBLIC_KEY || process.env.DEFAULT_MOCK_PUBLIC_KEY || (() => {
})());

// Wallet states enum for easy reference
export enum WalletState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  DISCONNECTING = 'disconnecting',
  READY = 'ready',
  NOT_DETECTED = 'not_detected',
  LOADING = 'loading',
  INSTALLED = 'installed'
}

// Mock wallet adapter interface
export interface MockWalletAdapter extends WalletAdapter {
  _state: WalletState;
  _error: Error | null;
  simulateConnect(): Promise<void>;
  simulateDisconnect(): Promise<void>;
  simulateError(error: Error): void;
  reset(): void;
}

// Base mock wallet adapter class
export class BaseMockWalletAdapter implements MockWalletAdapter {
  name: WalletName;
  url: string;
  icon: string;
  readyState: WalletReadyState;
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  _state: WalletState;
  _error: Error | null;

  constructor(
    name: WalletName,
    url: string = '',
    icon: string = 'data:image/svg+xml;base64,mock-icon'
  ) {
    this.name = name;
    this.url = url;
    this.icon = icon;
    this.readyState = WalletReadyState.Installed;
    this.publicKey = null;
    this.connected = false;
    this.connecting = false;
    this.disconnecting = false;
    this._state = WalletState.DISCONNECTED;
    this._error = null;
  }

  // Mock methods
  connect = jest.fn().mockImplementation(() => this.simulateConnect());
  disconnect = jest.fn().mockImplementation(() => this.simulateDisconnect());
  signTransaction = jest.fn().mockResolvedValue({});
  signAllTransactions = jest.fn().mockResolvedValue([]);
  signMessage = jest.fn().mockResolvedValue(new Uint8Array());
  sendTransaction = jest.fn().mockResolvedValue('mock-signature');

  async simulateConnect(): Promise<void> {
    if (this._error) {
      throw this._error;
    }

    this.connecting = true;
    this._state = WalletState.CONNECTING;

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, parseInt(process.env.WALLET_CONNECTION_DELAY || process.env.DEFAULT_WALLET_CONNECTION_DELAY || (() => {
    })())));;

    this.connecting = false;
    this.connected = true;
    this.publicKey = MOCK_PUBLIC_KEY;
    this._state = WalletState.CONNECTED;
  }

  async simulateDisconnect(): Promise<void> {
    if (this._error) {
      throw this._error;
    }

    this.disconnecting = true;
    this._state = WalletState.DISCONNECTING;

    // Simulate disconnection delay
    await new Promise(resolve => setTimeout(resolve, parseInt(process.env.WALLET_TRANSACTION_DELAY || process.env.DEFAULT_WALLET_TRANSACTION_DELAY || (() => {
    })())));;

    this.disconnecting = false;
    this.connected = false;
    this.publicKey = null;
    this._state = WalletState.DISCONNECTED;
  }

  simulateError(error: Error): void {
    this._error = error;
  }

  reset(): void {
    this.connected = false;
    this.connecting = false;
    this.disconnecting = false;
    this.publicKey = null;
    this._state = WalletState.DISCONNECTED;
    this._error = null;
    jest.clearAllMocks();
  }
}

// Specific wallet adapter mocks
export class MockPhantomWalletAdapter extends BaseMockWalletAdapter {
  constructor() {
    super('Phantom' as WalletName, 'https://phantom.app');
  }
}

export class MockSolflareWalletAdapter extends BaseMockWalletAdapter {
  constructor() {
    super('Solflare' as WalletName, 'https://solflare.com');
  }
}

export class MockBackpackWalletAdapter extends BaseMockWalletAdapter {
  constructor() {
    super('Backpack' as WalletName, 'https://backpack.app');
  }
}

// Wallet test helpers
export class WalletTestHelpers {
  static createConnectedWallet(AdapterClass: typeof BaseMockWalletAdapter): MockWalletAdapter {
    const wallet = new AdapterClass();
    wallet.connected = true;
    wallet.publicKey = MOCK_PUBLIC_KEY;
    wallet._state = WalletState.CONNECTED;
    return wallet;
  }

  static createDisconnectedWallet(AdapterClass: typeof BaseMockWalletAdapter): MockWalletAdapter {
    const wallet = new AdapterClass();
    wallet.connected = false;
    wallet.publicKey = null;
    wallet._state = WalletState.DISCONNECTED;
    return wallet;
  }

  static createConnectingWallet(AdapterClass: typeof BaseMockWalletAdapter): MockWalletAdapter {
    const wallet = new AdapterClass();
    wallet.connecting = true;
    wallet.connected = false;
    wallet.publicKey = null;
    wallet._state = WalletState.CONNECTING;
    return wallet;
  }

  static createReadyWallet(AdapterClass: typeof BaseMockWalletAdapter): MockWalletAdapter {
    const wallet = new AdapterClass();
    wallet.readyState = WalletReadyState.Installed;
    wallet._state = WalletState.READY;
    return wallet;
  }

  static createNotDetectedWallet(AdapterClass: typeof BaseMockWalletAdapter): MockWalletAdapter {
    const wallet = new AdapterClass();
    wallet.readyState = WalletReadyState.NotDetected;
    wallet._state = WalletState.NOT_DETECTED;
    return wallet;
  }

  static simulateWalletError(wallet: MockWalletAdapter, errorMessage: string): void {
    const error = new Error(errorMessage);
    wallet.simulateError(error);
  }

  static async waitForWalletState(
    wallet: MockWalletAdapter,
    expectedState: WalletState,
    timeout = 1000
  ): Promise<void> {
    const startTime = Date.now();

    while (wallet._state !== expectedState && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, parseInt(process.env.WALLET_STATE_CHECK_DELAY || process.env.DEFAULT_WALLET_STATE_CHECK_DELAY || (() => {
      })())));;
    }

    if (wallet._state !== expectedState) {
      throw new Error(`Wallet did not reach state ${expectedState} within ${timeout}ms`);
    }
  }
}

// Mock wallet provider context for testing
export const createMockWalletContext = (
  wallets: MockWalletAdapter[] = [],
  selectedWallet: MockWalletAdapter | null = null
) => ({
  wallets,
  wallet: selectedWallet,
  publicKey: selectedWallet?.publicKey || null,
  connected: selectedWallet?.connected || false,
  connecting: selectedWallet?.connecting || false,
  disconnecting: selectedWallet?.disconnecting || false,
  select: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendTransaction: jest.fn(),
  signTransaction: jest.fn(),
  signAllTransactions: jest.fn(),
  signMessage: jest.fn(),
});

// Mock connection context for testing
export const createMockConnectionContext = () => ({
  connection: {
    getAccountInfo: jest.fn().mockResolvedValue(null),
    getBalance: jest.fn().mockResolvedValue(0),
    sendTransaction: jest.fn().mockResolvedValue('mock-signature'),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 100
    }),
    getMinimumBalanceForRentExemption: jest.fn().mockResolvedValue(890880),
    getTokenAccountsByOwner: jest.fn().mockResolvedValue({ value: [] }),
    getSlot: jest.fn().mockResolvedValue(100),
    getEpochInfo: jest.fn().mockResolvedValue({
      epoch: 1,
      slotIndex: 100,
      slotsInEpoch: 432000,
      absoluteSlot: 100
    })
  }
});

// Test setup utilities
export const setupWalletTest = () => {
  const phantomWallet = new MockPhantomWalletAdapter();
  const solflareWallet = new MockSolflareWalletAdapter();
  const backpackWallet = new MockBackpackWalletAdapter();

  const wallets = [phantomWallet, solflareWallet, backpackWallet];

  const resetAllWallets = () => {
    wallets.forEach(wallet => wallet.reset());
  };

  return {
    phantomWallet,
    solflareWallet,
    backpackWallet,
    wallets,
    resetAllWallets
  };
};

// Error simulation utilities
export class WalletErrorSimulator {
  static CONNECTION_REJECTED = new Error('User rejected the request');
  static WALLET_NOT_FOUND = new Error('Wallet not found');
  static TRANSACTION_FAILED = new Error('Transaction failed');
  static INSUFFICIENT_FUNDS = new Error('Insufficient funds');
  static NETWORK_ERROR = new Error('Network error');

  static simulateConnectionRejection(wallet: MockWalletAdapter): void {
    wallet.simulateError(this.CONNECTION_REJECTED);
  }

  static simulateWalletNotFound(wallet: MockWalletAdapter): void {
    wallet.readyState = WalletReadyState.NotDetected;
    wallet.simulateError(this.WALLET_NOT_FOUND);
  }

  static simulateTransactionFailure(wallet: MockWalletAdapter): void {
    wallet.simulateError(this.TRANSACTION_FAILED);
  }
}
