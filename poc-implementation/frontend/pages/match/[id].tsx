// Dynamic match page for live game viewing
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout/Layout';
import { GameBoard } from '@/components/GameBoard/GameBoard';
import { BettingInterface } from '@/components/BettingInterface/BettingInterface';
import { MatchCard } from '@/components/MatchCard/MatchCard';
import type { Match } from '@/types';

// Mock match data - in real app, this would come from API
const mockMatch: Match = {
  id: 'match1',
  agent1: {
    id: 'agent1',
    name: 'Gon AI',
    owner: 'owner1',
    elo: 1800,
    winRate: 0.75,
    gamesPlayed: 120,
    personality: 'Aggressive',
    avatar: '🦾',
    isForSale: false,
    traits: { strategy: 85, adaptability: 78, aggression: 92, patience: 45, creativity: 88 },
  },
  agent2: {
    id: 'agent2',
    name: 'Killua Bot',
    owner: 'owner2',
    elo: 1750,
    winRate: 0.68,
    gamesPlayed: 95,
    personality: 'Tactical',
    avatar: '⚡',
    isForSale: false,
    traits: { strategy: 90, adaptability: 95, aggression: 70, patience: 85, creativity: 82 },
  },
  status: 'live',
  totalPool: 850000000,
  pools: {
    agent1: 400000000,
    agent2: 450000000,
    total: 850000000,
  },
  startTime: new Date(Date.now() - 3600000),
  viewers: 247,
};

export default function MatchPage() {
  const router = useRouter();
  const { id } = router.query;
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchMatch = async () => {
      try {
        setLoading(true);
        // In real app, fetch match by ID
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (id) {
          setMatch({ ...mockMatch, id: id as string });
        } else {
          setError('Match not found');
        }
      } catch (err) {
        setError('Failed to load match');
        console.error('Error fetching match:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMatch();
    }
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emission-400"></div>
            <p className="mt-4 text-gray-400">Loading match...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !match) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-enhancement-400 mb-2">Match Not Found</h1>
            <p className="text-gray-400 mb-6">{error || 'The requested match could not be found.'}</p>
            <button 
              onClick={() => router.push('/')}
              className="nen-button"
            >
              Back to Arena
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Match Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            <div className="flex items-center gap-4">
              {match.status === 'live' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-enhancement-500 rounded-full animate-pulse" />
                  <span className="text-sm text-enhancement-400 font-bold">LIVE</span>
                  <span className="text-sm text-gray-400">{match.viewers} viewers</span>
                </div>
              )}
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-emission-400 to-manipulation-400 bg-clip-text text-transparent">
              Live Match
            </span>
          </h1>
          <p className="text-gray-400">
            {match.agent1.name} vs {match.agent2.name}
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Game Board - Takes up 2 columns on large screens */}
          <div className="xl:col-span-2">
            <GameBoard 
              matchId={match.id} 
              isLive={match.status === 'live'}
              enableMagicBlock={true}
            />
          </div>

          {/* Sidebar with betting and match info */}
          <div className="space-y-6">
            {/* Match Info Card */}
            <MatchCard match={match} className="mb-6" />

            {/* Betting Interface */}
            {match.status === 'live' && (
              <BettingInterface 
                match={match}
                onBetPlaced={(betDetails) => {
                  console.log('Bet placed:', betDetails);
                  // Handle bet placement
                }}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
