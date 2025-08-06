import React, { useState } from 'react';
import { Layout } from '@/components/Layout/Layout';
import { AIAgentCard } from '@/components/AIAgentCard/AIAgentCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';

type SortBy = 'elo' | 'price' | 'winRate' | 'rarity';
type FilterRarity = 'all' | 'common' | 'rare' | 'epic' | 'legendary';
type FilterNenType = 'all' | 'enhancement' | 'emission' | 'manipulation' | 'transmutation' | 'conjuration' | 'specialization';

export default function MarketplacePage() {
  const { publicKey } = useWallet();
  const [sortBy, setSortBy] = useState<SortBy>('elo');
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all');
  const [filterNenType, setFilterNenType] = useState<FilterNenType>('all');
  const [showOnlyForSale, setShowOnlyForSale] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch AI agents
  const { data: agents, isLoading } = useQuery('agents', async () => {
    // In a real implementation, this would fetch from the API
    return [
      {
        id: '1',
        name: 'Shadow Hunter X',
        owner: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        elo: 2450,
        winRate: 0.78,
        gamesPlayed: 234,
        price: 5000000000,
        personality: 'Aggressive',
        isForSale: true,
        nenType: 'enhancement',
        specialAbilities: ['Power Strike', 'Rage Mode', 'Counter Attack'],
        generation: 3,
        rarity: 'legendary' as const,
      },
      {
        id: '2',
        name: 'Mind Weaver',
        owner: '8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        elo: 2280,
        winRate: 0.65,
        gamesPlayed: 156,
        price: 3000000000,
        personality: 'Strategic',
        isForSale: true,
        nenType: 'manipulation',
        specialAbilities: ['Mind Control', 'Illusion', 'Puppet Master'],
        generation: 2,
        rarity: 'epic' as const,
      },
      {
        id: '3',
        name: 'Lightning Bolt',
        owner: '7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        elo: 2150,
        winRate: 0.58,
        gamesPlayed: 89,
        personality: 'Speedster',
        isForSale: false,
        nenType: 'transmutation',
        specialAbilities: ['Lightning Speed', 'Thunder Strike'],
        generation: 1,
        rarity: 'rare' as const,
      },
      {
        id: '4',
        name: 'Phantom Sniper',
        owner: '6WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        elo: 2350,
        winRate: 0.72,
        gamesPlayed: 312,
        price: 8000000000,
        personality: 'Precision',
        isForSale: true,
        nenType: 'emission',
        specialAbilities: ['Long Range', 'Perfect Shot', 'Homing Missile', 'Explosive Round'],
        generation: 4,
        rarity: 'legendary' as const,
      },
    ];
  });

  // Filter and sort agents
  const filteredAgents = agents
    ?.filter(agent => {
      if (showOnlyForSale && !agent.isForSale) return false;
      if (filterRarity !== 'all' && agent.rarity !== filterRarity) return false;
      if (filterNenType !== 'all' && agent.nenType !== filterNenType) return false;
      if (searchQuery && !agent.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'elo':
          return b.elo - a.elo;
        case 'price':
          return (a.price || 0) - (b.price || 0);
        case 'winRate':
          return b.winRate - a.winRate;
        case 'rarity':
          const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        default:
          return 0;
      }
    }) || [];

  const handleBuy = async (agentId: string) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      // In a real implementation, this would call the smart contract
      toast.success('Purchase successful!');
    } catch (error) {
      toast.error('Purchase failed. Please try again.');
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
            HUNTER MARKETPLACE
          </h1>
          <p className="text-gray-400 font-cyber text-lg">
            ACQUIRE LEGENDARY AI HUNTERS • BUILD YOUR COLLECTION • DOMINATE THE ARENA
          </p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hunter-card p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                Search Hunters
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter name..."
                className="w-full px-4 py-2 bg-cyber-dark/50 border border-solana-purple/30 focus:border-solana-purple text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-solana-purple/50"
              />
            </div>

            {/* Rarity Filter */}
            <div>
              <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                Rarity
              </label>
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value as FilterRarity)}
                className="w-full px-4 py-2 bg-cyber-dark/50 border border-solana-purple/30 focus:border-solana-purple text-white focus:outline-none focus:ring-2 focus:ring-solana-purple/50"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>

            {/* Nen Type Filter */}
            <div>
              <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                Nen Type
              </label>
              <select
                value={filterNenType}
                onChange={(e) => setFilterNenType(e.target.value as FilterNenType)}
                className="w-full px-4 py-2 bg-cyber-dark/50 border border-solana-purple/30 focus:border-solana-purple text-white focus:outline-none focus:ring-2 focus:ring-solana-purple/50"
              >
                <option value="all">All Types</option>
                <option value="enhancement">Enhancement</option>
                <option value="emission">Emission</option>
                <option value="manipulation">Manipulation</option>
                <option value="transmutation">Transmutation</option>
                <option value="conjuration">Conjuration</option>
                <option value="specialization">Specialization</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-cyber text-gray-400 uppercase mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="w-full px-4 py-2 bg-cyber-dark/50 border border-solana-purple/30 focus:border-solana-purple text-white focus:outline-none focus:ring-2 focus:ring-solana-purple/50"
              >
                <option value="elo">ELO Rating</option>
                <option value="price">Price</option>
                <option value="winRate">Win Rate</option>
                <option value="rarity">Rarity</option>
              </select>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="mt-4 flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyForSale}
                onChange={(e) => setShowOnlyForSale(e.target.checked)}
                className="w-4 h-4 bg-transparent border-2 border-solana-purple text-solana-purple focus:ring-solana-purple focus:ring-2"
              />
              <span className="text-sm font-cyber text-gray-300">FOR SALE ONLY</span>
            </label>
            
            <div className="text-sm text-gray-400">
              {filteredAgents.length} HUNTERS FOUND
            </div>
          </div>
        </motion.div>

        {/* Agent Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="nen-spinner" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredAgents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AIAgentCard
                    agent={agent}
                    onBuy={() => handleBuy(agent.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {filteredAgents.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-hunter text-gray-400 mb-2">
              NO HUNTERS FOUND
            </h3>
            <p className="text-gray-500">
              Try adjusting your filters or search criteria
            </p>
          </motion.div>
        )}

        {/* Floating Create Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-solana-purple to-magicblock-primary rounded-full flex items-center justify-center shadow-lg shadow-solana-purple/50 group"
          onClick={() => toast.info('Hunter creation coming soon!')}
        >
          <span className="text-2xl group-hover:rotate-180 transition-transform duration-300">➕</span>
        </motion.button>
      </div>
    </Layout>
  );
} 