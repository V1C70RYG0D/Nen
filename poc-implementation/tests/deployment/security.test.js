// tests/deployment/security.test.js
const axios = require('axios');

describe('Application Security Tests', () => {
  const baseURL = process.env.API_BASE_URL || process.env.TEST_API_BASE_URL || (() => {
  })();

  test('SQL injection protection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    try {
      await axios.post(`${baseURL}/api/v1/auth/login`, {
        username: maliciousInput,
        password: 'test'
      });
    } catch (error) {
      expect(error.response.status).not.toBe(500);
    }
  });

  test('Rate limiting works', async () => {
    const requests = Array(100).fill().map(() =>
      axios.get(`${baseURL}/api/v1/health`)
    );

    const responses = await Promise.allSettled(requests);
    const rateLimited = responses.some(r =>
      r.value?.status === 429 || r.reason?.response?.status === 429
    );
    expect(rateLimited).toBe(true);
  });
});

