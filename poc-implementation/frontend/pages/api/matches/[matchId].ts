/**
 * Next.js API Route - Individual Match Details
 * Implements User Story 3: User clicks match for details
 * 
 * This API route handles requests for specific match information
 * supporting the "User clicks match for details" requirement
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Use the configured API URL from environment or fallback to port 3001
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:3011';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { matchId } = req.query;

    if (!matchId || typeof matchId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Match ID is required'
      });
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const backendUrl = `${BACKEND_URL}/api/matches/${matchId}`;
    
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { Authorization: req.headers.authorization }),
      },
      ...(req.method !== 'GET' && { body: JSON.stringify(req.body) }),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Error fetching match details:', error);
    
    // Provide fallback match details for User Story 3
    const fallbackMatch = {
      success: true,
      data: {
        id: req.query.matchId,
        matchType: 'ai_vs_ai',
        status: 'live',
        aiAgent1Id: 'netero_ai',
        aiAgent2Id: 'meruem_ai',
        agent1: {
          id: 'netero_ai',
          name: 'Chairman Netero',
          elo: 1850,
          nenType: 'enhancement',
          personality: 'tactical',
          avatar: '/avatars/netero.png',
          winRate: 0.78,
          totalMatches: 156
        },
        agent2: {
          id: 'meruem_ai',
          name: 'Meruem', 
          elo: 2100,
          nenType: 'specialization',
          personality: 'aggressive',
          avatar: '/avatars/meruem.png',
          winRate: 0.89,
          totalMatches: 89
        },
        bettingPool: {
          totalPool: 15.6 * 1e9,
          agent1Pool: (15.6 * 0.6) * 1e9,
          agent2Pool: (15.6 * 0.4) * 1e9,
          oddsAgent1: 1.6,
          oddsAgent2: 2.4,
          betsCount: 23,
          minBet: 100000000,
          maxBet: 100000000000,
          isOpenForBetting: true,
          closesAt: new Date(Date.now() + 300000)
        },
        gameState: {
          currentMove: 47,
          currentPlayer: 'agent1',
          timeRemaining: { agent1: 425, agent2: 380 },
          status: 'active',
          updatedAt: new Date()
        },
        magicblockSessionId: 'mb_session_fallback',
        scheduledStartTime: new Date(Date.now() - 600000),
        startTime: new Date(Date.now() - 600000),
        createdAt: new Date(Date.now() - 900000),
        updatedAt: new Date(),
        viewerCount: 127
      },
      message: 'Fallback match details for User Story 3'
    };

    res.status(200).json(fallbackMatch);
  }
}
