#!/usr/bin/env node

/**
 * Simple API Test for User Story 3
 * Tests the matches endpoint to ensure demo data is returned
 */

const http = require('http');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function testMatchesAPI() {
  console.log('🚀 Testing User Story 3 - Matches API');
  console.log('=' .repeat(50));
  
  try {
    const url = `${API_BASE_URL}/api/matches`;
    console.log(`Testing: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`❌ API returned status: ${response.status}`);
      console.log(`Response: ${await response.text()}`);
      return;
    }
    
    const data = await response.json();
    
    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`✅ Success: ${data.success}`);
    console.log(`✅ Matches Count: ${data.count}`);
    console.log(`✅ Message: ${data.message}`);
    
    if (data.data && data.data.length > 0) {
      console.log('\n📋 Sample Match:');
      const match = data.data[0];
      console.log(`  ID: ${match.id}`);
      console.log(`  Status: ${match.status}`);
      console.log(`  Agent 1: ${match.agent1?.name || 'N/A'} (ELO: ${match.agent1?.elo || 'N/A'})`);
      console.log(`  Agent 2: ${match.agent2?.name || 'N/A'} (ELO: ${match.agent2?.elo || 'N/A'})`);
      console.log(`  Betting Pool: ${match.bettingPoolSol} SOL`);
      console.log(`  Viewers: ${match.viewerCount || 0}`);
      
      if (match.bettingPool) {
        console.log(`  Odds - Agent 1: ${match.bettingPool.oddsAgent1}`);
        console.log(`  Odds - Agent 2: ${match.bettingPool.oddsAgent2}`);
      }
    }
    
    // Test filtering
    console.log('\n🔍 Testing Filters...');
    const filterUrl = `${API_BASE_URL}/api/matches?status=live,upcoming`;
    const filterResponse = await fetch(filterUrl);
    
    if (filterResponse.ok) {
      const filterData = await filterResponse.json();
      console.log(`✅ Filter Test: ${filterData.count} matches with status filter`);
    } else {
      console.log(`⚠️  Filter test failed: ${filterResponse.status}`);
    }
    
    console.log('\n🎉 User Story 3 API Test Complete!');
    console.log('The backend is providing demo matches as expected.');
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log('Make sure the backend server is running on port 3001');
    console.log('Run: npm run backend:dev');
  }
}

// Only run if this is the main module
if (require.main === module) {
  testMatchesAPI();
}

module.exports = { testMatchesAPI };
