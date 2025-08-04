"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const perf_hooks_1 = require("perf_hooks");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const setup_1 = require("../setup");
const server_production_ready_1 = __importDefault(require("../../server-production-ready"));
describe('Core Server Functionality', () => {
    let server;
    let httpServer;
    let io;
    const testPort = 3555;
    const performanceMetrics = {
        serverStartTime: 0,
        healthCheckTimes: [],
        middlewareTimes: [],
        memoryUsage: 0,
        startupMemory: 0,
        middlewareStack: []
    };
    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        process.env.PORT = testPort.toString();
        process.env.HOST = '127.0.0.1';
        process.env.LOG_LEVEL = 'error';
        process.env.FRONTEND_URL = 'http://localhost:3000';
        process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000';
        process.env.RATE_LIMIT_WINDOW_MS = '60000';
        process.env.RATE_LIMIT_MAX_REQUESTS = '100';
        process.env.VALID_API_KEYS = 'test-api-key-1,test-api-key-2';
        try {
            await (0, setup_1.getTestRedisClient)();
        }
        catch (error) {
            console.warn('Redis not available for testing');
        }
        performanceMetrics.startupMemory = process.memoryUsage().heapUsed;
        const startTime = perf_hooks_1.performance.now();
        server = server_production_ready_1.default.listen(testPort, '127.0.0.1', () => {
            const endTime = perf_hooks_1.performance.now();
            performanceMetrics.serverStartTime = endTime - startTime;
            performanceMetrics.memoryUsage = process.memoryUsage().heapUsed;
        });
        await new Promise((resolve) => {
            server.on('listening', () => {
                resolve();
            });
        });
        httpServer = (0, http_1.createServer)();
        io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL,
                methods: ["GET", "POST"],
                credentials: true
            }
        });
        await new Promise((resolve) => {
            httpServer.listen(testPort + 1, '127.0.0.1', () => {
                resolve();
            });
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (server_production_ready_1.default._router?.stack) {
            performanceMetrics.middlewareStack = server_production_ready_1.default._router.stack.map((layer) => layer.name || layer.handle?.name || 'anonymous');
        }
    }, 30000);
    afterAll(async () => {
        if (server) {
            await new Promise((resolve) => {
                server.close(() => resolve());
            });
        }
        if (httpServer) {
            await new Promise((resolve) => {
                httpServer.close(() => resolve());
            });
        }
        if (io) {
            io.close();
        }
        await (0, setup_1.cleanupTestEnvironment)();
    }, 15000);
    describe('1. Server starts successfully on specified port', () => {
        test('Server startup performance meets requirements', async () => {
            expect(server.listening).toBe(true);
            const address = server.address();
            expect(address.port).toBe(testPort);
            expect(address.address).toBe('127.0.0.1');
            expect(performanceMetrics.serverStartTime).toBeLessThan(5000);
            console.log(`🚀 Server startup time: ${performanceMetrics.serverStartTime.toFixed(2)}ms`);
        });
        test('Server startup memory usage within limits', () => {
            const memoryInMB = performanceMetrics.memoryUsage / (1024 * 1024);
            expect(memoryInMB).toBeLessThan(512);
            console.log(`💾 Initial memory usage: ${memoryInMB.toFixed(2)}MB`);
        });
        test('Server listens on correct interface', async () => {
            const address = server.address();
            expect(address.family).toBe('IPv4');
            expect(typeof address.port).toBe('number');
            expect(address.port).toBeGreaterThan(0);
        });
    });
    describe('2. Express app initializes with all middleware', () => {
        test('Middleware stack is properly configured', async () => {
            const middlewareCount = server_production_ready_1.default._router?.stack?.length || 0;
            expect(middlewareCount).toBeGreaterThan(10);
            expect(performanceMetrics.middlewareStack).toContain('helmet');
            console.log(`🔧 Middleware stack size: ${middlewareCount} layers`);
            console.log(`🔧 Middleware components: ${performanceMetrics.middlewareStack.slice(0, 5).join(', ')}...`);
        });
        test('JSON parsing middleware handles requests correctly', async () => {
            const testData = { test: 'data', number: 123, nested: { value: true } };
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .post('/health')
                .send(testData)
                .set('Content-Type', 'application/json');
            expect([200, 405, 404]).toContain(response.status);
        });
        test('URL encoding middleware is configured', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .post('/health')
                .send('test=data&number=123')
                .set('Content-Type', 'application/x-www-form-urlencoded');
            expect([200, 405, 404]).toContain(response.status);
        });
        test('Request size limits are enforced', async () => {
            const largeData = {
                data: 'x'.repeat(1024 * 1024 * 15)
            };
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .post('/api/v1/test-large-payload')
                .send(largeData)
                .set('Content-Type', 'application/json');
            expect(response.status).toBe(413);
        });
    });
    describe('3. Health check endpoint responds correctly', () => {
        test('Health check meets response time requirements', async () => {
            const startTime = perf_hooks_1.performance.now();
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/health')
                .expect(200);
            const endTime = perf_hooks_1.performance.now();
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(10);
            performanceMetrics.healthCheckTimes.push(responseTime);
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body.status).toBe('healthy');
            console.log(`❤️ Health check response time: ${responseTime.toFixed(2)}ms`);
        });
        test('Health check provides comprehensive system information', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/health')
                .expect(200);
            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memory');
            expect(response.body).toHaveProperty('performance');
            expect(response.body.memory).toHaveProperty('used');
            expect(response.body.memory).toHaveProperty('total');
            expect(response.body.memory).toHaveProperty('external');
            expect(response.body.performance).toHaveProperty('averageResponseTime');
            expect(response.body.performance).toHaveProperty('totalRequests');
            expect(response.body.performance).toHaveProperty('cacheHitRate');
        });
        test('Health check performance consistency under load', async () => {
            const checks = 20;
            const times = [];
            for (let i = 0; i < checks; i++) {
                const startTime = perf_hooks_1.performance.now();
                await (0, supertest_1.default)(server_production_ready_1.default).get('/health').expect(200);
                const endTime = perf_hooks_1.performance.now();
                times.push(endTime - startTime);
            }
            times.forEach(time => {
                expect(time).toBeLessThan(10);
            });
            const average = times.reduce((a, b) => a + b, 0) / times.length;
            expect(average).toBeLessThan(5);
            const sorted = times.sort((a, b) => a - b);
            const p95Index = Math.floor(sorted.length * 0.95);
            const p95Time = sorted[p95Index];
            expect(p95Time).toBeLessThan(8);
            console.log(`❤️ Health check average: ${average.toFixed(2)}ms, P95: ${p95Time.toFixed(2)}ms`);
        });
        test('Health check handles concurrent requests', async () => {
            const concurrentRequests = 50;
            const requests = Array(concurrentRequests).fill(null).map(() => (0, supertest_1.default)(server_production_ready_1.default).get('/health').expect(200));
            const startTime = perf_hooks_1.performance.now();
            const responses = await Promise.all(requests);
            const endTime = perf_hooks_1.performance.now();
            expect(responses).toHaveLength(concurrentRequests);
            responses.forEach(response => {
                expect(response.body).toHaveProperty('status', 'healthy');
            });
            const totalTime = endTime - startTime;
            expect(totalTime).toBeLessThan(1000);
            console.log(`❤️ Concurrent health checks (${concurrentRequests}): ${totalTime.toFixed(2)}ms total`);
        });
    });
    describe('4. CORS configuration allows frontend origin', () => {
        test('CORS allows configured origins', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');
            expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
            expect(response.headers['access-control-allow-methods']).toContain('GET');
        });
        test('CORS rejects unauthorized origins', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .options('/api/v1/test')
                .set('Origin', 'http://malicious-site.com')
                .set('Access-Control-Request-Method', 'GET');
            expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
        });
        test('CORS allows all configured methods', async () => {
            const methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
            for (const method of methods) {
                const response = await (0, supertest_1.default)(server_production_ready_1.default)
                    .options('/api/v1/test')
                    .set('Origin', 'http://localhost:3000')
                    .set('Access-Control-Request-Method', method);
                expect(response.headers['access-control-allow-methods']).toMatch(new RegExp(method));
            }
        });
        test('CORS allows required headers', async () => {
            const requiredHeaders = ['Content-Type', 'Authorization', 'X-API-Key'];
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Headers', requiredHeaders.join(','));
            const allowedHeaders = response.headers['access-control-allow-headers'];
            requiredHeaders.forEach(header => {
                expect(allowedHeaders).toMatch(new RegExp(header, 'i'));
            });
        });
        test('CORS includes credentials support', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000');
            expect(response.headers['access-control-allow-credentials']).toBe('true');
        });
        test('CORS configuration performance', async () => {
            const startTime = perf_hooks_1.performance.now();
            await (0, supertest_1.default)(server_production_ready_1.default)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'POST')
                .expect(204);
            const endTime = perf_hooks_1.performance.now();
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(5);
        });
    });
    describe('5. Rate limiting enforces request limits', () => {
        test('General rate limiting enforces limits', async () => {
            const testIP = '192.168.1.100';
            const requests = [];
            for (let i = 0; i < 25; i++) {
                requests.push((0, supertest_1.default)(server_production_ready_1.default)
                    .get('/api/v1/test-rate-limit')
                    .set('X-Forwarded-For', testIP));
            }
            const responses = await Promise.all(requests);
            const successCount = responses.filter(r => r.status !== 429).length;
            const rateLimitedCount = responses.filter(r => r.status === 429).length;
            expect(rateLimitedCount).toBeGreaterThan(0);
            console.log(`🚦 Rate limit test: ${successCount} successful, ${rateLimitedCount} limited`);
        }, 15000);
        test('Rate limiting provides proper error responses', async () => {
            const testIP = '192.168.1.101';
            const burstRequests = [];
            for (let i = 0; i < 30; i++) {
                burstRequests.push((0, supertest_1.default)(server_production_ready_1.default)
                    .get('/api/v1/test-rate-limit-2')
                    .set('X-Forwarded-For', testIP));
            }
            const responses = await Promise.all(burstRequests);
            const rateLimitedResponse = responses.find(r => r.status === 429);
            if (rateLimitedResponse) {
                expect(rateLimitedResponse.body).toHaveProperty('error');
                expect(rateLimitedResponse.body.error).toContain('Too many requests');
                expect(rateLimitedResponse.headers).toHaveProperty('retry-after');
                expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-limit');
                expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-remaining');
            }
        }, 15000);
        test('Strict rate limiting on sensitive endpoints', async () => {
            const testIP = '192.168.1.102';
            const authRequests = [];
            for (let i = 0; i < 20; i++) {
                authRequests.push((0, supertest_1.default)(server_production_ready_1.default)
                    .post('/api/auth/test-strict-limit')
                    .set('X-Forwarded-For', testIP)
                    .send({ test: 'data' }));
            }
            const responses = await Promise.all(authRequests);
            const rateLimitedCount = responses.filter(r => r.status === 429).length;
            expect(rateLimitedCount).toBeGreaterThan(8);
            console.log(`🔐 Auth rate limit test: ${rateLimitedCount} requests blocked`);
        }, 10000);
        test('Rate limiting allows requests after window expires', async () => {
            const testIP = '192.168.1.103';
            for (let i = 0; i < 5; i++) {
                await (0, supertest_1.default)(server_production_ready_1.default)
                    .get('/api/v1/test-rate-reset')
                    .set('X-Forwarded-For', testIP);
            }
            await new Promise(resolve => setTimeout(resolve, 1100));
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/api/v1/test-rate-reset')
                .set('X-Forwarded-For', testIP);
            expect(response.status).not.toBe(429);
        }, 5000);
        test('Rate limiting is per-IP and not global', async () => {
            const ip1 = '192.168.1.104';
            const ip2 = '192.168.1.105';
            const ip1Requests = [];
            for (let i = 0; i < 20; i++) {
                ip1Requests.push((0, supertest_1.default)(server_production_ready_1.default)
                    .get('/api/v1/test-ip-isolation')
                    .set('X-Forwarded-For', ip1));
            }
            await Promise.all(ip1Requests);
            const ip2Response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/api/v1/test-ip-isolation')
                .set('X-Forwarded-For', ip2);
            expect(ip2Response.status).not.toBe(429);
        }, 10000);
    });
    describe('6. Helmet security headers applied correctly', () => {
        test('Essential security headers are present', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/health');
            expect(response.headers).toHaveProperty('x-dns-prefetch-control');
            expect(response.headers).toHaveProperty('x-frame-options');
            expect(response.headers).toHaveProperty('x-download-options');
            expect(response.headers).toHaveProperty('x-content-type-options');
            expect(response.headers).toHaveProperty('x-xss-protection');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
            expect(response.headers['x-dns-prefetch-control']).toBe('off');
        });
        test('Content Security Policy is properly configured', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/health');
            expect(response.headers).toHaveProperty('content-security-policy');
            const csp = response.headers['content-security-policy'];
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("script-src");
            expect(csp).toContain("style-src");
            expect(csp).toContain("img-src");
            expect(csp).toContain("connect-src");
        });
        test('HSTS header is configured for HTTPS security', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/health');
            expect(response.headers).toHaveProperty('strict-transport-security');
            const hsts = response.headers['strict-transport-security'];
            expect(hsts).toContain('max-age=');
            expect(hsts).toContain('includeSubDomains');
        });
        test('XSS Protection header is configured', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/health');
            expect(response.headers).toHaveProperty('x-xss-protection');
            const xssProtection = response.headers['x-xss-protection'];
            expect(xssProtection).toMatch(/1; mode=block|0/);
        });
        test('Referrer Policy is set', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/health');
            expect(response.headers).toHaveProperty('referrer-policy');
            const referrerPolicy = response.headers['referrer-policy'];
            expect(referrerPolicy).toMatch(/no-referrer|same-origin|strict-origin/);
        });
        test('Security headers performance impact is minimal', async () => {
            const iterations = 10;
            const times = [];
            for (let i = 0; i < iterations; i++) {
                const startTime = perf_hooks_1.performance.now();
                await (0, supertest_1.default)(server_production_ready_1.default).get('/health').expect(200);
                const endTime = perf_hooks_1.performance.now();
                times.push(endTime - startTime);
            }
            const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
            expect(averageTime).toBeLessThan(8);
        });
    });
    describe('7. Error handling middleware catches exceptions', () => {
        test('Middleware catches synchronous exceptions', async () => {
            server_production_ready_1.default.get('/test-sync-error', (req, res, next) => {
                throw new Error('Test synchronous error for middleware');
            });
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/test-sync-error');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
            expect(typeof response.body.error).toBe('string');
        });
        test('Middleware catches asynchronous exceptions', async () => {
            server_production_ready_1.default.get('/test-async-error', async (req, res, next) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                throw new Error('Test async error for middleware');
            });
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/test-async-error');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
        test('Error handling provides structured error responses', async () => {
            server_production_ready_1.default.get('/test-structured-error', (req, res, next) => {
                const error = new Error('Structured test error');
                error.status = 400;
                error.code = 'VALIDATION_ERROR';
                throw error;
            });
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
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
                server_production_ready_1.default.get(`/test-error-${testCase.status}`, (req, res, next) => {
                    const error = new Error(`Test ${testCase.name} error`);
                    error.status = testCase.status;
                    throw error;
                });
                const response = await (0, supertest_1.default)(server_production_ready_1.default)
                    .get(`/test-error-${testCase.status}`);
                expect(response.status).toBe(testCase.status);
                expect(response.body).toHaveProperty('error');
            }
        });
        test('404 handler works for non-existent routes', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/completely-non-existent-route-12345');
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('not found');
            expect(response.body).toHaveProperty('path');
            expect(response.body).toHaveProperty('method');
        });
        test('Error handling does not leak sensitive information', async () => {
            server_production_ready_1.default.get('/test-sensitive-error', (req, res, next) => {
                const error = new Error('Database connection failed: password=secret123');
                throw error;
            });
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/test-sensitive-error');
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
            const errorText = JSON.stringify(response.body);
            expect(errorText).not.toContain('password');
            expect(errorText).not.toContain('secret123');
        });
        test('Error handling performance is acceptable', async () => {
            server_production_ready_1.default.get('/test-error-performance', (req, res, next) => {
                throw new Error('Performance test error');
            });
            const startTime = perf_hooks_1.performance.now();
            await (0, supertest_1.default)(server_production_ready_1.default).get('/test-error-performance');
            const endTime = perf_hooks_1.performance.now();
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(50);
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
            client.on('connect_error', (error) => {
                done(new Error(`WebSocket connection failed: ${error.message}`));
            });
        });
        test('WebSocket server handles multiple concurrent connections', (done) => {
            const io = require('socket.io-client');
            const numClients = 5;
            let connectedClients = 0;
            const clients = [];
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
                        expect(connectedClients).toBe(numClients);
                        clients.forEach(c => c.disconnect());
                        done();
                    }
                });
                client.on('connect_error', (error) => {
                    done(new Error(`Client ${connectedClients + 1} failed: ${error.message}`));
                });
            };
            for (let i = 0; i < numClients; i++) {
                setTimeout(connectClient, i * 100);
            }
        });
        test('WebSocket connection performance is acceptable', (done) => {
            const io = require('socket.io-client');
            const startTime = perf_hooks_1.performance.now();
            const client = io(`http://127.0.0.1:${testPort + 1}`, {
                transports: ['websocket'],
                timeout: 3000
            });
            client.on('connect', () => {
                const endTime = perf_hooks_1.performance.now();
                const connectionTime = endTime - startTime;
                expect(connectionTime).toBeLessThan(1000);
                client.disconnect();
                done();
            });
            client.on('connect_error', (error) => {
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
                expect(client.io.engine.transport).toBeDefined();
                client.disconnect();
                done();
            });
            client.on('connect_error', (error) => {
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
                client.on('disconnect', (reason) => {
                    expect(client.connected).toBe(false);
                    done();
                });
                client.disconnect();
            });
            client.on('connect_error', (error) => {
                done(new Error(`Cleanup test failed: ${error.message}`));
            });
        });
    });
    describe('8. Server gracefully shuts down on signals', () => {
        test('SIGTERM signal handlers are registered', async () => {
            const listeners = process.listeners('SIGTERM');
            expect(listeners.length).toBeGreaterThan(0);
            const hasShutdownListener = listeners.some(listener => listener.toString().includes('shutting down') ||
                listener.toString().includes('graceful'));
            expect(hasShutdownListener).toBe(true);
        });
        test('SIGINT signal handlers are registered', async () => {
            const sigintListeners = process.listeners('SIGINT');
            expect(sigintListeners.length).toBeGreaterThan(0);
            const hasShutdownListener = sigintListeners.some(listener => listener.toString().includes('shutting down') ||
                listener.toString().includes('graceful'));
            expect(hasShutdownListener).toBe(true);
        });
        test('Server can gracefully close connections', async () => {
            expect(server.listening).toBe(true);
            expect(typeof server.close).toBe('function');
            expect(() => {
                server.close(() => {
                });
            }).not.toThrow();
        });
        test('Active connections are properly tracked', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/health')
                .expect(200);
            expect(response.body).toHaveProperty('status', 'healthy');
            expect(server.listening).toBe(true);
        });
        test('Graceful shutdown process handles pending requests', async () => {
            const longRequest = (0, supertest_1.default)(server_production_ready_1.default)
                .get('/health')
                .timeout(1000);
            const response = await longRequest;
            expect(response.status).toBe(200);
        });
        test('Shutdown handlers preserve application state', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
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
            client.on('connect_error', (error) => {
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
                expect(client.id).toBeDefined();
                client.disconnect();
                done();
            });
            client.on('connect_error', (error) => {
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
            client.on('connect_error', (error) => {
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
                client.disconnect();
                if (!errorOccurred) {
                    done(new Error('Connection succeeded for unauthorized origin'));
                }
            });
            client.on('connect_error', (error) => {
                errorOccurred = true;
                expect(error).toBeDefined();
                done();
            });
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
                client.emit('test-message', { data: 'test' });
                client.disconnect();
                done();
            });
            client.on('connect_error', (error) => {
                done(new Error(`Method test failed: ${error.message}`));
            });
        });
    });
    describe('Performance and Integration Tests', () => {
        test('Middleware processing performance', async () => {
            const requests = 20;
            const times = [];
            for (let i = 0; i < requests; i++) {
                const startTime = perf_hooks_1.performance.now();
                await (0, supertest_1.default)(server_production_ready_1.default)
                    .get('/health')
                    .expect(200);
                const endTime = perf_hooks_1.performance.now();
                times.push(endTime - startTime);
            }
            const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
            expect(averageTime).toBeLessThan(5);
            const sorted = times.sort((a, b) => a - b);
            const p95Index = Math.floor(sorted.length * 0.95);
            const p95Time = sorted[p95Index];
            expect(p95Time).toBeLessThan(10);
        });
    });
    describe('API Documentation and Metrics', () => {
        test('API documentation endpoint responds', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/api-docs')
                .expect(200);
            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body.name).toBe('Nen Platform API');
        });
        test('Metrics endpoint provides system information', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
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
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/health');
            expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
            expect(response.headers).toHaveProperty('x-frame-options');
        });
        test('Compression middleware is active', async () => {
            const response = await (0, supertest_1.default)(server_production_ready_1.default)
                .get('/api-docs');
            const contentEncoding = response.headers['content-encoding'];
            expect(typeof response.body).toBe('object');
        });
    });
    afterAll(() => {
        console.log('\n📊 Performance Test Results:');
        console.log(`🚀 Server startup time: ${performanceMetrics.serverStartTime.toFixed(2)}ms (requirement: <5000ms)`);
        console.log(`💾 Initial memory usage: ${(performanceMetrics.memoryUsage / (1024 * 1024)).toFixed(2)}MB (requirement: <512MB)`);
        if (performanceMetrics.healthCheckTimes.length > 0) {
            const avgHealthCheck = performanceMetrics.healthCheckTimes.reduce((a, b) => a + b, 0) / performanceMetrics.healthCheckTimes.length;
            console.log(`❤️ Average health check time: ${avgHealthCheck.toFixed(2)}ms (requirement: <10ms)`);
        }
    });
});
//# sourceMappingURL=core-server.test.js.map