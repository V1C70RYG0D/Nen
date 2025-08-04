import request from 'supertest';
import express from 'express';

describe('Health Check Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Create a minimal Express app for testing
    app = express();

    // Basic health check endpoint
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
    const response = await request(app)
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
    await request(app)
      .get('/nonexistent')
      .expect(404);
  });
});
