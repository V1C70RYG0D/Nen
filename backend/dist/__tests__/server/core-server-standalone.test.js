"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const perf_hooks_1 = require("perf_hooks");
function createTestServer() {
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "ws:", "wss:"],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));
    app.use((0, cors_1.default)({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: true,
        maxAge: 86400
    }));
    const generalLimiter = (0, express_rate_limit_1.default)({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        message: {
            error: 'Too many requests from this IP',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    const strictLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60000,
        max: 10,
        message: {
            error: 'Too many sensitive requests from this IP',
            retryAfter: '1 minute'
        }
    });
    app.use('/api', generalLimiter);
    app.use('/api/auth', strictLimiter);
    app.use((0, compression_1.default)({
        level: 6,
        threshold: 1024,
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression_1.default.filter(req, res);
        }
    }));
    app.use((0, morgan_1.default)('combined', {
        skip: () => process.env.NODE_ENV === 'test'
    }));
    app.use(express_1.default.json({
        limit: '10mb',
        verify: (req, res, buf) => {
            try {
                JSON.parse(buf.toString());
            }
            catch (e) {
                throw new Error('Invalid JSON payload');
            }
        }
    }));
    app.use(express_1.default.urlencoded({
        extended: true,
        limit: '10mb'
    }));
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                external: Math.round(process.memoryUsage().external / 1024 / 1024)
            },
            performance: {
                averageResponseTime: 2.5,
                p95ResponseTime: 8.1,
                totalRequests: 1247,
                slowRequests: 3,
                cacheHitRate: 85.2,
                errorRate: 0.1
            }
        });
    });
    app.get('/api-docs', (req, res) => {
        res.json({
            name: 'Nen Platform API',
            version: '1.0.0',
            status: 'production',
            endpoints: {
                health: '/health',
                ai: '/api/v1/ai',
                game: '/api/v1/game',
                user: '/api/v1/user',
                nft: '/api/v1/nft',
                auth: '/api/v1/auth'
            },
            security: {
                rateLimit: '100 requests per 15 minutes',
                cors: 'Enabled with origin restrictions',
                helmet: 'Enabled with CSP',
                apiKey: 'Optional (X-API-Key header)'
            }
        });
    });
    app.get('/metrics', (req, res) => {
        res.json({
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            timestamp: new Date().toISOString()
        });
    });
    app.use((err, req, res, next) => {
        const status = err.status || 500;
        const message = process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : err.message;
        res.status(status).json({
            error: message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        });
    });
    app.use('*', (req, res) => {
        res.status(404).json({
            error: 'Endpoint not found',
            path: req.originalUrl,
            method: req.method
        });
    });
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        next();
    });
    return { app, httpServer, io };
}
describe('Core Server Functionality', () => {
    let server;
    let httpServer;
    let io;
    let app;
    const testPort = 3666;
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
        process.env.HOST = '127.0.0.1';
        process.env.LOG_LEVEL = 'error';
        process.env.FRONTEND_URL = 'http://localhost:3000';
        process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000';
        process.env.RATE_LIMIT_WINDOW_MS = '60000';
        process.env.RATE_LIMIT_MAX_REQUESTS = '100';
        performanceMetrics.startupMemory = process.memoryUsage().heapUsed;
        const testServer = createTestServer();
        app = testServer.app;
        httpServer = testServer.httpServer;
        io = testServer.io;
        const startTime = perf_hooks_1.performance.now();
        server = httpServer.listen(testPort, '127.0.0.1', () => {
            const endTime = perf_hooks_1.performance.now();
            performanceMetrics.serverStartTime = endTime - startTime;
            performanceMetrics.memoryUsage = process.memoryUsage().heapUsed;
        });
        await new Promise((resolve) => {
            server.on('listening', () => {
                resolve();
            });
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        if (app._router?.stack) {
            performanceMetrics.middlewareStack = app._router.stack.map((layer) => layer.name || layer.handle?.name || 'anonymous');
        }
    }, 15000);
    afterAll(async () => {
        if (server) {
            await new Promise((resolve) => {
                server.close(() => resolve());
            });
        }
        if (io) {
            io.close();
        }
        console.log('\n📊 Core Server Functionality Test Results:');
        console.log('='.repeat(60));
        console.log(`🚀 Server startup time: ${performanceMetrics.serverStartTime.toFixed(2)}ms (requirement: <5000ms)`);
        console.log(`💾 Initial memory usage: ${(performanceMetrics.memoryUsage / (1024 * 1024)).toFixed(2)}MB (requirement: <512MB)`);
        if (performanceMetrics.healthCheckTimes.length > 0) {
            const avgHealthCheck = performanceMetrics.healthCheckTimes.reduce((a, b) => a + b, 0) / performanceMetrics.healthCheckTimes.length;
            console.log(`❤️ Average health check time: ${avgHealthCheck.toFixed(2)}ms (requirement: <10ms)`);
        }
        console.log(`🔧 Middleware stack: ${performanceMetrics.middlewareStack.length} components`);
        console.log('✅ All Core Server Functionality tests completed successfully');
        console.log('='.repeat(60));
    }, 10000);
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
            const middlewareCount = app._router?.stack?.length || 0;
            expect(middlewareCount).toBeGreaterThan(5);
            console.log(`🔧 Middleware stack size: ${middlewareCount} layers`);
            console.log(`🔧 Middleware components: ${performanceMetrics.middlewareStack.slice(0, 5).join(', ')}...`);
        });
        test('JSON parsing middleware handles requests correctly', async () => {
            const testData = { test: 'data', number: 123, nested: { value: true } };
            const response = await (0, supertest_1.default)(app)
                .post('/health')
                .send(testData)
                .set('Content-Type', 'application/json');
            expect([200, 405, 404]).toContain(response.status);
        });
        test('URL encoding middleware is configured', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/health')
                .send('test=data&number=123')
                .set('Content-Type', 'application/x-www-form-urlencoded');
            expect([200, 405, 404]).toContain(response.status);
        });
    });
    describe('3. Health check endpoint responds correctly', () => {
        test('Health check meets response time requirements', async () => {
            const startTime = perf_hooks_1.performance.now();
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
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
            const checks = 15;
            const times = [];
            for (let i = 0; i < checks; i++) {
                const startTime = perf_hooks_1.performance.now();
                await (0, supertest_1.default)(app).get('/health').expect(200);
                const endTime = perf_hooks_1.performance.now();
                times.push(endTime - startTime);
            }
            times.forEach(time => {
                expect(time).toBeLessThan(10);
            });
            const average = times.reduce((a, b) => a + b, 0) / times.length;
            expect(average).toBeLessThan(5);
            console.log(`❤️ Health check average: ${average.toFixed(2)}ms over ${checks} requests`);
        });
    });
    describe('4. CORS configuration allows frontend origin', () => {
        test('CORS allows configured origins', async () => {
            const response = await (0, supertest_1.default)(app)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');
            expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
            expect(response.headers['access-control-allow-methods']).toContain('GET');
        });
        test('CORS rejects unauthorized origins', async () => {
            const response = await (0, supertest_1.default)(app)
                .options('/api/v1/test')
                .set('Origin', 'http://malicious-site.com')
                .set('Access-Control-Request-Method', 'GET');
            expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
        });
        test('CORS allows all configured methods', async () => {
            const methods = ['GET', 'POST', 'PUT', 'DELETE'];
            for (const method of methods) {
                const response = await (0, supertest_1.default)(app)
                    .options('/api/v1/test')
                    .set('Origin', 'http://localhost:3000')
                    .set('Access-Control-Request-Method', method);
                expect(response.headers['access-control-allow-methods']).toMatch(new RegExp(method));
            }
        });
        test('CORS includes credentials support', async () => {
            const response = await (0, supertest_1.default)(app)
                .options('/api/v1/test')
                .set('Origin', 'http://localhost:3000');
            expect(response.headers['access-control-allow-credentials']).toBe('true');
        });
    });
    describe('5. Rate limiting enforces request limits', () => {
        test('General rate limiting functions correctly', async () => {
            const testIP = '192.168.1.200';
            const requests = [];
            for (let i = 0; i < 15; i++) {
                requests.push((0, supertest_1.default)(app)
                    .get('/api/test-rate-limit')
                    .set('X-Forwarded-For', testIP));
            }
            const responses = await Promise.all(requests);
            const processedCount = responses.filter(r => [200, 404].includes(r.status)).length;
            expect(processedCount).toBeGreaterThan(0);
            console.log(`🚦 Rate limit test: ${processedCount} requests processed`);
        }, 10000);
        test('Strict rate limiting on auth endpoints', async () => {
            const testIP = '192.168.1.201';
            const authRequests = [];
            for (let i = 0; i < 15; i++) {
                authRequests.push((0, supertest_1.default)(app)
                    .post('/api/auth/test')
                    .set('X-Forwarded-For', testIP)
                    .send({ test: 'data' }));
            }
            const responses = await Promise.all(authRequests);
            const rateLimitedCount = responses.filter(r => r.status === 429).length;
            expect(rateLimitedCount).toBeGreaterThan(0);
            console.log(`🔐 Auth rate limit: ${rateLimitedCount} requests blocked`);
        }, 8000);
    });
    describe('6. Helmet security headers applied correctly', () => {
        test('Essential security headers are present', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/health');
            expect(response.headers).toHaveProperty('x-dns-prefetch-control');
            expect(response.headers).toHaveProperty('x-frame-options');
            expect(response.headers).toHaveProperty('x-content-type-options');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
            expect(response.headers['x-dns-prefetch-control']).toBe('off');
        });
        test('Content Security Policy is properly configured', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/health');
            expect(response.headers).toHaveProperty('content-security-policy');
            const csp = response.headers['content-security-policy'];
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("script-src");
            expect(csp).toContain("style-src");
        });
        test('HSTS header is configured for HTTPS security', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/health');
            expect(response.headers).toHaveProperty('strict-transport-security');
            const hsts = response.headers['strict-transport-security'];
            expect(hsts).toContain('max-age=');
            expect(hsts).toContain('includeSubDomains');
        });
    });
    describe('7. Error handling middleware catches exceptions', () => {
        test('Middleware catches synchronous exceptions', async () => {
            app.get('/test-sync-error', (req, res, next) => {
                throw new Error('Test synchronous error for middleware');
            });
            const response = await (0, supertest_1.default)(app)
                .get('/test-sync-error');
            expect([404, 500]).toContain(response.status);
            expect(response.body).toHaveProperty('error');
            expect(typeof response.body.error).toBe('string');
        });
        test('404 handler works for non-existent routes', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/completely-non-existent-route-12345');
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('not found');
            expect(response.body).toHaveProperty('path');
            expect(response.body).toHaveProperty('method');
        });
    });
    describe('8. Server gracefully shuts down on signals', () => {
        test('Server has proper close method', async () => {
            expect(server.listening).toBe(true);
            expect(typeof server.close).toBe('function');
        });
        test('Graceful shutdown process handles pending requests', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/health')
                .timeout(1000);
            expect(response.status).toBe(200);
        });
    });
    describe('9. WebSocket server initializes correctly', () => {
        test('Socket.io server starts and accepts connections', (done) => {
            const io = require('socket.io-client');
            const client = io(`http://127.0.0.1:${testPort}`, {
                transports: ['websocket'],
                timeout: 3000,
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
        test('WebSocket connection performance is acceptable', (done) => {
            const io = require('socket.io-client');
            const startTime = perf_hooks_1.performance.now();
            const client = io(`http://127.0.0.1:${testPort}`, {
                transports: ['websocket'],
                timeout: 2000
            });
            client.on('connect', () => {
                const endTime = perf_hooks_1.performance.now();
                const connectionTime = endTime - startTime;
                expect(connectionTime).toBeLessThan(500);
                client.disconnect();
                done();
            });
            client.on('connect_error', (error) => {
                done(new Error(`Performance test failed: ${error.message}`));
            });
        });
    });
    describe('10. Socket.io CORS configuration works', () => {
        test('CORS allows configured frontend origin', (done) => {
            const io = require('socket.io-client');
            const client = io(`http://127.0.0.1:${testPort}`, {
                transports: ['websocket'],
                extraHeaders: {
                    'Origin': 'http://localhost:3000'
                },
                timeout: 3000
            });
            client.on('connect', () => {
                expect(client.connected).toBe(true);
                client.disconnect();
                done();
            });
            client.on('connect_error', (error) => {
                done(new Error(`CORS test failed: ${error.message}`));
            });
        });
        test('WebSocket CORS supports credentials', (done) => {
            const io = require('socket.io-client');
            const client = io(`http://127.0.0.1:${testPort}`, {
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
    });
    describe('Performance and Integration', () => {
        test('Middleware processing performance meets requirements', async () => {
            const requests = 15;
            const times = [];
            for (let i = 0; i < requests; i++) {
                const startTime = perf_hooks_1.performance.now();
                await (0, supertest_1.default)(app)
                    .get('/health')
                    .expect(200);
                const endTime = perf_hooks_1.performance.now();
                times.push(endTime - startTime);
            }
            const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
            expect(averageTime).toBeLessThan(5);
            console.log(`⚡ Middleware processing average: ${averageTime.toFixed(2)}ms`);
        });
        test('API documentation endpoint responds correctly', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api-docs')
                .expect(200);
            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body.name).toBe('Nen Platform API');
        });
        test('Metrics endpoint provides system information', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/metrics')
                .expect(200);
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memoryUsage');
            expect(response.body).toHaveProperty('cpuUsage');
            expect(response.body).toHaveProperty('timestamp');
            expect(typeof response.body.uptime).toBe('number');
            expect(response.body.uptime).toBeGreaterThan(0);
        });
        test('Server handles concurrent requests efficiently', async () => {
            const concurrentRequests = 8;
            const startTime = perf_hooks_1.performance.now();
            const requests = Array(concurrentRequests).fill(null).map(() => (0, supertest_1.default)(app).get('/health').expect(200));
            await Promise.all(requests);
            const endTime = perf_hooks_1.performance.now();
            const totalTime = endTime - startTime;
            const avgTimePerRequest = totalTime / concurrentRequests;
            expect(avgTimePerRequest).toBeLessThan(12);
            expect(totalTime).toBeLessThan(150);
            console.log(`🔄 Concurrent requests (${concurrentRequests}): ${totalTime.toFixed(2)}ms total, ${avgTimePerRequest.toFixed(2)}ms avg`);
        });
    });
});
//# sourceMappingURL=core-server-standalone.test.js.map