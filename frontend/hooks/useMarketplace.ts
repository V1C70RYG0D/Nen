import { useState, useEffect, useCallback } from 'react';
import type { MarketplaceListing } from '@/types';

interface UseMarketplaceHook {
  listings: MarketplaceListing[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useMarketplace = (): UseMarketplaceHook => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketplaceData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock API call
      const response = await Promise.resolve({
        data: [
          {
            id: '1',
            agent: {
              id: 'agent-1',
              name: 'Agent Alpha',
              owner: 'owner-1',
              elo: 1500,
              winRate: 0.65,
              gamesPlayed: 42,
              totalWinnings: 1250,
              personality: 'Aggressive' as const,
              avatar: '🤖',
              isForSale: true,
              price: 100,
              traits: {
                strategy: 85,
                adaptability: 70,
                aggression: 92,
                patience: 35,
                creativity: 78
              }
            },
            seller: 'seller-1',
            price: 100,
            listedAt: new Date(),
            status: 'active' as const,
          },
        ],
      });

      setListings(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketplaceData();
  }, [fetchMarketplaceData]);

  return {
    listings,
    isLoading,
    error,
    refetch: fetchMarketplaceData,
  };
};

