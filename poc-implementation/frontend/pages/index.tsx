// Landing page with live matches and hero section
'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout/Layout';
import { MatchCard } from '../components/MatchCard/MatchCard';
import { formatNumber, formatSOL } from '../utils/format';
import { apiService } from '../services/api';
import type { Match, Stats } from '../types';

// Hero section component
const HeroSection = () => (
  <div className="relative overflow-hidden">
    {/* Background Effects */}
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-space-900 via-space-800 to-space-900" />
      <div className="absolute inset-0 opacity-30">
        <div className="neural-pattern w-full h-full" />
      </div>
    </div>

    <div className="relative max-w-7xl mx-auto px-4 py-20">
      <div className="text-center">
        {/* Main Title */}
        <motion.h1
          className="text-6xl md:text-8xl font-bold mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="bg-gradient-to-r from-enhancement-400 via-emission-400 to-manipulation-400 bg-clip-text text-transparent">
            念
          </span>
          <span className="text-white ml-4">Platform</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-2xl md:text-3xl text-gray-300 mb-8 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Where AI Warriors Battle in Real-Time
          <br />
          <span className="text-emission-400">Powered by MagicBlock • Built on Solana</span>
        </motion.p>

        {/* Features */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="nen-card text-center">
            <div className="text-4xl mb-3" role="img" aria-label="Lightning bolt">⚡</div>
            <h2 className="text-xl font-bold text-emission-400 mb-2">Real-Time Gaming</h2>
            <p className="text-gray-400">Sub-50ms latency with MagicBlock technology</p>
          </div>
          <div className="nen-card text-center">
            <div className="text-4xl mb-3" role="img" aria-label="Robot">🤖</div>
            <h2 className="text-xl font-bold text-manipulation-400 mb-2">AI Battles</h2>
            <p className="text-gray-400">Neural networks compete in strategic Gungi matches</p>
          </div>
          <div className="nen-card text-center">
            <div className="text-4xl mb-3" role="img" aria-label="Diamond">💎</div>
            <h2 className="text-xl font-bold text-enhancement-400 mb-2">NFT Ownership</h2>
            <p className="text-gray-400">Own, trade, and upgrade your AI fighters</p>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <button className="nen-button text-lg px-8 py-4">
            Watch Live Matches
          </button>
          <button className="px-8 py-4 rounded-lg font-bold text-lg border-2 border-emission-400 text-emission-400 hover:bg-emission-400 hover:text-space-900 transition-colors">
            Explore Marketplace
          </button>
        </motion.div>
      </div>
    </div>
  </div>
);

// Stats section component
const StatsSection = ({ stats }: { stats: Stats }) => (
  <div className="bg-space-800 py-16">
    <div className="max-w-7xl mx-auto px-4">
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-enhancement-400 mb-2">
            {stats.activeMatches}
          </div>
          <div className="text-gray-400">Live Matches</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-emission-400 mb-2">
            {formatSOL(stats.totalPool).split(' ')[0]}
          </div>
          <div className="text-gray-400">Total Pool (SOL)</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-manipulation-400 mb-2">
            {formatNumber(stats.playersOnline)}
          </div>
          <div className="text-gray-400">Players Online</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-neural-400 mb-2">
            {formatNumber(stats.totalBets)}
          </div>
          <div className="text-gray-400">Total Bets</div>
        </div>
      </motion.div>
    </div>
  </div>
);

// Main page component
function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<Stats>({ activeMatches: 0, totalPool: 0, playersOnline: 0, totalBets: 0 });
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load data from API - following GI-02: Real implementations only
  useEffect(() => {
    if (!mounted) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load matches and stats in parallel
        const [matchesData, statsData] = await Promise.all([
          apiService.getMatches(),
          apiService.getStats(),
        ]);
        
        setMatches(matchesData);
        setStats(statsData);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load platform data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [mounted]);

  // Real-time updates for live data
  useEffect(() => {
    if (!mounted || loading) return;
    
    const interval = setInterval(async () => {
      try {
        // Update live matches and stats
        const [liveMatches, updatedStats] = await Promise.all([
          apiService.getLiveMatches(),
          apiService.getStats(),
        ]);
        
        // Update live matches in the current matches list
        setMatches(prevMatches => {
          const updatedMatches = [...prevMatches];
          liveMatches.forEach((liveMatch: Match) => {
            const index = updatedMatches.findIndex(m => m.id === liveMatch.id);
            if (index !== -1) {
              updatedMatches[index] = liveMatch;
            }
          });
          return updatedMatches;
        });
        
        setStats(updatedStats);
      } catch (err) {
        console.error('Failed to update live data:', err);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [mounted, loading]);

  // Filter matches
  const filteredMatches = matches.filter(match => {
    if (filter === 'all') return true;
    return match.status === filter;
  });

  // Loading state
  if (!mounted || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emission-400"></div>
            <p className="mt-4 text-gray-400">Loading Nen Platform...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 text-xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Unable to Load Platform</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="nen-button"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <a id="main-content" tabIndex={-1}></a>
      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section with real data */}
      <StatsSection stats={stats} />

      {/* Matches Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-emission-400 to-manipulation-400 bg-clip-text text-transparent">
                Live Arena
              </span>
            </h2>
            <p className="text-gray-400">
              Watch AI agents battle in real-time Gungi matches
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4 md:mt-0">
            {(['all', 'live', 'upcoming'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-emission-500 text-white'
                    : 'bg-space-700 text-gray-300 hover:bg-space-600'
                }`}
              >
                {status === 'all' ? 'All Matches' : status === 'live' ? 'Live' : 'Upcoming'}
              </button>
            ))}
          </div>
        </div>

        {/* Match Grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {filteredMatches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <MatchCard match={match} />
            </motion.div>
          ))}
        </motion.div>

        {/* Empty State */}
        {filteredMatches.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-6xl mb-4" role="img" aria-label="Game controller">🎮</div>
            <h3 className="text-xl font-bold text-gray-400 mb-2">No matches found</h3>
            <p className="text-gray-500">
              {filter === 'live' 
                ? 'No live matches at the moment. Check back soon!'
                : 'No upcoming matches scheduled.'
              }
            </p>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}

// Dynamic import to prevent SSR hydration issues
export default dynamic(() => Promise.resolve(HomePage), {
  ssr: false,
  loading: () => (
    <Layout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emission-400"></div>
          <p className="mt-4 text-gray-400">Loading Nen Platform...</p>
        </div>
      </div>
    </Layout>
  ),
});
