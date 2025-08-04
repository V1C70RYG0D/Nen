// Complete betting workflow interface component
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { BettingPanel } from '../BettingPanel/BettingPanel';
import { OddsDisplay } from '../OddsDisplay/OddsDisplay';
import { PoolInfo } from '../PoolInfo/PoolInfo';
import type { AIAgent, Match } from '@/types';

interface BettingInterfaceProps {
  match: Match;
  className?: string;
  onBetPlaced?: (betDetails: any) => void;
}

type BettingStep = 'overview' | 'betting' | 'confirmation' | 'success';

export const BettingInterface: React.FC<BettingInterfaceProps> = ({ 
  match, 
  className = '',
  onBetPlaced 
}) => {
  const { connected } = useWallet();
  const [currentStep, setCurrentStep] = useState<BettingStep>('overview');
  const [selectedAgent, setSelectedAgent] = useState<1 | 2 | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);

  const handleStepChange = useCallback((step: BettingStep) => {
    setCurrentStep(step);
  }, []);

  const handleBetComplete = useCallback((betDetails: any) => {
    setCurrentStep('success');
    onBetPlaced?.(betDetails);
  }, [onBetPlaced]);

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className={`bg-space-800 rounded-xl border border-space-600 ${className}`} role="region" aria-label="Betting interface">
      {/* Header */}
      <div className="border-b border-space-600 p-6">
        <h2 className="text-2xl font-bold mb-2">
          <span className="bg-gradient-to-r from-emission-400 to-manipulation-400 bg-clip-text text-transparent">
            Live Betting
          </span>
        </h2>
        <p className="text-gray-400">
          {match.agent1.name} vs {match.agent2.name}
        </p>
        
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mt-6" role="progressbar" aria-valuenow={
          currentStep === 'overview' ? 1 :
          currentStep === 'betting' ? 2 :
          currentStep === 'confirmation' ? 3 : 4
        } aria-valuemin={1} aria-valuemax={4}>
          {(['overview', 'betting', 'confirmation', 'success'] as BettingStep[]).map((step, index) => (
            <div key={step} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  currentStep === step ? 'bg-emission-400 text-space-900' :
                  index < ['overview', 'betting', 'confirmation', 'success'].indexOf(currentStep) ? 'bg-enhancement-400 text-space-900' :
                  'bg-space-600 text-gray-400'
                }`}
                aria-label={`Step ${index + 1}: ${step}`}
              >
                {index + 1}
              </div>
              {index < 3 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  index < ['overview', 'betting', 'confirmation', 'success'].indexOf(currentStep) ? 'bg-enhancement-400' : 'bg-space-600'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        {/* Step Labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>Overview</span>
          <span>Place Bet</span>
          <span>Confirm</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {currentStep === 'overview' && (
            <motion.div
              key="overview"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {/* Match Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-300 mb-4">Match Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-enhancement-400 font-medium">{match.status.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Viewers:</span>
                      <span className="text-white">{match.viewers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Started:</span>
                      <span className="text-white">{match.startTime?.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                
                <PoolInfo 
                  totalPool={match.totalPool}
                  agent1Pool={match.pools.agent1}
                  agent2Pool={match.pools.agent2}
                />
              </div>

              {/* Odds Display */}
              <OddsDisplay 
                agent1={match.agent1}
                agent2={match.agent2}
                pools={match.pools}
              />

              {/* Continue Button */}
              <div className="flex justify-end">
                <motion.button
                  onClick={() => handleStepChange('betting')}
                  disabled={!connected}
                  className={`px-6 py-3 rounded-lg font-bold transition-colors ${
                    connected 
                      ? 'nen-button bg-emission-500 hover:bg-emission-400 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                  whileHover={connected ? { scale: 1.05 } : {}}
                  whileTap={connected ? { scale: 0.95 } : {}}
                  aria-label={connected ? "Continue to betting" : "Connect wallet to continue betting"}
                >
                  {connected ? 'Continue to Betting' : 'Connect Wallet First'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {currentStep === 'betting' && (
            <motion.div
              key="betting"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <BettingPanel
                matchId={match.id}
                agent1={match.agent1}
                agent2={match.agent2}
                className="border-0 bg-transparent p-0"
              />
              
              <div className="flex justify-between mt-6">
                <motion.button
                  onClick={() => handleStepChange('overview')}
                  className="px-6 py-3 rounded-lg font-bold bg-space-700 text-gray-300 hover:bg-space-600 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Back
                </motion.button>
              </div>
            </motion.div>
          )}

          {currentStep === 'success' && (
            <motion.div
              key="success"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-16 h-16 bg-enhancement-400 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg className="w-8 h-8 text-space-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              
              <h3 className="text-2xl font-bold text-enhancement-400 mb-2">Bet Placed Successfully!</h3>
              <p className="text-gray-400 mb-6">
                Your bet has been confirmed and recorded on the blockchain.
              </p>
              
              <motion.button
                onClick={() => handleStepChange('overview')}
                className="nen-button px-6 py-3 rounded-lg font-bold"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Place Another Bet
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
