import { useState, useEffect, useCallback } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { useQuery, useMutation, useQueryClient } from 'react-query';

interface BettingData {
  pools: {
    total: number;
    agent1: number;
    agent2: number;
  };
  userBets: Array<{
    id: string;
    agent: 1 | 2;
    amount: number;
    status: 'active' | 'won' | 'lost';
  }>;
}

export const useBetting = (matchId: string) => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();
  
  // Fetch betting data
  const { data: bettingData, isLoading, refetch } = useQuery<BettingData>(
    ['betting', matchId],
    async () => {
      if (!wallet || !matchId) {
        return {
          pools: { total: 0, agent1: 0, agent2: 0 },
          userBets: []
        };
      }

      try {
        // In a real implementation, this would fetch from the Solana program
        // For now, return mock data
        const mockData: BettingData = {
          pools: {
            total: 15000000000, // 15 SOL in lamports
            agent1: 8000000000,  // 8 SOL
            agent2: 7000000000,  // 7 SOL
          },
          userBets: wallet.publicKey ? [
            {
              id: '1',
              agent: 1,
              amount: 1000000000, // 1 SOL
              status: 'active',
            }
          ] : []
        };

        return mockData;
      } catch (error) {
        console.error('Error fetching betting data:', error);
        throw error;
      }
    },
    {
      enabled: !!wallet && !!matchId,
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  );

  // Place bet mutation
  const placeBetMutation = useMutation(
    async (params: { matchId: string; agent: 1 | 2; amount: number }) => {
      if (!wallet || !wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        // In a real implementation, this would call the Solana program
        console.log('Placing bet:', params);
        
        // Simulate transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return { success: true, txId: 'mock-tx-id' };
      } catch (error) {
        console.error('Error placing bet:', error);
        throw error;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['betting', matchId]);
      }
    }
  );

  const placeBet = useCallback(
    (params: { matchId: string; agent: 1 | 2; amount: number }) => {
      return placeBetMutation.mutateAsync(params);
    },
    [placeBetMutation]
  );

  return {
    pools: bettingData?.pools || { total: 0, agent1: 0, agent2: 0 },
    userBets: bettingData?.userBets || [],
    placeBet,
    isLoading: isLoading || placeBetMutation.isLoading,
    refetch,
  };
}; 