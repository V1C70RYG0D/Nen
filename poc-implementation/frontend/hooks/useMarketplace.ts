import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAnchorWallet } from '@solana/wallet-adapter-react';

interface AIAgent {
  id: string;
  name: string;
  owner: string;
  elo: number;
  winRate: number;
  gamesPlayed: number;
  price?: number;
  personality: string;
  isForSale?: boolean;
  nenType: string;
  specialAbilities: string[];
  generation: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const useMarketplace = () => {
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  // Fetch agents
  const { data: agents, isLoading } = useQuery<AIAgent[]>('marketplace-agents', async () => {
    // In a real implementation, this would fetch from the API
    const mockAgents: AIAgent[] = [
      {
        id: '1',
        name: 'Shadow Hunter X',
        owner: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        elo: 2450,
        winRate: 0.78,
        gamesPlayed: 234,
        price: 5000000000,
        personality: 'Aggressive',
        isForSale: true,
        nenType: 'enhancement',
        specialAbilities: ['Power Strike', 'Rage Mode', 'Counter Attack'],
        generation: 3,
        rarity: 'legendary',
      },
      {
        id: '2',
        name: 'Mind Weaver',
        owner: '8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        elo: 2280,
        winRate: 0.65,
        gamesPlayed: 156,
        price: 3000000000,
        personality: 'Strategic',
        isForSale: true,
        nenType: 'manipulation',
        specialAbilities: ['Mind Control', 'Illusion', 'Puppet Master'],
        generation: 2,
        rarity: 'epic',
      },
      {
        id: '3',
        name: 'Lightning Bolt',
        owner: '7WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        elo: 2150,
        winRate: 0.58,
        gamesPlayed: 89,
        personality: 'Speedster',
        isForSale: false,
        nenType: 'transmutation',
        specialAbilities: ['Lightning Speed', 'Thunder Strike'],
        generation: 1,
        rarity: 'rare',
      },
      {
        id: '4',
        name: 'Phantom Sniper',
        owner: '6WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        elo: 2350,
        winRate: 0.72,
        gamesPlayed: 312,
        price: 8000000000,
        personality: 'Precision',
        isForSale: true,
        nenType: 'emission',
        specialAbilities: ['Long Range', 'Perfect Shot', 'Homing Missile', 'Explosive Round'],
        generation: 4,
        rarity: 'legendary',
      },
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return mockAgents;
  });

  // Buy agent mutation
  const buyAgentMutation = useMutation(
    async (agentId: string) => {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      // In a real implementation, this would call the smart contract
      console.log('Buying agent:', agentId);

      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      return { success: true, txId: 'mock-tx-id' };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('marketplace-agents');
      }
    }
  );

  const buyAgent = useCallback(
    (agentId: string) => {
      return buyAgentMutation.mutateAsync(agentId);
    },
    [buyAgentMutation]
  );

  return {
    agents: agents || [],
    isLoading,
    buyAgent,
  };
}; 