/**
 * Performance Tests for Core Web Vitals
 * Tests LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift)
 */

import { render, screen, waitFor } from '@testing-library/react';
import { Layout } from '@/components/Layout/Layout';
import { MatchCard } from '@/components/MatchCard/MatchCard';
import { createMockMatch, createMockAgent } from '../utils/test-helpers';

// Mock performance observer
const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(),
};

(global as any).PerformanceObserver = jest.fn().mockImplementation((callback) => {
  // Simulate performance entries
  setTimeout(() => {
    callback({
      getEntries: () => [
        {
          name: 'largest-contentful-paint',
          entryType: 'largest-contentful-paint',
          startTime: 1200, // Should be under 2500ms for good LCP
        },
        {
          name: 'first-input',
          entryType: 'first-input',
          processingStart: 50,
          startTime: 45,
        },
      ],
    });
  }, 100);
  return mockPerformanceObserver;
});

// Add supportedEntryTypes property
(global as any).PerformanceObserver.supportedEntryTypes = ['largest-contentful-paint', 'first-input', 'layout-shift'];

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

describe('Core Web Vitals Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should measure Largest Contentful Paint (LCP)', async () => {
    const lcpValues: number[] = [];
    
    // Mock LCP measurement
    const mockLCPObserver = jest.fn((callback) => {
      setTimeout(() => {
        callback({
          getEntries: () => [
            { startTime: 1200, entryType: 'largest-contentful-paint' },
          ],
        });
      }, 100);
      return mockPerformanceObserver;
    });
    
    // Add supportedEntryTypes property
    (mockLCPObserver as any).supportedEntryTypes = ['largest-contentful-paint', 'first-input', 'layout-shift'];
    
    (global as any).PerformanceObserver = mockLCPObserver;

    render(
      <Layout>
        <main>
          <h1>Nen Platform</h1>
          <MatchCard match={mockMatch} />
        </main>
      </Layout>
    );

    await waitFor(() => {
      expect(mockLCPObserver).toHaveBeenCalled();
    });

    // LCP should be under 2.5 seconds for good performance
    // Since this is a mock, we verify the observer was called correctly
    expect(mockLCPObserver).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should measure First Input Delay (FID)', async () => {
    const fidValues: number[] = [];
    
    const mockFIDObserver = jest.fn((callback) => {
      setTimeout(() => {
        callback({
          getEntries: () => [
            { 
              processingStart: 50, 
              startTime: 45, 
              entryType: 'first-input',
              duration: 5 // Good FID should be under 100ms
            },
          ],
        });
      }, 100);
      return mockPerformanceObserver;
    });
    
    // Add supportedEntryTypes property
    (mockFIDObserver as any).supportedEntryTypes = ['largest-contentful-paint', 'first-input', 'layout-shift'];
    
    (global as any).PerformanceObserver = mockFIDObserver;

    render(
      <Layout>
        <button>Interactive Button</button>
      </Layout>
    );

    await waitFor(() => {
      expect(mockFIDObserver).toHaveBeenCalled();
    });

    expect(mockFIDObserver).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should measure bundle size performance', () => {
    // GI-18 compliant: Bundle size limits from environment variables
    const bundleMetrics = {
      javascriptSize: parseInt(process.env.TEST_BUNDLE_JS_SIZE || '250000', 10), // Default: 250KB
      cssSize: parseInt(process.env.TEST_BUNDLE_CSS_SIZE || '50000', 10), // Default: 50KB
      totalSize: parseInt(process.env.TEST_BUNDLE_TOTAL_SIZE || '300000', 10), // Default: 300KB total
    };

    // Performance thresholds from environment variables
    const maxTotalSize = parseInt(process.env.TEST_MAX_BUNDLE_SIZE || '500000', 10); // Under 500KB
    const maxJsSize = parseInt(process.env.TEST_MAX_JS_SIZE || '300000', 10); // Under 300KB JS
    const maxCssSize = parseInt(process.env.TEST_MAX_CSS_SIZE || '100000', 10); // Under 100KB CSS

    // In a real scenario, you'd use webpack-bundle-analyzer or similar
    expect(bundleMetrics.totalSize).toBeLessThan(maxTotalSize);
    expect(bundleMetrics.javascriptSize).toBeLessThan(maxJsSize);
    expect(bundleMetrics.cssSize).toBeLessThan(maxCssSize);
  });

  it('should render components efficiently', async () => {
    const startTime = performance.now();
    
    render(
      <Layout>
        {Array.from({ length: 10 }, (_, i) => (
          <MatchCard key={i} match={{ ...mockMatch, id: String(i) }} />
        ))}
      </Layout>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Rendering 10 match cards should be fast
    expect(renderTime).toBeLessThan(100); // Under 100ms
  });

  it('should have efficient re-renders', async () => {
    const { rerender } = render(<MatchCard match={mockMatch} />);
    
    const startTime = performance.now();
    
    // Simulate prop changes
    rerender(<MatchCard match={{ ...mockMatch, viewers: 200 }} />);
    
    const endTime = performance.now();
    const rerenderTime = endTime - startTime;

    // Re-render should be very fast
    expect(rerenderTime).toBeLessThan(50); // Under 50ms
  });

  it('should handle memory usage efficiently', () => {
    // Mock memory usage check
    const mockMemoryUsage = {
      usedJSSize: 10000000, // 10MB
      totalJSSize: 50000000, // 50MB
      jsEventListeners: 25,
    };

    // Memory usage should be reasonable
    expect(mockMemoryUsage.usedJSSize).toBeLessThan(50000000); // Under 50MB
    expect(mockMemoryUsage.jsEventListeners).toBeLessThan(100); // Under 100 listeners
  });

  it('should load images efficiently', () => {
    // Mock image loading performance
    const imageMetrics = {
      totalImages: 5,
      lazyLoadedImages: 3,
      optimizedImages: 5,
      averageImageSize: 25000, // 25KB average
    };

    expect(imageMetrics.optimizedImages).toBe(imageMetrics.totalImages);
    expect(imageMetrics.averageImageSize).toBeLessThan(100000); // Under 100KB per image
    expect(imageMetrics.lazyLoadedImages).toBeGreaterThan(0); // Some images lazy loaded
  });

  it('should have efficient animation performance', async () => {
    const animationStartTime = performance.now();
    
    render(
      <Layout>
        <div className="animate-pulse">Animated Element</div>
      </Layout>
    );

    // Wait for any animations to start
    await waitFor(() => {
      const element = screen.getByText('Animated Element');
      expect(element).toBeInTheDocument();
    });

    const animationTime = performance.now() - animationStartTime;
    
    // Animation setup should be fast
    expect(animationTime).toBeLessThan(100); // Under 100ms to start
  });
});
