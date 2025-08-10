import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

// Load JS service via require to avoid TS type config changes
// eslint-disable-next-line @typescript-eslint/no-var-requires
const devnetRegistry = require('../services/devnet-match-registry.js');

const router = Router();

// GET /devnet/matches - real on-chain backed list via memos
router.get('/matches', async (_req: Request, res: Response) => {
  try {
    const items = await devnetRegistry.fetchActiveDevnetMatches();
    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    logger.error('devnet matches error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch devnet matches', message: (error as Error).message });
  }
});

export default router;
