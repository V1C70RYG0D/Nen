/**
 * Next.js API Route - Matches Proxy
 * Implements User Story 3: User views upcoming AI matches
 * 
 * This API route proxies requests to the backend matches API
 * ensuring proper data flow for User Story 3 requirements:
 * - User navigates to matches page
 * - User sees list of scheduled matches  
 * - User filters by bet range or AI rating
 * - User clicks match for details
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { transformMatches } from '../../utils/match-transformer';

// Use the configured API URL from environment or fallback to port 3001 (correct backend port)
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:3001';

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Set CORS headers for frontend-backend communication
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Build query string for filtering as per User Story 3
    const queryParams = new URLSearchParams();

    // Status can be single or array
    const status = toArray(req.query.status as any);
    status?.forEach((s) => queryParams.append('status', s));

    // AI rating filters (support both minAiRating/maxAiRating and minRating/maxRating)
    const minAiRating = (req.query.minAiRating as string) || (req.query.minRating as string);
    const maxAiRating = (req.query.maxAiRating as string) || (req.query.maxRating as string);
    if (minAiRating) queryParams.set('minAiRating', String(minAiRating));
    if (maxAiRating) queryParams.set('maxAiRating', String(maxAiRating));

    // Bet range: UI sends lamports for minBetRange/maxBetRange via useMatches; convert to SOL for backend
    const minBetRange = req.query.minBetRange as string | undefined;
    const maxBetRange = req.query.maxBetRange as string | undefined;
    const minBetSol = minBetRange ? Number(minBetRange) / 1e9 : undefined;
    const maxBetSol = maxBetRange ? Number(maxBetRange) / 1e9 : undefined;
    const minBet = (req.query.minBet as string) || (minBetSol !== undefined ? String(minBetSol) : undefined);
    const maxBet = (req.query.maxBet as string) || (maxBetSol !== undefined ? String(maxBetSol) : undefined);
    if (minBet) queryParams.set('minBet', minBet);
    if (maxBet) queryParams.set('maxBet', maxBet);

    // Personality and Nen Types filters
    const personalities = toArray(req.query.personalities as any);
    personalities?.forEach((p) => queryParams.append('personality', p));
    const nenTypes = toArray(req.query.nenTypes as any);
    nenTypes?.forEach((t) => queryParams.append('nenType', t));

    // Search and sorting/pagination
    if (req.query.search) queryParams.set('search', String(req.query.search));
    if (req.query.sortBy) queryParams.set('sortBy', String(req.query.sortBy));
    if (req.query.sortOrder) queryParams.set('sortOrder', String(req.query.sortOrder));
    if (req.query.page) queryParams.set('page', String(req.query.page));
    if (req.query.limit) queryParams.set('limit', String(req.query.limit));

    const queryString = queryParams.toString();
    // Use standard matches endpoint
    const primaryUrl = `${BACKEND_URL}/api/matches${queryString ? `?${queryString}` : ''}`;
    const fallbackUrl = `${BACKEND_URL}/api/matches${queryString ? `?${queryString}` : ''}`;

    // Try primary (devnet) then fallback to generic matches if needed
    let data: any | null = null;
    try {
      const response = await fetch(primaryUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization && { Authorization: req.headers.authorization }),
        },
        ...(req.method !== 'GET' && { body: JSON.stringify(req.body) }),
      });
      if (response.ok) {
        data = await response.json();
      }
    } catch (_) {
      // ignore and try fallback
    }

    if (!data) {
      const response2 = await fetch(fallbackUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response2.ok) {
        throw new Error(`Backend responded with status: ${response2.status}`);
      }
      data = await response2.json();
    }

    // Normalize shape to { success, data: { matches, ... } }
    let matches = Array.isArray(data.data) ? data.data : data.data?.matches || [];

    // Apply additional filtering not handled by some backends (personalities, nenTypes, search)
    const personalitiesFilter = personalities && personalities.length > 0 ? new Set(personalities) : null;
    const nenTypesFilter = nenTypes && nenTypes.length > 0 ? new Set(nenTypes) : null;
    const searchTerm = req.query.search ? String(req.query.search).toLowerCase() : '';
    if (personalitiesFilter || nenTypesFilter || searchTerm) {
      matches = matches.filter((m: any) => {
        const agent1 = m.agent1 || {};
        const agent2 = m.agent2 || {};
        if (personalitiesFilter) {
          const p1 = agent1.personality && String(agent1.personality).toLowerCase();
          const p2 = agent2.personality && String(agent2.personality).toLowerCase();
          if (!personalitiesFilter.has(p1) && !personalitiesFilter.has(p2)) return false;
        }
        if (nenTypesFilter) {
          const n1 = agent1.nenType && String(agent1.nenType).toLowerCase();
          const n2 = agent2.nenType && String(agent2.nenType).toLowerCase();
          if (!nenTypesFilter.has(n1) && !nenTypesFilter.has(n2)) return false;
        }
        if (searchTerm) {
          const a1 = (agent1.name || '').toLowerCase();
          const a2 = (agent2.name || '').toLowerCase();
          if (!a1.includes(searchTerm) && !a2.includes(searchTerm)) return false;
        }
        return true;
      });
    }
    
    // Transform matches to ensure complete data structure
    const transformedMatches = transformMatches(matches);
    
    res.status(200).json({
      success: true,
      data: {
        matches: transformedMatches,
        total: typeof data.data?.total === 'number' ? data.data.total : transformedMatches.length,
        page: parseInt((req.query.page as string) || String(data.data?.page || 1)),
        limit: parseInt((req.query.limit as string) || String(data.data?.limit || 50)),
        hasNext: Boolean(data.data?.hasNext || false),
        hasPrev: Boolean(data.data?.hasPrev || false)
      },
      count: transformedMatches.length,
      message: data.message || 'Devnet matches'
    });

  } catch (error) {
    console.error('Error proxying matches request:', error);
    res.status(502).json({ success: false, error: 'Failed to fetch matches from backend' });
  }
}
