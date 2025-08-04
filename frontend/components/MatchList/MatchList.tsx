// MatchList component for displaying lists of matches
import React from 'react';
import { motion } from 'framer-motion';
import { MatchCard } from '../MatchCard/MatchCard';
import type { Match } from '@/types';

interface MatchListProps {
  matches: Match[];
  loading?: boolean;
  error?: string;
  className?: string;
  emptyMessage?: string;
}

export const MatchList: React.FC<MatchListProps> = ({
  matches,
  loading = false,
  error,
  className = '',
  emptyMessage = 'No matches found'
}) => {
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse bg-space-700 rounded-lg h-64"
            data-testid={`match-skeleton-${index}`}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-bold text-enhancement-400 mb-2">Error Loading Matches</h3>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">🎮</div>
        <h3 className="text-xl font-bold text-gray-400 mb-2">No Matches Available</h3>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {matches.map((match, index) => (
        <motion.div
          key={match.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <MatchCard match={match} />
        </motion.div>
      ))}
    </div>
  );
};
