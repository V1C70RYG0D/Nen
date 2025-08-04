// Core type definitions for Nen Platform

import { PublicKey } from '@solana/web3.js';

// Game Types
export interface GamePiece {
  id: string;
  type: PieceType;
  owner: 1 | 2;
  position: [number, number];
  stackLevel: number;
  canMove: boolean;
}

export type PieceType =
  | 'Marshal'
  | 'General'
  | 'Lieutenant'
  | 'Major'
  | 'Minor'
  | 'Pawn'
  | 'Bow'
  | 'Cannon'
  | 'Fort';

export interface BoardState {
  pieces: GamePiece[];
  currentPlayer: 1 | 2;
  moveCount: number;
  gamePhase: 'setup' | 'playing' | 'finished';
  lastMove?: Move;
}

export interface Move {
  from: [number, number];
  to: [number, number];
  piece: GamePiece;
  timestamp: number;
  player: 1 | 2;
  captured?: GamePiece;
}

// AI Agent Types
export interface AIAgent {
  id: string;
  name: string;
  owner: string;
  elo: number;
  winRate: number;
  gamesPlayed: number;
  personality: PersonalityType;
  avatar: string;
  isForSale: boolean;
  price?: number;
  nftMintAddress?: string;
  traits: AgentTraits;
}

// Platform Statistics
export interface Stats {
  activeMatches: number;
  totalPool: number; // lamports
  playersOnline: number;
  totalBets: number;
}

export type PersonalityType =
  | 'Aggressive'
  | 'Defensive'
  | 'Balanced'
  | 'Tactical'
  | 'Unpredictable';

export interface AgentTraits {
  strategy: number; // 1-100
  adaptability: number; // 1-100
  aggression: number; // 1-100
  patience: number; // 1-100
  creativity: number; // 1-100
}

// Match Types
export interface Match {
  id: string;
  agent1: AIAgent;
  agent2: AIAgent;
  status: MatchStatus;
  totalPool: number;
  pools: {
    agent1: number;
    agent2: number;
    total: number;
  };
  startTime?: Date;
  endTime?: Date;
  winner?: 1 | 2;
  currentGame?: string;
  viewers: number;
}

export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

// Betting Types
export interface Bet {
  id: string;
  user: string;
  matchId: string;
  agent: 1 | 2;
  amount: number;
  odds: number;
  status: BetStatus;
  potentialPayout: number;
  placedAt: Date;
  settledAt?: Date;
}

export type BetStatus = 'active' | 'won' | 'lost' | 'cancelled' | 'pending';

// MagicBlock Types
export interface MagicBlockSession {
  sessionId: string;
  matchId: string;
  isConnected: boolean;
  latency: number;
  playersConnected: number;
  lastUpdate: Date;
}

export interface MagicBlockMove {
  move: Move;
  signature: string;
  timestamp: number;
  validated: boolean;
}

// User Types
export interface UserProfile {
  publicKey: string;
  username?: string;
  avatar?: string;
  stats: UserStats;
  ownedAgents: string[];
  activeBets: Bet[];
  betHistory: Bet[];
  totalWinnings: number;
  totalLosses: number;
}

export interface UserStats {
  totalBets: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  biggestWin: number;
  currentStreak: number;
  bestStreak: number;
}

// Marketplace Types
export interface MarketplaceListing {
  id: string;
  agent: AIAgent;
  seller: string;
  price: number;
  listedAt: Date;
  expires?: Date;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
}

// WebSocket Types
export interface SocketEvent {
  type: SocketEventType;
  data: any;
  timestamp: number;
}

export type SocketEventType =
  | 'gameState'
  | 'move'
  | 'bet'
  | 'matchUpdate'
  | 'userJoined'
  | 'userLeft'
  | 'error';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Solana Transaction Types
export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Animation Types
export type AuraType = 'enhancement' | 'emission' | 'manipulation' | 'neural';

export interface AnimationConfig {
  duration: number;
  delay?: number;
  easing?: string;
  repeat?: boolean;
}

// Theme Types
export interface ThemeColors {
  enhancement: string;
  emission: string;
  manipulation: string;
  neural: string;
  solana: string;
  magicblock: string;
}

// Export utility type helpers
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & RequiredProps<Pick<T, K>>;
type RequiredProps<T> = {
  [K in keyof T]-?: T[K];
};
