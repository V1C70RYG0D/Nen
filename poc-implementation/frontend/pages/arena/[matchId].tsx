import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout/Layout';
import { GameBoard } from '@/components/GameBoard/GameBoard';
import { BettingPanel } from '@/components/BettingPanel/BettingPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import { formatSOL, formatNumber } from '@/utils/format';
import toast from 'react-hot-toast';

interface Match {
  id: string;
  agent1: {
    id: string;
    name: string;
    elo: number;
    winRate: number;
    nenType: string;
    specialAbility: string;
  };
  agent2: {
    id: string;
    name: string;
    elo: number;
    winRate: number;
    nenType: string;
    specialAbility: string;
  };
  status: 'upcoming' | 'live' | 'completed';
  totalPool: number;
  moveCount: number;
  moveHistory: string[];
  viewerCount: number;
  startTime?: Date;
}

export default function MatchPage() {
  const router = useRouter();
  const { matchId } = router.query;
  const [selectedView, setSelectedView] = useState<'board' | 'stats' | 'history'>('board');
  const [showChat, setShowChat] = useState(false);

  // Fetch match data
  const { data: match, isLoading } = useQuery<Match>(
    ['match', matchId],
    async () => {
      // In a real implementation, this would fetch from the API
      return {
        id: matchId as string,
        agent1: {
          id: '1',
          name: 'Gon Freecss',
          elo: 2150,
          winRate: 0.65,
          nenType: 'enhancement',
          specialAbility: 'Jajanken - Rock Paper Scissors technique',
        },
        agent2: {
          id: '2',
          name: 'Killua Zoldyck',
          elo: 2280,
          winRate: 0.72,
          nenType: 'transmutation',
          specialAbility: 'Godspeed - Lightning-fast reflexes',
        },
        status: 'live',
        totalPool: 25000000000,
        moveCount: 42,
        moveHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
        viewerCount: 1234,
      };
    },
    {
      enabled: !!matchId,
    }
  );

  if (!matchId || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="nen-spinner" />
        </div>
      </Layout>
    );
  }

  if (!match) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-3xl font-hunter text-red-400 mb-4">MATCH NOT FOUND</h2>
          <p className="text-gray-400 mb-8">The requested match does not exist or has been removed.</p>
          <button
            onClick={() => router.push('/')}
            className="cyber-button"
          >
            RETURN TO ARENA
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Match Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hunter-card p-6 mb-6"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Agent 1 */}
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mb-2`}>
                  <span className="text-2xl">🎮</span>
                </div>
                <h3 className={`font-hunter text-lg nen-${match.agent1.nenType}`}>
                  {match.agent1.name}
                </h3>
                <p className="text-sm font-mono text-gray-400">ELO: {match.agent1.elo}</p>
              </div>
            </div>

            {/* Match Info */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                {match.status === 'live' && (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 font-cyber uppercase">LIVE MATCH</span>
                  </>
                )}
              </div>
              <div className="text-sm text-gray-400 font-cyber">
                MATCH ID: {match.id.slice(0, 8)}...
              </div>
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">Moves:</span>
                  <span className="font-mono text-white">{match.moveCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">Viewers:</span>
                  <span className="font-mono text-white">{formatNumber(match.viewerCount)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">Pool:</span>
                  <span className="font-mono text-solana-green">{formatSOL(match.totalPool)} SOL</span>
                </div>
              </div>
            </div>

            {/* Agent 2 */}
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-2`}>
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className={`font-hunter text-lg nen-${match.agent2.nenType}`}>
                  {match.agent2.name}
                </h3>
                <p className="text-sm font-mono text-gray-400">ELO: {match.agent2.elo}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* View Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-cyber-dark/50 backdrop-blur-sm border border-solana-purple/30 p-1 rounded-full">
            {(['board', 'stats', 'history'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={`
                  px-6 py-2 font-cyber text-sm uppercase tracking-wider transition-all rounded-full
                  ${selectedView === view 
                    ? 'bg-gradient-to-r from-solana-purple to-magicblock-primary text-white' 
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedView === 'board' && (
                <motion.div
                  key="board"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <GameBoard 
                    matchId={matchId as string} 
                    isLive={match.status === 'live'}
                    enableMagicBlock={true}
                  />
                </motion.div>
              )}

              {selectedView === 'stats' && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="hunter-card p-6"
                >
                  <h3 className="text-xl font-hunter text-white mb-6">MATCH STATISTICS</h3>
                  
                  <div className="space-y-6">
                    {/* Agent Comparison */}
                    <div className="grid grid-cols-2 gap-4">
                      {[match.agent1, match.agent2].map((agent, index) => (
                        <div key={agent.id} className="space-y-4">
                          <h4 className={`font-hunter text-lg nen-${agent.nenType}`}>
                            {agent.name}
                          </h4>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">Win Rate</span>
                                <span className="text-white font-mono">{(agent.winRate * 100).toFixed(1)}%</span>
                              </div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full bg-gradient-to-r ${
                                    index === 0 ? 'from-red-500 to-orange-500' : 'from-blue-500 to-cyan-500'
                                  }`}
                                  style={{ width: `${agent.winRate * 100}%` }}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">ELO Rating</span>
                                <span className="text-white font-mono">{agent.elo}</span>
                              </div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full bg-gradient-to-r ${
                                    index === 0 ? 'from-red-500 to-orange-500' : 'from-blue-500 to-cyan-500'
                                  }`}
                                  style={{ width: `${(agent.elo / 3000) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-cyber-dark/50 border border-solana-purple/20 rounded">
                            <p className="text-xs text-gray-400 mb-1">Special Ability</p>
                            <p className="text-sm text-cyan-400">{agent.specialAbility}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedView === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="hunter-card p-6"
                >
                  <h3 className="text-xl font-hunter text-white mb-6">MOVE HISTORY</h3>
                  
                  <div className="max-h-96 overflow-y-auto space-y-2 font-mono text-sm">
                    {match.moveHistory.map((move, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center space-x-3 p-2 bg-cyber-dark/30 hover:bg-cyber-dark/50 transition-colors"
                      >
                        <span className="text-gray-500 w-8">{index + 1}.</span>
                        <span className={`${index % 2 === 0 ? 'text-red-400' : 'text-blue-400'}`}>
                          {move}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Betting Panel */}
          <div>
            <BettingPanel
              matchId={matchId as string}
              agent1={match.agent1}
              agent2={match.agent2}
            />
          </div>
        </div>

        {/* Floating Chat Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowChat(!showChat)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-solana-purple to-magicblock-primary rounded-full flex items-center justify-center shadow-lg shadow-solana-purple/50 z-40"
        >
          <span className="text-2xl">💬</span>
        </motion.button>

        {/* Chat Panel (placeholder) */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-0 top-0 h-full w-80 bg-cyber-dark/95 backdrop-blur-xl border-l border-solana-purple/30 z-30 p-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-hunter text-lg text-white">MATCH CHAT</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="text-center text-gray-500 mt-20">
                Chat coming soon...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
} 