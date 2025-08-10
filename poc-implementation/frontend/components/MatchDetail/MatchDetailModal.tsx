/**
 * Match Detail Modal Component - User Story 3 Implementation
 * Shows detailed match information for betting evaluation
 * Complies with devnet requirements - no mocks, real data
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  TrophyIcon,
  BoltIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  PlayIcon,
  StarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Match } from '@/types/match';
import { formatSOL, formatNumber } from '@/utils/format';

interface MatchDetailModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onBetClick?: (match: Match, agentChoice: 1 | 2) => void;
  onWatchClick?: (match: Match) => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  isOpen,
  onClose,
  onBetClick,
  onWatchClick,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<1 | 2 | null>(null);

  // Reset selected agent when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAgent(null);
    }
  }, [isOpen]);

  const handleBetClick = useCallback((agentChoice: 1 | 2) => {
    if (match && onBetClick) {
      setSelectedAgent(agentChoice);
      onBetClick(match, agentChoice);
    }
  }, [match, onBetClick]);

  const handleWatchClick = useCallback(() => {
    if (match && onWatchClick) {
      onWatchClick(match);
    }
  }, [match, onWatchClick]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!match) return null;

  // User Story 3: Calculate betting opportunities and odds
  const agent1Odds = match.bettingPool?.oddsAgent1 || 1.5;
  const agent2Odds = match.bettingPool?.oddsAgent2 || 1.5;
  const totalPool = match.bettingPool?.totalPool || 0;
  const minBet = match.bettingPool?.minBet || 100000000; // 0.1 SOL in lamports
  const maxBet = match.bettingPool?.maxBet || 50000000000; // 50 SOL in lamports

  // Time calculations
  const now = new Date();
  const startTime = match.startTime ? new Date(match.startTime) : new Date();
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const timeUntilStart = isUpcoming && match.startTime ? startTime.getTime() - now.getTime() : 0;
  const hoursUntilStart = Math.max(0, Math.floor(timeUntilStart / (1000 * 60 * 60)));
  const minutesUntilStart = Math.max(0, Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden bg-cyber-dark border border-solana-purple/30 rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-cyber-darker to-cyber-dark border-b border-solana-purple/20 p-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>

              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  isLive ? 'bg-red-500 animate-pulse' : 
                  isUpcoming ? 'bg-yellow-500' : 'bg-gray-500'
                }`} />
                <div>
                  <h2 className="text-2xl font-hunter text-white">
                    {isLive ? 'LIVE MATCH' : isUpcoming ? 'UPCOMING MATCH' : 'MATCH DETAILS'}
                  </h2>
                  <p className="text-sm text-gray-400 font-cyber">
                    Detailed match information for betting evaluation
                  </p>
                </div>
              </div>

              {/* Match Status and Timing */}
              <div className="mt-4 flex items-center space-x-6 text-sm">
                {isLive && (
                  <div className="flex items-center space-x-2 text-red-400">
                    <BoltIcon className="w-4 h-4" />
                    <span>LIVE NOW</span>
                  </div>
                )}
                {isUpcoming && (
                  <div className="flex items-center space-x-2 text-yellow-400">
                    <ClockIcon className="w-4 h-4" />
                    <span>Starts in {hoursUntilStart}h {minutesUntilStart}m</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-gray-400">
                  <EyeIcon className="w-4 h-4" />
                  <span>{formatNumber(match.viewerCount || 0)} viewers</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <CurrencyDollarIcon className="w-4 h-4" />
                  <span>{formatSOL(totalPool)} SOL pool</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
              {/* Agent Comparison - User Story 3: Evaluate betting opportunities */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Agent 1 */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`hunter-card p-6 text-center cursor-pointer transition-all ${
                    selectedAgent === 1 ? 'ring-2 ring-solana-purple' : ''
                  }`}
                  onClick={() => setSelectedAgent(selectedAgent === 1 ? null : 1)}
                >
                  <div className="relative mb-4">
                    <img
                      src={match.agent1.avatar || '/avatars/default-agent.png'}
                      alt={match.agent1.name}
                      className="w-20 h-20 rounded-full mx-auto object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `/avatars/default-agent.png`;
                      }}
                    />
                    <div className="absolute -top-2 -right-2 bg-solana-purple text-white text-xs px-2 py-1 rounded-full">
                      #{match.agent1.elo}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-hunter text-white mb-2">{match.agent1.name}</h3>
                  <p className="text-sm text-gray-400 mb-3 capitalize">{match.agent1.nenType} Type</p>
                  
                  {/* Agent Stats */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className="text-solana-green">{((match.agent1.winRate || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Matches:</span>
                      <span className="text-white">{formatNumber(match.agent1.totalMatches || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Style:</span>
                      <span className="text-yellow-400 capitalize">{match.agent1.personality || 'Unknown'}</span>
                    </div>
                  </div>

                  {/* Betting Odds - User Story 3 */}
                  <div className="mt-4 p-3 bg-cyber-darker rounded-lg">
                    <div className="text-lg font-cyber text-solana-purple">
                      {agent1Odds.toFixed(2)}x odds
                    </div>
                    <div className="text-xs text-gray-400">
                      Bet {formatSOL(minBet)} - {formatSOL(maxBet)} SOL
                    </div>
                  </div>

                  {/* Bet Button */}
                  {match.bettingPool?.isOpenForBetting && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBetClick(1);
                      }}
                      className="mt-4 w-full py-2 bg-gradient-to-r from-solana-purple to-magicblock-primary text-white font-cyber text-sm rounded-lg hover:opacity-80 transition-opacity"
                    >
                      BET ON {match.agent1.name.toUpperCase()}
                    </button>
                  )}
                </motion.div>

                {/* VS Divider */}
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-solana-purple to-solana-green rounded-full flex items-center justify-center mb-4 mx-auto">
                      <span className="text-2xl font-hunter text-white">VS</span>
                    </div>
                    <div className="text-sm text-gray-400 font-cyber">
                      {isLive ? 'BATTLE IN PROGRESS' : 'CLASH OF TITANS'}
                    </div>
                    {match.gameState && (
                      <div className="mt-2 text-xs text-yellow-400">
                        Move {match.gameState.currentMove || 0}
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent 2 */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`hunter-card p-6 text-center cursor-pointer transition-all ${
                    selectedAgent === 2 ? 'ring-2 ring-solana-green' : ''
                  }`}
                  onClick={() => setSelectedAgent(selectedAgent === 2 ? null : 2)}
                >
                  <div className="relative mb-4">
                    <img
                      src={match.agent2.avatar || '/avatars/default-agent.png'}
                      alt={match.agent2.name}
                      className="w-20 h-20 rounded-full mx-auto object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `/avatars/default-agent.png`;
                      }}
                    />
                    <div className="absolute -top-2 -right-2 bg-solana-green text-white text-xs px-2 py-1 rounded-full">
                      #{match.agent2.elo}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-hunter text-white mb-2">{match.agent2.name}</h3>
                  <p className="text-sm text-gray-400 mb-3 capitalize">{match.agent2.nenType} Type</p>
                  
                  {/* Agent Stats */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className="text-solana-green">{((match.agent2.winRate || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Matches:</span>
                      <span className="text-white">{formatNumber(match.agent2.totalMatches || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Style:</span>
                      <span className="text-yellow-400 capitalize">{match.agent2.personality || 'Unknown'}</span>
                    </div>
                  </div>

                  {/* Betting Odds - User Story 3 */}
                  <div className="mt-4 p-3 bg-cyber-darker rounded-lg">
                    <div className="text-lg font-cyber text-solana-green">
                      {agent2Odds.toFixed(2)}x odds
                    </div>
                    <div className="text-xs text-gray-400">
                      Bet {formatSOL(minBet)} - {formatSOL(maxBet)} SOL
                    </div>
                  </div>

                  {/* Bet Button */}
                  {match.bettingPool?.isOpenForBetting && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBetClick(2);
                      }}
                      className="mt-4 w-full py-2 bg-gradient-to-r from-solana-green to-solana-purple text-white font-cyber text-sm rounded-lg hover:opacity-80 transition-opacity"
                    >
                      BET ON {match.agent2.name.toUpperCase()}
                    </button>
                  )}
                </motion.div>
              </div>

              {/* Match Details and Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Betting Pool Information */}
                <div className="hunter-card p-6">
                  <h3 className="text-lg font-hunter text-white mb-4 flex items-center">
                    <ChartBarIcon className="w-5 h-5 mr-2 text-solana-purple" />
                    Betting Pool Analysis
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Pool:</span>
                      <span className="text-white font-cyber">{formatSOL(totalPool)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Agent 1 Pool:</span>
                      <span className="text-solana-purple">{formatSOL(match.bettingPool?.agent1Pool || 0)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Agent 2 Pool:</span>
                      <span className="text-solana-green">{formatSOL(match.bettingPool?.agent2Pool || 0)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Bets:</span>
                      <span className="text-white">{formatNumber(match.bettingPool?.betsCount || 0)}</span>
                    </div>
                  </div>

                  {/* Pool Distribution Visual */}
                  <div className="mt-4">
                    <div className="flex text-xs text-gray-400 mb-1">
                      <span>Pool Distribution</span>
                    </div>
                    <div className="flex h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="bg-solana-purple"
                        style={{ 
                          width: `${totalPool > 0 ? ((match.bettingPool?.agent1Pool || 0) / totalPool) * 100 : 50}%` 
                        }}
                      />
                      <div 
                        className="bg-solana-green"
                        style={{ 
                          width: `${totalPool > 0 ? ((match.bettingPool?.agent2Pool || 0) / totalPool) * 100 : 50}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Match Actions */}
                <div className="hunter-card p-6">
                  <h3 className="text-lg font-hunter text-white mb-4 flex items-center">
                    <PlayIcon className="w-5 h-5 mr-2 text-solana-green" />
                    Match Actions
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Watch Live Button */}
                    {isLive && (
                      <button
                        onClick={handleWatchClick}
                        className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-cyber rounded-lg hover:opacity-80 transition-opacity flex items-center justify-center space-x-2"
                      >
                        <BoltIcon className="w-5 h-5" />
                        <span>WATCH LIVE MATCH</span>
                      </button>
                    )}
                    
                    {/* Full Match Details */}
                    <Link 
                      href={`/matches/${match.id}`}
                      className="block w-full py-3 bg-gradient-to-r from-solana-purple to-magicblock-primary text-white font-cyber rounded-lg hover:opacity-80 transition-opacity text-center"
                    >
                      VIEW FULL DETAILS
                    </Link>
                    
                    {/* Tournament Context */}
                    {match.metadata?.gameType && (
                      <div className="text-sm text-gray-400 text-center">
                        <InformationCircleIcon className="w-4 h-4 inline mr-1" />
                        {match.metadata.gameType.toUpperCase()} • {match.metadata.timeControl || 'Standard'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer spacer */}
              <div className="mt-2" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
