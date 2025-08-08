import '@/styles/globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import type { AppProps } from 'next/app';
import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Import Real Devnet Betting App for User Story 2
const RealDevnetBettingApp = dynamic(() => import('../components/RealDevnetBettingApp'), {
  ssr: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

export default function App({ Component, pageProps, router }: AppProps) {
  // REAL DEVNET CONFIGURATION - User Story 2
  const endpoint = useMemo(() => {
    // Real devnet endpoint - no simulations
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  }, []);

  // Real wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // For User Story 2, use the real devnet implementation
  if (router.pathname === '/' || router.pathname === '/betting') {
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
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <RealDevnetBettingApp />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </>
    );
  }

  // Legacy pages use existing setup
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={router.asPath}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Component {...pageProps} />
              </motion.div>
            </AnimatePresence>
            
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