import React, { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { formatSOL } from '@/utils/format';
import { useBettingAccount } from '@/hooks/useBettingAccount';
import toast from 'react-hot-toast';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  lockedBalance: number;
  onWithdrawalSuccess: () => void;
}

/**
 * Withdrawal Modal Component
 * Implements User Story 2a: Withdraw SOL from betting account
 * 
 * Features:
 * - Real SOL withdrawal from betting PDA to user wallet
 * - 24-hour cooldown validation for security
 * - Locked funds validation
 * - Real devnet transactions
 */
export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  availableBalance,
  lockedBalance,
  onWithdrawalSuccess,
}) => {
  const { publicKey, connected } = useWallet();
  const { withdrawSol } = useBettingAccount();
  
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [cooldownError, setCooldownError] = useState<string | null>(null);

  // Validate withdrawal amount and constraints
  const validateWithdrawal = useCallback((amount: number): string | null => {
    if (!amount || amount <= 0) {
      return 'Please enter a valid withdrawal amount';
    }

    if (amount < 0.01) {
      return 'Minimum withdrawal amount is 0.01 SOL';
    }

    if (amount > availableBalance) {
      return `Insufficient available balance. Available: ${availableBalance.toFixed(4)} SOL`;
    }

    // Check if withdrawal exceeds available balance considering locked funds
    if (lockedBalance > 0 && amount > (availableBalance - lockedBalance)) {
      return `Cannot withdraw ${amount} SOL. ${lockedBalance.toFixed(4)} SOL is locked in active bets`;
    }

    return null;
  }, [availableBalance, lockedBalance]);

  // Check 24-hour cooldown (User Story 2a requirement)
  const checkCooldownPeriod = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    
    const lastWithdrawalKey = `last-withdrawal-${publicKey?.toString()}`;
    const lastWithdrawal = localStorage.getItem(lastWithdrawalKey);
    
    if (lastWithdrawal) {
      const lastWithdrawalTime = parseInt(lastWithdrawal);
      const currentTime = Date.now();
      const timeDifference = currentTime - lastWithdrawalTime;
      const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (timeDifference < cooldownPeriod) {
        const remainingTime = cooldownPeriod - timeDifference;
        const remainingHours = Math.ceil(remainingTime / (60 * 60 * 1000));
        return `Withdrawal cooldown active. Please wait ${remainingHours} hours before next withdrawal.`;
      }
    }
    
    return null;
  }, [publicKey]);

  const handleWithdrawal = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    
    // Validate withdrawal constraints
    const validationError = validateWithdrawal(amount);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Check 24-hour cooldown (User Story 2a requirement)
    const cooldownError = checkCooldownPeriod();
    if (cooldownError) {
      setCooldownError(cooldownError);
      toast.error(cooldownError);
      return;
    }

    setCooldownError(null);
    setIsWithdrawing(true);

    try {
      console.log('🏧 Initiating SOL withdrawal from betting account...');
      console.log(`💰 Amount: ${amount} SOL`);
      console.log(`📊 Available Balance: ${availableBalance} SOL`);
      console.log(`🔒 Locked Balance: ${lockedBalance} SOL`);

      // Execute real SOL withdrawal via Solana devnet
      const result = await withdrawSol(amount);
      
      if (result && result.success) {
        // Store withdrawal timestamp for 24-hour cooldown
        if (typeof window !== 'undefined') {
          const withdrawalKey = `last-withdrawal-${publicKey.toString()}`;
          localStorage.setItem(withdrawalKey, Date.now().toString());
        }

        toast.success(
          `Successfully withdrew ${amount} SOL to your wallet! Transaction: ${result.transactionSignature?.slice(0, 8)}...`,
          { duration: 5000 }
        );
        
        // Reset form and close modal
        setWithdrawalAmount('');
        onWithdrawalSuccess();
        onClose();
      } else {
        throw new Error('Withdrawal failed - no result returned');
      }
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Withdrawal failed';
      toast.error(`Withdrawal failed: ${errorMessage}`);
      
      // Show cooldown error if it's related to locked funds or cooldown
      if (errorMessage.includes('locked') || errorMessage.includes('cooldown')) {
        setCooldownError(errorMessage);
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleCancel = () => {
    setWithdrawalAmount('');
    setCooldownError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="hunter-card p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-hunter text-white">WITHDRAW SOL</h3>
            <div className="text-sm text-magicblock-primary font-mono">
              DEVNET
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Balance Information */}
            <div className="bg-cyber-dark/50 p-4 rounded border border-solana-purple/20">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 uppercase">Available</div>
                  <div className="text-lg font-mono text-solana-green">
                    {formatSOL(availableBalance * LAMPORTS_PER_SOL)} SOL
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase">Locked</div>
                  <div className="text-lg font-mono text-yellow-400">
                    {formatSOL(lockedBalance * LAMPORTS_PER_SOL)} SOL
                  </div>
                </div>
              </div>
            </div>

            {/* Cooldown Warning */}
            {cooldownError && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded">
                <div className="flex items-start gap-2">
                  <div className="text-red-400 text-lg">⏰</div>
                  <div>
                    <div className="text-red-400 font-cyber text-sm">Security Cooldown</div>
                    <p className="text-red-300 text-xs mt-1">{cooldownError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded">
              <div className="flex items-start gap-2">
                <div className="text-yellow-400 text-lg">🛡️</div>
                <div>
                  <div className="text-yellow-400 font-cyber text-sm">Security Features</div>
                  <ul className="text-yellow-300 text-xs mt-1 space-y-1">
                    <li>• 24-hour cooldown between withdrawals</li>
                    <li>• Locked funds from active bets cannot be withdrawn</li>
                    <li>• Real devnet SOL transfer to your wallet</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Withdrawal Amount Input */}
            <div>
              <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                Withdrawal Amount (SOL)
              </label>
              <input
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="0.01"
                min="0.01"
                max={availableBalance}
                step="0.01"
                disabled={!!cooldownError}
                className="w-full px-4 py-3 bg-cyber-dark border border-solana-purple/30 rounded text-white font-mono focus:outline-none focus:border-solana-purple disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Minimum: 0.01 SOL</span>
                <span>Available: {availableBalance.toFixed(4)} SOL</span>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-cyber-dark/50 p-3 rounded text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">From:</span>
                <span className="text-white">Betting Account PDA</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">To:</span>
                <span className="text-white">Your Wallet</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Network:</span>
                <span className="text-magicblock-primary">Solana Devnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Transaction Fee:</span>
                <span className="text-white">~0.000005 SOL</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 text-white font-cyber text-sm uppercase transition-all rounded"
                disabled={isWithdrawing}
              >
                CANCEL
              </button>
              <button
                onClick={handleWithdrawal}
                disabled={
                  isWithdrawing || 
                  !withdrawalAmount || 
                  parseFloat(withdrawalAmount) < 0.01 || 
                  parseFloat(withdrawalAmount) > availableBalance ||
                  !!cooldownError
                }
                className="flex-1 py-3 bg-solana-green hover:bg-solana-green/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-cyber text-sm uppercase transition-all rounded"
              >
                {isWithdrawing ? 'WITHDRAWING...' : 'WITHDRAW'}
              </button>
            </div>

            {/* Additional Info */}
            <div className="text-xs text-gray-500 text-center">
              This withdrawal will be processed immediately on Solana devnet.
              <br />
              Transaction will be verifiable on Solana Explorer.
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WithdrawalModal;
