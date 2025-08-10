#!/usr/bin/env node

/**
 * User Story 3 Real Devnet Filtering Test
 * Tests the complete implementation of "User filters by bet range or AI rating"
 * Production-ready validation with real API calls
 */

const http = require('http');

// Test configuration
const API_BASE = 'http://localhost:3001';
const TEST_TIMEOUT = 5000;

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout: ${url}`));
    }, TEST_TIMEOUT);

    http.get(url, (res) => {
      clearTimeout(timeout);
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// Test function wrapper
async function runTest(name, testFn) {
  console.log(`🧪 Testing: ${name}`);
  try {
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
    console.log(`✅ PASSED: ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: error.message });
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
  console.log('');
}

// Test 1: Health check
async function testHealthCheck() {
  const response = await makeRequest(`${API_BASE}/api/v1/health`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Health check failed');
  }
  
  if (!response.data.message.includes('Real Devnet')) {
    throw new Error('Not using real devnet server');
  }
}

// Test 2: Basic matches endpoint
async function testBasicMatches() {
  const response = await makeRequest(`${API_BASE}/api/matches`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error('Matches endpoint failed');
  }
  
  const matches = response.data.data.matches;
  if (!Array.isArray(matches) || matches.length === 0) {
    throw new Error('No matches returned');
  }
  
  console.log(`   📊 Found ${matches.length} matches`);
  
  // Verify match structure
  const firstMatch = matches[0];
  const requiredFields = ['id', 'agent1', 'agent2', 'bettingPoolSol', 'status'];
  
  for (const field of requiredFields) {
    if (!(field in firstMatch)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Verify agents have ELO ratings
  if (!firstMatch.agent1.elo || !firstMatch.agent2.elo) {
    throw new Error('Agents missing ELO ratings');
  }
}

// Test 3: Bet range filtering (User Story 3)
async function testBetRangeFiltering() {
  // Test low bet range (0-20 SOL)
  const lowBetResponse = await makeRequest(`${API_BASE}/api/matches?minBet=0&maxBet=20`);
  
  if (!lowBetResponse.data.success) {
    throw new Error('Low bet range filter failed');
  }
  
  const lowBetMatches = lowBetResponse.data.data.matches;
  
  for (const match of lowBetMatches) {
    if (match.bettingPoolSol > 20) {
      throw new Error(`Match ${match.id} has bet pool ${match.bettingPoolSol} SOL, exceeding max of 20 SOL`);
    }
  }
  
  console.log(`   💰 Low bet range (0-20 SOL): ${lowBetMatches.length} matches`);
  
  // Test high bet range (50+ SOL)
  const highBetResponse = await makeRequest(`${API_BASE}/api/matches?minBet=50`);
  const highBetMatches = highBetResponse.data.data.matches;
  
  for (const match of highBetMatches) {
    if (match.bettingPoolSol < 50) {
      throw new Error(`Match ${match.id} has bet pool ${match.bettingPoolSol} SOL, below min of 50 SOL`);
    }
  }
  
  console.log(`   💰 High bet range (50+ SOL): ${highBetMatches.length} matches`);
  
  // Test exact range (20-30 SOL)
  const exactRangeResponse = await makeRequest(`${API_BASE}/api/matches?minBet=20&maxBet=30`);
  const exactRangeMatches = exactRangeResponse.data.data.matches;
  
  for (const match of exactRangeMatches) {
    if (match.bettingPoolSol < 20 || match.bettingPoolSol > 30) {
      throw new Error(`Match ${match.id} has bet pool ${match.bettingPoolSol} SOL, outside range 20-30 SOL`);
    }
  }
  
  console.log(`   💰 Exact range (20-30 SOL): ${exactRangeMatches.length} matches`);
}

// Test 4: AI rating filtering (User Story 3)
async function testAIRatingFiltering() {
  // Test low rating range (1500-1800)
  const lowRatingResponse = await makeRequest(`${API_BASE}/api/matches?minRating=1500&maxRating=1800`);
  
  if (!lowRatingResponse.data.success) {
    throw new Error('Low rating filter failed');
  }
  
  const lowRatingMatches = lowRatingResponse.data.data.matches;
  
  for (const match of lowRatingMatches) {
    const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
    if (avgRating < 1500 || avgRating > 1800) {
      throw new Error(`Match ${match.id} has avg rating ${avgRating}, outside range 1500-1800`);
    }
  }
  
  console.log(`   🏆 Low rating range (1500-1800): ${lowRatingMatches.length} matches`);
  
  // Test high rating range (2000+)
  const highRatingResponse = await makeRequest(`${API_BASE}/api/matches?minRating=2000`);
  const highRatingMatches = highRatingResponse.data.data.matches;
  
  for (const match of highRatingMatches) {
    const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
    if (avgRating < 2000) {
      throw new Error(`Match ${match.id} has avg rating ${avgRating}, below min of 2000`);
    }
  }
  
  console.log(`   🏆 High rating range (2000+): ${highRatingMatches.length} matches`);
  
  // Test exact rating range (1900-2100)
  const exactRatingResponse = await makeRequest(`${API_BASE}/api/matches?minRating=1900&maxRating=2100`);
  const exactRatingMatches = exactRatingResponse.data.data.matches;
  
  for (const match of exactRatingMatches) {
    const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
    if (avgRating < 1900 || avgRating > 2100) {
      throw new Error(`Match ${match.id} has avg rating ${avgRating}, outside range 1900-2100`);
    }
  }
  
  console.log(`   🏆 Exact rating range (1900-2100): ${exactRatingMatches.length} matches`);
}

// Test 5: Combined filtering (bet range + AI rating)
async function testCombinedFiltering() {
  const response = await makeRequest(`${API_BASE}/api/matches?minBet=10&maxBet=50&minRating=1800&maxRating=2000`);
  
  if (!response.data.success) {
    throw new Error('Combined filtering failed');
  }
  
  const matches = response.data.data.matches;
  
  for (const match of matches) {
    // Check bet range
    if (match.bettingPoolSol < 10 || match.bettingPoolSol > 50) {
      throw new Error(`Match ${match.id} bet pool ${match.bettingPoolSol} SOL outside range 10-50`);
    }
    
    // Check rating range
    const avgRating = (match.agent1.elo + match.agent2.elo) / 2;
    if (avgRating < 1800 || avgRating > 2000) {
      throw new Error(`Match ${match.id} avg rating ${avgRating} outside range 1800-2000`);
    }
  }
  
  console.log(`   🎯 Combined filters (10-50 SOL, 1800-2000 ELO): ${matches.length} matches`);
}

// Test 6: Status filtering
async function testStatusFiltering() {
  // Test live matches
  const liveResponse = await makeRequest(`${API_BASE}/api/matches?status=live`);
  const liveMatches = liveResponse.data.data.matches;
  
  for (const match of liveMatches) {
    if (match.status !== 'live') {
      throw new Error(`Match ${match.id} has status ${match.status}, expected live`);
    }
  }
  
  console.log(`   🔴 Live matches: ${liveMatches.length} matches`);
  
  // Test upcoming matches
  const upcomingResponse = await makeRequest(`${API_BASE}/api/matches?status=upcoming`);
  const upcomingMatches = upcomingResponse.data.data.matches;
  
  for (const match of upcomingMatches) {
    if (match.status !== 'upcoming') {
      throw new Error(`Match ${match.id} has status ${match.status}, expected upcoming`);
    }
  }
  
  console.log(`   ⏳ Upcoming matches: ${upcomingMatches.length} matches`);
}

// Test 7: Filter parameters validation
async function testFilterValidation() {
  // Filters should be returned in response
  const response = await makeRequest(`${API_BASE}/api/matches?minBet=25&maxBet=75&minRating=1700&maxRating=2200`);
  
  if (!response.data.success) {
    throw new Error('Filter validation test failed');
  }
  
  const filters = response.data.data.filters;
  
  if (filters.minBet !== '25') {
    throw new Error(`Expected minBet filter to be '25', got '${filters.minBet}'`);
  }
  
  if (filters.maxBet !== '75') {
    throw new Error(`Expected maxBet filter to be '75', got '${filters.maxBet}'`);
  }
  
  if (filters.minRating !== '1700') {
    throw new Error(`Expected minRating filter to be '1700', got '${filters.minRating}'`);
  }
  
  if (filters.maxRating !== '2200') {
    throw new Error(`Expected maxRating filter to be '2200', got '${filters.maxRating}'`);
  }
  
  console.log(`   📋 Filter parameters correctly returned and validated`);
}

// Main test runner
async function runAllTests() {
  console.log('🎯 USER STORY 3: FILTERING IMPLEMENTATION TEST');
  console.log('===============================================');
  console.log('Testing: "User filters by bet range or AI rating"');
  console.log('');
  
  await runTest('Backend Health Check', testHealthCheck);
  await runTest('Basic Matches Endpoint', testBasicMatches);
  await runTest('Bet Range Filtering', testBetRangeFiltering);
  await runTest('AI Rating Filtering', testAIRatingFiltering);
  await runTest('Combined Filtering', testCombinedFiltering);
  await runTest('Status Filtering', testStatusFiltering);
  await runTest('Filter Validation', testFilterValidation);
  
  // Print summary
  console.log('===============================================');
  console.log('🎯 USER STORY 3 TEST SUMMARY');
  console.log('===============================================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed === 0) {
    console.log('');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('✅ User Story 3 Implementation Complete:');
    console.log('   • Bet range filtering works correctly');
    console.log('   • AI rating filtering works correctly');
    console.log('   • Combined filters work correctly');
    console.log('   • Filter parameters are validated');
    console.log('   • Real devnet data (no mocks/placeholders)');
    console.log('   • Production-ready filtering logic');
    console.log('');
    console.log('🚀 READY FOR LAUNCH!');
  } else {
    console.log('');
    console.log('❌ Some tests failed. Review the errors above.');
    
    console.log('');
    console.log('Failed tests:');
    testResults.tests.filter(t => t.status === 'FAILED').forEach(test => {
      console.log(`   • ${test.name}: ${test.error}`);
    });
  }
  
  console.log('');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, makeRequest };
