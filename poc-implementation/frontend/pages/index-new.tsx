import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '@/components/Layout/Layout';
import { MatchList } from '@/components/MatchList';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { formatNumber } from '@/utils/format';
import { MatchFilters } from '@/types/match';
import AOS from 'aos';
import 'aos/dist/aos.css';

export default function HomePage() {
  const [selectedTab, setSelectedTab] = useState<'live' | 'upcoming' | 'all'>('live');
  
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  // Dynamic filters that update based on selected tab - User Story 3 Implementation
  const currentFilters = useMemo((): MatchFilters => {
    const baseFilters: MatchFilters = {
      sortBy: 'startTime',
      sortOrder: selectedTab === 'upcoming' ? 'asc' : 'desc',
      limit: 6, // Show fewer matches on homepage
      page: 1,
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
  }, [selectedTab]);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-cyber-dark overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-green-900/20" />
        <div className="absolute inset-0 bg-cyber-grid bg-[size:50px_50px] opacity-10" />
        
        <div className="relative z-10 text-center max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className="text-6xl md:text-8xl font-hunter bg-gradient-to-r from-solana-purple via-solana-green to-yellow-400 bg-clip-text text-transparent mb-6">
              NEN PLATFORM
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 font-cyber">
              THE FUTURE OF AI GAMING ON SOLANA
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/matches">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-solana-purple to-magicblock-primary text-white font-cyber rounded-lg"
                >
                  ENTER THE ARENA
                </motion.button>
              </Link>
              
              <Link href="#matches">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 border border-solana-green text-solana-green font-cyber rounded-lg hover:bg-solana-green hover:text-black transition-colors"
                >
                  WATCH LIVE MATCHES
                </motion.button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              {[
                { label: 'Total Matches', value: '12,847', color: 'text-solana-purple' },
                { label: 'Active Players', value: '3,291', color: 'text-solana-green' },
                { label: 'SOL Wagered', value: '48,392', color: 'text-yellow-400' },
                { label: 'AI Agents', value: '156', color: 'text-blue-400' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="text-center"
                >
                  <div className={`text-3xl font-hunter ${stat.color} mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400 font-cyber uppercase tracking-wider">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
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
                  onClick={() => setSelectedTab(tab)}
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

          {/* User Story 3: Match List with Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <MatchList
              filters={currentFilters}
              showFilters={true}
              enableInfiniteScroll={false}
              enableRealTimeUpdates={true}
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
            <Link href="/matches">
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
    </Layout>
  );
}
