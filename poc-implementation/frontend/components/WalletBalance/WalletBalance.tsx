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

export const WalletBalance: React.FC<WalletBalanceProps> = ({ className = '' }) => {
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

  // Lock body scroll when modals are open
  useEffect(() => {
    if (showDepositModal || showWithdrawModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [showDepositModal, showWithdrawModal]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchWalletBalance(),
      refreshAccountData(),
    ]);
  }, [fetchWalletBalance, refreshAccountData]);

  const handleDeposit = async () => {
    console.log('🚀 Deposit button clicked'); // Debug log
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
        await createBettingAccount();
      }

  const result = await depositSol(amount);
      
      if (result) {
        // Refresh wallet balance to reflect the transfer
        await fetchWalletBalance();
        setShowDepositModal(false);
        setDepositAmount('');
        if ((result as any).explorerUrl) {
          toast.success('Deposit confirmed on devnet', {
            id: dismiss,
          });
        } else {
          toast.success('Deposit submitted', { id: dismiss });
        }
      }
    } catch (error) {
      console.error('Deposit failed:', error);
      toast.error(error instanceof Error ? error.message : 'Deposit failed', { id: dismiss });
    } finally {
      setDepositing(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      await createBettingAccount();
    } catch (error) {
      console.error('Failed to create betting account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create betting account');
    }
  };

  const handleWithdraw = async () => {
    console.log('🏧 Withdraw button clicked'); // Debug log
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
      const result = await withdrawSol(amount);
      if (result) {
        await fetchWalletBalance();
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        if ((result as any).explorerUrl) {
          toast.success('Withdrawal confirmed on devnet', {
            id: dismiss,
          });
        } else {
          toast.success('Withdrawal submitted', { id: dismiss });
        }
      }
    } catch (error) {
      console.error('Withdrawal failed:', error);
      toast.error(error instanceof Error ? error.message : 'Withdrawal failed', { id: dismiss });
    } finally {
      setWithdrawing(false);
    }
  };

  const isLoading = walletData.loading || bettingLoading;

  if (!connected) {
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

  return (
    <>
      <div className={`hunter-card p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-hunter text-white">WALLET BALANCE</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="text-solana-purple hover:text-solana-green transition-colors"
              disabled={isLoading}
              title="Refresh balances"
            >
              {isLoading ? '⟳' : '🔄'}
            </button>
            
            <button
              onClick={() => {
                console.log('🎯 DEPOSIT button clicked - opening modal'); // Debug log
                setShowDepositModal(true);
              }}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded"
              style={{ 
                position: 'relative',
                zIndex: 100,
                pointerEvents: 'auto',
                display: 'block'
              }}
            >
              DEPOSIT
            </button>
            
            {hasAccount && ((availableBalance || 0) > 0) && (
              <button
                onClick={() => {
                  console.log('🎯 WITHDRAW button clicked - opening modal'); // Debug log
                  setShowWithdrawModal(true);
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded"
                style={{ 
                  position: 'relative',
                  zIndex: 100,
                  pointerEvents: 'auto',
                  display: 'block'
                }}
              >
                WITHDRAW
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
                    onClick={handleCreateAccount}
                    className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 font-cyber text-xs uppercase transition-all rounded"
                    disabled={bettingLoading}
                    style={{ 
                      pointerEvents: 'auto',
                      cursor: bettingLoading ? 'not-allowed' : 'pointer',
                      zIndex: 1000,
                      position: 'relative'
                    }}
                  >
                    {bettingLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
                  </button>
                </div>
              </div>
            )}

            {/* Additional Balances (Future Features) */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-cyber-dark/50 p-3 rounded">
                <div className="text-lg font-mono text-solana-green">0.00</div>
                <div className="text-xs text-gray-400 uppercase">Staked</div>
              </div>
              <div className="bg-cyber-dark/50 p-3 rounded">
                <div className="text-lg font-mono text-yellow-400">0.00</div>
                <div className="text-xs text-gray-400 uppercase">Pending</div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Network</span>
                <span className="text-magicblock-primary font-mono">Devnet</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-500">Deposits</span>
                <span className="text-gray-500 font-mono">{depositCount || 0}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-500">Withdrawals</span>
                <span className="text-gray-500 font-mono">{withdrawalCount || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ 
              pointerEvents: 'auto',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                console.log('🎯 Closing deposit modal via backdrop'); // Debug log
                setShowDepositModal(false);
              }}
              style={{ 
                pointerEvents: 'auto',
                zIndex: 10000
              }}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative hunter-card p-6 w-full max-w-md"
              style={{ 
                pointerEvents: 'auto',
                zIndex: 10001,
                position: 'relative'
              }}
            >
              <h3 className="text-xl font-hunter text-white mb-4">DEPOSIT SOL</h3>
              
              <div className="space-y-4">
                {!hasAccount && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ You need to create a betting account first. This will be done automatically with your first deposit.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                    Amount (SOL)
                  </label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => {
                      console.log('💰 Deposit amount changed:', e.target.value); // Debug log
                      setDepositAmount(e.target.value);
                    }}
                    placeholder="0.1"
                    min="0.1"
                    max={walletData.walletBalance}
                    step="0.1"
                    autoComplete="off"
                    autoFocus
                    className="w-full px-4 py-3 bg-cyber-dark border border-solana-purple/30 rounded text-white font-mono focus:outline-none focus:border-solana-purple focus:ring-2 focus:ring-solana-purple/50 transition-all"
                    style={{ pointerEvents: 'auto' }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Minimum: 0.1 SOL • Available: {walletData.walletBalance.toFixed(3)} SOL
                  </p>
                </div>

                <div className="bg-cyber-dark/50 p-3 rounded">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">From:</span>
                    <span className="text-white">Wallet Balance</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">To:</span>
                    <span className="text-white">Betting Account</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-magicblock-primary">Devnet</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Fee:</span>
                    <span className="text-white">~0.000005 SOL</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      console.log('❌ Cancel deposit clicked'); // Debug log
                      setShowDepositModal(false);
                    }}
                    disabled={depositing}
                    className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm uppercase rounded"
                    style={{
                      position: 'relative',
                      zIndex: 10000,
                      pointerEvents: 'auto',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => console.log('🖱️ Cancel button hovered')}
                    onMouseDown={() => console.log('🖱️ Cancel button mouse down')}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={(e) => {
                      console.log('✅ Deposit submit clicked'); // Debug log
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeposit();
                    }}
                    disabled={depositing || !depositAmount || parseFloat(depositAmount) < 0.1}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-sm uppercase rounded"
                    style={{
                      position: 'relative',
                      zIndex: 10000,
                      pointerEvents: 'auto',
                      cursor: depositing || !depositAmount || parseFloat(depositAmount) < 0.1 ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={() => console.log('🖱️ Deposit button hovered')}
                    onMouseDown={() => console.log('🖱️ Deposit button mouse down')}
                  >
                    {depositing ? 'DEPOSITING...' : 'DEPOSIT'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ 
              pointerEvents: 'auto',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                console.log('🎯 Closing withdraw modal via backdrop'); // Debug log
                setShowWithdrawModal(false);
              }}
              style={{ 
                pointerEvents: 'auto',
                zIndex: 10000
              }}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative hunter-card p-6 w-full max-w-md"
              style={{ 
                pointerEvents: 'auto',
                zIndex: 10001,
                position: 'relative'
              }}
            >
              <h3 className="text-xl font-hunter text-white mb-4">WITHDRAW SOL</h3>

              <div className="space-y-4">
                {!hasAccount && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ You need to create a betting account first.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                    Amount (SOL)
                  </label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => {
                      console.log('💸 Withdraw amount changed:', e.target.value); // Debug log
                      setWithdrawAmount(e.target.value);
                    }}
                    placeholder="0.01"
                    min="0.01"
                    max={availableBalance || 0}
                    step="0.01"
                    autoComplete="off"
                    autoFocus
                    className="w-full px-4 py-3 bg-cyber-dark border border-amber-500/30 rounded text-white font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all"
                    style={{ pointerEvents: 'auto' }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Minimum: 0.01 SOL • Available: {((availableBalance || 0) || 0).toFixed(6)} SOL
                  </p>
                </div>

                <div className="bg-cyber-dark/50 p-3 rounded">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">From:</span>
                    <span className="text-white">Betting Account</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">To:</span>
                    <span className="text-white">Wallet Balance</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-magicblock-primary">Devnet</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Fee:</span>
                    <span className="text-white">~0.000005 SOL</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      console.log('❌ Cancel withdraw clicked'); // Debug log
                      setShowWithdrawModal(false);
                    }}
                    disabled={withdrawing}
                    className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold text-sm uppercase rounded"
                    style={{
                      position: 'relative',
                      zIndex: 10000,
                      pointerEvents: 'auto',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => console.log('🖱️ Cancel withdraw button hovered')}
                    onMouseDown={() => console.log('🖱️ Cancel withdraw button mouse down')}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={(e) => {
                      console.log('✅ Withdraw submit clicked'); // Debug log
                      e.preventDefault();
                      e.stopPropagation();
                      handleWithdraw();
                    }}
                    disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 0.01 || parseFloat(withdrawAmount) > (availableBalance || 0)}
                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-sm uppercase rounded"
                    style={{
                      position: 'relative',
                      zIndex: 10000,
                      pointerEvents: 'auto',
                      cursor: withdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 0.01 || parseFloat(withdrawAmount) > (availableBalance || 0) ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={() => console.log('🖱️ Withdraw button hovered')}
                    onMouseDown={() => console.log('🖱️ Withdraw button mouse down')}
                  >
                    {withdrawing ? 'WITHDRAWING...' : 'WITHDRAW'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WalletBalance;