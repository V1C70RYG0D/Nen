// Mock for @solana/wallet-adapter-walletconnect
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
};
