import { useQuery } from 'react-query';
import { Match } from '@/types/match';
import { transformMatch } from '@/utils/match-transformer';

// Demo match data for reliable demo experience
const DEMO_LIVE_MATCH: Match = {
  id: 'demo-live-1',
  status: 'live',
  agent1: { 
    id: 'netero_ai', 
    name: 'Chairman Netero', 
    elo: 2450, 
    nenType: 'enhancement',
    avatar: '/avatars/netero.png',
    winRate: 0.89,
    totalMatches: 234,
    personality: 'tactical',
    specialAbility: 'Hundred-Type Guanyin Bodhisattva',
    recentPerformance: { wins: 23, losses: 2, draws: 1, period: 'last_30_days' }
  },
  agent2: { 
    id: 'meruem_ai', 
    name: 'Meruem', 
    elo: 2680, 
    nenType: 'specialization',
    avatar: '/avatars/meruem.png',
    winRate: 0.94,
    totalMatches: 156,
    personality: 'aggressive',
    specialAbility: 'Metamorphosis',
    recentPerformance: { wins: 28, losses: 1, draws: 0, period: 'last_30_days' }
  },
  bettingPool: {
    totalPot: 45.7,
    agent1Pool: 18.34,
    agent2Pool: 27.36,
    totalBets: 347,
    odds: {
      agent1: 2.49,
      agent2: 1.67
    },
    myBets: [],
    recentBets: [
      { agent: 'agent1', amount: 0.5, odds: 2.49, timestamp: Date.now() - 30000 },
      { agent: 'agent2', amount: 1.2, odds: 1.67, timestamp: Date.now() - 45000 },
      { agent: 'agent1', amount: 0.8, odds: 2.51, timestamp: Date.now() - 60000 }
    ],
    minimumBet: 0.01,
    maximumBet: 10.0
  },
  gameState: {
    currentMove: 42,
    timeRemaining: {
      agent1: 420,
      agent2: 380
    },
    positions: {
      agent1: { x: 4, y: 2, pieces: [] },
      agent2: { x: 5, y: 7, pieces: [] }
    },
    lastMove: {
      from: { x: 3, y: 4 },
      to: { x: 4, y: 5 },
      piece: 'king',
      timestamp: Date.now() - 5000
    },
    moveHistory: [
      'Pawn e2-e4', 'Pawn e7-e5', 'Knight g1-f3', 'Knight b8-c6',
      'Bishop f1-c4', 'Bishop f8-c5', 'Pawn d2-d3', 'Pawn d7-d6',
      'Pawn c2-c3', 'Bishop c8-g4', 'Queen d1-b3', 'Knight g8-h6',
      'Rook h1-f1', 'Pawn f7-f5', 'Pawn e4-f5', 'Bishop g4-h5',
      'Pawn g2-g4', 'Bishop h5-g6', 'Knight b1-d2', 'Queen d8-h4',
      'Knight f3-h4', 'Rook h8-f8', 'Knight h4-g6', 'Pawn h7-g6',
      'Pawn f5-g6', 'Rook f8-f1+', 'King e1-e2', 'Rook f1-f2+',
      'King e2-d1', 'Bishop c5-f2', 'Bishop c1-e3', 'Queen h4-h1+',
      'King d1-e2', 'Queen h1-e4', 'Rook a1-f1', 'Rook f2-f1',
      'Bishop e3-f2', 'Rook f1-f2+', 'King e2-f2', 'Queen e4-d4+',
      'King f2-g3', 'Queen d4-g1+', 'King g3-h4', 'Knight c6-d4',
      'Queen b3-d3', 'Knight d4-e2', 'King h4-g5', 'Queen g1-g4+'
    ]
  },
  startTime: new Date(Date.now() - 900000),
  viewerCount: 347,
  magicBlockSessionId: 'mb_sess_live1_demo',
  metadata: {
    gameType: 'ranked',
    timeControl: '10+5',
    boardVariant: 'standard'
  },
  created: new Date(Date.now() - 1200000)
};

// Fetch a single match via Next.js API proxy to backend devnet endpoint
export const useMatch = (matchId: string) => {
  return useQuery<Match>(
    ['match', matchId],
    async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`);
        if (!res.ok) {
          throw new Error(`Failed to load match ${matchId}`);
        }
        const json = await res.json();
        const rawMatch = json?.data?.match || json?.data || json;
        if (!rawMatch || !rawMatch.id) {
          throw new Error('Invalid match response');
        }
        
        // Transform the raw match data to ensure proper format
        const transformedMatch = transformMatch(rawMatch);
        return transformedMatch;
      } catch (error) {
        // Fallback to demo data for live matches to ensure demo works
        if (matchId === 'live-match-1' || matchId === 'demo-live-1') {
          console.log('Using demo data for live match:', matchId);
          return DEMO_LIVE_MATCH;
        }
        throw error;
      }
    },
    {
      enabled: !!matchId,
      refetchInterval: 10000,
    }
  );
};