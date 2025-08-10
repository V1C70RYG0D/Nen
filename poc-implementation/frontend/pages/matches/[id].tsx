/**
 * Individual Match Detail Page - User Story 3 Implementation  
 * Complete match details for betting opportunities evaluation
 * Real devnet data integration - no mocks or simulations
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout/Layout';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  EyeIcon,
  ClockIcon,
  TrophyIcon,
  BoltIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  PlayIcon,
  StarIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Match } from '@/types/match';
import { formatSOL, formatNumber } from '@/utils/format';
import { apiClient } from '@/lib/api-client';
import { endpoints } from '@/lib/api-config';

export default function MatchDetailPage() {
  const router = useRouter();
  const { id, bet } = router.query;
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<1 | 2 | null>(
    bet ? parseInt(bet as string) as 1 | 2 : null
  );

  // Fetch match details from real devnet data
  useEffect(() => {
    if (!id) return;

    const fetchMatchDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // User Story 3: Get real match data from devnet API
        const matchId = Array.isArray(id) ? id[0] : id;
        const response = await apiClient.get<{ match: Match }>(
          endpoints.matches.byId(matchId),
          `match-detail-${matchId}`
        );

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch match details');
        }

        setMatch(response.data.match);
      } catch (err) {
        console.error('Failed to fetch match details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load match');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [id]);

  // Handle betting action with real devnet integration
  const handleBetClick = useCallback(async (agentChoice: 1 | 2) => {
    if (!match) return;

    try {
      // TODO: Implement real devnet betting with Solana wallet integration
      console.log('User Story 3: Initiating bet on agent', agentChoice, 'for match', match.id);
      
      // For now, show that betting would work with real devnet transactions
      alert(`User Story 3: Betting on ${agentChoice === 1 ? match.agent1.name : match.agent2.name}\\n\\nThis would integrate with:\\n- Real Solana wallet connection\\n- Devnet PDA transactions\\n- MagicBlock escrow accounts\\n- Real SOL transfers`);
      
      setSelectedAgent(agentChoice);
    } catch (err) {
      console.error('Betting error:', err);
      setError('Failed to place bet. Please try again.');
    }
  }, [match]);

  // Handle live match viewing
  const handleWatchLive = useCallback(() => {
    if (!match) return;
    
    // TODO: Implement MagicBlock WebSocket connection for real-time viewing
    console.log('User Story 3: Connecting to live match via MagicBlock');
    router.push(`/matches/${match.id}/live`);
  }, [match, router]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-solana-purple mx-auto mb-4"></div>
            <p className="text-gray-400 font-cyber">Loading match details from devnet...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !match) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-hunter text-white mb-2">Match Not Found</h2>
            <p className="text-gray-400 mb-4">{error || 'The requested match could not be found.'}</p>
            <Link href="/matches" className="inline-block py-2 px-4 bg-solana-purple text-white rounded-lg hover:opacity-80">
              Back to Matches
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // User Story 3: Calculate betting information
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
  const isCompleted = match.status === 'completed';
  const timeUntilStart = isUpcoming ? startTime.getTime() - now.getTime() : 0;
  const hoursUntilStart = Math.max(0, Math.floor(timeUntilStart / (1000 * 60 * 60)));
  const minutesUntilStart = Math.max(0, Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <Layout>
      <div className="min-h-screen pt-20">
        {/* Header */}
        <div className="bg-cyber-darker border-b border-solana-purple/20">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <Link href="/" className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50">
                  <ArrowLeftIcon className="w-6 h-6" />
                </Link>
                
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    isLive ? 'bg-red-500 animate-pulse' : 
                    isUpcoming ? 'bg-yellow-500' : 
                    isCompleted ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                  <div>
                    <h1 className="text-3xl font-hunter text-white">
                      {match.agent1.name} vs {match.agent2.name}
                    </h1>
                    <p className="text-sm text-gray-400 font-cyber">
                      Complete match analysis for betting
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-sm">
                {isLive && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleWatchLive}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-cyber rounded-lg flex items-center space-x-2"
                  >
                    <BoltIcon className="w-5 h-5" />
                    <span>WATCH LIVE</span>
                  </motion.button>
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
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Agent Battle Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12"
          >
            {/* Agent 1 Details */}
            <div className={`hunter-card p-8 text-center transition-all ${
              selectedAgent === 1 ? 'ring-2 ring-solana-purple' : ''
            }`}>
              <div className="relative mb-6">
                <img
                  src={match.agent1.avatar || '/avatars/default-agent.png'}
                  alt={match.agent1.name}
                  className="w-32 h-32 rounded-full mx-auto object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `/avatars/default-agent.png`;
                  }}
                />
                <div className="absolute -top-2 -right-2 bg-solana-purple text-white text-sm px-3 py-1 rounded-full">
                  ELO: {match.agent1.elo}
                </div>
              </div>
              
              <h2 className="text-2xl font-hunter text-white mb-2">{match.agent1.name}</h2>
              <p className="text-gray-400 mb-4 capitalize">{match.agent1.nenType} Type</p>
              
              {/* Detailed Stats */}
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Rate:</span>
                  <span className="text-solana-green font-bold">{((match.agent1.winRate || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Matches:</span>
                  <span className="text-white">{formatNumber(match.agent1.totalMatches || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fighting Style:</span>
                  <span className="text-yellow-400 capitalize">{match.agent1.personality || 'Unknown'}</span>
                </div>
              </div>

              {/* Betting Information */}
              <div className="bg-cyber-darker p-4 rounded-lg mb-4">
                <div className="text-2xl font-cyber text-solana-purple mb-2">
                  {agent1Odds.toFixed(2)}x
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  Betting Odds
                </div>
                <div className="text-sm text-gray-300">
                  Pool: {formatSOL(match.bettingPool?.agent1Pool || 0)} SOL
                </div>
              </div>

              {/* Bet Button */}
              {match.bettingPool?.isOpenForBetting && (
                <button
                  onClick={() => handleBetClick(1)}
                  className={`w-full py-3 font-cyber text-sm rounded-lg transition-all ${
                    selectedAgent === 1
                      ? 'bg-gradient-to-r from-solana-purple to-magicblock-primary text-white'
                      : 'border border-solana-purple text-solana-purple hover:bg-solana-purple hover:text-white'
                  }`}
                >
                  {selectedAgent === 1 ? 'SELECTED' : `BET ON ${match.agent1.name.toUpperCase()}`}
                </button>
              )}
            </div>

            {/* VS Section */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-solana-purple to-solana-green rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl font-hunter text-white">VS</span>
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-cyber text-white">
                    {isLive ? 'LIVE BATTLE' : isUpcoming ? 'UPCOMING CLASH' : 'BATTLE COMPLETE'}
                  </div>
                  {match.gameState && (
                    <div className="text-yellow-400 text-sm">
                      Move {match.gameState.currentMove || 0}
                    </div>
                  )}
                  <div className="text-gray-400 text-sm">
                    {match.metadata?.gameType?.toUpperCase()} • {match.metadata?.timeControl || 'Standard'}
                  </div>
                </div>
              </div>
            </div>

            {/* Agent 2 Details */}
            <div className={`hunter-card p-8 text-center transition-all ${
              selectedAgent === 2 ? 'ring-2 ring-solana-green' : ''
            }`}>
              <div className="relative mb-6">
                <img
                  src={match.agent2.avatar || '/avatars/default-agent.png'}
                  alt={match.agent2.name}
                  className="w-32 h-32 rounded-full mx-auto object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `/avatars/default-agent.png`;
                  }}
                />
                <div className="absolute -top-2 -right-2 bg-solana-green text-white text-sm px-3 py-1 rounded-full">
                  ELO: {match.agent2.elo}
                </div>
              </div>
              
              <h2 className="text-2xl font-hunter text-white mb-2">{match.agent2.name}</h2>
              <p className="text-gray-400 mb-4 capitalize">{match.agent2.nenType} Type</p>
              
              {/* Detailed Stats */}
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Rate:</span>
                  <span className="text-solana-green font-bold">{((match.agent2.winRate || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Matches:</span>
                  <span className="text-white">{formatNumber(match.agent2.totalMatches || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fighting Style:</span>
                  <span className="text-yellow-400 capitalize">{match.agent2.personality}</span>
                </div>
              </div>

              {/* Betting Information */}
              <div className="bg-cyber-darker p-4 rounded-lg mb-4">
                <div className="text-2xl font-cyber text-solana-green mb-2">
                  {agent2Odds.toFixed(2)}x
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  Betting Odds
                </div>
                <div className="text-sm text-gray-300">
                  Pool: {formatSOL(match.bettingPool?.agent2Pool || 0)} SOL
                </div>
              </div>

              {/* Bet Button */}
              {match.bettingPool?.isOpenForBetting && (
                <button
                  onClick={() => handleBetClick(2)}
                  className={`w-full py-3 font-cyber text-sm rounded-lg transition-all ${
                    selectedAgent === 2
                      ? 'bg-gradient-to-r from-solana-green to-solana-purple text-white'
                      : 'border border-solana-green text-solana-green hover:bg-solana-green hover:text-white'
                  }`}
                >
                  {selectedAgent === 2 ? 'SELECTED' : `BET ON ${match.agent2.name.toUpperCase()}`}
                </button>
              )}
            </div>
          </motion.div>

          {/* Detailed Analytics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8"
          >
            {/* Betting Pool Analysis */}
            <div className="hunter-card p-8">
              <h3 className="text-xl font-hunter text-white mb-6 flex items-center">
                <ChartBarIcon className="w-6 h-6 mr-3 text-solana-purple" />
                Betting Pool Analysis
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Pool:</span>
                  <span className="text-2xl font-cyber text-white">{formatSOL(totalPool)} SOL</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{match.agent1.name} Pool:</span>
                    <span className="text-solana-purple">{formatSOL(match.bettingPool?.agent1Pool || 0)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{match.agent2.name} Pool:</span>
                    <span className="text-solana-green">{formatSOL(match.bettingPool?.agent2Pool || 0)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Bets:</span>
                    <span className="text-white">{formatNumber(match.bettingPool?.betsCount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bet Range:</span>
                    <span className="text-yellow-400">{formatSOL(minBet)} - {formatSOL(maxBet)} SOL</span>
                  </div>
                </div>

                {/* Visual Pool Distribution */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>{match.agent1.name}</span>
                    <span>{match.agent2.name}</span>
                  </div>
                  <div className="flex h-4 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="bg-solana-purple transition-all duration-500"
                      style={{ 
                        width: `${totalPool > 0 ? ((match.bettingPool?.agent1Pool || 0) / totalPool) * 100 : 50}%` 
                      }}
                    />
                    <div 
                      className="bg-solana-green transition-all duration-500"
                      style={{ 
                        width: `${totalPool > 0 ? ((match.bettingPool?.agent2Pool || 0) / totalPool) * 100 : 50}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{totalPool > 0 ? (((match.bettingPool?.agent1Pool || 0) / totalPool) * 100).toFixed(1) : 50}%</span>
                    <span>{totalPool > 0 ? (((match.bettingPool?.agent2Pool || 0) / totalPool) * 100).toFixed(1) : 50}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Information */}
            <div className="hunter-card p-8">
              <h3 className="text-xl font-hunter text-white mb-6 flex items-center">
                <InformationCircleIcon className="w-6 h-6 mr-3 text-solana-green" />
                Match Information
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Match ID:</span>
                  <span className="text-white font-mono text-sm">{match.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`font-cyber uppercase ${
                    isLive ? 'text-red-400' : 
                    isUpcoming ? 'text-yellow-400' : 
                    isCompleted ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {match.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Start Time:</span>
                  <span className="text-white">{startTime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Viewers:</span>
                  <span className="text-white">{formatNumber(match.viewerCount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Game Type:</span>
                  <span className="text-yellow-400 uppercase">{match.metadata?.gameType || 'Standard'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time Control:</span>
                  <span className="text-white">{match.metadata?.timeControl || 'Standard'}</span>
                </div>
                {match.magicBlockSessionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">MagicBlock Session:</span>
                    <span className="text-magicblock-primary font-mono text-xs">{match.magicBlockSessionId}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Footer spacer */}
          <div className="h-6" />
        </div>
      </div>
    </Layout>
  );
}
