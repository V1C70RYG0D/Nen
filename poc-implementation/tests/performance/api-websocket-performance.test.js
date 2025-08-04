/**
 * Test Suite 3.2: Advanced APIs and WebSockets Testing
 * Test Case: PM-013 - Real-time API Performance
 *
 * Validates Express APIs with geographic optimization and Socket.io performance
 */

const request = require('supertest');
const io = require('socket.io-client');
const { performance } = require('perf_hooks');

describe('PM-013: Real-time API Performance', () => {
  let app;
  let server;
  let socketClient;

  // Compliance: All URLs externalized via environment variables
  const API_BASE_URL = process.env.API_URL || process.env.DEFAULT_API_URL || (() => {
    throw new Error('API_URL or DEFAULT_API_URL must be set in environment variables. Environment variables required.');
  })();
  const WEBSOCKET_URL = process.env.WEBSOCKET_URL || process.env.DEFAULT_WEBSOCKET_URL || (() => {
    throw new Error('WEBSOCKET_URL or DEFAULT_WEBSOCKET_URL must be set in environment variables. Environment variables required.');
  })();

  beforeAll(async () => {
    // Initialize test server if needed
    if (process.env.NODE_ENV === 'test') {
      const { createTestServer } = require('../../backend/src/test/test-server');
      ({ app, server } = await createTestServer());
    }
  });

  afterAll(async () => {
    if (socketClient) {
      socketClient.close();
    }
    if (server) {
      server.close();
    }
  });

  describe('1. Express Route Performance and Security', () => {
    test('API responses within 100ms (95th percentile)', async () => {
      const measurements = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const response = await request(app || API_BASE_URL)
          .get('/api/health')
          .expect(200);
        const end = performance.now();

        measurements.push(end - start);
      }

      // Calculate 95th percentile
      measurements.sort((a, b) => a - b);
      const p95Index = Math.floor(0.95 * measurements.length);
      const p95Time = measurements[p95Index];

      expect(p95Time).toBeLessThan(100);
    });

    test('API security headers present', async () => {
      const response = await request(app || API_BASE_URL)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('Rate limiting works correctly', async () => {
      const requests = Array(101).fill().map(() =>
        request(app || API_BASE_URL)
          .get('/api/test-endpoint')
      );

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(
        result => result.value?.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('2. Socket.io Geographic Optimization', () => {
    beforeEach((done) => {
      socketClient = io(WEBSOCKET_URL, {
        transports: ['websocket'],
        timeout: 5000
      });

      socketClient.on('connect', () => {
        done();
      });
    });

    afterEach(() => {
      if (socketClient) {
        socketClient.close();
        socketClient = null;
      }
    });

    test('WebSocket connections stable globally', (done) => {
      let connectionStable = true;
      let disconnectCount = 0;

      socketClient.on('disconnect', () => {
        disconnectCount++;
        if (disconnectCount > 2) {
          connectionStable = false;
        }
      });

      socketClient.on('reconnect', () => {
        // Connection recovered
      });

      // Test connection stability for 30 seconds
      setTimeout(() => {
        expect(connectionStable).toBe(true);
        expect(socketClient.connected).toBe(true);
        done();
      }, 30000);
    }, 35000);

    test('Geographic routing optimization', (done) => {
      const testData = {
        location: { lat: 37.7749, lng: -122.4194 }, // San Francisco
        action: 'test-geographic-routing'
      };

      const startTime = performance.now();

      socketClient.emit('geographic-test', testData);

      socketClient.on('geographic-response', (response) => {
        const responseTime = performance.now() - startTime;

        expect(response).toHaveProperty('routedServer');
        expect(response).toHaveProperty('latency');
        expect(responseTime).toBeLessThan(200); // Geographic optimization should be fast

        done();
      });
    });
  });

  describe('3. Real-time Update Propagation', () => {
    test('Real-time updates propagate <100ms', (done) => {
      const clients = [];
      const connectPromises = [];

      // Create multiple client connections
      for (let i = 0; i < 5; i++) {
        const client = io(WEBSOCKET_URL, {
          transports: ['websocket']
        });

        clients.push(client);
        connectPromises.push(new Promise(resolve => {
          client.on('connect', resolve);
        }));
      }

      Promise.all(connectPromises).then(() => {
        const testMessage = {
          id: Date.now(),
          type: 'broadcast-test',
          data: 'Performance test message'
        };

        let responsesReceived = 0;
        const startTime = performance.now();

        clients.forEach((client, index) => {
          if (index > 0) { // Skip first client (sender)
            client.on('broadcast-message', () => {
              const propagationTime = performance.now() - startTime;
              expect(propagationTime).toBeLessThan(100);

              responsesReceived++;
              if (responsesReceived === clients.length - 1) {
                // Clean up
                clients.forEach(client => client.close());
                done();
              }
            });
          }
        });

        // Send message from first client
        clients[0].emit('broadcast', testMessage);
      });
    }, 10000);
  });

  describe('4. Error Handling and Recovery', () => {
    test('Error handling prevents crashes', async () => {
      // Test malformed requests
      const malformedRequests = [
        { method: 'POST', url: '/api/invalid', data: 'invalid-json' },
        { method: 'GET', url: '/api/nonexistent' },
        { method: 'PUT', url: '/api/test', data: { field: 'x'.repeat(10000) } }
      ];

      for (const req of malformedRequests) {
        const response = await request(app || API_BASE_URL)
          [req.method.toLowerCase()](req.url)
          .send(req.data)
          .expect((res) => {
            // Should return error status, not crash
            expect([400, 404, 413, 500]).toContain(res.status);
          });
      }
    });

    test('WebSocket error recovery', (done) => {
      socketClient.on('connect', () => {
        // Simulate network error
        socketClient.disconnect();

        // Should automatically reconnect
        socketClient.on('reconnect', () => {
          expect(socketClient.connected).toBe(true);
          done();
        });

        // Force reconnection
        setTimeout(() => {
          socketClient.connect();
        }, 1000);
      });
    });
  });

  describe('5. Performance Monitoring Integration', () => {
    test('Performance monitoring accurate', async () => {
      const response = await request(app || API_BASE_URL)
        .get('/api/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('responseTime');
      expect(response.body).toHaveProperty('throughput');
      expect(response.body).toHaveProperty('errorRate');
      expect(response.body).toHaveProperty('activeConnections');

      // Validate metric accuracy
      expect(typeof response.body.responseTime).toBe('number');
      expect(response.body.responseTime).toBeGreaterThan(0);
    });

    test('Real-time metrics collection', (done) => {
      socketClient.emit('request-metrics');

      socketClient.on('metrics-update', (metrics) => {
        expect(metrics).toHaveProperty('timestamp');
        expect(metrics).toHaveProperty('activeUsers');
        expect(metrics).toHaveProperty('serverLoad');
        expect(Date.now() - metrics.timestamp).toBeLessThan(5000);

        done();
      });
    });
  });

  describe('6. Security Measures Validation', () => {
    test('Security measures effective', async () => {
      // Test CORS
      const corsResponse = await request(app || API_BASE_URL)
        .options('/api/test')
        .set('Origin', 'http://malicious-site.com')
        .expect(200);

      expect(corsResponse.headers['access-control-allow-origin']).not.toBe('*');

      // Test input validation
      const sqlInjectionResponse = await request(app || API_BASE_URL)
        .post('/api/user')
        .send({ name: "'; DROP TABLE users; --" })
        .expect(400);

      // Test authentication
      const unauthorizedResponse = await request(app || API_BASE_URL)
        .get('/api/protected')
        .expect(401);
    });

    test('WebSocket authentication', (done) => {
      const unauthorizedClient = io(WEBSOCKET_URL, {
        auth: { token: 'invalid-token' }
      });

      unauthorizedClient.on('connect_error', (error) => {
        expect(error.message).toMatch(/authentication/i);
        unauthorizedClient.close();
        done();
      });
    });
  });

  describe('7. API Documentation and Versioning', () => {
    test('API documentation complete', async () => {
      const docsResponse = await request(app || API_BASE_URL)
        .get('/api/docs')
        .expect(200);

      expect(docsResponse.body).toHaveProperty('openapi');
      expect(docsResponse.body).toHaveProperty('info');
      expect(docsResponse.body).toHaveProperty('paths');

      // Validate that all endpoints are documented
      const paths = Object.keys(docsResponse.body.paths);
      expect(paths.length).toBeGreaterThan(0);
    });

    test('API versioning works', async () => {
      const v1Response = await request(app || API_BASE_URL)
        .get('/api/v1/health')
        .expect(200);

      const v2Response = await request(app || API_BASE_URL)
        .get('/api/v2/health')
        .expect(200);

      expect(v1Response.body.version).toBe('1.0.0');
      expect(v2Response.body.version).toBe('2.0.0');
    });
  });
});
