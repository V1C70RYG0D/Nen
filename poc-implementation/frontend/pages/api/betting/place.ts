/**
 * Next.js API Route - Place Bet
 * Implements demo betting functionality for live matches
 */

import { NextApiRequest, NextApiResponse } from 'next';

interface PlaceBetRequest {
  matchId: string;
  agentId: string;
  amount: number;
  walletAddress: string;
}

interface PlaceBetResponse {
  success: boolean;
  data?: {
    betId: string;
    odds: number;
    potential_payout: number;
    transaction_id: string;
  };
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<PlaceBetResponse>) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { matchId, agentId, amount, walletAddress }: PlaceBetRequest = req.body;

    // Validate input
    if (!matchId || !agentId || !amount || !walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: matchId, agentId, amount, walletAddress' 
      });
    }

    if (amount < 0.01 || amount > 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bet amount must be between 0.01 and 10 SOL' 
      });
    }

    // Demo betting for demo live matches
    if (matchId === 'live-match-1' || matchId === 'demo-live-1') {
      // Generate demo odds based on agent
      const odds = agentId === 'netero_ai' ? 2.49 : 1.67;
      const potential_payout = amount * odds;
      
      // Generate demo response
      const betData = {
        betId: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        odds,
        potential_payout: Math.round(potential_payout * 100) / 100,
        transaction_id: `demo_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      console.log(`Demo bet placed: ${amount} SOL on ${agentId} for match ${matchId}`);

      return res.status(200).json({
        success: true,
        data: betData
      });
    }

    // For other matches, return not found
    return res.status(404).json({
      success: false,
      error: `Match ${matchId} not available for betting`
    });

  } catch (error) {
    console.error('Error placing bet:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while placing bet'
    });
  }
}
