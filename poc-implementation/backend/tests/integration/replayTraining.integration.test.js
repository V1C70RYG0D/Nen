const request = require('supertest');
const app = require('../../src/temp-server');

describe('Replay Training API Integration', () => {
  it('filters replays and returns memo payload for known replay', async () => {
    const agentMint = 'H4o5x8s4A3pYsG47yPCsGMe4GzLDXdbdJPQ7VHG89FzY';
    const walletAddress = '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC';

    const res = await request(app)
      .get('/api/training/match-replays')
      .query({ agentMint, walletAddress, limit: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const replayId = res.body.data[0].replayId;

    const sessionRes = await request(app)
      .post('/api/training/sessions/replay-based')
      .send({
        walletPubkey: walletAddress,
        agentMint,
        selectedReplays: [replayId],
        trainingParams: {
          focusArea: 'openings',
          intensity: 'medium',
          maxMatches: 1
        }
      });

    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.success).toBe(true);
    expect(sessionRes.body.selectedReplaysCount).toBe(1);
    expect(sessionRes.body.tx).toBeDefined();
    expect(sessionRes.body.trainingParams.focusArea).toBe('openings');
  });
});
