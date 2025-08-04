import React from 'react';
import { render, screen } from '@testing-library/react';
import { BetForm } from '../../../components/BetForm/BetForm';
import { useWallet } from '@solana/wallet-adapter-react';

// Mock dependencies
jest.mock('@solana/wallet-adapter-react');
jest.mock('@/utils/format', () => ({
  formatSOL: jest.fn((value: number) => `${(value / 1000000000).toFixed(3)} SOL`),
}));
jest.mock('@/utils/validation', () => ({
  validateSOLAmount: jest.fn(() => ({ isValid: true, sanitizedValue: 1.0 })),
  validateBetAmount: jest.fn(() => ({ isValid: true })),
}));
jest.mock('framer-motion', () => ({
  motion: {
    form: 'form',
    button: 'button',
    p: 'p',
  },
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const mockWalletData = {
  connected: true,
  publicKey: { toString: () => 'test-wallet-address' },
  connecting: false,
  disconnecting: false,
};

describe('BetForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockUseWallet.mockReturnValue(mockWalletData);
    jest.clearAllMocks();
  });

  it('should render the bet form', () => {
    render(<BetForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Place Your Bet')).toBeInTheDocument();
    expect(screen.getByText('Select Agent')).toBeInTheDocument();
    expect(screen.getByText('Bet Amount')).toBeInTheDocument();
    expect(screen.getByTestId('submit-bet-button')).toBeInTheDocument();
  });

  it('should show loading state when isLoading is true', () => {
    render(<BetForm onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByText('Placing Bet...')).toBeInTheDocument();
  });

  it('should show connect wallet message when not connected', () => {
    mockUseWallet.mockReturnValue({ ...mockWalletData, connected: false });
    
    render(<BetForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Connect Wallet to Bet')).toBeInTheDocument();
  });
});
