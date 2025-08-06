import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout/Layout';
import { MatchCard } from '@/components/MatchCard/MatchCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import Link from 'next/link';
import { formatNumber } from '@/utils/format';
import AOS from 'aos';
import 'aos/dist/aos.css';

export default function HomePage() {
  const [selectedTab, setSelectedTab] = useState<'live' | 'upcoming' | 'completed'>('live');
  
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  // Fetch matches
  const { data: matches, isLoading } = useQuery('matches', async () => {
    // In a real implementation, this would fetch from the API
    return [
      {
        id: '1',
        agent1: {
          name: 'Gon Freecss',
          elo: 2150,
          nenType: 'enhancement',
        },
        agent2: {
          name: 'Killua Zoldyck',
          elo: 2280,
          nenType: 'transmutation',
        },
        status: 'live' as const,
        totalPool: 25000000000,
        viewerCount: 1234,
      },
      {
        id: '2',
        agent1: {
          name: 'Kurapika',
          elo: 2350,
          nenType: 'conjuration',
        },
        agent2: {
          name: 'Hisoka',
          elo: 2450,
          nenType: 'transmutation',
        },
        status: 'upcoming' as const,
        totalPool: 15000000000,
        startTime: new Date(Date.now() + 3600000),
      },
      {
        id: '3',
        agent1: {
          name: 'Leorio',
          elo: 1850,
          nenType: 'emission',
        },
        agent2: {
          name: 'Illumi',
          elo: 2380,
          nenType: 'manipulation',
        },
        status: 'completed' as const,
        totalPool: 18000000000,
        winner: 2,
      },
    ];
  });

  const filteredMatches = matches?.filter(match => match.status === selectedTab) || [];

  // Platform stats
  const stats = {
    totalMatches: 1234,
    totalVolume: 456780000000,
    activeAgents: 89,
    activeUsers: 567,
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-solana-purple/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-solana-green/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-magicblock-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Title */}
            <h1 
              className="text-6xl md:text-8xl font-hunter mb-6 glitch-text" 
              data-text="NEN PLATFORM"
              data-aos="fade-up"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-solana-purple via-solana-green to-magicblock-primary animate-gradient text-glow">
                NEN PLATFORM
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl font-cyber text-gray-300 mb-8" data-aos="fade-up" data-aos-delay="200">
              AI VS AI GUNGI BATTLES ON SOLANA BLOCKCHAIN
            </p>
            
            {/* Description */}
            <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-12" data-aos="fade-up" data-aos-delay="400">
              Experience the future of competitive gaming where AI hunters battle in strategic Gungi matches. 
              Powered by MagicBlock's sub-50ms ephemeral rollups and Solana's lightning-fast blockchain.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center" data-aos="fade-up" data-aos-delay="600">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="cyber-button text-lg px-8 py-4"
                onClick={() => document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' })}
              >
                WATCH LIVE MATCHES
              </motion.button>
              
              <Link href="/marketplace">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-transparent border-2 border-solana-purple hover:bg-solana-purple/20 text-white font-cyber uppercase tracking-wider transition-all"
                >
                  EXPLORE HUNTERS
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-solana-purple rounded-full flex justify-center">
            <div className="w-1 h-2 bg-solana-purple rounded-full mt-2 animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Matches', value: stats.totalMatches, icon: '⚔️', color: 'solana-purple' },
              { label: 'Total Volume', value: `${formatNumber(stats.totalVolume / 1000000000)} SOL`, icon: '💰', color: 'solana-green' },
              { label: 'Active AI Agents', value: stats.activeAgents, icon: '🤖', color: 'magicblock-primary' },
              { label: 'Active Users', value: stats.activeUsers, icon: '👥', color: 'cyber-accent' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="hunter-card p-6 text-center group hover:scale-105 transition-transform"
              >
                <div className="text-4xl mb-3">{stat.icon}</div>
                <div className={`text-3xl font-bold font-mono text-${stat.color} mb-2`}>
                  {stat.value}
                </div>
                <div className="text-sm font-cyber text-gray-400 uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Matches Section */}
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

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-cyber-dark/50 backdrop-blur-sm border border-solana-purple/30 p-1 rounded-full">
              {(['live', 'upcoming', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`
                    px-6 py-2 font-cyber text-sm uppercase tracking-wider transition-all rounded-full
                    ${selectedTab === tab 
                      ? 'bg-gradient-to-r from-solana-purple to-magicblock-primary text-white' 
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Match Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="nen-spinner" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredMatches.map((match, index) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <MatchCard match={match} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {filteredMatches.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-gray-400 font-cyber">
                NO {selectedTab.toUpperCase()} MATCHES AVAILABLE
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-hunter text-white mb-4">
              POWERED BY CUTTING-EDGE TECHNOLOGY
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'SOLANA BLOCKCHAIN',
                description: 'Lightning-fast transactions with minimal fees',
                icon: '⚡',
                color: 'solana-purple',
              },
              {
                title: 'MAGICBLOCK ROLLUPS',
                description: 'Sub-50ms game actions with ephemeral state',
                icon: '🎮',
                color: 'magicblock-primary',
              },
              {
                title: 'AI HUNTER SYSTEM',
                description: 'Advanced AI agents with unique Nen abilities',
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
    </Layout>
  );
} 