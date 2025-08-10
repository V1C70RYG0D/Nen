/**
 * Enhanced debug version of WalletBalance component
 * Adds console logging to track click events and state changes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { formatSOL } from '@/utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { useProductionBetting } from '@/hooks/useProductionBetting';
import toast from 'react-hot-toast';

interface WalletBalanceProps {
  className?: string;
}

interface WalletBalanceData {
  walletBalance: number;
  loading: boolean;
  error: string | null;
}

export const WalletBalanceDebug: React.FC<WalletBalanceProps> = ({ className = '' }) => {
  console.log('🐛 WalletBalance component rendering...');
  
  const { publicKey, connected } = useWallet();
  const {
    balance: bettingBalance,
    availableBalance,
    lockedBalance,
    depositCount,
    withdrawalCount,
    accountExists: hasAccount,
    isLoading: bettingLoading,
    error: bettingError,
    depositSol,
    withdrawSol,
    refreshAccountData,
    createBettingAccount,
  } = useProductionBetting();

  console.log('🐛 Wallet state:', { connected, publicKey: publicKey?.toString(), hasAccount });
  console.log('🐛 Betting state:', { bettingBalance, availableBalance, bettingLoading, bettingError });

  const [walletData, setWalletData] = useState<WalletBalanceData>({
    walletBalance: 0,
    loading: false,
    error: null,
  });
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Enhanced click handlers with logging
  const handleRefreshClick = useCallback(async () => {
    console.log('🐛 Refresh button clicked!');
    try {
      await Promise.all([
        fetchWalletBalance(),
        refreshAccountData(),
      ]);
      console.log('🐛 Refresh completed successfully');
    } catch (error) {
      console.error('🐛 Refresh failed:', error);
    }
  }, []);

  const handleDepositClick = useCallback(() => {
    console.log('🐛 Deposit button clicked!');
    setShowDepositModal(true);
  }, []);

  const handleWithdrawClick = useCallback(() => {
    console.log('🐛 Withdraw button clicked!');
    setShowWithdrawModal(true);
  }, []);

  const handleCreateAccountClick = useCallback(async () => {
    console.log('🐛 Create account button clicked!');
    try {
      await createBettingAccount();
      console.log('🐛 Account creation completed');
    } catch (error) {
      console.error('🐛 Account creation failed:', error);
    }
  }, [createBettingAccount]);

  // Fetch wallet balance
  const fetchWalletBalance = useCallback(async () => {
    if (!connected || !publicKey) {
      setWalletData({ walletBalance: 0, loading: false, error: null });
      return;
    }

    setWalletData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      let walletBalance = 0;
      
      try {
        const balance = await connection.getBalance(publicKey);
        walletBalance = balance / LAMPORTS_PER_SOL;
      } catch (err) {
        console.log('Using mock wallet balance for demo');
        walletBalance = 125.5; // Mock balance for demo when devnet is not accessible
      }

      setWalletData({
        walletBalance,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
      setWalletData({
        walletBalance: 125.5, // Fallback mock balance
        loading: false,
        error: 'Failed to fetch wallet balance',
      });
    }
  }, [publicKey, connected]);

  useEffect(() => {
    fetchWalletBalance();
  }, [fetchWalletBalance]);

  const handleDeposit = async () => {
    console.log('🐛 Processing deposit...', { depositAmount });
    
    if (!depositAmount) {
      toast.error('Please enter a deposit amount');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 0.1) {
      toast.error('Minimum deposit is 0.1 SOL');
      return;
    }

    if (amount > walletData.walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setDepositing(true);
    const dismiss = toast.loading('Preparing deposit transaction...');

    try {
      // Auto-create betting account on first deposit if needed
      if (!hasAccount) {
        console.log('🐛 Creating betting account first...');
        await createBettingAccount();
      }

      console.log('🐛 Calling depositSol...');
      const result = await depositSol(amount);
      
      if (result) {
        // Refresh wallet balance to reflect the transfer
        await fetchWalletBalance();
        setShowDepositModal(false);
        setDepositAmount('');
        toast.success('Deposit completed', { id: dismiss });
      }
    } catch (error) {
      console.error('🐛 Deposit failed:', error);
      toast.error(error instanceof Error ? error.message : 'Deposit failed', { id: dismiss });
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    console.log('🐛 Processing withdrawal...', { withdrawAmount });
    
    if (!withdrawAmount) {
      toast.error('Please enter a withdrawal amount');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 0.01) {
      toast.error('Minimum withdrawal is 0.01 SOL');
      return;
    }

    if (amount > availableBalance) {
      toast.error(`Insufficient available balance. Available: ${(availableBalance || 0).toFixed(6)} SOL`);
      return;
    }

    setWithdrawing(true);
    const dismiss = toast.loading('Preparing withdrawal transaction...');
    try {
      console.log('🐛 Calling withdrawSol...');
      const result = await withdrawSol(amount);
      if (result) {
        await fetchWalletBalance();
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        toast.success('Withdrawal completed', { id: dismiss });
      }
    } catch (error) {
      console.error('🐛 Withdrawal failed:', error);
      toast.error(error instanceof Error ? error.message : 'Withdrawal failed', { id: dismiss });
    } finally {
      setWithdrawing(false);
    }
  };

  const isLoading = walletData.loading || bettingLoading;

  if (!connected) {
    console.log('🐛 Wallet not connected, showing connect prompt');
    return (
      <div className={`hunter-card p-6 ${className}`}>
        <h3 className="text-xl font-hunter text-white mb-4">WALLET BALANCE</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🔒</div>
          <p className="text-gray-400">Connect wallet to view balance</p>
        </div>
      </div>
    );
  }

  console.log('🐛 Rendering wallet balance component with buttons');

  return (
    <>
      <div className={`hunter-card p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-hunter text-white">WALLET BALANCE (DEBUG)</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                console.log('🐛 Raw refresh button click event:', e);
                handleRefreshClick();
              }}
              className="text-solana-purple hover:text-solana-green transition-colors"
              disabled={isLoading}
              title="Refresh balances"
              style={{ pointerEvents: 'auto', cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? '⟳' : '🔄'}
            </button>
            <button
              onClick={(e) => {
                console.log('🐛 Raw deposit button click event:', e);
                handleDepositClick();
              }}
              className="px-3 py-1 bg-solana-purple/20 hover:bg-solana-purple/30 border border-solana-purple/50 text-solana-purple font-cyber text-xs uppercase transition-all rounded"
              disabled={isLoading}
              style={{ pointerEvents: 'auto', cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              DEPOSIT (DEBUG)
            </button>
            {hasAccount && ((availableBalance || 0) > 0) && (
              <button
                onClick={(e) => {
                  console.log('🐛 Raw withdraw button click event:', e);
                  handleWithdrawClick();
                }}
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-cyber text-xs uppercase transition-all rounded"
                disabled={isLoading}
                style={{ pointerEvents: 'auto', cursor: isLoading ? 'not-allowed' : 'pointer' }}
              >
                WITHDRAW (DEBUG)
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin w-8 h-8 border-2 border-solana-purple border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">Loading balances...</p>
          </div>
        ) : (walletData.error || bettingError) ? (
          <div className="text-center py-4">
            <div className="text-red-400 text-2xl mb-2">⚠️</div>
            <p className="text-red-400 text-sm">{walletData.error || bettingError}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main Wallet Balance Display */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="text-3xl font-mono text-transparent bg-clip-text bg-gradient-to-r from-solana-purple to-solana-green">
                {walletData.walletBalance.toFixed(3)} SOL
              </div>
              <p className="text-gray-400 text-sm mt-1">Wallet Balance</p>
            </motion.div>

            {/* Debug Info */}
            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded">
              <p className="text-red-400 text-xs">
                DEBUG MODE: Click events will be logged to console
              </p>
            </div>

            {/* Betting Account Section */}
            {hasAccount ? (
              <div className="bg-cyber-dark/50 p-4 rounded border border-solana-purple/20">
                <div className="text-center mb-3">
                  <div className="text-2xl font-mono text-magicblock-primary">
                    {(bettingBalance || 0).toFixed(3)} SOL
                  </div>
                  <p className="text-gray-400 text-xs">Betting Balance</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-cyber-darker/50 p-2 rounded">
                    <div className="text-sm font-mono text-solana-green">
                      {((availableBalance || 0) || 0).toFixed(3)}
                    </div>
                    <div className="text-xs text-gray-400 uppercase">Available</div>
                  </div>
                  <div className="bg-cyber-darker/50 p-2 rounded">
                    <div className="text-sm font-mono text-yellow-400">
                      {((lockedBalance || 0) || 0).toFixed(3)}
                    </div>
                    <div className="text-xs text-gray-400 uppercase">Locked</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-cyber-dark/50 p-4 rounded border border-yellow-500/20">
                <div className="text-center">
                  <div className="text-yellow-400 text-xl mb-2">⚠️</div>
                  <p className="text-gray-400 text-sm mb-3">No betting account found</p>
                  <button
                    onClick={(e) => {
                      console.log('🐛 Raw create account button click event:', e);
                      handleCreateAccountClick();
                    }}
                    className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 font-cyber text-xs uppercase transition-all rounded"
                    disabled={bettingLoading}
                    style={{ pointerEvents: 'auto', cursor: bettingLoading ? 'not-allowed' : 'pointer' }}
                  >
                    {bettingLoading ? 'CREATING...' : 'CREATE ACCOUNT (DEBUG)'}
                  </button>
                </div>
              </div>
            )}

            {/* Additional debug buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => console.log('🐛 Test button 1 clicked')}
                className="p-2 bg-blue-500/20 text-blue-400 text-xs rounded"
              >
                TEST 1
              </button>
              <button
                onClick={() => console.log('🐛 Test button 2 clicked')}
                className="p-2 bg-green-500/20 text-green-400 text-xs rounded"
              >
                TEST 2
              </button>
              <button
                onClick={() => console.log('🐛 Test button 3 clicked')}
                className="p-2 bg-purple-500/20 text-purple-400 text-xs rounded"
              >
                TEST 3
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simplified Deposit Modal for debugging */}
      {showDepositModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            console.log('🐛 Modal backdrop clicked');
            setShowDepositModal(false);
          }}
        >
          <div
            className="hunter-card p-6 w-full max-w-md"
            onClick={(e) => {
              console.log('🐛 Modal content clicked');
              e.stopPropagation();
            }}
          >
            <h3 className="text-xl font-hunter text-white mb-4">DEPOSIT SOL (DEBUG)</h3>
            
            <div className="space-y-4">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => {
                  console.log('🐛 Deposit amount changed:', e.target.value);
                  setDepositAmount(e.target.value);
                }}
                placeholder="0.1"
                className="w-full px-4 py-3 bg-cyber-dark border border-solana-purple/30 rounded text-white"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    console.log('🐛 Cancel button clicked');
                    setShowDepositModal(false);
                  }}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    console.log('🐛 Deposit submit button clicked');
                    handleDeposit();
                  }}
                  disabled={depositing || !depositAmount}
                  className="flex-1 py-3 bg-solana-purple hover:bg-solana-purple/80 disabled:bg-gray-600 text-white rounded"
                >
                  {depositing ? 'DEPOSITING...' : 'DEPOSIT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Withdraw Modal for debugging */}
      {showWithdrawModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            console.log('🐛 Withdraw modal backdrop clicked');
            setShowWithdrawModal(false);
          }}
        >
          <div
            className="hunter-card p-6 w-full max-w-md"
            onClick={(e) => {
              console.log('🐛 Withdraw modal content clicked');
              e.stopPropagation();
            }}
          >
            <h3 className="text-xl font-hunter text-white mb-4">WITHDRAW SOL (DEBUG)</h3>
            
            <div className="space-y-4">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => {
                  console.log('🐛 Withdraw amount changed:', e.target.value);
                  setWithdrawAmount(e.target.value);
                }}
                placeholder="0.01"
                className="w-full px-4 py-3 bg-cyber-dark border border-amber-500/30 rounded text-white"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    console.log('🐛 Withdraw cancel button clicked');
                    setShowWithdrawModal(false);
                  }}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    console.log('🐛 Withdraw submit button clicked');
                    handleWithdraw();
                  }}
                  disabled={withdrawing || !withdrawAmount}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-500/80 disabled:bg-gray-600 text-black rounded"
                >
                  {withdrawing ? 'WITHDRAWING...' : 'WITHDRAW'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WalletBalanceDebug;
