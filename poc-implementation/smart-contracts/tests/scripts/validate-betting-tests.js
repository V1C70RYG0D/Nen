#!/usr/bin/env node

/**
 * Simple Betting System Test Validation
 * JavaScript version to avoid TypeScript config issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Betting System Test Validation');
console.log('==================================\n');

// Check if test file exists
const testFilePath = path.join(process.cwd(), 'tests', 'unit', 'betting-system.test.ts');
try {
    fs.accessSync(testFilePath);
    console.log('✅ Test file exists: betting-system.test.ts');
} catch (error) {
    console.log('❌ Test file missing: betting-system.test.ts');
    process.exit(1);
}

// Check if configuration file exists
const configPath = path.join(process.cwd(), 'tests', 'config', 'betting-test-config.ts');
try {
    fs.accessSync(configPath);
    console.log('✅ Configuration file exists: betting-test-config.ts');
} catch (error) {
    console.log('❌ Configuration file missing: betting-test-config.ts');
}

// Check if documentation exists
const docPath = path.join(process.cwd(), 'tests', 'unit', 'BETTING_SYSTEM_TESTS_README.md');
try {
    fs.accessSync(docPath);
    console.log('✅ Documentation exists: BETTING_SYSTEM_TESTS_README.md');
} catch (error) {
    console.log('❌ Documentation missing: BETTING_SYSTEM_TESTS_README.md');
}

// Check test content structure
try {
    const testContent = fs.readFileSync(testFilePath, 'utf-8');

    const requiredSuites = [
        'Valid Bet Placement Tests',
        'Pool Management Tests',
        'Invalid Bet Rejection Tests',
        'Multiple Bets Per User Tests',
        'Security and Edge Cases',
        'Performance and Load Testing'
    ];

    let missingItems = 0;
    requiredSuites.forEach(suite => {
        if (testContent.includes(suite)) {
            console.log(`✅ Test suite found: ${suite}`);
        } else {
            console.log(`❌ Test suite missing: ${suite}`);
            missingItems++;
        }
    });

    // Check for required imports
    const requiredImports = [
        'import { expect } from "chai"',
        'import * as anchor from "@coral-xyz/anchor"',
        'LAMPORTS_PER_SOL'
    ];

    requiredImports.forEach(imp => {
        if (testContent.includes(imp.split(' ')[0])) {
            console.log(`✅ Required import found: ${imp.split(' ')[0]}`);
        } else {
            console.log(`❌ Required import missing: ${imp}`);
            missingItems++;
        }
    });

    if (missingItems === 0) {
        console.log('\n🎉 All validation checks passed!');
        console.log('\n🚀 Ready to run betting system tests:');
        console.log('   npm test tests/unit/betting-system.test.ts');
        console.log('   OR');
        console.log('   ./tests/scripts/run-betting-tests.sh all');
    } else {
        console.log(`\n❌ ${missingItems} validation issues found. Please fix before running tests.`);
        process.exit(1);
    }

} catch (error) {
    console.log('❌ Error reading test file:', error.message);
    process.exit(1);
}
