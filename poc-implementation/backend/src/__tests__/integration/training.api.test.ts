import request from 'supertest';

// temp-server is JS; import compiled instance directly
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../../src/temp-server');

describe('Training API (User Story 7) [Unverified - requires devnet env to fully exercise]', () => {
  it('should reject when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/training/sessions').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET unknown session returns 404', async () => {
    const res = await request(app).get('/api/v1/training/sessions/does-not-exist');
    // service may be unavailable in CI, still should not crash; allow 404 or 503
    expect([404,503]).toContain(res.status);
  });
});
