import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatSOL } from '@/utils/format';

interface Match {
  id: string;
  agent1: {
    name: string;
    elo: number;
    avatar?: string;
    nenType: string;
  };
  agent2: {
    name: string;
    elo: number;
    avatar?: string;
    nenType: string;
  };
  status: 'upcoming' | 'live' | 'completed';
  totalPool: number;
  startTime?: Date;
  winner?: 1 | 2;
  viewerCount?: number;
}

interface MatchCardProps {
  match: Match;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const getStatusStyle = () => {
    switch (match.status) {
      case 'live':
        return 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse';
      case 'upcoming':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'completed':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusText = () => {
    switch (match.status) {
      case 'live':
        return (
          <span className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>LIVE NOW</span>
          </span>
        );
      case 'upcoming':
        return match.startTime 
          ? `STARTS ${new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'STARTING SOON';
      case 'completed':
        return 'MATCH COMPLETE';
    }
  };

  return (
    <Link href={`/arena/${match.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        className="hunter-card p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-solana-purple/20 relative overflow-hidden group"
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
          
          {match.viewerCount && match.status === 'live' && (
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <span className="w-2 h-2 bg-solana-green rounded-full animate-pulse" />
              <span className="font-mono">{match.viewerCount.toLocaleString()}</span>
              <span className="font-cyber">WATCHING</span>
            </div>
          )}
        </div>

        {/* Match Info */}
        <div className="space-y-4 relative z-10">
          {/* Agents */}
          <div className="grid grid-cols-2 gap-4">
            {/* Agent 1 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-center space-y-2"
            >
              <div className="relative mx-auto w-20 h-20 mb-2">
                <div className={`absolute inset-0 bg-gradient-to-br from-${match.agent1.nenType === 'enhancement' ? 'red' : match.agent1.nenType === 'emission' ? 'cyan' : 'purple'}-500/20 to-transparent rounded-full blur-xl`} />
                <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-gray-700">
                  <span className="text-3xl">🎮</span>
                </div>
                {match.status === 'completed' && match.winner === 1 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-xs">👑</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className={`font-hunter text-lg nen-${match.agent1.nenType}`}>
                  {match.agent1.name}
                </h3>
                <p className="text-xs font-cyber text-gray-400">
                  {match.agent1.nenType.toUpperCase()} TYPE
                </p>
                <p className="text-sm font-mono text-gray-300 mt-1">
                  ELO: {match.agent1.elo}
                </p>
              </div>
            </motion.div>

            {/* VS Divider */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-solana-purple to-solana-green blur-md opacity-50" />
                <span className="relative text-2xl font-hunter text-white px-3 py-1 bg-cyber-darker/80 backdrop-blur-sm border border-solana-purple/50">
                  VS
                </span>
              </div>
            </div>

            {/* Agent 2 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-center space-y-2"
            >
              <div className="relative mx-auto w-20 h-20 mb-2">
                <div className={`absolute inset-0 bg-gradient-to-br from-${match.agent2.nenType === 'enhancement' ? 'red' : match.agent2.nenType === 'emission' ? 'cyan' : 'purple'}-500/20 to-transparent rounded-full blur-xl`} />
                <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-gray-700">
                  <span className="text-3xl">🤖</span>
                </div>
                {match.status === 'completed' && match.winner === 2 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-xs">👑</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className={`font-hunter text-lg nen-${match.agent2.nenType}`}>
                  {match.agent2.name}
                </h3>
                <p className="text-xs font-cyber text-gray-400">
                  {match.agent2.nenType.toUpperCase()} TYPE
                </p>
                <p className="text-sm font-mono text-gray-300 mt-1">
                  ELO: {match.agent2.elo}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Pool Info */}
          <div className="pt-4 border-t border-gray-800">
            <div className="flex justify-between items-center">
              <span className="text-sm font-cyber text-gray-400 uppercase tracking-wider">
                Prize Pool
              </span>
              <span className="text-xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-solana-green to-yellow-400">
                {formatSOL(match.totalPool)} SOL
              </span>
            </div>
          </div>
        </div>

        {/* Hover Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-solana-purple/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </motion.div>
    </Link>
  );
}; 