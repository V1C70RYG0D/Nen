import { useState, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { ProductionSolanaBettingClient } from '../lib/production-solana-betting-client';

// Load IDL
import bettingIdl from '../lib/idl/nen_betting.json';

/**
 * Production Betting Hook
 * 
 * Replaces all simulation/fallback implementations with real on-chain interactions
 * Implements User Story 2 with actual devnet transactions
 * 
 * Following implementation guidelines:
 * - Real implementations over simulations
 * - No hardcoding (uses environment variables)
 * - Production-ready error handling
 * - Comprehensive logging
 */

interface BettingState {
  balance: number;
  availableBalance: number;
  lockedBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  depositCount: number;
  withdrawalCount: number;
  accountExists: boolean;
  isLoading: boolean;
  error: string | null;
}

interface DepositResult {
  success: boolean;
  transactionSignature: string;
  newBalance: number;
  explorerUrl: string;
}

interface WithdrawalResult {
  success: boolean;
  transactionSignature: string;
  newBalance: number;
  explorerUrl: string;
}

export const useProductionBetting = () => {
  const walletCtx = useWallet();
  const { publicKey, signTransaction, connected } = walletCtx;
  const { connection } = useConnection();
  
  const [client, setClient] = useState<ProductionSolanaBettingClient | null>(null);
  const [state, setState] = useState<BettingState>({
    balance: 0,
    availableBalance: 0,
    lockedBalance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    depositCount: 0,
    withdrawalCount: 0,
    accountExists: false,
    isLoading: false,
    error: null,
  });

  /**
   * Initialize production betting client
   * Real client with actual on-chain integration
   */
  const initializeClient = useCallback(async () => {
    if (!publicKey || !signTransaction || !connected) {
      console.log('⚠️  Wallet not connected');
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('🔄 Initializing production betting client...');
      
      const productionClient = new ProductionSolanaBettingClient();
      
      // Initialize with real wallet and IDL
  await productionClient.initialize(walletCtx as any, bettingIdl);
      
      setClient(productionClient);
      console.log('✅ Production betting client initialized');
      
      // Load account data
      await refreshAccountData(productionClient);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize betting client';
      console.error('❌ Client initialization failed:', errorMessage);
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }, [publicKey, signTransaction, connected]);

  /**
   * Refresh account data from blockchain
   * Real data from devnet
   */
  const refreshAccountData = useCallback(async (clientInstance?: ProductionSolanaBettingClient) => {
    if (!publicKey) return;
    
    const activeClient = clientInstance || client;
    if (!activeClient) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('🔄 Refreshing account data from devnet...');
      
      const account = await activeClient.getBettingAccount(publicKey);
      
      if (account) {
        // Safely handle balance conversion with proper null/undefined checks
        const balance = (account.balance && typeof account.balance === 'object' && typeof account.balance.toNumber === 'function') 
          ? account.balance.toNumber() / 1_000_000_000 
          : 0; // Convert lamports to SOL
        const lockedBalance = (account.lockedFunds && typeof account.lockedFunds === 'object' && typeof account.lockedFunds.toNumber === 'function')
          ? account.lockedFunds.toNumber() / 1_000_000_000
          : 0;
        const availableBalance = balance - lockedBalance;
        
        const totalDeposited = (account.totalDeposited && typeof account.totalDeposited === 'object' && typeof account.totalDeposited.toNumber === 'function')
          ? account.totalDeposited.toNumber() / 1_000_000_000
          : 0;
        const totalWithdrawn = (account.totalWithdrawn && typeof account.totalWithdrawn === 'object' && typeof account.totalWithdrawn.toNumber === 'function')
          ? account.totalWithdrawn.toNumber() / 1_000_000_000
          : 0;
        
        setState(prev => ({
          ...prev,
          balance: isNaN(balance) ? 0 : balance,
          availableBalance: isNaN(availableBalance) ? 0 : availableBalance,
          lockedBalance: isNaN(lockedBalance) ? 0 : lockedBalance,
          totalDeposited: isNaN(totalDeposited) ? 0 : totalDeposited,
          totalWithdrawn: isNaN(totalWithdrawn) ? 0 : totalWithdrawn,
          depositCount: 0, // Not available in current schema
          withdrawalCount: (account.withdrawalCount && typeof account.withdrawalCount === 'object' && typeof account.withdrawalCount.toNumber === 'function')
            ? account.withdrawalCount.toNumber()
            : 0,
          accountExists: true,
          isLoading: false,
          error: null,
        }));
        
        console.log(`✅ Account data loaded: ${balance} SOL balance`);
        
      } else {
        // Account doesn't exist yet
        setState(prev => ({
          ...prev,
          balance: 0,
          availableBalance: 0,
          lockedBalance: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          depositCount: 0,
          withdrawalCount: 0,
          accountExists: false,
          isLoading: false,
          error: null,
        }));
        
        console.log('ℹ️  Betting account not created yet');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh account data';
      console.error('❌ Account data refresh failed:', errorMessage);
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }, [publicKey, client]);

  /**
   * Create betting account
   * Real on-chain account creation
   */
  const createBettingAccount = useCallback(async (): Promise<string> => {
    if (!publicKey || !client) {
      throw new Error('Wallet not connected or client not initialized');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('🏗️  Creating betting account on devnet...');
      
      const transactionSignature = await client.createBettingAccount(publicKey);
      
      console.log(`✅ Betting account created! Transaction: ${transactionSignature}`);
      
      // Refresh account data
      await refreshAccountData();
      
      return transactionSignature;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create betting account';
      console.error('❌ Account creation failed:', errorMessage);
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw new Error(errorMessage);
    }
  }, [publicKey, client, refreshAccountData]);

  /**
   * Deposit SOL into betting account
   * User Story 2: Real SOL transfer from user wallet to betting PDA via devnet transaction
   */
  const depositSol = useCallback(async (amountSol: number): Promise<DepositResult> => {
    if (!publicKey || !client) {
      throw new Error('Wallet not connected or client not initialized');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log(`💰 Depositing ${amountSol} SOL...`);
      
      // Execute real deposit on devnet
      const result = await client.depositSol(publicKey, amountSol);
      
      console.log(`✅ Deposit successful!`);
      console.log(`🔗 Explorer: ${result.explorerUrl}`);
      
      // Refresh account data
      await refreshAccountData();
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      return {
        success: result.success,
        transactionSignature: result.transactionSignature,
        newBalance: result.newBalance,
        explorerUrl: result.explorerUrl,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deposit failed';
      console.error('❌ Deposit failed:', errorMessage);
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw new Error(errorMessage);
    }
  }, [publicKey, client, refreshAccountData]);

  /**
   * Withdraw SOL from betting account
   * Real SOL transfer from betting PDA back to user wallet
   */
  const withdrawSol = useCallback(async (amountSol: number): Promise<WithdrawalResult> => {
    if (!publicKey || !client) {
      throw new Error('Wallet not connected or client not initialized');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log(`💸 Withdrawing ${amountSol} SOL...`);
      
      // Execute real withdrawal on devnet
      const result = await client.withdrawSol(publicKey, amountSol);
      
      console.log(`✅ Withdrawal successful!`);
      console.log(`🔗 Explorer: ${result.explorerUrl}`);
      
      // Refresh account data
      await refreshAccountData();
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      return {
        success: result.success,
        transactionSignature: result.transactionSignature,
        newBalance: result.newBalance,
        explorerUrl: result.explorerUrl,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Withdrawal failed';
      console.error('❌ Withdrawal failed:', errorMessage);
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw new Error(errorMessage);
    }
  }, [publicKey, client, refreshAccountData]);

  /**
   * Lock funds for betting
   * Real on-chain fund locking
   */
  const lockFunds = useCallback(async (amountSol: number): Promise<string> => {
    if (!publicKey || !client) {
      throw new Error('Wallet not connected or client not initialized');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const transactionSignature = await client.lockFunds(publicKey, amountSol);
      
      // Refresh account data
      await refreshAccountData();
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      return transactionSignature;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to lock funds';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw new Error(errorMessage);
    }
  }, [publicKey, client, refreshAccountData]);

  /**
   * Unlock funds after bet settlement
   * Real on-chain fund unlocking
   */
  const unlockFunds = useCallback(async (amountSol: number): Promise<string> => {
    if (!publicKey || !client) {
      throw new Error('Wallet not connected or client not initialized');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const transactionSignature = await client.unlockFunds(publicKey, amountSol);
      
      // Refresh account data
      await refreshAccountData();
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      return transactionSignature;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlock funds';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw new Error(errorMessage);
    }
  }, [publicKey, client, refreshAccountData]);

  /**
   * Get network information
   * Real devnet information
   */
  const getNetworkInfo = useCallback(async () => {
    if (!client) return null;
    
    try {
      return await client.getNetworkInfo();
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }, [client]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize client when wallet connects
  useEffect(() => {
    if (connected && publicKey && signTransaction) {
      initializeClient();
    } else {
      setClient(null);
      setState({
        balance: 0,
        availableBalance: 0,
        lockedBalance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        depositCount: 0,
        withdrawalCount: 0,
        accountExists: false,
        isLoading: false,
        error: null,
      });
    }
  }, [connected, publicKey, signTransaction, initializeClient]);

  // Auto-refresh account data periodically
  useEffect(() => {
    if (!client || !publicKey) return;

    const interval = setInterval(() => {
      refreshAccountData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [client, publicKey, refreshAccountData]);

  return {
    // State
    ...state,
    connected,
    publicKey,
    
    // Actions
    createBettingAccount,
    depositSol,
    withdrawSol,
    lockFunds,
    unlockFunds,
    refreshAccountData: () => refreshAccountData(),
    getNetworkInfo,
    clearError,
    
    // Utilities
    isReady: !!(connected && publicKey && client),
    needsAccountCreation: connected && publicKey && !state.accountExists && !state.isLoading,
  };
};

export default useProductionBetting;
