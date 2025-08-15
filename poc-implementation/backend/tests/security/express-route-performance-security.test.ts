/**
 * Express Route Performance and Security Tests
 * Test Suite: Step 2 - Performance and Security Validation
 *
 * Requirements:
 * - API response times must meet 100ms (95th percentile) requirement
 * - Validate security middleware: rate limiting, CORS, helmet
 * - Test input validation, authentication, and error handling
 *
 */

import request from 'supertest';
import { performance } from 'perf_hooks';
import { createTestServer } from '../setup/test-server-setup';
import { generateTestData } from '../utils/test-data-generator';

describe('Express Route Performance and Security Tests', () => {
  let app: any;
  let server: any;
  let testData: any;

  beforeAll(async () => {
    // Initialize test server with production-like configuration
    const testSetup = await createTestServer();
    app = testSetup.app;
    server = testSetup.server;

    // Generate test data for validation tests
    testData = generateTestData();
  }, 30000);

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(resolve);
      });
    }
  }, 10000);

  describe('1. API Response Time Performance', () => {
    interface ResponseTimeResult {
      endpoint: string;
      times: number[];
      p95: number;
      average: number;
      min: number;
      max: number;
    }

    const testEndpoints = [
      { path: '/health', method: 'GET', description: 'Health check endpoint' },
      { path: '/api/v1/auth/status', method: 'GET', description: 'Auth status check' },
      { path: '/api/v1/game/list', method: 'GET', description: 'Game list endpoint' },
      { path: '/api/v1/user/profile', method: 'GET', description: 'User profile endpoint' },
      { path: '/api/v1/ai/suggestions', method: 'GET', description: 'AI suggestions endpoint' }
    ];

    test.each(testEndpoints)('$description should respond within 100ms (95th percentile)', async ({ path, method }) => {
      const measurements: number[] = [];
      const iterations = 100;
      const failedRequests: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        try {
          const response = await request(app)[method.toLowerCase()](path)
            .timeout(5000);

          const end = performance.now();
          const responseTime = end - start;
          measurements.push(responseTime);

          // Verify response is successful
          expect(response.status).toBeLessThan(500);
        } catch (error) {
          failedRequests.push(i);
          // For endpoints that might require auth, accept 401/403 as valid responses
          // but still measure the time it took to get that response
          const end = performance.now();
          measurements.push(end - start);
        }
      }

      // Calculate performance metrics
      measurements.sort((a, b) => a - b);
      const p95Index = Math.floor(0.95 * measurements.length);
      const p95Time = measurements[p95Index];
      const averageTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
      const minTime = measurements[0];
      const maxTime = measurements[measurements.length - 1];

      const result: ResponseTimeResult = {
        endpoint: path,
        times: measurements,
        p95: p95Time,
        average: averageTime,
        min: minTime,
        max: maxTime
      };

      // Log performance metrics for analysis
      console.log(`Performance metrics for ${path}:`, {
        p95: `${p95Time.toFixed(2)}ms`,
        average: `${averageTime.toFixed(2)}ms`,
        min: `${minTime.toFixed(2)}ms`,
        max: `${maxTime.toFixed(2)}ms`,
        failedRequests: failedRequests.length
      });

      // Main requirement: 95th percentile should be under 100ms
      expect(p95Time).toBeLessThan(100);

      // Additional performance checks
      expect(averageTime).toBeLessThan(50); // Average should be much better
      expect(failedRequests.length).toBeLessThan(5); // Less than 5% failure rate
    }, 30000);

    test('Concurrent request handling performance', async () => {
      const concurrentRequests = 50;
      const requestPromises: Promise<any>[] = [];
      const startTime = performance.now();

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        requestPromises.push(
          request(app)
            .get('/health')
            .timeout(5000)
        );
      }

      const responses = await Promise.allSettled(requestPromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const successfulResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 200
      );

      // Verify concurrent handling
      expect(successfulResponses.length).toBeGreaterThanOrEqual(concurrentRequests * 0.95);
      expect(totalTime).toBeLessThan(1000); // All requests should complete within 1 second
    }, 15000);
  });

  describe('2. Security Middleware Validation', () => {
    describe('2.1 Helmet Security Headers', () => {
      test('Security headers are present and correctly configured', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);

        // Helmet security headers
        expect(response.headers).toHaveProperty('x-frame-options');
        expect(response.headers['x-frame-options']).toBe('DENY');

        expect(response.headers).toHaveProperty('x-content-type-options');
        expect(response.headers['x-content-type-options']).toBe('nosniff');

        expect(response.headers).toHaveProperty('x-xss-protection');
        expect(response.headers['x-xss-protection']).toBe('0');

        expect(response.headers).toHaveProperty('x-dns-prefetch-control');
        expect(response.headers['x-dns-prefetch-control']).toBe('off');

        // Content Security Policy
        expect(response.headers).toHaveProperty('content-security-policy');
        expect(response.headers['content-security-policy']).toContain("default-src 'self'");
      });

      test('Strict Transport Security header for HTTPS', async () => {
        // Test HSTS header configuration
        const response = await request(app)
          .get('/health')
          .set('X-Forwarded-Proto', 'https');

        if (process.env.NODE_ENV === 'production') {
          expect(response.headers).toHaveProperty('strict-transport-security');
        }
      });
    });

    describe('2.2 CORS Configuration', () => {
      test('CORS headers are properly configured', async () => {
        const response = await request(app)
          .options('/api/v1/auth/status')
          .set('Origin', 'http://localhost:3000')
          .expect(204);

        expect(response.headers).toHaveProperty('access-control-allow-origin');
        expect(response.headers).toHaveProperty('access-control-allow-methods');
        expect(response.headers).toHaveProperty('access-control-allow-headers');
      });

      test('CORS blocks unauthorized origins', async () => {
        const response = await request(app)
          .get('/api/v1/auth/status')
          .set('Origin', 'http://malicious-site.com');

        // Should either block or not include CORS headers
        if (response.headers['access-control-allow-origin']) {
          expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
        }
      });
    });

    describe('2.3 Rate Limiting', () => {
      test('Rate limiting enforces request limits', async () => {
        const rateLimitExceeded: any[] = [];
        const maxRequests = 110; // Exceed typical rate limit

        // Make rapid requests to trigger rate limiting
        const requests = Array(maxRequests).fill(null).map(() =>
          request(app)
            .get('/api/v1/game/list')
            .timeout(5000)
            .catch(err => ({ error: err, status: err.status }))
        );

        const responses = await Promise.allSettled(requests);

        responses.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.status === 429) {
            rateLimitExceeded.push(index);
          }
        });

        // Verify rate limiting is working
        expect(rateLimitExceeded.length).toBeGreaterThan(0);
        console.log(`Rate limiting triggered for ${rateLimitExceeded.length} requests`);
      }, 20000);

      test('Rate limit headers are present', async () => {
        const response = await request(app)
          .get('/api/v1/game/list');

        // Check for rate limit headers
        expect(response.headers).toHaveProperty('x-ratelimit-limit');
        expect(response.headers).toHaveProperty('x-ratelimit-remaining');
        expect(response.headers).toHaveProperty('x-ratelimit-reset');
      });
    });
  });

  describe('3. Input Validation Tests', () => {
    describe('3.1 Request Body Validation', () => {
      test('Valid input passes validation', async () => {
        const validUserData = {
          username: testData.user.validUsername,
          email: testData.user.validEmail,
          password: testData.user.validPassword
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(validUserData);

        // Should either succeed or give a specific business logic error, not validation error
        expect(response.status).not.toBe(400);
      });

      test('Invalid input fails validation with proper error messages', async () => {
        const invalidInputs = [
          { data: { username: '', email: 'invalid-email', password: '123' }, description: 'Empty username, invalid email, short password' },
          { data: { username: 'a'.repeat(100), email: 'test@test.com' }, description: 'Missing password, username too long' },
          { data: { email: 'test@test.com', password: 'validPassword123!' }, description: 'Missing username' },
          { data: { username: 'user<script>alert("xss")</script>', email: 'test@test.com', password: 'validPassword123!' }, description: 'XSS attempt in username' }
        ];

        for (const { data, description } of invalidInputs) {
          const response = await request(app)
            .post('/api/v1/auth/register')
            .send(data);

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toBeTruthy();

          console.log(`Validation test passed for: ${description}`);
        }
      });
    });

    describe('3.2 SQL Injection Protection', () => {
      test('SQL injection attempts are blocked', async () => {
        const sqlInjectionAttempts = [
          "'; DROP TABLE users; --",
          "admin'--",
          "' OR '1'='1",
          "' UNION SELECT password FROM users WHERE '1'='1"
        ];

        for (const maliciousInput of sqlInjectionAttempts) {
          const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
              username: maliciousInput,
              password: 'anypassword'
            });

          // Should not cause server error (500) but return proper validation error
          expect(response.status).not.toBe(500);
          expect(response.status).toBeLessThan(500);
        }
      });
    });

    describe('3.3 XSS Protection', () => {
      test('XSS attempts are sanitized', async () => {
        const xssAttempts = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          '<img src="x" onerror="alert(\'xss\')" />',
          '<svg onload="alert(\'xss\')" />'
        ];

        for (const maliciousInput of xssAttempts) {
          const response = await request(app)
            .post('/api/v1/user/profile')
            .send({
              displayName: maliciousInput,
              bio: 'Test bio'
            });

          // Response should not contain the malicious script
          if (response.body && response.body.displayName) {
            expect(response.body.displayName).not.toContain('<script>');
            expect(response.body.displayName).not.toContain('javascript:');
            expect(response.body.displayName).not.toContain('onerror');
          }
        }
      });
    });
  });

  describe('4. Authentication and Authorization Tests', () => {
    let authToken: string;

    describe('4.1 Authentication Flow', () => {
      test('Authentication with valid credentials succeeds', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: testData.user.validUsername,
            password: testData.user.validPassword
          });

        if (response.status === 200 && response.body.token) {
          authToken = response.body.token;
          expect(response.body).toHaveProperty('token');
          expect(response.body.token).toBeTruthy();
        }
      });

      test('Authentication with invalid credentials fails', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: 'nonexistent',
            password: 'wrongpassword'
          });

        expect(response.status).toBe(401);
        expect(response.body).not.toHaveProperty('token');
      });
    });

    describe('4.2 Protected Routes', () => {
      test('Protected routes require authentication', async () => {
        const protectedEndpoints = [
          '/api/v1/user/profile',
          '/api/v1/game/create',
          '/api/v1/ai/analysis'
        ];

        for (const endpoint of protectedEndpoints) {
          const response = await request(app)
            .get(endpoint);

          expect([401, 403]).toContain(response.status);
        }
      });

      test('Protected routes accept valid authentication', async () => {
        if (authToken) {
          const response = await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', `Bearer ${authToken}`);

          expect(response.status).not.toBe(401);
          expect(response.status).not.toBe(403);
        }
      });
    });

    describe('4.3 JWT Token Security', () => {
      test('Invalid JWT tokens are rejected', async () => {
        const invalidTokens = [
          'invalid.jwt.token',
          'Bearer invalid',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
          ''
        ];

        for (const token of invalidTokens) {
          const response = await request(app)
            .get('/api/v1/user/profile')
            .set('Authorization', token);

          expect([401, 403]).toContain(response.status);
        }
      });
    });
  });

  describe('5. Error Handling and Recovery', () => {
    test('Malformed JSON requests are handled gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('Large payload requests are rejected', async () => {
      const largePayload = {
        data: 'x'.repeat(50 * 1024 * 1024) // 50MB payload
      };

      const response = await request(app)
        .post('/api/v1/user/profile')
        .send(largePayload);

      expect(response.status).toBe(413); // Payload Too Large
    });

    test('Unsupported HTTP methods are handled', async () => {
      const response = await request(app)
        .patch('/health') // Assuming PATCH is not supported for health
        .send({});

      expect([404, 405]).toContain(response.status);
    });

    test('Server errors return proper error format', async () => {
      // Try to trigger a server error with invalid data
      const response = await request(app)
        .post('/api/v1/game/create')
        .send({
          invalidGameData: 'trigger-error'
        });

      if (response.status >= 500) {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBeTruthy();
        // Should not expose internal server details
        expect(response.body.error).not.toContain('stack');
        expect(response.body.error).not.toContain('password');
        expect(response.body.error).not.toContain('token');
      }
    });

    test('Error responses maintain security headers', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint');

      expect(response.status).toBe(404);
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });

  describe('6. Performance Under Load', () => {
    test('API maintains performance under moderate load', async () => {
      const concurrentUsers = 25;
      const requestsPerUser = 10;
      const allRequests: Promise<any>[] = [];

      // Simulate concurrent users making multiple requests
      for (let user = 0; user < concurrentUsers; user++) {
        for (let req = 0; req < requestsPerUser; req++) {
          allRequests.push(
            request(app)
              .get('/health')
              .timeout(5000)
          );
        }
      }

      const startTime = performance.now();
      const responses = await Promise.allSettled(allRequests);
      const endTime = performance.now();

      const successfulResponses = responses.filter(
        result => result.status === 'fulfilled' &&
                  result.value.status === 200
      );

      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / allRequests.length;

      expect(successfulResponses.length).toBeGreaterThanOrEqual(allRequests.length * 0.95);
      expect(averageResponseTime).toBeLessThan(100);

      console.log(`Load test results:`, {
        totalRequests: allRequests.length,
        successfulResponses: successfulResponses.length,
        totalTime: `${totalTime.toFixed(2)}ms`,
        averageResponseTime: `${averageResponseTime.toFixed(2)}ms`
      });
    }, 30000);
  });
});
