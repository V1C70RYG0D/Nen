"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_production_ready_1 = __importDefault(require("../../server-production-ready"));
describe('Basic Server Health', () => {
    test('Health endpoint responds', async () => {
        const response = await (0, supertest_1.default)(server_production_ready_1.default)
            .get('/health')
            .expect(200);
        expect(response.body).toHaveProperty('status');
    });
    test('API docs endpoint responds', async () => {
        const response = await (0, supertest_1.default)(server_production_ready_1.default)
            .get('/api-docs')
            .expect(200);
        expect(response.body).toHaveProperty('name');
        expect(response.body.name).toBe('Nen Platform API');
    });
    test('Metrics endpoint responds', async () => {
        const response = await (0, supertest_1.default)(server_production_ready_1.default)
            .get('/metrics')
            .expect(200);
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('memoryUsage');
    });
    test('404 for non-existent routes', async () => {
        const response = await (0, supertest_1.default)(server_production_ready_1.default)
            .get('/non-existent-route-xyz')
            .expect(404);
        expect(response.body).toHaveProperty('error');
    });
});
//# sourceMappingURL=basic-health.test.js.map