import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeposit } from '@/hooks/useDeposit';
import { formatSOL } from '@/utils/format';
import toast from 'react-hot-toast';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    depositSol,
    bettingAccount,
    isDepositing,
    getBettingAccount,
    availableBalance,
    isConnected,
    error,
  } = useDeposit();

  const [depositAmount, setDepositAmount] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen && isConnected) {
      getBettingAccount();
    }
  }, [isOpen, isConnected, getBettingAccount]);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 0.1) {
      toast.error('Minimum deposit amount is 0.1 SOL');
      return;
    }

    if (amount > 1000) {
      toast.error('Maximum deposit amount is 1000 SOL');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmDeposit = async () => {
    const amount = parseFloat(depositAmount);
    
    setShowConfirmation(false);
    
    const result = await depositSol(amount);
    
    if (result?.success) {
      setDepositAmount('');
      onSuccess?.(amount);
      onClose();
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setDepositAmount('');
    onClose();
  };

  const quickAmounts = [0.1, 0.5, 1, 5, 10, 50];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-md w-full mx-4 overflow-hidden"
        >
          {/* Holographic Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/20 via-transparent to-magicblock-primary/20 animate-hologram" />
          
          <div className="relative hunter-card p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-hunter text-transparent bg-clip-text bg-gradient-to-r from-solana-purple to-solana-green">
                DEPOSIT SOL
              </h2>
              <button
                onClick={handleCancel}
                disabled={isDepositing}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!isConnected ? (
              <div className="text-center py-8">
                <div className="text-red-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-gray-400 font-cyber">
                  Please connect your wallet to deposit SOL
                </p>
              </div>
            ) : (
              <>
                {/* Current Balance */}
                {bettingAccount && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-cyber-dark/80 to-solana-dark/80 backdrop-blur-sm border border-solana-green/30"
                  >
                    <div className="text-center">
                      <div className="text-sm font-cyber text-solana-green uppercase tracking-wider">
                        Current Betting Balance
                      </div>
                      <div className="text-2xl font-bold font-mono text-white mt-1">
                        {formatSOL(bettingAccount.balance)}
                        <span className="text-lg ml-2 text-solana-green">SOL</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Available: {formatSOL(availableBalance)} SOL
                      </div>
                    </div>
                  </motion.div>
                )}

                {!showConfirmation ? (
                  <>
                    {/* Deposit Amount Input */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-cyber text-gray-400 uppercase tracking-wider mb-2">
                          Deposit Amount (SOL)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="0.0"
                            step="0.1"
                            min="0.1"
                            max="1000"
                            className="w-full px-4 py-3 bg-cyber-dark/50 border border-solana-purple/30 focus:border-solana-purple text-white font-mono text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-solana-purple/50 transition-all"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-solana-green font-cyber text-sm">
                            SOL
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Min: 0.1 SOL • Max: 1000 SOL
                        </div>
                      </div>

                      {/* Quick Amount Buttons */}
                      <div>
                        <div className="text-sm font-cyber text-gray-400 uppercase tracking-wider mb-2">
                          Quick Amounts
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {quickAmounts.map((amount) => (
                            <motion.button
                              key={amount}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setDepositAmount(amount.toString())}
                              className="px-3 py-2 bg-solana-dark/50 hover:bg-solana-dark/70 border border-solana-purple/30 hover:border-solana-purple/50 text-white font-mono text-sm transition-all"
                            >
                              {amount} SOL
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Fee Information */}
                    <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 text-sm">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-yellow-200">
                          <div className="font-cyber uppercase text-xs">Transaction Fee</div>
                          <div className="text-xs text-yellow-300">
                            Solana network fee (~0.000005 SOL) will be deducted from your wallet
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-900/20 border border-red-500/30 text-red-300 text-sm"
                      >
                        {error}
                      </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCancel}
                        disabled={isDepositing}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-cyber font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: depositAmount && !isDepositing ? 1.02 : 1 }}
                        whileTap={{ scale: depositAmount && !isDepositing ? 0.98 : 1 }}
                        onClick={handleDeposit}
                        disabled={!depositAmount || isDepositing || parseFloat(depositAmount) < 0.1}
                        className={`
                          flex-1 py-3 font-cyber font-bold uppercase tracking-wider transition-all
                          ${!depositAmount || isDepositing || parseFloat(depositAmount) < 0.1
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'cyber-button text-white'
                          }
                        `}
                      >
                        {isDepositing ? 'PROCESSING...' : 'REVIEW DEPOSIT'}
                      </motion.button>
                    </div>
                  </>
                ) : (
                  /* Confirmation Screen */
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <div className="text-lg font-hunter text-yellow-400 mb-2">
                        CONFIRM DEPOSIT
                      </div>
                      <div className="text-sm text-gray-400">
                        Please review your deposit details
                      </div>
                    </div>

                    {/* Deposit Summary */}
                    <div className="p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Deposit Amount</span>
                        <span className="text-xl font-bold font-mono text-yellow-400">
                          {depositAmount} SOL
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Network Fee</span>
                        <span className="text-sm font-mono text-gray-300">
                          ~0.000005 SOL
                        </span>
                      </div>
                      <div className="pt-3 border-t border-yellow-500/30">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">New Balance</span>
                          <span className="text-lg font-bold font-mono text-solana-green">
                            {bettingAccount 
                              ? formatSOL(bettingAccount.balance + parseFloat(depositAmount))
                              : formatSOL(parseFloat(depositAmount))
                            } SOL
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowConfirmation(false)}
                        disabled={isDepositing}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-cyber font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        Back
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: !isDepositing ? 1.02 : 1 }}
                        whileTap={{ scale: !isDepositing ? 0.98 : 1 }}
                        onClick={handleConfirmDeposit}
                        disabled={isDepositing}
                        className={`
                          flex-1 py-3 font-cyber font-bold uppercase tracking-wider transition-all
                          ${isDepositing
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'cyber-button text-white'
                          }
                        `}
                      >
                        {isDepositing ? (
                          <span className="flex items-center justify-center space-x-2">
                            <span>DEPOSITING</span>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            />
                          </span>
                        ) : (
                          'CONFIRM DEPOSIT'
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DepositModal;
