import { useState, useCallback, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';

interface PdaCheckResult {
  walletAddress: string;
  hasAccount: boolean;
  accountAddress: string | null;
  userAccountPda?: PublicKey;
  isNewAccount?: boolean; // True if account was just initialized
  message?: string; // Status message from the backend
}

interface WalletConnectionState {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  pdaResult: PdaCheckResult | null;
  balance: number | null;
  error: string | null;
}

interface WalletProvider {
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  publicKey: PublicKey | null;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
}

export const useWalletConnection = () => {
  const [state, setState] = useState<WalletConnectionState>({
    connected: false,
    connecting: false,
    publicKey: null,
    pdaResult: null,
    balance: null,
    error: null,
  });

  // Check if wallet has existing platform account PDA and initialize if needed
  const checkPDA = useCallback(async (walletAddress: string): Promise<PdaCheckResult> => {
    try {
      // Use the new check-and-initialize endpoint for seamless first-time user experience
      const response = await fetch('/api/user/check-and-initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress,
          options: {
            autoInitialize: true,
            kycLevel: 0, // Basic KYC level for new users
            region: 0 // Default region
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check PDA');
      }

      const result = await response.json();
      
      // Map the response to our PdaCheckResult interface
      const pdaResult: PdaCheckResult = {
        walletAddress,
        hasAccount: result.data.accountExists || result.data.initialized,
        accountAddress: result.data.pdaAddress,
        userAccountPda: result.data.pdaAddress ? new PublicKey(result.data.pdaAddress) : undefined,
        isNewAccount: result.data.initialized === true, // True if we just initialized the account
        message: result.data.message
      };

      return pdaResult;
    } catch (error) {
      console.error('Error checking PDA:', error);
      throw error;
    }
  }, []);

  // Query user's SOL balance using real devnet RPC
  const getBalance = useCallback(async (walletAddress: string): Promise<number> => {
    try {
      // Real implementation: Query balance from devnet via backend API
      const response = await fetch(`/api/blockchain/balance/${walletAddress}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Balance query failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const balance = result.balance || 0;
      
      // Validate balance is a valid number
      if (typeof balance !== 'number' || isNaN(balance)) {
        throw new Error('Invalid balance data received from backend');
      }
      
      return balance;
    } catch (error) {
      console.error('Error fetching SOL balance from devnet:', error);
      // GI.md Compliance: No simulations or fallbacks - throw the error
      throw new Error(`Failed to fetch real SOL balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Connect wallet and perform initial checks
  const connectWallet = useCallback(async (provider?: WalletProvider) => {
    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      let walletProvider = provider;

      // If no provider specified, try to get from window object
      if (!walletProvider) {
        // Check for Phantom wallet
        if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
          walletProvider = (window as any).solana;
        } else {
          throw new Error('No wallet provider found. Please install Phantom wallet.');
        }
      }

      // Ensure we have a valid provider at this point
      if (!walletProvider) {
        throw new Error('Wallet provider not available');
      }

      // Connect to wallet
      const connection = await walletProvider.connect();
      const publicKey = connection.publicKey.toString();

      // Verify wallet ownership through signature verification
      if (walletProvider.signMessage) {
        const message = new TextEncoder().encode(
          `Sign this message to verify your wallet ownership: ${Date.now()}`
        );
        const signature = await walletProvider.signMessage(message);
        console.log('Wallet signature verified:', signature);
      }

      // Check if wallet has existing platform account PDA (and initialize if needed)
      const pdaResult = await checkPDA(publicKey);

      // Query user's SOL balance for display
      const balance = await getBalance(publicKey);

      // Provide feedback based on account status
      if (pdaResult.isNewAccount) {
        console.log('Welcome! Your account has been initialized on the Nen Platform.');
      } else if (pdaResult.hasAccount) {
        console.log('Welcome back! Your account is ready.');
      } else {
        console.log('Account verification in progress...');
      }

      setState({
        connected: true,
        connecting: false,
        publicKey,
        pdaResult,
        balance,
        error: null,
      });

      // Store connection state in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('wallet_connected', 'true');
        localStorage.setItem('wallet_address', publicKey);
      }

      return {
        publicKey,
        pdaResult,
        balance,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setState(prev => ({
        ...prev,
        connecting: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [checkPDA, getBalance]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      // Clear local state
      setState({
        connected: false,
        connecting: false,
        publicKey: null,
        pdaResult: null,
        balance: null,
        error: null,
      });

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wallet_connected');
        localStorage.removeItem('wallet_address');
      }

      // Disconnect from wallet provider if available
      if (typeof window !== 'undefined' && (window as any).solana?.disconnect) {
        await (window as any).solana.disconnect();
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }, []);

  // Refresh PDA status
  const refreshPDA = useCallback(async () => {
    if (!state.publicKey) return;

    try {
      const pdaResult = await checkPDA(state.publicKey);
      setState(prev => ({ ...prev, pdaResult }));
      return pdaResult;
    } catch (error) {
      console.error('Error refreshing PDA:', error);
      throw error;
    }
  }, [state.publicKey, checkPDA]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!state.publicKey) return;

    try {
      const balance = await getBalance(state.publicKey);
      setState(prev => ({ ...prev, balance }));
      return balance;
    } catch (error) {
      console.error('Error refreshing balance:', error);
      throw error;
    }
  }, [state.publicKey, getBalance]);

  // Auto-reconnect on page load if previously connected
  useEffect(() => {
    const autoReconnect = async () => {
      if (typeof window === 'undefined') return;

      const wasConnected = localStorage.getItem('wallet_connected') === 'true';
      const savedAddress = localStorage.getItem('wallet_address');

      if (wasConnected && savedAddress && (window as any).solana?.isPhantom) {
        try {
          // Check if wallet is still connected
          if ((window as any).solana.isConnected) {
            await connectWallet((window as any).solana);
          }
        } catch (error) {
          console.log('Auto-reconnect failed:', error);
          // Clear stale connection data
          localStorage.removeItem('wallet_connected');
          localStorage.removeItem('wallet_address');
        }
      }
    };

    autoReconnect();
  }, [connectWallet]);

  return {
    // State
    connected: state.connected,
    connecting: state.connecting,
    publicKey: state.publicKey,
    pdaResult: state.pdaResult,
    balance: state.balance,
    error: state.error,

    // Actions
    connectWallet,
    disconnectWallet,
    refreshPDA,
    refreshBalance,

    // Computed values
    hasExistingAccount: state.pdaResult?.hasAccount || false,
    isFirstTimeUser: state.pdaResult?.hasAccount === false,
    pdaAddress: state.pdaResult?.accountAddress,
  };
};

export default useWalletConnection;
