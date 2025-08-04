// Odds display component for betting interface
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { AIAgent } from '@/types';

interface Pool {
  agent1: number;
  agent2: number;
}

interface OddsDisplayProps {
  agent1: AIAgent;
  agent2: AIAgent;
  pools: Pool;
  className?: string;
  showLabels?: boolean;
}

export const OddsDisplay: React.FC<OddsDisplayProps> = ({
  agent1,
  agent2,
  pools,
  className = '',
  showLabels = true
}) => {
  // Calculate odds based on pool distribution
  const odds = useMemo(() => {
    const totalPool = pools.agent1 + pools.agent2;
    
    if (totalPool === 0) {
      return {
        agent1: { decimal: 2.0, fractional: '1/1', probability: 50 },
        agent2: { decimal: 2.0, fractional: '1/1', probability: 50 }
      };
    }

    // Calculate implied probabilities
    const agent1Prob = (pools.agent1 / totalPool) * 100;
    const agent2Prob = (pools.agent2 / totalPool) * 100;

    // Calculate decimal odds (payout ratio)
    const agent1Decimal = totalPool / pools.agent1 || 1;
    const agent2Decimal = totalPool / pools.agent2 || 1;

    // Convert to fractional odds
    const toFractional = (decimal: number): string => {
      if (decimal < 2) return '1/2';
      const numerator = Math.round((decimal - 1) * 100);
      return `${numerator}/100`;
    };

    return {
      agent1: {
        decimal: Number(agent1Decimal.toFixed(2)),
        fractional: toFractional(agent1Decimal),
        probability: Math.round(agent1Prob)
      },
      agent2: {
        decimal: Number(agent2Decimal.toFixed(2)),
        fractional: toFractional(agent2Decimal),
        probability: Math.round(agent2Prob)
      }
    };
  }, [pools]);

  const getFavoriteStatus = (agentIndex: 1 | 2) => {
    const isAgent1Favorite = odds.agent1.decimal < odds.agent2.decimal;
    if (agentIndex === 1) {
      return isAgent1Favorite ? 'favorite' : 'underdog';
    }
    return isAgent1Favorite ? 'underdog' : 'favorite';
  };

  const getOddsColor = (status: 'favorite' | 'underdog') => {
    return status === 'favorite' ? 'text-enhancement-400' : 'text-emission-400';
  };

  return (
    <div className={`bg-space-800 rounded-lg border border-space-600 ${className}`} role="region" aria-label="Betting odds display">
      {showLabels && (
        <div className="border-b border-space-600 p-4">
          <h3 className="text-lg font-bold text-gray-300">Current Odds</h3>
          <p className="text-sm text-gray-400">Live odds based on betting pool distribution</p>
        </div>
      )}

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Agent 1 Odds */}
          <motion.div
            className="bg-space-700 rounded-lg p-4 border border-space-500"
            whileHover={{ scale: 1.02 }}
            role="article"
            aria-label={`${agent1.name} betting odds`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-enhancement-500"
                  role="img"
                  aria-label={`${agent1.name} avatar`}
                >
                  {agent1.avatar}
                </div>
                <div>
                  <h4 className="font-bold text-white">{agent1.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    getFavoriteStatus(1) === 'favorite' ? 'bg-enhancement-400/20 text-enhancement-400' : 'bg-emission-400/20 text-emission-400'
                  }`}>
                    {getFavoriteStatus(1).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Decimal:</span>
                <span className={`font-bold text-lg ${getOddsColor(getFavoriteStatus(1))}`}>
                  {odds.agent1.decimal.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Fractional:</span>
                <span className="font-mono text-white">{odds.agent1.fractional}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Probability:</span>
                <span className="font-bold text-white">{odds.agent1.probability}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Pool:</span>
                <span className="font-bold text-white">{pools.agent1.toFixed(2)} SOL</span>
              </div>
            </div>

            {/* Probability Bar */}
            <div className="mt-4">
              <div className="w-full bg-space-600 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-enhancement-400 to-enhancement-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${odds.agent1.probability}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  aria-label={`${agent1.name} win probability: ${odds.agent1.probability}%`}
                />
              </div>
            </div>
          </motion.div>

          {/* Agent 2 Odds */}
          <motion.div
            className="bg-space-700 rounded-lg p-4 border border-space-500"
            whileHover={{ scale: 1.02 }}
            role="article"
            aria-label={`${agent2.name} betting odds`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-emission-500"
                  role="img"
                  aria-label={`${agent2.name} avatar`}
                >
                  {agent2.avatar}
                </div>
                <div>
                  <h4 className="font-bold text-white">{agent2.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    getFavoriteStatus(2) === 'favorite' ? 'bg-enhancement-400/20 text-enhancement-400' : 'bg-emission-400/20 text-emission-400'
                  }`}>
                    {getFavoriteStatus(2).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Decimal:</span>
                <span className={`font-bold text-lg ${getOddsColor(getFavoriteStatus(2))}`}>
                  {odds.agent2.decimal.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Fractional:</span>
                <span className="font-mono text-white">{odds.agent2.fractional}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Probability:</span>
                <span className="font-bold text-white">{odds.agent2.probability}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Pool:</span>
                <span className="font-bold text-white">{pools.agent2.toFixed(2)} SOL</span>
              </div>
            </div>

            {/* Probability Bar */}
            <div className="mt-4">
              <div className="w-full bg-space-600 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-emission-400 to-emission-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${odds.agent2.probability}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  aria-label={`${agent2.name} win probability: ${odds.agent2.probability}%`}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-space-900/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {(pools.agent1 + pools.agent2).toFixed(2)}
            </div>
            <div className="text-xs text-gray-400">Total Pool (SOL)</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-enhancement-400">
              {Math.min(odds.agent1.decimal, odds.agent2.decimal).toFixed(2)}
            </div>
            <div className="text-xs text-gray-400">Best Odds</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-emission-400">
              {Math.abs(odds.agent1.probability - odds.agent2.probability)}%
            </div>
            <div className="text-xs text-gray-400">Margin</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-manipulation-400">
              {((pools.agent1 + pools.agent2) * 0.03).toFixed(2)}
            </div>
            <div className="text-xs text-gray-400">House Edge (SOL)</div>
          </div>
        </div>

        {/* Real-time Update Indicator */}
        <div className="flex items-center justify-center mt-4 text-xs text-gray-500">
          <motion.div
            className="w-2 h-2 bg-enhancement-400 rounded-full mr-2"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span>Live odds • Updates every 5 seconds</span>
        </div>
      </div>
    </div>
  );
};
