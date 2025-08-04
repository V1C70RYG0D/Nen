// Theme utilities for Nen Platform
import type { AuraType, ThemeColors } from '@/types';

export const themeColors: ThemeColors = {
  enhancement: '#FF6B6B',
  emission: '#4ECDC4',
  manipulation: '#6C5CE7',
  neural: '#00BCD4',
  solana: '#4527A0',
  magicblock: '#0277BD',
};

/**
 * Generate aura gradient CSS based on type
 */
export const getAuraGradient = (type: AuraType): string => {
  switch (type) {
    case 'enhancement':
      return 'linear-gradient(135deg, #FF6B6B, #FF8E8E)';
    case 'emission':
      return 'linear-gradient(135deg, #4ECDC4, #71D7D0)';
    case 'manipulation':
      return 'linear-gradient(135deg, #6C5CE7, #8B7BEA)';
    case 'neural':
      return 'linear-gradient(135deg, #00BCD4, #26C6DA)';
    default:
      return 'linear-gradient(135deg, #4ECDC4, #6C5CE7)';
  }
};

/**
 * Get aura glow shadow CSS
 */
export const getAuraGlow = (type: AuraType, intensity: 'low' | 'medium' | 'high' = 'medium'): string => {
  const color = themeColors[type];
  const alpha = intensity === 'low' ? '0.3' : intensity === 'medium' ? '0.5' : '0.7';
  const size = intensity === 'low' ? '15px' : intensity === 'medium' ? '20px' : '30px';

  return `0 0 ${size} ${color}${alpha}`;
};

/**
 * Get personality color based on AI agent type
 */
export const getPersonalityColor = (personality: string): string => {
  switch (personality.toLowerCase()) {
    case 'aggressive':
      return themeColors.enhancement;
    case 'defensive':
      return themeColors.emission;
    case 'balanced':
      return themeColors.neural;
    case 'tactical':
      return themeColors.manipulation;
    case 'unpredictable':
      return 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #6C5CE7)';
    default:
      return themeColors.neural;
  }
};

/**
 * Get piece symbol based on type with Nen styling
 */
export const getPieceSymbol = (type: string): string => {
  const symbols: Record<string, string> = {
    'Marshal': '♔',
    'General': '♕',
    'Lieutenant': '♖',
    'Major': '♗',
    'Minor': '♘',
    'Pawn': '♟',
    'Bow': '🏹',
    'Cannon': '💣',
    'Fort': '🏰',
  };
  return symbols[type] || '?';
};

/**
 * Get status color for matches and bets
 */
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'live':
    case 'active':
      return 'bg-enhancement-500 animate-pulse';
    case 'upcoming':
    case 'pending':
      return 'bg-yellow-500';
    case 'completed':
    case 'won':
      return 'bg-emission-500';
    case 'cancelled':
    case 'lost':
      return 'bg-gray-600';
    default:
      return 'bg-gray-500';
  }
};

/**
 * Get connection status indicator
 */
export const getConnectionStatus = (isConnected: boolean, latency?: number): {
  color: string;
  text: string;
  icon: string;
} => {
  if (!isConnected) {
    return {
      color: 'text-red-400',
      text: 'Disconnected',
      icon: '●',
    };
  }

  if (latency && latency > 100) {
    return {
      color: 'text-yellow-400',
      text: `${latency}ms`,
      icon: '●',
    };
  }

  return {
    color: 'text-emission-400',
    text: latency ? `${latency}ms` : 'Connected',
    icon: '●',
  };
};

/**
 * Generate neural pattern background
 */
export const getNeuralPattern = (): string => {
  return `
    background: linear-gradient(45deg, ${themeColors.neural}, ${themeColors.emission}, ${themeColors.manipulation});
    background-size: 400% 400%;
    animation: neural-flow 4s ease infinite;
  `;
};

/**
 * Get tier colors based on ELO rating
 */
export const getTierColor = (elo: number): { bg: string; text: string; name: string } => {
  if (elo >= 2000) {
    return {
      bg: 'bg-manipulation-500',
      text: 'text-manipulation-100',
      name: 'Master',
    };
  } else if (elo >= 1600) {
    return {
      bg: 'bg-emission-500',
      text: 'text-emission-100',
      name: 'Expert',
    };
  } else if (elo >= 1200) {
    return {
      bg: 'bg-enhancement-500',
      text: 'text-enhancement-100',
      name: 'Intermediate',
    };
  } else {
    return {
      bg: 'bg-gray-500',
      text: 'text-gray-100',
      name: 'Beginner',
    };
  }
};

/**
 * Generate glassmorphism CSS
 */
export const getGlassmorphism = (opacity: number = 0.25): string => {
  return `
    background: rgba(26, 31, 58, ${opacity});
    backdrop-filter: blur(10px);
    border: 1px solid rgba(78, 205, 196, 0.2);
  `;
};
