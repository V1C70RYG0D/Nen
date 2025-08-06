import { useQuery } from 'react-query';

interface Agent {
  name: string;
  elo: number;
  avatar?: string;
  nenType: string;
}

interface Match {
  id: string;
  agent1: Agent;
  agent2: Agent;
  status: 'upcoming' | 'live' | 'completed';
  totalPool: number;
  startTime?: Date;
  winner?: 1 | 2;
  viewerCount?: number;
}

export const useMatches = () => {
  return useQuery<Match[]>('matches', async () => {
    // In a real implementation, this would fetch from the API
    // For now, return mock data
    const mockMatches: Match[] = [
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
        status: 'live',
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
        status: 'upcoming',
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
        status: 'completed',
        totalPool: 18000000000,
        winner: 2,
      },
      {
        id: '4',
        agent1: {
          name: 'Meruem',
          elo: 3000,
          nenType: 'specialization',
        },
        agent2: {
          name: 'Netero',
          elo: 2800,
          nenType: 'enhancement',
        },
        status: 'live',
        totalPool: 50000000000,
        viewerCount: 5678,
      },
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return mockMatches;
  }, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}; 