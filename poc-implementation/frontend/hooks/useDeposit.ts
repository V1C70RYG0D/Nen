import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import toast from 'react-hot-toast';
import { 
  SolanaBettingClient, 
  DepositResult as SolanaDepositResult, 
  WithdrawalResult as SolanaWithdrawalResult 
} from '../lib/solana-betting-client';
import { 
  FallbackBettingClient,
  BettingAccountData,
  DepositResult as FallbackDepositResult,
  WithdrawalResult as FallbackWithdrawalResult 
} from '../lib/betting-account-fallback';
import bettingIdl from '../lib/idl/nen_betting.json';

interface DepositState {
  isDepositing: boolean;
  isWithdrawing: boolean;
  bettingAccount: BettingAccount | null;
  transactionHistory: TransactionRecord[];
  loading: boolean;
  error: string | null;
  bettingClient: SolanaBettingClient | null;
  fallbackClient: FallbackBettingClient | null;
  usingFallback: boolean;
}

interface BettingAccount {
  userId: string;
  walletAddress: string;
  pdaAddress: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  lockedBalance: number;
  lastUpdated: string;
}

interface TransactionRecord {
  id: string;
  userId: string;
  walletAddress: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'payout';
  amount: number;
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  metadata?: Record<string, any>;
  createdAt: string;
}

interface DepositResult {
  success: boolean;
  transactionId: string;
  newBalance: number;
  depositAmount: number;
  pdaAddress: string;
  message: string;
}

interface WithdrawalResult {
  success: boolean;
  transactionId: string;
  newBalance: number;
  withdrawalAmount: number;
  message: string;
}

export const useDeposit = () => {
  const { publicKey, sendTransaction, ...walletContext } = useWallet();
  const { connection } = useConnection();
  
  const [state, setState] = useState<DepositState>({
    isDepositing: false,
    isWithdrawing: false,
    bettingAccount: null,
    transactionHistory: [],
    loading: false,
    error: null,
    bettingClient: null,
    fallbackClient: null,
    usingFallback: false,
  });

  // Initialize Solana betting client
  useEffect(() => {
    const initializeBettingClient = async () => {
      try {
        const client = new SolanaBettingClient(connection);
        const fallback = new FallbackBettingClient(connection);
        
        if (publicKey && typeof window !== 'undefined') {
          const fullWallet = { publicKey, sendTransaction, ...walletContext };
          
          // Always start with fallback first since the program may not be deployed
          console.log('🔧 Initializing betting system...');
          
          try {
            // Try to initialize main client first
            await client.initialize(fullWallet as any, bettingIdl as any);
            
            // Verify program exists on-chain (User Story 2: Real implementation check)
            const programExists = await client.verifyProgramDeployment();
            
            if (programExists) {
              // Use main betting client
              console.log('✅ Using on-chain betting program');
              setState(prev => ({ 
                ...prev, 
                bettingClient: client,
                fallbackClient: null,
                usingFallback: false,
                error: null
              }));
            } else {
              throw new Error('Program not deployed');
            }
          } catch (programError) {
            // Fall back to temporary implementation
            console.log('⚠️ Betting program not deployed, using fallback system');
            await fallback.initialize(fullWallet);
            setState(prev => ({ 
              ...prev, 
              bettingClient: null,
              fallbackClient: fallback,
              usingFallback: true,
              error: null // Don't show error for expected fallback mode
            }));
            
            toast('⚠️ Using temporary betting system. Deploy betting program for full features.', {
              duration: 6000,
            });
          }
        } else {
          setState(prev => ({ 
            ...prev, 
            bettingClient: null,
            fallbackClient: null,
            usingFallback: false
          }));
        }
      } catch (error) {
        console.error('Failed to initialize betting client:', error);
        
        // Try fallback as last resort
        try {
          const fallback = new FallbackBettingClient(connection);
          if (publicKey && typeof window !== 'undefined') {
            const fullWallet = { publicKey, sendTransaction, ...walletContext };
            await fallback.initialize(fullWallet);
            setState(prev => ({ 
              ...prev, 
              bettingClient: null,
              fallbackClient: fallback,
              usingFallback: true,
              error: null // Clear any previous errors since fallback is working
            }));
            
            toast('⚠️ Using temporary betting system.', {
              duration: 4000,
            });
          }
        } catch (fallbackError) {
          setState(prev => ({ 
            ...prev, 
            error: `Betting system initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            bettingClient: null,
            fallbackClient: null,
            usingFallback: false
          }));
        }
      }
    };

    initializeBettingClient();
  }, [publicKey, connection, sendTransaction]);

  // Get betting account details (User Story 2: Create/access user's betting account PDA)
  const getBettingAccount = useCallback(async (): Promise<BettingAccount | null> => {
    if (!publicKey) return null;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let accountData: any = null;

      if (state.bettingClient) {
        // Use main Solana client
        const onChainAccount = await state.bettingClient.getBettingAccount(publicKey);
        
        if (onChainAccount) {
          accountData = {
            userId: `user_${publicKey.toString().slice(-8)}`,
            walletAddress: publicKey.toString(),
            pdaAddress: state.bettingClient.getBettingAccountPDA(publicKey)[0].toString(),
            balance: onChainAccount.balance.toNumber() / LAMPORTS_PER_SOL,
            totalDeposited: onChainAccount.totalDeposited.toNumber() / LAMPORTS_PER_SOL,
            totalWithdrawn: onChainAccount.totalWithdrawn.toNumber() / LAMPORTS_PER_SOL,
            lockedBalance: onChainAccount.lockedBalance.toNumber() / LAMPORTS_PER_SOL,
            lastUpdated: new Date(onChainAccount.lastUpdated.toNumber() * 1000).toISOString(),
          };
        }
      } else if (state.fallbackClient) {
        // Use fallback client
        const fallbackAccount = await state.fallbackClient.getBettingAccount(publicKey);
        
        if (fallbackAccount) {
          const [pdaAddress] = state.fallbackClient.getBettingAccountPDA(publicKey);
          accountData = {
            userId: `user_${publicKey.toString().slice(-8)}`,
            walletAddress: publicKey.toString(),
            pdaAddress: pdaAddress.toString(),
            balance: fallbackAccount.balance,
            totalDeposited: fallbackAccount.totalDeposited,
            totalWithdrawn: fallbackAccount.totalWithdrawn,
            lockedBalance: fallbackAccount.lockedBalance,
            lastUpdated: fallbackAccount.lastUpdated.toISOString(),
          };
        }
      } else {
        throw new Error('No betting client available');
      }

      if (accountData) {
        const bettingAccount: BettingAccount = accountData;
        setState(prev => ({ 
          ...prev, 
          bettingAccount,
          loading: false 
        }));
        return bettingAccount;
      } else {
        // Account doesn't exist yet, return null
        setState(prev => ({ 
          ...prev, 
          bettingAccount: null,
          loading: false 
        }));
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get betting account';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        loading: false 
      }));
      return null;
    }
  }, [publicKey, state.bettingClient, state.fallbackClient]);

  // Deposit SOL into betting account (User Story 2: Real SOL transfer, not simulation)
  const depositSol = useCallback(async (amount: number): Promise<DepositResult | null> => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return null;
    }

    if (!state.bettingClient && !state.fallbackClient) {
      toast.error('Betting system not available');
      return null;
    }

    // User Story 2: Enforce minimum deposit (0.1 SOL)
    if (amount < 0.1) {
      toast.error('Minimum deposit amount is 0.1 SOL');
      return null;
    }

    if (amount > 1000) {
      toast.error('Maximum deposit amount is 1000 SOL');
      return null;
    }

    setState(prev => ({ ...prev, isDepositing: true, error: null }));

    try {
      let result: any;

      if (state.bettingClient) {
        // Execute real SOL deposit to betting PDA (User Story 2: Transfer SOL from user wallet to betting PDA)
        result = await state.bettingClient.depositSol(publicKey, amount);
      } else if (state.fallbackClient) {
        // Use fallback implementation
        result = await state.fallbackClient.depositSol(publicKey, amount);
      } else {
        throw new Error('No betting client available');
      }
      
      // Update local state with new balance (User Story 2: Update user's on-chain balance record)
      setState(prev => ({ 
        ...prev, 
        isDepositing: false,
        bettingAccount: prev.bettingAccount ? {
          ...prev.bettingAccount,
          balance: result.newBalance,
          totalDeposited: prev.bettingAccount.totalDeposited + amount,
        } : null
      }));

      const successMessage = state.usingFallback 
        ? `Successfully deposited ${amount} SOL! (Using fallback system)`
        : `Successfully deposited ${amount} SOL!`;
      
      toast.success(successMessage);
      
      // Return result in expected format
      return {
        success: result.success,
        transactionId: result.transactionSignature,
        newBalance: result.newBalance,
        depositAmount: result.depositAmount,
        pdaAddress: result.pdaAddress,
        message: state.usingFallback 
          ? 'Deposit completed using fallback system' 
          : 'Deposit completed successfully on-chain'
      };
    } catch (error) {
      console.error('Deposit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to deposit SOL';
      
      setState(prev => ({ 
        ...prev, 
        isDepositing: false,
        error: errorMessage 
      }));
      
      toast.error(errorMessage);
      return null;
    }
  }, [publicKey, state.bettingClient, state.fallbackClient, state.usingFallback]);

  // Withdraw SOL from betting account 
  const withdrawSol = useCallback(async (amount: number, destinationAddress?: string): Promise<WithdrawalResult | null> => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return null;
    }

    if (!state.bettingClient && !state.fallbackClient) {
      toast.error('Betting system not available');
      return null;
    }

    if (amount <= 0) {
      toast.error('Withdrawal amount must be greater than 0');
      return null;
    }

    setState(prev => ({ ...prev, isWithdrawing: true, error: null }));

    try {
      let result: any;

      if (state.bettingClient) {
        // Execute real SOL withdrawal from betting PDA
        result = await state.bettingClient.withdrawSol(publicKey, amount);
      } else if (state.fallbackClient) {
        // Use fallback implementation
        result = await state.fallbackClient.withdrawSol(publicKey, amount);
      } else {
        throw new Error('No betting client available');
      }
      
      // Update local state
      setState(prev => ({ 
        ...prev, 
        isWithdrawing: false,
        bettingAccount: prev.bettingAccount ? {
          ...prev.bettingAccount,
          balance: result.newBalance,
          totalWithdrawn: prev.bettingAccount.totalWithdrawn + amount,
        } : null
      }));

      const successMessage = state.usingFallback
        ? `Successfully withdrew ${amount} SOL! (Using fallback system)`
        : `Successfully withdrew ${amount} SOL!`;
      
      toast.success(successMessage);
      
      return {
        success: result.success,
        transactionId: result.transactionSignature,
        newBalance: result.newBalance,
        withdrawalAmount: result.withdrawalAmount,
        message: state.usingFallback 
          ? 'Withdrawal completed using fallback system'
          : 'Withdrawal completed successfully'
      };
    } catch (error) {
      console.error('Withdrawal error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to withdraw SOL';
      
      setState(prev => ({ 
        ...prev, 
        isWithdrawing: false,
        error: errorMessage 
      }));
      
      toast.error(errorMessage);
      return null;
    }
  }, [publicKey, state.bettingClient, state.fallbackClient, state.usingFallback]);

  // Get transaction history (for now, this would need to be implemented with event listening)
  const getTransactionHistory = useCallback(async (limit: number = 50): Promise<TransactionRecord[]> => {
    if (!publicKey) return [];

    // For now, return empty array. In production, we would:
    // 1. Listen to on-chain events from our program
    // 2. Store them in a database
    // 3. Query them here
    // This follows GI.md directive to avoid simulations
    
    setState(prev => ({ 
      ...prev, 
      transactionHistory: [] 
    }));
    return [];
  }, [publicKey]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      getBettingAccount(),
      getTransactionHistory(),
    ]);
  }, [getBettingAccount, getTransactionHistory]);

  return {
    // State
    ...state,
    
    // Computed values
    availableBalance: state.bettingAccount ? 
      state.bettingAccount.balance - state.bettingAccount.lockedBalance : 0,
    
    // Actions
    depositSol,
    withdrawSol,
    getBettingAccount,
    getTransactionHistory,
    refreshData,
    
    // Utility
    isConnected: !!publicKey,
    walletAddress: publicKey?.toString(),
    
    // Real PDA address (not hardcoded)
    pdaAddress: publicKey ? (
      state.bettingClient ? 
        state.bettingClient.getBettingAccountPDA(publicKey)[0].toString() :
      state.fallbackClient ?
        state.fallbackClient.getBettingAccountPDA(publicKey)[0].toString() :
        undefined
    ) : undefined,
    
    // System status
    usingFallback: state.usingFallback,
  };
};
