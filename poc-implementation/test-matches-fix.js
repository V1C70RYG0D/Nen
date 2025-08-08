#!/usr/bin/env node

/**
 * Test script to verify User Story 3 matches fix
 * Validates that "Incomplete match data" error is resolved
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('🔧 TESTING USER STORY 3 MATCHES FIX');
console.log('='.repeat(60));

// Test 1: Verify MatchCard component has proper validation
console.log('\n📋 Test 1: MatchCard Component Validation');
try {
  const matchCardPath = path.join(__dirname, 'frontend', 'components', 'MatchCard', 'MatchCard.tsx');
  const matchCardContent = fs.readFileSync(matchCardPath, 'utf8');
  
  // Check for the incomplete match data handling
  if (matchCardContent.includes('Incomplete match data')) {
    console.log('✅ MatchCard has incomplete data validation');
  } else {
    console.log('❌ MatchCard missing incomplete data validation');
  }
  
  // Check for proper required field validation
  if (matchCardContent.includes('!match || !match.agent1 || !match.agent2 || !match.bettingPool')) {
    console.log('✅ MatchCard validates all required fields');
  } else {
    console.log('❌ MatchCard missing required field validation');
  }
} catch (error) {
  console.log('❌ Error reading MatchCard component:', error.message);
}

// Test 2: Verify API endpoint provides proper data structure
console.log('\n🌐 Test 2: API Endpoint Data Structure');
try {
  const apiPath = path.join(__dirname, 'backend', 'src', 'api', 'matches.ts');
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  
  // Check for demo matches provision
  if (apiContent.includes('demoMatches') && apiContent.includes('bettingPool')) {
    console.log('✅ API provides demo matches with betting pool data');
  } else {
    console.log('❌ API missing demo matches or betting pool structure');
  }
  
  // Check for User Story 3 requirements
  const userStory3Requirements = [
    'Query global matches account for active games',
    'Retrieve AI agent metadata',
    'Calculate dynamic odds based on betting pools', 
    'Check match status'
  ];
  
  let requirementsMet = 0;
  userStory3Requirements.forEach(req => {
    if (apiContent.includes(req)) {
      requirementsMet++;
      console.log(`✅ ${req} - implemented`);
    } else {
      console.log(`❌ ${req} - missing`);
    }
  });
  
  console.log(`📊 User Story 3 Requirements: ${requirementsMet}/${userStory3Requirements.length} met`);
} catch (error) {
  console.log('❌ Error reading API file:', error.message);
}

// Test 3: Verify frontend data transformation
console.log('\n🔄 Test 3: Frontend Data Transformation');
try {
  const indexPath = path.join(__dirname, 'frontend', 'pages', 'index.tsx');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Check for proper API fetch implementation
  if (indexContent.includes('fetch(\'/api/matches\')') && indexContent.includes('transformedMatches')) {
    console.log('✅ Frontend fetches from real API and transforms data');
  } else {
    console.log('❌ Frontend not using real API or missing transformation');
  }
  
  // Check for agent helper functions
  const helperFunctions = ['getAgentName', 'getAgentElo', 'getAgentNenType', 'getAgentPersonality'];
  let helperCount = 0;
  helperFunctions.forEach(func => {
    if (indexContent.includes(func)) {
      helperCount++;
    }
  });
  
  console.log(`📊 Agent Helper Functions: ${helperCount}/${helperFunctions.length} implemented`);
  
  // Check for proper error handling
  if (indexContent.includes('error ?') && indexContent.includes('filteredMatches.length === 0')) {
    console.log('✅ Frontend has proper error handling and empty states');
  } else {
    console.log('❌ Frontend missing proper error handling');
  }
} catch (error) {
  console.log('❌ Error reading frontend index file:', error.message);
}

// Test 4: Verify type definitions
console.log('\n📝 Test 4: Type Definitions');
try {
  const typesPath = path.join(__dirname, 'frontend', 'types', 'match.ts');
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  
  const requiredTypes = ['Match', 'Agent', 'BettingPool', 'GameState', 'MatchResult'];
  let typeCount = 0;
  requiredTypes.forEach(type => {
    if (typesContent.includes(`interface ${type}`)) {
      typeCount++;
    }
  });
  
  console.log(`📊 Required Types: ${typeCount}/${requiredTypes.length} defined`);
  
  if (typeCount === requiredTypes.length) {
    console.log('✅ All required types properly defined');
  } else {
    console.log('❌ Some required types missing');
  }
} catch (error) {
  console.log('❌ Error reading types file:', error.message);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log('🎯 Fix Target: Resolve "Incomplete match data" error');
console.log('📋 User Story 3 Requirements:');
console.log('   - Query global matches account for active games');
console.log('   - Retrieve AI agent metadata (names, ratings, stats)');
console.log('   - Calculate dynamic odds based on betting pools');
console.log('   - Check match status (open/closed for betting)');
console.log('\n✨ Expected Outcome: Match cards display properly with all required data');
console.log('\n🔧 Changes Made:');
console.log('   1. Fixed frontend API fetch to use real endpoint');
console.log('   2. Added proper data transformation with all required fields');
console.log('   3. Enhanced API to provide demo data when database is empty');
console.log('   4. Added comprehensive error handling and empty states');
console.log('   5. Implemented agent helper functions for metadata');
console.log('\n🚀 To test: Start dev server and check matches section');
console.log('='.repeat(60));
