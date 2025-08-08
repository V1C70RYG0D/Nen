import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  EyeIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  SignalIcon,
  TrophyIcon,
  BoltIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { formatSOL } from '@/utils/format';
import { Match, MatchCardProps, UserBet } from '@/types/match';

interface MatchCardState {
  isHovered: boolean;
  imageLoadError: boolean;
  connectionError: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({ 
  match,
  showBettingOptions = true,
  compact = false,
  onMatchClick,
  onBetClick,
  userBets = [],
  className = '',
}) => {
  const [state, setState] = useState<MatchCardState>({
    isHovered: false,
    imageLoadError: false,
    connectionError: false,
  });

  // Calculate user's betting status for this match
  const userMatchBets = userBets.filter(bet => bet.matchId === match.id);
  const userTotalBet = userMatchBets.reduce((sum, bet) => sum + bet.amount, 0);
  const userPotentialPayout = userMatchBets.reduce((sum, bet) => sum + bet.potentialPayout, 0);
  const hasActiveBets = userMatchBets.some(bet => bet.status === 'pending');

  // Error boundary for component-level errors
  const [componentError, setComponentError] = useState<string | null>(null);

  useEffect(() => {
    // Reset component error on match change
    setComponentError(null);
  }, [match.id]);

  const handleComponentError = useCallback((error: Error) => {
    console.error('MatchCard component error:', error);
    setComponentError(error.message);
  }, []);

  const getStatusStyle = useCallback(() => {
    try {
      switch (match.status) {
        case 'live':
          return 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse';
        case 'upcoming':
          return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        case 'completed':
          return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        case 'cancelled':
          return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
        case 'paused':
          return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
        default:
          return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      }
    } catch (error) {
      handleComponentError(error as Error);
      return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  }, [match.status, handleComponentError]);

  const getStatusText = useCallback(() => {
    try {
      switch (match.status) {
        case 'live':
          return (
            <span className="flex items-center space-x-2">
              <SignalIcon className="w-3 h-3 animate-pulse" />
              <span>LIVE NOW</span>
              {match.gameState?.currentMove && (
                <span className="text-xs opacity-75">
                  Move {match.gameState.currentMove}
                </span>
              )}
            </span>
          );
        case 'upcoming':
          if (match.scheduledStartTime) {
            const startTime = new Date(match.scheduledStartTime);
            const now = new Date();
            const timeDiff = startTime.getTime() - now.getTime();
            
            if (timeDiff > 0) {
              const minutes = Math.floor(timeDiff / (1000 * 60));
              const hours = Math.floor(minutes / 60);
              
              if (hours > 0) {
                return `STARTS IN ${hours}h ${minutes % 60}m`;
              } else if (minutes > 0) {
                return `STARTS IN ${minutes}m`;
              } else {
                return 'STARTING SOON';
              }
            }
          }
          return match.startTime 
            ? `STARTS ${new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'STARTING SOON';
        case 'completed':
          return (
            <span className="flex items-center space-x-1">
              <TrophyIcon className="w-3 h-3" />
              <span>COMPLETE</span>
            </span>
          );
        case 'cancelled':
          return (
            <span className="flex items-center space-x-1">
              <ExclamationTriangleIcon className="w-3 h-3" />
              <span>CANCELLED</span>
            </span>
          );
        case 'paused':
          return (
            <span className="flex items-center space-x-1">
              <ClockIcon className="w-3 h-3" />
              <span>PAUSED</span>
            </span>
          );
        default:
          return 'UNKNOWN STATUS';
      }
    } catch (error) {
      handleComponentError(error as Error);
      return 'STATUS ERROR';
    }
  }, [match.status, match.scheduledStartTime, match.startTime, match.gameState, handleComponentError]);

  const getAgentAvatar = useCallback((agent: Match['agent1'] | Match['agent2'], agentNumber: 1 | 2) => {
    if (state.imageLoadError) {
      return (
        <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-gray-700">
          <span className="text-2xl">{agentNumber === 1 ? '🎮' : '🤖'}</span>
        </div>
      );
    }

    if (agent.avatar) {
      return (
        <img
          src={agent.avatar}
          alt={agent.name}
          className="w-full h-full object-cover rounded-full border-2 border-gray-700"
          onError={() => setState(prev => ({ ...prev, imageLoadError: true }))}
          onLoad={() => setState(prev => ({ ...prev, imageLoadError: false }))}
        />
      );
    }

    return (
      <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-gray-700">
        <span className="text-2xl">{agentNumber === 1 ? '🎮' : '🤖'}</span>
      </div>
    );
  }, [state.imageLoadError]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    try {
      if (onMatchClick) {
        e.preventDefault();
        onMatchClick(match);
      }
    } catch (error) {
      handleComponentError(error as Error);
    }
  }, [match, onMatchClick, handleComponentError]);

  const handleBetClick = useCallback((agentChoice: 1 | 2) => (e: React.MouseEvent) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      if (onBetClick) {
        onBetClick(match, agentChoice);
      }
    } catch (error) {
      handleComponentError(error as Error);
    }
  }, [match, onBetClick, handleComponentError]);

  // Component error fallback
  if (componentError) {
    return (
      <div className="hunter-card p-6 border-red-500/50 bg-red-500/10">
        <div className="flex items-center space-x-2 text-red-400">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span className="text-sm">Error loading match card</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">{componentError}</p>
      </div>
    );
  }

  // Ensure required data exists
  if (!match || !match.agent1 || !match.agent2 || !match.bettingPool) {
    return (
      <div className="hunter-card p-6 border-yellow-500/50 bg-yellow-500/10">
        <div className="flex items-center space-x-2 text-yellow-400">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <span className="text-sm">Incomplete match data</span>
        </div>
      </div>
    );
  }

  const CardContent = (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`hunter-card p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-solana-purple/20 relative overflow-hidden group ${className}`}
      onMouseEnter={() => setState(prev => ({ ...prev, isHovered: true }))}
      onMouseLeave={() => setState(prev => ({ ...prev, isHovered: false }))}
      onClick={handleCardClick}
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
        <div className="absolute inset-0 bg-cyber-grid bg-[size:30px_30px] animate-pulse" />
      </div>

      {/* Status Badge */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <span className={`px-3 py-1 text-xs font-cyber uppercase tracking-wider border ${getStatusStyle()}`}>
          {getStatusText()}
        </span>
        
        <div className="flex items-center space-x-3">
          {/* Live Viewer Count */}
          {match.viewerCount && match.status === 'live' && (
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <EyeIcon className="w-3 h-3" />
              <span className="font-mono">{match.viewerCount.toLocaleString()}</span>
            </div>
          )}
          
          {/* User Bet Indicator */}
          {hasActiveBets && (
            <div className="flex items-center space-x-1 text-xs text-solana-green">
              <ChartBarIcon className="w-3 h-3" />
              <span className="font-mono">{formatSOL(userTotalBet)}</span>
            </div>
          )}
          
          {/* MagicBlock Indicator */}
          {match.magicBlockSessionId && (
            <div className="flex items-center space-x-1 text-xs text-cyan-400" title="Real-time on-chain match">
              <BoltIcon className="w-3 h-3" />
              <span>MB</span>
            </div>
          )}
        </div>
      </div>

      {/* Match Info */}
      <div className="space-y-4 relative z-10">
        {/* Agents */}
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Agent 1 */}
          <motion.div
            whileHover={{ scale: compact ? 1.02 : 1.05 }}
            className="text-center space-y-2"
          >
            <div className={`relative mx-auto ${compact ? 'w-12 h-12' : 'w-20 h-20'} mb-2`}>
              <div className={`absolute inset-0 bg-gradient-to-br from-${match.agent1.nenType === 'enhancement' ? 'red' : match.agent1.nenType === 'emission' ? 'cyan' : 'purple'}-500/20 to-transparent rounded-full blur-xl`} />
              <div className="relative w-full h-full">
                {getAgentAvatar(match.agent1, 1)}
              </div>
              {match.status === 'completed' && match.result?.winner === 1 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-xs">👑</span>
                </div>
              )}
            </div>
            <div>
              <h3 className={`font-hunter ${compact ? 'text-sm' : 'text-lg'} nen-${match.agent1.nenType}`}>
                {match.agent1.name}
              </h3>
              {!compact && (
                <>
                  <p className="text-xs font-cyber text-gray-400">
                    {match.agent1.nenType.toUpperCase()} TYPE
                  </p>
                  <p className="text-sm font-mono text-gray-300 mt-1">
                    ELO: {match.agent1.elo}
                  </p>
                </>
              )}
            </div>
          </motion.div>

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-solana-purple to-solana-green blur-md opacity-50" />
              <span className={`relative ${compact ? 'text-lg' : 'text-2xl'} font-hunter text-white px-2 py-1 bg-cyber-darker/80 backdrop-blur-sm border border-solana-purple/50`}>
                VS
              </span>
            </div>
            
            {/* Betting Odds Display */}
            {showBettingOptions && match.bettingPool.isOpenForBetting && (
              <div className="text-xs text-gray-400 text-center">
                <div>{match.bettingPool.oddsAgent1.toFixed(2)}x</div>
                <div>{match.bettingPool.oddsAgent2.toFixed(2)}x</div>
              </div>
            )}
          </div>

          {/* Agent 2 */}
          <motion.div
            whileHover={{ scale: compact ? 1.02 : 1.05 }}
            className="text-center space-y-2"
          >
            <div className={`relative mx-auto ${compact ? 'w-12 h-12' : 'w-20 h-20'} mb-2`}>
              <div className={`absolute inset-0 bg-gradient-to-br from-${match.agent2.nenType === 'enhancement' ? 'red' : match.agent2.nenType === 'emission' ? 'cyan' : 'purple'}-500/20 to-transparent rounded-full blur-xl`} />
              <div className="relative w-full h-full">
                {getAgentAvatar(match.agent2, 2)}
              </div>
              {match.status === 'completed' && match.result?.winner === 2 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-xs">👑</span>
                </div>
              )}
            </div>
            <div>
              <h3 className={`font-hunter ${compact ? 'text-sm' : 'text-lg'} nen-${match.agent2.nenType}`}>
                {match.agent2.name}
              </h3>
              {!compact && (
                <>
                  <p className="text-xs font-cyber text-gray-400">
                    {match.agent2.nenType.toUpperCase()} TYPE
                  </p>
                  <p className="text-sm font-mono text-gray-300 mt-1">
                    ELO: {match.agent2.elo}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Pool Info */}
        <div className="pt-4 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <span className="text-sm font-cyber text-gray-400 uppercase tracking-wider">
              Prize Pool
            </span>
            <span className={`${compact ? 'text-lg' : 'text-xl'} font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-solana-green to-yellow-400`}>
              {formatSOL(match.bettingPool.totalPool)} SOL
            </span>
          </div>
          
          {/* Betting Info */}
          {showBettingOptions && match.bettingPool.betsCount > 0 && (
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <span>{match.bettingPool.betsCount} bets placed</span>
              {match.bettingPool.closesAt && (
                <span>
                  Closes {new Date(match.bettingPool.closesAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}

          {/* User Betting Summary */}
          {hasActiveBets && (
            <div className="mt-2 p-2 bg-solana-purple/10 border border-solana-purple/30 rounded text-xs">
              <div className="flex justify-between">
                <span>Your Bet:</span>
                <span className="text-solana-green">{formatSOL(userTotalBet)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span>Potential Win:</span>
                <span className="text-yellow-400">{formatSOL(userPotentialPayout)} SOL</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Bet Buttons */}
        <AnimatePresence>
          {showBettingOptions && 
           state.isHovered && 
           match.status === 'upcoming' && 
           match.bettingPool.isOpenForBetting && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex space-x-2 pt-2"
            >
              <button
                onClick={handleBetClick(1)}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-cyber rounded hover:from-red-500 hover:to-red-400 transition-all"
              >
                BET ON {match.agent1.name.split(' ')[0]}
              </button>
              <button
                onClick={handleBetClick(2)}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-cyber rounded hover:from-blue-500 hover:to-blue-400 transition-all"
              >
                BET ON {match.agent2.name.split(' ')[0]}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-solana-purple/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );

  // Wrap with Link if no custom click handler
  if (!onMatchClick) {
    return (
      <Link href={`/arena/${match.id}`}>
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}; 