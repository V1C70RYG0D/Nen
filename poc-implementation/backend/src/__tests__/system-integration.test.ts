/**
 * Comprehensive System Integration Test
 * Following GI guidelines - testing real implementations, no mocks for end-to-end verification
 */

import axios from 'axios';

describe('Nen Platform System Integration', () => {
  const backendUrl = 'http://127.0.0.1:3001';
  const aiServiceUrl = 'http://127.0.0.1:3003';
  
  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test backend connectivity
    try {
      const response = await axios.get(`${backendUrl}/health`, { timeout: 5000 });
      expect(response.status).toBe(200);
      console.log('✅ Backend service is ready');
    } catch (error) {
      throw new Error(`Backend service not available: ${error}`);
    }

    // Test AI service connectivity
    try {
      const response = await axios.get(`${aiServiceUrl}/health`, { timeout: 5000 });
      expect(response.status).toBe(200);
      console.log('✅ AI service is ready');
    } catch (error) {
      throw new Error(`AI service not available: ${error}`);
    }
  });

  describe('Backend API Health Checks', () => {
    it('should return healthy status from root endpoint', async () => {
      const response = await axios.get(`${backendUrl}/`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('name', 'Nen Platform API');
      expect(response.data).toHaveProperty('status', 'running');
      expect(response.data).toHaveProperty('version', '0.1.0');
      expect(response.data).toHaveProperty('timestamp');
    });

    it('should return detailed health information', async () => {
      const response = await axios.get(`${backendUrl}/health`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('uptime');
      expect(response.data).toHaveProperty('memory');
      expect(typeof response.data.uptime).toBe('number');
      expect(response.data.memory).toHaveProperty('rss');
    });
  });

  describe('Backend API Endpoints', () => {
    it('should handle matches endpoint correctly', async () => {
      const response = await axios.get(`${backendUrl}/api/matches`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('matches', []);
      expect(response.data).toHaveProperty('total', 0);
      expect(response.data).toHaveProperty('filter', 'all');
      expect(response.data).toHaveProperty('timestamp');
    });

    it('should handle agents endpoint correctly', async () => {
      const response = await axios.get(`${backendUrl}/api/agents`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('agents', []);
      expect(response.data).toHaveProperty('total', 0);
      expect(response.data).toHaveProperty('timestamp');
    });

    it('should handle stats endpoint correctly', async () => {
      const response = await axios.get(`${backendUrl}/api/stats`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('activeMatches', 0);
      expect(response.data).toHaveProperty('totalPool', 0);
      expect(response.data).toHaveProperty('playersOnline', 0);
      expect(response.data).toHaveProperty('timestamp');
    });

    it('should return 404 for non-existent routes', async () => {
      try {
        await axios.get(`${backendUrl}/non-existent-route`);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty('error', 'Not Found');
        expect(error.response.data).toHaveProperty('availableRoutes');
        expect(Array.isArray(error.response.data.availableRoutes)).toBe(true);
      }
    });
  });

  describe('AI Service Integration', () => {
    it('should return AI service health status', async () => {
      const response = await axios.get(`${aiServiceUrl}/health`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('service', 'ai-service');
      expect(response.data).toHaveProperty('version', '0.1.0');
      expect(response.data).toHaveProperty('timestamp');
    });

    it('should return AI service information', async () => {
      const response = await axios.get(`${aiServiceUrl}/`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('service', 'Nen Platform AI Service');
      expect(response.data).toHaveProperty('status', 'running');
      expect(response.data).toHaveProperty('endpoints');
      expect(response.data.endpoints).toHaveProperty('ai_move', '/ai/move');
    });

    it('should handle AI move generation request', async () => {
      const testBoard = {
        board: [[[]]],  // Simplified board state
        difficulty: 'medium'
      };

      const response = await axios.post(`${aiServiceUrl}/ai/move`, testBoard, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('move');
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.move).toHaveProperty('from');
      expect(response.data.move).toHaveProperty('to');
      expect(response.data.move).toHaveProperty('confidence');
    });

    it('should handle AI board analysis request', async () => {
      const testBoard = {
        board: [[[]]],  // Simplified board state
      };

      const response = await axios.post(`${aiServiceUrl}/ai/analysis`, testBoard, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('analysis');
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.analysis).toHaveProperty('board_evaluation');
      expect(response.data.analysis).toHaveProperty('best_moves');
      expect(Array.isArray(response.data.analysis.best_moves)).toBe(true);
    });

    it('should handle AI difficulty setting', async () => {
      const difficultyRequest = { difficulty: 'hard' };

      const response = await axios.post(`${aiServiceUrl}/ai/difficulty`, difficultyRequest, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('difficulty', 'hard');
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('parameters');
      expect(response.data.parameters).toHaveProperty('search_depth');
    });
  });

  describe('CORS Configuration', () => {
    it('should include proper CORS headers in backend responses', async () => {
      const response = await backendRequest.get('/health');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const response = await backendRequest.options('/api/matches');
      
      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid AI requests gracefully', async () => {
      try {
        await axios.post(`${aiServiceUrl}/ai/move`, {}, {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data).toHaveProperty('message');
      }
    });

    it('should handle invalid backend requests gracefully', async () => {
      const response = await backendRequest.post('/api/bets')
        .send({ invalid: 'data' });
      
      expect(response.status).toBe(501);
      expect(response.body).toHaveProperty('error', 'Not implemented');
    });
  });

  describe('Performance Characteristics', () => {
    it('should respond to health checks within reasonable time', async () => {
      const startTime = Date.now();
      const response = await backendRequest.get('/health');
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        backendRequest.get('/health')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'healthy');
      });
    });
  });
});
