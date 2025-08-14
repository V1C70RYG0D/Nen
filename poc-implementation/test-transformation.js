/**
 * Test the match data transformation
 */

const { transformMatch } = require('./frontend/utils/match-transformer.ts');

// Test with legacy data format (what the backend currently returns)
const legacyMatch = {
  id: 'test-match-1',
  status: 'live',
  agent1: { 
    id: 'netero_ai', 
    name: 'Chairman Netero', 
    elo: 2450, 
    nenType: 'enhancement',
    avatar: '/avatars/netero.png',
    winRate: 0.89,
    totalMatches: 234,
    personality: 'tactical'
  },
  agent2: { 
    id: 'meruem_ai', 
    name: 'Meruem', 
    elo: 2680, 
    nenType: 'specialization',
    avatar: '/avatars/meruem.png',
    winRate: 0.94,
    totalMatches: 156,
    personality: 'aggressive'
  },
  bettingPoolSol: 45.7,
  startTime: new Date(Date.now() - 900000).toISOString(),
  viewerCount: 347,
  isBettingActive: true
};

console.log('Original legacy match:');
console.log(JSON.stringify(legacyMatch, null, 2));

console.log('\nTransformed match:');
const transformed = transformMatch(legacyMatch);
console.log(JSON.stringify(transformed, null, 2));

console.log('\nBetting pool structure:');
console.log('- totalPool:', transformed.bettingPool.totalPool);
console.log('- oddsAgent1:', transformed.bettingPool.oddsAgent1);
console.log('- oddsAgent2:', transformed.bettingPool.oddsAgent2);
console.log('- isOpenForBetting:', transformed.bettingPool.isOpenForBetting);
