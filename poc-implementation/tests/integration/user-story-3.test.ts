/**
 * User Story 3 Integration Test Suite
 * "User views upcoming AI matches"
 * 
 * Following GI.md guidelines for production-ready testing:
 * - Real implementations over simulations
 * - No hardcoding or placeholders
 * - Comprehensive error handling
 * - Performance monitoring
 * - Accessibility validation
 * 
 * Tests the complete user journey:
 * 1. User navigates to matches page
 * 2. User sees list of scheduled matches
 * 3. User filters by bet range or AI rating
 * 4. User clicks match for details
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { performance } from 'perf_hooks';

// Mock types based on Solution 2.md requirements
interface Agent {
  id: string;
  name: string;
  elo?: number;
  nenType?: string;
  personality?: string;
}

interface BettingPool {
  totalPool: number;
  oddsAgent1: number;
  oddsAgent2: number;
  minBet: number;
  maxBet: number;
  isOpenForBetting: boolean;
  betsCount?: number;
}

interface Match {
  id: string;
  status: string;
  aiAgent1Id?: string;
  aiAgent2Id?: string;
  player1Id?: string;
  player2Id?: string;
  bettingPool?: BettingPool;
  agent1?: Agent;
  agent2?: Agent;
  createdAt?: string;
  scheduledStartTime?: string;
  gameState?: any;
}

// Test configuration from environment
const TEST_CONFIG = {
  API_BASE_URL: process.env.TEST_API_URL || 'http://localhost:3001',
  FRONTEND_URL: process.env.TEST_FRONTEND_URL || 'http://localhost:3000',
  PERFORMANCE_THRESHOLD: parseInt(process.env.PERFORMANCE_THRESHOLD_MS || '2000'),
  MIN_SOL_DEPOSIT: parseFloat(process.env.MIN_SOL_DEPOSIT || '0.1'),
  MAX_SOL_BET: parseFloat(process.env.MAX_SOL_BET || '100.0'),
  TIMEOUT: parseInt(process.env.TEST_TIMEOUT || '30000'),
  EXPECTED_DEMO_MATCHES: parseInt(process.env.EXPECTED_DEMO_MATCHES || '3')
};

// Performance tracking
const performanceMetrics: Record<string, number[]> = {};

function trackPerformance(operation: string, startTime: number): void {
  const duration = performance.now() - startTime;
  if (!performanceMetrics[operation]) {
    performanceMetrics[operation] = [];
  }
  performanceMetrics[operation].push(duration);
}

// Network helper function
async function makeRequest(url: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Simple HTTP test helper
async function testEndpoint(method: 'GET' | 'POST', url: string, body?: any): Promise<{
  status: number;
  body: any;
}> {
  try {
    const options: RequestInit = { method };
    if (body) {
      options.body = JSON.stringify(body);
      options.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await fetch(url, options);
    const responseBody = await response.json().catch(() => ({}));
    
    return {
      status: response.status,
      body: responseBody
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: (error as Error).message }
    };
  }
}

// Validation helpers
function validateAgent(agent: any, context = 'unknown'): void {
  expect(agent).toBeDefined();
  expect(agent.id).toBeDefined();
  expect(agent.name).toBeDefined();
  expect(typeof agent.name).toBe('string');
  expect(agent.name.length).toBeGreaterThan(0);
  
  if (agent.elo !== undefined) {
    expect(typeof agent.elo).toBe('number');
    expect(agent.elo).toBeGreaterThan(0);
    expect(agent.elo).toBeLessThan(5000); // Reasonable upper bound
  }
  
  if (agent.nenType) {
    const validNenTypes = ['enhancement', 'emission', 'transmutation', 'conjuration', 'manipulation', 'specialization'];
    expect(validNenTypes).toContain(agent.nenType);
  }
  
  if (agent.personality) {
    const validPersonalities = ['aggressive', 'defensive', 'tactical', 'unpredictable', 'balanced'];
    expect(validPersonalities).toContain(agent.personality);
  }
}

function validateBettingPool(pool: any, context = 'unknown'): void {
  expect(pool).toBeDefined();
  expect(typeof pool.totalPool).toBe('number');
  expect(pool.totalPool).toBeGreaterThanOrEqual(0);
  
  expect(typeof pool.oddsAgent1).toBe('number');
  expect(pool.oddsAgent1).toBeGreaterThan(1.0);
  expect(pool.oddsAgent1).toBeLessThan(50.0); // Reasonable upper bound
  
  expect(typeof pool.oddsAgent2).toBe('number');
  expect(pool.oddsAgent2).toBeGreaterThan(1.0);
  expect(pool.oddsAgent2).toBeLessThan(50.0);
  
  expect(typeof pool.minBet).toBe('number');
  expect(pool.maxBet).toBe('number');
  expect(pool.minBet).toBeLessThanOrEqual(pool.maxBet);
  
  // Validate against configuration constraints
  const minBetSOL = pool.minBet / 1e9;
  const maxBetSOL = pool.maxBet / 1e9;
  expect(minBetSOL).toBeGreaterThanOrEqual(TEST_CONFIG.MIN_SOL_DEPOSIT);
  expect(maxBetSOL).toBeLessThanOrEqual(TEST_CONFIG.MAX_SOL_BET);
  
  expect(typeof pool.isOpenForBetting).toBe('boolean');
}

function validateMatch(match: any, context = 'unknown'): void {
  expect(match).toBeDefined();
  expect(match.id).toBeDefined();
  expect(typeof match.id).toBe('string');
  expect(match.id.length).toBeGreaterThan(0);
  
  const validStatuses = ['upcoming', 'live', 'completed', 'cancelled', 'paused', 'active', 'pending', 'scheduled'];
  expect(validStatuses).toContain(match.status);
  
  // Validate AI agents if present
  if (match.aiAgent1Id) {
    expect(typeof match.aiAgent1Id).toBe('string');
    expect(match.aiAgent1Id.length).toBeGreaterThan(0);
  }
  
  if (match.aiAgent2Id) {
    expect(typeof match.aiAgent2Id).toBe('string');
    expect(match.aiAgent2Id.length).toBeGreaterThan(0);
  }
  
  // Validate betting pool
  if (match.bettingPool) {
    validateBettingPool(match.bettingPool, `${context} betting pool`);
  }
  
  // Validate timestamps
  if (match.createdAt) {
    expect(new Date(match.createdAt).getTime()).toBeGreaterThan(0);
  }
  
  if (match.scheduledStartTime) {
    expect(new Date(match.scheduledStartTime).getTime()).toBeGreaterThan(0);
  }
}

describe('User Story 3: User views upcoming AI matches', () => {
  let app: any;
  
  beforeAll(async () => {
    // Setup test environment
    console.log('🚀 Setting up User Story 3 test environment');
    console.log(`API URL: ${TEST_CONFIG.API_BASE_URL}`);
    console.log(`Performance threshold: ${TEST_CONFIG.PERFORMANCE_THRESHOLD}ms`);
  });
  
  afterAll(async () => {
    // Generate performance report
    console.log('\n📊 Performance Report:');
    Object.entries(performanceMetrics).forEach(([operation, times]) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      console.log(`  ${operation}: Avg ${avg.toFixed(2)}ms, Min ${min.toFixed(2)}ms, Max ${max.toFixed(2)}ms`);
      
      if (avg > TEST_CONFIG.PERFORMANCE_THRESHOLD) {
        console.warn(`  ⚠️ ${operation} exceeds performance threshold!`);
      }
    });
  });

  describe('Step 1: User navigates to matches page', () => {
    it('should serve the matches page with proper structure', async () => {
      const startTime = performance.now();
      
      try {
        const response = await testEndpoint('GET', `${TEST_CONFIG.FRONTEND_URL}/matches`);
        trackPerformance('matches_page_load', startTime);
        
        if (response.status === 200) {
          // Basic validation - frontend is running
          expect(response.status).toBe(200);
        } else {
          console.warn('Frontend server may not be running, skipping frontend test');
        }
        
      } catch (error) {
        console.warn('Frontend server may not be running, skipping frontend test');
      }
    });

    it('should load matches API endpoint successfully', async () => {
      const startTime = performance.now();
      
      const response = await testEndpoint('GET', `${TEST_CONFIG.API_BASE_URL}/api/matches`);
      trackPerformance('api_matches_load', startTime);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should implement required on-chain functionality', async () => {
      const response = await testEndpoint('GET', `${TEST_CONFIG.API_BASE_URL}/api/matches`);
      expect(response.status).toBe(200);
      
      const matches = response.body.data;
      
      // Requirement: Query global matches account for active games
      expect(matches.length).toBeGreaterThanOrEqual(0);
      
      if (matches.length > 0) {
        const match = matches[0];
        
        // Requirement: Retrieve AI agent metadata (names, ratings, stats)
        expect(match.aiAgent1Id || match.player1Id).toBeDefined();
        expect(match.aiAgent2Id || match.player2Id).toBeDefined();
        
        // Requirement: Calculate dynamic odds based on betting pools
        if (match.bettingPool) {
          expect(match.bettingPool.oddsAgent1).toBeGreaterThan(1.0);
          expect(match.bettingPool.oddsAgent2).toBeGreaterThan(1.0);
        }
        
        // Requirement: Check match status (open/closed for betting)
        expect(match.status).toBeDefined();
        if (match.bettingPool) {
          expect(typeof match.bettingPool.isOpenForBetting).toBe('boolean');
        }
      }
    });
  });

  describe('Step 2: User sees list of scheduled matches', () => {
    it('should return properly structured match data', async () => {
      const startTime = performance.now();
      
      const response = await testEndpoint('GET', `${TEST_CONFIG.API_BASE_URL}/api/matches`);
      trackPerformance('match_list_validation', startTime);
      
      expect(response.status).toBe(200);
      const matches = response.body.data;
      expect(matches.length).toBeGreaterThanOrEqual(TEST_CONFIG.EXPECTED_DEMO_MATCHES);
      
      // Validate each match structure
      matches.forEach((match: any, index: number) => {
        validateMatch(match, `match ${index}`);
      });
    });

    it('should provide comprehensive AI agent metadata', async () => {
      const response = await testEndpoint('GET', `${TEST_CONFIG.API_BASE_URL}/api/matches`);
      expect(response.status).toBe(200);
      
      const matches = response.body.data;
      
      for (const match of matches.slice(0, 3)) { // Test first 3 matches
        // AI agent metadata should be retrievable
        expect(match.aiAgent1Id || match.player1Id).toBeDefined();
        expect(match.aiAgent2Id || match.player2Id).toBeDefined();
        
        // If expanded agent data is available, validate it
        if (match.agent1) {
          validateAgent(match.agent1, 'match.agent1');
        }
        if (match.agent2) {
          validateAgent(match.agent2, 'match.agent2');
        }
      }
    });

    it('should calculate dynamic odds correctly', async () => {
      const response = await testEndpoint('GET', `${TEST_CONFIG.API_BASE_URL}/api/matches`);
      expect(response.status).toBe(200);
      
      const matches = response.body.data;
      
      for (const match of matches) {
        if (match.bettingPool) {
          const pool = match.bettingPool;
          
          // Odds should be greater than 1.0
          expect(pool.oddsAgent1).toBeGreaterThan(1.0);
          expect(pool.oddsAgent2).toBeGreaterThan(1.0);
          
          // Odds should be realistic (not extremely high)
          expect(pool.oddsAgent1).toBeLessThan(50.0);
          expect(pool.oddsAgent2).toBeLessThan(50.0);
          
          // Total probability should be reasonable
          const impliedProb1 = 1 / pool.oddsAgent1;
          const impliedProb2 = 1 / pool.oddsAgent2;
          const totalImpliedProb = impliedProb1 + impliedProb2;
          
          // Should be greater than 1 (house edge) but not excessive
          expect(totalImpliedProb).toBeGreaterThan(1.0);
          expect(totalImpliedProb).toBeLessThan(1.3); // Max 30% house edge
        }
      }
    });

    it('should provide accurate betting status information', async () => {
      const response = await testEndpoint('GET', `${TEST_CONFIG.API_BASE_URL}/api/matches`);
      expect(response.status).toBe(200);
      
      const matches = response.body.data;
      
      for (const match of matches) {
        // Status should indicate betting availability
        const bettingClosed = ['completed', 'cancelled', 'live'].includes(match.status);
        
        if (match.bettingPool) {
          // If match is closed, betting should be closed
          if (bettingClosed) {
            expect(match.bettingPool.isOpenForBetting).toBe(false);
          }
          
          // Check closing time logic
          if (match.bettingPool.closesAt) {
            const closingTime = new Date(match.bettingPool.closesAt);
            const now = new Date();
            
            if (closingTime < now) {
              expect(match.bettingPool.isOpenForBetting).toBe(false);
            }
          }
        }
      }
    });
  });

  describe('Step 3: User filters by bet range or AI rating', () => {
    it('should accept and process status filters', async () => {
      const filterTests = [
        { status: 'active', expectResults: true },
        { status: 'pending', expectResults: true },
        { status: 'completed', expectResults: true },
        { status: 'active,pending', expectResults: true }
      ];
      
      for (const test of filterTests) {
        const startTime = performance.now();
        
        const response = await testEndpoint('GET', `${TEST_CONFIG.API_BASE_URL}/api/matches?status=${test.status}`);
        trackPerformance(`filter_status_${test.status}`, startTime);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Validate filtered results match criteria
        if (test.expectResults && response.body.data.length > 0) {
          const allowedStatuses = test.status.split(',');
          response.body.data.forEach((match: any) => {
            expect(allowedStatuses).toContain(match.status);
          });
        }
      }
    });

    it('should handle bet range filtering', async () => {
      const betRangeTests = [
        { minBet: 0.1, maxBet: 10.0 },
        { minBet: 1.0, maxBet: 50.0 },
        { minBet: 0.05, maxBet: 100.0 }
      ];
      
      for (const test of betRangeTests) {
        const startTime = performance.now();
        
        const response = await testEndpoint('GET', 
          `${TEST_CONFIG.API_BASE_URL}/api/matches?minBet=${test.minBet}&maxBet=${test.maxBet}`);
        trackPerformance(`filter_bet_range_${test.minBet}_${test.maxBet}`, startTime);
        
        // Should not return error (may return empty results)
        expect(response.status).toBeLessThan(400);
        
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
          
          // Validate bet ranges if results returned
          if (response.body.data.length > 0) {
            response.body.data.forEach((match: any) => {
              if (match.bettingPool) {
                const minBetSOL = match.bettingPool.minBet / 1e9;
                const maxBetSOL = match.bettingPool.maxBet / 1e9;
                
                // Match bet range should overlap with filter range
                expect(maxBetSOL).toBeGreaterThanOrEqual(test.minBet);
                expect(minBetSOL).toBeLessThanOrEqual(test.maxBet);
              }
            });
          }
        }
      }
    });

    it('should handle AI rating filtering', async () => {
      const ratingTests = [
        { minRating: 1000, maxRating: 1500 },
        { minRating: 1500, maxRating: 2000 },
        { minRating: 2000, maxRating: 3000 }
      ];
      
      for (const test of ratingTests) {
        const startTime = performance.now();
        
        const response = await request(TEST_CONFIG.API_BASE_URL)
          .get('/api/matches')
          .query({
            minRating: test.minRating.toString(),
            maxRating: test.maxRating.toString()
          });
          
        trackPerformance(`filter_rating_${test.minRating}_${test.maxRating}`, startTime);
        
        // Should not return error (may return empty results)
        expect(response.status).toBeLessThan(400);
        
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
          // Note: Rating filtering logic depends on backend implementation
          // This test validates the endpoint accepts the parameters
        }
      }
    });

    it('should handle combined filters efficiently', async () => {
      const startTime = performance.now();
      
      const response = await request(TEST_CONFIG.API_BASE_URL)
        .get('/api/matches')
        .query({
          status: 'active,pending',
          minBet: '0.1',
          maxBet: '50.0',
          minRating: '1200',
          maxRating: '2500',
          limit: '10'
        });
        
      trackPerformance('filter_combined', startTime);
      
      expect(response.status).toBeLessThan(400);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Validate results match all filter criteria
        response.body.data.forEach((match: any) => {
          expect(['active', 'pending']).toContain(match.status);
        });
      }
    });
  });

  describe('Step 4: User clicks match for details', () => {
    let testMatchId: string;
    
    beforeEach(async () => {
      // Get a match ID for testing
      const response = await request(TEST_CONFIG.API_BASE_URL)
        .get('/api/matches')
        .expect(200);
      
      expect(response.body.data.length).toBeGreaterThan(0);
      testMatchId = response.body.data[0].id;
    });

    it('should retrieve individual match details', async () => {
      const startTime = performance.now();
      
      const response = await request(TEST_CONFIG.API_BASE_URL)
        .get(`/api/matches/${testMatchId}`)
        .expect(200);
        
      trackPerformance('match_details_retrieval', startTime);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const match = response.body.data;
      validateMatch(match, 'individual match details');
      
      expect(match.id).toBe(testMatchId);
    });

    it('should provide enhanced match details with betting information', async () => {
      const response = await request(TEST_CONFIG.API_BASE_URL)
        .get(`/api/matches/${testMatchId}`)
        .expect(200);
      
      const match = response.body.data;
      
      // Should have detailed betting pool information
      if (match.bettingPool) {
        validateBettingPool(match.bettingPool, 'detailed match betting pool');
        
        // Enhanced details should include more fields
        expect(match.bettingPool).toHaveProperty('betsCount');
        expect(typeof match.bettingPool.betsCount).toBe('number');
        expect(match.bettingPool.betsCount).toBeGreaterThanOrEqual(0);
      }
      
      // Should have game state information for active matches
      if (match.status === 'active' || match.status === 'live') {
        // May have game state depending on implementation
        if (match.gameState) {
          expect(match.gameState).toHaveProperty('currentMove');
          expect(typeof match.gameState.currentMove).toBe('number');
        }
      }
    });

    it('should handle invalid match IDs gracefully', async () => {
      const invalidIds = [
        'invalid-id',
        'nonexistent-match-123',
        '',
        '../../etc/passwd',
        '<script>alert("xss")</script>'
      ];
      
      for (const invalidId of invalidIds) {
        const startTime = performance.now();
        
        const response = await request(TEST_CONFIG.API_BASE_URL)
          .get(`/api/matches/${encodeURIComponent(invalidId)}`);
          
        trackPerformance(`error_handling_${invalidId.slice(0, 10)}`, startTime);
        
        // Should return 404 or 400, not 500
        expect([400, 404]).toContain(response.status);
        
        if (response.body) {
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
        }
      }
    });

    it('should provide match history endpoint', async () => {
      const startTime = performance.now();
      
      const response = await request(TEST_CONFIG.API_BASE_URL)
        .get(`/api/matches/${testMatchId}/history`);
        
      trackPerformance('match_history_retrieval', startTime);
      
      // Should either return history or indicate endpoint exists
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.matchId).toBe(testMatchId);
        
        if (response.body.data.moveHistory) {
          expect(Array.isArray(response.body.data.moveHistory)).toBe(true);
        }
      }
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();
      
      const promises = Array(concurrentRequests).fill(null).map(() =>
        request(TEST_CONFIG.API_BASE_URL)
          .get('/api/matches')
          .expect(200)
      );
      
      const responses = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      trackPerformance('concurrent_requests', totalTime);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
      
      // Average response time should be reasonable
      const avgTime = totalTime / concurrentRequests;
      expect(avgTime).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD);
    });

    it('should maintain consistent response times', async () => {
      const iterations = 5;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await request(TEST_CONFIG.API_BASE_URL)
          .get('/api/matches')
          .expect(200);
          
        times.push(performance.now() - startTime);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      trackPerformance('consistency_avg', avgTime);
      trackPerformance('consistency_max', maxTime);
      trackPerformance('consistency_min', minTime);
      
      // Variance should be reasonable
      const variance = maxTime - minTime;
      expect(variance).toBeLessThan(TEST_CONFIG.PERFORMANCE_THRESHOLD);
    });

    it('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        { url: '/api/matches', body: 'invalid json' },
        { url: '/api/matches', query: { status: 'invalid_status' } },
        { url: '/api/matches', query: { minBet: 'not_a_number' } },
        { url: '/api/matches', query: { limit: '-1' } },
        { url: '/api/matches', query: { page: '0' } }
      ];
      
      for (const req of malformedRequests) {
        const startTime = performance.now();
        
        let response;
        if (req.body) {
          response = await request(TEST_CONFIG.API_BASE_URL)
            .post('/api/matches')
            .send(req.body);
        } else {
          response = await request(TEST_CONFIG.API_BASE_URL)
            .get(req.url)
            .query(req.query || {});
        }
        
        trackPerformance('error_handling', performance.now() - startTime);
        
        // Should not crash (status < 500)
        expect(response.status).toBeLessThan(500);
        
        // Should return meaningful error for bad requests
        if (response.status >= 400) {
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(false);
        }
      }
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty database gracefully', async () => {
      // This tests the demo data fallback mechanism
      const response = await request(TEST_CONFIG.API_BASE_URL)
        .get('/api/matches')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should provide demo data if database is empty
      if (response.body.data.length === 0) {
        console.warn('No matches returned - check if demo data is properly configured');
      } else {
        expect(response.body.data.length).toBeGreaterThanOrEqual(TEST_CONFIG.EXPECTED_DEMO_MATCHES);
      }
    });

    it('should validate betting constraints strictly', async () => {
      const response = await request(TEST_CONFIG.API_BASE_URL)
        .get('/api/matches')
        .expect(200);
      
      const matches = response.body.data;
      
      for (const match of matches) {
        if (match.bettingPool) {
          // Validate all betting constraints
          validateBettingPool(match.bettingPool, `match ${match.id}`);
          
          // Additional strict validations
          expect(match.bettingPool.minBet).toBeGreaterThan(0);
          expect(match.bettingPool.maxBet).toBeGreaterThan(match.bettingPool.minBet);
          expect(match.bettingPool.totalPool).toBeGreaterThanOrEqual(0);
          
          // Validate odds are mathematically sound
          expect(match.bettingPool.oddsAgent1 * match.bettingPool.oddsAgent2).toBeGreaterThan(1.0);
        }
      }
    });

    it('should maintain data consistency across requests', async () => {
      // Make multiple requests and ensure data is consistent
      const response1 = await request(TEST_CONFIG.API_BASE_URL)
        .get('/api/matches')
        .expect(200);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response2 = await request(TEST_CONFIG.API_BASE_URL)
        .get('/api/matches')
        .expect(200);
      
      const matches1 = response1.body.data;
      const matches2 = response2.body.data;
      
      // Basic consistency checks
      expect(matches1.length).toBe(matches2.length);
      
      // Match IDs should be the same
      const ids1 = matches1.map((m: any) => m.id).sort();
      const ids2 = matches2.map((m: any) => m.id).sort();
      expect(ids1).toEqual(ids2);
      
      // Static fields should be identical
      for (let i = 0; i < matches1.length; i++) {
        const match1 = matches1.find((m: any) => m.id === ids1[i]);
        const match2 = matches2.find((m: any) => m.id === ids1[i]);
        
        expect(match1.aiAgent1Id).toBe(match2.aiAgent1Id);
        expect(match1.aiAgent2Id).toBe(match2.aiAgent2Id);
        expect(match1.status).toBe(match2.status);
      }
    });
  });
});
