import React, { useState } from 'react';
import { Layout } from '@/components/Layout/Layout';
import { motion } from 'framer-motion';
import { formatSOL, shortenAddress } from '@/utils/format';

type LeaderboardType = 'players' | 'agents' | 'earnings';

export default function LeaderboardPage() {
  const [selectedType, setSelectedType] = useState<LeaderboardType>('players');

  // Mock leaderboard data
  const leaderboards = {
    players: [
      { rank: 1, address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', winRate: 0.82, totalBets: 567, earnings: 2450000000000 },
      { rank: 2, address: '8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', winRate: 0.78, totalBets: 423, earnings: 1890000000000 },
      { rank: 3, address: '7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', winRate: 0.75, totalBets: 389, earnings: 1650000000000 },
      { rank: 4, address: '6WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', winRate: 0.72, totalBets: 312, earnings: 1420000000000 },
      { rank: 5, address: '5WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', winRate: 0.69, totalBets: 298, earnings: 1180000000000 },
    ],
    agents: [
      { rank: 1, name: 'Shadow Hunter X', owner: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', elo: 2650, winRate: 0.89, gamesPlayed: 456, nenType: 'enhancement' },
      { rank: 2, name: 'Phantom Sniper', owner: '8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', elo: 2580, winRate: 0.85, gamesPlayed: 389, nenType: 'emission' },
      { rank: 3, name: 'Mind Controller', owner: '7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', elo: 2520, winRate: 0.82, gamesPlayed: 412, nenType: 'manipulation' },
      { rank: 4, name: 'Lightning God', owner: '6WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', elo: 2480, winRate: 0.79, gamesPlayed: 367, nenType: 'transmutation' },
      { rank: 5, name: 'Reality Bender', owner: '5WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', elo: 2450, winRate: 0.77, gamesPlayed: 334, nenType: 'conjuration' },
    ],
    earnings: [
      { rank: 1, address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', totalEarnings: 2450000000000, biggestWin: 450000000000, totalMatches: 567 },
      { rank: 2, address: '8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', totalEarnings: 1890000000000, biggestWin: 380000000000, totalMatches: 423 },
      { rank: 3, address: '7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', totalEarnings: 1650000000000, biggestWin: 320000000000, totalMatches: 389 },
      { rank: 4, address: '6WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', totalEarnings: 1420000000000, biggestWin: 280000000000, totalMatches: 312 },
      { rank: 5, address: '5WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', totalEarnings: 1180000000000, biggestWin: 250000000000, totalMatches: 298 },
    ],
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-600 to-yellow-400 text-black';
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-300 text-black';
      case 3:
        return 'bg-gradient-to-r from-orange-700 to-orange-500 text-black';
      default:
        return 'bg-gray-800 text-white';
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-hunter text-transparent bg-clip-text bg-gradient-to-r from-solana-purple to-solana-green mb-4">
            HUNTER RANKINGS
          </h1>
          <p className="text-gray-400 font-cyber text-lg">
            THE ELITE • THE LEGENDS • THE CHAMPIONS
          </p>
        </motion.div>

        {/* Leaderboard Type Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-cyber-dark/50 backdrop-blur-sm border border-solana-purple/30 p-1 rounded-full">
            {(['players', 'agents', 'earnings'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`
                  px-6 py-2 font-cyber text-sm uppercase tracking-wider transition-all rounded-full
                  ${selectedType === type 
                    ? 'bg-gradient-to-r from-solana-purple to-magicblock-primary text-white' 
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Content */}
        <motion.div
          key={selectedType}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {selectedType === 'players' && (
            <div className="space-y-4">
              {leaderboards.players.map((player, index) => (
                <motion.div
                  key={player.address}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hunter-card p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-hunter text-xl ${getRankStyle(player.rank)}`}>
                        {player.rank}
                      </div>
                      <div>
                        <p className="font-mono text-white">{shortenAddress(player.address, 6)}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                          <span>Win Rate: <span className="text-cyan-400">{(player.winRate * 100).toFixed(0)}%</span></span>
                          <span>Bets: <span className="text-yellow-400">{player.totalBets}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-mono text-solana-green">{formatSOL(player.earnings)} SOL</p>
                      <p className="text-xs text-gray-400 uppercase">Total Earnings</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {selectedType === 'agents' && (
            <div className="space-y-4">
              {leaderboards.agents.map((agent, index) => (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hunter-card p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-hunter text-xl ${getRankStyle(agent.rank)}`}>
                        {agent.rank}
                      </div>
                      <div>
                        <p className={`font-hunter text-lg nen-${agent.nenType}`}>{agent.name}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                          <span>Owner: <span className="font-mono">{shortenAddress(agent.owner, 4)}</span></span>
                          <span className="text-xs uppercase">{agent.nenType}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-8">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{agent.elo}</p>
                        <p className="text-xs text-gray-400 uppercase">ELO</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-cyan-400">{(agent.winRate * 100).toFixed(0)}%</p>
                        <p className="text-xs text-gray-400 uppercase">Win Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-400">{agent.gamesPlayed}</p>
                        <p className="text-xs text-gray-400 uppercase">Games</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {selectedType === 'earnings' && (
            <div className="space-y-4">
              {leaderboards.earnings.map((earner, index) => (
                <motion.div
                  key={earner.address}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hunter-card p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-hunter text-xl ${getRankStyle(earner.rank)}`}>
                        {earner.rank}
                      </div>
                      <div>
                        <p className="font-mono text-white">{shortenAddress(earner.address, 6)}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                          <span>Matches: <span className="text-yellow-400">{earner.totalMatches}</span></span>
                          <span>Biggest Win: <span className="text-cyan-400">{formatSOL(earner.biggestWin)} SOL</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-mono text-transparent bg-clip-text bg-gradient-to-r from-solana-green to-yellow-400">
                        {formatSOL(earner.totalEarnings)} SOL
                      </p>
                      <p className="text-xs text-gray-400 uppercase">Total Earnings</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Season Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="hunter-card p-6 inline-block">
            <h3 className="text-lg font-hunter text-solana-purple mb-2">SEASON 1</h3>
            <p className="text-sm text-gray-400 mb-2">Ends in 23 days 14 hours 32 minutes</p>
            <div className="flex items-center justify-center space-x-4 text-sm">
              <span className="text-gray-400">Prize Pool:</span>
              <span className="font-mono text-solana-green text-lg">10,000 SOL</span>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
} 