"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ioredis_1 = __importDefault(require("ioredis"));
const Client = require('socket.io-client');
describe('WebSocket Connection Management', () => {
    let httpServer;
    let io;
    let redis;
    let serverPort;
    let clusterService;
    let logger;
    let activeClients = [];
    beforeAll(async () => {
        serverPort = parseInt(process.env.TEST_SERVER_PORT || (() => {
            throw new Error('TEST_SERVER_PORT must be set in environment variables. GI-18: No hardcoded values allowed.');
        })());
        httpServer = (0, http_1.createServer)();
        io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || process.env.TEST_REDIS_HOST || (() => {
                throw new Error('REDIS_HOST or TEST_REDIS_HOST must be set in environment variables. GI-18: No hardcoded values allowed.');
            })(),
            port: parseInt(process.env.REDIS_PORT || process.env.TEST_REDIS_PORT || (() => {
                throw new Error('REDIS_PORT or TEST_REDIS_PORT must be set in environment variables. GI-18: No hardcoded values allowed.');
            })()),
            maxRetriesPerRequest: 3,
            lazyConnect: true
        });
        try {
            await redis.connect();
        }
        catch (error) {
            console.warn('Redis connection failed, using in-memory fallback');
        }
        const gameNamespace = io.of('/game');
        gameNamespace.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'test-secret');
                socket.data.user = decoded;
                next();
            }
            catch (err) {
                next(new Error('Invalid authentication token'));
            }
        });
        const sessions = new Map();
        gameNamespace.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);
            socket.on('create-session', async (data, callback) => {
                try {
                    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const sessionData = {
                        id: sessionId,
                        creator: socket.data.user.userId,
                        players: [socket.data.user.userId],
                        createdAt: new Date().toISOString(),
                        status: 'waiting'
                    };
                    if (redis.status === 'ready') {
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
            socket.on('join-session', async (data, callback) => {
                try {
                    const { sessionId } = data;
                    let sessionData = null;
                    if (redis.status === 'ready') {
                        const stored = await redis.get(`session:${sessionId}`);
                        if (stored) {
                            sessionData = JSON.parse(stored);
                        }
                    }
                    else {
                        sessionData = sessions.get(sessionId);
                    }
                    if (!sessionData) {
                        return callback({ success: false, error: 'Session not found' });
                    }
                    if (!sessionData.players.includes(socket.data.user.userId)) {
                        sessionData.players.push(socket.data.user.userId);
                        if (redis.status === 'ready') {
                            await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(sessionData));
                        }
                        else {
                            sessions.set(sessionId, sessionData);
                        }
                    }
                    await socket.join(sessionId);
                    socket.to(sessionId).emit('player-joined', {
                        userId: socket.data.user.userId,
                        sessionData
                    });
                    callback({ success: true, sessionData });
                }
                catch (error) {
                    callback({ success: false, error: 'Failed to join session' });
                }
            });
            socket.on('leave-session', async (data, callback) => {
                try {
                    const { sessionId } = data;
                    await socket.leave(sessionId);
                    socket.to(sessionId).emit('player-left', {
                        userId: socket.data.user.userId
                    });
                    callback({ success: true });
                }
                catch (error) {
                    callback({ success: false, error: 'Failed to leave session' });
                }
            });
            socket.on('game-event', (data) => {
                const { sessionId, eventType, eventData } = data;
                socket.to(sessionId).emit('game-event', {
                    from: socket.data.user.userId,
                    eventType,
                    eventData,
                    timestamp: new Date().toISOString()
                });
            });
            socket.on('disconnect', async () => {
                console.log(`Client disconnected: ${socket.id}`);
                const rooms = Array.from(socket.rooms);
                for (const room of rooms) {
                    if (room !== socket.id) {
                        socket.to(room).emit('player-disconnected', {
                            userId: socket.data.user?.userId,
                            socketId: socket.id
                        });
                    }
                }
            });
        });
        await new Promise((resolve) => {
            httpServer.listen(serverPort, resolve);
        });
    });
    afterAll(async () => {
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
    test('should handle client connections successfully', async () => {
        const token = jsonwebtoken_1.default.sign({ userId: 'test-user-1' }, process.env.JWT_SECRET || 'test-secret');
        const client = new Client(`http://localhost:${serverPort}/game`, {
            auth: { token }
        });
        await new Promise((resolve, reject) => {
            client.on('connect', () => {
                expect(client.connected).toBe(true);
                client.disconnect();
                resolve();
            });
            client.on('connect_error', (error) => {
                reject(error);
            });
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
    });
    test('should handle room joining and leaving', async () => {
        const token = jsonwebtoken_1.default.sign({ userId: 'test-user-2' }, process.env.JWT_SECRET || 'test-secret');
        const client = new Client(`http://localhost:${serverPort}/game`, {
            auth: { token }
        });
        await new Promise((resolve, reject) => {
            client.on('connect', () => {
                client.emit('create-session', {}, (response) => {
                    expect(response.success).toBe(true);
                    expect(response.sessionId).toBeDefined();
                    const sessionId = response.sessionId;
                    client.emit('leave-session', { sessionId }, (leaveResponse) => {
                        expect(leaveResponse.success).toBe(true);
                        client.disconnect();
                        resolve();
                    });
                });
            });
            client.on('connect_error', reject);
            setTimeout(() => reject(new Error('Test timeout')), 5000);
        });
    });
    test('should clean up connections on disconnect', async () => {
        const token = jsonwebtoken_1.default.sign({ userId: 'test-user-3' }, process.env.JWT_SECRET || 'test-secret');
        const client = new Client(`http://localhost:${serverPort}/game`, {
            auth: { token }
        });
        await new Promise((resolve, reject) => {
            let sessionId;
            client.on('connect', () => {
                client.emit('create-session', {}, (response) => {
                    expect(response.success).toBe(true);
                    sessionId = response.sessionId;
                    client.disconnect();
                    setTimeout(() => {
                        const newClient = new Client(`http://localhost:${serverPort}/game`, {
                            auth: { token }
                        });
                        newClient.on('connect', () => {
                            newClient.emit('create-session', {}, (newResponse) => {
                                expect(newResponse.success).toBe(true);
                                newClient.disconnect();
                                resolve();
                            });
                        });
                        newClient.on('connect_error', reject);
                    }, 100);
                });
            });
            client.on('connect_error', reject);
            setTimeout(() => reject(new Error('Test timeout')), 5000);
        });
    });
    test('should handle multiple concurrent connections', async () => {
        const connectionPromises = [];
        const clients = [];
        for (let i = 0; i < 3; i++) {
            const token = jsonwebtoken_1.default.sign({ userId: `concurrent-user-${i}` }, process.env.JWT_SECRET || 'test-secret');
            const client = new Client(`http://localhost:${serverPort}/game`, {
                auth: { token }
            });
            clients.push(client);
            const connectionPromise = new Promise((resolve, reject) => {
                client.on('connect', () => {
                    expect(client.connected).toBe(true);
                    resolve();
                });
                client.on('connect_error', reject);
                setTimeout(() => reject(new Error(`Connection ${i} timeout`)), 5000);
            });
            connectionPromises.push(connectionPromise);
        }
        await Promise.all(connectionPromises);
        clients.forEach(client => client.disconnect());
    });
    test('should handle custom event emission', async () => {
        const token1 = jsonwebtoken_1.default.sign({ userId: 'event-user-1' }, process.env.JWT_SECRET || 'test-secret');
        const token2 = jsonwebtoken_1.default.sign({ userId: 'event-user-2' }, process.env.JWT_SECRET || 'test-secret');
        const client1 = new Client(`http://localhost:${serverPort}/game`, { auth: { token: token1 } });
        const client2 = new Client(`http://localhost:${serverPort}/game`, { auth: { token: token2 } });
        await new Promise((resolve, reject) => {
            let client1Connected = false;
            let client2Connected = false;
            let sessionId;
            const checkBothConnected = () => {
                if (client1Connected && client2Connected) {
                    client1.emit('create-session', {}, (response) => {
                        expect(response.success).toBe(true);
                        sessionId = response.sessionId;
                        client2.emit('join-session', { sessionId }, (joinResponse) => {
                            expect(joinResponse.success).toBe(true);
                            client2.on('game-event', (data) => {
                                expect(data.from).toBe('event-user-1');
                                expect(data.eventType).toBe('test-event');
                                expect(data.eventData.message).toBe('Hello from client1');
                                client1.disconnect();
                                client2.disconnect();
                                resolve();
                            });
                            client1.emit('game-event', {
                                sessionId,
                                eventType: 'test-event',
                                eventData: { message: 'Hello from client1' }
                            });
                        });
                    });
                }
            };
            client1.on('connect', () => {
                client1Connected = true;
                checkBothConnected();
            });
            client2.on('connect', () => {
                client2Connected = true;
                checkBothConnected();
            });
            client1.on('connect_error', reject);
            client2.on('connect_error', reject);
            setTimeout(() => reject(new Error('Event test timeout')), 5000);
        });
    });
    test('should handle broadcast functionality', async () => {
        const tokens = [
            jsonwebtoken_1.default.sign({ userId: 'broadcast-user-1' }, process.env.JWT_SECRET || 'test-secret'),
            jsonwebtoken_1.default.sign({ userId: 'broadcast-user-2' }, process.env.JWT_SECRET || 'test-secret'),
            jsonwebtoken_1.default.sign({ userId: 'broadcast-user-3' }, process.env.JWT_SECRET || 'test-secret')
        ];
        const clients = tokens.map(token => new Client(`http://localhost:${serverPort}/game`, { auth: { token } }));
        await new Promise((resolve, reject) => {
            let connectedCount = 0;
            let sessionId;
            let receivedCount = 0;
            const checkAllConnected = () => {
                if (connectedCount === 3) {
                    clients[0].emit('create-session', {}, (response) => {
                        expect(response.success).toBe(true);
                        sessionId = response.sessionId;
                        const joinPromises = clients.slice(1).map((client, index) => {
                            return new Promise((resolveJoin) => {
                                client.emit('join-session', { sessionId }, (joinResponse) => {
                                    expect(joinResponse.success).toBe(true);
                                    resolveJoin();
                                });
                            });
                        });
                        Promise.all(joinPromises).then(() => {
                            clients.slice(1).forEach(client => {
                                client.on('game-event', (data) => {
                                    expect(data.eventType).toBe('broadcast-test');
                                    receivedCount++;
                                    if (receivedCount === 2) {
                                        clients.forEach(client => client.disconnect());
                                        resolve();
                                    }
                                });
                            });
                            clients[0].emit('game-event', {
                                sessionId,
                                eventType: 'broadcast-test',
                                eventData: { message: 'Broadcast message' }
                            });
                        });
                    });
                }
            };
            clients.forEach(client => {
                client.on('connect', () => {
                    connectedCount++;
                    checkAllConnected();
                });
                client.on('connect_error', reject);
            });
            setTimeout(() => reject(new Error('Broadcast test timeout')), 5000);
        });
    });
    test('should validate authentication tokens', async () => {
        const invalidClient = new Client(`http://localhost:${serverPort}/game`, {
            auth: { token: 'invalid-token' }
        });
        await new Promise((resolve, reject) => {
            invalidClient.on('connect_error', (error) => {
                expect(error.message).toContain('Invalid authentication token');
                resolve();
            });
            invalidClient.on('connect', () => {
                invalidClient.disconnect();
                reject(new Error('Should not connect with invalid token'));
            });
            setTimeout(() => reject(new Error('Auth test timeout')), 5000);
        });
        const noTokenClient = new Client(`http://localhost:${serverPort}/game`);
        await new Promise((resolve, reject) => {
            noTokenClient.on('connect_error', (error) => {
                expect(error.message).toContain('Authentication token required');
                resolve();
            });
            noTokenClient.on('connect', () => {
                noTokenClient.disconnect();
                reject(new Error('Should not connect without token'));
            });
            setTimeout(() => reject(new Error('No token test timeout')), 5000);
        });
    });
    test('should handle reconnection scenarios', async () => {
        const token = jsonwebtoken_1.default.sign({ userId: 'reconnect-user' }, process.env.JWT_SECRET || 'test-secret');
        let client = new Client(`http://localhost:${serverPort}/game`, {
            auth: { token },
            autoConnect: false
        });
        await new Promise((resolve, reject) => {
            let sessionId;
            let reconnectCount = 0;
            const performReconnection = () => {
                if (reconnectCount >= 2) {
                    client.disconnect();
                    resolve();
                    return;
                }
                reconnectCount++;
                client.disconnect();
                setTimeout(() => {
                    client = new Client(`http://localhost:${serverPort}/game`, {
                        auth: { token }
                    });
                    client.on('connect', () => {
                        client.emit('create-session', {}, (response) => {
                            expect(response.success).toBe(true);
                            setTimeout(performReconnection, 100);
                        });
                    });
                    client.on('connect_error', reject);
                }, 100);
            };
            client.connect();
            client.on('connect', () => {
                client.emit('create-session', {}, (response) => {
                    expect(response.success).toBe(true);
                    sessionId = response.sessionId;
                    setTimeout(performReconnection, 100);
                });
            });
            client.on('connect_error', reject);
            setTimeout(() => reject(new Error('Reconnection test timeout')), 10000);
        });
    });
});
//# sourceMappingURL=connection.test.js.map