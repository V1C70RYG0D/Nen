import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout/Layout';
import { MatchList } from '@/components/MatchList';
import { MatchDetailModal } from '@/components/MatchDetail';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { formatNumber } from '@/utils/format';
import { MatchFilters, Match } from '@/types/match';
import { useMatches } from '@/hooks/useMatches';
import AOS from 'aos';
import 'aos/dist/aos.css';

export default function HomePage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'live' | 'upcoming' | 'all'>('live');
  const [showFilters, setShowFilters] = useState(false); // Don't auto-expand on homepage
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const aosInitedRef = useRef(false);
  const particles = useMemo(() => (
    Array.from({ length: 20 }).map(() => ({
      x: Math.random() * 1200,
      y: Math.random() * 800,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * 2,
    }))
  ), []);
  
  // Ensure client-side rendering for animations
  useEffect(() => {
    // Guard against StrictMode double-effect in dev
    setIsClient(true);
  }, []);
  
  // Get real stats from API (GI.md rule #3 compliance)
  // Memoize filters object to avoid infinite state churn in the hook
  const allMatchesFilters = useMemo(() => ({
    status: ['live', 'upcoming', 'completed'] as MatchFilters['status'],
    limit: 1000,
  }), []);
  const { matches: allMatches } = useMatches({ 
    filters: allMatchesFilters,
    enableRealTime: false 
  });
  
  useEffect(() => {
    if (aosInitedRef.current) return;
    AOS.init({
      duration: 1000,
      once: true,
    });
    aosInitedRef.current = true;
  }, []);

  // Dynamic filters that reset when tab changes - User Story 3 Implementation
  const currentFilters = useMemo((): MatchFilters => {
    const baseFilters: MatchFilters = {
      sortBy: 'startTime',
      sortOrder: selectedTab === 'upcoming' ? 'asc' : 'desc',
      limit: 6, // Show fewer matches on homepage
      page: 1,
      // Reset any previous filters when switching tabs
      minBetRange: undefined,
      maxBetRange: undefined,
      minAiRating: undefined,
      maxAiRating: undefined,
      nenTypes: undefined,
      timeControls: undefined,
    };

    switch (selectedTab) {
      case 'live':
        return { ...baseFilters, status: ['live'] };
      case 'upcoming':
        return { ...baseFilters, status: ['upcoming'] };
      case 'all':
        return { ...baseFilters, status: ['live', 'upcoming', 'completed'] };
      default:
        return { ...baseFilters, status: ['live'] };
    }
  }, [selectedTab]); // Only depend on selectedTab, not external filters

  // Real statistics from API data (GI.md rule #3 compliance)
  const stats = useMemo(() => {
    if (!allMatches || allMatches.length === 0) {
      return [
        { label: 'Total Matches', value: '...', color: 'text-solana-purple' },
        { label: 'Active Players', value: '...', color: 'text-solana-green' },
        { label: 'SOL Wagered', value: '...', color: 'text-yellow-400' },
        { label: 'AI Agents', value: '...', color: 'text-blue-400' },
      ];
    }

    const totalMatches = allMatches.length;
    const liveMatches = allMatches.filter(m => m.status === 'live').length;
    const totalSolWagered = allMatches.reduce((sum, match) => {
      return sum + (match.bettingPool?.totalPool || 0);
    }, 0) / 1000000000; // Convert from lamports to SOL
    const uniqueAgents = new Set([
      ...allMatches.map(m => m.agent1.id),
      ...allMatches.map(m => m.agent2.id)
    ]).size;

    return [
      { label: 'Total Matches', value: formatNumber(totalMatches), color: 'text-solana-purple' },
      { label: 'Live Matches', value: formatNumber(liveMatches), color: 'text-solana-green' },
      { label: 'SOL Wagered', value: formatNumber(Math.round(totalSolWagered)), color: 'text-yellow-400' },
      { label: 'AI Agents', value: formatNumber(uniqueAgents), color: 'text-blue-400' },
    ];
  }, [allMatches]);

  // User Story 3: Handle match click for detailed betting evaluation
  const handleMatchClick = useCallback((match: Match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMatch(null);
  }, []);

  // User Story 3: Handle betting action from match detail
  const handleBetClick = useCallback((match: Match, agentChoice: 1 | 2) => {
    // Route to Arena page with matchId; BettingPanel on that page handles real devnet flow
    router.push(`/arena/${match.id}?bet=${agentChoice}`);
  }, [router]);

  // User Story 3: Handle watch live action
  const handleWatchClick = useCallback((match: Match) => {
    // Navigate to live match viewing with MagicBlock WebSocket
    console.log('User Story 3: Watch live match', match.id);
    router.push(`/matches/${match.id}/live`);
  }, [router]);

  return (
    <Layout>
      {/* Enhanced Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-cyber-dark overflow-hidden">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-green-900/30" />
        <div className="absolute inset-0 bg-cyber-grid bg-[size:40px_40px] opacity-15" />
        
        {/* Animated Background Particles - Client Side Only */}
    {isClient ? (
          <div className="absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-solana-purple rounded-full"
                initial={{ 
          x: p.x,
          y: p.y,
                  opacity: 0
                }}
                animate={{ 
                  y: [null, -50, 50],
                  opacity: [0, 1, 0],
                }}
                transition={{
          duration: p.duration,
                  repeat: Infinity,
          delay: p.delay,
                }}
              />
            ))}
          </div>
        ) : null}

        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/6 w-64 h-64 bg-solana-purple/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/6 w-64 h-64 bg-solana-green/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 text-center max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {/* Enhanced Main Title */}
            <motion.h1 
              className="text-7xl md:text-9xl lg:text-[10rem] font-hunter leading-none mb-8"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              <span className="block bg-gradient-to-r from-solana-purple via-cyber-accent to-solana-green bg-clip-text text-transparent text-glow-sm relative">
                NEN
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-solana-purple/20 via-cyber-accent/20 to-solana-green/20 blur-xl -z-10"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </span>
              <span className="block bg-gradient-to-r from-cyber-neon via-solana-purple to-magicblock-primary bg-clip-text text-transparent text-glow-sm">
                PLATFORM
              </span>
            </motion.h1>
            
            {/* Enhanced Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="mb-12"
            >
              <p className="text-2xl md:text-3xl text-white mb-2 font-tech font-medium tracking-wide">
                THE FUTURE OF
              </p>
              <motion.p 
                className="text-2xl md:text-4xl font-cyber font-bold bg-gradient-to-r from-solana-green via-cyber-accent to-solana-purple bg-clip-text text-transparent"
                animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                AI GAMING ON SOLANA
              </motion.p>
            </motion.div>
            
            {/* Enhanced Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
            >
              <Link href="/matches" className="inline-block">
                <motion.button
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: '0 0 30px rgba(153, 69, 255, 0.6)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative px-10 py-5 bg-gradient-to-r from-solana-purple to-magicblock-primary text-white font-cyber font-bold text-lg uppercase tracking-widest overflow-hidden"
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
                  }}
                >
                  <span className="relative z-10">ENTER THE ARENA</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                  />
                </motion.button>
              </Link>
              
              <a href="#matches" className="inline-block">
                <motion.button
                  whileHover={{ 
                    scale: 1.05,
                    backgroundColor: 'rgba(20, 241, 149, 0.1)',
                    boxShadow: '0 0 30px rgba(20, 241, 149, 0.4)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative px-10 py-5 border-2 border-solana-green text-solana-green font-cyber font-bold text-lg uppercase tracking-widest transition-all duration-300 overflow-hidden"
                  style={{
                    clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)'
                  }}
                >
                  <span className="relative z-10">WATCH LIVE MATCHES</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-solana-green/10 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6 }}
                  />
                </motion.button>
              </a>
            </motion.div>

            {/* Enhanced Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: 1.4 + index * 0.15, 
                    duration: 0.8,
                    ease: "easeOut"
                  }}
                  whileHover={{ 
                    scale: 1.1, 
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  className="group relative text-center p-6 rounded-xl bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-solana-purple/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <motion.div 
                    className={`text-4xl md:text-5xl font-hunter font-bold ${stat.color} mb-3 relative z-10`}
                    animate={{ 
                      textShadow: [
                        '0 0 10px currentColor',
                        '0 0 20px currentColor, 0 0 30px currentColor',
                        '0 0 10px currentColor'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                  >
                    {stat.value}
                  </motion.div>
                  
                  <div className="text-sm md:text-base text-gray-300 font-tech font-medium uppercase tracking-widest relative z-10 group-hover:text-white transition-colors">
                    {stat.label}
                  </div>
                  
                  {/* Hover glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(circle at center, ${stat.color.includes('purple') ? 'rgba(153, 69, 255, 0.1)' : 
                        stat.color.includes('green') ? 'rgba(20, 241, 149, 0.1)' :
                        stat.color.includes('yellow') ? 'rgba(255, 193, 7, 0.1)' :
                        'rgba(0, 217, 255, 0.1)'} 0%, transparent 70%)`
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="flex flex-col items-center"
            >
              <p className="text-gray-400 font-cyber text-sm mb-4 uppercase tracking-widest">
                Scroll to explore
              </p>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-6 h-10 border-2 border-solana-green rounded-full flex justify-center"
              >
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1 h-3 bg-solana-green rounded-full mt-2"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Enhanced Edge Lighting */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-solana-purple to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-solana-green to-transparent" />
        <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-cyber-accent to-transparent" />
        <div className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-magicblock-primary to-transparent" />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-cyber-darker relative">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-hunter text-white mb-4">
              POWERED BY CUTTING-EDGE TECHNOLOGY
            </h2>
            <p className="text-gray-400 font-cyber">
              EXPERIENCE THE NEXT GENERATION OF BLOCKCHAIN GAMING
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'SOLANA BLOCKCHAIN',
                description: 'Lightning-fast transactions with minimal fees on the most efficient blockchain',
                icon: '⚡',
                color: 'solana-purple',
              },
              {
                title: 'MAGICBLOCK ROLLUPS',
                description: 'Real-time gaming with ephemeral rollups for instant match settlement',
                icon: '🎮',
                color: 'magicblock-primary',
              },
              {
                title: 'AI NEURAL NETWORKS',
                description: 'Advanced AI agents trained on millions of matches with unique personalities',
                icon: '🧠',
                color: 'solana-green',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="hunter-card p-8 text-center group"
              >
                <div className={`text-6xl mb-4 text-${feature.color}`}>{feature.icon}</div>
                <h3 className="text-xl font-hunter text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* User Story 3: Matches Section with Filters */}
      <section id="matches" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-hunter text-white mb-4">
              ACTIVE MATCHES
            </h2>
            <p className="text-gray-400 font-cyber">
              WITNESS THE ULTIMATE AI SHOWDOWNS
            </p>
          </motion.div>

          {/* User Story 3: Tab Navigation for Live vs Upcoming Matches */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <div className="bg-cyber-dark/80 backdrop-blur-sm border border-solana-purple/30 p-1 rounded-xl shadow-lg">
              {(['live', 'upcoming', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setSelectedTab(tab);
                    setShowFilters(false); // Reset filters when switching tabs
                  }}
                  className={`
                    px-6 py-3 font-cyber text-sm uppercase tracking-wider transition-all rounded-lg relative
                    ${selectedTab === tab 
                      ? 'bg-gradient-to-r from-solana-purple to-magicblock-primary text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }
                  `}
                  data-testid={`tab-${tab}`}
                >
                  {tab === 'all' ? 'All Matches' : `${tab} Matches`}
                  {selectedTab === tab && (
                    <motion.div
                      layoutId="activeTabHomepage"
                      className="absolute inset-0 bg-gradient-to-r from-solana-purple to-magicblock-primary rounded-lg -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Filter Toggle Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mb-6"
          >
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                px-6 py-2 rounded-lg font-cyber text-sm uppercase tracking-wider transition-all
                ${showFilters 
                  ? 'bg-solana-purple text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
            >
              {showFilters ? '🔽 Hide Filters' : '🔍 Show Filters'}
            </button>
          </motion.div>

          {/* User Story 3: Match List with Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <MatchList
              key={selectedTab} // Force re-render when tab changes
              filters={currentFilters}
              showFilters={showFilters}
              enableInfiniteScroll={false}
              enableRealTimeUpdates={false} // Disable to prevent offline UI
              onMatchSelect={handleMatchClick} // User Story 3: Enable match detail viewing
              onBetClick={handleBetClick}
              emptyStateMessage={`No ${selectedTab} matches at the moment. ${
                selectedTab === 'live' 
                  ? 'Check the upcoming tab for scheduled battles!' 
                  : selectedTab === 'upcoming'
                  ? 'New AI matches are starting soon!'
                  : 'No matches available right now.'
              }`}
              className="space-y-6"
            />
          </motion.div>

          {/* Link to full matches page */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mt-12"
          >
            <Link href="/matches" className="inline-block">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-solana-purple to-magicblock-primary text-white font-cyber rounded-lg"
              >
                VIEW ALL MATCHES
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-cyber-grid bg-[size:50px_50px] opacity-5" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-solana-purple/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-solana-green/5 rounded-full blur-3xl" />
        </div>
      </section>

      {/* User Story 3: Match Detail Modal for Betting Evaluation */}
      <MatchDetailModal
        match={selectedMatch}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onBetClick={handleBetClick}
        onWatchClick={handleWatchClick}
      />
    </Layout>
  );
}
