import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletSelector } from '@/components/WalletSelector/WalletSelector';
import { WalletReadyState } from '@solana/wallet-adapter-base';

// Mock wallet adapter hooks
const mockDisconnect = jest.fn();
const mockSelect = jest.fn();

const defaultWalletHook = {
  connected: false,
  connecting: false,
  disconnect: mockDisconnect,
  select: mockSelect,
  publicKey: null,
  wallets: [],
};

jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(() => defaultWalletHook),
}));

describe('WalletSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useWallet } = require('@solana/wallet-adapter-react');
    useWallet.mockReturnValue(defaultWalletHook);
  });

  it('should render wallet selection when not connected', () => {
    const { useWallet } = require('@solana/wallet-adapter-react');
    useWallet.mockReturnValue({
      ...defaultWalletHook,
      wallets: [
        {
          adapter: { name: 'Phantom', icon: 'phantom-icon.png' },
          readyState: WalletReadyState.Installed,
        },
        {
          adapter: { name: 'Solflare', icon: 'solflare-icon.png' },
          readyState: WalletReadyState.Installed,
        },
      ],
    });

    render(<WalletSelector />);
    
    expect(screen.getByText('Select Wallet')).toBeInTheDocument();
    expect(screen.getByText('Phantom')).toBeInTheDocument();
    expect(screen.getByText('Solflare')).toBeInTheDocument();
  });

  it('should render disconnect button when connected', () => {
    const { useWallet } = require('@solana/wallet-adapter-react');
    useWallet.mockReturnValue({
      ...defaultWalletHook,
      connected: true,
    });

    render(<WalletSelector />);
    
    const disconnectButton = screen.getByTestId('disconnect-wallet');
    expect(disconnectButton).toBeInTheDocument();
    expect(disconnectButton).toHaveTextContent('Disconnect');
  });

  it('should call disconnect when disconnect button is clicked', () => {
    const { useWallet } = require('@solana/wallet-adapter-react');
    useWallet.mockReturnValue({
      ...defaultWalletHook,
      connected: true,
    });

    render(<WalletSelector />);
    
    const disconnectButton = screen.getByTestId('disconnect-wallet');
    fireEvent.click(disconnectButton);
    
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should call select when wallet button is clicked', () => {
    const { useWallet } = require('@solana/wallet-adapter-react');
    useWallet.mockReturnValue({
      ...defaultWalletHook,
      wallets: [
        {
          adapter: { name: 'Phantom', icon: 'phantom-icon.png' },
          readyState: WalletReadyState.Installed,
        },
      ],
    });

    render(<WalletSelector />);
    
    const phantomButton = screen.getByTestId('wallet-phantom');
    fireEvent.click(phantomButton);
    
    expect(mockSelect).toHaveBeenCalledWith('Phantom');
  });

  it('should show no wallets message when no wallets are installed', () => {
    const { useWallet } = require('@solana/wallet-adapter-react');
    useWallet.mockReturnValue({
      ...defaultWalletHook,
      wallets: [],
    });

    render(<WalletSelector />);
    
    expect(screen.getByText('No wallets installed')).toBeInTheDocument();
    expect(screen.getByText('Install a Solana wallet to continue')).toBeInTheDocument();
  });

  it('should filter only installed wallets', () => {
    const { useWallet } = require('@solana/wallet-adapter-react');
    useWallet.mockReturnValue({
      ...defaultWalletHook,
      wallets: [
        {
          adapter: { name: 'Phantom', icon: 'phantom-icon.png' },
          readyState: WalletReadyState.Installed,
        },
        {
          adapter: { name: 'Solflare', icon: 'solflare-icon.png' },
          readyState: WalletReadyState.NotDetected,
        },
      ],
    });

    render(<WalletSelector />);
    
    expect(screen.getByText('Phantom')).toBeInTheDocument();
    expect(screen.queryByText('Solflare')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const customClass = 'custom-selector';
    render(<WalletSelector className={customClass} />);
    
    const container = screen.getByText('Select Wallet').closest('div');
    expect(container).toHaveClass(customClass);
  });
});
