// Mock for @solana/wallet-adapter-wallets
module.exports = {
  WalletConnectWalletAdapter: class MockWalletConnectWalletAdapter {
    constructor() {
      this.name = 'WalletConnect';
      this.url = 'https://walletconnect.org';
      this.icon = 'data:image/svg+xml;base64,mock-icon';
      this.readyState = 'Installed';
      this.publicKey = null;
      this.connected = false;
    }

    connect = jest.fn().mockResolvedValue(undefined);
    disconnect = jest.fn().mockResolvedValue(undefined);
    signTransaction = jest.fn().mockResolvedValue({});
    signAllTransactions = jest.fn().mockResolvedValue([]);
    signMessage = jest.fn().mockResolvedValue(new Uint8Array());
  },

  PhantomWalletAdapter: class MockPhantomWalletAdapter {
    constructor() {
      this.name = 'Phantom';
      this.url = 'https://phantom.app';
      this.icon = 'data:image/svg+xml;base64,mock-icon';
      this.readyState = 'Installed';
      this.publicKey = null;
      this.connected = false;
    }

    connect = jest.fn().mockResolvedValue(undefined);
    disconnect = jest.fn().mockResolvedValue(undefined);
    signTransaction = jest.fn().mockResolvedValue({});
    signAllTransactions = jest.fn().mockResolvedValue([]);
    signMessage = jest.fn().mockResolvedValue(new Uint8Array());
  },

  SolflareWalletAdapter: class MockSolflareWalletAdapter {
    constructor() {
      this.name = 'Solflare';
      this.url = 'https://solflare.com';
      this.icon = 'data:image/svg+xml;base64,mock-icon';
      this.readyState = 'Installed';
      this.publicKey = null;
      this.connected = false;
    }

    connect = jest.fn().mockResolvedValue(undefined);
    disconnect = jest.fn().mockResolvedValue(undefined);
    signTransaction = jest.fn().mockResolvedValue({});
    signAllTransactions = jest.fn().mockResolvedValue([]);
    signMessage = jest.fn().mockResolvedValue(new Uint8Array());
  },

  LedgerWalletAdapter: class MockLedgerWalletAdapter {
    constructor() {
      this.name = 'Ledger';
      this.url = 'https://ledger.com';
      this.icon = 'data:image/svg+xml;base64,mock-icon';
      this.readyState = 'Installed';
      this.publicKey = null;
      this.connected = false;
    }

    connect = jest.fn().mockResolvedValue(undefined);
    disconnect = jest.fn().mockResolvedValue(undefined);
    signTransaction = jest.fn().mockResolvedValue({});
    signAllTransactions = jest.fn().mockResolvedValue([]);
    signMessage = jest.fn().mockResolvedValue(new Uint8Array());
  },
  BackpackWalletAdapter: class MockBackpackWalletAdapter {
    constructor() {
      this.name = 'Backpack';
      this.url = 'https://backpack.com';
      this.icon = 'data:image/svg+xml;base64,mock-icon';
      this.readyState = 'Installed';
      this.publicKey = null;
      this.connected = false;
    }

    connect = jest.fn().mockResolvedValue(undefined);
    disconnect = jest.fn().mockResolvedValue(undefined);
    signTransaction = jest.fn().mockResolvedValue({});
    signAllTransactions = jest.fn().mockResolvedValue([]);
    signMessage = jest.fn().mockResolvedValue(new Uint8Array());
  },
};
