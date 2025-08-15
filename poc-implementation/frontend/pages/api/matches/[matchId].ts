/**
 * Next.js API Route - Individual Match Details
 * Implements User Story 3: User clicks match for details
 * 
 * This API route handles requests for specific match information
 * supporting the "User clicks match for details" requirement
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { transformMatch } from '../../../utils/match-transformer';

// Use the configured API URL from environment or fallback to port 3001
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:3001';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { matchId } = req.query;

    if (!matchId || typeof matchId !== 'string') {
      return res.status(400).json({ success: false, error: 'Match ID is required' });
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Use standard matches route instead of devnet-specific route
    const backendUrl = `${BACKEND_URL}/api/matches/${matchId}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    const rawMatch = data.data?.id ? data.data : data.data?.match || data;
    
    // Transform the match data to ensure complete structure
    const transformedMatch = transformMatch(rawMatch);
    
    res.status(200).json({ success: true, data: { match: transformedMatch } });
  } catch (error) {
    console.error('Error fetching match details:', error);
    res.status(502).json({ success: false, error: 'Failed to fetch match details from backend' });
  }
}
