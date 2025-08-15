import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';
import { useBetting } from '@/hooks/useBetting';
import { useBettingProd } from '@/hooks/useBettingProd';
import { formatSOL } from '@/utils/format';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';
import { apiClient } from '@/lib/api-client';
import { endpoints } from '@/lib/api-config';

interface Agent {
  id: string;
  name: string;
  elo: number;
  winRate?: number;
  nenType: string;
  avatar?: string;
  specialAbility?: string;
}

interface BettingPanelProps {
  matchId: string;
  agent1: Agent;
  agent2: Agent;
  initialSelectedAgent?: 1 | 2;
}

export const BettingPanel: React.FC<BettingPanelProps> = ({
  matchId,
  agent1,
  agent2,
  initialSelectedAgent,
}) => {
  const { publicKey, connected } = useWallet();
  const { placeBet: placeBetMock, pools, userBets, isLoading, refetch } = useBetting(matchId);
  const { placeBet: placeBetProd } = useBettingProd();
  const [selectedAgent, setSelectedAgent] = useState<1 | 2 | null>(initialSelectedAgent ?? null);
  const [betAmount, setBetAmount] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const handleClaim = async (betId: string) => {
    try {
      const res = await apiClient.post(endpoints.betting.claim(betId));
      const payout = (res as any)?.data?.payout || (res as any)?.payout;
      if (payout?.amount) {
        toast.success(`Payout claimed: ${payout.amount} SOL`);
      } else {
        toast.success('Claim processed');
      }
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to claim payout');
    }
  };

  useEffect(() => {
    if (initialSelectedAgent) {
      setSelectedAgent(initialSelectedAgent);
    }
  }, [initialSelectedAgent]);

  useEffect(() => {
    // Refetch betting data every 5 seconds
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const calculateOdds = (pool1: number, pool2: number) => {
    const total = pool1 + pool2;
    if (total === 0) return { odds1: 2.0, odds2: 2.0 };
    return {
      odds1: total / pool1 || 2.0,
      odds2: total / pool2 || 2.0,
    };
  };

  const { odds1, odds2 } = calculateOdds(pools.agent1, pools.agent2);

  const handlePlaceBet = async () => {
    if (!selectedAgent || !betAmount || !publicKey) return;

    setIsPlacingBet(true);
    try {
      const amountSol = parseFloat(betAmount);
      if (amountSol < 0.1 || amountSol > 100) {
        throw new Error('Bet amount must be between 0.1 and 100 SOL');
      }

  const result = await placeBetProd({ matchId, agent: selectedAgent, amountSol });

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      
      toast.success(
        <span>
          Bet placed on {selectedAgent === 1 ? agent1.name : agent2.name}! <a className="underline text-solana-green" target="_blank" rel="noreferrer" href={result.explorer}>View</a>
        </span>
      );
      
      // Reset form
      setSelectedAgent(null);
      setBetAmount('');
      refetch();

      // Proactively ask backend to prepare claim state for this bet (non-blocking)
      try {
        const betId = (result as any)?.betId;
        if (betId) {
          await apiClient.post(endpoints.betting.claim(betId));
        }
      } catch (e) {
        console.debug('Claim prep call failed or skipped:', e);
      }
    } catch (error) {
      console.error('Betting failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to place bet.');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const quickBetAmounts = [0.1, 0.5, 1, 5, 10];

  return (
    <>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
      
      <div className="relative overflow-hidden">
        {/* Holographic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-solana-purple/10 via-transparent to-magicblock-primary/10 animate-hologram" />
        
        <div className="relative hunter-card p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-hunter text-transparent bg-clip-text bg-gradient-to-r from-solana-purple to-solana-green">
              PLACE YOUR BET
            </h2>
            <p className="text-sm text-gray-400 font-cyber mt-1">
              CHOOSE YOUR HUNTER • SET YOUR STAKE • WIN BIG
            </p>
          </div>

          {/* Total Pool Display */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative p-4 bg-gradient-to-r from-cyber-dark/80 to-solana-dark/80 backdrop-blur-sm border border-solana-green/30 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-solana-green/10 to-transparent animate-shimmer" />
            <div className="relative text-center">
              <div className="text-sm font-cyber text-solana-green uppercase tracking-wider">
                Total Prize Pool
              </div>
              <div className="text-4xl font-bold font-mono text-white mt-1">
                {formatSOL(pools.total)}
                <span className="text-xl ml-2 text-solana-green">SOL</span>
              </div>
            </div>
          </motion.div>

          {/* Agent Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent 1 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedAgent(1)}
              className={`
                relative p-6 transition-all duration-300 overflow-hidden group
                ${selectedAgent === 1 
                  ? 'hunter-card ring-2 ring-solana-purple shadow-lg shadow-solana-purple/50' 
                  : 'hunter-card hover:shadow-lg hover:shadow-solana-purple/30'
                }
              `}
            >
              {/* Nen Aura Background */}
              <div className={`absolute inset-0 opacity-20 nen-${agent1.nenType}`} />
              
              <div className="relative space-y-3">
                {/* Agent Name & Type */}
                <div>
                  <h3 className="text-xl font-hunter text-nen-enhancement">{agent1.name}</h3>
                  <p className="text-xs font-cyber text-gray-400 uppercase">
                    {agent1.nenType} TYPE
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">ELO Rating</span>
                    <span className="font-mono font-bold">{agent1.elo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Win Rate</span>
                    <span className="font-mono font-bold text-solana-green">
                      {(((agent1.winRate ?? 0) * 100)).toFixed(1)}%
                    </span>
                  </div>
                  {agent1.specialAbility && (
                    <div className="text-xs text-cyan-400 italic mt-2">
                      Special: {agent1.specialAbility}
                    </div>
                  )}
                </div>

                {/* Odds Display */}
                <div className="pt-3 border-t border-gray-700">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase">Potential Return</div>
                    <div className="text-2xl font-bold font-mono text-yellow-400 mt-1">
                      {odds1.toFixed(2)}x
                    </div>
                  </div>
                </div>

                {/* Pool Amount */}
                <div className="text-center text-xs text-gray-500">
                  Pool: {formatSOL(pools.agent1)} SOL
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedAgent === 1 && (
                <motion.div
                  layoutId="selection-indicator"
                  className="absolute top-2 right-2 w-6 h-6 bg-solana-purple rounded-full flex items-center justify-center"
                >
                  <span className="text-white text-sm">✓</span>
                </motion.div>
              )}
            </motion.button>

            {/* Agent 2 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedAgent(2)}
              className={`
                relative p-6 transition-all duration-300 overflow-hidden group
                ${selectedAgent === 2 
                  ? 'hunter-card ring-2 ring-solana-green shadow-lg shadow-solana-green/50' 
                  : 'hunter-card hover:shadow-lg hover:shadow-solana-green/30'
                }
              `}
            >
              {/* Nen Aura Background */}
              <div className={`absolute inset-0 opacity-20 nen-${agent2.nenType}`} />
              
              <div className="relative space-y-3">
                {/* Agent Name & Type */}
                <div>
                  <h3 className="text-xl font-hunter text-nen-emission">{agent2.name}</h3>
                  <p className="text-xs font-cyber text-gray-400 uppercase">
                    {agent2.nenType} TYPE
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">ELO Rating</span>
                    <span className="font-mono font-bold">{agent2.elo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Win Rate</span>
                    <span className="font-mono font-bold text-solana-green">
                      {(((agent2.winRate ?? 0) * 100)).toFixed(1)}%
                    </span>
                  </div>
                  {agent2.specialAbility && (
                    <div className="text-xs text-cyan-400 italic mt-2">
                      Special: {agent2.specialAbility}
                    </div>
                  )}
                </div>

                {/* Odds Display */}
                <div className="pt-3 border-t border-gray-700">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase">Potential Return</div>
                    <div className="text-2xl font-bold font-mono text-yellow-400 mt-1">
                      {odds2.toFixed(2)}x
                    </div>
                  </div>
                </div>

                {/* Pool Amount */}
                <div className="text-center text-xs text-gray-500">
                  Pool: {formatSOL(pools.agent2)} SOL
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedAgent === 2 && (
                <motion.div
                  layoutId="selection-indicator"
                  className="absolute top-2 right-2 w-6 h-6 bg-solana-green rounded-full flex items-center justify-center"
                >
                  <span className="text-white text-sm">✓</span>
                </motion.div>
              )}
            </motion.button>
          </div>

          {/* Bet Amount Input */}
          <AnimatePresence>
            {selectedAgent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-cyber text-gray-400 uppercase tracking-wider mb-2">
                    Bet Amount (SOL)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="0.0"
                      step="0.1"
                      min="0.01"
                      max="1000"
                      className="w-full px-4 py-3 bg-cyber-dark/50 border border-solana-purple/30 focus:border-solana-purple text-white font-mono text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-solana-purple/50 transition-all"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-solana-green font-cyber text-sm">
                      SOL
                    </div>
                  </div>
                </div>

                {/* Quick Bet Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {quickBetAmounts.map((amount) => (
                    <motion.button
                      key={amount}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setBetAmount(amount.toString())}
                      className="px-4 py-2 bg-solana-dark/50 hover:bg-solana-dark/70 border border-solana-purple/30 hover:border-solana-purple/50 text-white font-mono text-sm transition-all"
                    >
                      {amount} SOL
                    </motion.button>
                  ))}
                </div>

                {/* Potential Payout */}
                {betAmount && parseFloat(betAmount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-cyber text-gray-400 uppercase">
                        Potential Payout
                      </span>
                      <span className="text-2xl font-bold font-mono text-yellow-400">
                        {(parseFloat(betAmount) * (selectedAgent === 1 ? odds1 : odds2)).toFixed(3)} SOL
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: connected && selectedAgent && betAmount ? 1.02 : 1 }}
            whileTap={{ scale: connected && selectedAgent && betAmount ? 0.98 : 1 }}
            onClick={handlePlaceBet}
            disabled={!connected || !selectedAgent || !betAmount || isPlacingBet || isLoading}
            className={`
              w-full py-4 font-cyber font-bold uppercase tracking-wider transition-all duration-300
              ${!connected || !selectedAgent || !betAmount || isPlacingBet
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'cyber-button text-white'
              }
            `}
          >
            {!connected ? (
              'CONNECT WALLET TO BET'
            ) : isPlacingBet ? (
              <span className="flex items-center justify-center space-x-2">
                <span>PLACING BET</span>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
              </span>
            ) : !selectedAgent ? (
              'SELECT A HUNTER'
            ) : !betAmount ? (
              'ENTER BET AMOUNT'
            ) : (
              'PLACE BET'
            )}
          </motion.button>

          {/* User's Active Bets */}
          {userBets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-6 border-t border-solana-purple/30"
            >
              <h3 className="text-lg font-hunter text-solana-purple mb-4">YOUR ACTIVE BETS</h3>
              <div className="space-y-2">
                {userBets.map((bet, index) => (
                  <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex justify-between items-center p-3 bg-cyber-dark/50 border border-solana-purple/20 hover:border-solana-purple/40 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        bet.status === 'active' ? 'bg-yellow-500 animate-pulse' :
                        bet.status === 'won' ? 'bg-solana-green' : 'bg-red-500'
                      }`} />
                      <span className="font-cyber text-sm">
                        {bet.agent === 1 ? agent1.name : agent2.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-solana-green">
                        {formatSOL(bet.amount)} SOL
                      </span>
                      {bet.status === 'won' && (
                        <button
                          onClick={() => handleClaim(bet.id)}
                          className="px-3 py-1 text-xs bg-solana-green/20 border border-solana-green/50 hover:bg-solana-green/30 text-white transition"
                        >
                          Claim
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}; 