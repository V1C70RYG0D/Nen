#!/usr/bin/env node

/**
 * API Test - Verify marketplace and training APIs are working
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const DEMO_WALLET = '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC';

async function testAPIs() {
  console.log('🧪 Testing Nen Platform APIs...\n');

  try {
    // Test Health
    console.log('1. Testing Health API...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    console.log(`   ✅ Health: ${healthResponse.data.status}`);

    // Test Agents API (for marketplace)
    console.log('\n2. Testing Agents API...');
    const agentsResponse = await axios.get(`${BACKEND_URL}/api/agents`);
    const agents = agentsResponse.data.data?.agents || [];
    console.log(`   ✅ Agents loaded: ${agents.length} agents`);
    console.log(`   📊 Sample agent: ${agents[0]?.name} (${agents[0]?.rarity})`);

    // Test Training API
    console.log('\n3. Testing Training API...');
    const trainingResponse = await axios.get(`${BACKEND_URL}/api/training/owned-agents`, {
      params: { wallet: DEMO_WALLET }
    });
    const ownedAgents = trainingResponse.data.data?.agents || [];
    console.log(`   ✅ Owned agents loaded: ${ownedAgents.length} agents`);
    console.log(`   🤖 Sample agent: ${ownedAgents[0]?.name} (${ownedAgents[0]?.statistics?.winRate * 100}% win rate)`);

    console.log('\n🎉 All APIs working correctly!');
    console.log('\n📋 Summary:');
    console.log(`   • Marketplace: ${agents.length} agents available`);
    console.log(`   • Training: ${ownedAgents.length} agents for demo wallet`);
    console.log(`   • Frontend: http://localhost:3034`);
    console.log(`   • Backend: ${BACKEND_URL}`);

  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.status, error.response.data);
    }
  }
}

testAPIs();
