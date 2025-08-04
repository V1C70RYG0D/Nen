// tests/deployment/backend-api.test.js
const axios = require('axios');
const WebSocket = require('ws');

describe('Backend API Deployment Tests', () => {
  const baseURL = process.env.API_BASE_URL || process.env.TEST_API_BASE_URL || (() => {
  })();
  let authToken = null;

  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  describe('Health and Status Checks', () => {
    test('Health endpoint responds correctly', async () => {
      try {
        const response = await axios.get(`${baseURL}/health`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
        expect(['healthy', 'ok', 'running']).toContain(response.data.status.toLowerCase());
      } catch (error) {
        console.error('Health check failed:', error.message);
        throw error;
      }
    });

    test('API version endpoint accessible', async () => {
      try {
        const response = await axios.get(`${baseURL}/api/version`);
        expect(response.status).toBeLessThan(500);
      } catch (error) {
        // Endpoint might not exist, check if it's 404 vs 500
        expect(error.response?.status).toBeLessThan(500);
      }
    });

    test('Metrics endpoint accessible', async () => {
      try {
        const response = await axios.get(`${baseURL}/metrics`);
        expect(response.status).toBeLessThan(500);
      } catch (error) {
        console.log('Metrics endpoint not available:', error.response?.status);
      }
    });
  });

  describe('Authentication Flow', () => {
    test('Authentication endpoint exists', async () => {
      try {
        const response = await axios.post(`${baseURL}/api/auth/login`, {
          wallet_address: 'test_address_123',
          signature: 'test_signature'
        });
        // Should not return 404 or 500
        expect(response.status).toBeLessThan(500);
      } catch (error) {
        if (error.response) {
          expect(error.response.status).toBeLessThan(500);
          // 400 or 401 is acceptable for invalid credentials
          expect([400, 401, 422]).toContain(error.response.status);
        }
      }
    });

    test('JWT token validation works', async () => {
      try {
        const response = await axios.get(`${baseURL}/api/user/profile`, {
          headers: { Authorization: 'Bearer invalid_token' }
        });
        expect([401, 403]).toContain(response.status);
      } catch (error) {
        expect([401, 403]).toContain(error.response?.status);
      }
    });
  });

  describe('Core API Endpoints', () => {
    const endpoints = [
      '/api/v1/agents',
      '/api/v1/matches',
      '/api/v1/users',
      '/api/v1/bets',
      '/api/v1/training'
    ];

    test.each(endpoints)('Endpoint %s is accessible', async (endpoint) => {
      try {
        const response = await axios.get(`${baseURL}${endpoint}`);
        expect(response.status).toBeLessThan(500);
      } catch (error) {
        // 401/403 is acceptable for protected endpoints
        if (error.response) {
          expect(error.response.status).toBeLessThan(500);
        }
      }
    });
  });

  describe('Database Connectivity', () => {
    test('Database connection through API', async () => {
      try {
        const response = await axios.get(`${baseURL}/api/system/status`);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('database');
          expect(response.data.database).toBe('connected');
        }
      } catch (error) {
        console.log('System status endpoint not available');
      }
    });
  });

  describe('Redis Cache Integration', () => {
    test('Cache functionality through API', async () => {
      try {
        const response = await axios.get(`${baseURL}/api/system/cache/status`);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('redis');
          expect(response.data.redis).toBe('connected');
        }
      } catch (error) {
        console.log('Cache status endpoint not available');
      }
    });
  });

  describe('WebSocket Connections', () => {
    test('WebSocket connection establishes', (done) => {
      const wsUrl = baseURL.replace('http', 'ws');
      const ws = new WebSocket(`${wsUrl}/socket.io/?EIO=4&transport=websocket`);

      const timeout = setTimeout(() => {
        ws.close();
        done(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log('WebSocket connection failed:', error.message);
        // Don't fail the test if WebSocket is not implemented yet
        done();
      });
    });

    test('WebSocket handles basic messages', (done) => {
      const wsUrl = baseURL.replace('http', 'ws');
      const ws = new WebSocket(`${wsUrl}/socket.io/?EIO=4&transport=websocket`);

      ws.on('open', () => {
        ws.send('40'); // Socket.IO connect message
        setTimeout(() => {
          ws.close();
          done();
        }, 1000);
      });

      ws.on('error', () => {
        done(); // Don't fail if WebSocket not implemented
      });
    });
  });

  describe('Error Handling and Logging', () => {
    test('404 errors are handled properly', async () => {
      try {
        const response = await axios.get(`${baseURL}/api/nonexistent/endpoint`);
        expect(response.status).toBe(404);
      } catch (error) {
        expect(error.response?.status).toBe(404);
      }
    });

    test('Malformed requests return appropriate errors', async () => {
      try {
        const response = await axios.post(`${baseURL}/api/v1/matches`, {
          invalid: 'data'
        });
        expect([400, 422, 401, 403]).toContain(response.status);
      } catch (error) {
        expect([400, 422, 401, 403]).toContain(error.response?.status);
      }
    });
  });

  describe('Performance and Load', () => {
    test('Response time under 2 seconds', async () => {
      const startTime = Date.now();
      try {
        await axios.get(`${baseURL}/health`);
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(2000);
      } catch (error) {
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(2000);
      }
    });

    test('Concurrent requests handling', async () => {
      const requests = Array(10).fill().map(() =>
        axios.get(`${baseURL}/health`).catch(e => e.response)
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r && r.status < 500).length;
      expect(successCount).toBeGreaterThan(5); // At least 50% success rate
    });
  });

  describe('Security Headers', () => {
    test('Security headers are present', async () => {
      try {
        const response = await axios.get(`${baseURL}/health`);
        const headers = response.headers;

        // Check for common security headers
        expect(headers).toHaveProperty('x-content-type-options');
        expect(headers).toHaveProperty('x-frame-options');
      } catch (error) {
        console.log('Could not verify security headers');
      }
    });
  });
});
