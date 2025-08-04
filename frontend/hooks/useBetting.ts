// Betting hook for Solana integration with Anchor
import { useState, useEffect, useCallback } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { Bet, Match } from '@/types';

interface BettingData {
  pools: {
    total: number;
    agent1: number;
    agent2: number;
  };
  userBets: Bet[];
  odds: {
    agent1: number;
    agent2: number;
  };
  isLoading: boolean;
}

interface PlaceBetParams {
  matchId: string;
  agent: 1 | 2;
  amount: number; // in SOL
}

interface UseBettingHook extends BettingData {
  placeBet: (params: PlaceBetParams) => Promise<string>;
  claimWinnings: (betId: string) => Promise<string>;
  refetch: () => Promise<void>;
  error: string | null;
}

export const useBetting = (matchId: string): UseBettingHook => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const [data, setData] = useState<BettingData>({
    pools: { total: 0, agent1: 0, agent2: 0 },
    userBets: [],
    odds: { agent1: 2.0, agent2: 2.0 },
    isLoading: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Mock program getter (replace with actual Anchor program)
  const getProgram = useCallback(() => {
    // In real implementation, this would return the actual Anchor program
    // const program = new Program(IDL, programId, provider);
    // return program;
    return null;
  }, [wallet, connection]);

  // Calculate odds from pool sizes
  const calculateOdds = useCallback((pool1: number, pool2: number) => {
    const total = pool1 + pool2;
    if (total === 0) return { agent1: 2.0, agent2: 2.0 };

    return {
      agent1: Math.max(1.01, total / (pool1 || 1)),
      agent2: Math.max(1.01, total / (pool2 || 1)),
    };
  }, []);

  // Fetch betting data from blockchain
  const fetchBettingData = useCallback(async () => {
    if (!wallet || !matchId) return;

    setData(prev => ({ ...prev, isLoading: true }));
    setError(null);

    try {
      // Mock data - replace with actual blockchain calls
      const mockPools = {
        agent1: Math.random() * 100 * LAMPORTS_PER_SOL,
        agent2: Math.random() * 80 * LAMPORTS_PER_SOL,
        get total() { return this.agent1 + this.agent2; },
      };

      const mockUserBets: Bet[] = [
        {
          id: 'bet1',
          user: wallet.publicKey.toString(),
          matchId,
          agent: 1,
          amount: 0.5 * LAMPORTS_PER_SOL,
          odds: 2.1,
          status: 'active',
          potentialPayout: 1.05 * LAMPORTS_PER_SOL,
          placedAt: new Date(Date.now() - 3600000),
        },
      ];

      const odds = calculateOdds(mockPools.agent1, mockPools.agent2);

      setData(prev => ({
        ...prev,
        pools: mockPools,
        userBets: mockUserBets,
        odds,
        isLoading: false,
      }));

      /* Real implementation would be:
      const program = getProgram();
      if (!program) return;

      const matchPubkey = new PublicKey(matchId);
      const matchAccount = await program.account.match.fetch(matchPubkey);

      // Fetch user bets
      const userBetAccounts = await program.account.bet.all([
        {
          memcmp: {
            offset: 8, // Discriminator
            bytes: wallet.publicKey.toBase58(),
          },
        },
        {
          memcmp: {
            offset: 40, // User pubkey offset
            bytes: matchPubkey.toBase58(),
          },
        },
      ]);

      const userBets = userBetAccounts.map(account => ({
        id: account.publicKey.toString(),
        user: account.account.user.toString(),
        matchId: account.account.match.toString(),
        agent: account.account.agent,
        amount: account.account.amount,
        odds: account.account.odds,
        status: account.account.status,
        potentialPayout: account.account.potentialPayout,
        placedAt: new Date(account.account.placedAt * 1000),
      }));

      const pools = {
        agent1: matchAccount.poolAgent1,
        agent2: matchAccount.poolAgent2,
        total: matchAccount.poolAgent1 + matchAccount.poolAgent2,
      };

      const odds = calculateOdds(pools.agent1, pools.agent2);

      setData(prev => ({
        ...prev,
        pools,
        userBets,
        odds,
        isLoading: false,
      }));
      */

    } catch (err: any) {
      console.error('Error fetching betting data:', err);
      setError(err.message || 'Failed to fetch betting data');
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [wallet, matchId, calculateOdds, getProgram]);

  // Place a bet
  const placeBet = useCallback(async (params: PlaceBetParams): Promise<string> => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    const { matchId, agent, amount } = params;
    setError(null);

    try {
      // Mock transaction - replace with actual Solana transaction
      const mockSignature = 'mock_signature_' + Date.now();

      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update local state optimistically
      const newBet: Bet = {
        id: 'bet_' + Date.now(),
        user: wallet.publicKey.toString(),
        matchId,
        agent,
        amount: amount * LAMPORTS_PER_SOL,
        odds: agent === 1 ? data.odds.agent1 : data.odds.agent2,
        status: 'active',
        potentialPayout: amount * (agent === 1 ? data.odds.agent1 : data.odds.agent2) * LAMPORTS_PER_SOL,
        placedAt: new Date(),
      };

      setData(prev => ({
        ...prev,
        userBets: [...prev.userBets, newBet],
        pools: {
          ...prev.pools,
          [agent === 1 ? 'agent1' : 'agent2']: prev.pools[agent === 1 ? 'agent1' : 'agent2'] + (amount * LAMPORTS_PER_SOL),
          total: prev.pools.total + (amount * LAMPORTS_PER_SOL),
        },
      }));

      return mockSignature;

      /* Real implementation:
      const program = getProgram();
      if (!program) throw new Error('Program not available');

      const matchPubkey = new PublicKey(matchId);
      const betKeypair = Keypair.generate();

      const tx = await program.methods
        .placeBet(agent, new BN(amount * LAMPORTS_PER_SOL))
        .accounts({
          bet: betKeypair.publicKey,
          match: matchPubkey,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([betKeypair])
        .rpc();

      await fetchBettingData(); // Refresh data
      return tx;
      */

    } catch (err: any) {
      console.error('Error placing bet:', err);
      setError(err.message || 'Failed to place bet');
      throw err;
    }
  }, [wallet, data.odds, getProgram]);

  // Claim winnings
  const claimWinnings = useCallback(async (betId: string): Promise<string> => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    setError(null);

    try {
      // Mock implementation
      const mockSignature = 'claim_signature_' + Date.now();

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update bet status
      setData(prev => ({
        ...prev,
        userBets: prev.userBets.map(bet =>
          bet.id === betId ? { ...bet, status: 'won' as const, settledAt: new Date() } : bet
        ),
      }));

      return mockSignature;

      /* Real implementation:
      const program = getProgram();
      if (!program) throw new Error('Program not available');

      const betPubkey = new PublicKey(betId);

      const tx = await program.methods
        .claimWinnings()
        .accounts({
          bet: betPubkey,
          user: wallet.publicKey,
        })
        .rpc();

      await fetchBettingData();
      return tx;
      */

    } catch (err: any) {
      console.error('Error claiming winnings:', err);
      setError(err.message || 'Failed to claim winnings');
      throw err;
    }
  }, [wallet, getProgram]);

  // Initialize and setup polling
  useEffect(() => {
    if (matchId) {
      fetchBettingData();

      // Poll every 10 seconds for updates
      const interval = setInterval(fetchBettingData, 10000);
      return () => clearInterval(interval);
    }
  }, [matchId, fetchBettingData]);

  return {
    ...data,
    placeBet,
    claimWinnings,
    refetch: fetchBettingData,
    error,
  };
};
