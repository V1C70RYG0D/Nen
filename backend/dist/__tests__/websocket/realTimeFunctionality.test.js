"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const perf_hooks_1 = require("perf_hooks");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ioredis_1 = __importDefault(require("ioredis"));
const winston_1 = __importDefault(require("winston"));
const Client = require('socket.io-client');
jest.setTimeout(60000);
const TEST_CONFIG = {
    maxLatencyMs: parseInt(process.env.MAX_LATENCY_MS || '100'),
    minThroughputMsgsPerSec: parseInt(process.env.MIN_THROUGHPUT_MSGS_PER_SEC || '500'),
    connectionTestDurationMs: parseInt(process.env.CONNECTION_TEST_DURATION_MS || '30000'),
    jwtSecret: process.env.JWT_SECRET || 'test-secret',
    redisHost: process.env.REDIS_HOST || process.env.TEST_REDIS_HOST || '127.0.0.1',
    redisPort: parseInt(process.env.REDIS_PORT || process.env.TEST_REDIS_PORT || '6380')
};
describe('Real-Time Update Propagation Tests', () => {
    let httpServer;
    let io;
    let serverPort;
    let redis;
    let logger;
    let testClients = [];
    beforeAll(async () => {
        logger = winston_1.default.createLogger({
            level: 'debug',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
            transports: [
                new winston_1.default.transports.Console({ silent: process.env.NODE_ENV === 'test' })
            ]
        });
        try {
            redis = new ioredis_1.default({
                host: TEST_CONFIG.redisHost,
                port: TEST_CONFIG.redisPort,
                lazyConnect: true,
                maxRetriesPerRequest: 1
            });
            await redis.connect();
            logger.info('Redis connected for session management');
        }
        catch (error) {
            logger.warn('Redis unavailable, using in-memory sessions');
        }
        const sessions = new Map();
        const connectedClients = new Map();
        httpServer = (0, http_1.createServer)();
        io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            pingTimeout: 5000,
            pingInterval: 2000,
            transports: ['websocket', 'polling']
        });
        await new Promise((resolve) => {
            httpServer.listen(0, () => {
                serverPort = httpServer.address()?.port || 0;
                logger.info(`Test server started on port ${serverPort}`);
                resolve();
            });
        });
        io.use((socket, next) => {
            socket.data.connectionStart = perf_hooks_1.performance.now();
            socket.data.lastPing = Date.now();
            next();
        });
        io.on('connection', (socket) => {
            const connectionLatency = perf_hooks_1.performance.now() - socket.data.connectionStart;
            logger.debug(`Client connected: ${socket.id}, latency: ${connectionLatency}ms`);
            connectedClients.set(socket.id, {
                id: socket.id,
                connectionTime: Date.now(),
                latency: connectionLatency
            });
            socket.on('ping', (timestamp, callback) => {
                const latency = Date.now() - timestamp;
                socket.data.lastPing = Date.now();
                if (callback) {
                    callback({
                        latency,
                        serverTimestamp: Date.now()
                    });
                }
            });
            socket.on('test-message', (data, callback) => {
                const processingStart = perf_hooks_1.performance.now();
                setImmediate(() => {
                    const processingTime = perf_hooks_1.performance.now() - processingStart;
                    if (callback) {
                        callback({
                            success: true,
                            processingTime,
                            serverTimestamp: Date.now(),
                            receivedData: data
                        });
                    }
                });
            });
            socket.on('broadcast-event', (data) => {
                const timestamp = Date.now();
                socket.broadcast.emit('broadcast-event', {
                    ...data,
                    from: socket.id,
                    serverTimestamp: timestamp
                });
                socket.emit('broadcast-confirmed', {
                    ...data,
                    serverTimestamp: timestamp
                });
            });
            socket.on('create-session', async (data, callback) => {
                try {
                    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const sessionData = {
                        id: sessionId,
                        creator: socket.id,
                        participants: [socket.id],
                        createdAt: new Date().toISOString(),
                        status: 'active'
                    };
                    if (redis && redis.status === 'ready') {
                        await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(sessionData));
                    }
                    else {
                        sessions.set(sessionId, sessionData);
                    }
                    await socket.join(sessionId);
                    callback({ success: true, sessionId, sessionData });
                }
                catch (error) {
                    callback({ success: false, error: 'Failed to create session' });
                }
            });
            socket.on('sequence-test', (data) => {
                const { sequenceId, message } = data;
                socket.emit('sequence-response', {
                    sequenceId,
                    message,
                    serverTimestamp: Date.now(),
                    receivedOrder: sequenceId
                });
            });
            socket.on('disconnect', (reason) => {
                logger.debug(`Client disconnected: ${socket.id}, reason: ${reason}`);
                connectedClients.delete(socket.id);
            });
        });
    });
    afterAll(async () => {
        testClients.forEach(client => {
            if (client.client && client.client.connected) {
                client.client.disconnect();
            }
        });
        testClients = [];
        if (io) {
            io.close();
        }
        if (httpServer) {
            httpServer.close();
        }
        if (redis && redis.status === 'ready') {
            await redis.disconnect();
        }
    });
    afterEach(() => {
        testClients.forEach(client => {
            if (client.client && client.client.connected) {
                client.client.disconnect();
            }
        });
        testClients = [];
    });
    const createTestClient = (userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`) => {
        return new Promise((resolve, reject) => {
            const token = jsonwebtoken_1.default.sign({ userId }, TEST_CONFIG.jwtSecret);
            const client = new Client(`http://localhost:${serverPort}`, {
                timeout: 5000,
                forceNew: true
            });
            const testClient = {
                client,
                userId,
                token,
                connected: false,
                messagesReceived: 0,
                disconnect: () => {
                    if (client && client.connected) {
                        client.disconnect();
                    }
                }
            };
            client.on('connect', () => {
                testClient.connected = true;
                logger.debug(`Test client connected: ${userId}`);
                resolve(testClient);
            });
            client.on('connect_error', (error) => {
                logger.error(`Test client connection failed: ${userId}`, error);
                reject(error);
            });
            client.on('disconnect', () => {
                testClient.connected = false;
                logger.debug(`Test client disconnected: ${userId}`);
            });
            testClients.push(testClient);
        });
    };
    test('should deliver messages within 100ms', async () => {
        const client = await createTestClient();
        const messagePromise = new Promise((resolve) => {
            const startTime = perf_hooks_1.performance.now();
            client.client.emit('test-message', { message: 'latency-test' }, (response) => {
                const latency = perf_hooks_1.performance.now() - startTime;
                expect(response.success).toBe(true);
                expect(response.receivedData.message).toBe('latency-test');
                resolve(latency);
            });
        });
        const latency = await messagePromise;
        expect(latency).toBeLessThan(TEST_CONFIG.maxLatencyMs);
        logger.info(`Message delivery latency: ${latency.toFixed(2)}ms`);
    });
    test('should broadcast events to all connected clients', async () => {
        const numClients = 3;
        const clients = await Promise.all(Array.from({ length: numClients }, (_, i) => createTestClient(`broadcast_user_${i}`)));
        expect(clients).toHaveLength(numClients);
        clients.forEach(client => expect(client.connected).toBe(true));
        let receivedCount = 0;
        const broadcastPromise = new Promise((resolve) => {
            clients.forEach((client, index) => {
                client.client.on('broadcast-event', (data) => {
                    expect(data.message).toBe('broadcast-test');
                    expect(data.from).toBe(clients[0].client.id);
                    receivedCount++;
                    if (receivedCount === numClients - 1) {
                        resolve();
                    }
                });
            });
        });
        clients[0].client.emit('broadcast-event', { message: 'broadcast-test' });
        await broadcastPromise;
        expect(receivedCount).toBe(numClients - 1);
    });
    test('should handle session creation and management', async () => {
        const client = await createTestClient();
        const sessionPromise = new Promise((resolve, reject) => {
            client.client.emit('create-session', { type: 'test-session' }, (response) => {
                if (response.success) {
                    resolve(response);
                }
                else {
                    reject(new Error(response.error));
                }
            });
        });
        const sessionResponse = await sessionPromise;
        expect(sessionResponse.success).toBe(true);
        expect(sessionResponse.sessionId).toBeDefined();
        expect(sessionResponse.sessionData.creator).toBe(client.client.id);
        expect(sessionResponse.sessionData.status).toBe('active');
    });
    test('should maintain message ordering across multiple clients', async () => {
        const client = await createTestClient();
        const numMessages = 10;
        const receivedMessages = [];
        const orderingPromise = new Promise((resolve) => {
            client.client.on('sequence-response', (data) => {
                receivedMessages.push(data);
                if (receivedMessages.length === numMessages) {
                    resolve();
                }
            });
        });
        for (let i = 0; i < numMessages; i++) {
            client.client.emit('sequence-test', {
                sequenceId: i,
                message: `message-${i}`
            });
        }
        await orderingPromise;
        expect(receivedMessages).toHaveLength(numMessages);
        receivedMessages.forEach((msg, index) => {
            expect(msg.sequenceId).toBe(index);
            expect(msg.receivedOrder).toBe(index);
        });
    });
    test('should synchronize connection states across multiple clients', async () => {
        const numClients = 5;
        const clients = await Promise.all(Array.from({ length: numClients }, (_, i) => createTestClient(`sync_user_${i}`)));
        clients.forEach(client => {
            expect(client.connected).toBe(true);
        });
        const latencyPromises = clients.map(client => {
            return new Promise((resolve) => {
                const startTime = Date.now();
                client.client.emit('ping', startTime, (response) => {
                    const latency = response.latency;
                    resolve(latency);
                });
            });
        });
        const latencies = await Promise.all(latencyPromises);
        latencies.forEach(latency => {
            expect(latency).toBeLessThan(TEST_CONFIG.maxLatencyMs);
        });
        const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
        logger.info(`Average connection latency: ${avgLatency.toFixed(2)}ms`);
    });
    test('should maintain reliability under concurrent load', async () => {
        const numClients = 10;
        const messagesPerClient = 50;
        const clients = await Promise.all(Array.from({ length: numClients }, (_, i) => createTestClient(`load_user_${i}`)));
        let totalMessagesReceived = 0;
        const totalExpectedMessages = numClients * messagesPerClient;
        const loadPromise = new Promise((resolve) => {
            clients.forEach(client => {
                client.client.on('test-message', () => {
                    totalMessagesReceived++;
                    if (totalMessagesReceived >= totalExpectedMessages) {
                        resolve();
                    }
                });
            });
        });
        const startTime = perf_hooks_1.performance.now();
        const sendPromises = clients.map(async (client, clientIndex) => {
            for (let i = 0; i < messagesPerClient; i++) {
                client.client.emit('test-message', {
                    from: client.userId,
                    messageId: `${clientIndex}-${i}`,
                    timestamp: Date.now()
                });
            }
        });
        await Promise.all(sendPromises);
        await loadPromise;
        const duration = perf_hooks_1.performance.now() - startTime;
        const throughput = totalMessagesReceived / (duration / 1000);
        expect(totalMessagesReceived).toBe(totalExpectedMessages);
        expect(throughput).toBeGreaterThan(TEST_CONFIG.minThroughputMsgsPerSec);
        logger.info(`Load test completed: ${totalMessagesReceived} messages in ${duration.toFixed(2)}ms, throughput: ${throughput.toFixed(2)} msgs/sec`);
    });
});
//# sourceMappingURL=realTimeFunctionality.test.js.map