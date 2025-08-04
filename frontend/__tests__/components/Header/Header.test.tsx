import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '@/components/Header/Header';
import { useWallet } from '@solana/wallet-adapter-react';

// Mock dependencies
jest.mock('@solana/wallet-adapter-react');
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    push: jest.fn(),
  }),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const mockWalletData = {
  connected: true,
  publicKey: { toString: () => 'test-wallet-address' },
  connecting: false,
  disconnecting: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
};

describe('Header', () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue(mockWalletData);
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the header with logo and navigation', () => {
      render(<Header />);
      
      expect(screen.getByText('念')).toBeInTheDocument(); // Logo
      expect(screen.getByText('Nen Platform')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should display navigation links', () => {
      render(<Header />);
      
      expect(screen.getByText('Matches')).toBeInTheDocument();
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    it('should show wallet connection status', () => {
      render(<Header />);
      
      expect(screen.getByText(/test-wallet-address/i)).toBeInTheDocument();
    });

    it('should show connect wallet button when not connected', () => {
      mockUseWallet.mockReturnValue({ ...mockWalletData, connected: false });
      
      render(<Header />);
      
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should handle wallet connection', async () => {
      const user = userEvent.setup();
      mockUseWallet.mockReturnValue({ ...mockWalletData, connected: false });
      
      render(<Header />);
      
      const connectButton = screen.getByText('Connect Wallet');
      await user.click(connectButton);
      
      expect(mockWalletData.connect).toHaveBeenCalled();
    });

    it('should handle wallet disconnection', async () => {
      const user = userEvent.setup();
      
      render(<Header />);
      
      const walletButton = screen.getByText(/test-wallet-address/i);
      await user.click(walletButton);
      
      const disconnectButton = screen.getByText('Disconnect');
      await user.click(disconnectButton);
      
      expect(mockWalletData.disconnect).toHaveBeenCalled();
    });

    it('should show loading state when connecting', () => {
      mockUseWallet.mockReturnValue({ ...mockWalletData, connecting: true, connected: false });
      
      render(<Header />);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Header />);
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      mockUseWallet.mockReturnValue({ ...mockWalletData, connected: false });
      
      render(<Header />);
      
      const connectButton = screen.getByText('Connect Wallet');
      await user.tab();
      
      expect(connectButton).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('should show mobile menu toggle on small screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 768 });
      window.dispatchEvent(new Event('resize'));
      
      render(<Header />);
      
      expect(screen.getByLabelText('Toggle mobile menu')).toBeInTheDocument();
    });
  });
});
