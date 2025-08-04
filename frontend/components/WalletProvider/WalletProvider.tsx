// Wallet provider for Solana integration
import React, { useMemo, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { detectBrowserCapabilities, checkWalletCompatibility, isWalletSupported } from '../../utils/browserCompatibility';
import { WalletFallback } from '../WalletFallback/WalletFallback';
import { useState, createContext, useContext } from 'react';
import { useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
require('@solana/wallet-adapter-react-ui/styles.css');

interface WalletContextProviderProps {
  children: ReactNode;
}

interface WalletEnhancementContextType {
  isWalletSupported: boolean;
  isReadOnlyMode: boolean;
  setReadOnlyMode: (mode: boolean) => void;
  showFallback: boolean;
  retryConnection: () => void;
}

const WalletEnhancementContext = createContext<WalletEnhancementContextType | null>(null);

export const WalletContextProvider: React.FC<WalletContextProviderProps> = ({ children }) => {
  // Network configuration
  const network = (process.env.NEXT_PUBLIC_NETWORK as WalletAdapterNetwork) || WalletAdapterNetwork.Devnet;
  
  // Progressive enhancement state
  const [isReadOnlyMode, setReadOnlyMode] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const retryConnection = () => window.location.reload();

  // RPC endpoint
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_RPC_URL) {
      return process.env.NEXT_PUBLIC_RPC_URL;
    }
    return clusterApiUrl(network);
  }, [network]);

  // Check for wallet support
  useEffect(() => {
    const capabilities = detectBrowserCapabilities();
    const compatibility = checkWalletCompatibility();
    const supported = isWalletSupported();
    
    setShowFallback(!supported);
    
    if (!supported) {
      console.warn('Wallet integration not supported in this browser environment');
    }
  }, []);

  // Wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter({
        appName: 'Nen Platform',
        appLogoUrl: undefined, // Optional: add your app logo URL
        darkMode: true
      }),
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [network]
  );

  return (
    <WalletEnhancementContext.Provider value={{
      isWalletSupported: !showFallback,
      isReadOnlyMode,
      setReadOnlyMode,
      showFallback,
      retryConnection,
    }}>
      {showFallback ? (
        <WalletFallback onContinueWithoutWallet={() => setReadOnlyMode(true)} />
      ) : (
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {children}
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      )}
    </WalletEnhancementContext.Provider>
  );
};

// Hook to use wallet enhancement context
export const useWalletEnhancement = (): WalletEnhancementContextType => {
  const context = useContext(WalletEnhancementContext);
  if (!context) {
    throw new Error('useWalletEnhancement must be used within a WalletContextProvider');
  }
  return context;
};
