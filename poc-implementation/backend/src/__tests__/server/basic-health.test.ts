/**
 * Quick Server Health Test - Basic Verification
 * Simplified test to verify basic server functionality
 */

import request from 'supertest';
import app from '../../server-production-ready';

describe('Basic Server Health', () => {
    test('Health endpoint responds', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(response.body).toHaveProperty('status');
    });

    test('API docs endpoint responds', async () => {
        const response = await request(app)
            .get('/api-docs')
            .expect(200);

        expect(response.body).toHaveProperty('name');
        expect(response.body.name).toBe('Nen Platform API');
    });

    test('Metrics endpoint responds', async () => {
        const response = await request(app)
            .get('/metrics')
            .expect(200);

        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('memoryUsage');
    });

    test('404 for non-existent routes', async () => {
        const response = await request(app)
            .get('/non-existent-route-xyz')
            .expect(404);

        expect(response.body).toHaveProperty('error');
    });
});
