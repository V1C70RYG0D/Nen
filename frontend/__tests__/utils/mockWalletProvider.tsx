// Mock Wallet Provider for Testing
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  MockWalletAdapter, 
  WalletState, 
  createMockWalletContext,
  createMockConnectionContext
} from './walletTestUtils';

// Types
interface MockWalletProviderProps {
  children: ReactNode;
  initialWallets?: MockWalletAdapter[];
  initialSelectedWallet?: MockWalletAdapter | null;
  autoConnect?: boolean;
}

interface MockWalletContextType {
  // Wallet state
  wallets: MockWalletAdapter[];
  wallet: MockWalletAdapter | null;
  publicKey: any;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  
  // Actions
  select: (walletName: string) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Transaction methods
  sendTransaction: jest.Mock;
  signTransaction: jest.Mock;
  signAllTransactions: jest.Mock;
  signMessage: jest.Mock;
  
  // Test utilities
  setWalletState: (walletName: string, state: WalletState) => void;
  simulateError: (walletName: string, error: Error) => void;
  reset: () => void;
}

interface MockConnectionContextType {
  connection: {
    getAccountInfo: jest.Mock;
    getBalance: jest.Mock;
    sendTransaction: jest.Mock;
    confirmTransaction: jest.Mock;
    getLatestBlockhash: jest.Mock;
    getMinimumBalanceForRentExemption: jest.Mock;
    getTokenAccountsByOwner: jest.Mock;
    getSlot: jest.Mock;
    getEpochInfo: jest.Mock;
  };
}

// Create contexts
const MockWalletContext = createContext<MockWalletContextType | null>(null);
const MockConnectionContext = createContext<MockConnectionContextType | null>(null);

// Mock Wallet Provider Component
export const MockWalletProvider: React.FC<MockWalletProviderProps> = ({
  children,
  initialWallets = [],
  initialSelectedWallet = null,
  autoConnect = false
}) => {
  const [wallets] = useState<MockWalletAdapter[]>(initialWallets);
  const [selectedWallet, setSelectedWallet] = useState<MockWalletAdapter | null>(initialSelectedWallet);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Mock connection context
  const connectionContext = createMockConnectionContext();

  const select = (walletName: string) => {
    const wallet = wallets.find(w => w.name === walletName);
    if (wallet) {
      setSelectedWallet(wallet);
    }
  };

  const connect = async () => {
    if (!selectedWallet) return;
    
    setIsConnecting(true);
    try {
      await selectedWallet.simulateConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!selectedWallet) return;
    
    setIsDisconnecting(true);
    try {
      await selectedWallet.simulateDisconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const setWalletState = (walletName: string, state: WalletState) => {
    const wallet = wallets.find(w => w.name === walletName);
    if (wallet) {
      wallet._state = state;
      
      switch (state) {
        case WalletState.CONNECTED:
          wallet.connected = true;
          wallet.connecting = false;
          wallet.disconnecting = false;
          break;
        case WalletState.DISCONNECTED:
          wallet.connected = false;
          wallet.connecting = false;
          wallet.disconnecting = false;
          wallet.publicKey = null;
          break;
        case WalletState.CONNECTING:
          wallet.connecting = true;
          wallet.connected = false;
          wallet.disconnecting = false;
          break;
        case WalletState.DISCONNECTING:
          wallet.disconnecting = true;
          wallet.connecting = false;
          break;
      }
    }
  };

  const simulateError = (walletName: string, error: Error) => {
    const wallet = wallets.find(w => w.name === walletName);
    if (wallet) {
      wallet.simulateError(error);
    }
  };

  const reset = () => {
    wallets.forEach(wallet => wallet.reset());
    setSelectedWallet(null);
    setIsConnecting(false);
    setIsDisconnecting(false);
  };

  const walletContextValue: MockWalletContextType = {
    wallets,
    wallet: selectedWallet,
    publicKey: selectedWallet?.publicKey || null,
    connected: selectedWallet?.connected || false,
    connecting: selectedWallet?.connecting || isConnecting || false,
    disconnecting: selectedWallet?.disconnecting || isDisconnecting || false,
    select,
    connect,
    disconnect,
    sendTransaction: jest.fn(),
    signTransaction: jest.fn(),
    signAllTransactions: jest.fn(),
    signMessage: jest.fn(),
    setWalletState,
    simulateError,
    reset
  };

  return (
    <MockConnectionContext.Provider value={connectionContext}>
      <MockWalletContext.Provider value={walletContextValue}>
        {children}
      </MockWalletContext.Provider>
    </MockConnectionContext.Provider>
  );
};

// Hooks for accessing mock contexts
export const useMockWallet = (): MockWalletContextType => {
  const context = useContext(MockWalletContext);
  if (!context) {
    throw new Error('useMockWallet must be used within a MockWalletProvider');
  }
  return context;
};

export const useMockConnection = (): MockConnectionContextType => {
  const context = useContext(MockConnectionContext);
  if (!context) {
    throw new Error('useMockConnection must be used within a MockWalletProvider');
  }
  return context;
};

// Test wrapper component for React Testing Library
export const WalletTestWrapper: React.FC<{
  children: ReactNode;
  wallets?: MockWalletAdapter[];
  selectedWallet?: MockWalletAdapter | null;
}> = ({ children, wallets = [], selectedWallet = null }) => {
  return (
    <MockWalletProvider 
      initialWallets={wallets} 
      initialSelectedWallet={selectedWallet}
    >
      {children}
    </MockWalletProvider>
  );
};

// Helper functions for setting up test scenarios
export const createTestScenarios = () => {
  const scenarios = {
    // No wallets available
    noWallets: () => (
      <MockWalletProvider initialWallets={[]}>
        {/* Test content */}
      </MockWalletProvider>
    ),

    // Wallet connected
    walletConnected: (wallet: MockWalletAdapter) => {
      wallet.connected = true;
      wallet._state = WalletState.CONNECTED;
      
      return (
        <MockWalletProvider 
          initialWallets={[wallet]} 
          initialSelectedWallet={wallet}
        >
          {/* Test content */}
        </MockWalletProvider>
      );
    },

    // Wallet connecting
    walletConnecting: (wallet: MockWalletAdapter) => {
      wallet.connecting = true;
      wallet._state = WalletState.CONNECTING;
      
      return (
        <MockWalletProvider 
          initialWallets={[wallet]} 
          initialSelectedWallet={wallet}
        >
          {/* Test content */}
        </MockWalletProvider>
      );
    },

    // Wallet disconnected
    walletDisconnected: (wallet: MockWalletAdapter) => {
      wallet.connected = false;
      wallet._state = WalletState.DISCONNECTED;
      
      return (
        <MockWalletProvider 
          initialWallets={[wallet]} 
          initialSelectedWallet={wallet}
        >
          {/* Test content */}
        </MockWalletProvider>
      );
    },

    // Multiple wallets
    multipleWallets: (wallets: MockWalletAdapter[]) => (
      <MockWalletProvider initialWallets={wallets}>
        {/* Test content */}
      </MockWalletProvider>
    )
  };

  return scenarios;
};

// Custom render function for React Testing Library with wallet provider
export const renderWithWalletProvider = (
  ui: React.ReactElement,
  options: {
    wallets?: MockWalletAdapter[];
    selectedWallet?: MockWalletAdapter | null;
    autoConnect?: boolean;
  } = {}
) => {
  const { wallets = [], selectedWallet = null, autoConnect = false } = options;
  
  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <MockWalletProvider 
      initialWallets={wallets}
      initialSelectedWallet={selectedWallet}
      autoConnect={autoConnect}
    >
      {children}
    </MockWalletProvider>
  );

  return { Wrapper };
};
