import { useQuery } from 'react-query';
import { Match } from '@/types/match';

// Fetch a single match via Next.js API proxy to backend devnet endpoint
export const useMatch = (matchId: string) => {
  return useQuery<Match>(
    ['match', matchId],
    async () => {
      const res = await fetch(`/api/matches/${matchId}`);
      if (!res.ok) {
        throw new Error(`Failed to load match ${matchId}`);
      }
      const json = await res.json();
      const match: Match = json?.data?.match || json?.data || json;
      if (!match || !match.id) {
        throw new Error('Invalid match response');
      }
      return match;
    },
    {
      enabled: !!matchId,
      refetchInterval: 10000,
    }
  );
};