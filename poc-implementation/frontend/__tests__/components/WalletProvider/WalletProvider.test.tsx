import React from 'react';
import { render, screen } from '@testing-library/react';
import { WalletContextProvider } from '@/components/WalletProvider/WalletProvider';

// Mock wallet adapter modules
jest.mock('@solana/wallet-adapter-react', () => ({
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="connection-provider">{children}</div>,
  WalletProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="wallet-provider">{children}</div>,
}));

jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletModalProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="wallet-modal-provider">{children}</div>,
}));

jest.mock('@solana/wallet-adapter-wallets', () => ({
  PhantomWalletAdapter: jest.fn(() => ({ name: 'Phantom' })),
  SolflareWalletAdapter: jest.fn(() => ({ name: 'Solflare' })),
  CoinbaseWalletAdapter: jest.fn(() => ({ name: 'Coinbase' })),
  LedgerWalletAdapter: jest.fn(() => ({ name: 'Ledger' })),
  TorusWalletAdapter: jest.fn(() => ({ name: 'Torus' })),
}));

jest.mock('@solana/web3.js', () => ({
  clusterApiUrl: jest.fn(() => 'https://api.devnet.solana.com'),
}));

// Mock CSS import
jest.mock('@solana/wallet-adapter-react-ui/styles.css', () => ({}));

describe('WalletContextProvider', () => {
  const TestChild = () => <div data-testid="test-child">Test Child</div>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    // Clear environment variables
    delete process.env.NEXT_PUBLIC_NETWORK;
    delete process.env.NEXT_PUBLIC_RPC_URL;
  });

  it('should render children wrapped in wallet providers', () => {
    render(
      <WalletContextProvider>
        <TestChild />
      </WalletContextProvider>
    );

    expect(screen.getByTestId('connection-provider')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-provider')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-modal-provider')).toBeInTheDocument();
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('should use default devnet network when no environment variable is set', () => {
    const { clusterApiUrl } = require('@solana/web3.js');
    
    render(
      <WalletContextProvider>
        <TestChild />
      </WalletContextProvider>
    );

    expect(clusterApiUrl).toHaveBeenCalledWith('devnet');
  });

  it('should use custom RPC URL when provided', () => {
    process.env.NEXT_PUBLIC_RPC_URL = 'https://custom-rpc.com';
    
    render(
      <WalletContextProvider>
        <TestChild />
      </WalletContextProvider>
    );

    // Since we're using a custom RPC URL, clusterApiUrl should not be called
    expect(require('@solana/web3.js').clusterApiUrl).not.toHaveBeenCalled();
  });

  it('should use mainnet network when specified', () => {
    process.env.NEXT_PUBLIC_NETWORK = 'mainnet-beta';
    const { clusterApiUrl } = require('@solana/web3.js');
    
    render(
      <WalletContextProvider>
        <TestChild />
      </WalletContextProvider>
    );

    expect(clusterApiUrl).toHaveBeenCalledWith('mainnet-beta');
  });

  it('should initialize all wallet adapters', () => {
    const { 
      PhantomWalletAdapter, 
      SolflareWalletAdapter, 
      CoinbaseWalletAdapter, 
      LedgerWalletAdapter, 
      TorusWalletAdapter 
    } = require('@solana/wallet-adapter-wallets');

    render(
      <WalletContextProvider>
        <TestChild />
      </WalletContextProvider>
    );

    expect(PhantomWalletAdapter).toHaveBeenCalled();
    expect(SolflareWalletAdapter).toHaveBeenCalled();
    expect(CoinbaseWalletAdapter).toHaveBeenCalled();
    expect(LedgerWalletAdapter).toHaveBeenCalled();
    expect(TorusWalletAdapter).toHaveBeenCalled();
  });

  it('should have correct provider hierarchy', () => {
    render(
      <WalletContextProvider>
        <TestChild />
      </WalletContextProvider>
    );

    const connectionProvider = screen.getByTestId('connection-provider');
    const walletProvider = screen.getByTestId('wallet-provider');
    const walletModalProvider = screen.getByTestId('wallet-modal-provider');
    const testChild = screen.getByTestId('test-child');

    expect(connectionProvider).toContainElement(walletProvider);
    expect(walletProvider).toContainElement(walletModalProvider);
    expect(walletModalProvider).toContainElement(testChild);
  });
});
