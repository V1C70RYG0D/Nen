"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const main_1 = __importDefault(require("../../main"));
const setup_1 = require("../../setup");
const testData_1 = require("../fixtures/testData");
describe('Marketplace API Integration Tests', () => {
    let server;
    let app;
    let testUserId;
    let testAgentId;
    beforeAll(async () => {
        await (0, setup_1.setupTestEnvironment)();
        server = new main_1.default();
        app = server.getApp();
        testUserId = await (0, testData_1.createTestUser)({
            username: 'test_user_market_api',
            email: 'test.market@nen.platform'
        });
        testAgentId = await (0, testData_1.createTestAgent)({
            name: 'Phantom Striker',
            type: 'agent',
            rarity: 'rare'
        });
    });
    afterAll(async () => {
        await (0, setup_1.cleanupTestEnvironment)();
    });
    describe('Agent Listing Retrieval', () => {
        test('should retrieve all agent listings successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/nft/marketplace')
                .expect(200);
            expect(response.body).toMatchObject({
                success: true,
                listings: expect.any(Array),
                total: expect.any(Number)
            });
            expect(response.body.listings.length).toBeGreaterThan(0);
        });
    });
    describe('Search Functionality', () => {
        test('should search agents by rarity successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/nft/marketplace')
                .query({ rarity: 'rare' })
                .expect(200);
            response.body.listings.forEach((agent) => {
                expect(agent.rarity).toBe('rare');
            });
        });
        test('should search agents by category successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/nft/marketplace')
                .query({ category: 'agent' })
                .expect(200);
            response.body.listings.forEach((agent) => {
                expect(agent.type).toBe('agent');
            });
        });
        test('should return empty array for non-existent category', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/nft/marketplace')
                .query({ category: 'nonexistent' })
                .expect(200);
            expect(response.body.listings).toEqual([]);
        });
    });
    describe('Purchase Confirmations', () => {
        test('should confirm agent purchase successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post(`/api/v1/nft/buy/${testAgentId}`)
                .send({ price: 10.0 })
                .set('Authorization', 'Bearer test_wallet_address')
                .expect(200);
            expect(response.body).toMatchObject({
                success: true,
                purchase: expect.any(Object)
            });
            const inventoryResponse = await (0, supertest_1.default)(app)
                .get(`/api/v1/nft/collection/${testUserId}`)
                .expect(200);
            expect(inventoryResponse.body.collection).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    tokenId: testAgentId
                })
            ]));
        });
        test('should handle insufficient funds error', async () => {
            const response = await (0, supertest_1.default)(app)
                .post(`/api/v1/nft/buy/${testAgentId}`)
                .send({ price: 1000000.0 })
                .set('Authorization', 'Bearer test_wallet_address')
                .expect(400);
            expect(response.body).toMatchObject({
                success: false,
                error: 'Insufficient funds'
            });
        });
    });
    describe('Inventory Updates', () => {
        test('should update inventory when agent is listed for sale', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/v1/nft/list')
                .send({
                tokenId: testAgentId,
                price: 10.0,
                duration: 24
            })
                .expect(200);
            const response = await (0, supertest_1.default)(app)
                .get(`/api/v1/nft/collection/${testUserId}`)
                .expect(200);
            expect(response.body.collection.some((nft) => nft.tokenId === testAgentId)).toBe(false);
        });
    });
});
//# sourceMappingURL=marketplace-api.test.js.map