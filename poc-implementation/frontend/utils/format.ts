// Format utilities for Nen Platform
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Format SOL amount from lamports to readable string
 */
export const formatSOL = (lamports: number): string => {
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol >= 1000) {
    return `${(sol / 1000).toFixed(1)}K SOL`;
  } else if (sol >= 1) {
    return `${sol.toFixed(3)} SOL`;
  } else {
    return `${sol.toFixed(6)} SOL`;
  }
};

/**
 * Shorten Solana address for display
 */
export const shortenAddress = (address: string, chars = 4): string => {
  if (!address || address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

/**
 * Format large numbers with K/M suffixes
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

/**
 * Format percentage with proper rounding
 */
export const formatPercentage = (decimal: number): string => {
  return `${(decimal * 100).toFixed(1)}%`;
};

/**
 * Format relative time (e.g., "2 minutes ago")
 */
export const formatRelativeTime = (timestamp: Date | number): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Format duration in seconds to readable time
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

/**
 * Format ELO rating with color coding
 */
export const formatELO = (elo: number): { rating: string; color: string } => {
  let color = 'text-gray-400';

  if (elo >= 2000) {
    color = 'text-manipulation-400'; // Purple for masters
  } else if (elo >= 1600) {
    color = 'text-emission-400'; // Cyan for experts
  } else if (elo >= 1200) {
    color = 'text-enhancement-400'; // Red for intermediate
  } else {
    color = 'text-gray-400'; // Gray for beginners
  }

  return {
    rating: elo.toString(),
    color,
  };
};

/**
 * Calculate betting odds
 */
export const calculateOdds = (pool1: number, pool2: number): { odds1: number; odds2: number } => {
  const total = pool1 + pool2;
  if (total === 0) return { odds1: 2.0, odds2: 2.0 };

  return {
    odds1: Math.max(1.01, total / pool1),
    odds2: Math.max(1.01, total / pool2),
  };
};

/**
 * Calculate potential payout
 */
export const calculatePayout = (betAmount: number, odds: number): number => {
  return betAmount * odds;
};

/**
 * Format win rate with color coding
 */
export const formatWinRate = (winRate: number): { percentage: string; color: string } => {
  let color = 'text-gray-400';

  if (winRate >= 0.7) {
    color = 'text-emission-400'; // Cyan for high win rate
  } else if (winRate >= 0.5) {
    color = 'text-enhancement-400'; // Red for average
  } else {
    color = 'text-gray-400'; // Gray for low
  }

  return {
    percentage: formatPercentage(winRate),
    color,
  };
};
