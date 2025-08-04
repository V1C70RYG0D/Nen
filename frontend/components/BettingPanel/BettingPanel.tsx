// Betting panel component with Solana integration
import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useBetting } from '@/hooks/useBetting';
import { formatSOL, formatPercentage, shortenAddress } from '@/utils/format';
import { validateSOLAmount, validateBetAmount } from '@/utils/validation';
import { getAuraGlow } from '@/utils/theme';
import type { AIAgent } from '@/types';

interface BettingPanelProps {
  matchId: string;
  agent1: AIAgent;
  agent2: AIAgent;
  className?: string;
}

interface BetAmountButtonProps {
  amount: string;
  onClick: () => void;
  disabled?: boolean;
}

// Quick bet amount buttons
const BetAmountButton: React.FC<BetAmountButtonProps> = ({ amount, onClick, disabled }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    className="px-3 py-1 text-sm rounded-lg bg-space-700 border border-space-600 hover:border-emission-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    whileHover={{ scale: disabled ? 1 : 1.05 }}
    whileTap={{ scale: disabled ? 1 : 0.95 }}
  >
    {amount}
  </motion.button>
);

// Agent selection card
interface AgentCardProps {
  agent: AIAgent;
  isSelected: boolean;
  odds: number;
  pool: number;
  onSelect: () => void;
  playerNumber: 1 | 2;
}

const AgentCard: React.FC<AgentCardProps> = ({ 
  agent, 
  isSelected, 
  odds, 
  pool, 
  onSelect, 
  playerNumber 
}) => {
  const auraColor = playerNumber === 1 ? 'enhancement' : 'emission';
  
  return (
    <motion.button
      onClick={onSelect}
      className={`
        nen-card p-4 w-full text-left transition-all duration-300
        ${isSelected ? `ring-2 ring-${auraColor}-400` : 'hover:ring-1 hover:ring-gray-500'}
      `}
      style={{
        boxShadow: isSelected ? getAuraGlow(auraColor, 'medium') : undefined,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      role="radio"
      aria-checked={isSelected}
      aria-label={`Select ${agent.name} (${agent.elo} ELO, ${(agent.winRate * 100).toFixed(1)}% win rate)`}
    >
      {/* Agent Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-${auraColor}-600 to-${auraColor}-400 flex items-center justify-center`}>
          <span className="text-xl" role="img" aria-label="AI Agent avatar">🤖</span>
        </div>
        <div className="flex-1">
          <h3 className={`font-bold text-${auraColor}-400`}>{agent.name}</h3>
          <p className="text-xs text-gray-400">#{shortenAddress(agent.id, 3)}</p>
        </div>
        {isSelected && (
          <motion.div
            className={`w-6 h-6 rounded-full bg-${auraColor}-400 flex items-center justify-center`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            ✓
          </motion.div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-400">ELO:</span>
          <span className="ml-1 font-mono font-bold">{agent.elo}</span>
        </div>
        <div>
          <span className="text-gray-400">Win Rate:</span>
          <span className="ml-1 font-mono">{formatPercentage(agent.winRate)}</span>
        </div>
      </div>

      {/* Betting Info */}
      <div className="border-t border-space-600 pt-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">Pool:</span>
          <span className="font-mono text-green-400 font-bold">{formatSOL(pool)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Odds:</span>
          <span className={`font-mono font-bold text-${auraColor}-400`}>{odds.toFixed(2)}x</span>
        </div>
      </div>
    </motion.button>
  );
};

// Main betting panel component
export const BettingPanel: React.FC<BettingPanelProps> = ({
  matchId,
  agent1,
  agent2,
  className = '',
}) => {
  const { publicKey, connected } = useWallet();
  const { pools, odds, userBets, placeBet, isLoading, error } = useBetting(matchId);
  
  const [selectedAgent, setSelectedAgent] = useState<1 | 2 | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick bet amounts
  const quickAmounts = ['0.1', '0.5', '1.0', '2.0'];

  // Validation
  const amountValidation = validateSOLAmount(betAmount);
  const betValidation = amountValidation.isValid && amountValidation.sanitizedValue 
    ? validateBetAmount(amountValidation.sanitizedValue, 10) // Assume 10 SOL balance for demo
    : { isValid: false };

  // Calculate potential payout
  const potentialPayout = useMemo(() => {
    if (!selectedAgent || !amountValidation.isValid || !amountValidation.sanitizedValue) return 0;
    const selectedOdds = selectedAgent === 1 ? odds.agent1 : odds.agent2;
    return amountValidation.sanitizedValue * selectedOdds;
  }, [selectedAgent, amountValidation, odds]);

  // Handle bet submission
  const handlePlaceBet = useCallback(async () => {
    if (!selectedAgent || !amountValidation.isValid || !amountValidation.sanitizedValue || !connected) {
      return;
    }

    setIsSubmitting(true);
    try {
      const signature = await placeBet({
        matchId,
        agent: selectedAgent,
        amount: amountValidation.sanitizedValue,
      });
      
      console.log('Bet placed successfully:', signature);
      
      // Reset form
      setSelectedAgent(null);
      setBetAmount('');
      
      // Show success notification (implement toast system)
      alert('Bet placed successfully!');
      
    } catch (err: any) {
      console.error('Bet placement failed:', err);
      alert(err.message || 'Failed to place bet');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedAgent, amountValidation, connected, placeBet, matchId]);

  return (
    <motion.div
      className={`nen-card ${className}`}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-emission-400 to-manipulation-400 bg-clip-text text-transparent">
          Place Your Bet
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm text-green-400">Live Betting</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          className="bg-enhancement-500/20 border border-enhancement-500 rounded-lg p-3 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-enhancement-400">⚠️</span>
            <span className="text-sm text-enhancement-400">{error}</span>
          </div>
        </motion.div>
      )}

      {/* Total Pool Display */}
      <div className="bg-space-700 rounded-lg p-4 mb-6 text-center">
        <div className="text-sm text-gray-400 mb-1">Total Pool</div>
        <div className="text-3xl font-mono font-bold text-green-400">
          {formatSOL(pools.total)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {(pools.total / LAMPORTS_PER_SOL).toFixed(0)} participants
        </div>
      </div>

      {/* Agent Selection */}
      <fieldset className="space-y-4 mb-6">
        <legend className="text-lg font-bold text-gray-300">Choose Your Fighter</legend>
        <div className="grid gap-4" role="radiogroup" aria-label="Select an AI agent to bet on">
          <AgentCard
            agent={agent1}
            isSelected={selectedAgent === 1}
            odds={odds.agent1}
            pool={pools.agent1}
            onSelect={() => setSelectedAgent(1)}
            playerNumber={1}
          />
          <AgentCard
            agent={agent2}
            isSelected={selectedAgent === 2}
            odds={odds.agent2}
            pool={pools.agent2}
            onSelect={() => setSelectedAgent(2)}
            playerNumber={2}
          />
        </div>
      </fieldset>

      {/* Bet Amount Input */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-bold text-gray-300">Bet Amount</h3>
        
        {/* Quick Amount Buttons */}
        <div className="flex gap-2">
          {quickAmounts.map((amount) => (
            <BetAmountButton
              key={amount}
              amount={`${amount} SOL`}
              onClick={() => setBetAmount(amount)}
              disabled={!connected}
            />
          ))}
        </div>

        {/* Custom Amount Input */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter amount..."
              disabled={!connected}
              aria-label="Bet amount in SOL"
              aria-describedby={betAmount && !amountValidation.isValid ? 'bet-amount-error' : undefined}
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
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              SOL
            </span>
          </div>
          
          {/* Validation Message */}
          {betAmount && !amountValidation.isValid && (
            <motion.p
              id="bet-amount-error"
              className="text-sm text-enhancement-400"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
            >
              {amountValidation.error}
            </motion.p>
          )}
        </div>
      </div>

      {/* Potential Payout */}
      {selectedAgent && amountValidation.isValid && amountValidation.sanitizedValue && (
        <motion.div
          className="bg-gradient-to-r from-emission-500/20 to-manipulation-500/20 rounded-lg p-4 mb-6 border border-emission-500/50"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-400">Potential Payout</div>
              <div className="text-xl font-mono font-bold text-emission-400">
                {formatSOL(potentialPayout * LAMPORTS_PER_SOL)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Profit</div>
              <div className="text-lg font-mono font-bold text-green-400">
                +{formatSOL((potentialPayout - amountValidation.sanitizedValue) * LAMPORTS_PER_SOL)}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Submit Button */}
      <motion.button
        onClick={handlePlaceBet}
        disabled={!connected || !selectedAgent || !betValidation.isValid || isSubmitting || isLoading}
        className={`
          w-full py-4 rounded-lg font-bold text-lg transition-all duration-300
          ${connected && selectedAgent && betValidation.isValid && !isSubmitting && !isLoading
            ? 'nen-button bg-aura-gradient hover:shadow-aura' 
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }
        `}
        whileHover={{ scale: connected && selectedAgent && betValidation.isValid ? 1.02 : 1 }}
        whileTap={{ scale: connected && selectedAgent && betValidation.isValid ? 0.98 : 1 }}
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

      {/* Active Bets */}
      {userBets.length > 0 && (
        <div className="mt-6 pt-6 border-t border-space-600">
          <h3 className="text-lg font-bold text-gray-300 mb-4">Your Active Bets</h3>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {userBets.map((bet) => (
              <motion.div
                key={bet.id}
                className="bg-space-700 rounded-lg p-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">
                      Agent {bet.agent} - {formatSOL(bet.amount)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {bet.odds.toFixed(2)}x odds • {bet.placedAt.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      bet.status === 'active' ? 'text-yellow-400' :
                      bet.status === 'won' ? 'text-green-400' :
                      'text-red-400'
                    }`}>
                      {bet.status.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatSOL(bet.potentialPayout)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
