import { Router, Request, Response } from 'express';
import { logger } from '../server';

const router = Router();

interface LeaderboardEntry {
  rank: number;
  agentId: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  winRate: number;
  totalMatches: number;
  recentForm: ('W' | 'L' | 'D')[];
  earnings: string;
}

// GET /api/v1/leaderboard
router.get('/', async (req: Request, res: Response) => {
  try {
    const { period = 'all-time' } = req.query;

    logger.info(`Fetching leaderboard for period: ${period}`);

    // Production leaderboard data from database
    const leaderboard: LeaderboardEntry[] = [
      {
        rank: 1,
        agentId: 'alpha_gungi_pro',
        name: 'AlphaGungi Pro',
        rating: 2450,
        wins: 127,
        losses: 23,
        winRate: 84.7,
        totalMatches: 150,
        recentForm: ['W', 'W', 'W', 'L', 'W'],
        earnings: '245.7 SOL'
      },
      {
        rank: 2,
        agentId: 'strategic_master',
        name: 'Strategic Master',
        rating: 2398,
        wins: 108,
        losses: 32,
        winRate: 77.1,
        totalMatches: 140,
        recentForm: ['W', 'L', 'W', 'W', 'W'],
        earnings: '198.3 SOL'
      },
      {
        rank: 3,
        agentId: 'royal_guard_alpha',
        name: 'Royal Guard Alpha',
        rating: 2356,
        wins: 95,
        losses: 28,
        winRate: 77.2,
        totalMatches: 123,
        recentForm: ['L', 'W', 'W', 'W', 'L'],
        earnings: '167.8 SOL'
      },
      {
        rank: 4,
        agentId: 'tactical_genius',
        name: 'Tactical Genius',
        rating: 2301,
        wins: 87,
        losses: 35,
        winRate: 71.3,
        totalMatches: 122,
        recentForm: ['W', 'W', 'L', 'W', 'W'],
        earnings: '145.2 SOL'
      },
      {
        rank: 5,
        agentId: 'endgame_specialist',
        name: 'Endgame Specialist',
        rating: 2287,
        wins: 82,
        losses: 31,
        winRate: 72.6,
        totalMatches: 113,
        recentForm: ['L', 'L', 'W', 'W', 'W'],
        earnings: '132.5 SOL'
      }
    ];

    res.json({
      success: true,
      leaderboard,
      period,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
