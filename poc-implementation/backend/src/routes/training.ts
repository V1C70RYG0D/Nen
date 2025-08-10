import { Router } from 'express';
import { logger } from '../utils/logger';

// Use JS service to avoid TS build blockers for now; project is already running via temp-server
// eslint-disable-next-line @typescript-eslint/no-var-requires
const devnet = require('../services/training-devnet.js');

const router = Router();

// Validation helper
function badRequest(res: any, message: string, details?: any) {
  return res.status(400).json({ success: false, error: message, details });
}

// POST /api/v1/training/sessions
router.post('/sessions', async (req, res) => {
  const startedAt = Date.now();
  try {
    const { walletPubkey, agentMint, params, cid, file } = req.body || {};

    if (!walletPubkey || !agentMint) {
      return badRequest(res, 'walletPubkey and agentMint are required');
    }

    const connection = devnet.getConnection();

    // Ownership check (Metaplex not strictly required for basic SPL ownership)
    const owns = await devnet.verifyNftOwnership(connection, walletPubkey, agentMint);
    if (!owns) {
      return res.status(403).json({ success: false, error: 'Wallet does not own agent NFT on devnet' });
    }

    // IPFS handling
    let finalCid = cid;
    if (!finalCid && file?.name && file?.base64) {
      const pin = await devnet.pinToIpfsIfConfigured(file.name, file.base64);
      if (pin.pinned) finalCid = pin.cid;
    }

    if (!finalCid) {
      return badRequest(res, 'IPFS CID missing and no file provided/pinned');
    }

    // Optional: validate CID availability (non-fatal)
    try { await devnet.validateCidAvailability(finalCid); } catch (_) {}

    // Validate $NEN staking for priority (User Story 7 Requirement 5)
    const stakeValidation = await devnet.validateNENStakeForPriority(walletPubkey);
    
    logger.info('NEN stake validation', {
      wallet: walletPubkey,
      hasMinimumStake: stakeValidation.hasMinimumStake,
      stakedAmount: stakeValidation.stakedAmount,
      priority: stakeValidation.priority,
      reason: stakeValidation.reason
    });

    const sessionId = devnet.uuidv4();

    // Get training queue position based on stake
    const queuePosition = await devnet.getTrainingQueuePosition(walletPubkey, sessionId);

    // Record on-chain reference via Memo (real signature)
    const payer = devnet.loadServiceKeypair();
    const memoPayload = {
      kind: 'training_session_initiated',
      sessionId,
      walletPubkey,
      agentMint,
      cid: finalCid,
      params: params || {},
      priority: stakeValidation.priority,
      stakedAmount: stakeValidation.stakedAmount,
      queuePosition: queuePosition.queuePosition,
      ts: new Date().toISOString()
    };
    const signature = await devnet.sendMemoWithSession(connection, payer, memoPayload);

    const sessionRecord = {
      sessionId,
      walletPubkey,
      agentMint,
      cid: finalCid,
      params: params || {},
      status: 'initiated',
      priority: stakeValidation.priority,
      stakedAmount: stakeValidation.stakedAmount,
      queuePosition: queuePosition.queuePosition,
      estimatedWaitTime: queuePosition.estimatedWaitTime,
      stakeValidation,
      tx: signature,
      explorer: devnet.explorerTx(signature),
      createdAt: new Date().toISOString()
    };

    devnet.saveSession(sessionRecord);

    logger.info('Training session initiated', {
      endpoint: '/api/v1/training/sessions',
      wallet: walletPubkey,
      agent: agentMint,
      sessionId,
      tx: signature
    });

    res.json({ success: true, ...sessionRecord });
  } catch (error: any) {
    logger.apiError('/api/v1/training/sessions', error, { durationMs: Date.now() - startedAt });
    res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// GET /api/v1/training/sessions/:id
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = devnet.getSession(id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, session });
  } catch (error: any) {
    logger.apiError('/api/v1/training/sessions/:id', error);
    res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// GET /api/v1/training/nen-status
router.get('/nen-status', async (req, res) => {
  try {
    const deployment = await devnet.checkNENTokenDeployment();
    res.json({ 
      success: true, 
      nenToken: deployment,
      stakingEnabled: deployment.deployed
    });
  } catch (error: any) {
    logger.apiError('/api/v1/training/nen-status', error);
    res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

// POST /api/v1/training/validate-stake
router.post('/validate-stake', async (req, res) => {
  try {
    const { walletPubkey } = req.body;
    
    if (!walletPubkey) {
      return badRequest(res, 'walletPubkey is required');
    }

    const stakeValidation = await devnet.validateNENStakeForPriority(walletPubkey);
    const queuePosition = await devnet.getTrainingQueuePosition(walletPubkey, 'preview');
    
    res.json({ 
      success: true, 
      stakeValidation,
      queuePosition: {
        priority: queuePosition.priority,
        estimatedWaitTime: queuePosition.estimatedWaitTime
      }
    });
  } catch (error: any) {
    logger.apiError('/api/v1/training/validate-stake', error);
    res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
});

export default router;
