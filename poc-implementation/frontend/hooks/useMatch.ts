import { useQuery } from 'react-query';
import { Match } from '@/types/match';
import { transformMatch } from '@/utils/match-transformer';

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
      const rawMatch = json?.data?.match || json?.data || json;
      if (!rawMatch || !rawMatch.id) {
        throw new Error('Invalid match response');
      }
      
      // Transform the raw match data to ensure proper format
      const transformedMatch = transformMatch(rawMatch);
      return transformedMatch;
    },
    {
      enabled: !!matchId,
      refetchInterval: 10000,
    }
  );
};