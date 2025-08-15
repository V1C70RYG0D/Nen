#!/usr/bin/env node

/**
 * Simple API Test - User Story 3 Validation
 * Tests the exact API calls that the frontend is making
 */

const http = require('http');

function testAPI(path, description) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3011,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`✅ ${description}`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Success: ${jsonData.success}`);
          console.log(`   Matches: ${jsonData.data?.matches?.length || 0}`);
          console.log(`   Total: ${jsonData.data?.total || 0}`);
          console.log(`   Message: ${jsonData.message || 'No message'}`);
          console.log('');
          resolve(jsonData);
        } catch (error) {
          console.error(`❌ ${description} - JSON Parse Error:`, error.message);
          console.log('Raw response:', data.substring(0, 200));
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ ${description} - Request Error:`, error.message);
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.error(`❌ ${description} - Timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing API endpoints that frontend uses...\n');

  try {
    // Test 1: Live matches (the failing one)
    await testAPI('/api/matches?status=live&limit=6&page=1&sortBy=startTime&sortOrder=desc', 
                  'Live Matches (User Story 3 - exact frontend call)');

    // Test 2: Upcoming matches (working one) 
    await testAPI('/api/matches?status=upcoming&limit=6&page=1&sortBy=startTime&sortOrder=asc',
                  'Upcoming Matches (User Story 3 - comparison)');

    // Test 3: All matches
    await testAPI('/api/matches?limit=6&page=1&sortBy=startTime&sortOrder=desc',
                  'All Matches (User Story 3 - fallback)');

    // Test 4: With filters
    await testAPI('/api/matches?status=live&minAiRating=1800&maxAiRating=3000&limit=6',
                  'Live Matches with AI Rating Filter (User Story 3)');

    console.log('🎯 All API tests completed!');
    console.log('If all tests pass ✅, the issue is in the frontend React components.');
    console.log('If any test fails ❌, the issue is in the backend API.');

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

runTests();
