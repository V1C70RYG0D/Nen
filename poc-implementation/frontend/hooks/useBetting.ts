import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useBettingProd } from './useBettingProd';
import { apiClient } from '@/lib/api-client';
import { endpoints } from '@/lib/api-config';

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
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const { placeBet: placeBetProd } = useBettingProd();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3011';
  
  // Fetch betting data
  const { data: bettingData, isLoading, refetch } = useQuery<BettingData>(
    ['betting', matchId],
    async () => {
      if (!matchId) {
        return {
          pools: { total: 0, agent1: 0, agent2: 0 },
          userBets: []
        };
      }

      try {
        // First try to get betting pool data from the backend
        const res = await fetch(`${apiBase}${endpoints.betting.pools(matchId)}`);
        const json = await res.json();
        
        console.log('Betting API Response:', { res: res.ok, status: res.status, data: json });
        
        if (res.ok && json.success && json.data) {
          const poolsLamports = {
            total: json.data.totalPool as number,
            agent1: json.data.agent1Pool as number,
            agent2: json.data.agent2Pool as number,
          };
          console.log('Using betting pools data:', poolsLamports);
          // Also fetch user bets if wallet is connected
          let userBets: BettingData['userBets'] = [];
          try {
            if (wallet.publicKey) {
              const betsRes = await apiClient.get(endpoints.betting.getBets(wallet.publicKey.toBase58()));
              const raw = (betsRes as any)?.data || (betsRes as any);
              userBets = Array.isArray(raw) ? raw.map((b: any) => ({
                id: b.id,
                agent: (b.agent === 1 || b.agent === 2) ? b.agent : (b.agentId === 1 || b.agentId === 2 ? b.agentId : 1),
                amount: Number(b.amount ?? 0),
                status: (b.status as any) || 'active'
              })) : [];
            }
          } catch {}
          return {
            pools: poolsLamports,
            userBets,
          };
        }
        
        // Fallback: try to get match data and use its betting pool info
        const matchRes = await fetch(`${apiBase}/api/matches/${matchId}`);
        const matchJson = await matchRes.json();
        
        console.log('Match API Response:', { res: matchRes.ok, status: matchRes.status, data: matchJson });
        
        if (matchRes.ok && matchJson.success && matchJson.data?.bettingPool) {
          const pool = matchJson.data.bettingPool;
          const poolsFromMatch = {
            total: pool.totalPool || 0,
            agent1: pool.agent1Pool || 0,
            agent2: pool.agent2Pool || 0,
          };
          console.log('Using match betting pool data:', poolsFromMatch);
          // Also fetch user bets if wallet is connected
          let userBets: BettingData['userBets'] = [];
          try {
            if (wallet.publicKey) {
              const betsRes = await apiClient.get(endpoints.betting.getBets(wallet.publicKey.toBase58()));
              const raw = (betsRes as any)?.data || (betsRes as any);
              userBets = Array.isArray(raw) ? raw.map((b: any) => ({
                id: b.id,
                agent: (b.agent === 1 || b.agent === 2) ? b.agent : (b.agentId === 1 || b.agentId === 2 ? b.agentId : 1),
                amount: Number(b.amount ?? 0),
                status: (b.status as any) || 'active'
              })) : [];
            }
          } catch {}
          return {
            pools: poolsFromMatch,
            userBets,
          };
        }
        
        // Final fallback: return demo data for live match or empty pools for others
        if (matchId === 'live-match-1' || matchId === 'demo-live-1') {
          console.log('Using demo betting pool data (fallback) for match:', matchId);
          return {
            pools: { 
              total: 45.7 * LAMPORTS_PER_SOL, 
              agent1: 18.34 * LAMPORTS_PER_SOL, 
              agent2: 27.36 * LAMPORTS_PER_SOL 
            },
            userBets: []
          };
        }
        
        console.warn('Could not load betting data for match:', matchId);
        return {
          pools: { total: 0, agent1: 0, agent2: 0 },
          userBets: []
        };
        
      } catch (error) {
        console.error('Error fetching betting data:', error);
        // Return fallback data instead of throwing
        // Fetch user bets alone to keep claim visibility even if pools fail
        let userBets: BettingData['userBets'] = [];
        try {
          if (wallet.publicKey) {
            const betsRes = await apiClient.get(endpoints.betting.getBets(wallet.publicKey.toBase58()));
            const raw = (betsRes as any)?.data || (betsRes as any);
            userBets = Array.isArray(raw) ? raw.map((b: any) => ({
              id: b.id,
              agent: (b.agent === 1 || b.agent === 2) ? b.agent : (b.agentId === 1 || b.agentId === 2 ? b.agentId : 1),
              amount: Number(b.amount ?? 0),
              status: (b.status as any) || 'active'
            })) : [];
          }
        } catch {}
        
        // Return demo data for live match
        if (matchId === 'live-match-1' || matchId === 'demo-live-1') {
          console.log('Using demo betting pool data for match:', matchId);
          return {
            pools: { 
              total: 45.7 * LAMPORTS_PER_SOL, 
              agent1: 18.34 * LAMPORTS_PER_SOL, 
              agent2: 27.36 * LAMPORTS_PER_SOL 
            },
            userBets
          };
        }
        
        return {
          pools: { total: 0, agent1: 0, agent2: 0 },
          userBets
        };
      }
    },
    {
      enabled: !!matchId,
      refetchInterval: 10000, // Refetch every 10 seconds
      retry: 1, // Only retry once to avoid infinite loops
    }
  );

  // Place bet mutation - supports both demo and production betting
  const placeBetMutation = useMutation(
    async (params: { matchId: string; agent: 1 | 2; amount: number }) => {
      if (!wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      // For demo matches, use the demo betting API
      if (params.matchId === 'live-match-1' || params.matchId === 'demo-live-1') {
        try {
          const agentId = params.agent === 1 ? 'netero_ai' : 'meruem_ai';
          const amountSol = params.amount / LAMPORTS_PER_SOL;
          
          const response = await fetch('/api/betting/place', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              matchId: params.matchId,
              agentId,
              amount: amountSol,
              walletAddress: wallet.publicKey.toBase58(),
            }),
          });

          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Failed to place demo bet');
          }

          return { 
            success: true, 
            txId: result.data.transaction_id,
            betId: result.data.betId,
            odds: result.data.odds,
            potentialPayout: result.data.potential_payout
          };
        } catch (error) {
          console.error('Error placing demo bet:', error);
          throw error;
        }
      }

      // For production matches, use Solana transactions
      try {
        const amountSol = params.amount / LAMPORTS_PER_SOL;
        const result = await placeBetProd({ matchId: params.matchId, agent: params.agent, amountSol });
        return { success: true, txId: result.signature };
      } catch (error) {
        console.error('Error placing production bet:', error);
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