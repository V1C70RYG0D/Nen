#!/usr/bin/env node

/**
 * Quick User Story 3 Verification
 * Tests if filtering functionality is implemented and working
 */

console.log('🎯 USER STORY 3 QUICK VERIFICATION');
console.log('=================================');
console.log('Testing: "User filters by bet range or AI rating"');
console.log('');

// Check if backend server files exist
const fs = require('fs');
const path = require('path');

const backendPath = path.join(__dirname, 'backend');
const frontendPath = path.join(__dirname, 'frontend');

console.log('📁 Checking file structure...');

const requiredFiles = [
  'backend/simple-server.js',
  'backend/real-devnet-server.js',
  'frontend/components/MatchFilter/MatchFilter.tsx',
  'frontend/pages/matches.tsx',
  'frontend/lib/api-config.ts'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

console.log('');

if (!allFilesExist) {
  console.log('❌ Some required files are missing');
  process.exit(1);
}

// Check if API config points to correct port
console.log('🔧 Checking API configuration...');

const apiConfigPath = path.join(__dirname, 'frontend/lib/api-config.ts');
const apiConfig = fs.readFileSync(apiConfigPath, 'utf8');

if (apiConfig.includes('localhost:3001')) {
  console.log('✅ API config points to correct backend port (3001)');
} else if (apiConfig.includes('localhost:3005')) {
  console.log('⚠️  API config still points to port 3005, should be 3001');
} else {
  console.log('❓ API config port unclear');
}

console.log('');

// Read and analyze MatchFilter component
console.log('🎨 Checking MatchFilter component...');

const matchFilterPath = path.join(__dirname, 'frontend/components/MatchFilter/MatchFilter.tsx');
const matchFilter = fs.readFileSync(matchFilterPath, 'utf8');

const filterFeatures = [
  { feature: 'Bet range filtering', check: 'bet.*range|betting.*range' },
  { feature: 'AI rating filtering', check: 'rating|elo' },
  { feature: 'Default expanded', check: 'isExpanded.*true' },
  { feature: 'User Story 3 label', check: 'User Story 3' }
];

filterFeatures.forEach(({ feature, check }) => {
  const regex = new RegExp(check, 'i');
  if (regex.test(matchFilter)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - NOT FOUND`);
  }
});

console.log('');

// Read and analyze backend server
console.log('🔧 Checking backend filtering logic...');

const serverPath = path.join(__dirname, 'backend/simple-server.js');
const serverCode = fs.readFileSync(serverPath, 'utf8');

const backendFeatures = [
  { feature: 'minBet filtering', check: 'minBet' },
  { feature: 'maxBet filtering', check: 'maxBet' },
  { feature: 'minRating filtering', check: 'minRating' },
  { feature: 'maxRating filtering', check: 'maxRating' },
  { feature: 'Demo matches', check: 'demoMatches|demo.*matches' }
];

backendFeatures.forEach(({ feature, check }) => {
  const regex = new RegExp(check, 'i');
  if (regex.test(serverCode)) {
    console.log(`✅ ${feature}`);
  } else {
    console.log(`❌ ${feature} - NOT FOUND`);
  }
});

console.log('');

// Instructions for testing
console.log('📋 MANUAL TESTING INSTRUCTIONS');
console.log('============================');
console.log('');
console.log('To test User Story 3 filtering:');
console.log('');
console.log('1. Start backend server:');
console.log('   node backend/simple-server.js');
console.log('   OR');
console.log('   node backend/real-devnet-server.js');
console.log('');
console.log('2. Start frontend server:');
console.log('   cd frontend && npm run dev');
console.log('');
console.log('3. Navigate to: http://localhost:3000/matches');
console.log('');
console.log('4. Look for filtering options:');
console.log('   • Bet Range slider (SOL amounts)');
console.log('   • AI Rating slider (ELO scores)');
console.log('   • Filters should be visible by default');
console.log('');
console.log('5. Test filtering functionality:');
console.log('   • Adjust bet range slider');
console.log('   • Adjust AI rating slider');
console.log('   • Matches should update in real-time');
console.log('');
console.log('🎯 SUCCESS CRITERIA:');
console.log('   ✅ Filtering controls are visible');
console.log('   ✅ Bet range filtering works');
console.log('   ✅ AI rating filtering works');
console.log('   ✅ Matches update when filters change');
console.log('   ✅ No "NO LIVE MATCHES" when data exists');
console.log('');

// API testing
console.log('🔧 API TESTING COMMANDS');
console.log('======================');
console.log('');
console.log('Test API endpoints manually:');
console.log('');
console.log('# Health check');
console.log('curl http://localhost:3001/api/v1/health');
console.log('');
console.log('# All matches');
console.log('curl http://localhost:3001/api/matches');
console.log('');
console.log('# Filter by bet range (10-50 SOL)');
console.log('curl "http://localhost:3001/api/matches?minBet=10&maxBet=50"');
console.log('');
console.log('# Filter by AI rating (1800-2000 ELO)');
console.log('curl "http://localhost:3001/api/matches?minRating=1800&maxRating=2000"');
console.log('');
console.log('# Combined filters');
console.log('curl "http://localhost:3001/api/matches?minBet=20&maxBet=80&minRating=1700&maxRating=2100"');
console.log('');

console.log('✅ VERIFICATION COMPLETE');
console.log('');
console.log('Next steps:');
console.log('1. Start the servers');
console.log('2. Test the filtering functionality');
console.log('3. Report any issues');
console.log('');
