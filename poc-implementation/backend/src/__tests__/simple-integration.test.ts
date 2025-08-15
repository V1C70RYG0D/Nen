/**
 * Simple Working System Test
 * Testing that both backend and AI services are operational
 */

// Simple test using axios to verify services are working
const axios = require('axios');

describe('Nen Platform Basic Integration', () => {
  const backendUrl = 'http://127.0.0.1:3001';
  const aiServiceUrl = 'http://127.0.0.1:3003';
  
  test('backend health endpoint responds correctly', async () => {
    try {
      const response = await axios.get(`${backendUrl}/health`);
      console.log('Backend Health:', response.status, response.data.status);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
    } catch (error) {
      console.error('Backend health check failed:', error.message);
      throw error;
    }
  });

  test('AI service health endpoint responds correctly', async () => {
    try {
      const response = await axios.get(`${aiServiceUrl}/health`);
      console.log('AI Service Health:', response.status, response.data.status);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
    } catch (error) {
      console.error('AI service health check failed:', error.message);
      throw error;
    }
  });

  test('backend API endpoints are working', async () => {
    const endpoints = [
      '/',
      '/api/matches',
      '/api/agents', 
      '/api/stats',
      '/api/auth/status',
      '/api/users/me'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${backendUrl}${endpoint}`);
        console.log(`Backend ${endpoint}:`, response.status);
        expect(response.status).toBe(200);
      } catch (error) {
        console.error(`Backend ${endpoint} failed:`, error.message);
        throw error;
      }
    }
  });

  test('AI service can generate moves', async () => {
    try {
      const testBoard = {
        board: [[[]]],
        difficulty: 'medium'
      };
      
      const response = await axios.post(`${aiServiceUrl}/ai/move`, testBoard);
      console.log('AI Move Generation:', response.status, 'Success:', response.data.success);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.move).toBeDefined();
    } catch (error) {
      console.error('AI move generation failed:', error.message);
      throw error;
    }
  });
});
