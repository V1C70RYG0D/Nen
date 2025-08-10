/**
 * Simple test for the minimal backend server
 * Following GI guidelines - testing real implementations
 */

import supertest from 'supertest';
import app from '../minimal-server';

describe('Minimal Backend Server', () => {
  const request = supertest(app);

  describe('Health Endpoints', () => {
    it('should return healthy status on root endpoint', async () => {
      const response = await request.get('/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Nen Platform API');
      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('version', '0.1.0');
    });

    it('should return health check information', async () => {
      const response = await request.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
    });
  });

  describe('API Endpoints', () => {
    it('should return matches endpoint with empty data', async () => {
      const response = await request.get('/api/matches');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('matches', []);
      expect(response.body).toHaveProperty('total', 0);
      expect(response.body).toHaveProperty('filter', 'all');
    });

    it('should return 404 for non-existent match', async () => {
      const response = await request.get('/api/matches/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Match not found');
    });

    it('should return agents endpoint with empty data', async () => {
      const response = await request.get('/api/agents');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('agents', []);
      expect(response.body).toHaveProperty('total', 0);
    });

    it('should return stats endpoint with zero values', async () => {
      const response = await request.get('/api/stats');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activeMatches', 0);
      expect(response.body).toHaveProperty('totalPool', 0);
      expect(response.body).toHaveProperty('playersOnline', 0);
    });

    it('should return 501 for betting endpoint', async () => {
      const response = await request.post('/api/bets')
        .send({ matchId: 'test', agentId: 'agent1', amount: 100 });
      
      expect(response.status).toBe(501);
      expect(response.body).toHaveProperty('error', 'Not implemented');
    });

    it('should return auth status', async () => {
      const response = await request.get('/api/auth/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('should return demo user data', async () => {
      const response = await request.get('/api/users/me');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'demo-user');
      expect(response.body).toHaveProperty('username', 'demo');
    });

    it('should return empty betting pools', async () => {
      const response = await request.get('/api/betting/pools');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pools', []);
      expect(response.body).toHaveProperty('total', 0);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request.get('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('availableRoutes');
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers', async () => {
      const response = await request.get('/health');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});
