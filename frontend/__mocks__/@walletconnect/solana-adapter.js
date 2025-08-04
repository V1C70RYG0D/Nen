// Mock for @walletconnect/solana-adapter
module.exports = {
  WalletConnectWalletAdapter: class MockWalletConnectAdapter {
    constructor() {
      this.name = 'WalletConnect';
      this.url = 'https://walletconnect.org';
      this.icon = 'data:image/svg+xml;base64,mock-icon';
      this.readyState = 'Installed';
      this.publicKey = null;
      this.connected = false;
      this.connecting = false;
      this.disconnecting = false;
    }

    connect = jest.fn().mockResolvedValue(undefined);
    disconnect = jest.fn().mockResolvedValue(undefined);
    signTransaction = jest.fn().mockResolvedValue({});
    signAllTransactions = jest.fn().mockResolvedValue([]);
    signMessage = jest.fn().mockResolvedValue(new Uint8Array());
    sendTransaction = jest.fn().mockResolvedValue('mock-signature');
  },

  WalletAdapterNetwork: {
    Mainnet: 'mainnet-beta',
    Testnet: 'testnet',
    Devnet: 'devnet',
  },
};
