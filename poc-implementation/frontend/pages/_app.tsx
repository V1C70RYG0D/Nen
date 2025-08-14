import '@/styles/globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import type { AppProps } from 'next/app';
import { useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Import Production Betting Component for stable UX
const ProductionBettingComponent = dynamic(() => import('../components/ProductionBettingComponent'), {
  ssr: false,
});

// Create a stable QueryClient instance
const queryClient = (globalThis as any).__NEN_QUERY_CLIENT__ || new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});
;(globalThis as any).__NEN_QUERY_CLIENT__ = queryClient;

export default function App({ Component, pageProps, router }: AppProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // REAL DEVNET CONFIGURATION - User Story 2
  const endpoint = useMemo(() => {
    // Real devnet endpoint - no simulations
    return process.env.NEXT_PUBLIC_MAGICBLOCK_ROUTER_RPC || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://devnet-router.magicblock.app';
  }, []);

  // Real wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // For User Story 2, use the real devnet implementation ONLY on the dedicated route
  // Do not override the homepage so the main landing page renders correctly
  if (router.pathname === '/betting') {
    return (
      <>
        {/* Real Devnet Warning */}
        <div style={{
          background: '#ff4444',
          color: 'white',
          padding: '8px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '0.9em'
        }}>
          🔴 REAL DEVNET - User Story 2 Implementation - All transactions use actual SOL
        </div>
        
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect={false}>
            <WalletModalProvider>
              <ProductionBettingComponent />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </>
    );
  }

  // Legacy pages use existing setup
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={isClient}>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            {/* Debug route indicator temporarily disabled for button testing */}
            {false && process.env.NODE_ENV !== 'production' && (
              <div className="fixed bottom-2 left-2 z-[9999] px-2 py-1 text-xs bg-black/70 text-white rounded border border-white/10">
                route: {router.pathname}
              </div>
            )}
            <Component {...pageProps} />
            
            {/* Toast Notifications */}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'linear-gradient(135deg, #1a1b23 0%, #0a0a0b 100%)',
                  color: '#F0F0F2',
                  border: '1px solid rgba(153, 69, 255, 0.3)',
                  borderRadius: '0',
                  clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 30%, 100% 100%, 0 100%)',
                },
                success: {
                  iconTheme: {
                    primary: '#14F195',
                    secondary: '#0a0a0b',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#FF6B6B',
                    secondary: '#0a0a0b',
                  },
                },
              }}
            />
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
} 