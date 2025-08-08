/**
 * Matches Page - Demonstrates User Story 3 Implementation
 * 
 * Features implemented:
 * - Real API endpoint connection (no hardcoding)
 * - Comprehensive filtering (bet range, AI rating, nen types)
 * - Error handling with loading, error, and empty states
 * - Real-time updates via WebSocket
 * - Infinite scroll
 * - Production-ready error boundaries
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  FunnelIcon,
  RocketLaunchIcon,
  SparklesIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { MatchList } from '@/components/MatchList';
import { MatchFilters } from '@/types/match';

// Error Boundary for production-ready error handling
class MatchesErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MatchesPage Error Boundary caught an error:', error, errorInfo);
    
    // In production, send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} />;
      }

      return (
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-hunter text-red-400">Something went wrong</h2>
            <p className="text-gray-400 max-w-md">
              An unexpected error occurred while loading the matches page. 
              Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Custom error fallback component
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
    <div className="text-center space-y-4 max-w-md">
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
        <span className="text-2xl">💥</span>
      </div>
      <h2 className="text-xl font-hunter text-red-400">Critical Error</h2>
      <p className="text-gray-400">
        {error.message || 'An unexpected error occurred'}
      </p>
      <details className="text-left bg-gray-900 p-4 rounded-lg text-xs text-gray-500">
        <summary className="cursor-pointer">Error Details</summary>
        <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
      </details>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
      >
        Reload Application
      </button>
    </div>
  </div>
);

// Custom loading component for matches
const MatchesLoadingComponent: React.FC = () => (
  <div className="space-y-6">
    <div className="text-center space-y-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-4 border-solana-purple border-t-transparent rounded-full mx-auto"
      />
      <h3 className="text-lg font-hunter text-gray-300">Loading Epic Battles...</h3>
      <p className="text-sm text-gray-500">Connecting to the arena and fetching live matches</p>
    </div>
  </div>
);

// Main matches page component
const MatchesPage: React.FC = () => {
  const [pageError, setPageError] = useState<string | null>(null);
  const [initialFilters] = useState<MatchFilters>({
    status: ['upcoming', 'live'],
    sortBy: 'startTime',
    sortOrder: 'asc',
    limit: 20,
    page: 1,
  });

  // Initialize performance monitoring
  useEffect(() => {
    const navigationStart = performance.now();
    
    return () => {
      const navigationEnd = performance.now();
      const pageLoadTime = navigationEnd - navigationStart;
      
      console.log(`Matches page load time: ${pageLoadTime.toFixed(2)}ms`);
      
      // In production, send to analytics
      if (process.env.NODE_ENV === 'production' && window.gtag) {
        window.gtag('event', 'page_load_time', {
          custom_map: { metric1: 'load_time' },
          metric1: Math.round(pageLoadTime),
        });
      }
    };
  }, []);

  const handleError = (error: string) => {
    setPageError(error);
    console.error('MatchesPage error:', error);
  };

  const handleMatchSelect = (match: any) => {
    // Navigate to match details or open modal
    console.log('Selected match:', match.id);
    toast.success(`Opening ${match.agent1.name} vs ${match.agent2.name}`);
  };

  return (
    <MatchesErrorBoundary fallback={ErrorFallback}>
      <div className="min-h-screen bg-cyber-dark">
        <Head>
          <title>AI Battle Arena - Nen Platform</title>
          <meta 
            name="description" 
            content="Watch live AI vs AI Gungi battles on Solana. Bet with SOL on your favorite AI agents and experience real-time blockchain gaming." 
          />
          <meta name="keywords" content="Solana, AI, Gungi, Hunter x Hunter, blockchain gaming, NFT, betting" />
          <meta property="og:title" content="AI Battle Arena - Nen Platform" />
          <meta property="og:description" content="Real-time AI battles on Solana blockchain" />
          <meta property="og:type" content="website" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="canonical" href="/matches" />
          {/* Accessibility improvements */}
          <meta name="theme-color" content="#14F195" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
        </Head>

        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center space-x-2 mb-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                aria-label="Animated sparkles icon"
              >
                <SparklesIcon className="w-8 h-8 text-solana-purple" />
              </motion.div>
              <h1 
                className="text-4xl md:text-6xl font-hunter bg-gradient-to-r from-solana-purple via-solana-green to-yellow-400 bg-clip-text text-transparent"
                role="heading"
                aria-level={1}
              >
                AI Battle Arena
              </h1>
              <motion.div
                animate={{ rotate: [0, -360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                aria-label="Animated bolt icon"
              >
                <BoltIcon className="w-8 h-8 text-yellow-400" />
              </motion.div>
            </div>
            
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-6">
              Experience the future of gaming with AI-powered Gungi matches on Solana. 
              Watch live battles, place SOL bets, and witness the evolution of intelligent agents.
            </p>

            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2" role="status" aria-label="Real-time status">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
                <span>Real-time on-chain</span>
              </div>
              <div className="flex items-center space-x-2" aria-label="Powered by MagicBlock">
                <RocketLaunchIcon className="w-4 h-4" aria-hidden="true" />
                <span>MagicBlock powered</span>
              </div>
              <div className="flex items-center space-x-2" aria-label="Advanced filtering available">
                <FunnelIcon className="w-4 h-4" aria-hidden="true" />
                <span>Advanced filtering</span>
              </div>
            </div>
          </motion.div>

          {/* Page-level error display */}
          {pageError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <span className="text-red-400">⚠️</span>
                <span className="text-red-400 font-medium">Page Error:</span>
                <span className="text-gray-300">{pageError}</span>
                <button
                  onClick={() => setPageError(null)}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}

          {/* Main Match List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <MatchList
              filters={initialFilters}
              showFilters={true}
              enableInfiniteScroll={true}
              enableRealTimeUpdates={true}
              onMatchSelect={handleMatchSelect}
              onError={handleError}
              emptyStateMessage="No active battles at the moment. New AI matches are starting soon!"
              loadingComponent={MatchesLoadingComponent}
              className="space-y-6"
            />
          </motion.div>
        </div>

        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-cyber-grid bg-[size:50px_50px] opacity-5" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-solana-purple/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-solana-green/5 rounded-full blur-3xl" />
        </div>
      </div>
    </MatchesErrorBoundary>
  );
};

export default MatchesPage;
