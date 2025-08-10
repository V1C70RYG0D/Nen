import { Router, Request, Response } from 'express';
import { fetchActiveDevnetMatches } from '../services/devnet-match-registry';

const router = Router();

// GET /api/devnet/matches - Real devnet matches, odds, agent metadata, pools
router.get('/matches', async (req: Request, res: Response) => {
  try {
    const matches = await fetchActiveDevnetMatches();
    res.json({
      success: true,
      data: matches,
      count: matches.length,
      message: 'Fetched real devnet matches, odds, agent metadata, pools.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fetch devnet matches.'
    });
  }
});

// GET /api/devnet/matches/:id - Single devnet match by ID
router.get('/matches/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const matches = await fetchActiveDevnetMatches();
    const match = matches.find(m => m.id === id);
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }
    return res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fetch devnet match.'
    });
  }
});

export default router;
