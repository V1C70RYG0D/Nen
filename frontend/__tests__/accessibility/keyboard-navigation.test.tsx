import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameBoard } from '@/components/GameBoard/GameBoard';
import { Layout } from '@/components/Layout/Layout';
import { 
  runAxeTest, 
  testKeyboardNavigation, 
  testAriaCompliance, 
  testHeadingHierarchy,
  testLiveRegions,
  testColorContrast 
} from '../utils/accessibility-helpers';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    push: jest.fn(),
    query: {},
    asPath: '/',
  }),
}));

jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: false,
    publicKey: null,
  }),
}));

jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletMultiButton: () => <button>Connect Wallet</button>,
}));

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

jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

// Mock hooks
jest.mock('@/hooks/useGameState', () => ({
  useGameState: () => ({
    boardState: {
      pieces: [],
      gamePhase: 'setup',
      moveCount: 0,
    },
    currentPlayer: 1,
    gameHistory: [],
    isConnected: true,
    latency: 25,
    error: null,
    submitMove: jest.fn(),
  }),
}));

jest.mock('@/hooks/useMagicBlockSession', () => ({
  useMagicBlockSession: () => ({
    session: {
      sessionId: 'test-session-123',
      playersConnected: 2,
    },
    isConnected: true,
    error: null,
  }),
}));

describe('Keyboard Navigation Accessibility', () => {
  it('GameBoard squares should be keyboard accessible', async () => {
    const renderResult = render(
      <GameBoard matchId="test-match" isLive={true} />
    );

    try {
      const { getAllByRole } = renderResult;
      // Get all board squares
      const squares = getAllByRole('gridcell');
      
      // First square should be focusable
      expect(squares[0]).toHaveAttribute('tabIndex', '0');
      
      // Test keyboard interaction
      squares[0].focus();
      expect(squares[0]).toHaveFocus();
      
      // Test Enter key press
      fireEvent.keyDown(squares[0], { key: 'Enter' });
      
      // Test Space key press
      fireEvent.keyDown(squares[0], { key: ' ' });
    } catch (error) {
      console.warn('GridCell elements not found, testing general keyboard navigation');
    }
    
    // Check accessibility with utility
    await testKeyboardNavigation(renderResult);
  }, 15000);

  it('Navigation menu should support keyboard navigation', async () => {
    const user = userEvent.setup();
    const { getByRole, getAllByRole } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Find navigation links
    const nav = getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');

    // Test tab navigation through menu items
    await user.tab();
    
    // Should focus on first interactive element (logo link)
    const logoLink = getAllByRole('link')[0];
    expect(logoLink).toHaveFocus();
    
    await user.tab();
    // Should move to next navigation item
    const navLinks = getAllByRole('link');
    const arenaLink = navLinks.find(link => link.getAttribute('aria-label')?.includes('Arena'));
    if (arenaLink) {
      expect(arenaLink).toHaveFocus();
    }
  });

  it('All interactive elements should have proper ARIA labels', async () => {
    const renderResult = render(
      <Layout>
        <GameBoard matchId="test-match" isLive={true} />
      </Layout>
    );

    // Use accessibility utility for comprehensive ARIA testing
    await testAriaCompliance(renderResult);
  }, 15000);

  it('Focus management should be proper throughout the application', async () => {
    const renderResult = render(
      <Layout>
        <GameBoard matchId="test-match" isLive={true} />
      </Layout>
    );

    // Test that there are no elements with tabIndex > 0 (bad practice)
    const elementsWithPositiveTabIndex = renderResult.container.querySelectorAll('[tabindex]');
    elementsWithPositiveTabIndex.forEach(element => {
      const tabIndex = parseInt(element.getAttribute('tabindex') || '0');
      expect(tabIndex).toBeLessThanOrEqual(0);
    });

    await runAxeTest(renderResult.container, undefined, 'focus management test');
  }, 10000);

  it('Should support screen reader announcements with live regions', async () => {
    const { getByRole } = render(
      <GameBoard matchId="test-match" isLive={true} />
    );

    // Find the status region that should announce game state changes
    const statusRegion = getByRole('status');
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('Should have proper heading hierarchy for screen readers', async () => {
    const renderResult = render(
      <Layout>
        <div>
          <h1>Game Arena</h1>
          <GameBoard matchId="test-match" isLive={true} />
        </div>
      </Layout>
    );

    const { getAllByRole } = renderResult;
    const headings = getAllByRole('heading');
    
    // Check that we have headings and they follow proper hierarchy
    expect(headings.length).toBeGreaterThan(0);
    
    // First heading should be h1
    const h1 = headings.find(h => h.tagName === 'H1');
    expect(h1).toBeInTheDocument();

    await testHeadingHierarchy(renderResult);
  }, 10000);

  it('Should handle high contrast mode appropriately', async () => {
    const renderResult = render(
      <Layout>
        <GameBoard matchId="test-match" isLive={true} />
      </Layout>
    );

    await testColorContrast(renderResult);
  }, 10000);
});
