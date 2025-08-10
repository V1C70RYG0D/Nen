/**
 * Integration test: replay filtering and memo payload contents
 */
const request = require('supertest');
const path = require('path');

// Load server
process.env.PORT = process.env.PORT || '0';
process.env.SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
process.env.ALLOW_DEMO_AGENTS = 'true';
process.env.NEN_CORE_IDL_PATH = process.env.NEN_CORE_IDL_PATH || path.join(process.cwd(), 'lib', 'idl', 'nen_core.json');
process.env.MAGICBLOCK_REPLAY_DB_FILE = process.env.MAGICBLOCK_REPLAY_DB_FILE || path.join(__dirname, '..', 'fixtures', 'magicblock-replay-database.test.json');

// In tests, bypass actual memo send by monkey patching training service
jest.mock('../../services/training-devnet.js', () => {
  const actual = jest.requireActual('../../services/training-devnet.js');
  return {
    ...actual,
    loadServiceKeypair: () => ({ publicKey: { toBase58: () => 'TestPayer' } }),
    sendMemoWithSession: async (_conn, _payer, memoObj) => {
      // Validate memo has selectedReplays and return fake signature
      if (!memoObj?.selectedReplays || !Array.isArray(memoObj.selectedReplays)) {
        throw new Error('Memo missing selectedReplays');
      }
      return 'TEST_SIGNATURE_111';
    },
    createTrainingSessionOnChain: async () => ({ sessionPda: 'TestSessionPDA111' }),
    explorerTx: (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
  verifyNftOwnership: async () => true,
  validateNENStakeForPriority: async () => ({ validated: true, hasMinimumStake: false, stakedAmount: 0, priority: 'normal', reason: 'test' }),
  getTrainingQueuePosition: async (_wallet, sessionId) => ({ sessionId, priority: 'normal', queuePosition: 1, estimatedWaitTime: 1 })
  };
});

const { app, httpServer } = require('../../temp-server');

describe('Replay Training API', () => {
  afterAll((done) => {
    try { httpServer.close(done); } catch (_) { done(); }
  });

  it('lists match replays and creates a session with memo containing selectedReplays', async () => {
    const agentMint = 'DemoAgentMint1111111111111111111111111111111';
    const walletAddress = 'DemoWallet111111111111111111111111111111111';

    // List replays (from local DB fallback)
    const listRes = await request(app)
      .get('/api/training/match-replays')
      .query({ agentMint, walletAddress, limit: 5 })
      .expect(200);

    expect(listRes.body?.success).toBe(true);
    const replays = listRes.body?.data || [];
    expect(Array.isArray(replays)).toBe(true);

    // Use first replay id
    const replayId = replays[0]?.replayId;
    expect(replayId).toBeTruthy();

    // Create replay-based session
    const sessionRes = await request(app)
      .post('/api/training/sessions/replay-based')
      .send({
        walletPubkey: walletAddress,
        agentMint,
        selectedReplays: [replayId],
        trainingParams: { focusArea: 'all', intensity: 'medium', maxMatches: 1 }
      })
      .expect(200);

    expect(sessionRes.body?.success).toBe(true);
    expect(sessionRes.body?.selectedReplaysCount).toBe(1);
    expect(sessionRes.body?.tx).toBe('TEST_SIGNATURE_111');
    expect(sessionRes.body?.sessionPda).toBe('TestSessionPDA111');
  });
});
