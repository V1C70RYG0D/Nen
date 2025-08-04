"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const perf_hooks_1 = require("perf_hooks");
const Client = require('socket.io-client');
jest.setTimeout(30000);
describe('Simple Real-Time Update Tests', () => {
    let httpServer;
    let io;
    let serverPort;
    let testClients = [];
    beforeAll(async () => {
        httpServer = (0, http_1.createServer)();
        io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        await new Promise((resolve) => {
            httpServer.listen(0, () => {
                serverPort = httpServer.address()?.port || 0;
                console.log(`Test server started on port ${serverPort}`);
                resolve();
            });
        });
        io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);
            socket.on('test-message', (data, callback) => {
                const startTime = perf_hooks_1.performance.now();
                if (callback) {
                    callback({
                        success: true,
                        receivedData: data,
                        serverTimestamp: Date.now(),
                        processingTime: perf_hooks_1.performance.now() - startTime
                    });
                }
            });
            socket.on('broadcast-event', (data) => {
                socket.broadcast.emit('broadcast-event', {
                    ...data,
                    from: socket.id,
                    serverTimestamp: Date.now()
                });
            });
            socket.on('ping', (timestamp, callback) => {
                if (callback) {
                    callback({
                        latency: Date.now() - timestamp,
                        serverTimestamp: Date.now()
                    });
                }
            });
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });
        });
    });
    afterAll(async () => {
        testClients.forEach(client => {
            if (client && client.connected) {
                client.disconnect();
            }
        });
        testClients = [];
        if (io) {
            io.close();
        }
        if (httpServer) {
            httpServer.close();
        }
    });
    afterEach(() => {
        testClients.forEach(client => {
            if (client && client.connected) {
                client.disconnect();
            }
        });
        testClients = [];
    });
    const createTestClient = () => {
        return new Promise((resolve, reject) => {
            const client = new Client(`http://localhost:${serverPort}`, {
                timeout: 30000,
                forceNew: true,
                transports: ['websocket', 'polling']
            });
            client.on('connect', () => {
                console.log(`Test client connected`);
                resolve(client);
            });
            client.on('connect_error', (error) => {
                console.error(`Test client connection failed:`, error);
                reject(error);
            });
            testClients.push(client);
        });
    };
    test('should establish basic WebSocket connection', async () => {
        const client = await createTestClient();
        expect(client.connected).toBe(true);
    });
    test('should deliver messages within acceptable time', async () => {
        const client = await createTestClient();
        const messagePromise = new Promise((resolve) => {
            const startTime = perf_hooks_1.performance.now();
            client.emit('test-message', { message: 'latency-test' }, (response) => {
                const latency = perf_hooks_1.performance.now() - startTime;
                expect(response.success).toBe(true);
                expect(response.receivedData.message).toBe('latency-test');
                resolve(latency);
            });
        });
        const latency = await messagePromise;
        expect(latency).toBeLessThan(500);
        console.log(`Message delivery latency: ${latency.toFixed(2)}ms`);
    });
    test('should measure ping-pong latency accurately', async () => {
        const client = await createTestClient();
        const pingPromise = new Promise((resolve) => {
            const startTime = Date.now();
            client.emit('ping', startTime, (response) => {
                const latency = response.latency;
                expect(latency).toBeGreaterThan(0);
                expect(latency).toBeLessThan(200);
                resolve(latency);
            });
        });
        const latency = await pingPromise;
        console.log(`Ping latency: ${latency}ms`);
    });
    test('should broadcast events to multiple clients', async () => {
        const numClients = 2;
        const clients = await Promise.all(Array.from({ length: numClients }, () => createTestClient()));
        expect(clients).toHaveLength(numClients);
        clients.forEach(client => expect(client.connected).toBe(true));
        let receivedCount = 0;
        const broadcastPromise = new Promise((resolve) => {
            clients[1].on('broadcast-event', (data) => {
                expect(data.message).toBe('broadcast-test');
                expect(data.from).toBe(clients[0].id);
                receivedCount++;
                resolve();
            });
        });
        clients[0].emit('broadcast-event', { message: 'broadcast-test' });
        await broadcastPromise;
        expect(receivedCount).toBe(1);
    });
    test('should handle multiple concurrent connections', async () => {
        const numClients = 3;
        const clients = await Promise.all(Array.from({ length: numClients }, (_, i) => createTestClient()));
        clients.forEach(client => {
            expect(client.connected).toBe(true);
        });
        const pingPromises = clients.map(client => {
            return new Promise((resolve) => {
                const startTime = Date.now();
                client.emit('ping', startTime, (response) => {
                    resolve(response.latency);
                });
            });
        });
        const latencies = await Promise.all(pingPromises);
        latencies.forEach(latency => {
            expect(latency).toBeGreaterThan(0);
            expect(latency).toBeLessThan(200);
        });
        const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
        console.log(`Average connection latency: ${avgLatency.toFixed(2)}ms`);
    });
});
//# sourceMappingURL=realTimeSimple.test.js.map