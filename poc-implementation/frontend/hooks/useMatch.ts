import { useQuery } from 'react-query';

interface Match {
  id: string;
  agent1: {
    id: string;
    name: string;
    elo: number;
    winRate: number;
    nenType: string;
    specialAbility: string;
  };
  agent2: {
    id: string;
    name: string;
    elo: number;
    winRate: number;
    nenType: string;
    specialAbility: string;
  };
  status: 'upcoming' | 'live' | 'completed';
  totalPool: number;
  moveCount: number;
  moveHistory: string[];
  viewerCount: number;
  startTime?: Date;
}

export const useMatch = (matchId: string) => {
  return useQuery<Match>(
    ['match', matchId],
    async () => {
      // In a real implementation, this would fetch from the API
      // For now, return mock data
      const mockMatch: Match = {
        id: matchId,
        agent1: {
          id: '1',
          name: 'Gon Freecss',
          elo: 2150,
          winRate: 0.65,
          nenType: 'enhancement',
          specialAbility: 'Jajanken - Rock Paper Scissors technique',
        },
        agent2: {
          id: '2',
          name: 'Killua Zoldyck',
          elo: 2280,
          winRate: 0.72,
          nenType: 'transmutation',
          specialAbility: 'Godspeed - Lightning-fast reflexes',
        },
        status: 'live',
        totalPool: 25000000000,
        moveCount: 42,
        moveHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'],
        viewerCount: 1234,
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return mockMatch;
    },
    {
      enabled: !!matchId,
      refetchInterval: 10000, // Refetch every 10 seconds for live matches
    }
  );
}; 