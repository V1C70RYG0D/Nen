#!/usr/bin/env node

/**
 * Enhanced test coverage script to ensure 100% coverage for GameBoard and AIInterface
 * This script runs tests with specific configurations to achieve comprehensive coverage
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set required environment variables
process.env.NEXT_PUBLIC_RPC_URL = 'https://api.devnet.solana.com';
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3001';
process.env.NEXT_PUBLIC_PROGRAM_ID = 'YourProgramIdHere';
process.env.NEXT_PUBLIC_MAGICBLOCK_URL = 'wss://magicblock.dev';
process.env.NEXT_PUBLIC_NETWORK = 'devnet';

console.log('🚀 Starting comprehensive test coverage analysis...\n');

// Target components for 100% coverage
const targetComponents = [
  'components/GameBoard/GameBoard.tsx',
  'components/AIInterface/AIInterface.tsx'
];

// Run tests with coverage for specific components
try {
  console.log('📊 Running Jest with coverage collection...');

  const jestCommand = [
    'npx jest',
    '--coverage',
    '--coverageReporters=text',
    '--coverageReporters=lcov',
    '--coverageReporters=html',
    '--collectCoverageFrom="components/GameBoard/GameBoard.tsx"',
    '--collectCoverageFrom="components/AIInterface/AIInterface.tsx"',
    '--testMatch="**/__tests__/components/{GameBoard,AIInterface}*.test.{js,jsx,ts,tsx}"',
    '--verbose',
    '--passWithNoTests=false'
  ].join(' ');

  console.log(`Command: ${jestCommand}\n`);

  execSync(jestCommand, {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd()
  });

  console.log('\n✅ Test coverage analysis completed successfully!');

  // Check if coverage reports exist
  const coverageDir = path.join(process.cwd(), 'coverage');
  if (fs.existsSync(coverageDir)) {
    console.log('\n📄 Coverage reports generated:');
    console.log('- HTML report: coverage/lcov-report/index.html');
    console.log('- LCOV report: coverage/lcov.info');

    // Parse and display coverage summary for target components
    const lcovFile = path.join(coverageDir, 'lcov.info');
    if (fs.existsSync(lcovFile)) {
      console.log('\n📈 Analyzing coverage for target components...');
      analyzeCoverage(lcovFile, targetComponents);
    }
  }

} catch (error) {
  console.error('❌ Test coverage analysis failed:', error.message);
  process.exit(1);
}

/**
 * Analyze LCOV coverage data for specific components
 */
function analyzeCoverage(lcovFile, targetComponents) {
  try {
    const lcovData = fs.readFileSync(lcovFile, 'utf8');
    const sections = lcovData.split('end_of_record');

    targetComponents.forEach(component => {
      const section = sections.find(s => s.includes(component.replace('/', '\\')));
      if (section) {
        const lines = section.split('\n');
        const stats = {
          functions: { found: 0, hit: 0 },
          lines: { found: 0, hit: 0 },
          branches: { found: 0, hit: 0 }
        };

        lines.forEach(line => {
          if (line.startsWith('FNF:')) stats.functions.found = parseInt(line.split(':')[1]);
          if (line.startsWith('FNH:')) stats.functions.hit = parseInt(line.split(':')[1]);
          if (line.startsWith('LF:')) stats.lines.found = parseInt(line.split(':')[1]);
          if (line.startsWith('LH:')) stats.lines.hit = parseInt(line.split(':')[1]);
          if (line.startsWith('BRF:')) stats.branches.found = parseInt(line.split(':')[1]);
          if (line.startsWith('BRH:')) stats.branches.hit = parseInt(line.split(':')[1]);
        });

        console.log(`\n🎯 ${component}:`);
        console.log(`   Functions: ${stats.functions.hit}/${stats.functions.found} (${((stats.functions.hit/stats.functions.found)*100).toFixed(2)}%)`);
        console.log(`   Lines: ${stats.lines.hit}/${stats.lines.found} (${((stats.lines.hit/stats.lines.found)*100).toFixed(2)}%)`);
        console.log(`   Branches: ${stats.branches.hit}/${stats.branches.found} (${((stats.branches.hit/stats.branches.found)*100).toFixed(2)}%)`);

        // Check if 100% coverage achieved
        const functionCoverage = (stats.functions.hit/stats.functions.found)*100;
        const lineCoverage = (stats.lines.hit/stats.lines.found)*100;
        const branchCoverage = (stats.branches.hit/stats.branches.found)*100;

        if (functionCoverage === 100 && lineCoverage === 100 && branchCoverage === 100) {
          console.log('   🎉 100% COVERAGE ACHIEVED!');
        } else {
          console.log('   ⚠️  Coverage gaps identified - consider adding more test cases');
        }
      }
    });
  } catch (error) {
    console.error('Error analyzing coverage:', error.message);
  }
}
