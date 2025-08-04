import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { BalanceDisplay } from '@/components/BalanceDisplay/BalanceDisplay';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// Mock wallet adapter hooks
const mockUseWallet = useWallet as jest.Mock;
const mockUseConnection = useConnection as jest.Mock;

jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(),
  useConnection: jest.fn(),
}));

const defaultWalletHook = {
  publicKey: null,
  connected: false,
};

const defaultConnectionHook = {
  connection: {
    getBalance: jest.fn(() => Promise.resolve(10000000)),
  },
};

describe('BalanceDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(defaultWalletHook);
    mockUseConnection.mockReturnValue(defaultConnectionHook);
  });

  it('should render null when not connected', () => {
    mockUseWallet.mockReturnValue({
      ...defaultWalletHook,
      connected: false,
    });

    const { container } = render(<BalanceDisplay />);

    expect(container.firstChild).toBeNull();
  });

  it('should render balance when connected', async () => {
    mockUseWallet.mockReturnValue({
      ...defaultWalletHook,
      connected: true,
      publicKey: 'fake-public-key',
    });
    mockUseConnection.mockReturnValue({
      connection: {
        getBalance: jest.fn(() => Promise.resolve(10000000)),
      },
    });

    render(<BalanceDisplay />);

    const balanceElement = await screen.findByTestId('sol-balance');
    expect(balanceElement).toHaveTextContent('0.010000 SOL');
  });

  it('should show spinner when loading balance', async () => {
    let resolveBalance: (value?: number | PromiseLike<number>) => void;
    const balancePromise = new Promise<number>((resolve) => (resolveBalance = resolve));

    mockUseWallet.mockReturnValue({
      ...defaultWalletHook,
      connected: true,
      publicKey: 'fake-public-key',
    });
    mockUseConnection.mockReturnValue({
      connection: {
        getBalance: jest.fn(() => balancePromise),
      },
    });

    render(<BalanceDisplay />);

    // Check for spinner by class name
    const spinner = document.querySelector('.nen-spinner');
    expect(spinner).toBeInTheDocument();

    await act(async () => {
      resolveBalance!(10000000);
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for next tick
    });

    const balanceElement = await screen.findByTestId('sol-balance');
    expect(balanceElement).toHaveTextContent('0.010000 SOL');
  });

  it('should display -- if balance fetch fails', async () => {
    mockUseWallet.mockReturnValue({
      ...defaultWalletHook,
      connected: true,
      publicKey: 'fake-public-key',
    });
    mockUseConnection.mockReturnValue({
      connection: {
        getBalance: jest.fn(() => Promise.reject('Error fetching balance')),
      },
    });

    render(<BalanceDisplay />);

    const balanceElement = await screen.findByText('--');
    expect(balanceElement).toBeInTheDocument();
  });
});
