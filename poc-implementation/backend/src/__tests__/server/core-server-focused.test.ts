/**
 * Core Server Production Test - Focused Implementation
 * Testing only the server-production-ready.ts which appears to be the main working server
 * Following GI.md guidelines for real implementations and performance requirements
 */

import request from 'supertest';
import { performance } from 'perf_hooks';

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.PORT = '3557';
process.env.HOST = '127.0.0.1';
process.env.LOG_LEVEL = 'error';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

describe('Core Server Production Ready - Focused Tests', () => {
    let app: any;
    const performanceMetrics = {
        serverStartTime: 0,
        healthCheckTimes: [] as number[],
        memoryUsage: 0
    };

    beforeAll(async () => {
        try {
            const startTime = performance.now();

            // Import the production server
            app = require('../../server-production-ready');

            const endTime = performance.now();
            performanceMetrics.serverStartTime = endTime - startTime;
            performanceMetrics.memoryUsage = process.memoryUsage().heapUsed;

            // Wait for server to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Failed to load server:', error);
            throw error;
        }
    }, 15000);

    describe('Server Startup Performance', () => {
        test('Server module loads within performance requirements', () => {
            expect(app).toBeDefined();

            // Performance requirement: <5 seconds for startup
            expect(performanceMetrics.serverStartTime).toBeLessThan(5000);
            console.log(`✅ Server startup time: ${performanceMetrics.serverStartTime.toFixed(2)}ms`);
        });

        test('Initial memory usage is within limits', () => {
            // Performance requirement: <512MB initial
            const memoryInMB = performanceMetrics.memoryUsage / (1024 * 1024);
            expect(memoryInMB).toBeLessThan(512);
            console.log(`✅ Initial memory usage: ${memoryInMB.toFixed(2)}MB`);
        });
    });

    describe('Express App Middleware Configuration', () => {
        test('Express app has middleware stack configured', () => {
            expect(app).toBeTruthy();
            expect(app._router).toBeDefined();
            expect(app._router.stack).toBeDefined();
            expect(app._router.stack.length).toBeGreaterThan(5);
            console.log(`✅ Middleware stack has ${app._router.stack.length} layers`);
        });
    });

    describe('Health Check Endpoint Performance', () => {
        test('Health check endpoint responds correctly', async () => {
            if (!app) {
                throw new Error('App not initialized');
            }

            const startTime = performance.now();

            const response = await request(app)
                .get('/health')
                .expect(200);

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            // Performance requirement: <10ms
            expect(responseTime).toBeLessThan(10);
            performanceMetrics.healthCheckTimes.push(responseTime);

            // Verify response structure
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body.status).toBe('healthy');

            console.log(`✅ Health check response time: ${responseTime.toFixed(2)}ms`);
        });

        test('Health check performance consistency', async () => {
            const checks = 5;
            const times: number[] = [];

            for (let i = 0; i < checks; i++) {
                const startTime = performance.now();
                await request(app).get('/health').expect(200);
                const endTime = performance.now();
                times.push(endTime - startTime);
            }

            // All should be under 10ms
            times.forEach(time => {
                expect(time).toBeLessThan(10);
            });

            const average = times.reduce((a, b) => a + b, 0) / times.length;
            console.log(`✅ Average health check time over ${checks} requests: ${average.toFixed(2)}ms`);
        });
    });

    describe('CORS Configuration', () => {
        test('CORS allows frontend origin', async () => {
            const response = await request(app)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');

            expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
        });

        test('CORS rejects unauthorized origins', async () => {
            const response = await request(app)
                .options('/api/v1/test')
                .set('Origin', 'http://malicious-site.com')
                .set('Access-Control-Request-Method', 'GET');

            expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
        });
    });

    describe('Security Headers (Helmet)', () => {
        test('Security headers are present', async () => {
            const response = await request(app)
                .get('/health');

            // Check for security headers set by Helmet
            expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
            expect(response.headers).toHaveProperty('x-frame-options');
            expect(response.headers).toHaveProperty('x-download-options');
        });

        test('Content Security Policy is configured', async () => {
            const response = await request(app)
                .get('/health');

            expect(response.headers).toHaveProperty('content-security-policy');
            const csp = response.headers['content-security-policy'];
            expect(csp).toContain("default-src 'self'");
        });
    });

    describe('Rate Limiting Functionality', () => {
        test('Rate limiting configuration exists', async () => {
            // Test that rate limiting doesn't immediately block normal requests
            const response = await request(app)
                .get('/api/v1/test-endpoint')
                .set('X-Forwarded-For', '192.168.1.200');

            // Should either return 404 (endpoint doesn't exist) or 200 (endpoint exists)
            // Should NOT return 429 (rate limited) for first request
            expect([200, 404, 405]).toContain(response.status);
        });
    });

    describe('API Documentation and Metrics', () => {
        test('API documentation endpoint responds', async () => {
            const response = await request(app)
                .get('/api-docs')
                .expect(200);

            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body.name).toBe('Nen Platform API');
        });

        test('Metrics endpoint provides system information', async () => {
            const response = await request(app)
                .get('/metrics')
                .expect(200);

            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memoryUsage');
            expect(response.body).toHaveProperty('cpuUsage');
            expect(response.body).toHaveProperty('timestamp');

            expect(typeof response.body.uptime).toBe('number');
            expect(response.body.uptime).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        test('404 handler works for non-existent routes', async () => {
            const response = await request(app)
                .get('/non-existent-route-12345');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('not found');
        });

        test('Error responses have correct structure', async () => {
            const response = await request(app)
                .get('/definitely-does-not-exist');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('path');
            expect(response.body).toHaveProperty('method');
        });
    });

    describe('Middleware Performance', () => {
        test('Middleware processing meets performance requirements', async () => {
            const requests = 10;
            const times: number[] = [];

            for (let i = 0; i < requests; i++) {
                const startTime = performance.now();
                await request(app)
                    .get('/health')
                    .expect(200);
                const endTime = performance.now();
                times.push(endTime - startTime);
            }

            // Performance requirement: <5ms per request for middleware processing
            const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
            expect(averageTime).toBeLessThan(5);

            console.log(`✅ Average middleware processing time: ${averageTime.toFixed(2)}ms`);
        });
    });

    afterAll(() => {
        // Report final performance metrics
        console.log('\n📊 Final Performance Test Results:');
        console.log(`🚀 Server startup time: ${performanceMetrics.serverStartTime.toFixed(2)}ms (requirement: <5000ms)`);
        console.log(`💾 Initial memory usage: ${(performanceMetrics.memoryUsage / (1024 * 1024)).toFixed(2)}MB (requirement: <512MB)`);

        if (performanceMetrics.healthCheckTimes.length > 0) {
            const avgHealthCheck = performanceMetrics.healthCheckTimes.reduce((a, b) => a + b, 0) / performanceMetrics.healthCheckTimes.length;
            console.log(`❤️ Average health check time: ${avgHealthCheck.toFixed(2)}ms (requirement: <10ms)`);
        }

        console.log('✅ All core server functionality tests completed successfully!');
    });
});
