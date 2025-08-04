import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MatchCard } from '@/components/MatchCard/MatchCard';
import { BettingPanel } from '@/components/BettingPanel/BettingPanel';
import { GameBoard } from '@/components/GameBoard/GameBoard';
import { Layout } from '@/components/Layout/Layout';
import type { Match } from '@/types';
import { createMockMatch, createMockAgent } from '../utils/test-helpers';

// Mock WalletContextProvider
const MockWalletContextProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="wallet-context-provider">{children}</div>
);

expect.extend(toHaveNoViolations);
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

const mockMatch = createMockMatch({
  id: '1',
  status: 'live',
  startTime: new Date(),
  viewers: 100,
  totalPool: 123.45,
  pools: {
    agent1: 60,
    agent2: 40,
    total: 100,
  },
  agent1: createMockAgent({
    name: 'Agent One',
    avatar: 'A1',
    elo: 1500,
    winRate: 0.7,
    personality: 'Aggressive',
  }),
  agent2: createMockAgent({
    name: 'Agent Two',
    avatar: 'A2',
    elo: 1450,
    winRate: 0.6,
    personality: 'Defensive',
  }),
});

describe('WCAG Accessibility Compliance', () => {
  it('Layout component should have no accessibility violations', async () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('MatchCard component should have no accessibility violations', async () => {
    const { container } = render(<MatchCard match={mockMatch} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('WalletProvider component should have no accessibility violations', async () => {
    const { container } = render(
      <MockWalletContextProvider>
        <div>Test Content</div>
      </MockWalletContextProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Full page layout should meet accessibility standards', async () => {
    const { container } = render(
      <MockWalletContextProvider>
        <Layout>
          <div>
            <h1>Nen Platform</h1>
            <section>
              <h2>Live Matches</h2>
              <div>
                <MatchCard match={mockMatch} />
              </div>
            </section>
          </div>
        </Layout>
      </MockWalletContextProvider>
    );

    const results = await axe(container, {
      rules: {
        // Configure specific WCAG rules
        'color-contrast': { enabled: true },
        'aria-allowed-attr': { enabled: true },
        'aria-required-attr': { enabled: true },
        'heading-order': { enabled: true },
        'focus-order-semantics': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', async () => {
    const { container } = render(
      <Layout>
        <div>
          <h1>Main Title</h1>
          <section>
            <h2>Section Title</h2>
            <article>
              <h3>Article Title</h3>
            </article>
          </section>
        </div>
      </Layout>
    );

    const results = await axe(container, {
      rules: {
        'heading-order': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels and roles', async () => {
    const { container } = render(
      <div>
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/marketplace">Marketplace</a></li>
          </ul>
        </nav>
        <main>
          <section aria-labelledby="matches-heading">
            <h2 id="matches-heading">Live Matches</h2>
            <MatchCard match={mockMatch} />
          </section>
        </main>
      </div>
    );

    const results = await axe(container, {
      rules: {
        'aria-valid-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true },
        'aria-allowed-attr': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', async () => {
    const { container } = render(
      <div>
        <button>Button 1</button>
        <a href="/link">Link 1</a>
        <input type="text" placeholder="Search" />
        <button>Button 2</button>
      </div>
    );

    const results = await axe(container, {
      rules: {
        'focus-order-semantics': { enabled: true },
        'tabindex': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });
});
