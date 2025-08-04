"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const main_1 = __importDefault(require("../../main"));
const setup_1 = require("../../setup");
const testData_1 = require("../fixtures/testData");
const websocketMock_1 = require("../mocks/websocketMock");
describe('Match Data API Integration Tests', () => {
    let server;
    let app;
    let wsClient;
    let testMatchId;
    let testUserId;
    beforeAll(async () => {
        await (0, setup_1.setupTestEnvironment)();
        server = new main_1.default();
        app = server.getApp();
        testUserId = await (0, testData_1.createTestUser)({
            username: 'test_user_match_api',
            email: 'test.match@nen.platform'
        });
        testMatchId = await (0, testData_1.createTestMatch)({
            matchType: 'ai_vs_ai',
            aiAgent1Id: 'royal_guard_alpha',
            aiAgent2Id: 'phantom_striker',
            status: 'active'
        });
    });
    afterAll(async () => {
        if (wsClient) {
            wsClient.disconnect();
        }
        await (0, setup_1.cleanupTestEnvironment)();
    });
    describe('Match Listing Retrieval', () => {
        test('should retrieve all active matches successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .expect(200);
            expect(response.body).toMatchObject({
                success: true,
                data: expect.any(Array),
                count: expect.any(Number)
            });
            expect(response.body.data.length).toBeGreaterThan(0);
            const match = response.body.data[0];
            expect(match).toHaveProperty('id');
            expect(match).toHaveProperty('matchType');
            expect(match).toHaveProperty('status');
            expect(match).toHaveProperty('createdAt');
            if (match.bettingPool) {
                expect(match.bettingPool).toHaveProperty('totalPool');
                expect(match.bettingPool).toHaveProperty('pools');
            }
        });
        test('should handle pagination for match listings', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .query({ page: 1, limit: 5 })
                .expect(200);
            expect(response.body.data.length).toBeLessThanOrEqual(5);
            expect(response.body).toHaveProperty('count');
        });
        test('should filter matches by status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .query({ status: 'active' })
                .expect(200);
            response.body.data.forEach((match) => {
                expect(match.status).toBe('active');
            });
        });
        test('should filter matches by match type', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .query({ matchType: 'ai_vs_ai' })
                .expect(200);
            response.body.data.forEach((match) => {
                expect(match.matchType).toBe('ai_vs_ai');
            });
        });
        test('should return empty array when no matches found', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .query({ status: 'nonexistent_status' })
                .expect(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.count).toBe(0);
        });
    });
    describe('Match Detail Fetching', () => {
        test('should retrieve specific match details successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get(`/api/v1/match/${testMatchId}`)
                .expect(200);
            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    id: testMatchId,
                    matchType: expect.any(String),
                    status: expect.any(String),
                    createdAt: expect.any(String)
                })
            });
            const match = response.body.data;
            expect(match).toHaveProperty('aiAgent1Id');
            expect(match).toHaveProperty('aiAgent2Id');
            expect(match).toHaveProperty('gameState');
            if (match.bettingPool) {
                expect(match.bettingPool).toHaveProperty('totalPool');
                expect(match.bettingPool).toHaveProperty('pools');
            }
        });
        test('should return 404 for non-existent match', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match/non-existent-match-id')
                .expect(404);
            expect(response.body).toMatchObject({
                success: false,
                error: 'Match not found'
            });
        });
        test('should handle invalid match ID format', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match/invalid-id-format!')
                .expect(404);
            expect(response.body).toMatchObject({
                success: false,
                error: 'Match not found'
            });
        });
        test('should include move history for active matches', async () => {
            await (0, supertest_1.default)(app)
                .post(`/api/v1/match/${testMatchId}/moves`)
                .send({
                from: { x: 0, y: 0 },
                to: { x: 1, y: 0 },
                piece: 'pawn',
                playerId: testUserId
            })
                .expect(200);
            const response = await (0, supertest_1.default)(app)
                .get(`/api/v1/match/${testMatchId}`)
                .expect(200);
            const match = response.body.data;
            expect(match.gameState).toHaveProperty('moveHistory');
            expect(Array.isArray(match.gameState.moveHistory)).toBe(true);
        });
        test('should retrieve match history endpoint', async () => {
            const response = await (0, supertest_1.default)(app)
                .get(`/api/v1/match/${testMatchId}/history`)
                .expect(200);
            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    matchId: testMatchId,
                    moveHistory: expect.any(Array),
                    status: expect.any(String)
                })
            });
        });
    });
    describe('Real-time Updates', () => {
        beforeEach(async () => {
            wsClient = await (0, websocketMock_1.mockWebSocketClient)('http://localhost:3001');
        });
        afterEach(() => {
            if (wsClient) {
                wsClient.disconnect();
                wsClient = null;
            }
        });
        test('should receive real-time match updates via websocket', (done) => {
            wsClient.on('connect', () => {
                wsClient.emit('join', `match:${testMatchId}`);
                wsClient.on('match:update', (data) => {
                    expect(data).toHaveProperty('matchId', testMatchId);
                    expect(data).toHaveProperty('type');
                    expect(data).toHaveProperty('timestamp');
                    done();
                });
                setTimeout(async () => {
                    await (0, supertest_1.default)(app)
                        .post(`/api/v1/match/${testMatchId}/moves`)
                        .send({
                        from: { x: 1, y: 0 },
                        to: { x: 2, y: 0 },
                        piece: 'pawn',
                        playerId: testUserId
                    });
                }, 100);
            });
        }, 10000);
        test('should receive game state updates in real-time', (done) => {
            wsClient.on('connect', () => {
                wsClient.emit('join', `match:${testMatchId}`);
                wsClient.on('gameState:update', (data) => {
                    expect(data).toHaveProperty('matchId', testMatchId);
                    expect(data).toHaveProperty('gameState');
                    expect(data.gameState).toHaveProperty('board');
                    expect(data.gameState).toHaveProperty('currentPlayer');
                    done();
                });
                setTimeout(async () => {
                    await (0, supertest_1.default)(app)
                        .post(`/api/v1/match/${testMatchId}/start`)
                        .expect(200);
                }, 100);
            });
        }, 10000);
        test('should receive betting pool updates in real-time', (done) => {
            wsClient.on('connect', () => {
                wsClient.emit('join', `match:${testMatchId}`);
                wsClient.on('bettingPool:update', (data) => {
                    expect(data).toHaveProperty('matchId', testMatchId);
                    expect(data).toHaveProperty('bettingPool');
                    expect(data.bettingPool).toHaveProperty('totalPool');
                    done();
                });
                setTimeout(async () => {
                    await (0, supertest_1.default)(app)
                        .post('/api/v1/betting/place')
                        .send({
                        matchId: testMatchId,
                        agentId: 'royal_guard_alpha',
                        amount: 1.0,
                        odds: 2.5
                    })
                        .set('Authorization', 'Bearer test_wallet_address');
                }, 100);
            });
        }, 10000);
        test('should handle websocket connection errors gracefully', (done) => {
            wsClient.on('connect_error', (error) => {
                expect(error).toBeDefined();
                done();
            });
            const badClient = (0, websocketMock_1.mockWebSocketClient)('http://localhost:9999');
            badClient.connect();
        });
        test('should authenticate websocket connections', (done) => {
            const authenticatedClient = (0, websocketMock_1.mockWebSocketClient)('http://localhost:3001', {
                auth: { token: 'valid_test_token' }
            });
            authenticatedClient.on('connect', () => {
                expect(true).toBe(true);
                authenticatedClient.disconnect();
                done();
            });
            authenticatedClient.on('connect_error', (error) => {
                fail(`Authentication failed: ${error.message}`);
            });
        });
    });
    describe('Error Handling', () => {
        test('should handle server errors gracefully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .set('X-Force-Error', 'true')
                .expect(500);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.any(String),
                message: expect.any(String)
            });
        });
        test('should validate request parameters', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/match')
                .send({
                matchType: 'invalid_type'
            })
                .expect(400);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.any(String)
            });
        });
        test('should handle network timeouts', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .timeout(1000)
                .expect(200);
            expect(response.body.success).toBe(true);
        });
        test('should handle concurrent requests properly', async () => {
            const requests = Array.from({ length: 10 }, () => (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .expect(200));
            const responses = await Promise.all(requests);
            responses.forEach(response => {
                expect(response.body.success).toBe(true);
                expect(response.body.data).toBeDefined();
            });
        });
        test('should handle malformed JSON gracefully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/match')
                .type('json')
                .send('{"invalid": json}')
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        test('should rate limit excessive requests', async () => {
            const requests = Array.from({ length: 105 }, () => (0, supertest_1.default)(app)
                .get('/api/v1/match'));
            const responses = await Promise.all(requests);
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
        test('should handle database connection errors', async () => {
            process.env.DATABASE_CONNECTION_ERROR = 'true';
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .expect(500);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringContaining('database')
            });
            delete process.env.DATABASE_CONNECTION_ERROR;
        });
    });
    describe('Performance and Load Testing', () => {
        test('should handle high load efficiently', async () => {
            const startTime = Date.now();
            const requests = Array.from({ length: 50 }, () => (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .expect(200));
            await Promise.all(requests);
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(duration).toBeLessThan(5000);
        });
        test('should cache frequently accessed match data', async () => {
            const response1 = await (0, supertest_1.default)(app)
                .get(`/api/v1/match/${testMatchId}`)
                .expect(200);
            const startTime = Date.now();
            const response2 = await (0, supertest_1.default)(app)
                .get(`/api/v1/match/${testMatchId}`)
                .expect(200);
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(response1.body.data.id).toBe(response2.body.data.id);
            expect(duration).toBeLessThan(100);
        });
        test('should handle memory usage efficiently', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            for (let i = 0; i < 20; i++) {
                await (0, supertest_1.default)(app)
                    .get('/api/v1/match')
                    .expect(200);
            }
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
    });
    describe('Security Testing', () => {
        test('should prevent SQL injection attacks', async () => {
            const maliciousInput = "'; DROP TABLE matches; --";
            const response = await (0, supertest_1.default)(app)
                .get(`/api/v1/match/${maliciousInput}`)
                .expect(404);
            expect(response.body).toMatchObject({
                success: false,
                error: 'Match not found'
            });
        });
        test('should sanitize user input', async () => {
            const xssInput = '<script>alert("xss")</script>';
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/match')
                .send({
                matchType: 'ai_vs_ai',
                aiAgent1Id: xssInput,
                aiAgent2Id: 'phantom_striker'
            })
                .expect(400);
            expect(response.body.error).not.toContain('<script>');
        });
        test('should validate authentication tokens', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/match')
                .set('Authorization', 'Bearer invalid_token')
                .send({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'royal_guard_alpha',
                aiAgent2Id: 'phantom_striker'
            })
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
        test('should enforce CORS policies', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/match')
                .set('Origin', 'https://malicious-site.com')
                .expect(200);
            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });
    });
});
//# sourceMappingURL=match-data-api.test.js.map