#!/usr/bin/env node

/**
 * Test script to validate API connectivity for live matches
 * This tests the exact same logic that the frontend should be using
 */

const https = require('https');
const http = require('http');

// Simulate the buildQueryParams function
function buildQueryParams(params) {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length === 1) {
          searchParams.append(key, String(value[0]));
        } else {
          value.forEach(item => {
            if (item !== undefined && item !== null && item !== '') {
              searchParams.append(key, String(item));
            }
          });
        }
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString() ? '?' + searchParams.toString() : '';
}

// Test filters for each tab
const filters = {
  live: { status: ['live'], sortBy: 'startTime', sortOrder: 'desc', limit: 20, page: 1 },
  upcoming: { status: ['upcoming'], sortBy: 'startTime', sortOrder: 'asc', limit: 20, page: 1 },
  all: { status: ['live', 'upcoming', 'completed'], sortBy: 'startTime', sortOrder: 'desc', limit: 20, page: 1 }
};

async function testAPI(tabName, filterParams) {
  const queryString = buildQueryParams(filterParams);
  const url = `http://127.0.0.1:3011/api/matches${queryString}`;
  
  console.log(`\n🧪 Testing ${tabName.toUpperCase()} tab:`);
  console.log(`📍 URL: ${url}`);
  
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.success && response.data) {
            const matches = response.data.matches || [];
            const metadata = response.data.metadata || {};
            
            console.log(`✅ Success! Found ${matches.length} matches`);
            console.log(`📊 Metadata:`, {
              totalLive: metadata.totalLiveMatches || 0,
              totalUpcoming: metadata.totalUpcomingMatches || 0,
              totalCompleted: metadata.totalCompletedMatches || 0
            });
            
            // Show first match as example
            if (matches.length > 0) {
              const firstMatch = matches[0];
              console.log(`🥊 Example match: ${firstMatch.agent1?.name} vs ${firstMatch.agent2?.name} (${firstMatch.status})`);
            }
            
            resolve({ success: true, count: matches.length, metadata });
          } else {
            console.log(`❌ API Error:`, response.error || response.message || 'Unknown error');
            resolve({ success: false, error: response.error || response.message });
          }
        } catch (error) {
          console.log(`💥 Parse Error:`, error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`🚨 Network Error:`, error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ Request timeout`);
      req.abort();
      reject(new Error('Request timeout'));
    });
  });
}

async function main() {
  console.log('🚀 Testing Nen Platform API Connectivity');
  console.log('=======================================');
  
  try {
    // Test all tabs
    for (const [tabName, filterParams] of Object.entries(filters)) {
      await testAPI(tabName, filterParams);
    }
    
    console.log('\n✨ All tests completed!');
    console.log('\n📋 Summary:');
    console.log('- If you see matches for LIVE tab, the backend is working correctly');
    console.log('- If you see matches for UPCOMING tab, the filtering is working');
    console.log('- The frontend should now display these matches with the fixes applied');
    console.log('\n🔧 If the frontend still shows no live matches, check:');
    console.log('1. Browser developer console for JavaScript errors');
    console.log('2. Network tab in browser dev tools for failed API calls');
    console.log('3. Make sure http://localhost:3010 is accessible');
    
  } catch (error) {
    console.error('💀 Test failed:', error.message);
    process.exit(1);
  }
}

main();
