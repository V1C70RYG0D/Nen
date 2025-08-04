"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
describe('Health Check Tests', () => {
    let app;
    beforeAll(() => {
        app = (0, express_1.default)();
        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '0.1.0',
                environment: 'test'
            });
        });
    });
    test('GET /health should return healthy status', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/health')
            .expect(200);
        expect(response.body).toMatchObject({
            status: 'healthy',
            version: '0.1.0',
            environment: 'test'
        });
        expect(response.body.timestamp).toBeDefined();
    });
    test('should handle invalid routes with 404', async () => {
        await (0, supertest_1.default)(app)
            .get('/nonexistent')
            .expect(404);
    });
});
//# sourceMappingURL=health.test.js.map