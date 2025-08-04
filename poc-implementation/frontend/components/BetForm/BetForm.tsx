// BetForm component for bet placement interface
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { validateSOLAmount, validateBetAmount } from '@/utils/validation';
import { formatSOL } from '@/utils/format';

interface BetFormProps {
  onSubmit?: (amount: number, agent: 1 | 2) => Promise<void>;
  selectedAgent?: 1 | 2 | null;
  onAgentSelect?: (agent: 1 | 2) => void;
  isLoading?: boolean;
  maxBalance?: number;
  className?: string;
}

export const BetForm: React.FC<BetFormProps> = ({
  onSubmit = async () => {},
  selectedAgent: initialAgent = null,
  onAgentSelect: externalAgentSelect,
  isLoading = false,
  maxBalance = 10, // 10 SOL default
  className = '',
}) => {
  const [selectedAgent, setSelectedAgent] = React.useState<1 | 2 | null>(initialAgent);
  
  const onAgentSelect = (agent: 1 | 2) => {
    setSelectedAgent(agent);
    externalAgentSelect?.(agent);
  };
  const { connected } = useWallet();
  const [betAmount, setBetAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick bet amounts
  const quickAmounts = ['0.1', '0.5', '1.0', '2.0', '5.0'];

  // Validation
  const amountValidation = validateSOLAmount(betAmount);
  const betValidation = amountValidation.isValid && amountValidation.sanitizedValue
    ? validateBetAmount(amountValidation.sanitizedValue, maxBalance)
    : { isValid: false, error: 'Enter a valid amount' };

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !selectedAgent || !betValidation.isValid || !amountValidation.sanitizedValue) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(amountValidation.sanitizedValue, selectedAgent);
      setBetAmount(''); // Reset form on success
    } catch (error) {
      console.error('Bet submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [connected, selectedAgent, betValidation.isValid, amountValidation.sanitizedValue, onSubmit]);

  const isFormValid = connected && selectedAgent && betValidation.isValid && !isSubmitting && !isLoading;

  return (
    <motion.form
      onSubmit={handleSubmit}
      className={`bg-space-800 rounded-lg p-6 border border-space-600 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-bold text-gray-300 mb-4">Place Your Bet</h3>

      {/* Agent Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-3">
          Select Agent
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onAgentSelect(1)}
            className={`p-3 rounded-lg border-2 transition-all duration-200 ${
              selectedAgent === 1
                ? 'border-enhancement-400 bg-enhancement-500/20 text-enhancement-400'
                : 'border-space-600 hover:border-space-500 text-gray-400 hover:text-gray-300'
            }`}
            data-testid="select-agent-1"
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🤖</div>
              <div className="text-sm font-medium">Agent 1</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onAgentSelect(2)}
            className={`p-3 rounded-lg border-2 transition-all duration-200 ${
              selectedAgent === 2
                ? 'border-emission-400 bg-emission-500/20 text-emission-400'
                : 'border-space-600 hover:border-space-500 text-gray-400 hover:text-gray-300'
            }`}
            data-testid="select-agent-2"
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🤖</div>
              <div className="text-sm font-medium">Agent 2</div>
            </div>
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-3">
          Bet Amount
        </label>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mb-3">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setBetAmount(amount)}
              disabled={!connected}
              className="px-3 py-1 text-sm rounded-lg bg-space-700 border border-space-600 hover:border-emission-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid={`quick-amount-${amount}`}
            >
              {amount} SOL
            </button>
          ))}
        </div>

        {/* Custom Amount Input */}
        <div className="relative">
          <input
            type="text"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="Enter amount..."
            disabled={!connected}
            className={`
              w-full px-4 py-3 rounded-lg bg-space-700 border-2 transition-colors
              ${amountValidation.isValid 
                ? 'border-emission-400 focus:border-emission-300' 
                : betAmount && !amountValidation.isValid
                  ? 'border-enhancement-500'
                  : 'border-space-600 focus:border-space-500'
              }
              text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed
            `}
            data-testid="bet-amount-input"
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            SOL
          </span>
        </div>

        {/* Validation Message */}
        {betAmount && !amountValidation.isValid && (
          <motion.p
            className="text-sm text-enhancement-400 mt-2"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="validation-error"
          >
            {amountValidation.error}
          </motion.p>
        )}

        {/* Balance Info */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Available: {formatSOL(maxBalance * LAMPORTS_PER_SOL)}</span>
          {amountValidation.sanitizedValue && (
            <span>
              Remaining: {formatSOL((maxBalance - amountValidation.sanitizedValue) * LAMPORTS_PER_SOL)}
            </span>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={!isFormValid}
        className={`
          w-full py-4 rounded-lg font-bold text-lg transition-all duration-300
          ${isFormValid
            ? 'nen-button bg-aura-gradient hover:shadow-aura' 
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }
        `}
        whileHover={{ scale: isFormValid ? 1.02 : 1 }}
        whileTap={{ scale: isFormValid ? 0.98 : 1 }}
        data-testid="submit-bet-button"
      >
        {!connected ? (
          'Connect Wallet to Bet'
        ) : isSubmitting || isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="nen-spinner" />
            <span>Placing Bet...</span>
          </div>
        ) : !selectedAgent ? (
          'Select an Agent'
        ) : !betValidation.isValid ? (
          'Enter Valid Amount'
        ) : (
          `Place Bet (${formatSOL(amountValidation.sanitizedValue! * LAMPORTS_PER_SOL)})`
        )}
      </motion.button>

      {/* Terms Notice */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        By placing a bet, you agree to our terms and conditions. 
        All transactions are final and processed on Solana blockchain.
      </p>
    </motion.form>
  );
};
