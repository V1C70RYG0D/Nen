import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Layout } from '@/components/Layout/Layout';

// Mock next/router
const mockRouter = {
  pathname: '/',
  push: jest.fn(),
  query: {},
  asPath: '/',
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: false,
    publicKey: null,
  }),
}));

// Mock wallet adapter UI
jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletMultiButton: () => <button data-testid="wallet-button">Connect Wallet</button>,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock utility functions
jest.mock('@/utils/screenReader', () => ({
  announceNavigation: jest.fn(),
}));

jest.mock('@/utils/mobileAccessibility', () => ({
  isMobileDevice: jest.fn(() => false),
  configureTouchButton: jest.fn(),
  TouchGestureHandler: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
  })),
  announceMobile: jest.fn(),
  addHapticFeedback: jest.fn(),
}));

describe('Navigation Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Day 1-2: Layout and Navigation Rendering Tests', () => {
    it('should render navigation with proper ARIA attributes', () => {
      render(<Layout><div>Test</div></Layout>);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('should render logo with proper accessibility attributes', () => {
      render(<Layout><div>Test</div></Layout>);
      
      const logoLink = screen.getByLabelText('Nen Platform Home');
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute('href', '/');
    });

    it('should render all navigation items', () => {
      render(<Layout><div>Test</div></Layout>);
      
      expect(screen.getByText('Arena')).toBeInTheDocument();
      expect(screen.getByText('Marketplace')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should highlight active navigation item correctly', () => {
      mockRouter.pathname = '/marketplace';
      render(<Layout><div>Test</div></Layout>);
      
      // The marketplace link should be active
      const marketplaceLinks = screen.getAllByText('Marketplace');
      expect(marketplaceLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Day 1-2: Navigation Interactivity Tests', () => {
    it('should handle navigation clicks', async () => {
      const user = userEvent.setup();
      render(<Layout><div>Test</div></Layout>);
      
      const arenaLink = screen.getAllByText('Arena')[0];
      await user.click(arenaLink);
      
      // Link should be clickable (it's an anchor tag)
      expect(arenaLink.closest('a')).toHaveAttribute('href', '/');
    });

    it('should toggle mobile menu on button click', async () => {
      const user = userEvent.setup();
      render(<Layout><div>Test</div></Layout>);
      
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toBeInTheDocument();
      
      await user.click(mobileMenuButton);
      // Mobile menu functionality should be testable
    });

    it('should handle keyboard navigation with shortcuts', () => {
      render(<Layout><div>Test</div></Layout>);
      
      // Simulate Ctrl+1 for Arena navigation
      fireEvent.keyDown(window, { key: '1', ctrlKey: true });
      
      // This would trigger navigation in real implementation
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('should provide skip link for accessibility', () => {
      render(<Layout><div>Test</div></Layout>);
      
      const skipLink = screen.getByText('Skip to content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });
  });

  describe('Day 1-2: Responsive Design Tests', () => {
    it('should render mobile navigation correctly', () => {
      render(<Layout><div>Test</div></Layout>);
      
      // Mobile navigation should be present but hidden on desktop by default
      const mobileNav = document.querySelector('.md\\:hidden');
      expect(mobileNav).toBeInTheDocument();
    });

    it('should display wallet button correctly', () => {
      render(<Layout><div>Test</div></Layout>);
      
      const walletButton = screen.getByTestId('wallet-button');
      expect(walletButton).toBeInTheDocument();
      expect(walletButton).toHaveTextContent('Connect Wallet');
    });

    it('should render connection status indicator', () => {
      render(<Layout><div>Test</div></Layout>);
      
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  describe('Day 1-2: Layout Background and Visual Effects', () => {
    it('should render background effects', () => {
      render(<Layout><div>Test</div></Layout>);
      
      // Check for neural pattern background
      const neuralPattern = document.querySelector('.neural-pattern');
      expect(neuralPattern).toBeInTheDocument();
    });

    it('should render floating particles', () => {
      render(<Layout><div>Test</div></Layout>);
      
      // Check for floating particles (20 particles expected)
      const particles = document.querySelectorAll('.bg-emission-400.rounded-full');
      expect(particles.length).toBeGreaterThanOrEqual(20);
    });

    it('should apply correct theme classes', () => {
      render(<Layout><div>Test</div></Layout>);
      
      const mainContainer = document.querySelector('.min-h-screen.bg-space-900.text-white');
      expect(mainContainer).toBeInTheDocument();
      
      const glassmorphismElements = document.querySelectorAll('.glassmorphism');
      expect(glassmorphismElements.length).toBeGreaterThan(0);
    });
  });

  describe('Day 1-2: Footer Component Tests', () => {
    it('should render footer with all sections', () => {
      render(<Layout><div>Test</div></Layout>);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      
      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Live Stats')).toBeInTheDocument();
    });

    it('should display correct live stats', () => {
      render(<Layout><div>Test</div></Layout>);
      
      expect(screen.getByText('Active Matches:')).toBeInTheDocument();
      expect(screen.getByText('Total Pool:')).toBeInTheDocument();
      expect(screen.getByText('Players Online:')).toBeInTheDocument();
      
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('1,247 SOL')).toBeInTheDocument();
      expect(screen.getByText('384')).toBeInTheDocument();
    });

    it('should render social media links with proper attributes', () => {
      render(<Layout><div>Test</div></Layout>);
      
      const discordLink = screen.getByLabelText('Join our Discord community');
      const twitterLink = screen.getByLabelText('Follow us on Twitter');
      
      expect(discordLink).toBeInTheDocument();
      expect(twitterLink).toBeInTheDocument();
    });
  });

  describe('Day 1-2: Mobile Accessibility Tests', () => {
    it('should configure touch buttons for mobile', () => {
      const { isMobileDevice, configureTouchButton } = require('@/utils/mobileAccessibility');
      isMobileDevice.mockReturnValue(true);
      
      render(<Layout><div>Test</div></Layout>);
      
      // Mobile configuration should be called
      expect(configureTouchButton).toHaveBeenCalled();
    });

    it('should handle touch gestures on mobile menu', () => {
      const { TouchGestureHandler } = require('@/utils/mobileAccessibility');
      
      render(<Layout><div>Test</div></Layout>);
      
      // Touch gesture handler should be initialized for mobile
      expect(TouchGestureHandler).toHaveBeenCalled();
    });

    it('should provide proper touch target sizes', () => {
      render(<Layout><div>Test</div></Layout>);
      
      const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
      expect(mobileMenuButton).toHaveClass('min-w-[44px]', 'min-h-[44px]');
    });
  });

  describe('Day 1-2: Error State and Edge Case Tests', () => {
    it('should handle different router paths correctly', () => {
      const testPaths = ['/', '/marketplace', '/profile', '/arena/123'];
      
      testPaths.forEach(path => {
        mockRouter.pathname = path;
        const { unmount } = render(<Layout><div>Test</div></Layout>);
        
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle wallet connection state changes', () => {
      const mockUseWallet = require('@solana/wallet-adapter-react').useWallet;
      mockUseWallet.mockReturnValue({
        connected: true,
        publicKey: { toString: () => 'test-wallet-address' }
      });
      
      render(<Layout><div>Test</div></Layout>);
      
      const walletButton = screen.getByTestId('wallet-button');
      expect(walletButton).toBeInTheDocument();
    });

    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<Layout><div>Test</div></Layout>);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });
});
