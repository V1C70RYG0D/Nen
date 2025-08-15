import { useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import ProductionSolanaBettingClient from '@/lib/production-solana-betting-client';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JSON import
import bettingIdl from '@/lib/idl/nen_betting.json';
import { apiClient } from '@/lib/api-client';
import { endpoints } from '@/lib/api-config';

type PlaceBetParams = {
  matchId: string;
  agent: 1 | 2;
  amountSol: number;
};

export function useBettingProd() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3011';
  const disableOnchain = (process.env.NEXT_PUBLIC_DISABLE_ONCHAIN || '').toLowerCase() === 'true';

  const placeBet = useCallback(async ({ matchId, agent, amountSol }: PlaceBetParams) => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      throw new Error('Wallet not connected');
    }

    if (amountSol < 0.1 || amountSol > 100) {
      throw new Error('Bet amount must be between 0.1 and 100 SOL');
    }

    // Off-chain fallback: call backend service to record bet without on-chain tx
    if (disableOnchain) {
      const res = await apiClient.post<{ betId: string }>(endpoints.betting.placeBet, {
        matchId,
        agentId: agent,
        amount: amountSol,
      });
      if (!res.success) {
        throw new Error(res.error || res.message || 'Failed to place bet');
      }
      const betId = (res.data as any)?.betId;
      return {
        signature: `offchain:${betId || 'bet'}`,
        explorer: '#',
        betId,
      } as any;
    }

    // Reserve funds in user's betting account PDA (lock)
    const client = new ProductionSolanaBettingClient();
    await client.initialize({
      publicKey,
      // The wallet adapter provides these on the same object in _app; we only need signTransaction
      signTransaction: signTransaction!,
      signAllTransactions: undefined as any,
    } as any, bettingIdl);
    // Ensure betting account exists and lock funds
    const acct = await client.getBettingAccount(publicKey);
    if (!acct) {
      throw new Error('Betting account not found. Please create and deposit first.');
    }
    await client.lockFunds(publicKey, amountSol);

    // Build unsigned tx from backend (transfer to match escrow)
    const buildRes = await fetch(`${apiBase}/api/bets/build-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, agentChoice: agent, amountSol, userPubkey: publicKey.toBase58() })
    });
    const buildJson = await buildRes.json();
    if (!buildRes.ok || !buildJson.success) {
      throw new Error(buildJson.error || 'Failed to build bet transaction');
    }

    const txBuf = Buffer.from(buildJson.transactionBase64, 'base64');
    const tx = Transaction.from(txBuf);

    // Send via wallet (let wallet pick recent blockhash if expired)
    const signature = await sendTransaction(tx, connection, { skipPreflight: false });
    // Confirm
    const conf = await connection.confirmTransaction(signature, 'confirmed');
    if (conf.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(conf.value.err)}`);
    }

    // Notify backend to index split for odds
    await fetch(`${apiBase}/api/bets/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, agentChoice: agent, amountSol, userPubkey: publicKey.toBase58(), signature })
    }).catch(() => {});

    return {
      signature,
      explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    };
  }, [apiBase, publicKey, signTransaction, sendTransaction, connection]);

  return { placeBet };
}
