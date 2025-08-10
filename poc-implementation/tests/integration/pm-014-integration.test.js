/**
 * Test Suite 3.3: Comprehensive Integration Testing
 * Test Case: PM-014 - End-to-End Integration
 *
 * Validates complete system integration, ensuring seamless user journeys and component interactions.
 */

const request = require('supertest');
const expect = require('chai').expect;
const io = require('socket.io-client');

// Mocks
const mockUserData = require('./mocks/mockUserData');

const API_BASE_URL = process.env.API_URL || process.env.DEFAULT_API_URL;
const WEBSOCKET_URL = process.env.WEBSOCKET_URL || process.env.DEFAULT_WEBSOCKET_URL;

if (!API_BASE_URL) {
}

if (!WEBSOCKET_URL) {
}

// Utility functions for tests
async function createUserAndLogin() {
  // Simulate user signup
  const signUpResponse = await request(API_BASE_URL)
    .post('/api/register')
    .send(mockUserData.newUser)
    .expect(201);

  expect(signUpResponse.body).to.have.property('token');
  return signUpResponse.body.token;
}

async function setupAuthenticatedWebSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(WEBSOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      timeout: 5000
    });

    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

// Test suite

describe('PM-014: End-to-End Integration', () => {
  let token;
  let socketClient;

  before(async () => {
    token = await createUserAndLogin(); // User setup
    socketClient = await setupAuthenticatedWebSocket(token); // WebSocket setup
  });

  after(() => {
    if (socketClient) {
      socketClient.close();
    }
  });

  describe('1. Complete User Journey', () => {
    it('User journey from registration to gameplay', async () => {
      // Mock gameplay scenario
      const joinGameResponse = await request(API_BASE_URL)
        .post('/api/game/join')
        .set('Authorization', `Bearer ${token}`)
        .send({ gameId: 'test-game' })
        .expect(200);

      expect(joinGameResponse.body).to.have.property('status', 'joined');
    });
  });

  describe('2. Cross-Service Communication', () => {
    it('Services communicate reliably', async () => {
      // Test inter-service communication
      const commsResponse = await request(API_BASE_URL)
        .get('/api/service/status')
        .expect(200);

      expect(commsResponse.body).to.have.property('status', 'all-good');
    });
  });

  describe('3. Error Handling', () => {
    it('Error propagation and handling', async () => {
      // Simulate error scenario
      const errorResponse = await request(API_BASE_URL)
        .get('/api/nonexistent')
        .expect(404);

      expect(errorResponse.body).to.have.property('error');
    });
  });

  describe('4. Data Consistency', () => {
    it('Data consistency across services', async () => {
      // Validate data integrity
      const dataResponse = await request(API_BASE_URL)
        .get('/api/user/data')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(dataResponse.body).to.deep.include(mockUserData.newUser);
    });
  });

  describe('5. Performance Under Load', () => {
    it('Performance targets met under realistic load', async () => {
      // Use existing load test from setup
      const loadResponse = await request(API_BASE_URL)
        .get('/api/performance/test')
        .expect(200);

      expect(loadResponse.body).to.have.property('averageResponseTime');
      expect(loadResponse.body.averageResponseTime).to.be.below(1000);
    });
  });

  describe('6. Security Validation', () => {
    it('Security vulnerabilities addressed', async () => {
      // Perform security checks
      const securityResponse = await request(API_BASE_URL)
        .get('/api/security/check')
        .expect(200);

      expect(securityResponse.body).to.have.property('vulnerabilities', 0);
    });
  });

  describe('7. Disaster Recovery', () => {
    it('Recovery procedures effective', async () => {
      // Test recovery scenario
      const recoverResponse = await request(API_BASE_URL)
        .post('/api/recovery/simulate')
        .expect(200);

      expect(recoverResponse.body).to.have.property('status', 'recovered');
    });
  });
});

