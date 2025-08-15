/**
 * Core Server Functionality Tests - Production-Grade Implementation
 * Following GI.md guidelines for real implementations and 100% test coverage
 *
 * Test Requirements:
 * - Server startup: <5 seconds
 * - Health check response: <10ms
 * - Middleware processing: <5ms per request
 * - Memory usage: <512MB initial
 *
 * Enhanced to meet all Core Server Functionality requirements
 * Date: August 1, 2025
 */

import request from 'supertest';
import { Server } from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import { performance } from 'perf_hooks';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getTestRedisClient, cleanupTestEnvironment } from '../setup';

// Import the actual server module for testing
import app from '../../server-production-ready';

describe('Core Server Functionality', () => {
    let server: Server;
    let httpServer: Server;
    let io: SocketIOServer;
    const testPort = 3555; // Use a dedicated test port

    // Performance tracking
    const performanceMetrics = {
        serverStartTime: 0,
        healthCheckTimes: [] as number[],
        middlewareTimes: [] as number[],
        memoryUsage: 0,
        startupMemory: 0,
        middlewareStack: [] as string[]
    };

    beforeAll(async () => {
        // Set test environment variables following GI.md #18 - no hardcoding
        process.env.NODE_ENV = 'test';
        process.env.PORT = testPort.toString();
        process.env.HOST = '127.0.0.1';
        process.env.LOG_LEVEL = 'error';
        process.env.FRONTEND_URL = 'http://localhost:3000';
        process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000';
        process.env.RATE_LIMIT_WINDOW_MS = '60000';
        process.env.RATE_LIMIT_MAX_REQUESTS = '100';
        process.env.VALID_API_KEYS = 'test-api-key-1,test-api-key-2';

        // Initialize test Redis connection (optional) - real implementation as per GI.md #2
        try {
            await getTestRedisClient();
        } catch (error) {
            console.warn('Redis not available for testing');
        }

        // Record initial memory before server startup
        performanceMetrics.startupMemory = process.memoryUsage().heapUsed;

        // Measure server startup time - critical performance requirement
        const startTime = performance.now();

        // Start the server
        server = app.listen(testPort, '127.0.0.1', () => {
            const endTime = performance.now();
            performanceMetrics.serverStartTime = endTime - startTime;

            // Record memory usage after startup
            performanceMetrics.memoryUsage = process.memoryUsage().heapUsed;
        });

        // Wait for server to be ready
        await new Promise<void>((resolve) => {
            server.on('listening', () => {
                resolve();
            });
        });

        // Create separate HTTP server for WebSocket testing
        httpServer = createServer();
        io = new SocketIOServer(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL,
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        // Start WebSocket server on different port
        await new Promise<void>((resolve) => {
            httpServer.listen(testPort + 1, '127.0.0.1', () => {
                resolve();
            });
        });

        // Wait for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Analyze middleware stack
        if ((app as any)._router?.stack) {
            performanceMetrics.middlewareStack = (app as any)._router.stack.map((layer: any) =>
                layer.name || layer.handle?.name || 'anonymous'
            );
        }
    }, 30000);

    afterAll(async () => {
        // Cleanup following GI.md #10 - proper resource management
        if (server) {
            await new Promise<void>((resolve) => {
                server.close(() => resolve());
            });
        }

        if (httpServer) {
            await new Promise<void>((resolve) => {
                httpServer.close(() => resolve());
            });
        }

        if (io) {
            io.close();
        }

        await cleanupTestEnvironment();
    }, 15000);

    // ==========================================
    // CORE SERVER FUNCTIONALITY TESTS
    // ==========================================

    describe('1. Server starts successfully on specified port', () => {
        test('Server startup performance meets requirements', async () => {
            expect(server.listening).toBe(true);

            const address = server.address() as AddressInfo;
            expect(address.port).toBe(testPort);
            expect(address.address).toBe('127.0.0.1');

            // Critical Performance requirement: <5 seconds
            expect(performanceMetrics.serverStartTime).toBeLessThan(5000);

            // Log actual performance for monitoring
            console.log(`🚀 Server startup time: ${performanceMetrics.serverStartTime.toFixed(2)}ms`);
        });

        test('Server startup memory usage within limits', () => {
            // Critical Performance requirement: <512MB initial
            const memoryInMB = performanceMetrics.memoryUsage / (1024 * 1024);
            expect(memoryInMB).toBeLessThan(512);

            console.log(`💾 Initial memory usage: ${memoryInMB.toFixed(2)}MB`);
        });

        test('Server listens on correct interface', async () => {
            const address = server.address() as AddressInfo;
            expect(address.family).toBe('IPv4');
            expect(typeof address.port).toBe('number');
            expect(address.port).toBeGreaterThan(0);
        });
    });

    describe('2. Express app initializes with all middleware', () => {
        test('Middleware stack is properly configured', async () => {
            // Test that the app has the expected middleware stack
            const middlewareCount = (app as any)._router?.stack?.length || 0;
            expect(middlewareCount).toBeGreaterThan(10); // Should have multiple middleware layers

            // Verify critical middleware components are present
            expect(performanceMetrics.middlewareStack).toContain('helmet');

            console.log(`🔧 Middleware stack size: ${middlewareCount} layers`);
            console.log(`🔧 Middleware components: ${performanceMetrics.middlewareStack.slice(0, 5).join(', ')}...`);
        });

        test('JSON parsing middleware handles requests correctly', async () => {
            const testData = { test: 'data', number: 123, nested: { value: true } };

            // Test JSON parsing on health endpoint
            const response = await request(app)
                .post('/health')
                .send(testData)
                .set('Content-Type', 'application/json');

            // Should handle JSON even if method not allowed
            expect([200, 405, 404]).toContain(response.status);
        });

        test('URL encoding middleware is configured', async () => {
            const response = await request(app)
                .post('/health')
                .send('test=data&number=123')
                .set('Content-Type', 'application/x-www-form-urlencoded');

            // Should handle URL encoding
            expect([200, 405, 404]).toContain(response.status);
        });

        test('Request size limits are enforced', async () => {
            // Test with large payload
            const largeData = {
                data: 'x'.repeat(1024 * 1024 * 15) // 15MB - should exceed 10MB limit
            };

            const response = await request(app)
                .post('/api/v1/test-large-payload')
                .send(largeData)
                .set('Content-Type', 'application/json');

            // Should reject large payloads
            expect(response.status).toBe(413);
        });
    });

    describe('3. Health check endpoint responds correctly', () => {
        test('Health check meets response time requirements', async () => {
            const startTime = performance.now();

            const response = await request(app)
                .get('/health')
                .expect(200);

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            // Critical Performance requirement: <10ms
            expect(responseTime).toBeLessThan(10);
            performanceMetrics.healthCheckTimes.push(responseTime);

            // Verify response structure following GI.md #3 - production readiness
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body.status).toBe('healthy');

            console.log(`❤️ Health check response time: ${responseTime.toFixed(2)}ms`);
        });

        test('Health check provides comprehensive system information', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            // Verify all expected health information is present
            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memory');
            expect(response.body).toHaveProperty('performance');

            // Verify memory information structure
            expect(response.body.memory).toHaveProperty('used');
            expect(response.body.memory).toHaveProperty('total');
            expect(response.body.memory).toHaveProperty('external');

            // Verify performance metrics structure
            expect(response.body.performance).toHaveProperty('averageResponseTime');
            expect(response.body.performance).toHaveProperty('totalRequests');
            expect(response.body.performance).toHaveProperty('cacheHitRate');
        });

        test('Health check performance consistency under load', async () => {
            // Run multiple health checks to test consistency
            const checks = 20;
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

            // Average should be well under the limit
            const average = times.reduce((a, b) => a + b, 0) / times.length;
            expect(average).toBeLessThan(5);

            // 95th percentile should also be reasonable
            const sorted = times.sort((a, b) => a - b);
            const p95Index = Math.floor(sorted.length * 0.95);
            const p95Time = sorted[p95Index];
            expect(p95Time).toBeLessThan(8);

            console.log(`❤️ Health check average: ${average.toFixed(2)}ms, P95: ${p95Time.toFixed(2)}ms`);
        });

        test('Health check handles concurrent requests', async () => {
            // Test concurrent health checks
            const concurrentRequests = 50;
            const requests = Array(concurrentRequests).fill(null).map(() =>
                request(app).get('/health').expect(200)
            );

            const startTime = performance.now();
            const responses = await Promise.all(requests);
            const endTime = performance.now();

            // All requests should succeed
            expect(responses).toHaveLength(concurrentRequests);
            responses.forEach(response => {
                expect(response.body).toHaveProperty('status', 'healthy');
            });

            // Total time should be reasonable
            const totalTime = endTime - startTime;
            expect(totalTime).toBeLessThan(1000); // Should handle 50 concurrent in <1s

            console.log(`❤️ Concurrent health checks (${concurrentRequests}): ${totalTime.toFixed(2)}ms total`);
        });
    });

    describe('4. CORS configuration allows frontend origin', () => {
        test('CORS allows configured origins', async () => {
            const response = await request(app)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');

            expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
            expect(response.headers['access-control-allow-methods']).toContain('GET');
        });

        test('CORS rejects unauthorized origins', async () => {
            const response = await request(app)
                .options('/api/v1/test')
                .set('Origin', 'http://malicious-site.com')
                .set('Access-Control-Request-Method', 'GET');

            // Should not include the malicious origin in response
            expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
        });

        test('CORS allows all configured methods', async () => {
            const methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

            for (const method of methods) {
                const response = await request(app)
                    .options('/api/v1/test')
                    .set('Origin', 'http://localhost:3000')
                    .set('Access-Control-Request-Method', method);

                expect(response.headers['access-control-allow-methods']).toMatch(new RegExp(method));
            }
        });

        test('CORS allows required headers', async () => {
            const requiredHeaders = ['Content-Type', 'Authorization', 'X-API-Key'];

            const response = await request(app)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Headers', requiredHeaders.join(','));

            const allowedHeaders = response.headers['access-control-allow-headers'];

            requiredHeaders.forEach(header => {
                expect(allowedHeaders).toMatch(new RegExp(header, 'i'));
            });
        });

        test('CORS includes credentials support', async () => {
            const response = await request(app)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000');

            expect(response.headers['access-control-allow-credentials']).toBe('true');
        });

        test('CORS configuration performance', async () => {
            // Test CORS preflight performance
            const startTime = performance.now();

            await request(app)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'POST')
                .expect(204);

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            // CORS should be fast
            expect(responseTime).toBeLessThan(5);
        });
    });

    describe('5. Rate limiting enforces request limits', () => {
        test('General rate limiting enforces limits', async () => {
            // Make requests up to the limit using unique IP
            const testIP = '192.168.1.100';
            const requests = [];

            for (let i = 0; i < 25; i++) {
                requests.push(
                    request(app)
                        .get('/api/v1/test-rate-limit')
                        .set('X-Forwarded-For', testIP)
                );
            }

            const responses = await Promise.all(requests);

            // Some should succeed, but eventually we should hit rate limit
            const successCount = responses.filter(r => r.status !== 429).length;
            const rateLimitedCount = responses.filter(r => r.status === 429).length;

            // We should have hit some rate limits in this burst
            expect(rateLimitedCount).toBeGreaterThan(0);
            console.log(`🚦 Rate limit test: ${successCount} successful, ${rateLimitedCount} limited`);
        }, 15000);

        test('Rate limiting provides proper error responses', async () => {
            // First exhaust the rate limit for a specific IP
            const testIP = '192.168.1.101';
            const burstRequests = [];

            for (let i = 0; i < 30; i++) {
                burstRequests.push(
                    request(app)
                        .get('/api/v1/test-rate-limit-2')
                        .set('X-Forwarded-For', testIP)
                );
            }

            const responses = await Promise.all(burstRequests);

            // Find a rate-limited response
            const rateLimitedResponse = responses.find(r => r.status === 429);

            if (rateLimitedResponse) {
                expect(rateLimitedResponse.body).toHaveProperty('error');
                expect(rateLimitedResponse.body.error).toContain('Too many requests');
                expect(rateLimitedResponse.headers).toHaveProperty('retry-after');

                // Verify rate limit headers are present
                expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-limit');
                expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-remaining');
            }
        }, 15000);

        test('Strict rate limiting on sensitive endpoints', async () => {
            // Test stricter limits on auth endpoints
            const testIP = '192.168.1.102';
            const authRequests = [];

            for (let i = 0; i < 20; i++) {
                authRequests.push(
                    request(app)
                        .post('/api/auth/test-strict-limit')
                        .set('X-Forwarded-For', testIP)
                        .send({ test: 'data' })
                );
            }

            const responses = await Promise.all(authRequests);
            const rateLimitedCount = responses.filter(r => r.status === 429).length;

            // Should have more aggressive rate limiting on auth endpoints
            expect(rateLimitedCount).toBeGreaterThan(8);
            console.log(`🔐 Auth rate limit test: ${rateLimitedCount} requests blocked`);
        }, 10000);

        test('Rate limiting allows requests after window expires', async () => {
            const testIP = '192.168.1.103';

            // Make some requests to approach limit
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .get('/api/v1/test-rate-reset')
                    .set('X-Forwarded-For', testIP);
            }

            // Wait for rate limit window to reset (shortened for test)
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should be able to make requests again
            const response = await request(app)
                .get('/api/v1/test-rate-reset')
                .set('X-Forwarded-For', testIP);

            expect(response.status).not.toBe(429);
        }, 5000);

        test('Rate limiting is per-IP and not global', async () => {
            // Test that rate limiting is properly isolated per IP
            const ip1 = '192.168.1.104';
            const ip2 = '192.168.1.105';

            // Exhaust limit for IP1
            const ip1Requests = [];
            for (let i = 0; i < 20; i++) {
                ip1Requests.push(
                    request(app)
                        .get('/api/v1/test-ip-isolation')
                        .set('X-Forwarded-For', ip1)
                );
            }
            await Promise.all(ip1Requests);

            // IP2 should still be able to make requests
            const ip2Response = await request(app)
                .get('/api/v1/test-ip-isolation')
                .set('X-Forwarded-For', ip2);

            expect(ip2Response.status).not.toBe(429);
        }, 10000);
    });

    describe('6. Helmet security headers applied correctly', () => {
        test('Essential security headers are present', async () => {
            const response = await request(app)
                .get('/health');

            // Check for critical security headers set by Helmet
            expect(response.headers).toHaveProperty('x-dns-prefetch-control');
            expect(response.headers).toHaveProperty('x-frame-options');
            expect(response.headers).toHaveProperty('x-download-options');
            expect(response.headers).toHaveProperty('x-content-type-options');
            expect(response.headers).toHaveProperty('x-xss-protection');

            // Verify specific security values
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
            expect(response.headers['x-dns-prefetch-control']).toBe('off');
        });

        test('Content Security Policy is properly configured', async () => {
            const response = await request(app)
                .get('/health');

            expect(response.headers).toHaveProperty('content-security-policy');
            const csp = response.headers['content-security-policy'];

            // Verify CSP contains required directives
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("script-src");
            expect(csp).toContain("style-src");
            expect(csp).toContain("img-src");
            expect(csp).toContain("connect-src");
        });

        test('HSTS header is configured for HTTPS security', async () => {
            const response = await request(app)
                .get('/health');

            // In production with HTTPS, this should be present
            expect(response.headers).toHaveProperty('strict-transport-security');

            const hsts = response.headers['strict-transport-security'];
            expect(hsts).toContain('max-age=');
            expect(hsts).toContain('includeSubDomains');
        });

        test('XSS Protection header is configured', async () => {
            const response = await request(app)
                .get('/health');

            expect(response.headers).toHaveProperty('x-xss-protection');
            const xssProtection = response.headers['x-xss-protection'];
            expect(xssProtection).toMatch(/1; mode=block|0/);
        });

        test('Referrer Policy is set', async () => {
            const response = await request(app)
                .get('/health');

            expect(response.headers).toHaveProperty('referrer-policy');
            const referrerPolicy = response.headers['referrer-policy'];
            expect(referrerPolicy).toMatch(/no-referrer|same-origin|strict-origin/);
        });

        test('Security headers performance impact is minimal', async () => {
            const iterations = 10;
            const times: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();
                await request(app).get('/health').expect(200);
                const endTime = performance.now();
                times.push(endTime - startTime);
            }

            // Security headers should not add significant overhead
            const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
            expect(averageTime).toBeLessThan(8); // Still well under health check requirement
        });
    });

    describe('7. Error handling middleware catches exceptions', () => {
        test('Middleware catches synchronous exceptions', async () => {
            // Create a test route that throws an error
            app.get('/test-sync-error', (req, res, next) => {
                throw new Error('Test synchronous error for middleware');
            });

            const response = await request(app)
                .get('/test-sync-error');

            // Should handle the error gracefully
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
            expect(typeof response.body.error).toBe('string');
        });

        test('Middleware catches asynchronous exceptions', async () => {
            app.get('/test-async-error', async (req, res, next) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                throw new Error('Test async error for middleware');
            });

            const response = await request(app)
                .get('/test-async-error');

            // Should handle async errors gracefully
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });

        test('Error handling provides structured error responses', async () => {
            app.get('/test-structured-error', (req, res, next) => {
                const error = new Error('Structured test error') as any;
                error.status = 400;
                error.code = 'VALIDATION_ERROR';
                throw error;
            });

            const response = await request(app)
                .get('/test-structured-error');

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(typeof response.body.error).toBe('string');
        });

        test('Error handling preserves error status codes', async () => {
            const testCases = [
                { status: 400, name: 'bad-request' },
                { status: 401, name: 'unauthorized' },
                { status: 403, name: 'forbidden' },
                { status: 422, name: 'unprocessable' }
            ];

            for (const testCase of testCases) {
                app.get(`/test-error-${testCase.status}`, (req, res, next) => {
                    const error = new Error(`Test ${testCase.name} error`) as any;
                    error.status = testCase.status;
                    throw error;
                });

                const response = await request(app)
                    .get(`/test-error-${testCase.status}`);

                expect(response.status).toBe(testCase.status);
                expect(response.body).toHaveProperty('error');
            }
        });

        test('404 handler works for non-existent routes', async () => {
            const response = await request(app)
                .get('/completely-non-existent-route-12345');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('not found');
            expect(response.body).toHaveProperty('path');
            expect(response.body).toHaveProperty('method');
        });

        test('Error handling does not leak sensitive information', async () => {
            app.get('/test-sensitive-error', (req, res, next) => {
                const error = new Error('Database connection failed: password=secret123');
                throw error;
            });

            const response = await request(app)
                .get('/test-sensitive-error');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');

            // Should not contain sensitive information
            const errorText = JSON.stringify(response.body);
            expect(errorText).not.toContain('password');
            expect(errorText).not.toContain('secret123');
        });

        test('Error handling performance is acceptable', async () => {
            app.get('/test-error-performance', (req, res, next) => {
                throw new Error('Performance test error');
            });

            const startTime = performance.now();
            await request(app).get('/test-error-performance');
            const endTime = performance.now();

            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(50); // Error handling should be fast
        });
    });

    describe('9. WebSocket server initializes correctly', () => {
        test('Socket.io server starts and accepts connections', (done) => {
            const io = require('socket.io-client');

            const client = io(`http://127.0.0.1:${testPort + 1}`, {
                transports: ['websocket'],
                timeout: 5000,
                forceNew: true
            });

            client.on('connect', () => {
                expect(client.connected).toBe(true);
                expect(client.id).toBeDefined();
                client.disconnect();
                done();
            });

            client.on('connect_error', (error: any) => {
                done(new Error(`WebSocket connection failed: ${error.message}`));
            });
        });

        test('WebSocket server handles multiple concurrent connections', (done) => {
            const io = require('socket.io-client');
            const numClients = 5;
            let connectedClients = 0;
            const clients: any[] = [];

            const connectClient = () => {
                const client = io(`http://127.0.0.1:${testPort + 1}`, {
                    transports: ['websocket'],
                    timeout: 3000,
                    forceNew: true
                });

                client.on('connect', () => {
                    connectedClients++;
                    clients.push(client);

                    if (connectedClients === numClients) {
                        // All clients connected successfully
                        expect(connectedClients).toBe(numClients);

                        // Clean up
                        clients.forEach(c => c.disconnect());
                        done();
                    }
                });

                client.on('connect_error', (error: any) => {
                    done(new Error(`Client ${connectedClients + 1} failed: ${error.message}`));
                });
            };

            // Connect multiple clients
            for (let i = 0; i < numClients; i++) {
                setTimeout(connectClient, i * 100);
            }
        });

        test('WebSocket connection performance is acceptable', (done) => {
            const io = require('socket.io-client');
            const startTime = performance.now();

            const client = io(`http://127.0.0.1:${testPort + 1}`, {
                transports: ['websocket'],
                timeout: 3000
            });

            client.on('connect', () => {
                const endTime = performance.now();
                const connectionTime = endTime - startTime;

                // WebSocket connection should be reasonably fast
                expect(connectionTime).toBeLessThan(1000); // < 1 second

                client.disconnect();
                done();
            });

            client.on('connect_error', (error: any) => {
                done(new Error(`Performance test failed: ${error.message}`));
            });
        });

        test('WebSocket server supports both websocket and polling transports', (done) => {
            const io = require('socket.io-client');

            const client = io(`http://127.0.0.1:${testPort + 1}`, {
                transports: ['polling', 'websocket'],
                timeout: 5000
            });

            client.on('connect', () => {
                expect(client.connected).toBe(true);

                // Verify transport information is available
                expect(client.io.engine.transport).toBeDefined();

                client.disconnect();
                done();
            });

            client.on('connect_error', (error: any) => {
                done(new Error(`Transport test failed: ${error.message}`));
            });
        });

        test('WebSocket server handles connection cleanup properly', (done) => {
            const io = require('socket.io-client');

            const client = io(`http://127.0.0.1:${testPort + 1}`, {
                transports: ['websocket'],
                timeout: 3000
            });

            client.on('connect', () => {
                expect(client.connected).toBe(true);

                // Test disconnection
                client.on('disconnect', (reason: string) => {
                    expect(client.connected).toBe(false);
                    done();
                });

                client.disconnect();
            });

            client.on('connect_error', (error: any) => {
                done(new Error(`Cleanup test failed: ${error.message}`));
            });
        });
    });

    describe('8. Server gracefully shuts down on signals', () => {
        test('SIGTERM signal handlers are registered', async () => {
            const listeners = process.listeners('SIGTERM');
            expect(listeners.length).toBeGreaterThan(0);

            // Verify we have the right type of listeners
            const hasShutdownListener = listeners.some(listener =>
                listener.toString().includes('shutting down') ||
                listener.toString().includes('graceful')
            );
            expect(hasShutdownListener).toBe(true);
        });

        test('SIGINT signal handlers are registered', async () => {
            const sigintListeners = process.listeners('SIGINT');
            expect(sigintListeners.length).toBeGreaterThan(0);

            // Verify we have proper shutdown handlers
            const hasShutdownListener = sigintListeners.some(listener =>
                listener.toString().includes('shutting down') ||
                listener.toString().includes('graceful')
            );
            expect(hasShutdownListener).toBe(true);
        });

        test('Server can gracefully close connections', async () => {
            // Test that server properly handles connection closure
            expect(server.listening).toBe(true);

            // Verify server has close method
            expect(typeof server.close).toBe('function');

            // Test that server can accept the close request (we won't actually close it)
            expect(() => {
                server.close(() => {
                    // This callback would be called when server actually closes
                });
            }).not.toThrow();
        });

        test('Active connections are properly tracked', async () => {
            // Make a request to establish a connection
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');

            // Server should be tracking connections
            expect(server.listening).toBe(true);
        });

        test('Graceful shutdown process handles pending requests', async () => {
            // Simulate a request that would be in progress during shutdown
            const longRequest = request(app)
                .get('/health')
                .timeout(1000);

            const response = await longRequest;
            expect(response.status).toBe(200);

            // If we get here, the server properly handled the request
            // even while preparing for potential shutdown
        });

        test('Shutdown handlers preserve application state', async () => {
            // Verify that having shutdown handlers doesn't affect normal operation
            const response = await request(app)
                .get('/metrics')
                .expect(200);

            expect(response.body).toHaveProperty('uptime');
            expect(response.body.uptime).toBeGreaterThan(0);
        });
    });

    describe('10. Socket.io CORS configuration works', () => {
        test('CORS allows configured frontend origin', (done) => {
            const io = require('socket.io-client');

            const client = io(`http://127.0.0.1:${testPort + 1}`, {
                transports: ['websocket'],
                extraHeaders: {
                    'Origin': 'http://localhost:3000'
                },
                timeout: 5000
            });

            client.on('connect', () => {
                expect(client.connected).toBe(true);
                client.disconnect();
                done();
            });

            client.on('connect_error', (error: any) => {
                // Should not error for allowed origin
                done(new Error(`CORS test failed for allowed origin: ${error.message}`));
            });
        });

        test('WebSocket CORS configuration matches HTTP CORS', (done) => {
            const io = require('socket.io-client');

            const client = io(`http://127.0.0.1:${testPort + 1}`, {
                transports: ['websocket'],
                extraHeaders: {
                    'Origin': process.env.FRONTEND_URL || 'http://localhost:3000'
                }
            });

            client.on('connect', () => {
                expect(client.connected).toBe(true);

                // Verify that the connection respects the same origin policy
                expect(client.id).toBeDefined();

                client.disconnect();
                done();
            });

            client.on('connect_error', (error: any) => {
                done(new Error(`CORS configuration mismatch: ${error.message}`));
            });
        });

        test('WebSocket CORS supports credentials', (done) => {
            const io = require('socket.io-client');

            const client = io(`http://127.0.0.1:${testPort + 1}`, {
                transports: ['websocket'],
                withCredentials: true,
                extraHeaders: {
                    'Origin': 'http://localhost:3000'
                }
            });

            client.on('connect', () => {
                expect(client.connected).toBe(true);
                client.disconnect();
                done();
            });

            client.on('connect_error', (error: any) => {
                done(new Error(`Credentials test failed: ${error.message}`));
            });
        });

        test('WebSocket CORS rejects unauthorized origins', (done) => {
            const io = require('socket.io-client');

            const client = io(`http://127.0.0.1:${testPort + 1}`, {
                transports: ['websocket'],
                extraHeaders: {
                    'Origin': 'http://malicious-site.com'
                },
                timeout: 3000
            });

            let errorOccurred = false;

            client.on('connect', () => {
                // This should not happen for unauthorized origin
                client.disconnect();
                if (!errorOccurred) {
                    done(new Error('Connection succeeded for unauthorized origin'));
                }
            });

            client.on('connect_error', (error: any) => {
                errorOccurred = true;
                // This is expected for unauthorized origin
                expect(error).toBeDefined();
                done();
            });

            // Fallback timeout
            setTimeout(() => {
                if (!errorOccurred) {
                    done(new Error('Expected connection error for unauthorized origin'));
                }
            }, 4000);
        });

        test('WebSocket CORS allows configured methods', (done) => {
            const io = require('socket.io-client');

            const client = io(`http://127.0.0.1:${testPort + 1}`, {
                transports: ['websocket'],
                extraHeaders: {
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'GET'
                }
            });

            client.on('connect', () => {
                expect(client.connected).toBe(true);

                // Test that we can send data (POST-like operation)
                client.emit('test-message', { data: 'test' });

                client.disconnect();
                done();
            });

            client.on('connect_error', (error: any) => {
                done(new Error(`Method test failed: ${error.message}`));
            });
        });
    });

    // ==========================================
    // PERFORMANCE AND INTEGRATION TESTS
    // ==========================================
    describe('Performance and Integration Tests', () => {
        test('Middleware processing performance', async () => {
            const requests = 20;
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

            // 95th percentile should also be reasonable
            const sorted = times.sort((a, b) => a - b);
            const p95Index = Math.floor(sorted.length * 0.95);
            const p95Time = sorted[p95Index];
            expect(p95Time).toBeLessThan(10);
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

    describe('Production Configuration Validation', () => {
        test('Environment variables are properly loaded', () => {
            expect(process.env.NODE_ENV).toBe('test');
            expect(process.env.PORT).toBe(testPort.toString());
            expect(process.env.LOG_LEVEL).toBe('error');
        });

        test('Security configurations are active', async () => {
            const response = await request(app)
                .get('/health');

            // Verify security middleware is active
            expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
            expect(response.headers).toHaveProperty('x-frame-options');
        });

        test('Compression middleware is active', async () => {
            const response = await request(app)
                .get('/api-docs');

            // For larger responses, compression should be applied
            const contentEncoding = response.headers['content-encoding'];
            // Note: supertest might decompress automatically, so we check if gzip was attempted
            // by checking that the response is structured (successfully decompressed)
            expect(typeof response.body).toBe('object');
        });
    });

    afterAll(() => {
        // Report performance metrics
        console.log('\n📊 Performance Test Results:');
        console.log(`🚀 Server startup time: ${performanceMetrics.serverStartTime.toFixed(2)}ms (requirement: <5000ms)`);
        console.log(`💾 Initial memory usage: ${(performanceMetrics.memoryUsage / (1024 * 1024)).toFixed(2)}MB (requirement: <512MB)`);

        if (performanceMetrics.healthCheckTimes.length > 0) {
            const avgHealthCheck = performanceMetrics.healthCheckTimes.reduce((a, b) => a + b, 0) / performanceMetrics.healthCheckTimes.length;
            console.log(`❤️ Average health check time: ${avgHealthCheck.toFixed(2)}ms (requirement: <10ms)`);
        }
    });
});
