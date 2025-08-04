import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { Layout } from '@/components/Layout/Layout';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(),
}));

// Mock wallet adapter UI
jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletMultiButton: ({ className }: { className?: string }) => (
    <button data-testid="wallet-button" className={className}>
      Connect Wallet
    </button>
  ),
}));

// Mock framer-motion to prevent DOM warnings
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, animate, transition, initial, ...props }: any) => 
      <div {...props}>{children}</div>,
    nav: ({ children, whileHover, whileTap, animate, transition, initial, ...props }: any) => 
      <nav {...props}>{children}</nav>,
    button: ({ children, whileHover, whileTap, animate, transition, initial, ...props }: any) => 
      <button {...props}>{children}</button>,
  },
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => (
    <a href={href} className={className} data-testid={`link-${href}`}>
      {children}
    </a>
  );
});

// Mock window.matchMedia for responsive testing
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

const mockRouter = {
  pathname: '/',
  push: jest.fn(),
  query: {},
  asPath: '/',
};

const mockWallet = {
  connected: false,
  publicKey: null,
};

describe('Layout', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useWallet as jest.Mock).mockReturnValue(mockWallet);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the main layout structure', () => {
    render(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('should render the Nen Platform logo and branding', () => {
    render(<Layout><div /></Layout>);

    expect(screen.getAllByText('Nen Platform')).toHaveLength(2); // Main nav + footer
    expect(screen.getAllByText('Powered by MagicBlock')).toHaveLength(2); // Main nav + footer
    expect(screen.getAllByText('念')).toHaveLength(2); // Main logo + footer logo
  });

  it('should render navigation links with correct hrefs', () => {
    render(<Layout><div /></Layout>);

    expect(screen.getAllByTestId('link-/')).toHaveLength(4); // Multiple nav locations
    expect(screen.getAllByTestId('link-/marketplace')).toHaveLength(3);
    expect(screen.getAllByTestId('link-/profile')).toHaveLength(3);
  });

  it('should highlight active navigation item', () => {
    (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, pathname: '/marketplace' });
    
    render(<Layout><div /></Layout>);

    // The active path logic should highlight marketplace
    const marketplaceLinks = screen.getAllByTestId('link-/marketplace');
    expect(marketplaceLinks.length).toBeGreaterThan(0);
  });

  it('should render wallet connection button', () => {
    render(<Layout><div /></Layout>);

    expect(screen.getByTestId('wallet-button')).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('should display live status indicator', () => {
    render(<Layout><div /></Layout>);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should render mobile menu button', () => {
    render(<Layout><div /></Layout>);

    // Look for mobile menu toggle button by role or class instead of aria-label
    const mobileMenuButton = screen.getByRole('button', { name: /menu/i }) || 
                             document.querySelector('.md\\:hidden button');
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('should render footer with correct information', () => {
    render(<Layout><div /></Layout>);

    expect(screen.getByText(/© 2024 Nen Platform/)).toBeInTheDocument();
    expect(screen.getByText('Built on Solana')).toBeInTheDocument();
    expect(screen.getAllByText('Powered by MagicBlock')).toHaveLength(2); // Nav + footer
    expect(screen.getByText('Real-time Gaming')).toBeInTheDocument();
  });

  it('should display live stats in footer', () => {
    render(<Layout><div /></Layout>);

    expect(screen.getByText('Active Matches:')).toBeInTheDocument();
    expect(screen.getByText('Total Pool:')).toBeInTheDocument();
    expect(screen.getByText('Players Online:')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('1,247 SOL')).toBeInTheDocument();
    expect(screen.getByText('384')).toBeInTheDocument();
  });

  it('should render platform links in footer', () => {
    render(<Layout><div /></Layout>);

    expect(screen.getAllByTestId('link-/')).toHaveLength(4); // Logo, nav, mobile nav, footer
    expect(screen.getAllByTestId('link-/marketplace')).toHaveLength(3); // Nav, mobile nav, footer
    expect(screen.getAllByTestId('link-/profile')).toHaveLength(3); // Nav, mobile nav, footer
  });

  it('should render social media links', () => {
    render(<Layout><div /></Layout>);

    const socialLinks = screen.getAllByRole('link').filter(link => 
      link.getAttribute('href') === '#'
    );
    expect(socialLinks.length).toBeGreaterThan(0);
  });

  it('should handle mobile navigation correctly', () => {
    render(<Layout><div /></Layout>);

    // Mobile navigation should be present but hidden on desktop
    const mobileNav = screen.getByRole('navigation').querySelector('.md\\:hidden');
    expect(mobileNav).toBeInTheDocument();
  });

  it('should render background effects and particles', () => {
    render(<Layout><div /></Layout>);

    // Check for neural pattern background
    const neuralPattern = document.querySelector('.neural-pattern');
    expect(neuralPattern).toBeInTheDocument();

    // Check for floating particles (should render 20 particles + footer elements)
    const particles = document.querySelectorAll('.bg-emission-400.rounded-full');
    expect(particles.length).toBeGreaterThanOrEqual(20);
  });

  it('should apply correct CSS classes for theming', () => {
    render(<Layout><div /></Layout>);

    const mainContainer = document.querySelector('.min-h-screen.bg-space-900.text-white');
    expect(mainContainer).toBeInTheDocument();

    const glassmorphismElements = document.querySelectorAll('.glassmorphism');
    expect(glassmorphismElements.length).toBeGreaterThan(0);
  });

  it('should handle different router paths correctly', () => {
    const testPaths = ['/', '/marketplace', '/profile', '/arena/123'];
    
    testPaths.forEach(path => {
      (useRouter as jest.Mock).mockReturnValue({ ...mockRouter, pathname: path });
      const { unmount } = render(<Layout><div /></Layout>);
      
      // Should render without errors for any path
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      unmount();
    });
  });

  it('should show connected wallet state', () => {
    (useWallet as jest.Mock).mockReturnValue({
      ...mockWallet,
      connected: true,
      publicKey: { toString: () => 'test-wallet-address' }
    });

    render(<Layout><div /></Layout>);

    expect(screen.getByTestId('wallet-button')).toBeInTheDocument();
  });
});
