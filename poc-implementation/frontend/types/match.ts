/**
 * Type definitions for match-related data structures
 * Based on User Story 3 requirements from Solution 2.md
 */

// Core agent interface
export interface Agent {
  id: string;
  name: string;
  elo: number;
  avatar?: string;
  nenType: 'enhancement' | 'emission' | 'transmutation' | 'conjuration' | 'manipulation' | 'specialization';
  personality?: 'aggressive' | 'defensive' | 'tactical' | 'unpredictable';
  winRate?: number;
  totalMatches?: number;
  recentPerformance?: {
    wins: number;
    losses: number;
    draws: number;
    period: 'last_7_days' | 'last_30_days';
  };
  trainingLevel?: number;
  marketValue?: number; // in SOL
  isAvailable?: boolean;
  isNFT?: boolean;
  nftMintAddress?: string;
  owner?: string;
  createdAt?: string;
  lastActive?: string;
}

// Match status types
export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'cancelled' | 'paused';

// Betting pool information
export interface BettingPool {
  totalPool: number; // in lamports
  agent1Pool: number; // bets on agent 1
  agent2Pool: number; // bets on agent 2
  oddsAgent1: number;
  oddsAgent2: number;
  betsCount: number;
  minBet: number; // in lamports
  maxBet: number; // in lamports
  isOpenForBetting: boolean;
  closesAt?: Date;
}

// Game state for live matches
export interface GameState {
  currentMove: number;
  currentPlayer: 'agent1' | 'agent2';
  timeRemaining: {
    agent1: number; // seconds
    agent2: number; // seconds
  };
  lastMoveAt?: Date;
  boardState?: any; // Will be defined when implementing game logic
  moveHistory?: any[]; // Will be defined when implementing game logic
}

// Match result information
export interface MatchResult {
  winner?: 1 | 2 | null; // null for draw
  winnerType?: 'checkmate' | 'timeout' | 'resignation' | 'draw';
  finalScore?: {
    agent1: number;
    agent2: number;
  };
  gameLength: number; // number of moves
  duration: number; // match duration in seconds
  payouts?: {
    totalPaid: number;
    winnersCount: number;
    avgPayout: number;
  };
}

// Core match interface
export interface Match {
  id: string;
  agent1: Agent;
  agent2: Agent;
  status: MatchStatus;
  bettingPool: BettingPool;
  gameState?: GameState;
  result?: MatchResult;
  startTime?: Date;
  endTime?: Date;
  scheduledStartTime?: Date;
  viewerCount?: number;
  spectators?: number;
  magicBlockSessionId?: string;
  rollupAddress?: string;
  settledOnMainnet?: boolean;
  metadata?: {
    tournament?: string;
    round?: number;
    gameType: 'ranked' | 'casual' | 'tournament';
    timeControl: string; // e.g., "10+5"
    boardVariant: 'standard' | 'mini' | 'custom';
  };
  created?: Date;
  createdBy?: string;
}

// Match list with metadata
export interface MatchListResponse {
  matches: Match[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  filters?: MatchFilters;
}

// Filters for match queries
export interface MatchFilters {
  status?: MatchStatus[];
  minBetRange?: number; // in SOL
  maxBetRange?: number; // in SOL
  minAiRating?: number;
  maxAiRating?: number;
  nenTypes?: string[];
  gameTypes?: string[];
  timeControls?: string[];
  sortBy?: 'startTime' | 'totalPool' | 'rating' | 'viewerCount' | 'created';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string; // search in agent names
}

// Live match update via WebSocket
export interface MatchUpdate {
  matchId: string;
  type: 'move' | 'status_change' | 'betting_update' | 'viewer_count' | 'time_update';
  data: {
    move?: any;
    status?: MatchStatus;
    bettingPool?: Partial<BettingPool>;
    viewerCount?: number;
    timeRemaining?: GameState['timeRemaining'];
    gameState?: Partial<GameState>;
  };
  timestamp: Date;
}

// User's betting history for a match
export interface UserBet {
  id: string;
  matchId: string;
  userId: string;
  walletAddress: string;
  agentChoice: 1 | 2;
  amount: number; // in lamports
  odds: number;
  potentialPayout: number; // in lamports
  status: 'pending' | 'won' | 'lost' | 'cancelled' | 'refunded';
  placedAt: Date;
  settledAt?: Date;
  transactionSignature?: string;
  payout?: number; // actual payout in lamports
  payoutTransactionSignature?: string;
}

// Enhanced match for display with user context
export interface EnhancedMatch extends Match {
  userBets?: UserBet[];
  userTotalBet?: number;
  userPotentialPayout?: number;
  isUserWatching?: boolean;
  recommendationScore?: number; // AI-generated recommendation
  priceHistory?: {
    timestamp: Date;
    oddsAgent1: number;
    oddsAgent2: number;
  }[];
}

// Match statistics for analytics
export interface MatchStats {
  totalMatches: number;
  liveMatches: number;
  upcomingMatches: number;
  completedToday: number;
  totalVolume24h: number; // in SOL
  averageMatchDuration: number; // in seconds
  mostPopularNenTypes: Array<{
    type: string;
    count: number;
    winRate: number;
  }>;
  topAgents: Array<{
    agent: Agent;
    winRate: number;
    totalVolume: number;
  }>;
}

// Error types specific to match operations
export interface MatchError {
  code: 'MATCH_NOT_FOUND' | 'MATCH_ENDED' | 'BETTING_CLOSED' | 'INVALID_AGENT' | 
        'INSUFFICIENT_BALANCE' | 'MATCH_CANCELLED' | 'SESSION_EXPIRED' | 'RATE_LIMITED';
  message: string;
  details?: any;
}

// WebSocket event types
export type MatchWebSocketEvent = 
  | { type: 'match_update'; data: MatchUpdate }
  | { type: 'new_match'; data: Match }
  | { type: 'match_ended'; data: { matchId: string; result: MatchResult } }
  | { type: 'betting_closed'; data: { matchId: string } }
  | { type: 'viewer_joined'; data: { matchId: string; viewerCount: number } }
  | { type: 'viewer_left'; data: { matchId: string; viewerCount: number } }
  | { type: 'error'; data: MatchError };

// Real-time match feed configuration
export interface MatchFeedConfig {
  autoRefresh: boolean;
  refreshInterval: number; // milliseconds
  enableWebSocket: boolean;
  maxConcurrentConnections: number;
  enableNotifications: boolean;
  notificationTypes: Array<'new_match' | 'match_started' | 'match_ended' | 'betting_closed'>;
}

// Match creation request
export interface CreateMatchRequest {
  agent1Id: string;
  agent2Id: string;
  gameType: 'ranked' | 'casual' | 'tournament';
  timeControl: string;
  boardVariant?: 'standard' | 'mini' | 'custom';
  bettingEnabled?: boolean;
  minBet?: number; // in SOL
  maxBet?: number; // in SOL
  scheduledStartTime?: Date;
  isPrivate?: boolean;
  tournamentId?: string;
  metadata?: Record<string, any>;
}

// Utility types for state management
export interface MatchesState {
  matches: Match[];
  loading: boolean;
  error: string | null;
  filters: MatchFilters;
  hasMore: boolean;
  lastUpdated: Date | null;
  selectedMatch: Match | null;
  userBets: Record<string, UserBet[]>; // matchId -> bets
  webSocketConnected: boolean;
  refreshing: boolean;
}

export interface MatchesActions {
  loadMatches: (filters?: MatchFilters) => Promise<void>;
  loadMoreMatches: () => Promise<void>;
  refreshMatches: () => Promise<void>;
  setFilters: (filters: Partial<MatchFilters>) => void;
  selectMatch: (match: Match | null) => void;
  subscribeToMatch: (matchId: string) => void;
  unsubscribeFromMatch: (matchId: string) => void;
  placeBet: (matchId: string, agentChoice: 1 | 2, amount: number) => Promise<UserBet>;
  clearError: () => void;
}

// Component prop types
export interface MatchCardProps {
  match: Match;
  showBettingOptions?: boolean;
  compact?: boolean;
  onMatchClick?: (match: Match) => void;
  onBetClick?: (match: Match, agent: 1 | 2) => void;
  userBets?: UserBet[];
  className?: string;
}

export interface MatchListProps {
  filters?: MatchFilters;
  showFilters?: boolean;
  enableInfiniteScroll?: boolean;
  enableRealTimeUpdates?: boolean;
  onMatchSelect?: (match: Match) => void;
  onError?: (error: string) => void;
  className?: string;
  emptyStateMessage?: string;
  loadingComponent?: React.ComponentType;
  errorComponent?: React.ComponentType<{ error: string; onRetry: () => void }>;
}

export interface MatchFilterProps {
  filters: MatchFilters;
  onFiltersChange: (filters: Partial<MatchFilters>) => void;
  availableNenTypes?: string[];
  availableTimeControls?: string[];
  onReset?: () => void;
  className?: string;
}
