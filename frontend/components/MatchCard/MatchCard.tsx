// Match card component for displaying ongoing and upcoming matches
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatSOL, formatRelativeTime } from '@/utils/format';
import { getStatusColor, getPersonalityColor } from '@/utils/theme';
import type { Match } from '@/types';

interface MatchCardProps {
  match: Match;
  className?: string;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, className = '' }) => {
  const getStatusText = () => {
    switch (match.status) {
      case 'live':
        return 'LIVE NOW';
      case 'upcoming':
        return match.startTime 
          ? `Starts ${formatRelativeTime(match.startTime)}`
          : 'Starting Soon';
      case 'completed':
        return 'Completed';
      default:
        return match.status;
    }
  };

  const getWinProbability = () => {
    const total = match.pools.agent1 + match.pools.agent2;
    if (total === 0) return { agent1: 50, agent2: 50 };
    
    return {
      agent1: Math.round((match.pools.agent1 / total) * 100),
      agent2: Math.round((match.pools.agent2 / total) * 100),
    };
  };

  const probability = getWinProbability();

  return (
    <Link href={`/match/${match.id}`}>
      <motion.div
        className={`nen-card cursor-pointer hover:ring-2 hover:ring-emission-400/50 transition-all duration-300 ${className}`}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        role="article"
        aria-label={`Match between ${match.agent1.name} and ${match.agent2.name}`}
      >
        {/* Status Badge */}
        <div className="flex justify-between items-start mb-4">
          <span className={`${getStatusColor(match.status)} text-white text-xs px-3 py-1 rounded-full font-bold`}>
            {getStatusText()}
          </span>
          {match.status === 'live' && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-enhancement-500 rounded-full animate-pulse" />
              <span className="text-gray-400">{match.viewers} viewers</span>
            </div>
          )}
        </div>

        {/* Total Pool */}
        <div className="text-center mb-6">
          <div className="text-sm text-gray-400 mb-1">Total Prize Pool</div>
          <div className="text-3xl font-mono font-bold text-green-400">
            {formatSOL(match.totalPool)}
          </div>
        </div>

        {/* Agents Battle */}
        <div className="relative">
          {/* Agent 1 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-enhancement-600 to-enhancement-400 flex items-center justify-center border-2 border-enhancement-400">
                  <span className="text-2xl" role="img" aria-label={`${match.agent1.name} avatar`}>{match.agent1.avatar || '🤖'}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-space-800 rounded-full px-2 py-0.5">
                  <span className="text-xs font-mono text-enhancement-400">{match.agent1.elo}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-enhancement-400 text-lg" id={`agent1-${match.id}`}>{match.agent1.name}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>Win Rate: {(match.agent1.winRate * 100).toFixed(1)}%</span>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ 
                    backgroundColor: getPersonalityColor(match.agent1.personality) + '20',
                    color: getPersonalityColor(match.agent1.personality),
                  }}>
                    {match.agent1.personality}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Pool: {formatSOL(match.pools.agent1)}</span>
                    <span>{probability.agent1}%</span>
                  </div>
                  <div className="w-full bg-space-700 rounded-full h-1.5">
                    <div 
                      className="bg-enhancement-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${probability.agent1}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
            <div className="mx-4 bg-space-700 rounded-full w-12 h-12 flex items-center justify-center border-2 border-gray-600">
              <span className="text-gray-400 font-bold">VS</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
          </div>

          {/* Agent 2 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emission-600 to-emission-400 flex items-center justify-center border-2 border-emission-400">
                  <span className="text-2xl" role="img" aria-label={`${match.agent2.name} avatar`}>{match.agent2.avatar || '🤖'}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-space-800 rounded-full px-2 py-0.5">
                  <span className="text-xs font-mono text-emission-400">{match.agent2.elo}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-emission-400 text-lg" id={`agent2-${match.id}`}>{match.agent2.name}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>Win Rate: {(match.agent2.winRate * 100).toFixed(1)}%</span>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ 
                    backgroundColor: getPersonalityColor(match.agent2.personality) + '20',
                    color: getPersonalityColor(match.agent2.personality),
                  }}>
                    {match.agent2.personality}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Pool: {formatSOL(match.pools.agent2)}</span>
                    <span>{probability.agent2}%</span>
                  </div>
                  <div className="w-full bg-space-700 rounded-full h-1.5">
                    <div 
                      className="bg-emission-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${probability.agent2}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-6 pt-4 border-t border-space-600">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {match.status === 'live' ? (
                <span className="text-enhancement-400 font-medium">🔴 Betting Open</span>
              ) : match.status === 'upcoming' ? (
                <span className="text-yellow-400 font-medium">⏰ Pre-Match Betting</span>
              ) : (
                <span className="text-gray-500">Match Ended</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-emission-400 font-medium">
              <span>Watch & Bet</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Live Indicator Animation */}
        {match.status === 'live' && (
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-enhancement-500 via-emission-500 to-manipulation-500 rounded-t-lg" />
            <motion.div
              className="absolute top-0 left-0 w-20 h-1 bg-white rounded-t-lg"
              animate={{ x: ['0%', '400%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </>
        )}
      </motion.div>
    </Link>
  );
};
