import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatSOL } from '@/utils/format';
import toast from 'react-hot-toast';

interface AIAgent {
  id: string;
  name: string;
  owner: string;
  elo: number;
  winRate: number;
  gamesPlayed: number;
  price?: number;
  personality: string;
  isForSale?: boolean;
  nenType: string;
  specialAbilities: string[];
  generation: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface AIAgentCardProps {
  agent: AIAgent;
  onBuy?: () => void;
  onSelect?: () => void;
}

const rarityColors = {
  common: 'from-gray-500 to-gray-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
  legendary: 'from-yellow-500 to-orange-500',
};

const rarityGlow = {
  common: 'shadow-gray-500/50',
  rare: 'shadow-blue-500/50',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-500/50',
};

export const AIAgentCard: React.FC<AIAgentCardProps> = ({ agent, onBuy, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBuy) {
      onBuy();
    }
  };

  const statPercentage = (value: number, max: number) => (value / max) * 100;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => {
        if (onSelect) onSelect();
        setShowDetails(!showDetails);
      }}
      className="relative hunter-card overflow-hidden cursor-pointer"
    >
      {/* Rarity Glow Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${rarityColors[agent.rarity]} opacity-10`} />
      
      {/* Header */}
      <div className="relative p-4 pb-0">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-hunter text-white mb-1">{agent.name}</h3>
            <p className="text-xs font-cyber text-gray-400 uppercase tracking-wider">
              GEN {agent.generation} • {agent.rarity.toUpperCase()}
            </p>
          </div>
          {agent.isForSale && (
            <span className="px-2 py-1 bg-solana-green/20 text-solana-green text-xs font-cyber uppercase border border-solana-green/50">
              FOR SALE
            </span>
          )}
        </div>

        {/* Avatar Section */}
        <div className="relative mx-auto mb-4">
          <motion.div
            animate={{ rotate: isHovered ? 360 : 0 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-solana-purple/20 to-transparent"
          />
          
          <div className="relative w-32 h-32 mx-auto">
            {/* Nen Aura */}
            <div className={`absolute inset-0 rounded-full nen-${agent.nenType} blur-xl opacity-50`} />
            
            {/* Avatar Container */}
            <div className={`
              relative w-full h-full rounded-full bg-gradient-to-br ${rarityColors[agent.rarity]}
              flex items-center justify-center shadow-lg ${rarityGlow[agent.rarity]}
              border-2 border-white/20
            `}>
              <span className="text-5xl">
                {agent.nenType === 'enhancement' ? '⚔️' :
                 agent.nenType === 'emission' ? '💫' :
                 agent.nenType === 'manipulation' ? '🎭' :
                 agent.nenType === 'transmutation' ? '🔮' :
                 agent.nenType === 'conjuration' ? '📿' :
                 '👁️'}
              </span>
            </div>

            {/* Nen Type Badge */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <span className={`px-3 py-1 text-xs font-cyber uppercase tracking-wider bg-cyber-darker/80 border nen-${agent.nenType}`}>
                {agent.nenType}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative p-4 pt-0 space-y-3">
        {/* Primary Stats */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-cyber text-gray-400 uppercase">ELO Rating</span>
            <span className="text-sm font-bold font-mono text-white">{agent.elo}</span>
          </div>
          
          <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${statPercentage(agent.elo, 2500)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-solana-purple to-solana-green rounded-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-cyber text-gray-400 uppercase">Win Rate</span>
            <span className="text-sm font-bold font-mono text-solana-green">
              {(agent.winRate * 100).toFixed(1)}%
            </span>
          </div>
          
          <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${agent.winRate * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
            />
          </div>
        </div>

        {/* Games Played */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Games Played</span>
          <span className="font-mono">{agent.gamesPlayed.toLocaleString()}</span>
        </div>

        {/* Personality */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Personality</span>
          <span className="text-cyan-400 font-cyber uppercase text-xs">{agent.personality}</span>
        </div>
      </div>

      {/* Expandable Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative border-t border-gray-800"
          >
            <div className="p-4 space-y-3">
              {/* Special Abilities */}
              <div>
                <h4 className="text-sm font-cyber text-gray-400 uppercase mb-2">Special Abilities</h4>
                <div className="flex flex-wrap gap-2">
                  {agent.specialAbilities.map((ability, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-cyber-dark/50 border border-solana-purple/30 text-solana-purple"
                    >
                      {ability}
                    </span>
                  ))}
                </div>
              </div>

              {/* Owner */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Owner</span>
                <span className="font-mono text-gray-300">
                  {agent.owner.slice(0, 4)}...{agent.owner.slice(-4)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Price & Action */}
      {agent.isForSale && agent.price && (
        <div className="relative p-4 pt-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-cyber text-gray-400 uppercase">Price</span>
            <span className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-solana-green to-yellow-400">
              {formatSOL(agent.price)} SOL
            </span>
          </div>
          
          {onBuy && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBuy}
              className="w-full cyber-button text-sm"
            >
              ACQUIRE HUNTER
            </motion.button>
          )}
        </div>
      )}

      {/* Hover Overlay Effect */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-solana-purple/20 via-transparent to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-solana-purple to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}; 